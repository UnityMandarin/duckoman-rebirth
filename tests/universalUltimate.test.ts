import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scenes:{Events:{SHUTDOWN:'shutdown',PAUSE:'pause',RESUME:'resume',SLEEP:'sleep'}},Core:{Events:{BLUR:'blur'}},Math:{Clamp:(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n)),Linear:(a:number,b:number,t:number)=>a+(b-a)*t}}}));
vi.mock('../src/systems/HitSpark',()=>({hitSpark:vi.fn()}));
vi.mock('../src/systems/DebrisBurst',()=>({scatterDebris:vi.fn()}));
import {AntlerRegent} from '../src/entities/AntlerRegent';
import {CrabBoss} from '../src/entities/CrabBoss';
import {BreakableWall} from '../src/entities/BreakableWall';
import {UltimateStrike} from '../src/systems/ultimateSwingMath';
function display(x=0,y=0):any {
 const d:any={x,y,visible:true,alpha:1,displayWidth:0,displayHeight:0,originX:.5,originY:.5,scaleX:1,scaleY:1};
 for(const name of ['setX','setDepth','setScrollFactor','setCrop','setText','setTint','setAngle','clear','lineStyle','lineBetween','fillStyle','fillCircle','fillRect','strokeRoundedRect','setFlipX','setScale'])d[name]=()=>d;
 d.setOrigin=(x:number,y=x)=>{d.originX=x;d.originY=y;return d;};d.setDisplaySize=(w:number,h:number)=>{d.displayWidth=w;d.displayHeight=h;return d;};d.setVisible=(v:boolean)=>{d.visible=v;return d;};d.setAlpha=(v:number)=>{d.alpha=v;return d;};d.setPosition=(x:number,y:number)=>{d.x=x;d.y=y;return d;};d.setY=(y:number)=>{d.y=y;return d;};d.destroy=vi.fn();
 d.getBounds=()=>({left:d.x-203,right:d.x+203,top:d.y-159,bottom:d.y});return d;
}
function fixture(){
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});const listeners=new Map<string,Set<any>>();
 const events:any={on:(k:string,fn:any)=>{const s=listeners.get(k)??new Set();s.add(fn);listeners.set(k,s);},once:(k:string,fn:any)=>events.on(k,fn),off:(k:string,fn:any)=>listeners.get(k)?.delete(fn)};
 const scene:any={add:{image:display,text:display,graphics:()=>display(),ellipse:display,container:display},textures:{get:()=>({has:()=>true,key:'__MISSING'})},events,game:{events},time:{now:1000},sys:{isActive:()=>true},physics:{world:{isPaused:false}},tweens:{add:vi.fn()}};
 const player:any={sprite:{scene},active:true,usingUltimate:true,body:{center:{x:0,y:300}},chargeUltimate:vi.fn()};const emit=(strike:any)=>{for(const fn of listeners.get('ultimate-strike')??[])fn(strike);};return {scene,player,listeners,emit};
}
describe('universal ultimate targets',()=>{
 it('reaches Regent head outside dash weakspot, retains four damage and does not consume a cooldown strike',()=>{
  const f=fixture(),boss=new AntlerRegent(f.scene,f.player,{} as any,0,1500,vi.fn());(boss as any).engaged=true;
  const strike=new UltimateStrike(f.player,{x:boss.image.x,y:185},1,5,5);strike.sweepTo(0);f.emit(strike);expect(boss.hp).toBe(6);
  const blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(boss.hp).toBe(6);
 });
 it('hits Crab claw outside shell, preserves invisible underground immunity and four damage',()=>{
  const f=fixture(),boss=new CrabBoss(f.scene,f.player,0,1500,vi.fn());(boss as any).engaged=true;
  const strike=new UltimateStrike(f.player,{x:boss.image.x+180,y:280},1,5,5);strike.sweepTo(0);f.emit(strike);expect(boss.hp).toBe(16);
  (boss as any).clockMs=1000;(boss as any).phase='underground';boss.image.visible=false;const blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(boss.hp).toBe(16);
  (boss as any).phase='burrow-down';boss.image.visible=true;f.emit(blocked);expect(boss.hp).toBe(12);
 });
 it('breaks enabled destructible walls once, disables collision and detaches on break/shutdown',()=>{
  const f=fixture(),solid:any={body:{enable:true,left:90,right:110,top:90,bottom:110,center:{x:100,y:100}}};
  const wall=new BreakableWall(f.scene,solid,[]);vi.spyOn(wall as any,'crumble').mockImplementation(()=>{});
  const strike=new UltimateStrike(f.player,{x:80,y:100},1,40,5);strike.sweepTo(0);f.emit(strike);f.emit(strike);expect(wall.isBroken).toBe(true);expect(solid.body.enable).toBe(false);expect(f.scene.tweens.add).toHaveBeenCalledOnce();expect(f.listeners.get('ultimate-strike')?.size).toBe(0);
  const inactive=new BreakableWall(f.scene,{body:{...solid.body,enable:false}} as any,[]),blocked={player:f.player,tryHit:vi.fn(()=>true)};f.emit(blocked);expect(blocked.tryHit).not.toHaveBeenCalled();expect(inactive.isBroken).toBe(false);
  for(const fn of f.listeners.get('shutdown')??[])fn();expect(f.listeners.get('ultimate-strike')?.size).toBe(0);
 });
});
