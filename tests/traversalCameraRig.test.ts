import {afterEach,describe,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
const scale=vi.hoisted(()=>({value:1}));
vi.mock('phaser',()=>({default:{}}));
vi.mock('../src/systems/renderScale',()=>({renderScale:()=>scale.value}));
import {TraversalCameraRig} from '../src/systems/traversalCameraRig';
import {sampleTraversalCameraZone} from '../src/data/traversalCameraZones';

function fixture(chapter:'gate-1'|'jail'|'outside'|'crimson'|'rescue'='jail'){
 const calls={setZoom:vi.fn((v:number)=>{camera.zoomX=v;camera.zoomY=v;}),setFollowOffset:vi.fn((_x:number,y:number)=>{camera.followOffset.y=y;}),setScroll:vi.fn(),setDeadzone:vi.fn(),startFollow:vi.fn()};
 const camera={worldView:{x:0,y:0,width:640,height:400},followOffset:{x:0,y:0},zoomX:1,zoomY:1,...calls} as unknown as Phaser.Cameras.Scene2D.Camera;
 return {rig:new TraversalCameraRig({} as Phaser.Scene,camera,chapter),camera,calls};
}
afterEach(()=>{scale.value=1;});

describe('authored traversal camera zones',()=>{
 it('uses fixed spatial zones with smooth feather edges and stable ordering',()=>{
  const core=sampleTraversalCameraZone('jail',12400,600),edge=sampleTraversalCameraZone('jail',11800,600),outside=sampleTraversalCameraZone('jail',10000,600);
  expect(core.zone?.id).toBe('jail-spiral-drain-descent');expect(core.weight).toBe(1);expect(core.zoomRatio).toBe(.85);expect(core.offsetY).toBe(-120);
  expect(edge.weight).toBeGreaterThan(0);expect(edge.weight).toBeLessThan(1);
  expect(outside.zone).toBeNull();expect(outside.weight).toBe(0);expect(outside.zoomRatio).toBe(1);expect(outside.offsetY).toBe(0);
  expect(sampleTraversalCameraZone('jail',-1,100).zone).toBeNull();expect(sampleTraversalCameraZone('jail',12000,1841).weight).toBe(0);
 });
 it('keeps normal chapters and ordinary route positions camera no-ops',()=>{
  const {rig,calls}=fixture('gate-1');const s=rig.update(400,360,16,'traversal',true,true);
  expect(s.state).toBe('normal');expect(s.zoneId).toBeUndefined();
  expect(calls.setZoom).not.toHaveBeenCalled();expect(calls.setFollowOffset).not.toHaveBeenCalled();
  expect(calls.setScroll).not.toHaveBeenCalled();expect(calls.setDeadzone).not.toHaveBeenCalled();expect(calls.startFollow).not.toHaveBeenCalled();
 });
 it('holds a constant shot across landings, velocity changes, and hazard changes at one authored location',()=>{
  const {rig,calls}=fixture();
  const first=rig.update(12400,600,50,'traversal',true,true);
  const afterLanding=rig.update(12400,600,50,'traversal',true,true);
  const afterVelocityAndHazardChange=rig.update(12400,600,50,'traversal',true,true);
  expect(first.zoneId).toBe('jail-spiral-drain-descent');expect(afterLanding.zoneId).toBe(first.zoneId);expect(afterVelocityAndHazardChange.zoneId).toBe(first.zoneId);
  expect(afterVelocityAndHazardChange.zoomRatio).toBe(first.zoomRatio);expect(afterVelocityAndHazardChange.offsetY).toBe(first.offsetY);
  expect(calls.setDeadzone).not.toHaveBeenCalled();expect(calls.setScroll).not.toHaveBeenCalled();
 });
 it('blends on approach, stays framed while stopped, and blends out on reversal',()=>{
  const {rig,camera}=fixture();
  const approaching=rig.update(11800,600,50,'traversal',true,true);
  expect(approaching.zoneId).toBe('jail-spiral-drain-descent');expect(approaching.zoneWeight).toBeGreaterThan(0);expect(approaching.zoneWeight).toBeLessThan(1);
  for(let i=0;i<24;i++)rig.update(12400,600,50,'traversal',true,true);const held=rig.update(12400,600,50,'traversal',true,true);
  expect(held.state).toBe('zone');expect(camera.followOffset.y).toBeCloseTo(-120,0);
  const reversed=rig.update(11400,600,50,'traversal',true,true);expect(reversed.zoneWeight).toBeLessThan(1);expect(reversed.state).toBe('blending');
 });
 it('does zero writes under boss ownership and cleanly reacquires after ownership returns',()=>{
  const {rig,calls,camera}=fixture();rig.update(12400,600,300,'traversal',true,true);calls.setZoom.mockClear();calls.setFollowOffset.mockClear();
  const boss=rig.update(12400,600,50,'boss',true,true);expect(boss.state).toBe('boss');expect(calls.setZoom).not.toHaveBeenCalled();expect(calls.setFollowOffset).not.toHaveBeenCalled();
  // Boss restoration is responsible for its camera transform; the rig starts a fresh spatial blend.
  camera.zoomX=1;camera.zoomY=1;camera.followOffset.y=0;
  rig.update(12400,600,50,'traversal',true,true);const returned=rig.update(12400,600,50,'traversal',true,true);expect(returned.zoneId).toBe('jail-spiral-drain-descent');expect(returned.state).toBe('zone');
 });
 it('freezes while paused/dead, discards resume catch-up, and respects a changed render scale',()=>{
  const {rig,calls,camera}=fixture();rig.update(12400,600,300,'traversal',true,true);calls.setZoom.mockClear();calls.setFollowOffset.mockClear();
  rig.update(12400,600,10000,'traversal',false,true);rig.update(12400,600,10000,'traversal',true,false);
  expect(calls.setZoom).not.toHaveBeenCalled();expect(calls.setFollowOffset).not.toHaveBeenCalled();
  rig.update(12400,600,10000,'traversal',true,true);let resumed=rig.update(12400,600,10000,'traversal',true,true);for(let i=0;i<24;i++)resumed=rig.update(12400,600,50,'traversal',true,true);expect(resumed.state).toBe('zone');expect(resumed.offsetY).toBeCloseTo(-120,0);
  scale.value=2;rig.update(12400,600,50,'traversal',true,true);expect(camera.zoomY).toBeCloseTo(1.7);
 });
 it('does not discard frame time when resume is called repeatedly during active traversal',()=>{
  const {rig}=fixture();const first=rig.update(12400,600,50,'traversal',true,true).offsetY;
  let current=first;for(let i=0;i<8;i++){rig.resume();current=rig.update(12400,600,50,'traversal',true,true).offsetY;}
  expect(current).toBeLessThan(first);expect(current).toBeLessThan(-100);
 });
});
