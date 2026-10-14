import {describe,expect,it} from 'vitest';
import {chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';
import {predictDescent,type DescentPrediction,type PredictHazard,type PredictSurface} from '../src/systems/descentPrediction';
import {descentCameraTarget} from '../src/systems/predictiveDescentCamera';
import {JAIL_ROOMS} from '../src/data/qualityRooms';
import {DESCENT_PREDICTION} from '../src/systems/descentPrediction';

const platforms=chapterPlatforms('jail');
const surfaces:PredictSurface[]=platforms.map((p,index)=>({id:`r${p.room}:${p.role}:${p.step??index}`,room:p.room??Math.floor(p.x/SECTION_WIDTH),left:p.x-p.width/2,right:p.x+p.width/2,top:p.role==='floor'?JAIL_ROOMS[p.room??0]!.floor:p.y-p.height/2,bottom:p.role==='floor'?1840:p.y+p.height/2,enabled:true}));
const hazards:PredictHazard[]=JAIL_ROOMS.flatMap((room,roomIndex)=>{
 const out:PredictHazard[]=[],bed=1820;let edge=0;
 for(const[a,b]of room.intervals){if(a>edge)out.push({id:`pit-${roomIndex}-${edge}`,left:roomIndex*SECTION_WIDTH+edge,right:roomIndex*SECTION_WIDTH+a,top:0,bottom:bed,active:true,kind:'pit'});edge=b;}
 if(edge<1440)out.push({id:`pit-${roomIndex}-${edge}`,left:roomIndex*SECTION_WIDTH+edge,right:(roomIndex+1)*SECTION_WIDTH,top:0,bottom:bed,active:true,kind:'pit'});
 room.spikes.forEach((spike,index)=>{const x=roomIndex*SECTION_WIDTH+spike.x,support=platforms.find(surface=>surface.room===roomIndex&&(spike.support==='floor'?surface.role==='floor'&&x>=surface.x-surface.width/2&&x<=surface.x+surface.width/2:surface.role==='ledge'&&surface.step===spike.support)),top=support?(support.role==='floor'?room.floor:support.y-support.height/2):room.floor;out.push({id:`spike-${roomIndex}-${index}`,left:x-36,right:x+36,top:top-10,bottom:top+10,active:true,kind:'spike'});});
 return out;
});
const routes:[number,number,number,'ledge'|'floor',number?][]=[
 [7,2,7,'ledge',3],[7,3,7,'ledge',4],[7,4,8,'ledge',0],
 [8,0,8,'ledge',1],[8,1,8,'ledge',2],[8,2,8,'ledge',3],[8,3,8,'ledge',4],[8,4,9,'floor'],
 [9,0,9,'ledge',1],[9,1,9,'ledge',2],[9,2,9,'ledge',3],[9,3,9,'ledge',4],[9,4,10,'floor'],
 [10,0,10,'ledge',1],[10,1,10,'ledge',2],[10,2,10,'ledge',3],[10,3,10,'ledge',4],[10,4,11,'floor'],
] as const;

describe('authored Jail descent route predictions',()=>{
  it.each(routes)('audits projected room %i step %i route to room %i %s %i', (fromRoom,fromStep,toRoom,toRole,toStep)=>{
    const from=platforms.find(p=>p.room===fromRoom&&p.role==='ledge'&&p.step===fromStep)!;
    const target=platforms.find(p=>p.room===toRoom&&p.role===toRole&&(toRole==='floor'||p.step===toStep))!;
    const approach=Math.max(DESCENT_PREDICTION.approachMin,Math.min(DESCENT_PREDICTION.approachMax,200*DESCENT_PREDICTION.approachSeconds)),x=from.x+from.width/2+23-approach,y=from.y-from.height/2-20,nearby=surfaces.filter(s=>Math.abs(s.room-fromRoom)<=1);
    const input={x,y,vx:200,vy:0,halfWidth:23,halfHeight:20,grounded:true,supportId:`r${fromRoom}:ledge:${fromStep}`,horizontal:1 as const,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces:nearby,hazards:hazards.filter(h=>Math.abs(Math.floor(h.left/SECTION_WIDTH)-fromRoom)<=1)};
    const result:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};predictDescent(input,result);
    if(fromRoom===10&&fromStep===4){expect(result.state).toBe('none');return;}
    expect(result.state,`${fromRoom}/${fromStep} predicted ${result.targetId??result.state} at x=${result.actorX.toFixed(1)} y=${result.actorY.toFixed(1)}`).toBe('landing');
    const targetIndex=platforms.indexOf(target),targetId=`r${toRoom}:${toRole}:${target.step??targetIndex}`;
    expect(result.targetId).toBe(targetId);
    expect(result.targetY).toBe(target.role==='floor'?JAIL_ROOMS[toRoom]!.floor:target.y-target.height/2);
    const targetSurface=nearby.find(surface=>surface.id===result.targetId)!;
    const frame={actorTop:y-30,actorBottom:y+30,targetBottom:Math.max(result.targetY+20,result.risk?result.riskBottom??result.targetY+20:result.targetY+20),targetLeft:targetSurface.left,targetRight:targetSurface.right,hazardLeft:result.risk?result.riskLeft:undefined,hazardRight:result.risk?result.riskRight:undefined};
    const camera=descentCameraTarget({x:x-320,width:640,y:-160,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,followTargetY:y,deadzoneHeight:130,boundsTop:-160,boundsBottom:1840},frame);
    const worldHeight=400/camera.zoomRatio,projectedTop=y-(camera.offsetY+worldHeight/2+65),actorTop=(frame.actorTop-projectedTop)/worldHeight*400,actorBottom=(frame.actorBottom-projectedTop)/worldHeight*400,targetBottom=(frame.targetBottom!-projectedTop)/worldHeight*400;
    expect(actorTop,`${fromRoom}/${fromStep} actor top misses accepted band at zoom ${camera.zoomRatio}`).toBeGreaterThanOrEqual(120);
    expect(actorBottom,`${fromRoom}/${fromStep} actor bottom misses accepted band at zoom ${camera.zoomRatio}`).toBeLessThanOrEqual(370);
    expect(targetBottom,`${fromRoom}/${fromStep} target ${result.targetId} misses accepted band at zoom ${camera.zoomRatio}`).toBeLessThanOrEqual(370);
  });
  it('flags the authored room 8 spike landing instead of presenting it as safe',()=>{
    const from=platforms.find(p=>p.room===8&&p.role==='ledge'&&p.step===2)!,target=platforms.find(p=>p.room===8&&p.role==='ledge'&&p.step===3)!;
    const spike=JAIL_ROOMS[8]!.spikes.find(value=>typeof value!=='number'&&value.support===3)! as {x:number;support:number};
    const approach=Math.max(DESCENT_PREDICTION.approachMin,Math.min(DESCENT_PREDICTION.approachMax,200*DESCENT_PREDICTION.approachSeconds)),x=from.x+from.width/2+23-approach,y=from.y-from.height/2-20,nearby=surfaces.filter(s=>Math.abs(s.room-8)<=1),spikeX=8*SECTION_WIDTH+spike.x,top=target.y-target.height/2;
    const input={x,y,vx:200,vy:0,halfWidth:23,halfHeight:20,grounded:true,supportId:'r8:ledge:2',horizontal:1 as const,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces:nearby,hazards:[{id:'room8-spike-3',left:spikeX-36,right:spikeX+36,top:top-10,bottom:top+10,active:true,kind:'spike' as const}]};
    const result:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};predictDescent(input,result);
    expect(result.targetId).toBe('r8:ledge:3');expect(result.risk).toBe(true);expect(result.riskKind).toBe('spike');
  });
});
