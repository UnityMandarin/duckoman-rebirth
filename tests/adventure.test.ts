import {describe,expect,it} from 'vitest';
import {AdventurePauseLease,canOpenConversation,canOpenPauseMenu,canOperatePump,completeWaterRoute,conversationEscapeConsumed,relayCanActivate,type ConversationEligibility} from '../src/systems/adventureRules';
import {freshProgress,loadProgress,saveProgress,validateProgress} from '../src/systems/progress';
import {resolveAdventurePlacementPlan,resolveAdventurePlacements} from '../src/systems/adventurePlacements';

describe('authored adventure placements',()=>{
 it('resolves every chapter NPC and device anchor onto safe real supports',()=>{
  for(const chapter of ['gate-1','jail','outside','crimson','rescue','stormworks','crown-edge'] as const){
   const plan=resolveAdventurePlacementPlan(chapter);
   expect(plan.people).toEqual(resolveAdventurePlacements(chapter));
   for(const device of Object.values(plan.devices)){expect(Number.isFinite(device.lever.x)).toBe(true);expect(Number.isFinite(device.lever.top)).toBe(true);expect(Number.isFinite(device.relay.x)).toBe(true);expect(Number.isFinite(device.relay.top)).toBe(true);}
  }
  expect(resolveAdventurePlacementPlan('stormworks').devices['stormworks-signal']!.relay.x).toBeGreaterThan(resolveAdventurePlacementPlan('stormworks').devices['stormworks-signal']!.lever.x);
 });
});

describe('Nella pump encounter',()=>{
 it('accepts the reachable manual valve and rejects a distant or completed valve',()=>{
  expect(canOperatePump(4*1440+435,170,false)).toBe(true);
  expect(canOperatePump(4*1440+100,170,false)).toBe(false);
  expect(canOperatePump(4*1440+435,170,true)).toBe(false);
 });
 it('activates only from a thrown projectile overlapping the relay',()=>{
  expect(relayCanActivate(false,false)).toBe(false);
  expect(relayCanActivate(true,false)).toBe(true);
  expect(relayCanActivate(true,true)).toBe(false);
 });
 it('makes both real solutions converge on a monotonic, idempotent restored-world flag',()=>{
  const valve=completeWaterRoute([], 'valve');
  const relay=completeWaterRoute([], 'relay');
  expect(valve).toContain('outside-water-restored');expect(relay).toContain('outside-water-restored');
  expect(completeWaterRoute(valve,'relay')).toHaveLength(valve.length+1);
 });
 it('persists puzzle state and known people without accepting unknown identifiers',()=>{
  const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);}};
  const p=freshProgress();p.storyFlags=completeWaterRoute([], 'relay');p.knownPeople=['nella','untrusted'];
  saveProgress(p,storage);const loaded=loadProgress(storage);
  expect(loaded.storyFlags).toEqual(['outside-water-restored','outside-water-relay']);expect(loaded.knownPeople).toEqual(['nella']);
  const raw=JSON.parse(memory.values().next().value!) as Record<string,unknown>;
  raw.version=6;const migrated=validateProgress(raw)!;
  expect(migrated.version).toBe(7);expect(migrated.storyFlags).toEqual(loaded.storyFlags);expect(migrated.knownPeople).toEqual(['nella']);
 });
});

describe('conversation input and physics ownership',()=>{
 const ready:ConversationEligibility={sceneActive:true,physicsPaused:false,playerActive:true,canAct:true,usingUltimate:false,dead:false};
 it('refuses pre-paused, inactive, hurt/dead, and ultimate states',()=>{
  expect(canOpenConversation({...ready,physicsPaused:true})).toBe(false);
  expect(canOpenConversation({...ready,sceneActive:false})).toBe(false);
  expect(canOpenConversation({...ready,playerActive:false})).toBe(false);
  expect(canOpenConversation({...ready,canAct:false})).toBe(false);
  expect(canOpenConversation({...ready,usingUltimate:true})).toBe(false);
  expect(canOpenConversation({...ready,dead:true})).toBe(false);
  expect(canOpenConversation(ready)).toBe(true);
 });
 it('does not resume pauses it did not acquire or scenes that lost ownership',()=>{
  const lease=new AdventurePauseLease();let pauses=0,resumes=0;
  expect(lease.acquire({...ready,physicsPaused:true},()=>pauses++)).toBe(false);
  expect(lease.holdsPause).toBe(false);expect(pauses).toBe(0);
  expect(lease.acquire(ready,()=>pauses++)).toBe(true);expect(pauses).toBe(1);
  expect(canOpenConversation({...ready,usingUltimate:true})).toBe(false);
  expect(lease.release(false,()=>resumes++)).toBe(true);expect(resumes).toBe(0);expect(lease.holdsPause).toBe(false);
  expect(lease.release(true,()=>resumes++)).toBe(false);expect(resumes).toBe(0);
 });
 it('closes dialogue Esc locally but leaves Escape available to the menu otherwise',()=>{
  expect(conversationEscapeConsumed(true)).toBe(true);expect(conversationEscapeConsumed(false)).toBe(false);
  expect(canOpenPauseMenu(true)).toBe(false);expect(canOpenPauseMenu(false)).toBe(true);
 });
});
