import {describe,it,expect} from 'vitest';
import {damp,particleOpacity,projectedX,particleInView} from '../src/systems/atmosphereMath';
describe('bounded scenery animation',()=>{
 it('produces the same damping after one second at 30, 60 and 120 Hz',()=>{
  const values=[30,60,120].map(fps=>{let value=0;for(let n=0;n<fps;n++)value=damp(value,52,9,1000/fps);return value;});
  expect(values[0]).toBeCloseTo(values[1],10);expect(values[1]).toBeCloseTo(values[2],10);
 });
 it('never overshoots and ignores negative time while limiting resume jumps',()=>{
  expect(damp(4,12,9,-5)).toBe(4);expect(damp(4,12,9,50000)).toBe(damp(4,12,9,100));
  expect(damp(4,12,9,100)).toBeLessThan(12);expect(damp(12,4,9,100)).toBeGreaterThan(4);
 });
 it('fades debris in and out without leaving opaque expired particles',()=>{
  expect(particleOpacity(0,9000,.4)).toBe(0);expect(particleOpacity(900,9000,.4)).toBe(.4);
  expect(particleOpacity(8990,9000,.4)).toBeLessThan(.01);expect(particleOpacity(9500,9000,.4)).toBe(0);
 });
 it('projects each depth correctly and retires flecks outside the camera margin',()=>{
  expect(projectedX(1000,800,.5)).toBe(600);expect(projectedX(1000,800,1.1)).toBeCloseTo(120);
  expect(particleInView(200,200,640,400)).toBe(true);expect(particleInView(-141,200,640,400)).toBe(false);expect(particleInView(200,501,640,400)).toBe(false);
 });
});
