import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { InputSnapshot } from '../systems/InputController';
import { JumpAssist } from '../systems/JumpAssist';
import { PlayerAbilities } from '../systems/PlayerAbilities';
import { AirTuck } from '../systems/AirTuck';

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
  infiniteHealth=false;
  ultimateCharge=0;
  ultimateUntil=0;
  get usingUltimate():boolean{return this.sprite.scene.time.now<this.ultimateUntil;}
  chargeUltimate(amount:number):void {this.ultimateCharge=Math.min(100,this.ultimateCharge+amount);}
  private hurtUntil = 0;
  private invulnerableUntil = 0;
  private jumpCutAvailable = false;
  private crouching = false;
  private readonly airTuck = new AirTuck();
  private lastGhostAt = -1000;
  private wasGrounded = false;
  private landedAt = -1000;
  private ghosts:Phaser.GameObjects.Image[]=[];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TUNING.player.bodyWidth, TUNING.player.bodyHeight, 0x4fc3f7);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, 'duckoman').setDisplaySize(66, 60).setDepth(10);
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
    if(this.usingUltimate){this.body.setVelocity(0,0);return;}
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
    this.setCrouching(input.down);

    if (input.sprintPressed) this.abilities.toggleSprint(now);

    if (input.dashPressed && this.abilities.tryStartDash(now, TUNING.player.dashDuration)) {
      this.setCrouching(false);
    }

    if (this.airTuck.update(this.grounded, input.downPressed)) {
      this.abilities.startSlam();
      this.body.setVelocity(this.body.velocity.x * 0.35, TUNING.player.slamVelocity);
    }

    if (this.abilities.isDashing(now)) {
      this.body.setVelocityX(this.facing * TUNING.player.dashSpeed);
    } else if (this.crouching && this.grounded) {
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

  takeDamage(attackerX: number, amount: number = TUNING.player.contactDamage): boolean {
    const now = this.sprite.scene.time.now;
    if (!this.active || this.infiniteHealth || this.usingUltimate || this.invulnerable) return false;
    this.health = Math.max(0, this.health - amount);
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
    const now = this.sprite.scene.time.now;
    if(!this.isDashing){this.ghosts.forEach(g=>{if(g.active)g.destroy();});this.ghosts=[];}
    if (this.grounded && !this.wasGrounded) this.landedAt = now;
    this.wasGrounded = this.grounded;
    const height = this.crouching ? 42 : 60;
    const moving = this.canAct && this.grounded && !this.crouching && Math.abs(this.body.velocity.x) > 1;
    const phase = this.sprite.scene.time.now * (this.sprinting ? 0.022 : 0.016);
    const bounce = moving ? Math.abs(Math.sin(phase)) * 2 : 0;
    this.visual.setPosition(this.sprite.x, this.sprite.y + (this.crouching ? 13 : 6) - bounce);
    this.visual.setDisplaySize(66 + bounce * 0.5, height - bounce * 0.6).setFlipX(this.facing < 0);
    this.visual.setRotation(moving ? Math.sin(phase) * 0.045 : 0);
    if (!this.crouching && this.canAct) {
      const squash = Math.max(0, 1 - (now - this.landedAt) / 140) * 4;
      if (squash > 0) this.visual.setDisplaySize(66 + squash, 60 - squash).setY(this.visual.y + squash / 2);
      else if (!this.grounded) this.visual.setRotation(Phaser.Math.Clamp(this.body.velocity.y / 5000, -0.1, 0.12) * this.facing);
    }
    if (this.lifeState === 'HURT') this.visual.setTint(0xffb6a0); else this.visual.clearTint();
    if (this.lifeState === 'DEAD') this.visual.setRotation(this.facing * 1.25);
    if (this.isDashing && this.canAct && now - this.lastGhostAt >= 35) {
      this.lastGhostAt = now;
      const ghost = this.sprite.scene.add.image(this.visual.x, this.visual.y, 'duckoman')
        .setDisplaySize(this.visual.displayWidth*1.3,this.visual.displayHeight*1.3).setFlipX(this.facing < 0)
        .setRotation(this.visual.rotation).setTint(0xffdb45).setAlpha(.62).setDepth(9);
      this.ghosts.push(ghost);
      this.sprite.scene.tweens.add({targets:ghost,alpha:0,scaleX:ghost.scaleX*1.12,scaleY:ghost.scaleY*1.12,duration:220,onComplete:()=>ghost.destroy()});
    }
  }
}
