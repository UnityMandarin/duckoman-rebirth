import {TUNING} from '../config/tuning';
import {FURNACE_ROOMS,type FurnacePlatform} from '../data/furnace';
import {furnaceHeatAt,FURNACE_FLAME_HEIGHT,FURNACE_CYCLE_MS} from './FurnaceRhythm';
export interface FurnaceJumpSample {ms:number;x:number;feet:number;}
export interface FurnaceJump {durationMs:number;dashAtMs?:number;runSpeed:number;samples:FurnaceJumpSample[];}
export function furnaceRoute(room:number):FurnacePlatform[] {const r=FURNACE_ROOMS[room];return [{x:96,top:r.entryTop,width:192},...r.steps,{x:1536,top:r.exitTop,width:192}];}
/** Arcade semi-implicit integration, held base jump and sprint; dash zeroes VY and gravity. No relics. */
export function furnaceJump(from:FurnacePlatform,to:FurnacePlatform,fps:number,dashAtMs?:number,sourceTop=from.top,targetTop:(ms:number)=>number=()=>to.top,launchX?:number,runSpeed:number=TUNING.player.sprintSpeed,solids?:readonly FurnacePlatform[],platformAt?:(platform:FurnacePlatform,ms:number)=>FurnacePlatform):FurnaceJump|undefined {
 const half=TUNING.player.bodyWidth/2,dir=to.x>=from.x?1:-1,dt=1/fps,launch=launchX??from.x+dir*(from.width/2-half-3);
 let x=launch,feet=sourceTop,vy:number=TUNING.player.jumpVelocity;const samples:FurnaceJumpSample[]=[{ms:0,x,feet}];let dashed=false,dashEnd=0;
 for(let frame=1;frame<fps*3;frame++){
  const ms=frame*1000/fps,prevMs=(frame-1)*1000/fps,prevFeet=feet,prevX=x;
  if(!dashed&&dashAtMs!==undefined&&ms>=dashAtMs){dashed=true;dashEnd=ms+TUNING.player.dashDuration;vy=0;}
  const dashing=dashed&&ms<dashEnd;if(!dashing)vy=Math.min(TUNING.player.maxFallVelocity,vy+TUNING.player.gravity*dt);
  feet+=vy*dt;const currentTarget=platformAt?.(to,ms)??to,reached=dir>0?x>=currentTarget.x:x<=currentTarget.x;const vx=dashing?TUNING.player.dashSpeed:reached?0:runSpeed;x+=dir*vx*dt;samples.push({ms,x,feet});
  const top=targetTop(ms);
  if(solids)for(const authored of solids){
   const solid=platformAt?.(authored,ms)??authored,previous=platformAt?.(authored,prevMs)??authored,solidTop=authored===to?top:authored===from?sourceTop:solid.top,previousTop=authored===to?targetTop(prevMs):authored===from?sourceTop:previous.top,solidHeight=solid.width===192||solid.width===88?64:48;
   const horizontal=x+half+8>solid.x-solid.width/2&&x-half-8<solid.x+solid.width/2;
   if(!horizontal)continue;
   if(vy>=0&&prevFeet<=previousTop&&feet>=solidTop&&authored!==to)return;
   // Model overhead separation with an eight-unit horizontal margin for input/frame variation.
   if(vy<0&&prevFeet-TUNING.player.bodyHeight>=previousTop+solidHeight&&feet-TUNING.player.bodyHeight<=solidTop+solidHeight){feet=solidTop+solidHeight+TUNING.player.bodyHeight;vy=0;}
   else if(feet>solidTop&&feet-TUNING.player.bodyHeight<solidTop+solidHeight&&prevFeet>previousTop){
    if(prevX+half<=solid.x-solid.width/2)x=solid.x-solid.width/2-half;
    else if(prevX-half>=solid.x+solid.width/2)x=solid.x+solid.width/2+half;
   }
  }
  samples[samples.length-1]={ms,x,feet};
  if(vy>=0&&prevFeet<=targetTop(prevMs)&&feet>=top&&x>=currentTarget.x-currentTarget.width/2+half+2&&x<=currentTarget.x+currentTarget.width/2-half-2)return {durationMs:ms,dashAtMs,runSpeed,samples};
  if((dir>0?x>currentTarget.x+currentTarget.width/2+half:x<currentTarget.x-currentTarget.width/2-half)&&feet>top)return;
 }
}
export function furnaceJumpOptions(from:FurnacePlatform,to:FurnacePlatform,fps:number,solids?:readonly FurnacePlatform[]):FurnaceJump[] {
 const options:FurnaceJump[]=[];
 for(const dash of [undefined,100,125,150,175,200,225,250,275,300,325,350,375,400]){
  let found=false;
  for(const speed of [TUNING.player.sprintSpeed,TUNING.player.maxRunSpeed]){
   for(let x=from.x-from.width/2+TUNING.player.bodyWidth/2+3;x<=from.x+from.width/2-TUNING.player.bodyWidth/2-3;x+=8){const jump=furnaceJump(from,to,fps,dash,from.top,()=>to.top,x,speed,solids);if(jump){options.push(jump);found=true;break;}}
   if(found)break;
  }
 }
 return options;
}
/** Check all authored flames against body flight, source launch and 200ms landing recovery. */
export function furnaceSafeLaunch(room:number,from:FurnacePlatform,to:FurnacePlatform,jump:FurnaceJump,launchMs:number,recoveryMs=200):boolean {
 const half=TUNING.player.bodyWidth/2,height=TUNING.player.bodyHeight;
 for(const sample of jump.samples)for(const p of FURNACE_ROOMS[room].steps){if(!p.circuit||furnaceHeatAt(launchMs+sample.ms,p.circuit)!=='burn')continue;if(sample.x+half>p.x-p.width/2&&sample.x-half<p.x+p.width/2&&sample.feet>p.top-FURNACE_FLAME_HEIGHT&&sample.feet-height<p.top+2)return false;}
 if(from.circuit&&furnaceHeatAt(launchMs,from.circuit)==='burn')return false;
 if(to.circuit)for(let ms=0;ms<=recoveryMs;ms+=10)if(furnaceHeatAt(launchMs+jump.durationMs+ms,to.circuit)==='burn')return false;
 return true;
}
export function furnaceLaunchWindow(room:number,from:FurnacePlatform,to:FurnacePlatform,jumps:FurnaceJump[]):number {
 let streak=0,best=0;for(let launch=0;launch<FURNACE_CYCLE_MS*2;launch+=10){if(jumps.some(j=>furnaceSafeLaunch(room,from,to,j,launch))){streak+=10;best=Math.max(best,streak);}else streak=0;}return Math.min(best,FURNACE_CYCLE_MS);
}

export interface FurnaceDeparture {edge:number;windowStartMs:number;departureMs:number;landingMs:number;repositionMs:number;dashAtMs?:number;landingX:number;}
export interface FurnaceComposedPlan {room:number;fps:number;startPhaseMs:number;departures:FurnaceDeparture[];}
interface ScheduleJump {jump:FurnaceJump;safeWindows:boolean[];}
interface ScheduleCourse {route:FurnacePlatform[];edges:ScheduleJump[][];}
const SCHEDULE_STEP_MS=50,DEPARTURE_WINDOW_MS=300,LANDING_RECOVERY_MS=200;
const courseCache=new Map<string,ScheduleCourse>();
function furnaceScheduleCourse(room:number,fps:number):ScheduleCourse {
 const key=`${room}:${fps}`,existing=courseCache.get(key);if(existing)return existing;
 const route=furnaceRoute(room),solids=[...route,{x:1396,top:FURNACE_ROOMS[room].exitTop,width:88}],edges:ScheduleJump[][]=[];
 for(let edge=0;edge<route.length-1;edge++){
  const from=route[edge],to=route[edge+1],catalog:ScheduleJump[]=[];
  for(const jump of furnaceJumpOptions(from,to,fps,solids)){
   const safeWindows:boolean[]=[];
   for(let phase=0;phase<FURNACE_CYCLE_MS;phase+=SCHEDULE_STEP_MS)safeWindows.push(furnaceWindowSafe(room,from,to,jump,phase,phase+DEPARTURE_WINDOW_MS));
   catalog.push({jump,safeWindows});
  }
  edges.push(catalog);
 }
 const course={route,edges};courseCache.set(key,course);return course;
}
function phaseGrid(ms:number):number {return ((Math.round(ms/SCHEDULE_STEP_MS)%144)+144)%144;}
export function furnaceIntervalSafe(circuit:1|2|3,fromMs:number,untilMs:number):boolean {
 const firstBurn=(circuit-1)*2400+1000;
 const firstCycle=Math.floor((fromMs-firstBurn)/FURNACE_CYCLE_MS)-1,lastCycle=Math.floor((untilMs-firstBurn)/FURNACE_CYCLE_MS)+1;
 for(let cycle=firstCycle;cycle<=lastCycle;cycle++){const burn=firstBurn+cycle*FURNACE_CYCLE_MS;if(fromMs<burn+1200&&untilMs>=burn)return false;}
 return true;
}
function furnaceWindowSafe(room:number,from:FurnacePlatform,to:FurnacePlatform,jump:FurnaceJump,start:number,end:number):boolean {
 if(from.circuit&&!furnaceIntervalSafe(from.circuit,start,end))return false;
 if(to.circuit&&!furnaceIntervalSafe(to.circuit,start+jump.durationMs,end+jump.durationMs+LANDING_RECOVERY_MS+SCHEDULE_STEP_MS))return false;
 const half=TUNING.player.bodyWidth/2,height=TUNING.player.bodyHeight;
 for(const sample of jump.samples)for(const p of FURNACE_ROOMS[room].steps){
  if(p.circuit&&sample.x+half>p.x-p.width/2&&sample.x-half<p.x+p.width/2&&sample.feet>p.top-FURNACE_FLAME_HEIGHT&&sample.feet-height<p.top+2&&!furnaceIntervalSafe(p.circuit,start+sample.ms,end+sample.ms))return false;
 }
 return true;
}
function furnaceStandingSafe(platform:FurnacePlatform,fromMs:number,untilMs:number):boolean {
 return !platform.circuit||furnaceIntervalSafe(platform.circuit,fromMs,untilMs);
}
/** A composed route witness, carrying actual landing X/time and dash recharge through each heat chain.
 * Permanent anchors can wait through complete cycles; heated ledges cannot cross a burn while waiting.
 * Each chosen departure offers a fixed-trajectory 300ms interval and takes its conservative final instant.
 */
export function furnaceComposedPlan(room:number,fps:number,startPhaseMs=0):FurnaceComposedPlan|undefined {
 const course=furnaceScheduleCourse(room,fps),failed=new Set<string>();
 const search=(edge:number,arrivalMs:number,x:number,dashReadyMs:number):FurnaceDeparture[]|undefined=>{
  if(edge===course.edges.length)return [];
  const from=course.route[edge],arrival=Math.ceil(arrivalMs/SCHEDULE_STEP_MS)*SCHEDULE_STEP_MS;
  const key=`${edge}:${phaseGrid(arrival)}:${Math.round(x)}:${Math.max(0,Math.ceil((dashReadyMs-arrival)/50))}`;
  if(failed.has(key))return;
  for(const option of course.edges[edge]){
   const jump=option.jump,repositionMs=Math.ceil(Math.abs(x-jump.samples[0].x)/TUNING.player.maxRunSpeed*1000/SCHEDULE_STEP_MS)*SCHEDULE_STEP_MS;
   const ready=Math.ceil((arrival+LANDING_RECOVERY_MS+repositionMs)/SCHEDULE_STEP_MS)*SCHEDULE_STEP_MS;
   for(let windowStart=ready;windowStart<=ready+FURNACE_CYCLE_MS;windowStart+=SCHEDULE_STEP_MS){
    const departure=windowStart+DEPARTURE_WINDOW_MS;
    if(!furnaceStandingSafe(from,arrivalMs,departure))break;
    if(jump.dashAtMs!==undefined&&windowStart+jump.dashAtMs<dashReadyMs)continue;
    if(!option.safeWindows[phaseGrid(windowStart)])continue;
    const landing=departure+jump.durationMs,last=jump.samples[jump.samples.length-1],nextDash=jump.dashAtMs===undefined?dashReadyMs:departure+jump.dashAtMs+TUNING.player.dashCooldown;
    const tail=search(edge+1,landing,last.x,nextDash);
    if(tail)return [{edge,windowStartMs:windowStart,departureMs:departure,landingMs:landing,repositionMs,dashAtMs:jump.dashAtMs,landingX:last.x},...tail];
   }
  }
  failed.add(key);return;
 };
 const departures=search(0,startPhaseMs,96,startPhaseMs);
 return departures?{room,fps,startPhaseMs,departures}:undefined;
}
