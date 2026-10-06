import {describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scenes:{Events:{PAUSE:'pause',SLEEP:'sleep',SHUTDOWN:'shutdown'}},Core:{Events:{BLUR:'blur'}}}}));
import {ChapterTraps} from '../src/systems/ChapterTraps';
import {chapterPlatforms} from '../src/data/chapters';

function image(){return {x:0,y:0,alpha:1,tint:undefined as number|undefined,visible:true,scaleX:1,scaleY:1,setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setScale(x:number,y=x){this.scaleX=x;this.scaleY=y;return this;},setAlpha(n:number){this.alpha=n;return this;},setTint(n:number){this.tint=n;return this;},clearTint(){this.tint=undefined;return this;},setVisible(v:boolean){this.visible=v;return this;},setDisplaySize(){return this;},setDepth(){return this;},setOrigin(){return this;}};}
function sceneMock(){
 const events={on:vi.fn(),once:vi.fn(),off:vi.fn()},add={image:vi.fn(()=>image()),text:vi.fn(()=>image()),graphics:vi.fn(()=>({setDepth(){return this;},clear(){return this;},lineStyle(){return this;},lineBetween(){return this;}}))};
 return {events,game:{events,loop:{delta:1000/60}},add,sys:{isActive:()=>true},physics:{world:{isPaused:false}},};
}
function make(kind:'jail'|'crimson',section:number){
 const platforms=chapterPlatforms(kind).filter(p=>(p.room??Math.floor(p.x/1440))===section&&p.role==='ledge'),surfaces=platforms.map(ledge=>{
  const art=image(),shape={x:ledge.x,y:ledge.y,body:{enable:true,left:ledge.x-ledge.width/2,right:ledge.x+ledge.width/2,top:ledge.y-16,bottom:ledge.y+16,updateFromGameObject(){this.left=shape.x-ledge.width/2;this.right=shape.x+ledge.width/2;this.top=shape.y-16;this.bottom=shape.y+16;}} as any,setPosition(x:number,y:number){this.x=x;this.y=y;return this;}};
  return {shape:shape as any,art:art as any,ledge};
 });
 const events=sceneMock(),body:any={center:{x:section*1440+1380,y:800},left:section*1440+1368,right:section*1440+1392,top:780,bottom:820,position:{x:0,y:0},prev:{x:0,y:0},velocity:{x:0,y:0}};
 const player:any={active:true,body,grounded:false,isDashing:false,usingUltimate:false,sprite:{x:body.center.x,y:body.center.y},takeDamage:()=>false};
 const traps=new ChapterTraps(events as any,player,kind,surfaces as any,[section]);
 return {traps,player,surfaces,scene:events};
}
function setX(player:any,x:number,y=800){const b=player.body;b.center.x=x;b.center.y=y;b.left=x-12;b.right=x+12;b.top=y-20;b.bottom=y+20;}
function advance(traps:ChapterTraps,frames:number,delta=1000/60){for(let i=0;i<frames;i++)traps.update(delta);}
function room(traps:any,section:number){return traps.disappearingRooms.get(section);}
function disabledCount(state:any){return state.entries.filter((entry:any)=>!entry.surface.shape.body.enable).length;}
const visible=()=>{vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('window',{matchMedia:()=>({matches:false})});};

describe('ChapterTraps disappearing platforms',()=>{
 it('repeats complete cycles with identical traces and never removes two landings',()=>{
  const traces:string[][]=[];
  for(let run=0;run<2;run++){
   visible();const {traps}=make('jail',5),state=room(traps,5),trace:string[]=[],warnings:number[]=[];
   let lastPhase='';
   for(let frame=0;frame<600;frame++){
    traps.update(50);
    expect(disabledCount(state)).toBeLessThanOrEqual(1);
    const current=`${state.index}:${state.entries[state.index].phase}`;
    if(current!==lastPhase&&state.entries[state.index].phase==='warn')warnings.push(state.index);
    lastPhase=current;
    trace.push(JSON.stringify(state.entries.map((entry:any)=>[entry.phase,entry.surface.shape.body.enable,entry.surface.art.alpha,entry.surface.shape.y])));
   }
   expect(warnings).toEqual([0,1,0,1,0,1,0,1,0]);
   traces.push(trace);vi.unstubAllGlobals();
  }
  expect(traces[1]).toEqual(traces[0]);
 });
 it('preserves elapsed warning time across a long suspension',()=>{
  visible();const {traps,scene}=make('jail',5),state=room(traps,5);
  traps.update(50);advance(traps,10,50);
  const clock=(traps as any).clockMs,at=state.entries[0].at;
  scene.sys.isActive=()=>false;advance(traps,400,50);
  expect((traps as any).clockMs).toBe(clock);
  scene.sys.isActive=()=>true;advance(traps,29,50);
  expect(state.entries[0].at).toBe(at);expect(state.entries[0].phase).toBe('warn');
  traps.update(50);expect(state.entries[0].phase).toBe('gone');
  vi.unstubAllGlobals();
 });
 it('runs ordered 2000/1000/400 cycles repeatably at 60Hz, with at most one disabled platform',()=>{
  for(let run=0;run<2;run++){
   visible();
   const {traps,player}=make('jail',5),state=room(traps,5),entries=state.entries;
   expect(entries.map((e:any)=>e.kind)).toEqual(['crumble','crumble']);
   setX(player,5*1440+1380);traps.update(1000/60);expect(state.started).toBe(true);expect(entries[0].phase).toBe('warn');
   expect(entries[0].surface.art.tint).toBe(0xffc36b);const alpha=entries[0].surface.art.alpha;advance(traps,12);expect(entries[0].surface.art.alpha).not.toBe(alpha);
   advance(traps,107);expect(entries[0].phase).toBe('warn');expect(disabledCount(state)).toBe(0);
   advance(traps,2);expect(entries[0].phase).toBe('gone');expect(disabledCount(state)).toBe(1);
   const top=entries[0].y-16;advance(traps,12);expect(entries[0].surface.art.y).toBeGreaterThan(top);expect(entries[0].surface.art.y).toBeLessThan(top+48);
   advance(traps,47);expect(entries[0].surface.art.alpha).toBe(0);expect(disabledCount(state)).toBe(1);
   advance(traps,2);expect(entries[0].phase).toBe('recover');expect(entries[0].surface.shape.body.enable).toBe(true);
   advance(traps,23);expect(entries[0].phase).toBe('recover');expect(entries[1].phase).toBe('solid');
   advance(traps,2);expect(entries[0].phase).toBe('solid');expect(entries[1].phase).toBe('warn');
   expect(disabledCount(state)).toBe(0);
   vi.unstubAllGlobals();
  }
 });
 it('starts no neighboring room early, freezes through pause and visibility gaps, and resets after leaving the active range',()=>{
  visible();const {traps,player}=make('jail',5),state=room(traps,5);setX(player,4*1440+500);traps.update(16);expect(state.started).toBe(false);
  setX(player,5*1440+1380);traps.update(16);expect(state.started).toBe(true);advance(traps,30);const at=state.entries[0].at,clock=(traps as any).clockMs;
  setX(player,5*1440+1380,1700);traps.update(16);expect(state.entries[0].phase).toBe('warn');expect(state.entries[0].at).toBe(at);
  (traps as any).scene.sys.isActive=()=>false;advance(traps,30);expect(state.entries[0].at).toBe(at);expect((traps as any).clockMs).toBeGreaterThan(clock);
  const pausedClock=(traps as any).clockMs;
  (traps as any).scene.sys.isActive=()=>true;(document as any).visibilityState='hidden';advance(traps,30);expect(state.entries[0].at).toBe(at);expect((traps as any).clockMs).toBe(pausedClock);
  (document as any).visibilityState='visible';(traps as any).scene.sys.isActive=()=>true;setX(player,8*1440+400);traps.update(16);expect(state.started).toBe(false);expect(state.entries.every((e:any)=>e.phase==='solid'&&e.surface.shape.body.enable)).toBe(true);
  setX(player,5*1440+1380);traps.update(16);expect(state.started).toBe(true);expect(state.entries[0].phase).toBe('warn');vi.unstubAllGlobals();
 });
 it('holds return and sequence advancement under actor overlap, then gives a full recovery window',()=>{
  visible();const {traps,player}=make('jail',5),state=room(traps,5),first=state.entries[0];setX(player,5*1440+1380);traps.update(16);
  advance(traps,120);expect(first.phase).toBe('gone');
  const x=first.x;setX(player,x,first.y);expect((traps as any).disappearingOverlap(player.body,first)).toBe(true);advance(traps,61);expect(first.phase).toBe('gone');expect(first.surface.shape.body.enable).toBe(false);expect(first.surface.shape.y).toBe(first.y);expect(first.surface.art.alpha).toBe(.28);expect(state.entries[1].phase).toBe('solid');
  setX(player,x+first.surface.ledge.width,first.y-100);traps.update(16);expect(first.phase).toBe('recover');expect(first.surface.shape.body.enable).toBe(true);
  advance(traps,23);expect(first.phase).toBe('recover');advance(traps,2);expect(state.entries[1].phase).toBe('warn');vi.unstubAllGlobals();
 });
 it('uses the same cycle for shutters and keeps the shutter solid until its warning ends',()=>{
  visible();const {traps,player}=make('jail',7),state=room(traps,7),entry=state.entries[0];expect(entry.kind).toBe('shutter');setX(player,7*1440+1380);traps.update(16);advance(traps,120);expect(entry.phase).toBe('gone');expect(entry.surface.shape.body.enable).toBe(false);expect(entry.surface.art.alpha).toBe(0);vi.unstubAllGlobals();
 });
});
