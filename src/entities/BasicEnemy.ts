import Phaser from 'phaser';
import { TUNING } from '../config/tuning';

export class BasicEnemy {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  private direction: -1 | 1 = -1;
  defeated = false;
  readonly pointed: boolean;
  readonly jumper: boolean;
  private readonly cleanup:()=>void;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly patrol?: { left: number; right: number }, pointed=false, jumper=false) {
    this.pointed=pointed;
    this.jumper=jumper;
    this.sprite = scene.add.rectangle(x, y, TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight, 0xef5350);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, pointed?'spike-robot':jumper?'jumper-robot':'robot').setDepth(5);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight);
    if(pointed)this.body.setSize(TUNING.enemy.bodyWidth,66,false).setOffset(0,-16);
    if(jumper)this.body.setSize(42,76,false).setOffset(4,-26);
    this.body.setGravityY(TUNING.enemy.gravity);
    this.body.setMaxVelocity(TUNING.enemy.moveSpeed, TUNING.enemy.maxFallVelocity);
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    this.cleanup=()=>scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
  }

  setAwake(awake:boolean):void {
    if(this.defeated)return;
    this.body.setEnable(awake);this.visual.setVisible(awake);
  }

  update(): void {
    if (this.defeated) return;
    if (this.body.blocked.left) this.direction = 1;
    if (this.body.blocked.right) this.direction = -1;
    if (this.patrol && this.sprite.x <= this.patrol.left) this.direction = 1;
    if (this.patrol && this.sprite.x >= this.patrol.right) this.direction = -1;
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
  }

  defeat(): void {
    if (this.defeated) return;
    this.defeated = true;
    this.sprite.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    this.sprite.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
    this.body.setEnable(false);
    this.sprite.setVisible(false);
    this.sprite.scene.tweens.add({targets:this.visual,scaleY:this.visual.scaleY*0.25,angle:this.direction*18,alpha:0,duration:220,onComplete:()=>this.visual.destroy()});
    this.sprite.scene.time.delayedCall(0, () => this.sprite.destroy());
  }

  private syncVisual(): void {
    if (this.defeated || !this.body.enable) return;
    const phase = this.sprite.scene.time.now * 0.012;
    const width=this.pointed?82:this.jumper?72:88;
    const height=this.pointed?82:this.jumper?108:88;
    this.visual.setDisplaySize(width, height + Math.sin(phase) * (this.jumper?5:2));
    this.visual.setPosition(this.sprite.x, this.sprite.y - 2 + Math.sin(phase * 2) * 1.4).setFlipX(this.direction > 0);
    this.visual.setRotation(Math.sin(phase) * (this.jumper?0.055:0.035));
  }
}
