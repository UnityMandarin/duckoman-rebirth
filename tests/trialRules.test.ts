import {describe,it,expect} from 'vitest';
import {TrialClock,TrialEligibility} from '../src/systems/trialRules';

describe('trial rules',()=>{
 it('excludes hidden time and the first resumed frame',()=>{const t=new TrialClock(),active={active:true,visible:true,alive:true,finished:false};expect(t.tick(100,active)).toBe(100);t.markGap();expect(t.tick(5000,{...active,visible:false})).toBe(100);expect(t.tick(16,active)).toBe(100);expect(t.tick(100,active)).toBe(200);});
 it('ignores inactive and finished time and rejects invalid deltas',()=>{const t=new TrialClock(),active={active:true,visible:true,alive:true,finished:false};t.tick(25,active);expect(t.tick(500,{...active,active:false})).toBe(25);expect(t.tick(-1,active)).toBe(25);expect(t.tick(Number.NaN,active)).toBe(25);expect(t.finish()).toBe(25);expect(t.tick(200,active)).toBe(25);});
 it('adds time only while visible, alive, active, and unfinished',()=>{const t=new TrialClock(),active={active:true,visible:true,alive:true,finished:false};t.tick(10,{...active,visible:false});t.tick(10,{...active,alive:false});t.tick(10,{...active,active:false});t.tick(10,{...active,finished:true});expect(t.elapsedMs).toBe(0);expect(t.tick(10,active)).toBe(10);});
 it('keeps eligibility false after any assist invalidates it',()=>{const eligible=new TrialEligibility(true);expect(eligible.eligible).toBe(true);eligible.invalidate();expect(eligible.eligible).toBe(false);});
 it('starts ineligible when an assist is already active',()=>{expect(new TrialEligibility(false).eligible).toBe(false);});
});
