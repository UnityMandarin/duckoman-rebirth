import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { InputSnapshot } from '../systems/InputController';
import { JumpAssist } from '../systems/JumpAssist';
import { PlayerAbilities } from '../systems/PlayerAbilities';

export type PlayerLifeState = 'ACTIVE' | 'HURT' | 'DEAD';

export class Player {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly jumpAssist = new JumpAssist();
  readonly abilities = new PlayerAbilities({
    dashCooldown: TUNING.player.dashCooldown,
    maxStamina: TUNING.player.maxStamina,
    dashStaminaCost: TUNING.player.dashStaminaCost,
    staminaRegenAmount: TUNING.player.staminaRegenAmount,
    staminaRegenInterval: TUNING.player.staminaRegenInterval,
    sprintStaminaCost: TUNING.player.sprintStaminaCost,
    sprintStaminaInterval: TUNING.player.sprintStaminaInterval
  });
  lifeState: PlayerLifeState = 'ACTIVE';
  facing: -1 | 1 = 1;
  health: number = TUNING.player.maxHealth;
  private hurtUntil = 0;
  private invulnerableUntil = 0;
  private jumpCutAvailable = false;
  private crouching = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TUNING.player.bodyWidth, TUNING.player.bodyHeight, 0x4fc3f7);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, 'duckoman').setDisplaySize(66, 60).setDepth(5);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.player.bodyWidth, TUNING.player.bodyHeight);
    this.body.setGravityY(TUNING.player.gravity);
    this.body.setMaxVelocity(TUNING.player.dashSpeed, TUNING.player.maxFallVelocity);
    this.body.setCollideWorldBounds(true);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this));
  }

  get active(): boolean { return this.lifeState !== 'DEAD'; }
  get canAct(): boolean { return this.lifeState === 'ACTIVE'; }
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }
  get invulnerable(): boolean { return this.sprite.scene.time.now < this.invulnerableUntil; }
  get stamina(): number { return this.abilities.stamina; }
  get boostReady(): boolean { return this.abilities.boostReady(this.sprite.scene.time.now); }
  get isDashing(): boolean { return this.abilities.isDashing(this.sprite.scene.time.now); }
  get sprinting(): boolean { return this.abilities.sprinting; }

  update(input: InputSnapshot, _deltaMs: number): void {
    const now = this.sprite.scene.time.now;
    this.abilities.update(now);
    if (this.grounded) {
      this.jumpAssist.recordGrounded(now);
      this.abilities.landSlam(now, TUNING.player.slamBoostWindow);
    }
    if (!this.active) return;
    if (this.lifeState === 'HURT' && now >= this.hurtUntil) this.lifeState = 'ACTIVE';
    this.visual.setAlpha(this.invulnerable ? 0.55 : 1);
    if (input.jumpPressed) this.jumpAssist.recordPress(now);
    if (!this.canAct) return;

    if (input.horizontal !== 0) this.facing = input.horizontal;
    this.setCrouching(this.grounded && input.down);

    if (input.sprintPressed) this.abilities.toggleSprint(now);

    if (input.dashPressed && this.abilities.tryStartDash(now, TUNING.player.dashDuration)) {
      this.setCrouching(false);
    }

    if (!this.grounded && input.downPressed) {
      this.abilities.startSlam();
      this.body.setVelocity(this.body.velocity.x * 0.35, TUNING.player.slamVelocity);
    }

    if (this.abilities.isDashing(now)) {
      this.body.setVelocityX(this.facing * TUNING.player.dashSpeed);
    } else if (this.crouching) {
      this.body.setVelocityX(0);
    } else {
      const moveSpeed = this.abilities.sprinting ? TUNING.player.sprintSpeed : TUNING.player.maxRunSpeed;
      this.body.setVelocityX(input.horizontal * moveSpeed);
    }

    if (!this.abilities.slamming && this.jumpAssist.canJump(now, TUNING.player.coyoteTime) && this.jumpAssist.consumeBufferedPress(now, TUNING.player.jumpBufferTime)) {
      this.jumpAssist.consumeGrounded();
      this.body.setVelocityY(this.abilities.consumeBoost(now) ? TUNING.player.boostedJumpVelocity : TUNING.player.jumpVelocity);
      this.setCrouching(false);
      this.jumpCutAvailable = true;
    }
    if (input.jumpReleased && this.jumpCutAvailable && this.body.velocity.y < 0) {
      this.body.setVelocityY(this.body.velocity.y * TUNING.player.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    if (this.body.velocity.y >= 0) this.jumpCutAvailable = false;
  }

  bounceFromStomp(): void {
    this.abilities.cancelTransient();
    this.body.setVelocityY(TUNING.player.stompBounceVelocity);
  }

  takeDamage(attackerX: number): boolean {
    const now = this.sprite.scene.time.now;
    if (!this.active || this.invulnerable) return false;
    this.health = Math.max(0, this.health - TUNING.player.contactDamage);
    this.hurtUntil = now + TUNING.player.hurtLockTime;
    this.invulnerableUntil = now + TUNING.player.invulnerabilityTime;
    this.lifeState = this.health === 0 ? 'DEAD' : 'HURT';
    this.abilities.cancelTransient();
    this.setCrouching(false);
    const direction = this.sprite.x < attackerX ? -1 : 1;
    this.body.setAcceleration(0, 0).setVelocity(direction * TUNING.player.damageKnockback.x, TUNING.player.damageKnockback.y);
    if (this.lifeState === 'DEAD') {
      this.body.setVelocity(0, 0).setEnable(false);
      this.visual.setAlpha(0.35);
    }
    return true;
  }

  private setCrouching(value: boolean): void {
    if (this.crouching === value) return;
    this.crouching = value;
  }

  private syncVisual(): void {
    const height = this.crouching ? 42 : 60;
    const moving = this.canAct && this.grounded && !this.crouching && Math.abs(this.body.velocity.x) > 1;
    const phase = this.sprite.scene.time.now * (this.sprinting ? 0.022 : 0.016);
    const bounce = moving ? Math.abs(Math.sin(phase)) * 2 : 0;
    this.visual.setPosition(this.sprite.x, this.sprite.y + (this.crouching ? 13 : 6) - bounce);
    this.visual.setDisplaySize(66 + bounce * 0.5, height - bounce * 0.6).setFlipX(this.facing < 0);
    this.visual.setRotation(moving ? Math.sin(phase) * 0.045 : 0);
  }
}
