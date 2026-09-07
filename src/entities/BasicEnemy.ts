import Phaser from 'phaser';
import { TUNING } from '../config/tuning';

export class BasicEnemy {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private direction: -1 | 1 = -1;
  defeated = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight, 0xef5350);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight);
    this.body.setGravityY(TUNING.enemy.gravity);
    this.body.setMaxVelocity(TUNING.enemy.moveSpeed, TUNING.enemy.maxFallVelocity);
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
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
    this.sprite.scene.time.delayedCall(0, () => this.sprite.destroy());
  }
}
