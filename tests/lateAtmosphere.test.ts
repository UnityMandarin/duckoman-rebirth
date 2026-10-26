import {describe,it,expect} from 'vitest';
import {lateAtmospherePlan} from '../src/data/lateAtmosphere';
import {LATE_CHAPTER_LENGTH,LATE_ROOMS} from '../src/data/lateChapters';

describe('late chapter distant-image coverage',()=>{
 it('uses one vertically continuous native-proportion band across every camera bound and viewport height',()=>{
  for(const [key,rooms] of Object.entries(LATE_ROOMS) as [keyof typeof LATE_ROOMS,typeof LATE_ROOMS['stormworks']][]){
   const minY=Math.min(...rooms.flatMap(r=>[r.entryTop,r.exitTop,...r.steps.map(p=>p.top)]))-360,maxY=Math.max(...rooms.flatMap(r=>[r.entryTop,r.exitTop,...r.steps.map(p=>p.top)]))+700;
   for(const viewportHeight of [320,400,480]){
    const field=lateAtmospherePlan(key,minY,maxY,1536,1024,viewportHeight),scrollMin=minY,scrollMax=maxY-viewportHeight;
    expect(field.scale).toBeGreaterThanOrEqual(key==='stormworks'?1:1.6);
    expect(field.top-scrollMin*field.parallaxY).toBe(-128);
    expect(field.top+field.tileHeight-scrollMax*field.parallaxY).toBeGreaterThanOrEqual(viewportHeight);
    expect(field.tileXs.length).toBeGreaterThan(0);
    expect(field.tileXs.every((x,i)=>i===0?x===field.minX:Math.abs(x-(field.tileXs[i-1]!+field.tileWidth))<.001)).toBe(true);
    const last=field.tileXs.at(-1)!+field.tileWidth;
    expect(field.minX).toBeLessThanOrEqual(0);
    expect(last-(LATE_CHAPTER_LENGTH-640)*field.parallaxX).toBeGreaterThanOrEqual(640);
   }
  }
 });
 it('keeps the authored uniform scale, native 1536x1024 image ratio, and horizontal-only tiling defaults',()=>{
  const storm=lateAtmospherePlan('stormworks',-320,1060,1536,1024),crown=lateAtmospherePlan('crown-edge',-9600,1060,1536,1024);
  expect(storm.scale).toBe(1);expect(storm.parallaxY).toBe(.18);expect(crown.scale).toBe(1.6);expect(crown.parallaxY).toBe(.1);
  expect(storm.tileWidth/storm.tileHeight).toBeCloseTo(1.5);expect(crown.tileWidth/crown.tileHeight).toBeCloseTo(1.5);
  expect(lateAtmospherePlan('crown-edge',-9600,1060,1200,800).scale).toBeGreaterThanOrEqual((.1*(1060+9600-400)+400+256)/800);
 });
});
