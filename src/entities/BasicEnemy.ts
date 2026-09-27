import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type {Player} from './Player';
import type {Rect} from '../systems/contactRules';
import {hitSpark} from '../systems/HitSpark';
import type {KillImpulse} from '../systems/debrisMath';
import {scatterDebris} from '../systems/DebrisBurst';
import {Dashable} from './Dashable';
import {tagBody} from '../systems/DebugHitboxes';

const SPIKE={bodyWidth:46,bodyHeight:84,spikeWidth:10,spikeHeight:22,displayHeight:84,displayWidth:59};

export class BasicEnemy extends Dashable {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  private direction: -1 | 1 = -1;
  defeated = false;
  hp=1;
  private hurtUntil=0;
  readonly pointed: boolean;
  readonly jumper: boolean;
  private readonly cleanup:()=>void;
  private jumpAt=0;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly patrol?: { left: number; right: number }, pointed=false, jumper=false, private readonly skin?:string) {
    super();
    this.pointed=pointed;
    this.jumper=jumper;
    this.sprite = scene.add.rectangle(x, y, TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight, 0xef5350);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, skin??(pointed?'spike-robot':jumper?'jumper-robot':'robot')).setDepth(5);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight);
    if(pointed)this.body.setSize(SPIKE.bodyWidth,SPIKE.bodyHeight,false).setOffset((TUNING.enemy.bodyWidth-SPIKE.bodyWidth)/2,TUNING.enemy.bodyHeight-SPIKE.bodyHeight);
    if(jumper)this.body.setSize(42,76,false).setOffset(4,-26);
    if(skin)this.body.setSize(jumper?46:68,jumper?64:48,false).setOffset(jumper?2:-9,jumper?-14:2);
    tagBody(this.sprite,'danger',()=>this.hurtboxes);
    this.body.setGravityY(TUNING.enemy.gravity);
    this.body.setMaxVelocity(TUNING.enemy.moveSpeed, TUNING.enemy.maxFallVelocity);
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    this.cleanup=()=>scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
    const strike=(player:Player)=>{
      if(!this.defeated&&this.body.enable&&Math.abs(this.sprite.x-player.sprite.x)<180&&Math.abs(this.sprite.y-player.sprite.y)<120){
        const dx=this.sprite.x-player.sprite.x,dy=this.sprite.y-player.sprite.y,len=Math.hypot(dx,dy)||1;
        if(this.hit(2,{x:dx/len*500,y:dy/len*500}))player.chargeUltimate(10);
      }
    };
    scene.events.on('ultimate-strike',strike);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off('ultimate-strike',strike));
  }

  setAwake(awake:boolean):void {
    if(this.defeated)return;
    this.body.setEnable(awake);this.visual.setVisible(awake);
  }

  update(autoJump=true): void {
    if (this.defeated) return;
    if (this.body.blocked.left) this.direction = 1;
    if (this.body.blocked.right) this.direction = -1;
    if (this.patrol && this.sprite.x <= this.patrol.left) this.direction = 1;
    if (this.patrol && this.sprite.x >= this.patrol.right) this.direction = -1;
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    const now=this.sprite.scene.time.now;
    if(autoJump&&this.jumper&&this.body.blocked.down&&now>=this.jumpAt){
      this.body.setVelocityY(TUNING.player.jumpVelocity);this.jumpAt=now+1600;
    }
  }

  /** Solid hurt regions: the torso, plus the single spike on a pointed robot's head. */
  get hurtboxes(): Rect[] {
    const b=this.body;
    if(!this.pointed)return [{left:b.left,right:b.right,top:b.top,bottom:b.bottom}];
    const spikeBottom=b.top+SPIKE.spikeHeight,cx=b.center.x;
    return [
      {left:cx-SPIKE.spikeWidth/2,right:cx+SPIKE.spikeWidth/2,top:b.top,bottom:spikeBottom},
      {left:b.left,right:b.right,top:spikeBottom,bottom:b.bottom}
    ];
  }

  protected dashBounds(): Rect | null {
    if(this.defeated||!this.body.enable)return null;
    const b=this.body;
    return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
  }

  protected onDash(player: Player, impulse: KillImpulse): void {
    if(this.hit(1,impulse,false))player.chargeUltimate(10);
  }

  /** `spark` is off for dash hits, which already spark at the contact point. */
  hit(amount=1,impulse?:KillImpulse,spark=true):boolean {
    const now=this.sprite.scene.time.now;
    if(this.defeated||now<this.hurtUntil)return false;
    this.hp=Math.max(0,this.hp-amount);this.hurtUntil=now+400;
    if(spark)hitSpark(this.sprite.scene,this.body.center.x,this.body.center.y);
    if(this.hp===0)this.defeat(impulse);
    else {this.visual.setAlpha(.4);this.sprite.scene.tweens.add({targets:this.visual,alpha:1,duration:400});}
    return true;
  }

  defeat(impulse?:KillImpulse): void {
    if (this.defeated) return;
    this.defeated = true;
    this.sprite.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    this.sprite.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
    this.body.setEnable(false);
    this.sprite.setVisible(false);
    const scene=this.sprite.scene,x=this.visual.x,y=this.visual.y;
    const cracks=scene.add.graphics().setDepth(15).lineStyle(2,0xffd576)
      .lineBetween(x-20,y-24,x+4,y-4).lineBetween(x+4,y-4,x-8,y+15).lineBetween(x+4,y-4,x+25,y+8);
    const shove=impulse?{x:impulse.x*.05,y:impulse.y*.05}:{x:0,y:0};
    scene.tweens.add({targets:[this.visual,cracks],alpha:0,x:`+=${shove.x}`,y:`+=${shove.y}`,duration:120,onComplete:()=>{this.visual.destroy();cracks.destroy();}});
    const gears=[];
    for(let i=0;i<7;i++){
      const gear=scene.add.graphics().setPosition(x,y).setDepth(15);
      gear.fillStyle(i%2?0xa88348:0x788896).fillCircle(0,0,this.skin?3:5).fillStyle(0x162231).fillCircle(0,0,2);
      if(!this.skin)for(let j=0;j<8;j++){const a=j*Math.PI/4;gear.fillStyle(0xa88348).fillRect(Math.cos(a)*5-1,Math.sin(a)*5-1,3,3);}
      gears.push(gear);
    }
    scatterDebris(scene,gears,impulse);
    this.sprite.scene.time.delayedCall(0, () => this.sprite.destroy());
  }

  private syncVisual(): void {
    if (this.defeated || !this.body.enable) return;
    const phase = this.sprite.scene.time.now * 0.012;
    if(Math.abs(this.body.velocity.x)>1)this.direction=this.body.velocity.x>0?1:-1;
    const width=this.skin?(this.jumper?110:100):this.pointed?SPIKE.displayWidth:this.jumper?72:88;
    const height=this.skin?width/1.5:this.pointed?SPIKE.displayHeight:this.jumper?108:88;
    this.visual.setDisplaySize(width, height + Math.sin(phase) * (this.jumper?5:2));
    this.visual.setPosition(this.sprite.x, this.sprite.y - 2 + Math.sin(phase * 2) * 1.4).setFlipX(this.skin||this.pointed?this.direction<0:this.direction>0);
    if(this.skin||this.pointed)this.visual.setY(this.body.bottom-height/2+Math.sin(phase*2));
    this.visual.setRotation(Math.sin(phase) * (this.jumper?0.055:0.035));
  }
}
