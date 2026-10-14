import {describe,expect,it} from 'vitest';
import {chapterPlatforms,SECTION_WIDTH,type ChapterKind} from '../src/data/chapters';
import {roomFor,JAIL_ROOMS,OUTSIDE_ROOMS} from '../src/data/qualityRooms';
import {predictDescent,type DescentPrediction,type PredictHazard,type PredictSurface} from '../src/systems/descentPrediction';
import {descentCameraTarget,PredictiveDescentCamera} from '../src/systems/predictiveDescentCamera';
import {CASTLE_PLATFORMS,secretHoleSolids} from '../src/data/castle';
import {GATE_1_ROOM} from '../src/data/gate1Room';
import {FURNACE_ROOMS,FURNACE_ROOM_WIDTH} from '../src/data/furnace';
import {furnaceJumpOptions,furnaceRoute} from '../src/systems/FurnaceRoute';
import {encounterFor} from '../src/data/chapterChallenges';

type Link={kind:ChapterKind;room:number;from:number;toRole:'floor'|'ledge';to?:number};
function links(kind:ChapterKind):Link[]{const rows=chapterPlatforms(kind),out:Link[]=[];for(let room=0;room<(kind==='jail'?12:kind==='outside'?22:12);room++){const ledges=rows.filter(p=>p.room===room&&p.role==='ledge').sort((a,b)=>(a.step??0)-(b.step??0));for(let i=0;i<ledges.length-1;i++){const a=ledges[i]!,b=ledges[i+1]!;if(b.y-a.y>48)out.push({kind,room,from:a.step??i,toRole:'ledge',to:b.step??i+1});}}return out;}
function forecast(link:Link){
 const platforms=chapterPlatforms(link.kind),room=link.room,from=platforms.find(p=>p.room===room&&p.role==='ledge'&&p.step===link.from)!,target=link.toRole==='floor'?platforms.find(p=>p.room===room&&p.role==='floor'&&p.x>=room*SECTION_WIDTH&&p.x<(room+1)*SECTION_WIDTH)!:platforms.find(p=>p.room===room&&p.role==='ledge'&&p.step===link.to)!;
 const surfaces:PredictSurface[]=platforms.map((p,index)=>({p,index})).filter(({p})=>Math.abs((p.room??Math.floor(p.x/SECTION_WIDTH))-room)<=1).map(({p,index})=>{
  const pRoom=p.room??Math.floor(p.x/SECTION_WIDTH),floorTop=pRoom<12?JAIL_ROOMS[pRoom]?.floor:undefined,top=p.role==='floor'?(link.kind==='jail'?floorTop??360:360):p.y-p.height/2;
  return {id:`r${pRoom}:${p.role}:${p.step??index}`,room:pRoom,left:p.x-p.width/2,right:p.x+p.width/2,top,bottom:top+p.height,enabled:true};
 });
 const hazards:PredictHazard[]=[];
 for(let pRoom=Math.max(0,room-1);pRoom<=room+1;pRoom++){
  const quality=roomFor(link.kind,pRoom),encounter=encounterFor(link.kind,pRoom);
  if(quality){let edge=0;for(const[a,b]of quality.intervals){if(a>edge)hazards.push({id:`pit-${pRoom}-${edge}`,left:pRoom*SECTION_WIDTH+edge,right:pRoom*SECTION_WIDTH+a,top:0,bottom:link.kind==='jail'?1820:520,active:true,kind:'pit'});edge=b;}if(edge<1440)hazards.push({id:`pit-${pRoom}-${edge}`,left:pRoom*SECTION_WIDTH+edge,right:(pRoom+1)*SECTION_WIDTH,top:0,bottom:link.kind==='jail'?1820:520,active:true,kind:'pit'});}
  for(const[spikeIndex,spike]of (encounter?.spikes??[]).entries()){
   const entry=typeof spike==='number'?{x:spike,support:'floor' as const}:spike,hx=pRoom*SECTION_WIDTH+entry.x;
   const support=surfaces.find(surface=>surface.room===pRoom&&(entry.support==='floor'?surface.id.startsWith(`r${pRoom}:floor:`):surface.id===`r${pRoom}:ledge:${entry.support}`)),top=support?.top??360;
   hazards.push({id:`spike-${pRoom}-${spikeIndex}`,left:hx-36,right:hx+36,top:top-10,bottom:top+10,active:true,kind:'spike'});
  }
 }
 const source=surfaces.find(s=>s.id===`r${room}:ledge:${link.from}`)!,targetIndex=platforms.indexOf(target),targetSurface=surfaces.find(s=>s.id===`r${room}:${link.toRole}:${link.to??targetIndex}`)!,direction=target.x>=from.x?1 as const:-1 as const,x=direction>0?Math.max(source.left+23,Math.min(source.right-23,source.right+23-220)):Math.max(source.left+23,Math.min(source.right-23,source.left-23+220)),y=source.top-20,input={x,y,vx:direction*200,vy:0,halfWidth:23,halfHeight:20,grounded:true,supportId:source.id,horizontal:direction,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces,hazards},result:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};predictDescent(input,result);
 const floorTop=link.kind==='jail'?JAIL_ROOMS[room]?.floor??360:360,targetTop=link.toRole==='floor'?floorTop:target.y-target.height/2,viewBottom=link.kind==='jail'?1840:link.kind==='crimson'?460:620,frame={actorTop:y-30,actorBottom:y+30,targetBottom:targetTop+20,targetLeft:targetSurface.left,targetRight:targetSurface.right,hazardLeft:result.risk?result.riskLeft:undefined,hazardRight:result.risk?result.riskRight:undefined},fit=descentCameraTarget({x:x-320,width:640,y:-160,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,boundsTop:-160,boundsBottom:viewBottom},frame);
 return {link,result,targetSurface,fit,surfaces,hazards,source};
}

describe('whole-route authored lower-link forecasting',()=>{
 it.each(['outside','crimson'] as const)('checks downward authored steps and actual first landing projections in %s',kind=>{
  const route=links(kind),failures:string[]=[],valid:Link[]=[];for(const link of route){const {result,targetSurface,surfaces}=forecast(link);if(result.state!=='landing'||result.targetY<=targetSurface.top-16||!result.targetId){failures.push(`${link.room}/${link.from}->${link.to??'floor'}:${result.state}/${result.targetId??'-'}`);continue;}const actualSurface=surfaces.find(surface=>surface.id===result.targetId);if(!actualSurface){failures.push(`${link.room}/${link.from}:unknown ${result.targetId}`);continue;}const fit=descentCameraTarget({x:result.actorX-320,width:640,y:-160,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,boundsTop:-160,boundsBottom:kind==='crimson'?460:620},{actorTop:result.actorY-30,actorBottom:result.actorY+30,targetBottom:Math.max(actualSurface.top+20,result.risk?result.riskBottom??actualSurface.top+20:actualSurface.top+20),targetLeft:actualSurface.left,targetRight:actualSurface.right,hazardLeft:result.risk?result.riskLeft:undefined,hazardRight:result.risk?result.riskRight:undefined});if(!fit.visible)failures.push(`${link.room}/${link.from}:first landing projection`);else valid.push(link);}expect(failures,`${kind} authored downward links`).toEqual([]);expect(valid.length).toBe(route.length);
 });
 it('keeps the route set tied to all authored Outside and Crimson rooms',()=>{expect(links('outside').every(l=>l.room<OUTSIDE_ROOMS.length)).toBe(true);expect(links('crimson').every(l=>l.room<12)).toBe(true);});
 it('projects a real lower Castle gallery interception using the collision pieces',()=>{
  const rectangles=secretHoleSolids([...GATE_1_ROOM.platforms,...CASTLE_PLATFORMS]),fromIndex=rectangles.findIndex(p=>p.x===2370&&p.y===275),from=rectangles[fromIndex]!,surfaces:PredictSurface[]=rectangles.map((p,i)=>({id:`castle-solid-${i}`,room:Math.floor(p.x/2560),left:p.x-p.width/2,right:p.x+p.width/2,top:p.y-p.height/2,bottom:p.y+p.height/2,enabled:true,landing:p.width>p.height})).filter(s=>Math.abs(s.room-Math.floor(from.x/2560))<=1),source=surfaces.find(s=>s.id===`castle-solid-${fromIndex}`)!,x=source.left-23+160,y=source.top-20,input={x,y,vx:-200,vy:0,halfWidth:23,halfHeight:20,grounded:true,supportId:source.id,horizontal:-1 as const,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces,hazards:[]},result:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};predictDescent(input,result);expect(result.state).toBe('landing');const targetIndex=Number(result.targetId?.split('-').at(-1)),target=surfaces.find(s=>s.id===result.targetId)!;expect(Number.isInteger(targetIndex)).toBe(true);expect(target.top).toBeGreaterThan(source.top+32);const fit=descentCameraTarget({x:result.actorX-320,width:640,y:-100,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,boundsTop:-800,boundsBottom:400},{actorTop:result.actorY-30,actorBottom:result.actorY+30,targetBottom:target.top+20,targetLeft:target.left,targetRight:target.right});expect(fit.visible).toBe(true);
 });
 it('classifies the Furnace 9 long crossing as normal-camera visible before takeoff',()=>{
  const room=8,r=FURNACE_ROOMS[room]!,route=furnaceRoute(room),from=route[1]!,to=route[2]!,base=room*FURNACE_ROOM_WIDTH;
  for(const fps of [30,60,120]){
   const jumps=furnaceJumpOptions(from,to,fps,route);expect(jumps.length,`room 9 step 0 to 1 at ${fps}Hz`).toBeGreaterThan(0);
   for(const speed of [200,300]){
    const startX=base+from.x+from.width/2+23-320,edgeX=base+from.x+from.width/2+23,edgeMs=(edgeX-startX)/speed*1000;
    const sourceTop=from.top,actorTop=sourceTop-30,actorBottom=sourceTop+30,targetLeft=base+to.x-to.width/2,targetRight=base+to.x+to.width/2,targetBottom=to.top+20,worldTop=sourceTop-285;
    let firstFit:number|null=null;
    for(let elapsed=0;elapsed<=edgeMs+1e-6;elapsed+=1000/fps){
     const actorX=startX+speed*elapsed/1000,worldLeft=actorX-320,usable=Math.min(worldLeft+640,targetRight)-Math.max(worldLeft,targetLeft),screenActorTop=(actorTop-worldTop)/400*400,screenActorBottom=(actorBottom-worldTop)/400*400,screenTargetBottom=(targetBottom-worldTop)/400*400;
     if(firstFit===null&&usable>=56&&screenActorTop>=120&&screenActorBottom<=370&&screenTargetBottom<=370)firstFit=elapsed;
    }
    expect(firstFit,`room 9 step 0 to 1 speed ${speed} ${fps}Hz`).not.toBeNull();
    expect(edgeMs-(firstFit??edgeMs),`normal-camera visibility lead at ${speed} ${fps}Hz`).toBeGreaterThanOrEqual(300);
   }
  }
 });
 it('forecasts every authored lower Furnace step pair from the actual platform bodies',()=>{
  const surfaces:PredictSurface[]=[];for(let room=0;room<FURNACE_ROOMS.length;room++){const r=FURNACE_ROOMS[room]!,base=room*FURNACE_ROOM_WIDTH;surfaces.push({id:`furnace:${room}:-1`,room,left:base,right:base+192,top:r.entryTop,bottom:r.entryTop+64,enabled:true},{id:`furnace:${room}:-2`,room,left:base+1396-44,right:base+1440,top:r.exitTop,bottom:r.exitTop+64,enabled:true});for(let step=0;step<r.steps.length;step++){const p=r.steps[step]!;surfaces.push({id:`furnace:${room}:${step}`,room,left:base+p.x-p.width/2,right:base+p.x+p.width/2,top:p.top,bottom:p.top+48,enabled:true});}}
  const failures:string[]=[],categories:{landing:number;none:number;danger:number;other:number}={landing:0,none:0,danger:0,other:0};let linksAudited=0;for(let room=0;room<FURNACE_ROOMS.length;room++){const r=FURNACE_ROOMS[room]!;for(let step=0;step<r.steps.length-1;step++){const from=r.steps[step]!,to=r.steps[step+1]!;if(to.top-from.top<=48)continue;linksAudited++;const source=surfaces.find(s=>s.id===`furnace:${room}:${step}`)!,direction=to.x>=from.x?1 as const:-1 as const,x=direction>0?Math.max(source.left+23,Math.min(source.right-23,source.right+23-220)):Math.max(source.left+23,Math.min(source.right-23,source.left-23+220)),y=source.top-20,near=surfaces.filter(s=>Math.abs(s.room-room)<=1),input={x,y,vx:direction*200,vy:0,halfWidth:23,halfHeight:20,grounded:true,supportId:source.id,horizontal:direction,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces:near,hazards:[]},result:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};predictDescent(input,result);categories[result.state==='landing'?'landing':result.state==='none'?'none':result.state==='danger'?'danger':'other']++;if(result.state!=='landing'||!result.targetId){failures.push(`${room}/${step}:category=${result.state};source=${source.id};target=${result.targetId??'-'}`);continue;}const target=near.find(s=>s.id===result.targetId);if(!target||target.id!==`furnace:${room}:${step+1}`||target.top<=source.top+32){failures.push(`${room}/${step}:first interception ${result.targetId??'-'}, expected furnace:${room}:${step+1}`);continue;}const fit=descentCameraTarget({x:result.actorX-320,width:640,y:-160,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,boundsTop:-700,boundsBottom:700},{actorTop:result.actorY-30,actorBottom:result.actorY+30,targetBottom:target.top+20,targetLeft:target.left,targetRight:target.right});if(!fit.visible)failures.push(`${room}/${step}:projection`);}}
  expect(failures).toEqual([]);expect(linksAudited).toBe(15);expect(categories).toEqual({landing:15,none:0,danger:0,other:0});
 });
});
