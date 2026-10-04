import {describe,it,expect} from 'vitest';
import {CRAB_RULES,crabDamage,crabPhaseDuration,nextCrabPhase,resolveEmergeDestination,snapshotBurrowTarget,crabCanAct,crabBurrowImmune,crabBurrowContactActive,crabActiveZone,crabEmergenceTop,crabResumePhase,canCrabDashDamage,type CrabPhase} from '../src/systems/CrabRules';

const burrowCycle:CrabPhase[]=['burrow-down','underground','emerge-cue','emerge-active','emerge-recovery','rest'];

describe('Crimson Claw burrow contract',()=>{
 it('keeps burrow attacks serialized after pillar recovery and preserves the next claw cycle',()=>{
  expect(nextCrabPhase('pillar-recovery')).toBe('burrow-down');
  expect(burrowCycle.map((phase)=>crabPhaseDuration(phase))).toEqual([400,700,1100,260,1200,850]);
  expect(nextCrabPhase('emerge-recovery')).toBe('rest');
  expect(nextCrabPhase('rest')).toBe('claw-windup');
  expect(CRAB_RULES.hp).toBe(20);expect(crabDamage('dash')).toBe(1);expect(crabDamage('ultimate')).toBe(4);
  expect(crabDamage('stomp')).toBe(0);expect(crabDamage('throw')).toBe(0);
 });
 it('clamps snapshots at both arena edges and locks an emergence destination once',()=>{
  expect(snapshotBurrowTarget(-500,0,2400)).toBe(100);expect(snapshotBurrowTarget(4000,0,2400)).toBe(2300);
  const edgeAway=resolveEmergeDestination(102,150,0,2400);
  expect(edgeAway).toBeGreaterThanOrEqual(100);expect(Math.abs(edgeAway-150)).toBeGreaterThanOrEqual(180);
  const cueLockedX=resolveEmergeDestination(1100,1110,0,2400);
  const playerMovesDuringCue=2050;
  expect(cueLockedX).toBe(930);
  expect(resolveEmergeDestination(snapshotBurrowTarget(1100,0,2400),playerMovesDuringCue,0,2400)).not.toBe(cueLockedX);
  // The actor stores cueLockedX at cue entry and does not call the resolver again.
 });
 it('disables all contact and damage gates down, underground, and through the fixed cue',()=>{
  for(const phase of ['burrow-down','underground','emerge-cue'] as const){
   expect(crabBurrowImmune(phase)).toBe(true);expect(crabBurrowContactActive(phase)).toBe(false);
   expect(canCrabDashDamage(true,true,phase)).toBe(false);
  }
  expect(crabBurrowImmune('emerge-active')).toBe(false);expect(crabBurrowContactActive('emerge-active')).toBe(true);
  expect(canCrabDashDamage(true,true,'emerge-active')).toBe(true);
  expect(crabActiveZone(600)).toEqual({left:540,right:660,top:240,bottom:360});
 });
 it('keeps emergence damage inside the visible shell as it rises',()=>{
  expect(crabEmergenceTop(470,0)).toBeNull();
  expect(crabEmergenceTop(400,.89)).toBeNull();
  const visibleTop=crabEmergenceTop(445,.9);
  expect(visibleTop).toBe(286);expect(visibleTop).toBeGreaterThanOrEqual(240);expect(visibleTop).toBeLessThan(360);
  expect(crabActiveZone(930).left).toBe(870);expect(crabActiveZone(930).right).toBe(990);
  expect(crabEmergenceTop(520,1)).toBeNull();
 });
 it('restarts full attack tells after an interruption and retains the locked emergence X',()=>{
  expect(crabResumePhase('claw-swing')).toBe('claw-windup');expect(crabResumePhase('claw-windup')).toBe('claw-windup');
  expect(crabResumePhase('charge')).toBe('charge-cue');expect(crabResumePhase('charge-cue')).toBe('charge-cue');
  for(const phase of ['pillar-warning','pillar-fall','pillar-impact'] as const)expect(crabResumePhase(phase)).toBe('pillar-warning');
  expect(crabResumePhase('emerge-cue')).toBe('emerge-cue');expect(crabResumePhase('emerge-active')).toBe('emerge-cue');
  expect(crabResumePhase('claw-recovery')).toBe('claw-recovery');expect(crabResumePhase('underground')).toBe('underground');
  const lockedX=resolveEmergeDestination(1100,1110,0,2400),resumedPhase=crabResumePhase('emerge-active'),playerMoves=2050;
  expect(resumedPhase).toBe('emerge-cue');expect(lockedX).toBe(930);
  expect(resolveEmergeDestination(1100,playerMoves,0,2400)).not.toBe(lockedX);
  expect(lockedX).toBe(930);
 });
 it('freezes actor time and all hit acceptance while hidden, paused, dead, or inactive',()=>{
  expect(crabCanAct(true,true,false,true,true,false)).toBe(true);
  const stoppedCases:ReadonlyArray<Parameters<typeof crabCanAct>>=[[true,true,true,true,true,false],[true,true,false,true,true,true],[false,true,false,true,true,false],[true,true,false,false,true,false],[true,true,false,true,false,false]];
  for(const stopped of stoppedCases)
   expect(crabCanAct(...stopped)).toBe(false);
 });
 it('keeps phase edges within one frame at 16, 33, and 50 ms active-time steps',()=>{
  for(const step of [16,33,50]){
   let phase:CrabPhase='burrow-down',elapsed=0;
   const edges:number[]=[];let clock=0;
   while(phase!=='rest'){
    clock+=step;elapsed+=step;
    if(elapsed>=crabPhaseDuration(phase)){edges.push(clock);phase=nextCrabPhase(phase);elapsed=0;}
   }
   let prior=0;
   for(let i=0;i<edges.length;i++){
    const duration=crabPhaseDuration(burrowCycle[i]);
    expect(edges[i]-prior).toBeGreaterThanOrEqual(duration);
    expect(edges[i]-prior).toBeLessThan(duration+step);prior=edges[i];
   }
  }
 });
});
