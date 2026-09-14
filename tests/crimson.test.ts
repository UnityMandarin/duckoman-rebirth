import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,CRIMSON_SECTIONS,SECTION_WIDTH} from '../src/data/chapters';
import {CHAPTER_DIFFICULTY,CRIMSON_ENCOUNTERS} from '../src/data/chapterChallenges';
import {CRAB_RULES,crabDamage,pillarTargets} from '../src/systems/CrabRules';
import {shouldCheckpoint} from '../src/systems/checkpointPolicy';
describe('crimson kingdom contract',()=>{
 it('is 50% longer than the original kingdom and targets 10% more pressure than the forest',()=>{
  expect(CHAPTER_WIDTH.crimson).toBe(CASTLE.width*1.5);
  expect(CRIMSON_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.crimson);
  expect(CHAPTER_DIFFICULTY.crimson/CHAPTER_DIFFICULTY.outside).toBeCloseTo(1.1);
 });
 it('has two arena sections, varied encounters, and a checkpoint before the boss',()=>{
  expect(CRIMSON_ENCOUNTERS.length).toBe(CRIMSON_SECTIONS.length-2);
  const counts=new Map<string,number>();for(const e of CRIMSON_ENCOUNTERS)counts.set(e.type,(counts.get(e.type)??0)+1);
  for(const n of counts.values())expect(n).toBeLessThanOrEqual(2);
  expect(shouldCheckpoint('crimson',10)).toBe(true);
 });
 it('allows only dash and ultimate against the 20 HP shell',()=>{
  expect(CRAB_RULES.hp).toBe(20);expect(crabDamage('dash')).toBe(1);expect(crabDamage('ultimate')).toBe(4);
  expect(crabDamage('stomp')).toBe(0);expect(crabDamage('throw')).toBe(0);
 });
 it('summons four distinct pillars every three seconds with escape lanes even at arena edges',()=>{
  expect(CRAB_RULES.pillarInterval).toBe(3000);
  expect(CRAB_RULES.clearMs).toBeLessThan(CRAB_RULES.pillarInterval);
  for(const x of [-100,0,550,2000,5000]){
   const targets=pillarTargets(x,0,2400);expect(targets).toHaveLength(4);expect(new Set(targets).size).toBe(4);
   for(const t of targets){expect(t).toBeGreaterThanOrEqual(31);expect(t).toBeLessThanOrEqual(2400-31);}
   for(let i=1;i<targets.length;i++)expect(targets[i]-targets[i-1]-62).toBeGreaterThan(100);
  }
 });
});
