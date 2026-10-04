import {describe,expect,it} from 'vitest';
import {breathingDisplayHeight,cappedActorDeltaMs,createWardenController,resumeChargeTell,resumeWardenWarning,WARDEN_RULES,type WardenController} from '../src/systems/HollowWardenRules';

describe('quality actor lifecycle and image sizing',()=>{
 it('keeps Franklin breathing within the source artwork proportions',()=>{
  expect(breathingDisplayHeight(150,1588,570,1)).toBeCloseTo(53.84,1);
  expect(breathingDisplayHeight(150,1588,570,1.025)).toBeLessThan(56);
 });
 it('caps Guardian simulation time and resumes a committed charge with its full warning',()=>{
  expect(cappedActorDeltaMs(5000,true)).toBe(50);expect(cappedActorDeltaMs(50,false)).toBe(0);
  expect(resumeChargeTell('charge')).toBe('warn');expect(resumeChargeTell('rest')).toBe('rest');
 });
 it('restarts interrupted Warden attacks as a tell without changing locked aim or destination',()=>{
  const source:WardenController={...createWardenController(),phase:'sonic-active',elapsedMs:130,durationMs:WARDEN_RULES.sonicActiveMs,lockedDirection:-1,lockedAimX:1420,lockedAimY:288,lockedPortalX:1640,sonicPass:1};
  const resumed=resumeWardenWarning(source);
  expect(resumed).toMatchObject({phase:'sonic-cue',elapsedMs:0,durationMs:WARDEN_RULES.phaseTwoSecondSonicCueMs,lockedDirection:-1,lockedAimX:1420,lockedAimY:288,lockedPortalX:1640,sonicPass:1});
  expect(resumeWardenWarning({...source,phase:'claw-active'}).phase).toBe('claw-cue');
  expect(resumeWardenWarning({...source,phase:'portal-feint'}).phase).toBe('portal-cue');
  expect(resumeWardenWarning({...source,phase:'portal-cue'}).lockedPortalX).toBe(1640);
  expect(resumeWardenWarning({...source,phase:'portal-transfer'}).phase).toBe('portal-cue');
  expect(resumeWardenWarning({...source,phase:'portal-claw-active'}).phase).toBe('portal-claw-cue');
  expect(resumeWardenWarning({...source,phase:'listen'})).toMatchObject({phase:'listen',elapsedMs:130});
 });
});
