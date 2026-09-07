import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { InputSnapshot } from '../systems/InputController';
import { JumpAssist } from '../systems/JumpAssist';
import { approach } from '../utils/approach';

export type PlayerLifeState = 'ACTIVE' | 'HURT' | 'DEAD';

export class Player {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly jumpAssist = new JumpAssist();
  lifeState: PlayerLifeState = 'ACTIVE';
  facing: -1 | 1 = 1;
  health: number = TUNING.player.maxHealth;
  private hurtUntil = 0;
  private invulnerableUntil = 0;
  private jumpCutAvailable = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TUNING.player.bodyWidth, TUNING.player.bodyHeight, 0x4fc3f7);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.player.bodyWidth, TUNING.player.bodyHeight);
    this.body.setGravityY(TUNING.player.gravity);
    this.body.setMaxVelocity(TUNING.player.maxRunSpeed, TUNING.player.maxFallVelocity);
    this.body.setCollideWorldBounds(true);
  }

  get active(): boolean { return this.lifeState !== 'DEAD'; }
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }
  get invulnerable(): boolean { return this.sprite.scene.time.now < this.invulnerableUntil; }

  update(input: InputSnapshot, deltaMs: number): void {
    const now = this.sprite.scene.time.now;
    if (this.grounded) this.jumpAssist.recordGrounded(now);
    if (!this.active) return;
    if (this.lifeState === 'HURT' && now >= this.hurtUntil) this.lifeState = 'ACTIVE';
    this.sprite.setAlpha(this.invulnerable ? 0.5 : 1);
    if (input.jumpPressed) this.jumpAssist.recordPress(now);
    if (this.lifeState === 'HURT') return;

    if (input.horizontal !== 0) this.facing = input.horizontal;
    const deltaSeconds = deltaMs / 1000;
    const velocityX = this.body.velocity.x;
    if (input.horizontal === 0) {
      const deceleration = this.grounded ? TUNING.player.groundDeceleration : 0;
      this.body.setVelocityX(approach(velocityX, 0, deceleration * deltaSeconds));
    } else {
      const turning = Math.sign(velocityX) !== 0 && Math.sign(velocityX) !== input.horizontal;
      const acceleration = this.grounded
        ? turning ? TUNING.player.turnAcceleration : TUNING.player.groundAcceleration
        : TUNING.player.airAcceleration;
      this.body.setVelocityX(approach(velocityX, input.horizontal * TUNING.player.maxRunSpeed, acceleration * deltaSeconds));
    }

    if (this.jumpAssist.canJump(now, TUNING.player.coyoteTime) && this.jumpAssist.consumeBufferedPress(now, TUNING.player.jumpBufferTime)) {
      this.body.setVelocityY(TUNING.player.jumpVelocity);
      this.jumpCutAvailable = true;
    }
    if (input.jumpReleased && this.jumpCutAvailable && this.body.velocity.y < 0) {
      this.body.setVelocityY(this.body.velocity.y * TUNING.player.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    if (this.body.velocity.y >= 0) this.jumpCutAvailable = false;
  }

  bounceFromStomp(): void { this.body.setVelocityY(TUNING.player.stompBounceVelocity); }

  takeDamage(attackerX: number): boolean {
    const now = this.sprite.scene.time.now;
    if (!this.active || this.invulnerable) return false;
    this.health = Math.max(0, this.health - TUNING.player.contactDamage);
    this.hurtUntil = now + TUNING.player.hurtLockTime;
    this.invulnerableUntil = now + TUNING.player.invulnerabilityTime;
    this.lifeState = this.health === 0 ? 'DEAD' : 'HURT';
    const direction = this.sprite.x < attackerX ? -1 : 1;
    this.body.setAcceleration(0, 0).setVelocity(direction * TUNING.player.damageKnockback.x, TUNING.player.damageKnockback.y);
    if (this.lifeState === 'DEAD') {
      this.body.setVelocity(0, 0).setEnable(false);
      this.sprite.setAlpha(0.35);
    }
    return true;
  }
}
