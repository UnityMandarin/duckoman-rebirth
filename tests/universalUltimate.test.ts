import {beginUltimateFreeze} from '../src/systems/ultimateFreeze';
import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{BlendModes:{ADD:1},TintModes:{FILL:1},Scenes:{Events:{SHUTDOWN:'shutdown',PAUSE:'pause',RESUME:'resume',SLEEP:'sleep'}},Core:{Events:{BLUR:'blur'}},Math:{Clamp:(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n)),Linear:(a:number,b:number,t:number)=>a+(b-a)*t,FloatBetween:(a:number,b:number)=>(a+b)/2,Between:(a:number,b:number)=>a}}}));
vi.mock('../src/systems/HitSpark',()=>({hitSpark:vi.fn()}));
vi.mock('../src/systems/DebrisBurst',()=>({scatterDebris:vi.fn()}));
import {CastleBoss} from '../src/entities/CastleBoss';
import {RustWing} from '../src/entities/RustWing';
import {playUltimateSwing} from '../src/systems/UltimateSwing';
import {rustDamage} from '../src/systems/rustWingMath';
import {AntlerRegent} from '../src/entities/AntlerRegent';
import {CrabBoss} from '../src/entities/CrabBoss';
import {BreakableWall} from '../src/entities/BreakableWall';
import {UltimateStrike} from '../src/systems/ultimateSwingMath';
function display(x=0,y=0):any {
 const d:any={x,y,depth:12,active:true,visible:true,alpha:1,displayWidth:0,displayHeight:0,originX:.5,originY:.5,scaleX:1,scaleY:1};
 for(const name of ['add','setFrame','setBlendMode','setTintMode','setX','setDepth','setScrollFactor','setCrop','setText','setTint','setAngle','clear','lineStyle','lineBetween','fillStyle','fillCircle','fillRect','strokeRoundedRect','setFlipX','setScale'])d[name]=()=>d;
 d.setOrigin=(x:number,y=x)=>{d.originX=x;d.originY=y;return d;};d.setDisplaySize=(w:number,h:number)=>{d.displayWidth=w;d.displayHeight=h;return d;};d.setVisible=(v:boolean)=>{d.visible=v;return d;};d.setAlpha=(v:number)=>{d.alpha=v;return d;};d.setPosition=(x:number,y:number)=>{d.x=x;d.y=y;return d;};d.setY=(y:number)=>{d.y=y;return d;};d.destroy=vi.fn();
 d.getBounds=()=>({left:d.x-203,right:d.x+203,top:d.y-159,bottom:d.y});return d;
}
function fixture(){
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});const listeners=new Map<string,Set<any>>();
 const events:any={emit:(key:string,...args:any[])=>{for(const fn of listeners.get(key)??[])fn(...args);},on:(k:string,fn:any)=>{const s=listeners.get(k)??new Set();s.add(fn);listeners.set(k,s);},once:(k:string,fn:any)=>events.on(k,fn),off:(k:string,fn:any)=>listeners.get(k)?.delete(fn)};
 const scene:any={add:{rectangle:display,image:display,text:display,graphics:()=>display(),ellipse:display,container:display},textures:{exists:()=>true,get:()=>({has:()=>true,key:'__MISSING'})},events,game:{events},time:{now:1000},sys:{isActive:()=>true},cameras:{main:{midPoint:{x:0,y:0},width:640,height:400,zoom:1,getWorldPoint:(x:number,y:number)=>({x,y}),getBounds:()=>({x:0,y:0,width:1200,height:500}),flash(){return this;},shake(){return this;}}},physics:{add:{existing:(d:any)=>{d.body={enable:true};},collider:()=>{}},world:{isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}}},tweens:{add:vi.fn()}};
 const player:any={sprite:{scene},active:true,usingUltimate:true,body:{center:{x:0,y:300}},chargeUltimate:vi.fn()};const emit=(strike:any)=>{for(const fn of listeners.get('ultimate-strike')??[])fn(strike);};return {scene,player,listeners,emit};
}
describe('universal ultimate targets',()=>{
 it.each(['Castle','RustWing'])('runs the actual sword windup/strike timeline against %s during owned physical freeze',kind=>{
  const f=fixture();const jobs:any[]=[],timers:any[]=[];f.scene.tweens={add:(job:any)=>{jobs.push(job);},addCounter:(job:any)=>{jobs.push(job);}};f.scene.time.delayedCall=(ms:number,callback:any)=>timers.push({ms,callback});
  const boss:any=kind==='Castle'?new CastleBoss(f.scene,f.player,{} as any,{} as any,vi.fn()):new RustWing(f.scene,f.player);boss.engaged=true;boss.started=1000;boss.phase='lunge';const image=kind==='Castle'?boss.image:boss.sprite;image.setPosition(image.x,330);f.player.sprite.x=image.x-140;f.player.sprite.y=338;f.player.facing=1;f.player.visual=display();f.player.abilities={setSprint:vi.fn(),cancelTransient:vi.fn()};f.player.body.setVelocity=()=>f.player.body;f.player.body.setAllowGravity=()=>f.player.body;
  Object.defineProperty(f.player,'usingUltimate',{get:()=>f.scene.time.now<f.player.ultimateUntil});const hp=boss.health.hp;playUltimateSwing(f.scene,f.player);expect(f.scene.physics.world.isPaused).toBe(true);const state=kind==='Castle'?boss.image.x:boss.controller;boss.update(50);expect(kind==='Castle'?boss.image.x:boss.controller).toBe(state);
  f.scene.time.now+=260;jobs.shift().onComplete();f.scene.time.now+=110;jobs.shift().onComplete();const swing=jobs.shift();expect(swing.duration).toBe(220);swing.onUpdate({getValue:()=>.5});swing.onUpdate({getValue:()=>.6});expect(boss.health.hp).toBe(hp-(kind==='Castle'?4:rustDamage('ultimate')));expect(f.scene.physics.world.isPaused).toBe(true);
  f.scene.time.now=2000;timers.filter(t=>t.ms===1000).forEach(t=>t.callback());expect(f.scene.physics.world.isPaused).toBe(false);expect(f.player.usingUltimate).toBe(false);
 });
 it('reaches Regent head outside dash weakspot, retains four damage and does not consume a cooldown strike',()=>{
  const f=fixture(),boss=new AntlerRegent(f.scene,f.player,{} as any,0,1500,vi.fn());(boss as any).engaged=true;beginUltimateFreeze(f.scene,f.player);boss.update(50);expect(f.scene.physics.world.isPaused).toBe(true);
  const strike=new UltimateStrike(f.player,{x:boss.image.x,y:185},1,5,5);strike.sweepTo(0);f.emit(strike);expect(boss.hp).toBe(6);
  const blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(boss.hp).toBe(6);
 });
 it('hits Crab claw outside shell, preserves invisible underground immunity and four damage',()=>{
  const f=fixture(),boss=new CrabBoss(f.scene,f.player,0,1500,vi.fn());(boss as any).engaged=true;beginUltimateFreeze(f.scene,f.player);boss.update(50);expect(f.scene.physics.world.isPaused).toBe(true);
  const strike=new UltimateStrike(f.player,{x:boss.image.x+180,y:280},1,5,5);strike.sweepTo(0);f.emit(strike);expect(boss.hp).toBe(16);
  (boss as any).clockMs=1000;(boss as any).phase='underground';boss.image.visible=false;const blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(boss.hp).toBe(16);
  (boss as any).phase='burrow-down';boss.image.visible=true;f.emit(blocked);expect(boss.hp).toBe(12);
 });
 it('breaks enabled destructible walls once, disables collision and detaches on break/shutdown',()=>{
  const f=fixture(),solid:any={body:{enable:true,left:90,right:110,top:90,bottom:110,center:{x:100,y:100}}};
  const wall=new BreakableWall(f.scene,solid,[]);vi.spyOn(wall as any,'crumble').mockImplementation(()=>{});
  beginUltimateFreeze(f.scene,f.player);expect(f.scene.physics.world.isPaused).toBe(true);const strike=new UltimateStrike(f.player,{x:80,y:100},1,40,5);strike.sweepTo(0);f.emit(strike);f.emit(strike);expect(wall.isBroken).toBe(true);expect(solid.body.enable).toBe(false);expect(f.scene.tweens.add).toHaveBeenCalledOnce();expect(f.listeners.get('ultimate-strike')?.size).toBe(0);
  const inactive=new BreakableWall(f.scene,{body:{...solid.body,enable:false}} as any,[]),blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(inactive.isBroken).toBe(false);
  for(const fn of f.listeners.get('shutdown')??[])fn();expect(f.listeners.get('ultimate-strike')?.size).toBe(0);
 });
});
