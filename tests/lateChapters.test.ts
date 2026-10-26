import {it,expect} from 'vitest';
import {LATE_ROOMS,lateRoute,lateExitPlatform,latePlatformCoversExit,latePreviewSpawn,lateStandingOnExit,LATE_CHAPTER_LENGTH,LATE_ROOM_WIDTH,LATE_CHECKPOINTS} from '../src/data/lateChapters';import {furnaceJump,furnaceJumpOptions} from '../src/systems/FurnaceRoute';import {SAVE_CHECKPOINTS} from '../src/systems/progress';import {PlayerAbilities} from '../src/systems/PlayerAbilities';import {TUNING} from '../src/config/tuning';import {qualityTrapDeltaMs,shutterCollisionEnabled,QUALITY_SHUTTER_WARN_MS,QUALITY_SHUTTER_GONE_MS,QUALITY_SHUTTER_RECOVER_MS,QUALITY_PRESS_HALF_HEIGHT,pressImpactCenterY,trapIdleCadenceMs,QUALITY_TRAP_WARNING_MS} from '../src/systems/qualityTrapClock';import {CHAPTER_DIFFICULTY} from '../src/data/chapterChallenges';
it('audit static trajectories',()=>{const fail:string[]=[];for(const [key,rooms]of Object.entries(LATE_ROOMS))rooms.forEach((room,ri)=>{const route=lateRoute(room);for(let edge=0;edge<route.length-1;edge++)for(const fps of [30,60,120]){if(!furnaceJumpOptions(route[edge],route[edge+1],fps,route).length)fail.push(`${key}/${ri}/${edge}/${fps}`);}});expect(fail).toEqual([]);});
it('keeps both chapters at the requested length with twelve aligned room transitions',()=>{expect(LATE_CHAPTER_LENGTH).toBe(17280);expect(LATE_ROOM_WIDTH*12).toBe(LATE_CHAPTER_LENGTH);for(const rooms of Object.values(LATE_ROOMS)){expect(rooms).toHaveLength(12);for(let i=1;i<rooms.length;i++)expect(rooms[i]!.entryTop).toBe(rooms[i-1]!.exitTop);for(const room of rooms)expect(room.steps.length).toBeGreaterThanOrEqual(7);}});
it('keeps both late chapters varied, and Crown Edge a substantial ascent with authored descents',()=>{const crown=LATE_ROOMS['crown-edge'],signature=(r:typeof LATE_ROOMS['stormworks'][number])=>JSON.stringify({steps:r.steps.map((p,i)=>[p.x-(i?r.steps[i-1]!.x:0),p.top-(i?r.steps[i-1]!.top:r.entryTop),p.width]),exit:r.exitTop-r.steps.at(-1)!.top}),counts=(rooms:readonly (typeof LATE_ROOMS['stormworks'][number])[])=>{const values=new Map<string,number>();for(const room of rooms)values.set(signature(room),(values.get(signature(room))??0)+1);return values;},stormCounts=counts(LATE_ROOMS.stormworks),crownCounts=counts(crown);expect(stormCounts.size).toBeGreaterThanOrEqual(6);expect(crownCounts.size).toBeGreaterThanOrEqual(6);expect([...stormCounts.values(),...crownCounts.values()].every(n=>n<=2)).toBe(true);expect(crown[0]!.entryTop-crown.at(-1)!.exitTop).toBeGreaterThan(2000);expect(crown.every(r=>r.steps.length>=7&&r.steps.length<=11)).toBe(true);expect(crown.some(r=>r.steps.some((p,i)=>p.top>(i?r.steps[i-1]!.top:r.entryTop)))).toBe(true);expect(crown.some(r=>r.steps.some((p,i)=>i>0&&i<r.steps.length-1&&Math.sign(p.x-r.steps[i-1]!.x)!==Math.sign(r.steps[i+1]!.x-p.x)))).toBe(true);expect(crown.every(r=>r.exitWidth===384)).toBe(true);});
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
},30000);

it('composes the two-shutter Crown rooms with real arrival, recovery, and dash-ready state',()=>{
 const cycle=2*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS),stepMs=50,half=TUNING.player.bodyWidth/2;
 const schedule=(room:typeof LATE_ROOMS['crown-edge'][number])=>{
  const route=lateRoute(room),shutters=[...room.machines].filter(m=>m.type==='shutters').sort((a,b)=>a.step-b.step),offsetFor=(routeIndex:number)=>{const m=shutters.find(s=>s.step+1===routeIndex);return m?shutters.indexOf(m)*(QUALITY_SHUTTER_WARN_MS+QUALITY_SHUTTER_GONE_MS+QUALITY_SHUTTER_RECOVER_MS):undefined;};
  const safeSolid=(routeIndex:number,from:number,to:number)=>{const offset=offsetFor(routeIndex);if(offset===undefined)return true;for(let ms=from;ms<=to;ms+=stepMs)if(!shutterCollisionEnabled((ms-offset+cycle)%cycle))return false;return true;};
  const options=route.slice(0,-1).map((from,i)=>furnaceJumpOptions(from,route[i+1]!,60,route));
  const search=(edge:number,arrival:number,x:number,dashReady:number,departures:{departure:number;dashAtMs?:number;readyAt:number}[]):typeof departures|undefined=>{
   if(edge===route.length-1)return departures;
   const from=route[edge]!;
   for(const jump of options[edge]!){const earliest=Math.ceil((arrival+200+Math.abs(x-jump.samples[0]!.x)/TUNING.player.maxRunSpeed*1000)/stepMs)*stepMs;
    for(let departure=earliest;departure<=earliest+cycle;departure+=stepMs){if(!safeSolid(edge,arrival,departure))break;if(jump.dashAtMs!==undefined&&departure+jump.dashAtMs<dashReady)continue;
     const landedAt=departure+jump.durationMs;if(!safeSolid(edge+1,landedAt,landedAt+200))continue;
     const nextDash=jump.dashAtMs===undefined?dashReady:departure+jump.dashAtMs+TUNING.player.dashCooldown;
     const tail=search(edge+1,landedAt,jump.samples.at(-1)!.x,nextDash,[...departures,{departure,dashAtMs:jump.dashAtMs,readyAt:nextDash}]);if(tail)return tail;
    }
   }
  };
  return search(0,0,route[0]!.x,0,[]);
 };
 for(const roomIndex of [7,10]){
  const room=LATE_ROOMS['crown-edge'][roomIndex]!,result=schedule(room);
  expect(room.machines.filter(m=>m.type==='shutters')).toHaveLength(2);
  expect(result,`${room.name} should have a composed witness over each ordered edge`).toBeDefined();
  expect(result).toHaveLength(lateRoute(room).length-1);
  let ready=0;for(const edge of result!){if(edge.dashAtMs!==undefined){expect(edge.departure+edge.dashAtMs).toBeGreaterThanOrEqual(ready);ready=edge.readyAt;}else expect(edge.readyAt).toBe(ready);}
 }
},30000);

it('composes a Crown lift approach, ride, and departure over the same runtime phase clock',()=>{
 const room=LATE_ROOMS['crown-edge'][3]!,route=lateRoute(room),machine=room.machines.find(m=>m.type==='lift')!,movingIndex=machine.step+1,period=2*Math.PI*950;
 const options=route.slice(0,-1).map((from,i)=>furnaceJumpOptions(from,route[i+1]!,60,route));
 const position=(index:number,clock:number)=>{const p=route[index]!;return index===movingIndex?{...p,top:p.top+Math.sin(clock/950+machine.step*Math.PI)*65}:p;};
 const solve=(startClock:number)=>{let arrival=startClock,x=route[movingIndex-2]!.x,dashReady=startClock;const schedule:number[]=[];
  for(let edge=movingIndex-2;edge<=movingIndex;edge++){
   const from=route[edge]!,to=route[edge+1]!;let chosen:{departure:number;jump:NonNullable<ReturnType<typeof furnaceJump>>}|undefined;
   for(const template of options[edge]!){const launchOffset=template.samples[0]!.x-from.x;
    const earliest=Math.ceil((arrival+200+Math.abs(x-(position(edge,arrival).x+launchOffset))/TUNING.player.maxRunSpeed*1000)/50)*50;
    for(let departure=earliest;departure<=earliest+period;departure+=50){const source=position(edge,departure),targetAt=(ms:number)=>position(edge+1,departure+ms),platformAt=(p:typeof from,ms:number)=>position(route.indexOf(p),departure+ms);
     if(template.dashAtMs!==undefined&&departure+template.dashAtMs<dashReady)continue;
     const jump=furnaceJump(from,to,60,template.dashAtMs,source.top,ms=>targetAt(ms).top,source.x+launchOffset,template.runSpeed,route,platformAt);if(!jump)continue;
     const landing=jump.samples.at(-1)!,landed=departure+jump.durationMs,base=position(edge+1,landed);let recovered=true;
     for(let dt=0;dt<=200;dt+=10){const now=position(edge+1,landed+dt),playerX=landing.x+(now.x-base.x);if(playerX-TUNING.player.bodyWidth/2<now.x-now.width/2+8||playerX+TUNING.player.bodyWidth/2>now.x+now.width/2-8){recovered=false;break;}}
     if(recovered){chosen={departure,jump};break;}
    }
    if(chosen)break;
   }
   if(!chosen||!chosen.jump)return;
   const {departure,jump}=chosen;arrival=departure+jump.durationMs;x=jump.samples.at(-1)!.x;dashReady=jump.dashAtMs===undefined?dashReady:departure+jump.dashAtMs+TUNING.player.dashCooldown;schedule.push(departure);
  }
  return schedule;
 };
 expect(machine.type).toBe('lift');expect(options.slice(movingIndex-2,movingIndex+1).every(edge=>edge.length>0)).toBe(true);
 for(let phase=0;phase<period;phase+=950)expect(solve(phase),`lift chain at phase ${phase}ms`).toHaveLength(3);
},30000);

it('composes the Crown press route through its deterministic falling and impact hazard windows',()=>{
 const room=LATE_ROOMS['crown-edge'][5]!,route=lateRoute(room),press=room.machines.find(m=>m.type==='presses')!,pressIndex=press.step+1,platform=route[pressIndex]!,warning=1200+press.step*240,fall=240,impact=500,returnMs=650,idle=trapIdleCadenceMs(CHAPTER_DIFFICULTY.jail),period=QUALITY_TRAP_WARNING_MS+fall+impact+returnMs+idle,half=TUNING.player.bodyWidth/2,height=TUNING.player.bodyHeight;
 const overlap=(x:number,feet:number,time:number)=>{if(time<warning)return false;const elapsed=((time-warning)%period+period)%period;if(elapsed<QUALITY_TRAP_WARNING_MS||elapsed>=QUALITY_TRAP_WARNING_MS+fall+impact)return false;const center=elapsed<QUALITY_TRAP_WARNING_MS+fall?platform.top-480+(pressImpactCenterY(platform.top)-(platform.top-480))*Math.pow((elapsed-QUALITY_TRAP_WARNING_MS)/fall,2):pressImpactCenterY(platform.top);return x+half>platform.x-32&&x-half<platform.x+32&&feet>center-QUALITY_PRESS_HALF_HEIGHT&&feet-height<center+QUALITY_PRESS_HALF_HEIGHT;};
 const safeStanding=(index:number,x:number,from:number,to:number)=>{for(let time=from;time<=to;time+=50)if(overlap(x,route[index]!.top,time))return false;return true;};
 const options=route.slice(0,-1).map((from,i)=>furnaceJumpOptions(from,route[i+1]!,60,route));
 const search=(edge:number,arrival:number,x:number,dashReady:number,plan:{edge:number;departure:number;dashAtMs?:number;landing:number}[]):typeof plan|undefined=>{
  if(edge===route.length-1)return plan;
  for(const jump of options[edge]!){const reposition=Math.ceil(Math.abs(x-jump.samples[0]!.x)/TUNING.player.maxRunSpeed*1000/50)*50,ready=Math.ceil((arrival+200+reposition)/50)*50;
   for(let departure=ready;departure<=ready+period;departure+=50){if(!safeStanding(edge,x,arrival,departure))break;if(jump.dashAtMs!==undefined&&departure+jump.dashAtMs<dashReady)continue;
    if(jump.samples.some(sample=>overlap(sample.x,sample.feet,departure+sample.ms)))continue;
    const landing=departure+jump.durationMs,landingX=jump.samples.at(-1)!.x;if(!safeStanding(edge+1,landingX,landing,landing+200))continue;
    const nextDash=jump.dashAtMs===undefined?dashReady:departure+jump.dashAtMs+TUNING.player.dashCooldown,tail=search(edge+1,landing,landingX,nextDash,[...plan,{edge,departure,dashAtMs:jump.dashAtMs,landing}]);if(tail)return tail;
   }
  }
 };
 expect(press.type).toBe('presses');expect(options.every(edge=>edge.length>0)).toBe(true);const plan=search(0,0,route[0]!.x,0,[]);
 expect(plan,`${room.name} should compose past the deterministic press cycle`).toHaveLength(route.length-1);
 let dashReady=0;for(const edge of plan!){if(edge.dashAtMs!==undefined){expect(edge.departure+edge.dashAtMs).toBeGreaterThanOrEqual(dashReady);dashReady=edge.departure+edge.dashAtMs+TUNING.player.dashCooldown;}}
},30000);

it('composes the Crown conveyor approach, belt carry, and departure with capped runtime drift',()=>{
 const room=LATE_ROOMS['crown-edge'][9]!,route=lateRoute(room),machine=room.machines.find(m=>m.type==='conveyor')!,beltIndex=machine.step+1,strength=machine.strength??0,direction=machine.direction??1,drift=direction*strength*qualityTrapDeltaMs(50,true)/1000,half=TUNING.player.bodyWidth/2,first=beltIndex-2,last=beltIndex;
 const options=route.slice(0,-1).map((from,i)=>furnaceJumpOptions(from,route[i+1]!,60,route));
 const fits=(index:number,x:number)=>x-half>=route[index]!.x-route[index]!.width/2+8&&x+half<=route[index]!.x+route[index]!.width/2-8;
 const search=(edge:number,arrival:number,x:number,dashReady:number,plan:{edge:number;departure:number;dashAtMs?:number;ready:number}[]):typeof plan|undefined=>{
  if(edge>last)return plan;const from=route[edge]!,to=route[edge+1]!;let states:{wait:number;x:number}[]=[{wait:0,x}];
  for(let wait=50;wait<=TUNING.player.dashCooldown+500;wait+=50){const previous=states.at(-1)!;let nextX=previous.x;if(edge===beltIndex){nextX+=drift;if(!fits(edge,nextX))break;}states.push({wait,x:nextX});}
  for(const template of options[edge]!)for(const state of states){const departure=arrival+state.wait;if(template.dashAtMs!==undefined&&departure+template.dashAtMs<dashReady)continue;
   const jump=furnaceJump(from,to,60,template.dashAtMs,from.top,()=>to.top,state.x,template.runSpeed,route);if(!jump)continue;
   let landingX=jump.samples.at(-1)!.x,recovered=true;if(edge+1===beltIndex)for(let tick=0;tick<4;tick++){landingX+=drift;if(!fits(beltIndex,landingX)){recovered=false;break;}}if(!recovered)continue;
   const ready=template.dashAtMs===undefined?dashReady:departure+template.dashAtMs+TUNING.player.dashCooldown,tail=search(edge+1,departure+jump.durationMs+200,landingX,ready,[...plan,{edge,departure,dashAtMs:template.dashAtMs,ready}]);if(tail)return tail;
  }
 };
 const plan=search(first,0,route[first]!.x,0,[]);expect(machine.type).toBe('conveyor');expect(plan,`${room.name} should compose across the capped conveyor drift`).toHaveLength(last-first+1);
 let ready=0;for(const edge of plan!){if(edge.dashAtMs!==undefined){expect(edge.departure+edge.dashAtMs).toBeGreaterThanOrEqual(ready);ready=edge.ready;}else expect(edge.ready).toBe(ready);}
},30000);

it('keeps Crown controlled drops inside the live follow camera deadzone and viewport',()=>{
 const crown=LATE_ROOMS['crown-edge'],deadzoneY=86,viewHeight=TUNING.simulation.height;
 for(const roomIndex of [3,6,9]){const room=crown[roomIndex]!,down=room.steps.map((step,i)=>({step,i,previousTop:i===0?room.entryTop:room.steps[i-1]!.top})).filter(item=>item.step.top>item.previousTop);expect(down).toHaveLength(1);const drop=down[0]!,next=room.steps[drop.i+1]!;expect(drop.step.top-drop.previousTop).toBe(40);expect(drop.step.top-drop.previousTop).toBeLessThanOrEqual(deadzoneY);expect(drop.step.top-next.top).toBe(80);expect(drop.step.top-next.top+TUNING.player.bodyHeight).toBeLessThan(viewHeight);}
});
