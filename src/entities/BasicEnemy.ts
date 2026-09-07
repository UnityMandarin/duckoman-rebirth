import Phaser from 'phaser';
import { TUNING } from '../config/tuning';

export class BasicEnemy {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  private direction: -1 | 1 = -1;
  defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight, 0xef5350);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, 'robot').setDisplaySize(54, 54).setDepth(5);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight);
    this.body.setGravityY(TUNING.enemy.gravity);
    this.body.setMaxVelocity(TUNING.enemy.moveSpeed, TUNING.enemy.maxFallVelocity);
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this));
  }

  update(): void {
    if (this.defeated) return;
    if (this.body.blocked.left) this.direction = 1;
    if (this.body.blocked.right) this.direction = -1;
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
  }

  defeat(): void {
    if (this.defeated) return;
    this.defeated = true;
    this.body.setEnable(false);
    this.sprite.setVisible(false);
    this.visual.setVisible(false);
    this.sprite.scene.time.delayedCall(0, () => { this.sprite.destroy(); this.visual.destroy(); });
  }

  private syncVisual(): void {
    if (this.defeated) return;
    const phase = this.sprite.scene.time.now * 0.012;
    this.visual.setDisplaySize(88, 88 + Math.sin(phase) * 2);
    this.visual.setPosition(this.sprite.x, this.sprite.y - 2 + Math.sin(phase * 2) * 1.4).setFlipX(this.direction > 0);
    this.visual.setRotation(Math.sin(phase) * 0.035);
  }
}
