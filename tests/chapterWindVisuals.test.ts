import {describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {ChapterTraps} from '../src/systems/ChapterTraps';
import {encounterFor} from '../src/data/chapterChallenges';
import {roomFor} from '../src/data/qualityRooms';

function image(){
 return {x:0,y:0,visible:false,flipX:false,alpha:1,setVisible(v:boolean){this.visible=v;return this;},setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setFlipX(v:boolean){this.flipX=v;return this;},setAlpha(v:number){this.alpha=v;return this;}};
}
function ambientSlots(room:number){return Array.from({length:16},(_,i)=>i).filter(i=>Math.floor(i/2)%3===room%3);}
function harness(){
 const traps=Object.create(ChapterTraps.prototype) as any;
 traps.windStreaks=Array.from({length:20},image);traps.reducedMotion={matches:false};traps.specials=new Map();traps.windRooms=new Map();
 setKind(traps,'outside');
 traps.player={body:{center:{x:800,y:360}}};
 return traps;
}
function setKind(traps:any,kind:'jail'|'outside'|'crimson'){
 traps.kind=kind;traps.windRooms.clear();
 for(let room=0;room<22;room++){
  const wind=encounterFor(kind,room)?.wind;if(wind)traps.windRooms.set(room,{direction:wind.direction,floor:roomFor(kind,room)?.floor??360});
 }
}
function updateHarness(kind:'jail'|'outside'|'crimson',room:number,grounded=false,isDashing=false,usingUltimate=false){
 const traps=harness();setKind(traps,kind);traps.sectionCount=kind==='jail'?12:kind==='crimson'?10:22;
 traps.scene={sys:{isActive:()=>true},physics:{world:{isPaused:false}},game:{loop:{delta:1000/60}}};
 traps.player.active=true;traps.player.grounded=grounded;traps.player.isDashing=isDashing;traps.player.usingUltimate=usingUltimate;
 traps.player.body.center.x=room*1440+700;traps.player.body.velocity={x:0};
 traps.effects=new Map();traps.presses=new Map();traps.crumbles=new Map();traps.roomActive=Array.from({length:traps.sectionCount},()=>false);
 traps.windDriftX=0;traps.clockMs=0;traps.suspendedGap=false;traps.dust=[];
 return traps;
}

describe('ChapterTraps ambient wind visuals',()=>{
 it('applies the authored wind drift in the actual update path to airborne non-dashing players',()=>{
  vi.stubGlobal('document',{visibilityState:'visible'});
  for(const [room,direction,strength] of [[7,1,80],[15,-1,90]] as const){
   const traps=updateHarness('outside',room);
   for(let frame=0;frame<60;frame++){traps.player.body.velocity.x=4;traps.update(1000/60);}
   expect(traps.windDriftX).toBeCloseTo(direction*strength*.9);
   expect(traps.player.body.velocity.x).toBeCloseTo(4+direction*strength*.9);
  }
  for(const [room,direction] of [[7,1],[15,-1]] as const){
   const traps=updateHarness('outside',room);
   for(let frame=0;frame<600;frame++){traps.player.body.velocity.x=0;traps.update(1000/60);}
   expect(traps.windDriftX).toBe(direction*170);
  }
  for(const [grounded,dashing,ultimate] of [[true,false,false],[false,true,false],[false,false,true]] as const){
   const traps=updateHarness('outside',7,grounded,dashing,ultimate);
   for(let frame=0;frame<60;frame++){traps.player.body.velocity.x=4;traps.update(1000/60);}
   expect(traps.windDriftX).toBe(0);expect(traps.player.body.velocity.x).toBe(4);
  }
  vi.unstubAllGlobals();
 });

 it('keeps a room field anchored through player motion and room-boundary crossing',()=>{
  const traps=harness();
  traps.player.body.center.x=7*1440+700;
  traps.updateWindVisuals(1000,traps.player.body,6,8);
  const slots=ambientSlots(7),anchors=slots.filter(i=>i%2===0),before=anchors.map(i=>[traps.windStreaks[i].x,traps.windStreaks[i].y]);
  expect(slots).toHaveLength(6);expect(slots.every(i=>traps.windStreaks[i].visible)).toBe(true);
  for(let pair=0;pair<slots.length;pair+=2){const dx=traps.windStreaks[slots[pair+1]].x-traps.windStreaks[slots[pair]].x;expect((dx%1440+1440)%1440).toBe(240);expect(traps.windStreaks[slots[pair+1]].y-traps.windStreaks[slots[pair]].y).toBe(26.5);}
  for(const [dx,dy] of [[180,-70],[-225,120],[310,45],[-80,-190]]){
   traps.player.body.center.x+=dx;traps.player.body.center.y+=dy;
   traps.updateWindVisuals(1000,traps.player.body,6,8);
   expect(anchors.map(i=>[traps.windStreaks[i].x,traps.windStreaks[i].y])).toEqual(before);
  }
  traps.updateWindVisuals(1000,traps.player.body,7,9);
  expect(anchors.map(i=>[traps.windStreaks[i].x,traps.windStreaks[i].y])).toEqual(before);
  expect(traps.windStreaks[2].y).toBe(173.5);
  for(const slot of slots){expect(traps.windStreaks[slot].flipX).toBe(false);expect(traps.windStreaks[slot].alpha).toBe(.47);}
  traps.updateWindVisuals(1000,traps.player.body,8,10);
  expect(slots.every((slot:number)=>!traps.windStreaks[slot].visible)).toBe(true);
 });

 it('animates within authored room bounds in both wind directions, including wraparound',()=>{
  const traps=harness(),positiveRoom=7,negativeRoom=15;
  expect(ambientSlots(positiveRoom)).toHaveLength(6);expect(ambientSlots(negativeRoom)).toHaveLength(6);
  setKind(traps,'crimson');expect(ambientSlots(2)).toHaveLength(4);expect(traps.windRooms.has(2)).toBe(true);
  traps.updateWindVisuals(100,traps.player.body,2,2);expect(ambientSlots(2).every(i=>traps.windStreaks[i].visible)).toBe(true);expect(traps.windStreaks.slice(0,16).filter((s:any)=>s.visible)).toHaveLength(4);
  setKind(traps,'outside');
  traps.updateWindVisuals(1000,traps.player.body,positiveRoom,positiveRoom);
  const movingRight=traps.windStreaks[2].x;traps.updateWindVisuals(2000,traps.player.body,positiveRoom,positiveRoom);expect(traps.windStreaks[2].x-movingRight).toBe(160);
  traps.updateWindVisuals(1000,traps.player.body,negativeRoom,negativeRoom);
  const movingLeft=traps.windStreaks[0].x;traps.updateWindVisuals(2000,traps.player.body,negativeRoom,negativeRoom);expect(traps.windStreaks[0].x-movingLeft).toBe(-160);
  traps.updateWindVisuals(94400,traps.player.body,positiveRoom,positiveRoom);
  const right=traps.windStreaks[2];expect(right.visible).toBe(true);expect(right.x).toBeGreaterThanOrEqual(positiveRoom*1440);expect(right.x).toBeLessThan((positiveRoom+1)*1440);
  const x=right.x;traps.updateWindVisuals(95400,traps.player.body,positiveRoom,positiveRoom);expect(right.x).toBeLessThan(x);
  expect(right.flipX).toBe(false);expect(right.alpha).toBe(.47);
  traps.updateWindVisuals(93875,traps.player.body,negativeRoom,negativeRoom);
  const left=traps.windStreaks[0];expect(left.visible).toBe(true);expect(left.x).toBeGreaterThanOrEqual(negativeRoom*1440);expect(left.x).toBeLessThan((negativeRoom+1)*1440);
  const leftX=left.x;traps.updateWindVisuals(94875,traps.player.body,negativeRoom,negativeRoom);expect(left.x).toBeGreaterThan(leftX);
  expect(left.flipX).toBe(true);expect(left.alpha).toBe(.36);
 });

 it('hides fields for rooms without authored wind and when reduced motion is on',()=>{
  const traps=harness();setKind(traps,'crimson');traps.updateWindVisuals(100,traps.player.body,0,0);
  expect(traps.windStreaks.slice(0,16).every((s:any)=>!s.visible)).toBe(true);
  setKind(traps,'outside');traps.updateWindVisuals(100,traps.player.body,9,9);expect(traps.windStreaks.slice(0,16).every((s:any)=>!s.visible)).toBe(true);
  setKind(traps,'outside');traps.reducedMotion.matches=true;traps.updateWindVisuals(100,traps.player.body,7,7);
  expect(traps.windStreaks.slice(0,16).every((s:any)=>!s.visible)).toBe(true);
 });

 it('keeps the fixed twenty-image pool and conveyor slots 16 through 19',()=>{
  const traps=harness();
  traps.specials.set(7,Array.from({length:4},(_,i)=>({type:'conveyor',direction:i%2===0?-1 as const:1 as const,x:7*1440+650+i*30,y:300,surface:{shape:{body:{top:250+i}}}})));
  traps.player.body.center.x=7*1440+700;
  traps.updateWindVisuals(100,traps.player.body,7,7);
  expect(traps.windStreaks).toHaveLength(20);
  expect(ambientSlots(7).every((i:number)=>traps.windStreaks[i].visible)).toBe(true);
  for(let i=0;i<4;i++){expect(traps.windStreaks[16+i].visible).toBe(true);expect(traps.windStreaks[16+i].flipX).toBe(i%2===0);expect(traps.windStreaks[16+i].y).toBe(258+i);expect(traps.windStreaks[16+i].alpha).toBe(.58);}
 });
});
