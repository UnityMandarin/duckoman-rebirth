import {describe,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
vi.mock('phaser',()=>({default:{Geom:{Rectangle:class {
 x=0;y=0;width=0;height=0;
 get top(){return this.y;}get bottom(){return this.y+this.height;}
 setTo(x:number,y:number,width:number,height:number){this.x=x;this.y=y;this.width=width;this.height=height;return this;}
}}}}));
vi.mock('../src/systems/renderScale',()=>({renderScale:()=>1}));
import {dangerLookaheadBottom,traversalCameraOwner,TraversalCameraRig} from '../src/systems/traversalCameraRig';
import {descentCameraTarget} from '../src/systems/predictiveDescentCamera';
import type {DescentPredictionInput} from '../src/systems/descentPrediction';

function rigFixture(){
 const calls={setZoom:vi.fn(),setFollowOffset:vi.fn(),setScroll:vi.fn(),setDeadzone:vi.fn(),startFollow:vi.fn()};
 const getBounds=vi.fn((out:Phaser.Geom.Rectangle)=>out.setTo(0,-100,640,400));
 const camera={worldView:{x:0,y:0,width:640,height:400},followOffset:{x:0,y:0},zoomX:1,zoomY:1,useBounds:false,getBounds,...calls} as unknown as Phaser.Cameras.Scene2D.Camera;
 return {rig:new TraversalCameraRig({} as Phaser.Scene,camera),camera,calls,getBounds};
}
const model:DescentPredictionInput={x:100,y:330,vx:0,vy:0,halfWidth:23,halfHeight:20,grounded:true,horizontal:0,sprint:false,jumpAvailable:false,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces:[],hazards:[]};
const frame={actorTop:300,actorBottom:360,targetBottom:null};

describe('shared traversal camera ownership',()=>{
 it.each([
  ['boss ownership', 'boss' as const,true,true],
  ['suspension', 'traversal' as const,false,true],
  ['dead player', 'traversal' as const,true,false]
 ])('performs no main-camera writes during %s',(_label,owner,active,alive)=>{
  const {rig,calls}=rigFixture();rig.update(model,frame,16,owner,active,alive);
  for(const write of Object.values(calls))expect(write).not.toHaveBeenCalled();
 });
 it('keeps neutral traversal a camera no-op',()=>{
  const {rig,calls,getBounds}=rigFixture();const status=rig.update(model,frame,16,'traversal',true,true);
  expect(status.state).toBe('approach');expect(getBounds).toHaveBeenCalledOnce();
  expect(getBounds.mock.calls[0][0]).toMatchObject({x:0,y:-100,width:640,height:400,top:-100,bottom:300});
  for(const write of Object.values(calls))expect(write).not.toHaveBeenCalled();
 });
 it('resets internal framing when traversal ownership returns after a boss',()=>{
  const {rig,calls}=rigFixture();rig.update(model,frame,16,'boss',true,true);expect(rig.camera.owner).toBe('boss');
  const status=rig.update(model,frame,16,'traversal',true,true);expect(rig.camera.owner).toBe('traversal');expect(status.zoomRatio).toBe(1);expect(status.offsetY).toBe(0);
  for(const write of Object.values(calls))expect(write).not.toHaveBeenCalled();
 });
 it('bounds a long no-landing danger forecast to the visible .80-zoom band',()=>{
  const bottom=dangerLookaheadBottom({y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},300);
  expect(bottom).toBeCloseTo(557.5);expect(bottom-300).toBeLessThan(300);
  const fit=descentCameraTarget({x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:300,actorBottom:360,targetBottom:bottom});expect(fit.zoomRatio).toBe(.80);expect(fit.visible).toBe(true);
 });
 it('keeps traversal active when the Regent exists but is not engaged',()=>{
  expect(traversalCameraOwner(true,false)).toBe('traversal');expect(traversalCameraOwner(true,true)).toBe('boss');
 });
});
