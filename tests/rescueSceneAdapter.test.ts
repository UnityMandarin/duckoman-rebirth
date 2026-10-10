import {setDebugMode} from '../src/systems/debug/debugSettings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const franklinConstruct = vi.fn();
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Core: { Events: { BLUR: 'blur' } }, Math: { Clamp: (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)) } } }));
vi.mock('../src/entities/FranklinFox', () => ({ FranklinFox: class { constructor(...args: unknown[]) { franklinConstruct(this, ...args); } } }));
import { RescueScene } from '../src/scenes/RescueScene';

describe('RescueScene Franklin encounter adapter', () => {
  beforeEach(() => {franklinConstruct.mockClear();setDebugMode(false);});
  function fixture(stage: string) {
    const target = Object.create(RescueScene.prototype) as any;
    const player = { body: { center: { x: 432 } } };
    const camera = { startFollow: vi.fn(), stopFollow: vi.fn() };
    Object.assign(target, { stage, player, fox: undefined, cameras: { main: camera }, tweens: { add: vi.fn() } });
    return { target, player, camera };
  }

  it('ignores a legacy Warden flag and always dispatches the released Franklin encounter',()=>{
    const f=fixture('released');f.target.wardenPreview=true;f.target.spawnFranklinBoss();
    expect(franklinConstruct).toHaveBeenCalledOnce();expect(f.target.fox).toBeDefined();
    f.target.spawnFranklinBoss();expect(franklinConstruct).toHaveBeenCalledOnce();
  });
  it('consumes input during a cinematic while preserving vertical settle and the stomp bounce',()=>{
    vi.stubGlobal('document',{visibilityState:'visible'});
    const f=fixture('cleared');const input={horizontal:1,down:true,downPressed:true,dashPressed:true,sprintPressed:true,jumpPressed:true,jumpReleased:true,anyResetInput:true,ultimatePressed:true,throwPressed:true};
    const body={center:{x:432,y:320},velocity:{x:180,y:-280},setVelocityX:vi.fn(function(this:any,x:number){this.velocity.x=x;return this;}),setAllowGravity:vi.fn().mockReturnThis()};
    const display={setVisible:vi.fn().mockReturnThis(),setDisplaySize:vi.fn().mockReturnThis(),setY:vi.fn().mockReturnThis(),setAlpha:vi.fn().mockReturnThis()};
    Object.assign(f.player,{body,active:true,sprite:{x:432},update:vi.fn()});
    Object.assign(f.target,{controls:{read:vi.fn(()=>({...input}))},fox:{image:{x:790},cinematicLocked:true,update:vi.fn(),checkDash:vi.fn()},hud:{update:vi.fn()},cake:{state:'IDLE',update:vi.fn()},enemies:[],chains:[],franklin:display,objective:display,status:display,story:display,compass:display,time:{now:0},children:{getByName:()=>undefined},hasPracticeAssist:()=>false});
    Reflect.get(RescueScene.prototype,'update').call(f.target,0,16);Reflect.get(RescueScene.prototype,'update').call(f.target,16,16);
    expect(f.target.controls.read).toHaveBeenCalledTimes(2);expect((f.player as any).update).not.toHaveBeenCalled();expect(body.velocity).toEqual({x:0,y:-280});expect(body.setAllowGravity).toHaveBeenCalledWith(true);expect(f.target.fox.update).toHaveBeenCalledTimes(2);
  });

  it('schedules one death retry, preserving released record and stopping all advancing work',()=>{
    vi.stubGlobal('document',{visibilityState:'visible'});const f=fixture('released');
    Object.assign(f.player,{active:false,ultimateCharge:77,infiniteHealth:false});
    Object.assign(f.target,{controls:{read:()=>({})},hasPracticeAssist:()=>false,devPreview:true,fox:{stopHazards:vi.fn(),update:vi.fn(),checkDash:vi.fn()},cake:{drop:vi.fn(),update:vi.fn()},saveCampaign:vi.fn(),physics:{world:{pause:vi.fn()}},time:{delayedCall:vi.fn()},scene:{restart:vi.fn()},hud:{update:vi.fn()}});
    for(let i=0;i<5;i++)f.target.update(i*16,16);
    expect(f.target.time.delayedCall).toHaveBeenCalledTimes(1);expect(f.target.fox.stopHazards).toHaveBeenCalledTimes(1);expect(f.target.fox.update).not.toHaveBeenCalled();expect(f.target.cake.update).not.toHaveBeenCalled();expect(f.target.hud.update).not.toHaveBeenCalled();
    const [delay,retry]=f.target.time.delayedCall.mock.calls[0];expect(delay).toBe(550);retry();expect(f.target.scene.restart).toHaveBeenCalledWith(expect.objectContaining({retry:true,checkpoint:540,charge:0,ultimateCharge:0,opened:[0],bossDefeated:false}));
  });
  it('spawns Franklin once in the released stage at the authored location', () => {
    const f = fixture('released');
    Reflect.get(RescueScene.prototype, 'spawnFranklinBoss').call(f.target);
    expect(franklinConstruct).toHaveBeenCalledTimes(1);
    expect(franklinConstruct.mock.calls[0].slice(2)).toEqual([f.player, expect.any(Function), 790, undefined]);
    expect(f.camera.stopFollow).not.toHaveBeenCalled();
    expect(f.target.tweens.add).not.toHaveBeenCalled();
    Reflect.get(RescueScene.prototype, 'spawnFranklinBoss').call(f.target);
    expect(franklinConstruct).toHaveBeenCalledTimes(1);
  });

  it('does not spawn unless Franklin has been released', () => {
    const f = fixture('chained');
    Reflect.get(RescueScene.prototype, 'spawnFranklinBoss').call(f.target);
    expect(franklinConstruct).not.toHaveBeenCalled();
  });

  it('does not consume a thrown cake when Franklin cannot accept damage or geometry misses', () => {
    const f = fixture('released');
    const registerEnemyHit = vi.fn(() => true);
    const damage = vi.fn(() => true);
    f.target.cake = { isThrown: true, sprite: { x: 790, y: 320 }, registerEnemyHit };
    f.target.fox = { canBeHit: () => false, overlapsCake: () => true, damage };
    expect(Reflect.get(RescueScene.prototype, 'resolveFranklinCakeHit').call(f.target)).toBe(false);
    expect(registerEnemyHit).not.toHaveBeenCalled();
    expect(damage).not.toHaveBeenCalled();
    f.target.fox = { canBeHit: () => true, overlapsCake: () => false, damage };
    expect(Reflect.get(RescueScene.prototype, 'resolveFranklinCakeHit').call(f.target)).toBe(false);
    expect(registerEnemyHit).not.toHaveBeenCalled();
    expect(damage).not.toHaveBeenCalled();
  });
});
