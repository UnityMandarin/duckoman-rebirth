import Phaser from 'phaser';
import type {Player} from './Player';
import type {ThrowableObject} from './ThrowableObject';

/** Telegraph, committed charge, recovery: readable attacks without teleportation. */
export class AntlerRegent {
 readonly image:Phaser.GameObjects.Image;
 hp=10;
 private phase:'idle'|'warn'|'charge'|'rest'='idle';
 private until=0;
 private direction=1;
 private hurtUntil=0;
 private engaged=false;
 private bar:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 private warning:Phaser.GameObjects.Graphics;
 constructor(private scene:Phaser.Scene,private player:Player,private cake:ThrowableObject,private left:number,private right:number,private defeated:()=>void){
  this.image=scene.add.image(left+750,360,'antler-regent').setOrigin(.5,1).setDisplaySize(230,180).setDepth(12);
  this.bar=scene.add.graphics().setScrollFactor(0).setDepth(51);
  this.name=scene.add.text(520,19,'THE BROKEN REGENT',{fontSize:'10px',color:'#dcc398'}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  this.warning=scene.add.graphics().setDepth(8);
  const strike=()=>{if(this.engaged&&Math.abs(player.sprite.x-this.image.x)<230&&player.sprite.y>140)this.damage(4);};
  scene.events.on('ultimate-strike',strike);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off('ultimate-strike',strike));
 }
 update(delta:number):void {
  if(this.hp<=0||!this.player.active)return;
  const now=this.scene.time.now,p=this.player;
  if(!this.engaged){if(p.sprite.x<this.left+100)return;this.engaged=true;this.until=now+1600;this.name.setVisible(true);}
  this.bar.clear().fillStyle(0x0b1115,.9).fillRoundedRect(411,32,216,17,4).lineStyle(1,0xb59458).strokeRoundedRect(411,32,216,17,4);
  this.bar.fillStyle(0x726440).fillRoundedRect(415,36,208*this.hp/10,9,3).fillStyle(0xe9c375).fillRect(415,36,208*this.hp/10,2);
  this.warning.clear();
  if(now>=this.until){
   if(this.phase==='idle'||this.phase==='rest'){this.phase='warn';this.until=now+850;this.direction=p.sprite.x<this.image.x?-1:1;}
   else if(this.phase==='warn'){this.phase='charge';this.until=now+1600;}
   else{this.phase='rest';this.until=now+1600;}
  }
  if(this.phase==='charge'){
   this.image.x=Phaser.Math.Clamp(this.image.x+this.direction*280*Math.min(delta,50)/1000,this.left+130,this.right-130);
   if(this.image.x===this.left+130||this.image.x===this.right-130){this.phase='rest';this.until=now+1600;}
  }
  if(this.phase==='warn'){
   this.warning.lineStyle(3,0xe77755,.7).lineBetween(this.image.x,356,this.image.x+this.direction*430,356);this.image.setAngle(this.direction*7);
  }else this.image.setAngle(this.phase==='charge'?Math.sin(now*.025)*2:Math.sin(now*.004));
  this.image.setFlipX(this.direction<0).setAlpha(now<this.hurtUntil?.65:1);
  if(Math.abs(p.sprite.x-this.image.x)<92&&p.body.bottom>245){
   const stomp=p.body.velocity.y>0&&p.body.prev.y+p.body.height<=268;
   if(p.isDashing||stomp){this.damage(1);if(stomp)p.bounceFromStomp();}
   else if(now>=this.hurtUntil)p.takeDamage(this.image.x,.5);
  }
  if(this.cake.isThrown&&Math.abs(this.cake.sprite.x-this.image.x)<105&&Math.abs(this.cake.sprite.y-295)<80&&this.cake.registerEnemyHit())this.damage(1);
 }
 private damage(amount:number):boolean {
  const now=this.scene.time.now;if(this.hp<=0||now<this.hurtUntil)return false;
  this.hp=Math.max(0,this.hp-amount);this.hurtUntil=now+700;this.phase='rest';this.until=now+1400;
  if(this.hp===0){
   this.player.chargeUltimate(50);this.bar.clear();this.name.destroy();this.warning.clear();
   this.scene.tweens.add({targets:this.image,alpha:0,y:375,angle:-10,duration:1000,onComplete:()=>this.image.destroy()});this.defeated();
  }return true;
 }
}
