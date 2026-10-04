import {describe,it,expect} from 'vitest';
import {QUALITY_TRAP_WARNING_MS,QUALITY_PRESS_HALF_HEIGHT,advanceQualityTrapClock,qualityTrapDeltaMs,trapIdleCadenceMs,trapSectionBuildCount,activeTrapEncounterIndex,trapRoomTransition,trapDustScale,pressImpactCenterY,pressPhaseAfterGap,pressStartsWarning,pressCanFall,shutterCanClose,crumblePhaseAfterGap,specialPhaseAfterGap,type TrapPressPhase} from '../src/systems/qualityTrapClock';

describe('quality trap clock contract',()=>{
 it('caps active time at 50 ms and freezes exactly while hidden, paused, or inactive',()=>{
  for(const frame of [16,33,50])expect(qualityTrapDeltaMs(frame,true)).toBe(frame);
  expect(qualityTrapDeltaMs(700,true)).toBe(50);expect(qualityTrapDeltaMs(50,false)).toBe(0);
  let clock=360;for(let i=0;i<12;i++)clock=advanceQualityTrapClock(clock,50,false);
  expect(clock).toBe(360);expect(advanceQualityTrapClock(clock,33,true)).toBe(393);
 });
 it('uses chapter pressure only for idle cadence and keeps a complete 650 ms press warning',()=>{
  expect(trapIdleCadenceMs(1.2)).toBe(750);expect(trapIdleCadenceMs(1.44)).toBeCloseTo(625);
  expect(trapIdleCadenceMs(1.728)).toBeCloseTo(520.8333);
  expect(QUALITY_TRAP_WARNING_MS).toBeGreaterThanOrEqual(650);
  for(const frame of [16,33,50]){
   let phase:TrapPressPhase='idle',clock=0,deadline=0;
   if(pressStartsWarning(phase,clock,deadline)){phase='warn';deadline=clock+QUALITY_TRAP_WARNING_MS;}
   while(!pressCanFall(phase,clock,deadline))clock=advanceQualityTrapClock(clock,frame,true);
   expect(clock).toBeGreaterThanOrEqual(QUALITY_TRAP_WARNING_MS);
   expect(clock).toBeLessThan(QUALITY_TRAP_WARNING_MS+frame);
  }
 });
 it('restarts every interrupted press from idle, so a hidden gap cannot cause an instant hit',()=>{
  let clock=420,phase:TrapPressPhase='fall';
  for(let i=0;i<80;i++)clock=advanceQualityTrapClock(clock,50,false);
  phase=pressPhaseAfterGap(phase);
  let deadline=clock;
  expect(phase).toBe('idle');
  if(pressStartsWarning(phase,clock,deadline)){phase='warn';deadline=clock+QUALITY_TRAP_WARNING_MS;}
  expect(pressCanFall(phase,clock,deadline)).toBe(false);
  clock=advanceQualityTrapClock(clock,50,true);
  expect(pressCanFall(phase,clock,deadline)).toBe(false);
  expect(pressPhaseAfterGap('warn')).toBe('idle');
 });
 it('reopens a shutter across a gap only after the player clears it, and resets crumble tells safely',()=>{
  expect(shutterCanClose(true)).toBe(false);expect(shutterCanClose(false)).toBe(true);
  expect(specialPhaseAfterGap('shutters',true)).toEqual({phase:'shutters',solid:false});
  expect(specialPhaseAfterGap('shutters',false)).toEqual({phase:'shutters',solid:true});
  expect(crumblePhaseAfterGap('warn')).toBe('idle');expect(crumblePhaseAfterGap('broken')).toBe('broken');
 });
 it('includes the final authored room and emits one entry/exit transition per room edge',()=>{
  const count=trapSectionBuildCount(22);expect(count).toBe(22);expect(count-1).toBe(21);expect(count-1).toBeLessThan(count);
  expect(trapRoomTransition(false,true)).toBe('enter');expect(trapRoomTransition(true,false)).toBe('exit');
  expect(trapRoomTransition(true,true)).toBe('hold');expect(trapRoomTransition(false,false)).toBe('hold');
 });
 it('does not normalize Crimson or outdoor boss sections to the last normal wind room',()=>{
  expect(activeTrapEncounterIndex(9,10)).toBe(9);expect(activeTrapEncounterIndex(10,10)).toBeUndefined();expect(activeTrapEncounterIndex(11,10)).toBeUndefined();
  expect(activeTrapEncounterIndex(21,22)).toBe(21);expect(activeTrapEncounterIndex(22,22)).toBeUndefined();expect(activeTrapEncounterIndex(23,22)).toBeUndefined();
  expect(activeTrapEncounterIndex(-1,22)).toBeUndefined();
 });
 it('keeps pooled dust at its authored display size and press damage inside the painted crusher',()=>{
  const baseScaleX=66/288,baseScaleY=52/320;
  expect(trapDustScale(baseScaleX,1)).toBeCloseTo(baseScaleX);expect(trapDustScale(baseScaleY,1.25)).toBeCloseTo(baseScaleY*1.25);
  const ground=500,center=pressImpactCenterY(ground);
  expect(center-QUALITY_PRESS_HALF_HEIGHT).toBe(ground-225);expect(center+QUALITY_PRESS_HALF_HEIGHT).toBe(ground);
 });
});
