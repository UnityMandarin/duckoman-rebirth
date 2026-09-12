import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,JAIL_SECTIONS,OUTSIDE_SECTIONS,chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';

describe('authored expansion geometry',()=>{
 it('uses the actual kingdom length for both requested size ratios',()=>{
  expect(CHAPTER_WIDTH.jail).toBe(CASTLE.width*1.5);
  expect(CHAPTER_WIDTH.outside).toBe(CHAPTER_WIDTH.jail*2);
  expect(JAIL_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.jail);
  expect(OUTSIDE_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.outside);
 });
 for(const kind of ['jail','outside'] as const){
  it(`${kind} has no void floor seams or out-of-bounds platforms`,()=>{
   const platforms=chapterPlatforms(kind),floor=platforms.filter(p=>p.height===60);
   let end=0;
   for(const p of floor){expect(p.x-p.width/2).toBe(end);expect(p.y-p.height/2).toBe(360);end=p.x+p.width/2;}
   expect(end).toBe(CHAPTER_WIDTH[kind]);
   for(const p of platforms){expect(p.x-p.width/2).toBeGreaterThanOrEqual(0);expect(p.x+p.width/2).toBeLessThanOrEqual(end);}
  });
  it(`${kind} raised routes have reachable ascending steps and return to ground`,()=>{
   const platforms=chapterPlatforms(kind);
   for(const ledge of platforms.filter(p=>p.height<60)){
    const candidates=platforms.filter(p=>p!==ledge&&p.y>ledge.y&&p.y-ledge.y<=125&&Math.max(0,Math.abs(p.x-ledge.x)-(p.width+ledge.width)/2)<=120);
    expect(candidates.length,`unreachable ${ledge.x},${ledge.y}`).toBeGreaterThan(0);
   }
  });
 }
 it('includes discoverable story on both routes and an explicit Franklin destination',()=>{
  expect(JAIL_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(4);
  expect(OUTSIDE_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(8);
  expect(OUTSIDE_SECTIONS[0].story).toContain('Franklin');
 });
});
