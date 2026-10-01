import {describe,it,expect} from 'vitest';
import {CASTLE} from '../src/data/castle';
import {CHAPTER_WIDTH,JAIL_SECTIONS,OUTSIDE_SECTIONS,chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';
import {CHAPTER_DIFFICULTY,JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS,CRIMSON_ENCOUNTERS,encounterFor,encounterSurfaceEffects,advanceWindDrift,addWindDrift,canReceiveWind} from '../src/data/chapterChallenges';
import {TUNING} from '../src/config/tuning';
import {enemyPatrolBounds} from '../src/systems/enemyPatrolBounds';
import {shouldCheckpoint} from '../src/systems/checkpointPolicy';

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
 it('has distinct encounter layouts with broad authored format variety',()=>{
  for(const encounters of [JAIL_ENCOUNTERS,OUTSIDE_ENCOUNTERS,CRIMSON_ENCOUNTERS]){
   expect(new Set(encounters.map(e=>JSON.stringify(e.steps))).size).toBe(encounters.length);
   expect(new Set(encounters.map(e=>e.format)).size).toBeGreaterThanOrEqual(6);
   expect(new Set(encounters.map(e=>e.steps.length)).size).toBeGreaterThan(1);
   for(const encounter of encounters){
    if(encounter.spikes.length)expect(encounter.spikes.length).toBeGreaterThanOrEqual(2);
    for(let i=1;i<encounter.spikes.length;i++)expect(encounter.spikes[i]-encounter.spikes[i-1]).toBeGreaterThanOrEqual(84);
    if(encounter.spikes.length>=4)expect(encounter.spikes[2]-encounter.spikes[1]).toBeGreaterThanOrEqual(150);
    for(const enemy of encounter.enemies){expect(enemy.x).toBeGreaterThan(0);expect(enemy.x).toBeLessThan(1440);expect(enemy.patrol).toBeGreaterThanOrEqual(60);}
   }
  }
 });
 it('keeps authored calm sections spike-free and places enemies over clamped support ledges',()=>{
  const chapters=[['jail',JAIL_ENCOUNTERS],['outside',OUTSIDE_ENCOUNTERS],['crimson',CRIMSON_ENCOUNTERS]] as const;
  for(const [kind,encounters] of chapters){
   const platforms=chapterPlatforms(kind);
   encounters.forEach((encounter,index)=>{
    if(encounter.pacing==='calm')expect(encounter.spikes).toEqual([]);
    for(const enemy of encounter.enemies){
     const placement={...enemy,x:index*SECTION_WIDTH+enemy.x};
     const ledges=platforms.filter(p=>p.x>index*SECTION_WIDTH&&p.x<(index+1)*SECTION_WIDTH);
     const support=ledges.filter(p=>placement.x>=p.x-p.width/2&&placement.x<=p.x+p.width/2).sort((a,b)=>Math.abs(a.y-a.height/2-(placement.y+25))-Math.abs(b.y-b.height/2-(placement.y+25)))[0];
     expect(support,`${kind} ${index}:${enemy.x} support`).toBeDefined();
     expect(Math.abs(support!.y-support!.height/2-(placement.y+25))).toBeLessThanOrEqual(1);
     const bodyWidth=enemy.type==='pointed'?46:enemy.type==='boar'?68:enemy.type==='hare'?46:enemy.type==='jumper'?42:50;
     const bounds=enemyPatrolBounds(placement,ledges,bodyWidth);
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
  expect(encounterSurfaceEffects(conveyorLesson)).toEqual([{platformIndex:1,type:'conveyor',direction:1,strength:70},{platformIndex:2,type:'conveyor',direction:1,strength:70}]);
  expect(windLesson.type).toBe('gust');expect(windLesson.spikes).toEqual([]);expect(windLesson.steps[0][1]).toBeGreaterThanOrEqual(280);
  expect(windLesson.enemies.every(e=>Math.abs(e.x-windLesson.steps[1][0])>windLesson.steps[1][2]/2+60)).toBe(true);
  expect(OUTSIDE_ENCOUNTERS.filter(e=>e.wind||e.conveyor)).toHaveLength(8);
  expect(OUTSIDE_ENCOUNTERS.slice(12).filter(e=>e.wind||e.conveyor).length).toBeGreaterThanOrEqual(6);
 });
 it('keeps the first conveyor and wind teaching landings safe and reachable without dash',()=>{
  for(const encounter of [OUTSIDE_ENCOUNTERS[3],OUTSIDE_ENCOUNTERS[7]]){
   const [x,y,width]=encounter.steps[0];
   const rise=360-(y-16),v=-TUNING.player.jumpVelocity,g=TUNING.player.gravity;
   const airtime=(v+Math.sqrt(v*v-2*g*rise))/g;
   const horizontalReach=airtime*TUNING.player.sprintSpeed;
   expect(Math.max(0,x-width/2-100)).toBeLessThan(horizontalReach);
   expect(encounter.spikes.every(spike=>spike<x-width/2||spike>x+width/2)).toBe(true);
   expect(encounter.enemies.every(enemy=>Math.abs(enemy.x-x)>width/2+enemy.patrol/2)).toBe(true);
  }
 });
 it('registers conveyor force on combined encounter surfaces, not only on conveyor-named sections',()=>{
  expect(encounterSurfaceEffects(CRIMSON_ENCOUNTERS[3])).toEqual([
   {platformIndex:1,type:'conveyor',direction:1,strength:80},
   {platformIndex:2,type:'conveyor',direction:1,strength:80},
   {platformIndex:3,type:'conveyor',direction:1,strength:80},
   {platformIndex:4,type:'conveyor',direction:1,strength:80}
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
  expect(CHAPTER_DIFFICULTY.jail).toBe(1.2);expect(CHAPTER_DIFFICULTY.outside).toBe(1.5);
  expect(900/CHAPTER_DIFFICULTY.jail).toBe(750);expect(900/CHAPTER_DIFFICULTY.outside).toBe(600);
 });
});
