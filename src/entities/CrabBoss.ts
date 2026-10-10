import Phaser from 'phaser';
import {canUltimateDamage,ownsUltimateFreeze,hasUltimateFreeze} from '../systems/ultimateFreeze';
import {damp} from '../systems/atmosphereMath';
import type {Player} from './Player';
import {CRAB_RULES,crabDamage,pillarTargets,type CrabPhase,nextCrabPhase,crabPhaseDuration,canCrabDashDamage,crabPillarActiveAt,crabChargeDistance,crabChargeDuration,resolveEmergeDestination,snapshotBurrowTarget,crabBurrowImmune,crabBurrowContactActive,crabActiveZone,crabCanAct,crabEmergenceTop,crabResumePhase} from '../systems/CrabRules';
import {rectsOverlap,type Rect} from '../systems/contactRules';
import {showHitbox} from '../systems/DebugHitboxes';
import {Dashable} from './Dashable';
import {hitSpark} from '../systems/HitSpark';
import type {UltimateStrike} from '../systems/ultimateSwingMath';

/** A single, readable attack schedule: claw, charge, then pillars, repeated. */
export class CrabBoss extends Dashable {
 hp:number=CRAB_RULES.hp;
 readonly image:Phaser.GameObjects.Container;
 private shell:Phaser.GameObjects.Image;
 private claws:Phaser.GameObjects.Image[];
 private warnings:Phaser.GameObjects.Graphics;
 private barFrame:Phaser.GameObjects.Image;
 private barFill:Phaser.GameObjects.Image;
 private barHp=-1;
 private name:Phaser.GameObjects.Text;
 private pillars:Phaser.GameObjects.Image[]=[];
 private engaged=false;
 private phase:CrabPhase='rest';
 private until=0;
 private direction: -1|1=1;
 private chargeOrigin=0;
 private chargeDistanceAtCue:number=CRAB_RULES.chargeDistance;
 private pillarSet:number[]=[];
 private pillarHit=false;
 private phaseTwo=false;
 private clockMs=0;
 private hitUntil=0;
 private burrowTargetX=0;
 private emergeX=0;
 private emergeHit=false;
 private suspendedGap=false;
 private resumeNoDamage=false;
 private readonly contactRect:Rect={left:0,right:0,top:260,bottom:350};
 private readonly swingRect:Rect={left:0,right:0,top:240,bottom:350};
 private readonly activeRect:Rect={left:0,right:0,top:240,bottom:360};
 private readonly shellRect:Rect={left:0,right:0,top:260,bottom:350};
 private readonly pillarZones:Rect[]=[];
 private readonly cueCrack?:Phaser.GameObjects.Image;
 private readonly cueDust?:Phaser.GameObjects.Image;
 private readonly downDust?:Phaser.GameObjects.Image;
 private downDustScaleX=1;
 private downDustScaleY=1;
 constructor(private scene:Phaser.Scene,private player:Player,private left:number,private right:number,private defeated:()=>void){
  super();
  const shadow=scene.add.ellipse(0,0,240,24,0x080306,.65),atlas=scene.textures.get('crimson-crab');
  if(!atlas.has('body')){atlas.add('body',0,0,0,1140,658);atlas.add('claw',0,750,658,786,366);}
  this.shell=scene.add.image(0,-78,'crimson-crab','body').setDisplaySize(280,162);
  this.claws=[-1,1].map(sign=>scene.add.image(sign*60,-70,'crimson-crab','claw').setOrigin(sign===1?0:1,.5).setDisplaySize(143,67).setFlipX(sign<0));
  this.image=scene.add.container(left+760,350,[shadow,...this.claws,this.shell]).setDepth(12);
  const props=scene.textures.get('quality-concept-props');
  if(props&&props.key!=='__MISSING'&&props.getSourceImage()?.width>=1254){
   if(!props.has('crab-cracked-stone'))props.add('crab-cracked-stone',0,948,110,300,162);
   if(!props.has('crab-dust-plume'))props.add('crab-dust-plume',0,22,960,291,238);
   this.cueCrack=scene.add.image(left+760,360,'quality-concept-props','crab-cracked-stone').setDisplaySize(120,65).setDepth(10).setVisible(false);
   this.cueDust=scene.add.image(left+760,350,'quality-concept-props','crab-dust-plume').setDisplaySize(150,122).setDepth(14).setVisible(false);
   this.downDust=scene.add.image(left+760,350,'quality-concept-props','crab-dust-plume').setDisplaySize(130,106).setDepth(14).setVisible(false);
   this.downDustScaleX=this.downDust.scaleX;this.downDustScaleY=this.downDust.scaleY;
  }
  this.warnings=scene.add.graphics().setDepth(9);
  this.barFill=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-fill').setOrigin(0).setDisplaySize(216,22).setScrollFactor(0).setDepth(51).setCrop(0,0,535,188).setVisible(false);
  this.barFrame=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-frame').setOrigin(0).setDisplaySize(216,22).setScrollFactor(0).setDepth(52).setVisible(false);
  this.name=scene.add.text(518,18,'CRIMSON CLAW · 20 / 20',{fontSize:'10px',color:'#ffc5b4'}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  for(let i=0;i<CRAB_RULES.pillarCount;i++){this.pillars.push(scene.add.image(0,-400,'rock-pillar-kit','pillar').setDisplaySize(62,260).setTint(0xf06169).setDepth(13).setVisible(false));this.pillarZones.push({left:0,right:0,top:100,bottom:360});}
  const strike=(strike:UltimateStrike)=>{if(strike.player===this.player&&this.player.usingUltimate&&canUltimateDamage(this.scene,this.player)&&this.hp>0&&this.engaged&&!this.resumeNoDamage&&this.clockMs>=this.hitUntil&&this.image.visible&&this.image.alpha>0&&strike.tryHit(this,this.image.getBounds()))this.damage('ultimate');};
  const markGap=()=>{this.suspendedGap=true;};
  const markSceneGap=()=>{if(!(hasUltimateFreeze(this.scene,this.player)&&this.player.active&&this.player.usingUltimate&&document.visibilityState==='visible'))markGap();};
  const visibility=()=>{if(document.visibilityState!=='visible')markGap();};
  const shutdown=()=>{scene.events.off('ultimate-strike',strike);scene.events.off(Phaser.Scenes.Events.PAUSE,markSceneGap);scene.events.off(Phaser.Scenes.Events.SLEEP,markSceneGap);scene.game.events.off(Phaser.Core.Events.BLUR,markGap);document.removeEventListener('visibilitychange',visibility);scene.events.off(Phaser.Scenes.Events.SHUTDOWN,shutdown);};
  scene.events.on('ultimate-strike',strike);scene.events.on(Phaser.Scenes.Events.PAUSE,markSceneGap);scene.events.on(Phaser.Scenes.Events.SLEEP,markSceneGap);scene.game.events.on(Phaser.Core.Events.BLUR,markGap);document.addEventListener('visibilitychange',visibility);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,shutdown);
  this.draw(0);
 }
 update(delta:number):void{
  if(ownsUltimateFreeze(this.scene,this.player))return;
  if(this.hp<=0||!this.player.active)return;
  const p=this.player,dtMs=Math.min(50,Math.max(0,Number.isFinite(delta)?delta:0)),dt=dtMs/1000;
  if(!this.engaged){if(p.sprite.x<this.left+100)return;this.engaged=true;this.name.setVisible(true);this.enter('rest',this.clockMs);}
  const live=crabCanAct(this.hp>0,this.engaged,document.visibilityState!=='visible',p.active,this.scene.sys.isActive(),this.scene.physics.world.isPaused);
  if(!live)return;
  if(this.suspendedGap){
   this.suspendedGap=false;
   const interrupted=this.phase,resumed=crabResumePhase(interrupted),restart=interrupted!==resumed||interrupted==='claw-windup'||interrupted==='charge-cue'||interrupted==='pillar-warning'||interrupted==='emerge-cue';
   if(restart){this.resumeNoDamage=true;this.enter(resumed,this.clockMs,interrupted==='emerge-cue'||interrupted==='emerge-active');}
  }
  this.clockMs+=dtMs;const now=this.clockMs;
  this.phaseTwo=this.hp<=10;
  this.updateHealthBar();
  const timedPillarPhase=this.phase==='pillar-warning'||this.phase==='pillar-fall'||this.phase==='pillar-impact';
  if(now>=this.until&&this.phase!=='charge'&&!timedPillarPhase)this.advance(this.until,p.sprite.x);
  this.warnings.clear();
  if(this.phase==='charge-cue'){
   this.warnings.lineStyle(4,0xffc073,.9).lineBetween(this.image.x,346,this.image.x+this.direction*300,346);
  }
  if(this.phase==='charge'){
   const limit=this.chargeOrigin+this.direction*this.chargeDistanceAtCue;
   this.image.x=Phaser.Math.Clamp(this.image.x+this.direction*CRAB_RULES.chargeSpeed*dt,this.left+150,this.right-150);
   if((this.direction>0&&this.image.x>=limit)||(this.direction<0&&this.image.x<=limit)||this.image.x<=this.left+150||this.image.x>=this.right-150){this.image.x=Phaser.Math.Clamp(limit,this.left+150,this.right-150);this.enter('charge-recovery',now);}
  }
  const pillarPhase=this.phase==='pillar-warning'||this.phase==='pillar-fall'||this.phase==='pillar-impact'||this.phase==='pillar-recovery';
  if(pillarPhase){
   const elapsed=now-this.phaseStarted;
   let i=0;for(const pillar of this.pillars){
    if(this.phase==='pillar-warning'){
     this.warnings.lineStyle(2,0xffb3a1,.9).lineBetween(pillar.x,-120,pillar.x,360).fillStyle(0xff334d,.65).fillEllipse(pillar.x,357,72,10);
    }else if(this.phase==='pillar-fall'){
     pillar.setVisible(true);const t=Math.min(1,elapsed/CRAB_RULES.fallMs);pillar.y=Phaser.Math.Linear(-400,230,t*t);
    }else if(this.phase==='pillar-impact'){
     pillar.setPosition(pillar.x,230).setVisible(true);
     const zone=this.pillarZones[i];zone.left=pillar.x-31;zone.right=pillar.x+31;zone.top=pillar.y-130;zone.bottom=pillar.y+130;
     if(!this.pillarHit&&crabPillarActiveAt(this.phase,pillar.visible)&&rectsOverlap(p.body,zone))this.pillarHit=p.takeDamage(pillar.x,.5)||this.pillarHit;
    }else pillar.setVisible(false);
    i++;
   }
   if(this.phase==='pillar-impact'&&elapsed>=CRAB_RULES.pillarImpactMs)this.enter('pillar-recovery',this.until);
   if(this.phase==='pillar-fall'&&elapsed>=CRAB_RULES.fallMs){this.pillars.forEach(pillar=>pillar.setPosition(pillar.x,230));this.enter('pillar-impact',this.until);}
   if(this.phase==='pillar-warning'&&elapsed>=CRAB_RULES.warningMs){this.pillars.forEach(pillar=>pillar.setVisible(true));this.enter('pillar-fall',this.until);}
  }
  this.updateBurrow(now);
  const emergenceTop=this.phase==='emerge-active'?crabEmergenceTop(this.image.y,this.image.alpha):null;
  this.activeRect.top=emergenceTop??360;
  const x=this.image.x,contact=this.contactRect;contact.left=x-77;contact.right=x+77;
  const reachA=x+this.direction*23,reachB=x+this.direction*202,swing=this.swingRect;swing.left=Math.min(reachA,reachB);swing.right=Math.max(reachA,reachB);
  const active=this.activeRect;
  const burrowImmune=crabBurrowImmune(this.phase);
  if(!burrowImmune){showHitbox(this.scene,'danger',contact);showHitbox(this.scene,'target',this.phase==='emerge-active'?active:this.shellBounds);}
  if(this.phase==='claw-swing')showHitbox(this.scene,'danger',swing);
  if(this.phase==='emerge-active'&&active.top<active.bottom)showHitbox(this.scene,'danger',active);
  const dashHit=this.resumeNoDamage?false:this.checkDash(p);
  if(!this.resumeNoDamage&&!pillarPhase&&!burrowImmune&&!crabBurrowContactActive(this.phase)&&!dashHit&&!p.isDashing&&!p.usingUltimate&&this.phase!=='emerge-recovery'&&rectsOverlap(p.body,contact))p.takeDamage(x,.5);
  if(!this.resumeNoDamage&&this.phase==='claw-swing'&&!p.isDashing&&!p.usingUltimate&&rectsOverlap(p.body,swing))p.takeDamage(x,.5);
  if(!this.resumeNoDamage&&this.phase==='emerge-active'&&active.top<active.bottom&&this.image.alpha>=.9&&!this.emergeHit&&!p.isDashing&&!p.usingUltimate&&rectsOverlap(p.body,active)){this.emergeHit=true;p.takeDamage(x,.5);}
  this.draw(now,dtMs);
  this.image.setAlpha(this.phase==='emerge-active'?Math.min(1,(now-this.phaseStarted)/60):now<this.hitUntil?.65:1);
  this.resumeNoDamage=false;
 }
 private phaseStarted=0;
 private enter(phase:CrabPhase,now:number,keepEmergeX=false):void{
  this.phase=phase;this.phaseStarted=now;this.until=now+crabPhaseDuration(phase,this.phaseTwo);
  if(phase==='claw-windup'||phase==='charge-cue')this.direction=this.player.sprite.x<this.image.x?-1:1;
  if(phase==='charge-cue')this.chargeDistanceAtCue=crabChargeDistance(this.phaseTwo);
  if(phase==='charge'){this.chargeOrigin=this.image.x;this.until=now+crabChargeDuration(this.chargeDistanceAtCue);}
  if(phase==='pillar-warning'){
   this.pillarHit=false;
   this.pillarSet=pillarTargets(this.player.sprite.x,this.left+70,this.right-70);
   this.pillars.forEach((pillar,i)=>pillar.setPosition(this.pillarSet[i],-400).setVisible(false));
  }
  if(phase==='underground')this.burrowTargetX=snapshotBurrowTarget(this.player.sprite.x,this.left,this.right);
  if(phase==='burrow-down')this.downDust?.setPosition(this.image.x,350).setVisible(true).setAlpha(.9).setScale(this.downDustScaleX,this.downDustScaleY);
  if(phase==='emerge-cue'){
   if(!keepEmergeX)this.emergeX=resolveEmergeDestination(this.burrowTargetX,this.player.sprite.x,this.left,this.right);
   this.image.setPosition(this.emergeX,470).setAlpha(0).setScale(1,1);
   this.cueCrack?.setPosition(this.emergeX,360).setVisible(true);this.cueDust?.setPosition(this.emergeX,350).setVisible(true);
  }
  if(phase==='emerge-active'){this.emergeHit=false;const zone=crabActiveZone(this.emergeX);this.activeRect.left=zone.left;this.activeRect.right=zone.right;this.image.setPosition(this.emergeX,470).setAlpha(1);}
  if(phase==='emerge-recovery')this.image.setPosition(this.emergeX,350).setAlpha(1);
  if(phase==='rest'){this.image.setY(350);}
 }
 private advance(now:number,targetX:number):void{
  const next=nextCrabPhase(this.phase);
  if(next==='claw-windup'||next==='charge-cue')this.direction=targetX<this.image.x?-1:1;
  this.enter(next,now);
 }
 private updateBurrow(now:number):void{
  const elapsed=now-this.phaseStarted;
  if(this.phase==='burrow-down'){
   const t=Math.min(1,elapsed/CRAB_RULES.burrowDownMs);this.image.setScale(1,.14+.86*(1-t));this.claws.forEach((c,i)=>c.setAngle((i===0?-1:1)*-55*t));
   const plumeScale=.65+t*.4;this.downDust?.setVisible(true).setPosition(this.image.x,350-t*38).setAlpha(.45+.45*t).setScale(this.downDustScaleX*plumeScale,this.downDustScaleY*plumeScale);
  }else if(this.phase==='underground'){
   this.image.setVisible(false);this.downDust?.setVisible(false);this.cueCrack?.setVisible(false);this.cueDust?.setVisible(false);
  }else if(this.phase==='emerge-cue'){
   this.image.setVisible(false);this.cueCrack?.setVisible(true);this.cueDust?.setVisible(true).setAlpha(.62+.28*Math.sin(elapsed*.015));
  }else if(this.phase==='emerge-active'){
   this.image.setVisible(true).setAlpha(Math.min(1,elapsed/60)).setPosition(this.emergeX,Phaser.Math.Linear(470,350,Math.min(1,elapsed/CRAB_RULES.emergeActiveMs)));
   this.claws.forEach((c,i)=>c.setAngle((i===0?-1:1)*Phaser.Math.Linear(48,-8,Math.min(1,elapsed/220))));
   this.cueCrack?.setVisible(true);this.cueDust?.setVisible(true).setPosition(this.emergeX,350-Math.min(1,elapsed/CRAB_RULES.emergeActiveMs)*42).setAlpha(Math.max(0,1-elapsed/300));
  }else if(this.phase==='emerge-recovery'){
   this.image.setVisible(true).setAlpha(1).setPosition(this.emergeX,350);this.cueCrack?.setVisible(false);this.cueDust?.setVisible(false);this.downDust?.setVisible(false);
  }else{
   this.image.setVisible(true).setScale(1,1);this.cueCrack?.setVisible(false);this.cueDust?.setVisible(false);this.downDust?.setVisible(false);
  }
 }
 private draw(now:number,delta=16.67):void{
  const burrow=crabBurrowImmune(this.phase)||this.phase==='emerge-active'||this.phase==='emerge-recovery';
  if(!burrow)this.shell.setY(-78+Math.sin(now*(this.phase==='charge'?.023:.004))*2);
  const crouch=this.phase==='charge-cue'||this.phase==='charge';
  this.shell.setScale(280/1140,(162/658)*(crouch?.88:1));
  this.claws.forEach((claw,i)=>{
   const sign=i===0?-1:1,active=sign===this.direction;
   const angle=this.phase==='burrow-down'?-sign*68:this.phase==='emerge-active'?sign*50:active&&this.phase==='claw-windup'?-sign*52:active&&this.phase==='claw-swing'?sign*12:sign*5;
   const clawX=this.phase==='burrow-down'?sign*35:this.phase==='emerge-recovery'?sign*80:sign*(active&&this.phase==='claw-swing'?83:60);
   claw.setAngle(damp(claw.angle,angle,this.phase==='claw-swing'||this.phase==='emerge-active'?24:9,delta)).setX(damp(claw.x,clawX,18,delta)).setY(-70);
  });
  if(this.phase==='emerge-recovery')this.warnings.lineStyle(3,0xffd35b,.9).strokeRoundedRect(this.image.x-72,262,144,88,9);
 }
 private get shellBounds():Rect{this.shellRect.left=this.image.x-70;this.shellRect.right=this.image.x+70;return this.shellRect;}
 private updateHealthBar():void{
  if(this.barHp===this.hp)return;this.barHp=this.hp;
  const visible=this.engaged&&this.hp>0;this.barFrame.setVisible(visible);this.barFill.setCrop(0,0,535*this.hp/CRAB_RULES.hp,188).setVisible(visible);
 }
 private canAct():boolean{return crabCanAct(this.hp>0,this.engaged,document.visibilityState!=='visible',this.player.active,this.scene.sys.isActive(),this.scene.physics.world.isPaused);}
 protected dashBounds():Rect|null{return this.canAct()&&!this.resumeNoDamage&&!crabBurrowImmune(this.phase)?(this.phase==='emerge-active'&&this.activeRect.top<this.activeRect.bottom&&this.image.alpha>=.9?this.activeRect:this.phase==='emerge-active'?null:this.shellBounds):null;}
 protected onDash():void{if(this.canAct()&&canCrabDashDamage(this.hp>0,this.engaged,this.phase))this.damage('dash');}
 private damage(attack:'dash'|'ultimate'):void{
  const now=this.clockMs;if(!(attack==='ultimate'?canUltimateDamage(this.scene,this.player)&&this.hp>0&&this.engaged:this.canAct())||this.resumeNoDamage||(attack==='dash'?crabBurrowImmune(this.phase):!this.image.visible||this.image.alpha<=0)||now<this.hitUntil)return;
  if(attack!=='dash')hitSpark(this.scene,this.image.x,300,1.4);
  this.hp=Math.max(0,this.hp-crabDamage(attack));this.hitUntil=now+500;this.name.setText(`CRIMSON CLAW · ${this.hp} / 20`);
  if(attack==='dash')this.player.chargeUltimate(5);
  if(this.hp===0){this.barFrame.setVisible(false);this.barFill.setVisible(false);this.name.destroy();this.warnings.clear();this.pillars.forEach(p=>p.destroy());this.cueCrack?.destroy();this.cueDust?.destroy();this.downDust?.destroy();this.scene.tweens.add({targets:this.image,alpha:0,angle:9,duration:900});this.defeated();}
 }
}
