import {describe,expect,it} from 'vitest';
import {QaFixtureReadiness,qaApproachSpawn,qaFixtureEnabled,qaInitialInfiniteHealth} from '../src/systems/qaCameraFixture';

describe('Jail camera QA fixture contracts',()=>{
 it('enables local QA only after preview data has been resolved',()=>{
  expect(qaFixtureEnabled(true,true,true,'localhost')).toBe(true);
  expect(qaFixtureEnabled(true,false,true,'localhost')).toBe(false);
  expect(qaFixtureEnabled(true,true,false,'localhost')).toBe(false);
  expect(qaFixtureEnabled(true,true,true,'example.com')).toBe(false);
 });

 it('uses the available natural runway and clamps narrow ledges to a safe edge',()=>{
  expect(qaApproachSpawn(0,1000,23,320)).toBe(657);
  expect(qaApproachSpawn(0,300,23,320)).toBe(23);
  expect(qaApproachSpawn(0,90,23,320)).toBe(23);
 });

 it('ignores damage by default in QA and enables it only when qaDamage is true',()=>{
  expect(qaInitialInfiniteHealth(true,undefined,undefined)).toBe(true);
  expect(qaInitialInfiniteHealth(true,false,undefined)).toBe(true);
  expect(qaInitialInfiniteHealth(true,true,undefined)).toBe(false);
  expect(qaInitialInfiniteHealth(false,undefined,true)).toBe(true);
  expect(qaInitialInfiniteHealth(false,undefined,undefined)).toBe(false);
 });

 it('latches ready after source contact and camera setup so launch traces continue',()=>{
  const readiness=new QaFixtureReadiness();
  expect(readiness.observe(false,true)).toBe(false);
  expect(readiness.observe(true,false)).toBe(false);
  expect(readiness.observe(true,true)).toBe(true);
  expect(readiness.observe(false,true)).toBe(true);
  expect(readiness.observe(false,false)).toBe(true);
  readiness.reset();
  expect(readiness.observe(false,true)).toBe(false);
 });
});
