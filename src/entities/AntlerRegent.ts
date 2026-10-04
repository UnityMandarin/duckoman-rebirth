import Phaser from 'phaser';
import type {Player} from './Player';
import type {ThrowableObject} from './ThrowableObject';
import {rectsOverlap,type Rect} from '../systems/contactRules';
import {showHitbox} from '../systems/DebugHitboxes';
import {Dashable} from './Dashable';
import {hitSpark} from '../systems/HitSpark';
import {cappedActorDeltaMs,resumeChargeTell} from '../systems/HollowWardenRules';
import type {UltimateStrike} from '../systems/ultimateSwingMath';

/** Telegraph, committed charge, recovery: readable attacks without teleportation. */
export class AntlerRegent extends Dashable {
 readonly image:Phaser.GameObjects.Image;
 hp=10;
 private phase:'idle'|'warn'|'charge'|'rest'='idle';
 private until=0;
 private clockMs=0;
 private direction=1;
 private hurtUntil=0;
 private engaged=false;
 private lifecycleGap=false;
 private barFrame:Phaser.GameObjects.Image;
 private barFill:Phaser.GameObjects.Image;
 private lastBarHp=10;
 private name:Phaser.GameObjects.Text;
 private warning:Phaser.GameObjects.Graphics;
 private readonly pauseListener=()=>{this.lifecycleGap=true;};
 private readonly resumeListener=()=>{this.lifecycleGap=true;};
 private readonly visibilityListener=()=>{if(document.visibilityState!=='visible')this.lifecycleGap=true;};
 private readonly strike:(strike:UltimateStrike)=>void;
 constructor(private scene:Phaser.Scene,private player:Player,private cake:ThrowableObject,private left:number,private right:number,private defeated:()=>void){
  super();
  this.image=scene.add.image(left+750,360,'antler-regent').setOrigin(.5,1).setDisplaySize(230,180).setDepth(12);
  this.barFill=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-fill').setOrigin(0).setDisplaySize(216,22).setCrop(0,0,535,188).setScrollFactor(0).setDepth(51).setVisible(false);
  this.barFrame=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-frame').setOrigin(0).setDisplaySize(216,22).setScrollFactor(0).setDepth(52).setVisible(false);
  this.name=scene.add.text(520,19,'THE BROKEN REGENT',{fontSize:'10px',color:'#dcc398'}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  this.warning=scene.add.graphics().setDepth(8);
  this.strike=(strike)=>{if(this.canAct()&&this.engaged&&strike.tryHit(this,this.hittable))this.damage(4);};
  scene.events.on('ultimate-strike',this.strike);scene.events.on(Phaser.Scenes.Events.PAUSE,this.pauseListener);scene.events.on(Phaser.Scenes.Events.RESUME,this.resumeListener);document.addEventListener('visibilitychange',this.visibilityListener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{scene.events.off('ultimate-strike',this.strike);scene.events.off(Phaser.Scenes.Events.PAUSE,this.pauseListener);scene.events.off(Phaser.Scenes.Events.RESUME,this.resumeListener);document.removeEventListener('visibilitychange',this.visibilityListener);});
 }
 private canAct():boolean{return this.player.active&&document.visibilityState==='visible'&&this.scene.sys.isActive()&&!this.scene.physics.world.isPaused;}
 update(delta:number):void {
  if(this.hp<=0)return;if(!this.canAct()){this.lifecycleGap=true;return;}
  if(this.lifecycleGap){this.phase=resumeChargeTell(this.phase);if(this.phase==='warn')this.until=this.clockMs+850;this.lifecycleGap=false;}
  this.clockMs+=cappedActorDeltaMs(delta,true);const now=this.clockMs,p=this.player;
  if(!this.engaged){if(p.sprite.x<this.left+100)return;this.engaged=true;this.until=now+1600/1.44;this.name.setVisible(true);this.barFrame.setVisible(true);this.barFill.setVisible(true);}
  if(this.lastBarHp!==this.hp){this.lastBarHp=this.hp;this.barFill.setCrop(0,0,535*this.hp/10,188);}
  this.warning.clear();
  if(now>=this.until){
   if(this.phase==='idle'||this.phase==='rest'){this.phase='warn';this.until=now+850;this.direction=p.sprite.x<this.image.x?-1:1;}
   else if(this.phase==='warn'){this.phase='charge';this.until=now+1600;}
   else{this.phase='rest';this.until=now+1600/1.44;}
  }
  if(this.phase==='charge'){
   this.image.x=Phaser.Math.Clamp(this.image.x+this.direction*Math.min(350,280*1.44)*Math.min(delta,50)/1000,this.left+130,this.right-130);
   if(this.image.x===this.left+130||this.image.x===this.right-130){this.phase='rest';this.until=now+1600/1.44;}
  }
  if(this.phase==='warn'){
   this.warning.lineStyle(3,0xe77755,.7).lineBetween(this.image.x,356,this.image.x+this.direction*430,356);this.image.setAngle(this.direction*7);
  }else this.image.setAngle(this.phase==='charge'?Math.sin(now*.025)*2:Math.sin(now*.004));
  const lean=this.phase==='warn'?1: this.phase==='charge'?.94:1,breath=this.phase==='rest'?1+Math.sin(now*.004)*.012:1;this.image.setDisplaySize(230*lean,180*breath).setY(360);
  this.image.setFlipX(this.direction<0).setAlpha(now<this.hurtUntil?.65:1);
  const x=this.image.x,contact={left:x-69,right:x+69,top:245,bottom:360};
  showHitbox(this.scene,'danger',contact);showHitbox(this.scene,'target',this.hittable);
  const touching=rectsOverlap(p.body,contact);
  const stomp=touching&&p.body.velocity.y>0&&p.body.prev.y+p.body.height<=268;
  if(!this.checkDash(p)){
   if(stomp){this.damage(1);p.bounceFromStomp();}
   else if(touching&&!p.isDashing&&now>=this.hurtUntil)p.takeDamage(this.image.x,.5);
  }
  if(this.cake.isThrown&&Math.abs(this.cake.sprite.x-this.image.x)<105&&Math.abs(this.cake.sprite.y-295)<80&&this.cake.registerEnemyHit())this.damage(1);
 }
 private get hittable():Rect{return {left:this.image.x-62,right:this.image.x+62,top:245,bottom:360};}
 protected dashBounds():Rect|null{return this.hp>0&&this.canAct()&&!this.lifecycleGap?this.hittable:null;}
 protected onDash():void{this.damage(1,false);}
 private damage(amount:number,spark=true):boolean {
  const now=this.clockMs;if(!this.canAct()||this.lifecycleGap||this.hp<=0||now<this.hurtUntil)return false;
  if(spark)hitSpark(this.scene,this.image.x,295,1.4);
  this.hp=Math.max(0,this.hp-amount);this.hurtUntil=now+700;this.phase='rest';this.until=now+1400;
  if(this.hp===0){
   this.player.chargeUltimate(50);this.barFill.setVisible(false);this.barFrame.setVisible(false);this.name.destroy();this.warning.clear();
   this.scene.tweens.add({targets:this.image,alpha:0,y:375,angle:-10,duration:1000,onComplete:()=>this.image.destroy()});this.defeated();
  }return true;
 }
}
