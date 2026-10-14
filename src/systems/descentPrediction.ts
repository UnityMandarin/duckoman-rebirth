export interface PredictSurface {
  id:string;room:number;left:number;right:number;top:number;bottom:number;enabled:boolean;landing?:boolean;
  motion?:{axis:'x'|'y';base:number;phase:number;clockMs:number};
}
export interface PredictHazard {id:string;left:number;right:number;top:number;bottom:number;active:boolean;kind:'spike'|'press'|'pit';}
export function predictedSurfaceMotionOffset(motion:PredictSurface['motion'],elapsedMs=0):number{return motion?Math.sin((motion.clockMs+elapsedMs)/950+motion.phase)*65:0;}
export interface DescentPredictionInput {
  x:number;y:number;vx:number;vy:number;halfWidth:number;halfHeight:number;grounded:boolean;supportId?:string;
  horizontal:-1|0|1;sprint:boolean;jumpAvailable:boolean;dashing:boolean;dashRemainingMs:number;gravity:number;maxFall:number;
  runSpeed:number;sprintSpeed:number;horizontalDrift?:number;windDirection?:-1|0|1;windStrength?:number;windDrift?:number;surfaces:readonly PredictSurface[];hazards:readonly PredictHazard[];
}
export interface DescentPrediction {
  state:'none'|'approach'|'falling'|'landing'|'danger';targetId?:string;targetX:number;targetY:number;
  interceptMs:number;actorX:number;actorY:number;risk:boolean;riskKind?:PredictHazard['kind'];riskLeft?:number;riskRight?:number;riskTop?:number;riskBottom?:number;
}

export const DESCENT_PREDICTION={maxMs:1250,stepMs:1000/60,approachMin:160,approachMax:320,approachSeconds:1.1,hysteresisMs:150} as const;

export function resetDescentPrediction(out:DescentPrediction):void {
  out.state='none';out.targetId=undefined;out.targetX=0;out.targetY=0;out.interceptMs=0;out.actorX=0;out.actorY=0;out.risk=false;out.riskKind=undefined;out.riskLeft=out.riskRight=out.riskTop=out.riskBottom=undefined;
}

function overlaps(ax:number,ay:number,halfWidth:number,halfHeight:number,left:number,right:number,top:number,bottom:number):boolean {
  return ax+halfWidth>left&&ax-halfWidth<right&&ay+halfHeight>top&&ay-halfHeight<bottom;
}

interface BranchResult {landed:boolean;blocked:boolean;id?:string;x:number;y:number;landY:number;ms:number;risk:boolean;riskKind?:PredictHazard['kind'];riskLeft?:number;riskRight?:number;riskTop?:number;riskBottom?:number;}

function simulateBranch(input:DescentPredictionInput,out:BranchResult,startX:number,startY:number,startVy:number,startSupport?:string):void {
  let x=startX,y=startY,baseVx=input.grounded?input.horizontal*(input.sprint?input.sprintSpeed:input.runSpeed)+(input.horizontalDrift??0):input.vx-(input.windDrift??0),windDrift=input.grounded?0:input.windDrift??0,vx=baseVx+windDrift,vy=startVy;
  const dashing=input.dashing,step=DESCENT_PREDICTION.stepMs/1000;
  out.landed=false;out.blocked=false;out.id=undefined;out.x=x;out.y=y;out.landY=0;out.ms=DESCENT_PREDICTION.maxMs;out.risk=false;out.riskKind=undefined;out.riskLeft=out.riskRight=out.riskTop=out.riskBottom=undefined;
  for(let frame=1;frame<=75;frame++){
    const ms=frame*DESCENT_PREDICTION.stepMs,oldX=x,oldY=y,oldBottom=y+input.halfHeight;
    if(input.grounded)baseVx=input.horizontal*(input.sprint?input.sprintSpeed:input.runSpeed)+(input.horizontalDrift??0);
    const dashActive=dashing&&ms<input.dashRemainingMs;
    if(dashActive)vy=0;
    else{vy=Math.min(input.maxFall,vy+input.gravity*step);if(input.windDirection)windDrift=Math.max(-170,Math.min(170,windDrift+input.windDirection*(input.windStrength??0)*step));}
    vx=baseVx+windDrift;
    let nextX=x+vx*step,nextY=y+vy*step;
    let ceiling=Infinity,landSurface:PredictSurface|undefined,landTop=Infinity;
    // Sweep head-on into solid ledge undersides; horizontal walls stop the forecast branch.
    for(const surface of input.surfaces){
      if(!surface.enabled||surface.id===startSupport)continue;
      const wave=predictedSurfaceMotionOffset(surface.motion,ms),
        dx=surface.motion?.axis==='x'?wave:0,dy=surface.motion?.axis==='y'?wave:0,
        left=surface.left+dx,right=surface.right+dx,top=surface.top+dy,bottom=surface.bottom+dy;
      if(vy<0&&oldY-input.halfHeight>=bottom&&nextY-input.halfHeight<=bottom&&nextX+input.halfWidth>left&&nextX-input.halfWidth<right)ceiling=Math.min(ceiling,bottom+input.halfHeight);
      if(surface.landing!==false&&nextX+input.halfWidth>left&&nextX-input.halfWidth<right&&nextY+input.halfHeight>top&&nextY+input.halfHeight<bottom&&oldY+input.halfHeight<=top+2&&vy>=0&&top<landTop){landTop=top;landSurface=surface;}
      if(nextX+input.halfWidth>left&&nextX-input.halfWidth<right&&nextY+input.halfHeight>top&&nextY-input.halfHeight<bottom&&oldY-input.halfHeight>=bottom-2&&vy<0){
        nextY=bottom+input.halfHeight;vy=0;
      }
      if(overlaps(nextX,nextY,input.halfWidth,input.halfHeight,left,right,top,bottom)&&oldX+input.halfWidth<=left&&vx>0){nextX=left-input.halfWidth;out.blocked=true;}
      else if(overlaps(nextX,nextY,input.halfWidth,input.halfHeight,left,right,top,bottom)&&oldX-input.halfWidth>=right&&vx<0){nextX=right+input.halfWidth;out.blocked=true;}
    }
    if(landSurface){nextY=landTop-input.halfHeight;vy=0;out.landed=true;out.id=landSurface.id;out.x=nextX;out.landY=landTop;out.ms=ms;}
    if(ceiling<Infinity)nextY=Math.max(nextY,ceiling);
    x=nextX;y=nextY;out.x=x;out.y=y;out.ms=ms;
    for(const hazard of input.hazards){
      const hit=hazard.kind==='pit'?x+input.halfWidth>hazard.left&&x-input.halfWidth<hazard.right&&y+input.halfHeight>=hazard.bottom:overlaps(x,y,input.halfWidth,input.halfHeight,hazard.left,hazard.right,hazard.top,hazard.bottom);
      if(!hazard.active||!hit)continue;
      out.risk=true;out.riskKind=hazard.kind;out.riskLeft=hazard.left;out.riskRight=hazard.right;out.riskTop=hazard.top;out.riskBottom=hazard.bottom;break;
    }
    if(out.landed||out.blocked)return;
  }
}

/** Predict the earliest reachable downward interception from an actual edge or airborne state. */
function predictDescentWithScratch(input:DescentPredictionInput,out:DescentPrediction,best:BranchResult,branch:BranchResult):DescentPrediction {
  resetDescentPrediction(out);
  best.landed=false;best.id=undefined;best.ms=Infinity;best.risk=false;best.riskKind=undefined;
  let startX=input.x,startY=input.y,startVy=input.vy,startSupport:string|undefined;
  let jumpBranch=false;
  // Scene setup can leave the player a few pixels above a nearby spawn ledge for one physics step.
  // Treat that low-speed settling frame as neutral; real falls, movement, and dashes still predict.
  if(!input.grounded&&input.horizontal===0&&!input.dashing&&input.vy>=0&&input.vy<=60){
    const feet=input.y+input.halfHeight;
    for(const surface of input.surfaces){
      if(!surface.enabled||surface.landing===false||input.x+input.halfWidth<=surface.left||input.x-input.halfWidth>=surface.right)continue;
      const top=surface.top+predictedSurfaceMotionOffset(surface.motion);
      const gap=top-feet;
      if(gap>=-2&&gap<=32)return out;
    }
  }
  if(input.grounded){
    let support=input.supportId?input.surfaces.find(surface=>surface.id===input.supportId&&surface.enabled&&input.x+input.halfWidth>surface.left&&input.x-input.halfWidth<surface.right&&Math.abs(input.y+input.halfHeight-surface.top)<=10):undefined;
    if(!support)for(const surface of input.surfaces){if(!surface.enabled||input.x+input.halfWidth<=surface.left||input.x-input.halfWidth>=surface.right||Math.abs(input.y+input.halfHeight-surface.top)>10)continue;if(!support||surface.top<support.top)support=surface;}
    if(!support)return out;
    startSupport=support.id;
    const drift=input.horizontalDrift??0,direction=input.horizontal!==0?input.horizontal:Math.abs(drift)>8?(drift>0?1:-1):0;
    if(direction===0)return out;
    const speed=input.horizontal===0?drift:direction*(input.sprint?input.sprintSpeed:input.runSpeed),approach=Math.max(DESCENT_PREDICTION.approachMin,Math.min(DESCENT_PREDICTION.approachMax,Math.abs(speed)*DESCENT_PREDICTION.approachSeconds));
    const edge=direction>0?support.right+input.halfWidth:support.left-input.halfWidth,dist=(edge-input.x)*direction;
    if(dist>approach){out.state='approach';out.actorX=input.x+direction*approach;out.actorY=input.y;return out;}
    startX=edge;startY=support.top-input.halfHeight;startSupport=support.id;jumpBranch=input.jumpAvailable;
  }
  if(!input.grounded)out.state='falling';
  simulateBranch(input,branch,startX,startY,startVy,startSupport);
  Object.assign(best,branch);
  if(jumpBranch){
    simulateBranch(input,branch,startX,startY,-600,startSupport);
    if(branch.landed&&(!best.landed||branch.ms<best.ms||branch.ms===best.ms&&(branch.id??'')<(best.id??'')))Object.assign(best,branch);
  }
  if(!best.landed&&input.grounded&&best.blocked)return out;
  if(best.landed){if(input.grounded){const support=input.surfaces.find(surface=>surface.id===startSupport);if(support&&best.landY<=support.top+32)return out;}
    out.state='landing';out.targetId=best.id;out.targetX=best.x;out.targetY=best.landY;out.interceptMs=best.ms;out.actorX=best.x;out.actorY=best.y;out.risk=best.risk;out.riskKind=best.riskKind;out.riskLeft=best.riskLeft;out.riskRight=best.riskRight;out.riskTop=best.riskTop;out.riskBottom=best.riskBottom;return out;}
  out.state='danger';out.actorX=best.x;out.actorY=best.y;out.interceptMs=DESCENT_PREDICTION.maxMs;out.risk=best.risk;out.riskKind=best.riskKind;out.riskLeft=best.riskLeft;out.riskRight=best.riskRight;out.riskTop=best.riskTop;out.riskBottom=best.riskBottom;
  return out;
}

const freshBranch=():BranchResult=>({landed:false,blocked:false,x:0,y:0,landY:0,ms:Infinity,risk:false});
/** Convenience pure entry point for tests and one-off forecasts. */
export function predictDescent(input:DescentPredictionInput,out:DescentPrediction):DescentPrediction {
  return predictDescentWithScratch(input,out,freshBranch(),freshBranch());
}
/** Reusable runtime predictor; branch records stay allocated across scene frames. */
export class DescentPredictor {
  private readonly best=freshBranch();private readonly branch=freshBranch();
  predict(input:DescentPredictionInput,out:DescentPrediction):DescentPrediction{return predictDescentWithScratch(input,out,this.best,this.branch);}
}
