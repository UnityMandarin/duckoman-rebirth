import {describe,it,expect} from 'vitest';
import {computeRenderScale,nearbySectionIndexes,parseRenderQuality,projectedInView} from '../src/systems/performancePolicy';

describe('performance policy',()=>{
 it('caps Smooth at 1 and Sharp at 2 across tiny, retina, and wide views',()=>{
  expect(computeRenderScale(200,100,2,'smooth')).toBe(1);
  expect(computeRenderScale(1280,800,2,'smooth')).toBe(1);
  expect(computeRenderScale(1280,800,2,'sharp')).toBe(2);
  expect(computeRenderScale(2560,720,2,'sharp')).toBe(2);
  expect(computeRenderScale(2560,720,2,'smooth')).toBe(1);
  expect(computeRenderScale(1,1,.1,'sharp')).toBe(1);
 });
 it('falls back to Smooth for invalid or unavailable stored values',()=>{
  expect(parseRenderQuality(null)).toBe('smooth');expect(parseRenderQuality('broken')).toBe('smooth');expect(parseRenderQuality('sharp')).toBe('sharp');
 });
 it('selects only adjacent valid sections at chapter boundaries',()=>{
  expect(nearbySectionIndexes(0,5)).toEqual([0,1]);
  expect(nearbySectionIndexes(2,5)).toEqual([1,2,3]);
  expect(nearbySectionIndexes(4,5)).toEqual([3,4]);
  expect(nearbySectionIndexes(2,5,1)).not.toContain(4);
 });
 it('tests projected bounds using the object scroll factor and margin',()=>{
  expect(projectedInView(200,100,40,40,100,0,.8,1,320,200,120)).toBe(true);
  expect(projectedInView(1000,100,40,40,100,0,.8,1,320,200,120)).toBe(false);
 });
});
