import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { Player } from './Player';
import { approach } from '../utils/approach';

export type ThrowableState = 'IDLE' | 'CARRIED' | 'THROWN';

export class ThrowableObject {
  readonly sprite: Phaser.GameObjects.Arc;
  readonly body: Phaser.Physics.Arcade.Body;
  state: ThrowableState = 'IDLE';
  private readonly spawn: Phaser.Math.Vector2;
  private hasHitEnemyThisThrow = false;
  private settledSince: number | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.spawn = new Phaser.Math.Vector2(x, y);
    this.sprite = scene.add.circle(x, y, TUNING.throwable.radius, 0xffca28);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(TUNING.throwable.radius);
    this.body.setGravityY(TUNING.throwable.gravity);
    this.body.setBounce(TUNING.throwable.bounce);
    this.body.setCollideWorldBounds(true);
  }

  get isIdle(): boolean { return this.state === 'IDLE'; }
  get isThrown(): boolean { return this.state === 'THROWN'; }

  carry(player: Player): void {
    if (!this.isIdle) return;
    this.state = 'CARRIED';
    this.body.setVelocity(0, 0).setEnable(false);
    this.follow(player);
  }

  follow(player: Player): void {
    if (this.state !== 'CARRIED') return;
    this.sprite.setPosition(player.sprite.x + player.facing * TUNING.throwable.carryOffset.x, player.sprite.y + TUNING.throwable.carryOffset.y);
  }

  throw(player: Player): void {
    if (this.state !== 'CARRIED') return;
    const component = Math.cos(Phaser.Math.DegToRad(TUNING.throwable.launchAngleDegrees)) * TUNING.throwable.launchSpeed;
    this.state = 'THROWN';
    this.hasHitEnemyThisThrow = false;
    this.settledSince = undefined;
    this.body.setEnable(true).setVelocity(player.facing * component, -component);
  }

  registerEnemyHit(): boolean {
    if (!this.isThrown || this.hasHitEnemyThisThrow) return false;
    this.hasHitEnemyThisThrow = true;
    this.body.setVelocity(this.body.velocity.x * TUNING.throwable.enemyHitVelocityMultiplier, this.body.velocity.y * TUNING.throwable.enemyHitVelocityMultiplier);
    return true;
  }

  update(deltaMs: number): void {
    if (!this.isThrown) return;
    if (this.body.blocked.down) {
      this.body.setVelocityX(approach(this.body.velocity.x, 0, TUNING.throwable.groundDeceleration * (deltaMs / 1000)));
      if (this.body.velocity.length() < TUNING.throwable.settleSpeed) {
        this.settledSince ??= this.sprite.scene.time.now;
        if (this.sprite.scene.time.now - this.settledSince >= TUNING.throwable.settleDuration) this.toIdle();
      } else this.settledSince = undefined;
    }
    const bounds = this.sprite.scene.physics.world.bounds;
    if (!Phaser.Geom.Rectangle.ContainsPoint(bounds, new Phaser.Math.Vector2(this.sprite.x, this.sprite.y))) this.resetToSpawn();
  }

  drop(): void { if (this.state === 'CARRIED') this.toIdle(); }

  private toIdle(): void {
    this.state = 'IDLE';
    this.body.setEnable(true).setVelocity(0, 0);
    this.settledSince = undefined;
  }

  private resetToSpawn(): void {
    this.sprite.setPosition(this.spawn.x, this.spawn.y);
    this.toIdle();
  }
}
