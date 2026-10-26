import {it,expect} from 'vitest';
import {LATE_ROOMS,lateRoute,lateExitPlatform,latePlatformCoversExit,latePreviewSpawn,lateStandingOnExit,LATE_CHAPTER_LENGTH,LATE_ROOM_WIDTH,LATE_CHECKPOINTS} from '../src/data/lateChapters';import {furnaceJump,furnaceJumpOptions} from '../src/systems/FurnaceRoute';import {SAVE_CHECKPOINTS} from '../src/systems/progress';import {PlayerAbilities} from '../src/systems/PlayerAbilities';import {TUNING} from '../src/config/tuning';import {qualityTrapDeltaMs,shutterCollisionEnabled,QUALITY_SHUTTER_WARN_MS,QUALITY_SHUTTER_GONE_MS,QUALITY_SHUTTER_RECOVER_MS} from '../src/systems/qualityTrapClock';
it('audit static trajectories',()=>{const fail:string[]=[];for(const [key,rooms]of Object.entries(LATE_ROOMS))rooms.forEach((room,ri)=>{const route=lateRoute(room);for(let edge=0;edge<route.length-1;edge++)for(const fps of [30,60,120]){if(!furnaceJumpOptions(route[edge],route[edge+1],fps,route).length)fail.push(`${key}/${ri}/${edge}/${fps}`);}});expect(fail).toEqual([]);});
it('keeps both chapters at the requested length with twelve aligned room transitions',()=>{expect(LATE_CHAPTER_LENGTH).toBe(17280);expect(LATE_ROOM_WIDTH*12).toBe(LATE_CHAPTER_LENGTH);for(const rooms of Object.values(LATE_ROOMS)){expect(rooms).toHaveLength(12);for(let i=1;i<rooms.length;i++)expect(rooms[i]!.entryTop).toBe(rooms[i-1]!.exitTop);for(const room of rooms)expect(room.steps).toHaveLength(10);}});
it('keeps Crown’s Edge as a continuous 9600-unit ascent with switchback reversals and entry-aligned exits',()=>{const rooms=LATE_ROOMS['crown-edge'];expect(rooms[0]!.entryTop-rooms.at(-1)!.exitTop).toBe(9600);expect(rooms.every(r=>r.steps.slice(1).every((p,i)=>Math.abs(r.steps[i]!.top-p.top)===80))).toBe(true);expect(rooms.every(r=>r.steps.some((p,i)=>i>0&&Math.sign(p.x-r.steps[i-1]!.x)!==Math.sign(r.steps[i+1]!.x-p.x)))).toBe(true);expect(rooms.every(r=>r.exitWidth===384)).toBe(true);});
it('places checkpoints every second entry pad and keeps the two authored chamber routes',()=>{expect(LATE_CHECKPOINTS).toEqual([0,80,2960,5840,8720,11600,14480]);expect(SAVE_CHECKPOINTS.stormworks).toEqual([...LATE_CHECKPOINTS]);expect(SAVE_CHECKPOINTS['crown-edge']).toEqual([...LATE_CHECKPOINTS]);for(const key of ['stormworks','crown-edge'] as const)for(const room of LATE_ROOMS[key]){const route=lateRoute(room);expect(route[0]).toMatchObject({x:96,width:192,top:room.entryTop});expect(route.at(-1)).toMatchObject({top:room.exitTop});expect(room.machines.every(m=>m.step>=0&&m.step<room.steps.length)).toBe(true);}});
it('uses exact exit-pad extents, omits the Crown duplicate, and keeps all rendered pads in room bounds',()=>{for(const key of ['stormworks','crown-edge'] as const)for(const [i,room]of LATE_ROOMS[key].entries()){const exit=lateExitPlatform(room),last=room.steps.at(-1)!,route=lateRoute(room);expect(exit.x+exit.width/2).toBe(LATE_ROOM_WIDTH);expect(exit.x-exit.width/2).toBe(LATE_ROOM_WIDTH-exit.width);expect(latePlatformCoversExit(last,exit)).toBe(key==='crown-edge');expect(route.filter(p=>p.top===room.exitTop&&p.x+p.width/2>=LATE_ROOM_WIDTH).length).toBe(1);expect(route.every(p=>p.x-p.width/2>=0&&p.x+p.width/2<=LATE_ROOM_WIDTH)).toBe(true);if(key==='crown-edge')expect(route.at(-1)).toBe(last);else expect(route.at(-1)).toEqual(exit);expect(i).toBeLessThan(12);}});
it('keeps section 11 preview independent of the campaign checkpoint list and requires end-pad contact to finish',()=>{
 expect(latePreviewSpawn('crown-edge',11)).toEqual({room:11,x:11*LATE_ROOM_WIDTH+96,top:LATE_ROOMS['crown-edge'][11]!.entryTop});
 expect(latePreviewSpawn('stormworks',-3).room).toBe(0);expect(SAVE_CHECKPOINTS['crown-edge']).not.toContain(11*LATE_ROOM_WIDTH+80);
 const room=LATE_ROOMS['crown-edge'][11]!,exit=lateExitPlatform(room),offset=11*LATE_ROOM_WIDTH,body={left:offset+exit.x-20,right:offset+exit.x+20,bottom:room.exitTop};
 expect(lateStandingOnExit(room,11,body)).toBe(true);expect(lateStandingOnExit(room,11,{...body,bottom:room.exitTop-13})).toBe(false);expect(lateStandingOnExit(room,11,{...body,bottom:room.exitTop+13})).toBe(false);expect(lateStandingOnExit(room,11,{...body,left:offset+LATE_ROOM_WIDTH+1,right:offset+LATE_ROOM_WIDTH+30})).toBe(false);
});
it('leaves full-cycle moving lift and ferry departure windows with collision and landing recovery at 30/60/120 fps',()=>{
 const phaseCount=120,periodMs=2*Math.PI*950,phaseStep=periodMs/phaseCount,fail:string[]=[];
 for(const [key,rooms]of Object.entries(LATE_ROOMS))rooms.forEach((room,ri)=>{
  const authored=lateRoute(room),moving=room.machines.filter(m=>m.type==='lift'||m.type==='ferry');
  for(const machine of moving){const routeIndex=machine.step+1;
   const at=(phase:number,ms:number)=>{const wave=Math.sin(phase+ms/950)*65,original=authored[routeIndex]!;return {x:original.x+(machine.type==='ferry'?wave:0),top:original.top+(machine.type==='lift'?wave:0),width:original.width};};
   for(const edge of [routeIndex-1,routeIndex])for(const fps of [30,60,120]){
    const phases:boolean[]=[];
    for(let phaseIndex=0;phaseIndex<phaseCount;phaseIndex++){
     const phase=phaseIndex*2*Math.PI/phaseCount,surfaces=authored.map((surface,i)=>i===routeIndex?at(phase,0):surface),from=surfaces[edge]!,to=surfaces[edge+1]!;
     const platformAt=(surface:typeof from,ms:number)=>surfaces.indexOf(surface)===routeIndex?at(phase,ms):surface;
     const targetTop=(ms:number)=>platformAt(to,ms).top;let feasible=false;
     for(const candidate of furnaceJumpOptions(from,to,fps,surfaces)){
      const jump=furnaceJump(from,to,fps,candidate.dashAtMs,from.top,targetTop,candidate.samples[0]!.x,candidate.runSpeed,surfaces,platformAt);if(!jump)continue;
      const landing=jump.samples.at(-1)!,half=TUNING.player.bodyWidth/2,margin=8;let recovery=true;
      for(let elapsed=0;elapsed<=200;elapsed+=10){const before=platformAt(to,jump.durationMs),now=platformAt(to,jump.durationMs+elapsed),playerX=landing.x+(now.x-before.x);if(playerX-half<now.x-now.width/2+margin||playerX+half>now.x+now.width/2-margin){recovery=false;break;}}
      if(recovery){feasible=true;break;}
     }
     phases.push(feasible);
    }
    let run=0,best=0;for(let i=0;i<phases.length*2-1;i++){run=phases[i%phases.length]?run+phaseStep:0;best=Math.max(best,run);}if(best+1e-6<300)fail.push(`${key}/${ri}/edge${edge}/${machine.type}/${fps}fps: ${best.toFixed(0)}ms`);
   }
  }
 });expect(fail).toEqual([]);
},60000);
it('keeps conveyor takeoffs and landings composable after actual capped 50ms drift and dash cooldown waits',()=>{
 const failures:string[]=[];
 for(const [key,rooms]of Object.entries(LATE_ROOMS))rooms.forEach((room,ri)=>{const route=lateRoute(room);for(const machine of room.machines.filter(m=>m.type==='conveyor')){const idx=machine.step+1,strength=machine.strength??0,direction=machine.direction??1;for(const edge of [idx-1,idx]){const source=route[edge]!,target=route[edge+1]!,sourceDrift=machine.step+1===edge?direction*strength*qualityTrapDeltaMs(50,true)*6/1000:0,targetRecovery=machine.step+1===edge+1?direction*strength*qualityTrapDeltaMs(50,true)*4/1000:0,from={...source,x:source.x+sourceDrift};const options=furnaceJumpOptions(from,target,60,route),landingFits=options.some(c=>{const jump=furnaceJump(from,target,60,c.dashAtMs,from.top,()=>target.top,c.samples[0]!.x,c.runSpeed,route);if(!jump)return false;const settledX=jump.samples.at(-1)!.x+targetRecovery,half=TUNING.player.bodyWidth/2;return settledX+half>target.x-target.width/2&&settledX-half<target.x+target.width/2;});if(!landingFits)failures.push(`${key}/${ri}/${edge}`);}}
  const permanent=room.steps.some((step,i)=>step.width>=112&&!room.machines.some(m=>m.step===i&&(m.type==='shutters'||m.type==='lift'||m.type==='ferry'||m.type==='conveyor')));if(!permanent||route[0]!.width<192)failures.push(`${key}/${ri}/no-dash-wait-refuge`);const abilities=new PlayerAbilities({dashCooldown:TUNING.player.dashCooldown});if(!abilities.tryStartDash(0,200,true)||abilities.tryStartDash(999,200,true))failures.push(`${key}/${ri}/dash-cooldown`);abilities.land();if(!abilities.tryStartDash(TUNING.player.dashCooldown,200,true))failures.push(`${key}/${ri}/dash-after-safe-wait`);for(let edge=0;edge<route.length-1;edge++){const options=furnaceJumpOptions(route[edge]!,route[edge+1]!,60,route);if(!options.length)failures.push(`${key}/${ri}/edge${edge}/cooldown-route`);}
 });expect(failures).toEqual([]);
});
it('finds repeatable shutter departure windows against the runtime collision schedule and full solid routes',()=>{
 const period=2*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS),stepMs=50,failures:string[]=[];
 for(const [ri,room]of LATE_ROOMS['crown-edge'].entries()){
  const shutters=room.machines.filter(m=>m.type==='shutters');if(!shutters.length)continue;const route=lateRoute(room),ordered=[...shutters].sort((a,b)=>a.step-b.step);
  for(const machine of ordered){const routeIndex=machine.step+1,offset=ordered.indexOf(machine)*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS);
   for(const edge of [routeIndex-1,routeIndex]){const phases:boolean[]=[];for(let start=0;start<period;start+=stepMs){const sourceIsShutter=ordered.some(m=>m.step+1===edge),targetIsShutter=ordered.some(m=>m.step+1===edge+1),sourceSolid=!sourceIsShutter||shutterCollisionEnabled((start-(ordered.find(m=>m.step+1===edge)?ordered.indexOf(ordered.find(m=>m.step+1===edge)!):0)*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS)+period)%period),targetOffset=ordered.findIndex(m=>m.step+1===edge+1)*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS);let possible=false;
    if(sourceSolid){for(const candidate of furnaceJumpOptions(route[edge]!,route[edge+1]!,60,route)){const duration=candidate.durationMs;if(targetIsShutter&&!shutterCollisionEnabled((start+duration+200-targetOffset+period*2)%period))continue;const jump=furnaceJump(route[edge]!,route[edge+1]!,60,candidate.dashAtMs,route[edge]!.top,()=>route[edge+1]!.top,candidate.samples[0]!.x,candidate.runSpeed,route);if(jump){possible=true;break;}}}phases.push(possible);}
    let run=0,best=0;for(let i=0;i<phases.length*2-1;i++){run=phases[i%phases.length]?run+stepMs:0;best=Math.max(best,run);}if(best<300)failures.push(`${ri}/${edge}:${best}ms`);
   }
  }
 }
 expect(QUALITY_SHUTTER_WARN_MS).toBe(2000);expect(QUALITY_SHUTTER_GONE_MS).toBe(1000);expect(QUALITY_SHUTTER_RECOVER_MS).toBe(400);expect(shutterCollisionEnabled(1999)).toBe(true);expect(shutterCollisionEnabled(2000)).toBe(false);expect(shutterCollisionEnabled(3000)).toBe(true);expect(failures).toEqual([]);
});
