import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,CRIMSON_SECTIONS,SECTION_WIDTH} from '../src/data/chapters';
import {CHAPTER_DIFFICULTY,CRIMSON_ENCOUNTERS,OUTSIDE_ENCOUNTERS} from '../src/data/chapterChallenges';
import {CRAB_RULES,crabDamage,pillarTargets,crabPillarsNonOverlapping,nextCrabPhase,crabPhaseDuration,canCrabDashDamage,crabPillarActiveAt,crabChargeDistance,crabChargeDuration} from '../src/systems/CrabRules';
import {shouldCheckpoint} from '../src/systems/checkpointPolicy';
describe('crimson kingdom contract',()=>{
 it('is 50% longer than the original kingdom and targets 10% more pressure than the forest',()=>{
  expect(CHAPTER_WIDTH.crimson).toBe(CASTLE.width*1.5);expect(CRIMSON_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.crimson);expect(CHAPTER_DIFFICULTY.crimson/CHAPTER_DIFFICULTY.outside).toBeCloseTo(1.1);
 });
 it('keeps ten independent authored encounters before the boss and exit arenas',()=>{
  expect(CRIMSON_ENCOUNTERS).toHaveLength(10);expect(CRIMSON_SECTIONS).toHaveLength(12);
  expect(new Set(CRIMSON_ENCOUNTERS.map(e=>JSON.stringify(e.steps))).size).toBe(10);
  expect(CRIMSON_ENCOUNTERS.filter(e=>e.wind||e.conveyor).length).toBeGreaterThanOrEqual(8);
  expect(CRIMSON_ENCOUNTERS.filter(e=>e.wind&&e.conveyor).length).toBe(4);
  expect(shouldCheckpoint('crimson',10)).toBe(true);
 });
 it('authors crimson routes separately from the forest',()=>{
  for(const crimson of CRIMSON_ENCOUNTERS)expect(OUTSIDE_ENCOUNTERS).not.toContain(crimson);
 });
 it('allows only dash and ultimate against the 20 HP shell',()=>{
  expect(CRAB_RULES.hp).toBe(20);expect(crabDamage('dash')).toBe(1);expect(crabDamage('ultimate')).toBe(4);expect(crabDamage('stomp')).toBe(0);expect(crabDamage('throw')).toBe(0);
 });
 it('uses a non-overlapping four-pillar volley with generous edge lanes',()=>{
  expect(CRAB_RULES.pillarCount).toBe(4);expect(CRAB_RULES.warningMs).toBeGreaterThanOrEqual(1000);
  for(const x of [-100,0,550,2000,5000]){
   const targets=pillarTargets(x,0,2400);expect(targets).toHaveLength(4);expect(new Set(targets).size).toBe(4);
   for(const t of targets){expect(t).toBeGreaterThanOrEqual(40);expect(t).toBeLessThanOrEqual(2360);}
   expect(crabPillarsNonOverlapping(targets)).toBe(true);
  }
 });
 it('serializes attacks and keeps phase-two cues readable',()=>{
  expect(nextCrabPhase('rest')).toBe('claw-windup');expect(nextCrabPhase('claw-windup')).toBe('claw-swing');
  expect(nextCrabPhase('claw-swing')).toBe('claw-recovery');expect(nextCrabPhase('claw-recovery')).toBe('charge-cue');
  expect(nextCrabPhase('charge-cue')).toBe('charge');expect(nextCrabPhase('charge')).toBe('charge-recovery');
  expect(nextCrabPhase('charge-recovery')).toBe('pillar-warning');expect(nextCrabPhase('pillar-warning')).toBe('pillar-fall');
  expect(nextCrabPhase('pillar-fall')).toBe('pillar-impact');expect(nextCrabPhase('pillar-impact')).toBe('pillar-recovery');expect(nextCrabPhase('pillar-recovery')).toBe('rest');
  expect(crabPhaseDuration('claw-windup')).toBeGreaterThanOrEqual(800);expect(crabPhaseDuration('claw-swing')).toBe(350);
  expect(crabPhaseDuration('claw-recovery')).toBeGreaterThanOrEqual(900);expect(crabPhaseDuration('charge-cue')).toBeGreaterThanOrEqual(850);
  expect(crabPhaseDuration('charge-recovery')).toBeGreaterThanOrEqual(1100);expect(crabPhaseDuration('pillar-recovery')).toBeGreaterThanOrEqual(900);
  expect(crabPhaseDuration('rest',true)).toBeGreaterThanOrEqual(650);expect(crabPhaseDuration('charge-cue',true)).toBeGreaterThanOrEqual(CRAB_RULES.phaseTwoCueMinMs);
  expect(CRAB_RULES.phaseTwoChargeDistance).toBeGreaterThan(CRAB_RULES.chargeDistance);
  expect(CRAB_RULES.clawRecoveryMs).toBeGreaterThanOrEqual(900);expect(CRAB_RULES.chargeRecoveryMs).toBeGreaterThanOrEqual(1100);expect(CRAB_RULES.pillarRecoveryMs).toBeGreaterThanOrEqual(900);
  const distanceLockedAtCue=crabChargeDistance(false);
  expect(distanceLockedAtCue).toBe(CRAB_RULES.chargeDistance);expect(crabChargeDistance(true)).toBe(CRAB_RULES.phaseTwoChargeDistance);
  expect(distanceLockedAtCue).toBe(CRAB_RULES.chargeDistance);expect(crabChargeDuration(distanceLockedAtCue)).toBe(890);
 });
 it('keeps pillars visible and damaging through the full active window at 16, 33, and 50 ms frame steps',()=>{
  expect(crabPhaseDuration('pillar-warning')).toBeGreaterThanOrEqual(1000);expect(crabPhaseDuration('pillar-fall')).toBe(220);expect(crabPhaseDuration('pillar-impact')).toBe(240);
  expect(crabPillarActiveAt('pillar-fall',true)).toBe(false);expect(crabPillarActiveAt('pillar-impact',false)).toBe(false);expect(crabPillarActiveAt('pillar-impact',true)).toBe(true);
  for(const step of [16,33,50]){
   const advance=(duration:number)=>Math.ceil(duration/step)*step;
   const fallStart=advance(CRAB_RULES.warningMs),impactStart=fallStart+advance(CRAB_RULES.fallMs),impactEnd=impactStart+advance(CRAB_RULES.pillarImpactMs);
   const activeMs=impactEnd-impactStart;expect(activeMs).toBeGreaterThanOrEqual(CRAB_RULES.pillarImpactMs);expect(activeMs).toBeLessThan(CRAB_RULES.pillarImpactMs+step);
  }
 });
 it('keeps the shell dashable during pillar recovery while protecting an inactive boss',()=>{
  expect(canCrabDashDamage(true,true,'pillar-recovery')).toBe(true);
  expect(canCrabDashDamage(true,false,'pillar-recovery')).toBe(false);expect(canCrabDashDamage(false,true,'pillar-recovery')).toBe(false);
 });
});
