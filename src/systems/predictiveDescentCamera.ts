import type {DescentPrediction} from './descentPrediction';

export interface DescentCameraView {x?:number;width?:number;y:number;height:number;logicalHeight:number;baseZoom:number;zoom:number;offsetY:number;followTargetY?:number;deadzoneHeight?:number;boundsTop?:number;boundsBottom?:number;}
export interface DescentCameraFrame {actorTop:number;actorBottom:number;targetBottom:number|null;targetLeft?:number;targetRight?:number;hazardLeft?:number;hazardRight?:number;}
export interface DescentCameraValue {zoomRatio:number;offsetY:number;visible:boolean;}
export interface DescentCameraStatus extends DescentCameraValue {state:'normal'|'approach'|'framing'|'returning'|'suspended'|'boss';targetId?:string;targetX?:number;targetY?:number;risk:boolean;riskKind?:string;riskLeft?:number;riskRight?:number;riskTop?:number;riskBottom?:number;}

export const DESCENT_CAMERA={safeTop:120,safeBottom:370,fitInset:20,actorScreenY:164,minZoomRatio:.80,fitZoomRatio:.85,activeResponseMs:200,returnResponseMs:350,maxDeltaMs:50,invalidHysteresisMs:150} as const;
const ZOOM_CANDIDATES=[1,DESCENT_CAMERA.fitZoomRatio,DESCENT_CAMERA.minZoomRatio] as const;

/** Fit actor and predicted landing into the safe camera band using the live camera projection. */
export function descentCameraTargetInto(view:DescentCameraView,frame:DescentCameraFrame,out:DescentCameraValue):DescentCameraValue {
  const range=DESCENT_CAMERA,baseHeight=view.height*(view.zoom/view.baseZoom),deadzoneHeight=view.deadzoneHeight??0,followTargetY=view.followTargetY??view.y+view.offsetY+baseHeight/2+deadzoneHeight/2,baseTop=followTargetY-baseHeight/2-deadzoneHeight/2;
  const targetBottom=frame.targetBottom??frame.actorBottom, desiredActorScreen=range.actorScreenY;
  const baseWidth=view.width===undefined?undefined:view.width*(view.zoom/view.baseZoom),centerX=view.x===undefined||view.width===undefined?undefined:view.x+view.width/2;
  let zoomRatio:number=range.minZoomRatio,desiredTop=baseTop,clampedTop=baseTop,feasible=false;
  for(const ratio of ZOOM_CANDIDATES){
    const worldHeight=baseHeight/ratio,marginTop=(range.safeTop+range.fitInset)/view.logicalHeight*worldHeight,marginBottom=(range.safeBottom-range.fitInset)/view.logicalHeight*worldHeight;
    const feasibleMin=Math.max(frame.actorBottom-marginBottom,targetBottom-marginBottom),feasibleMax=frame.actorTop-marginTop;
    const boundsMin=view.boundsTop??-Infinity,boundsMax=view.boundsBottom===undefined?Infinity:Math.max(boundsMin,view.boundsBottom-worldHeight);
    const minTop=Math.max(feasibleMin,boundsMin),maxTop=Math.min(feasibleMax,boundsMax);
    const candidateWidth=baseWidth===undefined?undefined:baseWidth/ratio,candidateLeft=centerX===undefined||candidateWidth===undefined?undefined:centerX-candidateWidth/2;
    const visiblePixels=(left:number,right:number)=>{
      if(candidateLeft===undefined||candidateWidth===undefined)return Infinity;
      const overlap=Math.max(0,Math.min(candidateLeft+candidateWidth,right)-Math.max(candidateLeft,left));
      return overlap/candidateWidth*view.logicalHeight*(view.width===undefined?1:view.width/view.height);
    };
    const candidateUsable=frame.targetLeft===undefined||frame.targetRight===undefined||visiblePixels(frame.targetLeft,frame.targetRight)>=56;
    const candidateHazard=frame.hazardLeft===undefined||frame.hazardRight===undefined||visiblePixels(frame.hazardLeft,frame.hazardRight)>0;
    if(minTop<=maxTop&&candidateUsable&&candidateHazard){zoomRatio=ratio;desiredTop=frame.actorTop-(desiredActorScreen/view.logicalHeight)*worldHeight;clampedTop=Math.max(minTop,Math.min(maxTop,desiredTop));feasible=true;break;}
  }
  const candidateWidth=baseWidth===undefined?undefined:baseWidth/zoomRatio,candidateLeft=centerX===undefined||candidateWidth===undefined?undefined:centerX-candidateWidth/2;
  const visiblePixels=(left:number,right:number)=>{if(candidateLeft===undefined||candidateWidth===undefined)return Infinity;return Math.max(0,Math.min(candidateLeft+candidateWidth,right)-Math.max(candidateLeft,left))/candidateWidth*view.logicalHeight*(view.width===undefined?1:view.width/view.height);};
  const usable=frame.targetLeft===undefined||frame.targetRight===undefined||visiblePixels(frame.targetLeft,frame.targetRight)>=56,hazardVisible=frame.hazardLeft===undefined||frame.hazardRight===undefined||visiblePixels(frame.hazardLeft,frame.hazardRight)>0;
  const visible=feasible&&usable&&hazardVisible;
  out.zoomRatio=zoomRatio;out.offsetY=followTargetY-(clampedTop+baseHeight/zoomRatio/2)-deadzoneHeight/2;out.visible=visible;return out;
}
export function descentCameraTarget(view:DescentCameraView,frame:DescentCameraFrame):DescentCameraValue{return descentCameraTargetInto(view,frame,{zoomRatio:1,offsetY:0,visible:true});}

/** Stateful blend with pause/resume invalidation; NORMAL is intentionally a camera no-op. */
export class PredictiveDescentCamera {
  owner:'traversal'|'boss'='traversal';
  zoomRatio=1;offsetY=0;visible=true;state:DescentCameraStatus['state']='normal';targetId?:string;targetX?:number;targetY?:number;risk=false;riskKind?:string;riskLeft?:number;riskRight?:number;riskTop?:number;riskBottom?:number;
  private readonly statusValue:DescentCameraStatus={zoomRatio:1,offsetY:0,visible:true,state:'normal',risk:false};
  private readonly targetValue:DescentCameraValue={zoomRatio:1,offsetY:0,visible:true};
  private invalidMs=0;private suspended=false;private destroyed=false;private hasCachedTarget=false;private discardResumeDelta=false;
  private cachedTarget:{id?:string;x:number;y:number;risk:boolean;riskKind?:string;targetBottom:number|null;targetLeft?:number;targetRight?:number;hazardLeft?:number;hazardRight?:number}={x:0,y:0,risk:false,targetBottom:null};
  private readonly cachedFrame:DescentCameraFrame={actorTop:0,actorBottom:0,targetBottom:null};
  setOwner(owner:'traversal'|'boss'):void{this.owner=owner;}
  invalidate():void{this.invalidMs=DESCENT_CAMERA.invalidHysteresisMs+1;}
  reset():void{this.zoomRatio=1;this.offsetY=0;this.visible=true;this.state='normal';this.targetId=undefined;this.targetX=this.targetY=undefined;this.risk=false;this.riskKind=undefined;this.riskLeft=this.riskRight=this.riskTop=this.riskBottom=undefined;this.invalidMs=0;this.suspended=false;this.hasCachedTarget=false;this.discardResumeDelta=false;}
  suspend():void{this.suspended=true;}
  resume():void{if(this.suspended){this.suspended=false;this.invalidMs=0;this.discardResumeDelta=true;}}
  destroy():void{this.destroyed=true;this.reset();}
  statusForRig(state:'boss'|'suspended'):DescentCameraStatus{this.state=state;return this.status();}
  update(prediction:DescentPrediction,view:DescentCameraView,frame:DescentCameraFrame,deltaMs:number,active:boolean,alive:boolean):DescentCameraStatus {
    if(this.destroyed||this.owner==='boss'){this.state='boss';return this.status();}
    if(!active||!alive||this.suspended){this.suspended=true;this.state='suspended';return this.status();}
    const dt=this.discardResumeDelta?0:Math.max(0,Math.min(DESCENT_CAMERA.maxDeltaMs,deltaMs));this.discardResumeDelta=false;this.suspended=false;
    const invalid=prediction.state==='none'||prediction.state==='approach';
    if(invalid)this.invalidMs+=dt;else{this.invalidMs=0;this.targetId=prediction.targetId;this.targetX=prediction.targetX;this.targetY=prediction.targetY;this.risk=prediction.risk;this.riskKind=prediction.riskKind;this.riskLeft=prediction.riskLeft;this.riskRight=prediction.riskRight;this.riskTop=prediction.riskTop;this.riskBottom=prediction.riskBottom;this.hasCachedTarget=true;this.cachedTarget.id=prediction.targetId;this.cachedTarget.x=prediction.targetX;this.cachedTarget.y=prediction.targetY;this.cachedTarget.risk=prediction.risk;this.cachedTarget.riskKind=prediction.riskKind;this.cachedTarget.targetBottom=frame.targetBottom;this.cachedTarget.targetLeft=frame.targetLeft;this.cachedTarget.targetRight=frame.targetRight;this.cachedTarget.hazardLeft=frame.hazardLeft;this.cachedTarget.hazardRight=frame.hazardRight;this.cachedFrame.actorTop=frame.actorTop;this.cachedFrame.actorBottom=frame.actorBottom;this.cachedFrame.targetBottom=frame.targetBottom;this.cachedFrame.targetLeft=frame.targetLeft;this.cachedFrame.targetRight=frame.targetRight;this.cachedFrame.hazardLeft=frame.hazardLeft;this.cachedFrame.hazardRight=frame.hazardRight;}
    const returnHome=invalid&&this.invalidMs>DESCENT_CAMERA.invalidHysteresisMs;
    let target:DescentCameraValue;
    if(returnHome){target=this.targetValue;target.zoomRatio=1;target.offsetY=0;target.visible=true;}
    else if(invalid&&(!this.hasCachedTarget||this.invalidMs===dt)){this.state=this.zoomRatio===1&&this.offsetY===0?'approach':'framing';return this.status();}
    else if(invalid){const cached=this.cachedTarget,cachedFrame=this.cachedFrame;cachedFrame.actorTop=frame.actorTop;cachedFrame.actorBottom=frame.actorBottom;target=descentCameraTargetInto(view,cachedFrame,this.targetValue);}
    else target=descentCameraTargetInto(view,frame,this.targetValue);
    const response=returnHome?DESCENT_CAMERA.returnResponseMs:DESCENT_CAMERA.activeResponseMs,alpha=1-Math.exp(-dt/response);
    this.zoomRatio+=(target.zoomRatio-this.zoomRatio)*alpha;this.offsetY+=(target.offsetY-this.offsetY)*alpha;this.visible=target.visible;
    if(returnHome&&Math.abs(this.zoomRatio-1)<.001&&Math.abs(this.offsetY)<.5){this.zoomRatio=1;this.offsetY=0;this.state='normal';this.targetId=undefined;this.targetX=undefined;this.targetY=undefined;this.risk=false;this.riskKind=undefined;this.riskLeft=this.riskRight=this.riskTop=this.riskBottom=undefined;this.hasCachedTarget=false;}
    else this.state=returnHome?'returning':'framing';
    return this.status();
  }
  private status():DescentCameraStatus{const value=this.statusValue;value.zoomRatio=this.zoomRatio;value.offsetY=this.offsetY;value.visible=this.visible;value.state=this.state;value.targetId=this.targetId;value.targetX=this.targetX;value.targetY=this.targetY;value.risk=this.risk;value.riskKind=this.riskKind;value.riskLeft=this.riskLeft;value.riskRight=this.riskRight;value.riskTop=this.riskTop;value.riskBottom=this.riskBottom;return value;}
}
