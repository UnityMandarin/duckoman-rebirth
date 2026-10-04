import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {SkillRoute} from '../data/skillRoutes';
import type {Ledge} from '../data/chapters';
import {RouteAttempt,type RouteVictory} from './RouteAttempt';
import {onDebugChange} from './debug/debugSettings';

export interface CrownRouteOptions {
 initiallyEligible:boolean;
 isAssisted:()=>boolean;
 onVictory:(outcome:RouteVictory)=>void;
}

/** One optional three-ring route, shared by campaign sections and isolated drills. */
export class CrownRoute {
 readonly attempt:RouteAttempt;
 readonly route:SkillRoute;
 private readonly sectionStart:number;
 private readonly ledges:readonly [Ledge,Ledge,Ledge];
 private readonly ringArt:Phaser.GameObjects.Image[]=[];
 private readonly ringLabels:Phaser.GameObjects.Text[]=[];
 private readonly ringStyles=['','',''];
 private readonly options:CrownRouteOptions;
 private wasInside=false;
 private chargeRewarded=false;
 private closed=false;
 private readonly damageListener:()=>void;
 private readonly gapListener:()=>void;
 private readonly visibilityListener:()=>void;
 private readonly removeDebugListener:()=>void;

 constructor(private readonly scene:Phaser.Scene,private readonly player:Player,route:SkillRoute,raisedLedges:readonly Ledge[],options:CrownRouteOptions){
  this.route=route;this.options=options;this.sectionStart=route.section*1440;this.attempt=new RouteAttempt(options.initiallyEligible&&!options.isAssisted());
  const selected=route.stepIndexes.map(index=>raisedLedges[index]);
  if(selected.some(ledge=>!ledge)||new Set(selected).size!==3)throw new Error(`Invalid authored Crown Route ledges: ${route.id}`);
  this.ledges=selected as [Ledge,Ledge,Ledge];
  this.ledges.forEach((_,index)=>{this.ringArt.push(scene.add.image(0,0,'quality-concept-props','crown-ring').setDisplaySize(40,40).setDepth(8));this.ringLabels.push(scene.add.text(0,0,String(index+1),{fontFamily:'Georgia',fontSize:'12px',fontStyle:'bold',color:'#f1d18d',stroke:'#071019',strokeThickness:3}).setOrigin(.5).setDepth(9));});
  this.syncPositions();
  this.syncRingStyles();
  scene.add.text(this.sectionStart+100,242,'OPTIONAL CROWN ROUTE · 1 → 2 → 3 → EXIT',{fontFamily:'Georgia',fontSize:'10px',color:'#f1d18d',stroke:'#071019',strokeThickness:4}).setOrigin(0,.5).setDepth(13);
  scene.add.text(this.sectionStart+1370,330,'◇ EXIT',{fontFamily:'Georgia',fontSize:'10px',color:'#75e3cf',stroke:'#071019',strokeThickness:4}).setOrigin(.5).setDepth(13);
  this.damageListener=()=>this.attempt.damage();scene.events.on('player-damaged',this.damageListener);
  this.gapListener=()=>this.attempt.markGap();this.visibilityListener=()=>this.gapListener();
  document.addEventListener('visibilitychange',this.visibilityListener);
  scene.events.on(Phaser.Scenes.Events.PAUSE,this.gapListener);scene.events.on(Phaser.Scenes.Events.SLEEP,this.gapListener);scene.game.events.on(Phaser.Core.Events.BLUR,this.gapListener);
  this.removeDebugListener=onDebugChange(()=>{if(options.isAssisted())this.attempt.invalidate();});
  if(options.isAssisted())this.attempt.invalidate();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.shutdown());
 }

 get nextRing():number{return this.attempt.nextRing;}
 get hits():number{return this.attempt.hits;}
 get elapsedMs():number{return this.attempt.elapsedMs;}
 get eligible():boolean{return this.attempt.eligible;}
 get state():string{return this.attempt.state;}
 invalidate():void{this.attempt.invalidate();}
 claimCampaignCharge():boolean{if(this.chargeRewarded)return false;this.chargeRewarded=true;return true;}

 update(delta:number,intent:boolean):void{
  if(this.closed)return;
  const localX=this.player.sprite.x-this.sectionStart,inside=localX>=0&&localX<1440;
  this.syncPositions();
  if(!inside){
   if(this.wasInside){this.attempt.tick(delta,{localX,intent,active:this.scene.scene.isActive(),visible:document.visibilityState==='visible',alive:this.player.active,assisted:this.options.isAssisted()});this.finishIfReady(localX);}
   this.wasInside=false;this.syncRingStyles();return;
  }
  if(!this.wasInside&&(this.attempt.state==='missed'||this.attempt.state==='complete'||this.attempt.state==='failed'))this.attempt.reset();
  this.wasInside=true;
  this.attempt.tick(delta,{localX,intent,active:this.scene.scene.isActive(),visible:document.visibilityState==='visible',alive:this.player.active,assisted:this.options.isAssisted()});
  if(this.attempt.state==='running'){
   const ledge=this.ledges[this.attempt.nextRing];
   if(ledge&&Phaser.Math.Distance.Between(this.player.sprite.x,this.player.sprite.y,ledge.x,ledge.y-60)<=36)this.attempt.collectRing(this.attempt.nextRing);
  }
  this.finishIfReady(localX);this.syncRingStyles();
 }

 private finishIfReady(localX:number):void{const outcome=this.attempt.finish(localX);if(outcome)this.options.onVictory(outcome);}
 private syncPositions():void{this.ledges.forEach((ledge,index)=>{this.ringArt[index].setPosition(ledge.x,ledge.y-60);this.ringLabels[index].setPosition(ledge.x,ledge.y-60);});}
 private syncRingStyles():void{
  for(let i=0;i<3;i++){
   const style=i<this.attempt.nextRing?'collected':i===this.attempt.nextRing?'next':'later';if(this.ringStyles[i]===style)continue;this.ringStyles[i]=style;
   const art=this.ringArt[i],label=this.ringLabels[i];
   if(style==='collected')art.setTint(0x62e7cb).setAlpha(.88).setDisplaySize(33,33);
   else if(style==='next')art.clearTint().setAlpha(1).setDisplaySize(40,40);
   else art.setTint(0x9ba7ad).setAlpha(.5).setDisplaySize(34,34);
   label.setColor(style==='later'?'#879198':'#f1d18d').setAlpha(style==='later'?.42:1);
  }
 }
 private shutdown():void{
  if(this.closed)return;this.closed=true;this.scene.events.off('player-damaged',this.damageListener);this.scene.events.off(Phaser.Scenes.Events.PAUSE,this.gapListener);this.scene.events.off(Phaser.Scenes.Events.SLEEP,this.gapListener);this.scene.game.events.off(Phaser.Core.Events.BLUR,this.gapListener);document.removeEventListener('visibilitychange',this.visibilityListener);this.removeDebugListener();
 }
}
