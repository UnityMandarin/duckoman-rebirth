import Phaser from 'phaser';
import {TUNING} from '../config/tuning';
import {renderScale} from './renderScale';
import {DescentPredictor,type DescentPrediction,type DescentPredictionInput,resetDescentPrediction} from './descentPrediction';
import {PredictiveDescentCamera,DESCENT_CAMERA,type DescentCameraFrame,type DescentCameraStatus,type DescentCameraView} from './predictiveDescentCamera';

/** Keep no-landing danger forecasts within the farthest .80-zoom safe band. */
export function dangerLookaheadBottom(view:DescentCameraView,actorTop:number):number {
 const height=view.height*(view.zoom/view.baseZoom)/DESCENT_CAMERA.minZoomRatio;
 return actorTop+Math.max(0,(DESCENT_CAMERA.safeBottom-DESCENT_CAMERA.actorScreenY)/view.logicalHeight*height);
}
export function traversalCameraOwner(bossExists:boolean,bossOwnsCamera:boolean):'traversal'|'boss'{return bossExists&&bossOwnsCamera?'boss':'traversal';}

/** Shared prediction and main-camera adapter. Scene adapters supply their live surfaces and hazards. */
export class TraversalCameraRig {
 readonly camera:PredictiveDescentCamera;
 readonly prediction:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};
 private readonly predictor=new DescentPredictor();
 private readonly projection:DescentCameraView={y:0,height:400,logicalHeight:TUNING.simulation.height,baseZoom:1,zoom:1,offsetY:0,followTargetY:0,deadzoneHeight:0};
 private readonly frame:DescentCameraFrame={actorTop:0,actorBottom:0,targetBottom:null};
 private readonly bounds=new Phaser.Geom.Rectangle();
 private suspended=false;
 constructor(private readonly scene:Phaser.Scene,private readonly main:Phaser.Cameras.Scene2D.Camera,controller=new PredictiveDescentCamera()) {this.camera=controller;}
 update(input:DescentPredictionInput,frame:DescentCameraFrame,delta:number,owner:'traversal'|'boss',active:boolean,alive:boolean):DescentCameraStatus {
  const c=this.main;
  // Ownership and lifecycle gates must run before prediction. In particular, a
  // boss owns the camera's entire transform while its encounter is active.
  if(owner==='boss') {this.camera.setOwner('boss');this.suspended=false;return this.camera.statusForRig('boss');}
  if(!active||!alive){this.camera.suspend();this.suspended=true;return this.camera.statusForRig('suspended');}
  if(this.camera.owner==='boss')this.camera.reset();
  this.camera.setOwner('traversal');
  if(this.suspended){this.camera.resume();this.suspended=false;}
  resetDescentPrediction(this.prediction);this.predictor.predict(input,this.prediction);
  if(input.vy<-80){this.camera.invalidate();this.prediction.state='approach';this.prediction.targetId=undefined;this.prediction.risk=false;}
  const view=c.worldView;if(view.width<=0||view.height<=0)return this.camera.update(this.prediction,this.projection,this.frame,delta,active,alive);
  let targetBottom:number|null=null;
  if(this.prediction.state==='landing')targetBottom=Math.max(this.prediction.targetY+20,this.prediction.risk?this.prediction.riskBottom??this.prediction.targetY+20:this.prediction.targetY+20);
  else if(this.prediction.state==='danger'){
   targetBottom=dangerLookaheadBottom({y:view.y,height:view.height,logicalHeight:TUNING.simulation.height,baseZoom:renderScale(),zoom:c.zoomY,offsetY:c.followOffset.y},frame.actorTop);
  }
  let target:DescentPredictionInput['surfaces'][number]|undefined;for(const surface of input.surfaces)if(surface.id===this.prediction.targetId){target=surface;break;}
  const p=this.projection,bounds=c.getBounds(this.bounds),f=this.frame;
  f.actorTop=frame.actorTop;f.actorBottom=frame.actorBottom;f.targetBottom=targetBottom;f.targetLeft=target?.left;f.targetRight=target?.right;f.hazardLeft=this.prediction.risk?this.prediction.riskLeft:undefined;f.hazardRight=this.prediction.risk?this.prediction.riskRight:undefined;
  p.x=view.x;p.width=view.width;p.y=view.y;p.height=view.height;p.baseZoom=renderScale();p.zoom=c.zoomY;p.offsetY=c.followOffset.y;p.followTargetY=input.y;p.deadzoneHeight=c.deadzone?.height??0;p.boundsTop=c.useBounds?bounds.top:undefined;p.boundsBottom=c.useBounds?bounds.bottom:undefined;
  const status=this.camera.update(this.prediction,p,f,delta,active,alive);this.apply(status,p.baseZoom);
  return status;
 }
 neutralize(delta:number,active:boolean,alive:boolean):DescentCameraStatus {
  if(!active||!alive)return this.camera.statusForRig('suspended');
  if(this.camera.owner==='boss')this.camera.reset();this.camera.setOwner('traversal');
  resetDescentPrediction(this.prediction);this.prediction.state='none';const status=this.camera.update(this.prediction,this.projection,this.frame,delta,active,alive);this.apply(status,this.projection.baseZoom);return status;
 }
 private apply(status:DescentCameraStatus,baseZoom:number):void {const zoom=baseZoom*status.zoomRatio;if(Math.abs(this.main.zoomX-zoom)>.0001||Math.abs(this.main.zoomY-zoom)>.0001)this.main.setZoom(zoom);if(Math.abs(this.main.followOffset.y-status.offsetY)>.25)this.main.setFollowOffset(0,status.offsetY);}
 suspend():void{this.camera.suspend();this.suspended=true;}
 resume():void{if(this.camera.owner==='boss')return;if(this.suspended){this.camera.resume();this.suspended=false;}}
 reset():void{this.camera.reset();this.suspended=false;}
 destroy():void{this.camera.destroy();}
}
