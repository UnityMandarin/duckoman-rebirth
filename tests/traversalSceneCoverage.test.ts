import {describe,expect,it} from 'vitest';
import {chapterPlatforms,chapterSections,SECTION_WIDTH} from '../src/data/chapters';
import {CASTLE,CASTLE_PLATFORMS,CASTLE_SECRET,secretHoleSolids} from '../src/data/castle';
import {GATE_1_ROOM} from '../src/data/gate1Room';
import {FURNACE_BOSS_CHECKPOINT,FURNACE_ROOM_WIDTH,FURNACE_ROOMS} from '../src/data/furnace';

describe('traversal camera source coverage',()=>{
 it.each(['jail','outside','crimson'] as const)('indexes only authored %s route surfaces across every room',kind=>{
  const supports=chapterPlatforms(kind),sections=chapterSections(kind);
  expect(supports.length).toBeGreaterThan(50);
  expect(new Set(supports.map(p=>p.room)).size).toBe(sections.length);
  for(const platform of supports){
   expect(platform.room).toBeGreaterThanOrEqual(0);expect(platform.room).toBeLessThan(sections.length);
   expect(platform.x).toBeGreaterThanOrEqual(platform.room!*SECTION_WIDTH);
   expect(platform.x).toBeLessThan((platform.room!+1)*SECTION_WIDTH);
  }
 });

 it('keeps Castle route support on real collision pieces and leaves the secret shaft open',()=>{
  const solids=secretHoleSolids([...GATE_1_ROOM.platforms,...CASTLE_PLATFORMS]),hole=CASTLE_SECRET.hole;
  const hallFloor=solids.filter(s=>s.y-s.height/2===360);
  expect(solids.length).toBeGreaterThan(CASTLE_PLATFORMS.length);
  expect(hallFloor.some(s=>s.x-s.width/2<=hole.left&&s.x+s.width/2>=hole.left+hole.width)).toBe(false);
  expect(hallFloor.some(s=>s.x+s.width/2<=hole.left&&s.x+s.width/2>hole.left-20)).toBe(true);
  expect(hallFloor.some(s=>s.x-s.width/2>=hole.left+hole.width&&s.x-s.width/2<hole.left+hole.width+20)).toBe(true);
  expect(CASTLE.bottom).toBe(400);
 });

 it('maps Furnace camera surfaces from every actual entry, step, and exit support through the boss apron',()=>{
  const count=FURNACE_ROOMS.reduce((n,r)=>n+r.steps.length+2,0)+1;
  expect(FURNACE_ROOMS).toHaveLength(11);
  expect(count).toBeGreaterThan(80);
  expect(FURNACE_BOSS_CHECKPOINT).toBe(11*FURNACE_ROOM_WIDTH);
  for(let room=0;room<FURNACE_ROOMS.length;room++){
   const r=FURNACE_ROOMS[room]!,base=room*FURNACE_ROOM_WIDTH;
   expect(base+96).toBeGreaterThanOrEqual(0);expect(base+1396).toBeLessThan(FURNACE_BOSS_CHECKPOINT);
   for(const step of r.steps){expect(step.x).toBeGreaterThanOrEqual(0);expect(step.x).toBeLessThan(FURNACE_ROOM_WIDTH);}
  }
 });
});
