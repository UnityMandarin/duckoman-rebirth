import Phaser from 'phaser';
import {renderScale} from './renderScale';
import {TRAVERSAL_CAMERA_FEATHER,sampleTraversalCameraZone,type TraversalChapter,type TraversalCameraZone} from '../data/traversalCameraZones';

export interface TraversalCameraStatus {
  state:'normal'|'blending'|'zone'|'suspended'|'boss';
  owner:'traversal'|'boss';
  zoneId?:string;
  zoneWeight:number;
  zoomRatio:number;
  offsetY:number;
  targetId?:undefined;
  risk:false;
  riskKind?:undefined;
  riskLeft?:undefined;
  riskRight?:undefined;
  riskTop?:undefined;
  riskBottom?:undefined;
}

/** Applies fixed authored camera shots from player position; it never predicts a landing. */
export class TraversalCameraRig {
  /** Compatibility-shaped status object for local QA telemetry; target/risk are deliberately absent. */
  readonly camera:TraversalCameraStatus={state:'normal',owner:'traversal',zoneWeight:0,zoomRatio:1,offsetY:0,risk:false};
  private zoomRatio=1;
  private offsetY=0;
  private suspended=false;
  private discardDelta=false;
  private destroyed=false;
  private zone:TraversalCameraZone|null=null;

  constructor(private readonly scene:Phaser.Scene,private readonly main:Phaser.Cameras.Scene2D.Camera,private readonly chapter:TraversalChapter) {}

  update(x:number,feetY:number,delta:number,owner:'traversal'|'boss',active:boolean,alive:boolean):TraversalCameraStatus {
    if(this.destroyed)return this.setStatus('suspended','traversal',null,0);
    // Bosses own the complete transform. Do not even normalize the shot while they do.
    if(owner==='boss') {this.suspended=false;this.discardDelta=true;return this.setStatus('boss','boss',null,0);}
    if(!active||!alive){this.suspended=true;this.discardDelta=true;return this.setStatus('suspended','traversal',this.zone,this.camera.zoneWeight);}
    if(this.camera.owner==='boss')this.resetInternal();
    if(this.suspended){this.suspended=false;this.discardDelta=true;}
    const sample=sampleTraversalCameraZone(this.chapter,x,feetY);
    this.zone=sample.zone;
    return this.blend(sample.zoomRatio,sample.offsetY,delta,sample.zone,sample.weight);
  }

  /** Smoothly clears a shot before a nearby encounter claims the camera. */
  neutralize(delta:number,active:boolean,alive:boolean):TraversalCameraStatus {
    if(!active||!alive){this.suspended=true;this.discardDelta=true;return this.setStatus('suspended','traversal',this.zone,this.camera.zoneWeight);}
    if(this.camera.owner==='boss')this.resetInternal();
    this.suspended=false;
    return this.blend(1,0,delta,null,0);
  }

  suspend():void {this.suspended=true;this.discardDelta=true;}
  resume():void {
    if(this.camera.owner==='boss'||this.destroyed||!this.suspended)return;
    this.suspended=false;this.discardDelta=true;
  }
  reset():void {this.resetInternal();}
  destroy():void {this.destroyed=true;this.resetInternal();}

  private blend(targetZoom:number,targetOffset:number,delta:number,zone:TraversalCameraZone|null,weight:number):TraversalCameraStatus {
    const dt=this.discardDelta?0:Math.max(0,Math.min(TRAVERSAL_CAMERA_FEATHER.maxDeltaMs,delta));
    this.discardDelta=false;
    // Treat the authored response as the practical settling window (about 95% in 300 ms).
    const alpha=1-Math.exp(-dt/(TRAVERSAL_CAMERA_FEATHER.responseMs/3));
    this.zoomRatio+=(targetZoom-this.zoomRatio)*alpha;
    this.offsetY+=(targetOffset-this.offsetY)*alpha;
    if(Math.abs(this.zoomRatio-1)<.0005&&Math.abs(this.offsetY)<.1){this.zoomRatio=1;this.offsetY=0;}
    // Outside a shot, do not touch an already-normal camera. Re-read renderScale so
    // a quality/viewport resize preserves the current relative framing.
    const baseZoom=renderScale(),zoom=baseZoom*this.zoomRatio;
    if(Math.abs(this.main.zoomX-zoom)>.0001||Math.abs(this.main.zoomY-zoom)>.0001)this.main.setZoom(zoom);
    if(Math.abs(this.main.followOffset.y-this.offsetY)>.05)this.main.setFollowOffset(0,this.offsetY);
    return this.setStatus(this.zoomRatio===1&&this.offsetY===0?'normal':weight>0?'zone':'blending','traversal',zone,weight);
  }

  private setStatus(state:TraversalCameraStatus['state'],owner:TraversalCameraStatus['owner'],zone:TraversalCameraZone|null,weight:number):TraversalCameraStatus {
    const s=this.camera;s.state=state;s.owner=owner;s.zoneId=zone?.id;s.zoneWeight=weight;s.zoomRatio=this.zoomRatio;s.offsetY=this.offsetY;return s;
  }
  private resetInternal():void {this.zoomRatio=1;this.offsetY=0;this.zone=null;this.camera.zoneId=undefined;this.camera.zoneWeight=0;this.camera.zoomRatio=1;this.camera.offsetY=0;this.camera.state='normal';this.camera.owner='traversal';}
}
