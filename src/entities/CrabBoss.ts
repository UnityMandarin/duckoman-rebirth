import Phaser from 'phaser';
import type {Player} from './Player';
import {CRAB_RULES,crabDamage,pillarTargets} from '../systems/CrabRules';

/** Independent attack and pillar clocks: hitting the shell never postpones a volley. */
export class CrabBoss {
 hp:number=CRAB_RULES.hp;
 readonly image:Phaser.GameObjects.Container;
 private shell:Phaser.GameObjects.Image;
 private claws:Phaser.GameObjects.Image[];
 private warnings:Phaser.GameObjects.Graphics;
 private bar:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 private pillars:Phaser.GameObjects.Image[]=[];
 private engaged=false;
 private nextVolley=0;
 private volleyAt=-Infinity;
 private hurtUntil=0;
 private phase:'rest'|'windup'|'swing'|'charge'='rest';
 private until=0;
 private direction=1;
 constructor(private scene:Phaser.Scene,private player:Player,private left:number,private right:number,private defeated:()=>void){
  const shadow=scene.add.ellipse(0,0,240,24,0x080306,.65);
  const atlas=scene.textures.get('crimson-crab');
  if(!atlas.has('body')){atlas.add('body',0,0,0,1140,658);atlas.add('claw',0,750,658,786,366);}
  this.shell=scene.add.image(0,-78,'crimson-crab','body').setDisplaySize(280,162);
  this.claws=[-1,1].map(sign=>scene.add.image(sign*60,-70,'crimson-crab','claw').setOrigin(sign===1?0:1,.5).setDisplaySize(143,67).setFlipX(sign<0));
  this.image=scene.add.container(left+760,350,[shadow,...this.claws,this.shell]).setDepth(12);
  this.warnings=scene.add.graphics().setDepth(9);
  this.bar=scene.add.graphics().setScrollFactor(0).setDepth(51);
  this.name=scene.add.text(518,18,'CRIMSON CLAW · 20 / 20',{fontSize:'10px',color:'#ffc5b4'}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  for(let i=0;i<4;i++)this.pillars.push(scene.add.image(0,-400,'rock-pillar-kit','pillar').setDisplaySize(62,260).setTint(0xf06169).setDepth(13).setVisible(false));
  const strike=()=>{if(this.engaged&&Math.abs(player.sprite.x-this.image.x)<230&&Math.abs(player.sprite.y-290)<140)this.damage('ultimate');};
  scene.events.on('ultimate-strike',strike);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off('ultimate-strike',strike));
  this.draw(0);
 }
 update(delta:number):void{
  if(this.hp<=0||!this.player.active)return;
  const now=this.scene.time.now,p=this.player;
  if(!this.engaged){if(p.sprite.x<this.left+100)return;this.engaged=true;this.nextVolley=now+CRAB_RULES.pillarInterval;this.until=now+1100;this.name.setVisible(true);}
  this.bar.clear().fillStyle(0x1b080e,.95).fillRoundedRect(411,32,216,17,4).lineStyle(1,0xea7770).strokeRoundedRect(411,32,216,17,4).fillStyle(0xd54050).fillRect(415,36,208*this.hp/20,9);
  if(now>=this.nextVolley){
   this.volleyAt=now;this.nextVolley+=CRAB_RULES.pillarInterval;
   pillarTargets(p.sprite.x,this.left,this.right).forEach((x,i)=>this.pillars[i].setPosition(x,-400).setVisible(true));
  }
  const age=now-this.volleyAt;this.warnings.clear();
  for(const pillar of this.pillars){
   if(age<CRAB_RULES.warningMs){
    this.warnings.lineStyle(2,0xffb3a1,.85).lineBetween(pillar.x,-120,pillar.x,360).fillStyle(0xff334d,.6).fillEllipse(pillar.x,357,72,10);
   }else if(age<CRAB_RULES.clearMs){
    const t=Math.min(1,(age-CRAB_RULES.warningMs)/CRAB_RULES.fallMs);pillar.y=Phaser.Math.Linear(-400,230,t*t);
    if(p.body.right>pillar.x-31&&p.body.left<pillar.x+31&&p.body.bottom>pillar.y-130&&p.body.top<pillar.y+130)p.takeDamage(pillar.x,.5);
   }else pillar.setVisible(false);
  }
  if(now>=this.until){
   if(this.phase==='rest'){this.phase='windup';this.direction=p.sprite.x<this.image.x?-1:1;this.until=now+800;}
   else if(this.phase==='windup'){this.phase='swing';this.until=now+450;}
   else if(this.phase==='swing'){this.phase='charge';this.until=now+700;}
   else{this.phase='rest';this.until=now+1100;}
  }
  if(this.phase==='charge')this.image.x=Phaser.Math.Clamp(this.image.x+this.direction*308*Math.min(delta,50)/1000,this.left+150,this.right-150);
  if(this.phase==='windup')this.warnings.lineStyle(4,0xffc073,.85).lineBetween(this.image.x,345,this.image.x+this.direction*220,345);
  const dx=p.sprite.x-this.image.x;
  if(Math.abs(dx)<100&&p.body.bottom>260&&p.body.top<350){
   if(p.isDashing)this.damage('dash');else p.takeDamage(this.image.x,.5);
  }
  if(this.phase==='swing'&&dx*this.direction>0&&Math.abs(dx)<225&&p.body.bottom>240&&p.body.top<350)p.takeDamage(this.image.x,.5);
  this.draw(now);this.image.setAlpha(now<this.hurtUntil?.65:1);
 }
 private draw(now:number):void{
  this.shell.setY(-78+Math.sin(now*(this.phase==='charge'?.023:.004))*2);
  this.claws.forEach((claw,i)=>{
   const sign=i===0?-1:1,active=sign===this.direction;
   const angle=active&&this.phase==='windup'?-sign*52:active&&this.phase==='swing'?sign*12:sign*5;
   claw.setAngle(angle).setX(sign*(active&&this.phase==='swing'?83:60)).setY(-70);
  });
 }
 private damage(attack:'dash'|'ultimate'):void{
  const now=this.scene.time.now;if(this.hp<=0||now<this.hurtUntil)return;
  this.hp=Math.max(0,this.hp-crabDamage(attack));this.hurtUntil=now+500;
  this.name.setText(`CRIMSON CLAW · ${this.hp} / 20`);
  if(attack==='dash')this.player.chargeUltimate(5);
  if(this.hp===0){this.bar.clear();this.name.destroy();this.warnings.clear();this.pillars.forEach(p=>p.destroy());this.scene.tweens.add({targets:this.image,alpha:0,angle:9,duration:900});this.defeated();}
 }
}
