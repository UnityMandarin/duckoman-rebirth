import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
import {FURNACE_ROOMS,FURNACE_CHECKPOINTS,FURNACE_BOSS_CHECKPOINT} from '../src/data/furnace';
import {FurnaceRhythm,furnaceHeatAt,furnaceHeatHazardBounds} from '../src/systems/FurnaceRhythm';
import {furnaceRoute,furnaceJump,furnaceJumpOptions,furnaceLaunchWindow,furnaceSafeLaunch,furnaceComposedPlan} from '../src/systems/FurnaceRoute';
import {furnaceArenaEntry,furnaceEncounter,furnaceStartRecord} from '../src/scenes/FurnaceScene';
import {freshProgress,validateProgress,unlockAfter,replayRescue,releaseRescue,clearRescue,completeRescue} from '../src/systems/progress';
describe('Crimson Furnace rhythm',()=>{
 it('builds warning and burn hazard bounds directly from the live plate collision top',()=>{expect(furnaceHeatHazardBounds(100,220,500)).toEqual({left:100,right:220,top:476,bottom:502});});
 it('has exact safe warning, damage, cool and circuit boundaries',()=>{expect(furnaceHeatAt(999,1)).toBe('warning');expect(furnaceHeatAt(1000,1)).toBe('burn');expect(furnaceHeatAt(2199,1)).toBe('burn');expect(furnaceHeatAt(2200,1)).toBe('cool');expect(furnaceHeatAt(2400,2)).toBe('warning');expect(furnaceHeatAt(3400,2)).toBe('burn');expect(furnaceHeatAt(5800,3)).toBe('burn');expect(furnaceHeatAt(7200,1)).toBe('warning');for(let ms=0;ms<7200;ms+=10)expect([1,2,3].filter(c=>furnaceHeatAt(ms,c as 1|2|3)==='burn').length).toBeLessThanOrEqual(1);});
 it('starts outside the apron, holds inactive, drops resume catchup and resets rooms and reentry',()=>{const r=new FurnaceRhythm();r.update(0,80,50,true);expect(r.started).toBe(false);expect(r.heat(1)).toBe('safe');r.update(0,192,50,true);for(let i=0;i<20;i++)r.update(0,200,50,true);expect(r.elapsedMs).toBe(1000);r.update(0,200,9000,false);r.update(0,200,9000,true);expect(r.elapsedMs).toBe(1000);r.update(0,200,50,true);expect(r.elapsedMs).toBe(1050);r.suspend();r.update(0,200,50,true);expect(r.elapsedMs).toBe(1050);r.update(1,400,50,true);expect(r.elapsedMs).toBe(0);r.update(1,100,50,true);expect(r.started).toBe(true);expect(r.elapsedMs).toBe(50);r.update(0,100,50,true);expect(r.started).toBe(false);expect(r.elapsedMs).toBe(0);r.reset(1);expect(r.elapsedMs).toBe(0);});
});
describe('furnace authored trajectory and heat fairness',()=>{
 for(const fps of [30,60,120])it(`every jump has base jump/dash access and >=300ms safe launch window with 200ms landing recovery at ${fps}Hz`,()=>{let edges=0;const failures:string[]=[];for(let room=0;room<11;room++){const route=furnaceRoute(room);for(let i=1;i<route.length;i++){const options=furnaceJumpOptions(route[i-1],route[i],fps,[...route,{x:1396,top:FURNACE_ROOMS[room].exitTop,width:88}]);if(!options.length){failures.push(`room ${room+1} edge ${i-1}`);edges++;continue;}expect(furnaceLaunchWindow(room,route[i-1],route[i],options),`room ${room+1} edge ${i-1}`).toBeGreaterThanOrEqual(300);edges++;}}expect(edges).toBe(79);expect(failures).toEqual([]);});
 for(const fps of [30,60,120])it(`composes every complete room from all 50ms start phases with reposition, recovery, departure slack and dash cooldown at ${fps}Hz`,()=>{
  const failures:string[]=[];
  for(let room=0;room<11;room++)for(let phase=0;phase<7200;phase+=50){
   const plan=furnaceComposedPlan(room,fps,phase);if(!plan){failures.push(`room ${room+1} phase ${phase}`);break;}
   expect(plan.departures).toHaveLength(FURNACE_ROOMS[room].steps.length+1);
   let readyDash=phase;
   for(const d of plan.departures){expect(d.departureMs-d.windowStartMs).toBe(300);expect(d.repositionMs).toBeGreaterThanOrEqual(0);if(d.dashAtMs!==undefined){expect(d.windowStartMs+d.dashAtMs).toBeGreaterThanOrEqual(readyDash);readyDash=d.departureMs+d.dashAtMs+1000;}}
  }
  expect(failures).toEqual([]);
 },30000);
 it('requires the intended midair dash in Ignition and Smelting without relic assistance',()=>{for(const room of [4,7])for(const fps of [30,60,120]){const options=furnaceJumpOptions(FURNACE_ROOMS[room].steps[0],FURNACE_ROOMS[room].steps[1],fps);expect(options.length).toBeGreaterThan(0);expect(options.every(j=>j.dashAtMs!==undefined)).toBe(true);}});
 it('keeps permanent robot islands, permanent refuges and machine coverage',()=>{expect(FURNACE_ROOMS.flatMap(r=>r.steps)).toHaveLength(68);expect(FURNACE_CHECKPOINTS).toEqual([0,80,2960,5840,8720,11600,14480,15840]);for(let i=0;i<11;i++){const room=FURNACE_ROOMS[i];expect(room.steps.some(p=>!p.circuit&&p.width>=200)).toBe(true);if(i>0)expect(room.entryTop).toBe(FURNACE_ROOMS[i-1].exitTop);for(const robot of room.robots){const p=room.steps[robot.step];expect(p.circuit).toBeUndefined();expect(p.width).toBeGreaterThanOrEqual(robot.step===2?200:160);}expect(furnaceEncounter(i)?.moving).toEqual(room.machines);expect(furnaceEncounter(i)).toBe(furnaceEncounter(i));expect(Object.isFrozen(furnaceEncounter(i))).toBe(true);}const types=FURNACE_ROOMS.flatMap(r=>r.machines.map(m=>m.type));for(const t of ['presses','lift','conveyor'])expect(types).toContain(t);});
 it('lifts offer >=300ms safe incoming and outgoing launch phases with live +/-65 motion at 30/60/120Hz',()=>{
  for(const fps of [30,60,120])for(let room=0;room<11;room++)for(const m of FURNACE_ROOMS[room].machines.filter(m=>m.type==='lift')){
   const route=furnaceRoute(room),lift=route[m.step+1];
   for(const incoming of [true,false]){
    const from=incoming?route[m.step]:lift,to=incoming?lift:route[m.step+2];let streak=0,best=0;
    for(let phase=0;phase<12000;phase+=50){let safe=false;
     const sourceTop=incoming?from.top:from.top+65*Math.sin(phase/950);
     const targetTop=(ms:number)=>incoming?to.top+65*Math.sin((phase+ms)/950):to.top;
     for(const speed of [300,200])for(const dash of [undefined,125,175,225,275]){
      for(let x=from.x-from.width/2+26;x<=from.x+from.width/2-26;x+=16){const jump=furnaceJump(from,to,fps,dash,sourceTop,targetTop,x,speed,[...route,{x:1396,top:FURNACE_ROOMS[room].exitTop,width:88}]);if(jump&&furnaceSafeLaunch(room,from,to,jump,phase)){safe=true;break;}}
      if(safe)break;
     }
     if(safe){streak+=50;best=Math.max(best,streak);}else streak=0;
    }
    expect(best,`room ${room+1} lift ${incoming?'incoming':'outgoing'} ${fps}Hz`).toBeGreaterThanOrEqual(300);
   }
  }
 });
});
describe('furnace campaign schema and dispatch',()=>{
 const unlocked=()=>{let p=freshProgress();for(const chapter of ['gate-1','jail','outside','crimson'] as const)p=unlockAfter(chapter,p);p.currentScene='rescue';return p;};
 it('migrates v4 chained saves to start and released/cleared to Franklin while preserving charge',()=>{for(const checkpoint of [0,180,540]){const old={...unlocked(),version:4};old.chapters.rescue.checkpoint=checkpoint;old.chapters.rescue.charge=73;const p=validateProgress(old)!;expect(p.version).toBe(6);expect(p.chapters.rescue.checkpoint).toBe(checkpoint===540?15840:0);expect(p.chapters.rescue.charge).toBe(73);}const old={...unlocked(),version:4};old.chapters.rescue.opened=[0];old.chapters.rescue.bossDefeated=true;const p=validateProgress(old)!;expect(p.chapters.rescue.checkpoint).toBe(15840);expect(p.chapters.rescue.bossDefeated).toBe(true);});
 it('strictly rejects invalid v6 checkpoints and resumes/replays all legitimate checkpoints',()=>{for(const checkpoint of FURNACE_CHECKPOINTS){const p=unlocked();p.chapters.rescue.checkpoint=checkpoint;expect(validateProgress(p)?.chapters.rescue.checkpoint).toBe(checkpoint);}for(const checkpoint of [180,540,1440,99999]){const p=unlocked();p.chapters.rescue.checkpoint=checkpoint;expect(validateProgress(p)).toBeNull();}const p=unlocked();p.chapters.rescue.charge=89;const released=releaseRescue(p);expect(released.chapters.rescue).toMatchObject({checkpoint:FURNACE_BOSS_CHECKPOINT,charge:89,opened:[0]});const completed=completeRescue(clearRescue(released));expect(completed.ended).toBe(false);expect(completed.currentScene).toBe('stormworks');expect(completed.unlocked).toContain('stormworks');expect(completed.completed).toContain('rescue');const replay=replayRescue(completed);expect(replay.chapters.rescue).toMatchObject({checkpoint:0,charge:0,opened:[],bossDefeated:false});expect(replay.completed).toContain('rescue');});
 it('isolates fresh previews from saved Franklin victory and charge while preserving campaign resume',()=>{const saved={checkpoint:15840,charge:89,opened:[0],bossDefeated:true};expect(furnaceStartRecord({bossPreview:true},saved,true)).toMatchObject({bossDefeated:false,ultimateCharge:0,opened:[]});expect(furnaceStartRecord({},saved,true)).toMatchObject({checkpoint:80,bossDefeated:false});expect(furnaceStartRecord({},saved,false)).toMatchObject({checkpoint:15840,bossDefeated:true,ultimateCharge:89});});
 it('routes boss flags/checkpoint and preview to Franklin, fresh replay to room one, ignores Warden',()=>{expect(furnaceArenaEntry({})).toBe(false);expect(furnaceArenaEntry({checkpoint:14480})).toBe(false);for(const d of [{checkpoint:15840},{opened:[0]},{bossDefeated:true},{bossPreview:true}])expect(furnaceArenaEntry(d)).toBe(true);expect(furnaceArenaEntry({bossPreview:true,freshReplay:true})).toBe(false);expect(furnaceArenaEntry({wardenPreview:true} as any)).toBe(false);});
});
