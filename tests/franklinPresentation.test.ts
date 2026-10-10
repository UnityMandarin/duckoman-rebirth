import {describe,it,expect} from 'vitest';
import {createFranklinActing,sampleFranklinPresentation,FRANKLIN_POSES,franklinAttachment,parseFranklinBeat,maskFranklinInput,franklinIntroZoom,sampleFranklinIntroFocus,sampleFranklinCrashFocus,franklinFocusScroll} from '../src/systems/FranklinPresentation';
import {createFranklinController,damageFranklin,tickFranklin,franklinCrash,franklinChipHealth} from '../src/systems/FranklinFireFoxRules';
import {TUNING} from '../src/config/tuning';
import type {InputSnapshot} from '../src/systems/InputController';
const sample=(phase:ReturnType<typeof createFranklinController>['phase'],elapsed:number)=>{const out=createFranklinActing();sampleFranklinPresentation({...createFranklinController(),phase,elapsed},elapsed,0,elapsed,out);return out;};
describe('Franklin presentation',()=>{
 it('keeps the mounted metal plate clear of the painted eye in every pose and facing',()=>{
  const chip={x:0,y:0},eye={x:0,y:0};
  for(const pose of Object.keys(FRANKLIN_POSES) as (keyof typeof FRANKLIN_POSES)[]){
   const f=FRANKLIN_POSES[pose],height=66*f.height/f.width;
   for(const flipped of [false,true]){
    franklinAttachment(pose,'chip',790,360,66,height,flipped,0,0,0,chip);
    franklinAttachment(pose,'eye',790,360,66,height,flipped,0,0,0,eye);
    expect(Math.abs(chip.x-eye.x)).toBeGreaterThan(8);
   }
  }
 });
 it('recognizes his friend, wakes the chip, resists and settles before the full warning',()=>{
  expect(sample('intro',800)).toMatchObject({pose:'friendly',eye:0,core:0,fire:0});
  expect(sample('intro',2400).core).toBeGreaterThan(0);expect(sample('intro',2400).eye).toBe(0);
  expect(sample('intro',3200)).toMatchObject({pose:'hurt'});expect(sample('intro',3200).eye).toBeGreaterThan(0);
  expect(sample('intro',4800)).toMatchObject({pose:'resist',eye:1});
  expect(sample('intro',6200).pose).toBe('crouch');expect(sample('intro',7400).pose).toBe('cast');expect(sample('intro',10000).pose).toBe('idle');
  expect(franklinIntroZoom(4600)).toBeCloseTo(.68);
  const c={...createFranklinController(),elapsed:10750};expect(tickFranklin(c,50,{bossX:790,playerX:540,playerY:330})).toMatchObject({phase:'pounce-cue',elapsed:0});expect(damageFranklin(c,30)).toEqual(c);
 });
 it('has a safe hittable overdrive once and collapse takes priority',()=>{
  const c={...createFranklinController(),phase:'pounce-cue' as const};const over=damageFranklin(c,16);
  expect(over).toMatchObject({phase:'overdrive',phase2:true,elapsed:0,hazards:[]});expect(damageFranklin(over,1)).toMatchObject({hp:15,phase:'overdrive'});
  expect(damageFranklin(c,30).phase).toBe('collapse');expect(sample('overdrive',100).pose).toBe('hurt');expect(sample('overdrive',600).pose).toBe('resist');expect(sample('overdrive',900).pose).toBe('cast');
 });
 it('uses true pounce, landing, spit and body-tail turns without a whole body rotation',()=>{
  expect(sample('pounce-cue',700).pose).toBe('crouch');expect(sample('pounce',80).pose).toBe('lunge');expect(sample('pounce',600).pose).toBe('landing');
  expect(sample('barrage',30)).toMatchObject({pose:'spit'});expect(sample('barrage',30).mouthFlash).toBeGreaterThan(0);expect(sample('barrage',250).pose).toBe('idle');
  expect(sample('tail-cue',200).pose).toBe('tail-windup');expect(sample('tail-cue',700).pose).toBe('tail-sweep');expect(Math.abs(sample('tail-cue',700).rotation)).toBeLessThan(.1);
 });
 it('softens eyes while resisting then visibly overrides them, and rescue extinguishes control',()=>{
  expect(sample('resistance',400).eye).toBeLessThan(.15);expect(sample('resistance',1190)).toMatchObject({eye:1,arc:1});
  for(const t of [0,500,1800,2800])expect(sample('rescued',t)).toMatchObject({eye:0,core:0,fire:0,arc:0});
  expect(sample('rescued',1800).heart).toBeGreaterThan(0);
 });
 it('preserves clean chip damage, never rewards failed crashes',()=>{
  const c={...createFranklinController(),phase:'final-charge' as const,hp:6,cleanCrashes:1};expect(franklinCrash(c,false)).toMatchObject({cleanCrashes:1});expect(franklinChipHealth(franklinCrash(c,false))).toBe(4);expect(franklinChipHealth(franklinCrash(c,true))).toBe(2);
 });
 it('transforms actual anchors with flip and rotation and keeps the exposed stomp within an ordinary jump',()=>{
  const a={x:0,y:0},b={x:0,y:0},f=FRANKLIN_POSES.exhausted,h=66*f.height/f.width;
  franklinAttachment('exhausted','chip',790,360,66,h,false,0,0,0,a);franklinAttachment('exhausted','chip',790,360,66,h,true,0,0,0,b);
  expect(a.x-790).toBeCloseTo(790-b.x);expect(a.y).toBe(b.y);const top=a.y-7-9;
  expect(TUNING.player.jumpVelocity**2/(2*TUNING.player.gravity)-(360-top)).toBeGreaterThan(30);
  franklinAttachment('exhausted','chip',790,360,66,h,false,.1,2,-3,b);expect(b.x).not.toBe(a.x);expect(b.y).not.toBe(a.y);
 });
 it('registers unique tight full frames and masks consumed input without physics state',()=>{
  expect(new Set(Object.values(FRANKLIN_POSES).map(f=>`${f.texture}:${f.x}:${f.y}`)).size).toBe(12);
  for(const f of Object.values(FRANKLIN_POSES)){expect(f.x%512+f.width).toBeLessThan(512);expect(f.y%512+f.height).toBeLessThan(512);}
  const input={horizontal:1,down:true,downPressed:true,jumpPressed:true,jumpReleased:true,dashPressed:true,sprintPressed:true,sprintHeld:true,anyResetInput:true,ultimatePressed:true,throwPressed:true} as InputSnapshot;maskFranklinInput(input);expect(input.horizontal).toBe(0);expect(Object.values(input).filter(Boolean)).toHaveLength(0);
 });
 it('centers the actual visible rectangle on Franklin and his chip at every render scale',()=>{
  const focus={x:0,y:0},scroll={x:0,y:0},chip={x:0,y:0};
  for(const scale of [.75,1,2,3])for(const t of [0,1400,2400,3300,3900]){
   const multiplier=franklinIntroZoom(t),zoom=multiplier*scale,width=640*scale,height=400*scale;
   sampleFranklinIntroFocus(t,540,790,focus);franklinFocusScroll(focus,width,height,zoom,scroll);
   const pose=sample('intro',t*2).pose,f=FRANKLIN_POSES[pose],h=66*f.height/f.width;franklinAttachment(pose,'chip',790,360,66,h,false,0,0,0,chip);
   for(const x of [757,823,chip.x-6,chip.x+6]){expect(x).toBeGreaterThan(scroll.x);expect(x).toBeLessThan(scroll.x+width/zoom);}
   for(const y of [360-h,360,chip.y-7,chip.y+7]){expect(y).toBeGreaterThan(scroll.y);expect(y).toBeLessThan(scroll.y+height/zoom);}
   if(t===0){expect(540-33).toBeGreaterThan(scroll.x);expect(540+33).toBeLessThan(scroll.x+width/zoom);}
  }
 });
 it('crash focus holds the reached wall and returns to player before any warning restarts',()=>{
  const focus={x:0,y:0},scroll={x:0,y:0},start={x:540,y:320};
  for(const wall of [155,1845]){
   expect(sampleFranklinCrashFocus(250,start,540,wall,focus)).toBe(1.1);expect(focus.x).toBe(wall+4);
   franklinFocusScroll(focus,640,400,1.1,scroll);expect(wall).toBeGreaterThanOrEqual(scroll.x);expect(wall).toBeLessThanOrEqual(scroll.x+640/1.1);
   expect(sampleFranklinCrashFocus(950,start,600,wall,focus)).toBeCloseTo(.68);expect(focus.x).toBe(600);
  }
 });
 it('accepts exactly whitelisted local development boss previews',()=>{
  const yes={local:true,devPreview:true,bossPreview:true};expect(parseFranklinBeat('safe-chip',yes)).toBe('safe-chip');expect(parseFranklinBeat('tail',yes)).toBe('tail');
  for(const gate of [{...yes,local:false},{...yes,devPreview:false},{...yes,bossPreview:false}])expect(parseFranklinBeat('intro',gate)).toBeUndefined();
  for(const value of ['',null,'pounce','__proto__','Intro','rescued?'])expect(parseFranklinBeat(value,yes)).toBeUndefined();
 });
});
