import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,JAIL_SECTIONS,OUTSIDE_SECTIONS,chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';
import {CHAPTER_DIFFICULTY,JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS,CRIMSON_ENCOUNTERS,encounterFor,encounterSurfaceEffects,advanceWindDrift,addWindDrift,canReceiveWind} from '../src/data/chapterChallenges';
import {TUNING} from '../src/config/tuning';
import {enemyPatrolBounds} from '../src/systems/enemyPatrolBounds';
import {shouldCheckpoint} from '../src/systems/checkpointPolicy';
import {JAIL_ROOMS,OUTSIDE_ROOMS} from '../src/data/qualityRooms';
const spikeXs=(spikes:readonly (number|{x:number})[]):number[]=>spikes.map(spike=>typeof spike==='number'?spike:spike.x);

describe('authored expansion geometry',()=>{
 it('preserves authored encounter counts of 12, 22, and 10',()=>{
  expect(JAIL_ENCOUNTERS).toHaveLength(12);expect(OUTSIDE_ENCOUNTERS).toHaveLength(22);expect(CRIMSON_ENCOUNTERS).toHaveLength(10);
 });
 it('uses the actual kingdom length for both requested size ratios',()=>{
  expect(CHAPTER_WIDTH.jail).toBe(CASTLE.width*1.5);
  expect(CHAPTER_WIDTH.outside).toBe(CHAPTER_WIDTH.jail*2);
  expect(JAIL_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.jail);
  expect(OUTSIDE_SECTIONS.length*SECTION_WIDTH).toBe(CHAPTER_WIDTH.outside);
 });
 for(const kind of ['jail','outside','crimson'] as const){
  it(`${kind} uses its authored floor intervals and keeps steps out of foundations`,()=>{
   const platforms=chapterPlatforms(kind),rooms=kind==='jail'?JAIL_ROOMS:kind==='outside'?OUTSIDE_ROOMS:undefined;
   if(!rooms){expect(platforms.filter(p=>p.role==='floor')).toHaveLength(12);return;}
   expect(platforms.filter(p=>p.role==='floor')).toHaveLength(rooms.reduce((n,r)=>n+r.intervals.length,0)+(kind==='outside'?2:0));
   for(const [index,room] of rooms.entries()){
    const floors=platforms.filter(p=>p.role==='floor'&&p.room===index);
    expect(floors.map(p=>[p.x-index*SECTION_WIDTH-p.width/2,p.x-index*SECTION_WIDTH+p.width/2])).toEqual(room.intervals);
    expect(floors.every(p=>p.y-p.height/2===room.floor)).toBe(true);
    for(const step of platforms.filter(p=>p.role==='ledge'&&p.room===index)){
     expect(step.height).toBe(32);
     for(const floor of floors){
      const xOverlap=step.x-step.width/2<floor.x+floor.width/2&&step.x+step.width/2>floor.x-floor.width/2;
      const yOverlap=step.y-step.height/2<floor.y+floor.height/2&&step.y+step.height/2>floor.y-floor.height/2;
      expect(xOverlap&&yOverlap,`${kind} room${index} step${step.step} embeds in floor`).toBe(false);
     }
    }
   }
   for(const p of platforms){expect(p.x-p.width/2).toBeGreaterThanOrEqual(0);expect(p.x+p.width/2).toBeLessThanOrEqual(CHAPTER_WIDTH[kind]);}
  });
 }
 it('includes discoverable story on both routes and an explicit Franklin destination',()=>{
  expect(JAIL_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(4);
  expect(OUTSIDE_SECTIONS.filter(s=>s.secret).length).toBeGreaterThanOrEqual(8);
  expect(OUTSIDE_SECTIONS[0].story).toContain('Franklin');
 });
 it('has distinct encounter layouts with broad authored format variety',()=>{
  for(const encounters of [JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS,CRIMSON_ENCOUNTERS]){
   expect(new Set(encounters.map(e=>JSON.stringify(e.steps))).size).toBe(encounters.length);
   expect(new Set(encounters.map(e=>e.format)).size).toBeGreaterThanOrEqual(6);
   expect(new Set(encounters.map(e=>e.steps.length)).size).toBeGreaterThan(1);
   for(const encounter of encounters){
    if(encounter.spikes.length)expect(encounter.spikes.length).toBeGreaterThanOrEqual(2);
    const xs=spikeXs(encounter.spikes);for(let i=1;i<xs.length;i++)expect(xs[i]-xs[i-1]).toBeGreaterThanOrEqual(84);
    if(xs.length>=4)expect(xs[2]-xs[1]).toBeGreaterThanOrEqual(84);
    for(const enemy of encounter.enemies){expect(enemy.x).toBeGreaterThan(0);expect(enemy.x).toBeLessThan(1440);expect(enemy.patrol).toBeGreaterThan(0);}
   }
  }
 });
 it('keeps calm sections spike-free and enemies attached to their authored support',()=>{
  const chapters=[['jail',JAIL_ENCOUNTERS],['outside',OUTSIDE_ENCOUNTERS],['crimson',CRIMSON_ENCOUNTERS]] as const;
  for(const [kind,encounters] of chapters){
   const platforms=chapterPlatforms(kind);
   encounters.forEach((encounter,index)=>{
    if(encounter.pacing==='calm')expect(encounter.spikes).toEqual([]);
    for(const enemy of encounter.enemies){
     const placement={...enemy,x:index*SECTION_WIDTH+enemy.x};
     const ledges=platforms.filter(p=>p.room===index);
     const authored=kind==='crimson'?undefined:(kind==='jail'?JAIL_ROOMS:OUTSIDE_ROOMS)[index].enemies.find(e=>e.x===enemy.x&&e.type===enemy.type);
     const authoredSupport=kind==='crimson'?enemy.support:authored?.support;
     const support=authoredSupport==='floor'?ledges.find(p=>p.role==='floor'&&placement.x>=p.x-p.width/2&&placement.x<=p.x+p.width/2):typeof authoredSupport==='number'?ledges.find(p=>p.role==='ledge'&&p.step===authoredSupport):ledges.filter(p=>placement.x>=p.x-p.width/2&&placement.x<=p.x+p.width/2).sort((a,b)=>Math.abs(a.y-a.height/2-(placement.y+25))-Math.abs(b.y-b.height/2-(placement.y+25)))[0];
     expect(support,`${kind} ${index}:${enemy.x} support`).toBeDefined();
     const runtimePlacement={...placement,y:support!.y-support!.height/2-25};
     const bodyWidth=enemy.type==='pointed'?46:enemy.type==='boar'?68:enemy.type==='hare'?46:enemy.type==='jumper'?42:50;
     const bounds=enemyPatrolBounds(runtimePlacement,[support!],bodyWidth);
     expect(bounds).toBeDefined();
     expect(bounds!.left).toBeGreaterThanOrEqual(support!.x-support!.width/2+bodyWidth/2+12);
     expect(bounds!.right).toBeLessThanOrEqual(support!.x+support!.width/2-bodyWidth/2-12);
     expect(bounds!.left).toBeLessThanOrEqual(placement.x);expect(bounds!.right).toBeGreaterThanOrEqual(placement.x);
    }
   });
  }
  expect([3,6,9].every(section=>shouldCheckpoint('jail',section))).toBe(true);
 });
 it('teaches conveyor on a safe section 4 landing and wind on a clear section 8 low route',()=>{
  expect(JAIL_ENCOUNTERS.every(e=>!e.wind&&!e.conveyor)).toBe(true);
  const conveyorLesson=OUTSIDE_ENCOUNTERS[3],windLesson=OUTSIDE_ENCOUNTERS[7];
  expect(conveyorLesson.type).toBe('conveyor');expect(conveyorLesson.spikes).toEqual([]);
  expect(conveyorLesson.steps[0][1]).toBeGreaterThanOrEqual(280);expect(conveyorLesson.enemies.every(e=>Math.abs(e.x-conveyorLesson.steps[1][0])>conveyorLesson.steps[1][2]/2+60)).toBe(true);
  expect(encounterSurfaceEffects(conveyorLesson)).toEqual([{platformIndex:1,type:'conveyor',direction:1,strength:70},{platformIndex:2,type:'conveyor',direction:1,strength:70},{platformIndex:3,type:'conveyor',direction:1,strength:70}]);
  expect(windLesson.type).toBe('gust');expect(windLesson.spikes).toEqual([]);expect(windLesson.steps[0][1]).toBeGreaterThanOrEqual(280);
  expect(windLesson.enemies.every(e=>Math.abs(e.x-windLesson.steps[1][0])>windLesson.steps[1][2]/2+60)).toBe(true);
  expect(OUTSIDE_ENCOUNTERS.filter(e=>e.wind||e.conveyor)).toHaveLength(9);
  expect(OUTSIDE_ENCOUNTERS.slice(12).filter(e=>e.wind||e.conveyor).length).toBeGreaterThanOrEqual(6);
 });
 it('keeps the first conveyor and wind teaching landings safe and reachable without dash',()=>{
  for(const encounter of [OUTSIDE_ENCOUNTERS[3],OUTSIDE_ENCOUNTERS[7]]){
   const [x,y,width]=encounter.steps[0];
   const rise=360-(y-16),v=-TUNING.player.jumpVelocity,g=TUNING.player.gravity;
   const airtime=(v+Math.sqrt(v*v-2*g*rise))/g;
   const horizontalReach=airtime*TUNING.player.sprintSpeed;
   expect(Math.max(0,x-width/2-100)).toBeLessThan(horizontalReach);
   expect(spikeXs(encounter.spikes).every(spike=>spike<x-width/2||spike>x+width/2)).toBe(true);
   expect(encounter.enemies.every(enemy=>Math.abs(enemy.x-x)>width/2+enemy.patrol/2)).toBe(true);
  }
 });
 it('registers conveyor force on combined encounter surfaces, not only on conveyor-named sections',()=>{
  expect(encounterSurfaceEffects(CRIMSON_ENCOUNTERS[3])).toEqual([
   {platformIndex:1,type:'conveyor',direction:1,strength:80},
   {platformIndex:3,type:'conveyor',direction:1,strength:80}
  ]);
 });
 it('keeps the two crimson arena sections free from ambient encounter effects',()=>{
  expect(encounterFor('crimson',10)).toBeUndefined();expect(encounterFor('crimson',11)).toBeUndefined();
 });
 it('applies bounded wind by elapsed time rather than frame count',()=>{
  const simulate=(fps:number)=>{
   const dt=1/fps;let drift=0,position=0,velocity=0;
   for(let frame=0;frame<fps*2;frame++){
    velocity=300; // Player.update resets horizontal velocity from input every frame.
    drift=advanceWindDrift(drift,1,51.75,dt,true,85);
    velocity=addWindDrift(velocity,drift,true);position+=velocity*dt;
   }
   return {drift,position,velocity};
  };
  const at30=simulate(30),at60=simulate(60),at120=simulate(120);
  expect(at30.drift).toBe(85);expect(at60.drift).toBe(85);expect(at120.drift).toBe(85);
  expect(Math.abs(at30.position-at120.position)).toBeLessThan(2);expect(Math.abs(at60.position-at120.position)).toBeLessThan(2);
  expect(at30.velocity).toBe(385);expect(addWindDrift(300,0,false)).toBe(300);
  const blocked=[[false,false,false,false],[true,true,false,false],[true,false,true,false],[true,false,false,true]] as const;
  for(const [inWind,grounded,dashing,ultimate] of blocked){
   const active=canReceiveWind(inWind,grounded,dashing,ultimate);
   expect(active).toBe(false);expect(advanceWindDrift(40,1,51.75,1/60,active,85)).toBe(0);
  }
  expect(canReceiveWind(true,false,false,false)).toBe(true);
  expect(advanceWindDrift(0,-1,100,1, true,85)).toBe(-85);expect(advanceWindDrift(0,1,100,-1,true,85)).toBe(0);
 });
 it('sets explicit 20% and 50% pressure targets against kingdom timing',()=>{
  expect(CHAPTER_DIFFICULTY.jail).toBe(1.2);expect(CHAPTER_DIFFICULTY.outside).toBe(1.44);expect(CHAPTER_DIFFICULTY.crimson).toBe(1.728);
  expect(900/CHAPTER_DIFFICULTY.jail).toBe(750);expect(900/CHAPTER_DIFFICULTY.outside).toBe(625);expect(900/CHAPTER_DIFFICULTY.crimson).toBeCloseTo(520.833,2);
 });
});
