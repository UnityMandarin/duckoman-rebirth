import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
import {requestPauseMenu} from '../src/systems/MenuControl';
import {MenuScene} from '../src/scenes/MenuScene';
import {beginUltimateFreeze,ownsUltimateFreeze,canUltimateDamage} from '../src/systems/ultimateFreeze';
function emitter(){const listeners=new Map<string,Set<any>>();return {listeners,on:(key:string,fn:any)=>{const s=listeners.get(key)??new Set();s.add(fn);listeners.set(key,s);},off:(key:string,fn:any)=>listeners.get(key)?.delete(fn),emit:(key:string)=>{for(const fn of listeners.get(key)??[])fn();}};}
function fixture(){vi.stubGlobal('document',{visibilityState:'visible'});const world:any={...emitter(),isPaused:false,pause(){this.isPaused=true;this.emit('pause');},resume:vi.fn(function(this:any){this.isPaused=false;this.emit('resume');})};const scene:any={events:emitter(),physics:{world},sys:{isActive:()=>true}},player:any={active:true,usingUltimate:true};return {scene,player,world};}
describe('owned ultimate physical freeze',()=>{
 it('pauses, scopes to one scene/player, permits damage and resumes only its own pause once',()=>{
  const f=fixture(),release=beginUltimateFreeze(f.scene,f.player);expect(f.world.isPaused).toBe(true);expect(canUltimateDamage(f.scene,f.player)).toBe(true);expect(canUltimateDamage(f.scene,{...f.player})).toBe(false);expect(ownsUltimateFreeze(f.scene,f.player)).toBe(true);release();release();expect(f.world.resume).toHaveBeenCalledOnce();expect(ownsUltimateFreeze(f.scene)).toBe(false);
 });
 it('runs the actual menu pause/resume path and releases physics at freeze completion',()=>{
  const f=fixture();let parentActive=true,menuActive=false;const manager:any={isActive:(key:string)=>key==='rescue'?parentActive:menuActive,isPaused:(key:string)=>key==='rescue'?!parentActive:false,pause:()=>{parentActive=false;f.scene.events.emit('pause');},launch:()=>{menuActive=true;},resume:()=>{parentActive=true;f.scene.events.emit('resume');},stop:()=>{menuActive=false;},setVisible:vi.fn()};
  f.scene.scene=manager;f.scene.sys={settings:{key:'rescue'},isActive:()=>parentActive};const release=beginUltimateFreeze(f.scene,f.player);expect(requestPauseMenu(f.scene,vi.fn())).toBe(true);f.scene.events.emit('postupdate');expect(parentActive).toBe(false);expect(canUltimateDamage(f.scene,f.player)).toBe(false);expect(f.world.isPaused).toBe(true);
  Reflect.get(MenuScene.prototype,'closeResume').call({pausedScene:'rescue',actionTaken:false,presentation:{close:(done:any)=>done()},scene:manager,game:{canvas:{focus:vi.fn()}}});expect(parentActive).toBe(true);expect(canUltimateDamage(f.scene,f.player)).toBe(true);expect(f.world.isPaused).toBe(true);
  release();f.player.usingUltimate=false;let x=100;if(parentActive&&!f.world.isPaused)x+=16;expect(x).toBe(116);expect(f.world.resume).toHaveBeenCalledOnce();expect(ownsUltimateFreeze(f.scene)).toBe(false);
 });
 it('allows expiry while scene-suspended without reviving scene or retaining a stuck physics pause',()=>{const f=fixture(),release=beginUltimateFreeze(f.scene,f.player);f.scene.sys.isActive=()=>false;f.scene.events.emit('sleep');release();expect(f.world.isPaused).toBe(false);expect(f.scene.sys.isActive()).toBe(false);expect(ownsUltimateFreeze(f.scene)).toBe(false);});
 it('never claims or resumes a preexisting pause',()=>{const f=fixture();f.world.pause();const release=beginUltimateFreeze(f.scene,f.player);expect(canUltimateDamage(f.scene,f.player)).toBe(false);release();expect(f.world.resume).not.toHaveBeenCalled();});
 it.each(['world-pause','shutdown'])('revokes on %s and never resumes an external pause',kind=>{
  const f=fixture(),release=beginUltimateFreeze(f.scene,f.player);if(kind==='world-pause')f.world.pause();else f.scene.events.emit(kind==='scene-pause'?'pause':kind);expect(canUltimateDamage(f.scene,f.player)).toBe(false);release();expect(f.world.resume).not.toHaveBeenCalled();expect([...f.scene.events.listeners.values()].every((s:any)=>s.size===0)).toBe(true);expect([...f.world.listeners.values()].every((s:any)=>s.size===0)).toBe(true);
 });
 it.each(['hidden','inactive','dead','finished-ultimate'])('rejects %s even during an owned freeze',kind=>{
  const f=fixture(),release=beginUltimateFreeze(f.scene,f.player);if(kind==='hidden')vi.stubGlobal('document',{visibilityState:'hidden'});if(kind==='inactive')f.scene.sys.isActive=()=>false;if(kind==='dead')f.player.active=false;if(kind==='finished-ultimate')f.player.usingUltimate=false;expect(canUltimateDamage(f.scene,f.player)).toBe(false);release();expect(ownsUltimateFreeze(f.scene)).toBe(false);
 });
});
