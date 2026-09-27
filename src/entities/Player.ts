import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { InputSnapshot } from '../systems/InputController';
import { JumpAssist } from '../systems/JumpAssist';
import { PlayerAbilities } from '../systems/PlayerAbilities';
import { AirTuck } from '../systems/AirTuck';
import { circleIntersectsRect, type Circle, type Rect } from '../systems/contactRules';
import { tagBody } from '../systems/DebugHitboxes';
import { hitSpark } from '../systems/HitSpark';

export type PlayerLifeState = 'ACTIVE' | 'HURT' | 'DEAD';

export class Player {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  /** Invisible zone whose circular body is the dash hitbox. */
  readonly dashHitboxZone: Phaser.GameObjects.Zone;
  private readonly dashEffect: Phaser.GameObjects.Graphics;
  readonly jumpAssist = new JumpAssist();
  readonly abilities = new PlayerAbilities({ dashCooldown: TUNING.player.dashCooldown });
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
  private recoilUntil = 0;
  private jumpCutAvailable = false;
  private dashMomentum: -1 | 0 | 1 = 0;
  private dashStartedAt = -1000;
  private crouching = false;
  private readonly airTuck = new AirTuck();
  private lastGhostAt = -1000;
  private wasGrounded = false;
  private landedAt = -1000;
  private ghosts:Phaser.GameObjects.Image[]=[];
  private lastSweatAt=0;

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
    const radius = TUNING.player.dashHitboxRadius;
    this.dashHitboxZone = scene.add.zone(x, y, radius * 2, radius * 2);
    scene.physics.add.existing(this.dashHitboxZone);
    this.dashHitboxBody.setCircle(radius).setAllowGravity(false).setEnable(false);
    tagBody(this.sprite, 'hurtbox');
    tagBody(this.dashHitboxZone, 'attack');
    this.dashEffect = scene.add.graphics().setDepth(9.5).setVisible(false);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this));
  }

  get active(): boolean { return this.lifeState !== 'DEAD'; }
  get canAct(): boolean { return this.lifeState === 'ACTIVE'; }
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }
  get invulnerable(): boolean { return this.sprite.scene.time.now < this.invulnerableUntil; }
  get boostReady(): boolean { return this.abilities.boostReady(this.sprite.scene.time.now); }
  get dashDisabled(): boolean { return this.abilities.airDashSpent; }
  get dashCharge(): number { return this.abilities.dashCharge(this.sprite.scene.time.now); }
  get isDashing(): boolean { return this.abilities.isDashing(this.sprite.scene.time.now); }
  get sprinting(): boolean { return this.abilities.sprinting; }
  /** Objects that enemy overlaps should be registered against. */
  get enemyContactTargets(): Phaser.GameObjects.GameObject[] { return [this.sprite, this.dashHitboxZone]; }
  get dashVelocity(): { x: number; y: number } { return { x: this.facing * TUNING.player.dashSpeed, y: 0 }; }
  get dashHitbox(): Circle { return { x: this.body.center.x, y: this.body.center.y, radius: TUNING.player.dashHitboxRadius }; }
  dashHits(target: Rect): boolean { return this.isDashing && circleIntersectsRect(this.dashHitbox, target); }
  private get dashHitboxBody(): Phaser.Physics.Arcade.Body { return this.dashHitboxZone.body as Phaser.Physics.Arcade.Body; }

  update(input: InputSnapshot, _deltaMs: number): void {
    if(this.usingUltimate){this.body.setVelocity(0,0);return;}
    const now = this.sprite.scene.time.now;
    this.body.setAllowGravity(true);
    this.abilities.setSprint(!!input.sprintHeld && input.horizontal!==0 && Math.abs(this.body.velocity.x)>1 && !input.down && this.canAct && !this.isDashing);
    if (this.grounded) {
      this.jumpAssist.recordGrounded(now);
      this.abilities.land();
      this.dashMomentum = 0;
      this.abilities.landSlam(now, TUNING.player.slamBoostWindow);
    }
    if (!this.active) return;
    if (this.lifeState === 'HURT' && now >= this.hurtUntil) this.lifeState = 'ACTIVE';
    this.visual.setAlpha(this.invulnerable ? 0.55 : 1);
    if (input.jumpPressed) this.jumpAssist.recordPress(now);
    if (!this.canAct) return;

    if (input.horizontal !== 0) this.facing = input.horizontal;
    this.setCrouching(input.down);


    if (input.dashPressed && this.abilities.tryStartDash(now, TUNING.player.dashDuration, this.grounded)) {
      this.dashStartedAt = now;
      this.setCrouching(false);
    }

    if (this.airTuck.update(this.grounded, input.downPressed)) {
      this.abilities.startSlam();
      this.dashMomentum = 0;
      this.body.setVelocity(this.body.velocity.x * 0.35, TUNING.player.slamVelocity);
    }

    const canJump = !this.abilities.slamming && this.jumpAssist.canJump(now, TUNING.player.coyoteTime);
    if (this.abilities.isDashing(now) && canJump && this.jumpAssist.hasBufferedPress(now, TUNING.player.jumpBufferTime)) {
      this.abilities.endDash();
      this.dashMomentum = this.facing;
    }
    if (this.dashMomentum !== 0 && input.horizontal === -this.dashMomentum) this.dashMomentum = 0;
    if (this.abilities.isDashing(now)) {
      const { x, y } = this.dashVelocity;
      this.body.setAllowGravity(false).setVelocity(x, y);
      this.jumpCutAvailable=false;
      return;
    } else if (now < this.recoilUntil) {
      // Keep the dash bounce velocity instead of steering out of it.
    } else if (this.dashMomentum !== 0) {
      this.body.setVelocityX(this.dashMomentum * TUNING.player.dashSpeed);
    } else if (this.crouching && this.grounded) {
      this.body.setVelocityX(0);
    } else {
      const moveSpeed = this.abilities.sprinting ? TUNING.player.sprintSpeed : TUNING.player.maxRunSpeed;
      this.body.setVelocityX(input.horizontal * moveSpeed);
    }

    if (canJump && this.jumpAssist.consumeBufferedPress(now, TUNING.player.jumpBufferTime)) {
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
    this.dashMomentum = 0;
    this.body.setAllowGravity(true);
    this.body.setVelocityY(TUNING.player.stompBounceVelocity);
  }

  bounceFromDash(): void {
    const { x, y, lockTime } = TUNING.player.dashBounce;
    this.abilities.cancelTransient();
    this.dashMomentum = 0;
    this.body.setAllowGravity(true);
    this.body.setVelocity(-this.facing * x, y);
    this.recoilUntil = this.sprite.scene.time.now + lockTime;
    this.jumpCutAvailable = false;
  }

  /** Sparks where the dash met `target`: the point on it closest to the player. */
  dashImpact(target: Rect | null): void {
    const { x, y } = this.body.center;
    hitSpark(this.sprite.scene, target ? Phaser.Math.Clamp(x, target.left, target.right) : x, target ? Phaser.Math.Clamp(y, target.top, target.bottom) : y);
  }

  takeDamage(attackerX: number, amount: number = TUNING.player.contactDamage): boolean {
    const now = this.sprite.scene.time.now;
    if (!this.active || this.infiniteHealth || this.usingUltimate || this.invulnerable) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtUntil = now + TUNING.player.hurtLockTime;
    this.invulnerableUntil = now + TUNING.player.invulnerabilityTime;
    this.lifeState = this.health === 0 ? 'DEAD' : 'HURT';
    this.abilities.cancelTransient();
    this.dashMomentum = 0;
    this.body.setAllowGravity(true);
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
    const { bodyWidth, bodyHeight, crouchHeight } = TUNING.player;
    const height = value ? crouchHeight : bodyHeight;
    this.body.setSize(bodyWidth, height, false).setOffset(0, bodyHeight - height);
  }

  private drawDashEffect(dashing: boolean, now: number): void {
    const g = this.dashEffect.clear().setVisible(dashing);
    if (!dashing) return;
    // Drawn along +x, then rotated to the dash direction.
    g.setPosition(this.body.center.x, this.body.center.y).setRotation(this.facing < 0 ? Math.PI : 0);
    const linear = Phaser.Math.Clamp((now - this.dashStartedAt) / (TUNING.player.dashDuration * 0.5), 0, 1);
    const grow = 1 - (1 - linear) ** 3;
    const width = 0.4 + 0.6 * grow;
    g.fillStyle(0xffc93c, 0.28 * grow).fillTriangle(16, -30 * width, 16, 30 * width, 16 - 126 * grow, 0);
    g.fillStyle(0xfff4c4, 0.5 * grow).fillTriangle(12, -19 * width, 12, 19 * width, 12 - 90 * grow, 0);
    const radius = TUNING.player.dashHitboxRadius * grow * (1 + 0.03 * Math.sin(now * 0.03));
    g.fillStyle(0xffc93c, 0.12 * grow).slice(0, 0, radius, -Math.PI / 2, Math.PI / 2).fillPath();
    const bands: [number, number, number, number, number][] = [
      [0xffb020, 0.6, 0, 15, 1],
      [0xffe27a, 0.85, 2, 9, 0.84],
      [0xfffbe8, 1, 3, 4, 0.64],
    ];
    for (const [color, alpha, inset, thickness, span] of bands) {
      g.fillStyle(color, alpha * grow).fillPoints(this.crescentPoints(radius - inset * grow, thickness * grow, span * Math.PI / 2), true);
    }
    for (let i = 0; i < 5; i++) {
      const phase = (now * 0.004 + i * 0.2) % 1;
      const angle = (i - 2) * 0.32 + Math.sin(now * 0.017 + i) * 0.06;
      const r = radius + 2 + phase * 10;
      const len = (8 - phase * 6) * grow;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      g.fillStyle(i % 2 ? 0xfffbe8 : 0xffc93c, (1 - phase) * grow)
        .fillTriangle(r * cos - sin * 1.5, r * sin + cos * 1.5, r * cos + sin * 1.5, r * sin - cos * 1.5, (r + len) * cos, (r + len) * sin);
    }
    for (let i = 0; i < 4; i++) {
      const phase = (now * 0.006 + i * 0.37) % 1;
      const start = -26 - phase * 34 * grow;
      g.lineStyle(2, i % 2 ? 0xffffff : 0xffe27a, 0.85 * (1 - phase * 0.7) * grow)
        .lineBetween(start, (-24 + i * 15) * width, start - (22 + (i % 2) * 16) * grow, (-24 + i * 15) * width);
    }
  }

  private crescentPoints(radius: number, thickness: number, span: number): Phaser.Math.Vector2[] {
    const steps = 16;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = -span + (2 * span * i) / steps;
      points.push(new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const angle = -span + 2 * span * t;
      const inner = radius - thickness * Math.sin(Math.PI * t);
      points.push(new Phaser.Math.Vector2(Math.cos(angle) * inner, Math.sin(angle) * inner));
    }
    return points;
  }

  private syncVisual(): void {
    const now = this.sprite.scene.time.now;
    if(!this.isDashing){this.ghosts.forEach(g=>{if(g.active)g.destroy();});this.ghosts=[];}
    const dashing = this.isDashing && this.canAct;
    this.dashHitboxZone.setPosition(this.body.center.x, this.body.center.y);
    this.dashHitboxBody.enable = dashing;
    this.drawDashEffect(dashing, now);
    if (this.grounded && !this.wasGrounded) this.landedAt = now;
    this.wasGrounded = this.grounded;
    const height = this.crouching ? 42 : 60;
    const feet = this.sprite.y + TUNING.player.bodyHeight / 2;
    const moving = this.canAct && this.grounded && !this.crouching && Math.abs(this.body.velocity.x) > 1;
    if(moving && this.sprinting && now-this.lastSweatAt>160){
      this.lastSweatAt=now;
      const drop=this.sprite.scene.add.ellipse(this.sprite.x-this.facing*15,feet-48,2.5,5,0xa9e7ef,.8).setDepth(11).setRotation(-this.facing*.4);
      this.sprite.scene.tweens.add({targets:drop,x:drop.x-this.facing*22,y:drop.y+20,alpha:0,duration:360,onComplete:()=>drop.destroy()});
    }
    const phase = this.sprite.scene.time.now * (this.sprinting ? 0.022 : 0.016);
    const bounce = moving ? Math.abs(Math.sin(phase)) * 2 : 0;
    this.visual.setPosition(this.sprite.x, feet - (this.crouching ? 14.5 : 21.5) - bounce);
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
        .setRotation(this.visual.rotation).setTint(0xffdb45).setAlpha(.62).setDepth(9.7);
      this.ghosts.push(ghost);
      this.sprite.scene.tweens.add({targets:ghost,alpha:0,scaleX:ghost.scaleX*1.12,scaleY:ghost.scaleY*1.12,duration:220,onComplete:()=>ghost.destroy()});
    }
  }
}
