import Phaser from 'phaser';
import {damp} from '../systems/atmosphereMath';
import type {Player} from './Player';
import {CRAB_RULES,crabDamage,pillarTargets,type CrabPhase,nextCrabPhase,crabPhaseDuration,canCrabDashDamage,crabPillarActiveAt,crabChargeDistance,crabChargeDuration} from '../systems/CrabRules';
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
 private bar:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 private pillars:Phaser.GameObjects.Image[]=[];
 private engaged=false;
 private hurtUntil=0;
 private phase:CrabPhase='rest';
 private until=0;
 private direction: -1|1=1;
 private chargeOrigin=0;
 private chargeDistanceAtCue:number=CRAB_RULES.chargeDistance;
 private pillarSet:number[]=[];
 private pillarHit=false;
 private phaseTwo=false;
 constructor(private scene:Phaser.Scene,private player:Player,private left:number,private right:number,private defeated:()=>void){
  super();
  const shadow=scene.add.ellipse(0,0,240,24,0x080306,.65),atlas=scene.textures.get('crimson-crab');
  if(!atlas.has('body')){atlas.add('body',0,0,0,1140,658);atlas.add('claw',0,750,658,786,366);}
  this.shell=scene.add.image(0,-78,'crimson-crab','body').setDisplaySize(280,162);
  this.claws=[-1,1].map(sign=>scene.add.image(sign*60,-70,'crimson-crab','claw').setOrigin(sign===1?0:1,.5).setDisplaySize(143,67).setFlipX(sign<0));
  this.image=scene.add.container(left+760,350,[shadow,...this.claws,this.shell]).setDepth(12);
  this.warnings=scene.add.graphics().setDepth(9);this.bar=scene.add.graphics().setScrollFactor(0).setDepth(51);
  this.name=scene.add.text(518,18,'CRIMSON CLAW · 20 / 20',{fontSize:'10px',color:'#ffc5b4'}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  for(let i=0;i<CRAB_RULES.pillarCount;i++)this.pillars.push(scene.add.image(0,-400,'rock-pillar-kit','pillar').setDisplaySize(62,260).setTint(0xf06169).setDepth(13).setVisible(false));
  const strike=(s:UltimateStrike)=>{if(this.engaged&&this.hp>0&&s.tryHit(this,this.shellBounds))this.damage('ultimate');};
  scene.events.on('ultimate-strike',strike);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off('ultimate-strike',strike));
  this.draw(0);
 }
 update(delta:number):void{
  if(this.hp<=0||!this.player.active)return;
  const now=this.scene.time.now,p=this.player,dt=Math.min(delta,50)/1000;
  if(!this.engaged){if(p.sprite.x<this.left+100)return;this.engaged=true;this.name.setVisible(true);this.enter('rest',now);}
  this.phaseTwo=this.hp<=10;
  this.bar.clear().fillStyle(0x1b080e,.95).fillRoundedRect(411,32,216,17,4).lineStyle(1,0xea7770).strokeRoundedRect(411,32,216,17,4).fillStyle(0xd54050).fillRect(415,36,208*this.hp/20,9);
  const timedPillarPhase=this.phase==='pillar-warning'||this.phase==='pillar-fall'||this.phase==='pillar-impact';
  if(now>=this.until&&!timedPillarPhase)this.advance(now,p.sprite.x);
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
   for(const pillar of this.pillars){
    if(this.phase==='pillar-warning'){
     this.warnings.lineStyle(2,0xffb3a1,.9).lineBetween(pillar.x,-120,pillar.x,360).fillStyle(0xff334d,.65).fillEllipse(pillar.x,357,72,10);
    }else if(this.phase==='pillar-fall'){
     pillar.setVisible(true);const t=Math.min(1,elapsed/CRAB_RULES.fallMs);pillar.y=Phaser.Math.Linear(-400,230,t*t);
    }else if(this.phase==='pillar-impact'){
     pillar.setPosition(pillar.x,230).setVisible(true);
     const zone={left:pillar.x-31,right:pillar.x+31,top:pillar.y-130,bottom:pillar.y+130};
     if(!this.pillarHit&&crabPillarActiveAt(this.phase,pillar.visible)&&rectsOverlap(p.body,zone))this.pillarHit=p.takeDamage(pillar.x,.5)||this.pillarHit;
    }else pillar.setVisible(false);
   }
   if(this.phase==='pillar-impact'&&elapsed>=CRAB_RULES.pillarImpactMs)this.enter('pillar-recovery',now);
   if(this.phase==='pillar-fall'&&elapsed>=CRAB_RULES.fallMs){this.pillars.forEach(pillar=>pillar.setPosition(pillar.x,230));this.enter('pillar-impact',now);}
   if(this.phase==='pillar-warning'&&elapsed>=CRAB_RULES.warningMs){this.pillars.forEach(pillar=>pillar.setVisible(true));this.enter('pillar-fall',now);}
  }
  const x=this.image.x,contact={left:x-77,right:x+77,top:260,bottom:350};
  const reach=[x+this.direction*23,x+this.direction*202],swing={left:Math.min(...reach),right:Math.max(...reach),top:240,bottom:350};
  showHitbox(this.scene,'danger',contact);showHitbox(this.scene,'target',this.shellBounds);
  if(this.phase==='claw-swing')showHitbox(this.scene,'danger',swing);
  const dashHit=this.checkDash(p);
  if(!pillarPhase&&!dashHit&&!p.isDashing&&rectsOverlap(p.body,contact))p.takeDamage(x,.5);
  if(this.phase==='claw-swing'&&rectsOverlap(p.body,swing))p.takeDamage(x,.5);
  this.draw(now,delta);this.image.setAlpha(now<this.hurtUntil?.65:1);
 }
 private phaseStarted=0;
 private enter(phase:CrabPhase,now:number):void{
  this.phase=phase;this.phaseStarted=now;this.until=now+crabPhaseDuration(phase,this.phaseTwo);
  if(phase==='claw-windup'||phase==='charge-cue')this.direction=this.player.sprite.x<this.image.x?-1:1;
  if(phase==='charge-cue')this.chargeDistanceAtCue=crabChargeDistance(this.phaseTwo);
  if(phase==='charge'){this.chargeOrigin=this.image.x;this.until=now+crabChargeDuration(this.chargeDistanceAtCue);}
  if(phase==='pillar-warning'){
   this.pillarHit=false;
   this.pillarSet=pillarTargets(this.player.sprite.x,this.left+70,this.right-70);
   this.pillars.forEach((pillar,i)=>pillar.setPosition(this.pillarSet[i],-400).setVisible(false));
  }
 }
 private advance(now:number,targetX:number):void{
  const next=nextCrabPhase(this.phase);
  if(next==='claw-windup'||next==='charge-cue')this.direction=targetX<this.image.x?-1:1;
  this.enter(next,now);
 }
 private draw(now:number,delta=16.67):void{
  this.shell.setY(-78+Math.sin(now*(this.phase==='charge'?.023:.004))*2);
  this.claws.forEach((claw,i)=>{
   const sign=i===0?-1:1,active=sign===this.direction;
   const angle=active&&this.phase==='claw-windup'?-sign*52:active&&this.phase==='claw-swing'?sign*12:sign*5;
   claw.setAngle(damp(claw.angle,angle,this.phase==='claw-swing'?24:9,delta)).setX(damp(claw.x,sign*(active&&this.phase==='claw-swing'?83:60),18,delta)).setY(-70);
  });
 }
 private get shellBounds():Rect{return {left:this.image.x-70,right:this.image.x+70,top:260,bottom:350};}
 protected dashBounds():Rect|null{return this.hp>0&&this.engaged?this.shellBounds:null;}
 protected onDash():void{if(canCrabDashDamage(this.hp>0,this.engaged,this.phase))this.damage('dash');}
 private damage(attack:'dash'|'ultimate'):void{
  const now=this.scene.time.now;if(this.hp<=0||now<this.hurtUntil)return;
  if(attack!=='dash')hitSpark(this.scene,this.image.x,300,1.4);
  this.hp=Math.max(0,this.hp-crabDamage(attack));this.hurtUntil=now+500;this.name.setText(`CRIMSON CLAW · ${this.hp} / 20`);
  if(attack==='dash')this.player.chargeUltimate(5);
  if(this.hp===0){this.bar.clear();this.name.destroy();this.warnings.clear();this.pillars.forEach(p=>p.destroy());this.scene.tweens.add({targets:this.image,alpha:0,angle:9,duration:900});this.defeated();}
 }
}
