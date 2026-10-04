import {describe,expect,it} from 'vitest';
import {canHareJump,createBoarState,findHareSupport,hareLandingTimeSeconds,harePassiveBounds,isHareNear,safeHareBounds,selectHareClimbTarget,stepBoar,type AnimalSurface} from '../src/systems/animalRules';

const ledge=(left:number,right:number,top:number,enabled=true,room=2):AnimalSurface=>({room,left,right,top,bottom:top+32,enabled});

describe('animal pure behavior rules',()=>{
 it('holds the boar still through pause, gives a final tell, then alternates committed 260-speed charges',()=>{
  let state=createBoarState();
  for(let i=0;i<14;i++){const step=stepBoar(state,{deltaMs:50,x:300,left:100,right:500});state=step.state;expect(step.velocityX).toBe(0);expect(step.tell).toBe(i>=14);}
  let step=stepBoar(state,{deltaMs:50,x:300,left:100,right:500});state=step.state;expect(step.velocityX).toBe(0);expect(step.tell).toBe(true);
  for(let i=0;i<5;i++){step=stepBoar(state,{deltaMs:50,x:300,left:100,right:500});state=step.state;}expect(step.state.phase).toBe('charge');expect(step.velocityX).toBe(-260);
  step=stepBoar(state,{deltaMs:50,x:280,left:100,right:500});state=step.state;expect(step.velocityX).toBe(-260);
  step=stepBoar(state,{deltaMs:50,x:100,left:100,right:500});expect(step.velocityX).toBe(0);expect(step.state).toEqual({phase:'pause',elapsedMs:0,direction:1});
  state=step.state;for(let i=0;i<20;i++)state=stepBoar(state,{deltaMs:50,x:100,left:100,right:500}).state;
  expect(stepBoar(state,{deltaMs:50,x:120,left:100,right:500}).velocityX).toBe(260);
 });
 it('caps boar time and restarts with a full pause after long sleep or a wall hit',()=>{
  const charging={phase:'charge' as const,elapsedMs:200,direction:-1 as const};
  expect(stepBoar(charging,{deltaMs:250,x:300,left:100,right:500}).state).toEqual({phase:'pause',elapsedMs:0,direction:-1});
  const wall=stepBoar(charging,{deltaMs:16,x:300,left:100,right:500,blockedLeft:true});
  expect(wall).toMatchObject({velocityX:0,state:{phase:'pause',elapsedMs:0,direction:1}});
  expect(stepBoar(createBoarState(),{deltaMs:33,x:300,left:100,right:500}).state.elapsedMs).toBe(33);
  const timeout=stepBoar({phase:'charge',elapsedMs:650,direction:1},{deltaMs:50,x:300,left:100,right:500});
  expect(timeout).toMatchObject({velocityX:0,state:{phase:'pause',direction:-1}});
 });
 it('keeps a far or inactive hare in passive patrol and only considers active nearby players',()=>{
  expect(isHareNear({active:true,x:0,feet:100},{x:320,feet:320})).toBe(true);
  expect(isHareNear({active:true,x:0,feet:100},{x:321,feet:100})).toBe(false);
  expect(isHareNear({active:false,x:0,feet:100},{x:0,feet:100})).toBe(false);
  expect(canHareJump(false,true,1200,0)).toBe(false);
  expect(canHareJump(true,false,1200,0)).toBe(false);
  expect(canHareJump(true,true,899,900)).toBe(false);
  expect(canHareJump(true,true,900,900)).toBe(true);
  const support=ledge(100,500,300);
  expect(safeHareBounds(support,0,1440,34)).toEqual({left:146,right:454});
  expect(harePassiveBounds({left:105,right:255},{left:385,right:515})).toEqual({left:385,right:515});
  expect(harePassiveBounds({left:100,right:400},{left:146,right:454})).toEqual({left:146,right:400});
  expect(findHareSupport([support],2,200,300,34)).toBe(support);
  expect(findHareSupport([{...support,enabled:false}],2,200,300,34)).toBeUndefined();
 });
 it('selects a reachable higher ledge toward the player and rejects disabled, high, overhead, and pit-crossing choices',()=>{
  const current=ledge(70,290,274),candidate=ledge(350,550,236),overhead=ledge(150,370,240),tooHigh=ledge(350,550,160),disabled={...ledge(350,550,240),enabled:false},far=ledge(900,1100,240);
  const args={room:2,x:255,feet:274,playerX:450,halfBodyWidth:23,roomLeft:0,roomRight:1440};
  expect(selectHareClimbTarget({...args,surfaces:[current,candidate]})).toMatchObject({x:385,rise:38,surface:candidate});
  expect(selectHareClimbTarget({...args,surfaces:[current,overhead]})).toBeUndefined();
  expect(selectHareClimbTarget({...args,surfaces:[current,tooHigh]})).toBeUndefined();
  expect(selectHareClimbTarget({...args,surfaces:[current,disabled]})).toBeUndefined();
  expect(selectHareClimbTarget({...args,surfaces:[current,far]})).toBeUndefined();
  expect(hareLandingTimeSeconds(70)).toBeGreaterThan(0);
 });
});
