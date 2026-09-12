import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,JAIL_SECTIONS,OUTSIDE_SECTIONS,chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';
import {CHAPTER_DIFFICULTY,JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS} from '../src/data/chapterChallenges';
import {TUNING} from '../src/config/tuning';

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
   const reached=new Set(platforms.filter(p=>p.height===60));
   // Full held jump plus horizontal dash, using the actual movement constants.
   // Graph search supports flat bridges and switchbacks, not only ascending staircases.
   let changed=true;
   while(changed){changed=false;for(const target of platforms){
    if(reached.has(target))continue;
    for(const source of reached){
     const rise=(source.y-source.height/2)-(target.y-target.height/2);
     const v=-TUNING.player.jumpVelocity,g=TUNING.player.gravity;
     const discriminant=v*v-2*g*rise;if(discriminant<0)continue;
     const airTime=(v+Math.sqrt(discriminant))/g;
     const gap=Math.max(0,Math.abs(target.x-source.x)-(target.width+source.width)/2+60);
     const reach=airTime*TUNING.player.sprintSpeed+TUNING.player.dashSpeed*TUNING.player.dashDuration/1000;
     if(gap<=reach-20){reached.add(target);changed=true;break;}
    }
   }}
   for(const ledge of platforms)expect(reached.has(ledge),`unreachable ${ledge.x},${ledge.y}`).toBe(true);
  });
 }
 it('includes discoverable story on both routes and an explicit Franklin destination',()=>{
  expect(JAIL_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(4);
  expect(OUTSIDE_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(8);
  expect(OUTSIDE_SECTIONS[0].story).toContain('Franklin');
 });
 it('has distinct encounter layouts instead of four repeated templates',()=>{
  for(const encounters of [JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS]){
   expect(new Set(encounters.map(e=>JSON.stringify(e.steps))).size).toBe(encounters.length);
   const counts=new Map<string,number>();
   for(const encounter of encounters)counts.set(encounter.type,(counts.get(encounter.type)??0)+1);
   for(const [type,count]of counts)expect(count,`${type} repeated more than twice`).toBeLessThanOrEqual(2);
   expect(new Set(encounters.map(e=>e.steps.length)).size).toBeGreaterThan(1);
   for(const encounter of encounters.slice(1))expect(encounter.spikes[1]-encounter.spikes[0]).toBeGreaterThanOrEqual(300);
  }
 });
 it('sets explicit 20% and 50% pressure targets against kingdom timing',()=>{
  expect(CHAPTER_DIFFICULTY.jail).toBe(1.2);expect(CHAPTER_DIFFICULTY.outside).toBe(1.5);
  expect(900/CHAPTER_DIFFICULTY.jail).toBe(750);expect(900/CHAPTER_DIFFICULTY.outside).toBe(600);
 });
});
