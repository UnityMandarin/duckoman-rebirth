import Phaser from 'phaser';
import type { Player } from './Player';
import { Dashable } from './Dashable';
import { isStomp, rectsOverlap, type Point, type Rect } from '../systems/contactRules';
import { showHitbox } from '../systems/DebugHitboxes';
import { hitSpark } from '../systems/HitSpark';
import { gearExplosion } from '../systems/IronWingAftermath';
import {
  RUSTWING_RULES, RustHealth, advanceRustPhase, clampRustX, eruptionLandingX, eruptionVelocities, fireballVelocities, leapAt, lungeTarget, lurchTarget,
  magmaGlobLaunch, magmaPoolHalfWidth, magmaVolleyCount, magmaVolleySlots, pickRustAttack, RUST_STEP, rustBody, rustChargeRect, rustDashSpeed, rustDashStep, rustDamage, rustDeathAt, rustFireBlocked, rustFireballSpeed, rustHit, rustPhaseDuration, rustSlashAngle, rustStepFrame, rustThirdMove, rustWingPivot, rustWingPose, rustWingRaise, leapHeightAt, leapTravelTarget,
  rustIntroAt, rustSlashArc, rustSlashArcHits, rustSlashCrescent, rustSwipeOutline, rustwingFacing, stalkStep, swipeTarget, foldedWing, slashWing, wingHitPolygons, wingTouches, SLASH_TRAIL,
  type RustAttack, type RustForm, type RustPhase, type WingShape
} from '../systems/rustWingMath';
import type { UltimateStrike } from '../systems/ultimateSwingMath';

interface Ember {
  shell: Phaser.GameObjects.Image; fire: Phaser.GameObjects.Graphics;
  x: number; y: number; vx: number; vy: number; born: number; radius: number; gravity: number;
  /** Floor landing point, telegraphed for dome fireballs. */
  landX?: number;
}

interface MagmaGlob { art: Phaser.GameObjects.Graphics; x: number; y: number; vx: number; vy: number; landX: number }
interface MagmaPool { art: Phaser.GameObjects.Graphics; x: number; born: number }

export class RustWing extends Dashable {
  readonly health = new RustHealth();
  private art: Phaser.GameObjects.Graphics;
  /** The slashing wing draws over the body once it whips forward. */
  private slashArt: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Graphics;
  private hud: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private warning: Phaser.GameObjects.Graphics;
  private x: number;
  private y = RUSTWING_RULES.floorTop - RUSTWING_RULES.bodyHalfH;
  private facing: -1 | 1 = -1;
  private phase: RustPhase = 'rest';
  private attack: RustAttack = 'lurch';
  private cycle = 0;
  private countsCycle = true;
  private slashHit = false;
  private recoverFrom = -Infinity;
  private lurchesDone = 0;
  private until = 0;
  private fromX = 0;
  private toX = 0;
  private dashVx = 0;
  private dashVy = 0;
  private leapLanded = false;
  private engaged = false;
  private finished = false;
  private contactGrace = 0;
  private flashUntil = 0;
  private transformUntil = 0;
  private volleys = 0;
  private spits = 0;
  private embers: Ember[] = [];
  private globs: MagmaGlob[] = [];
  private pools: MagmaPool[] = [];
  private nextGlob = 0;
  /** Darkens the lair and RustWing during the intro, down to the floor's top edge; the duck draws above it. */
  private curtain?: Phaser.GameObjects.Rectangle;
  private introFrom?: number;
  private eyeFlash = 0;
  private dyingFrom?: number;
  private fallDir: -1 | 1 = 1;
  private deathX = 0;
  private deathTilt?: number;
  private deathFrame = 0;
  private nextPop = 0;
  private toppled = false;
  /** Wing polygons as drawn this frame; every wing hurts on contact. */
  private wingPolygons: Point[][] = [];
  constructor(private scene: Phaser.Scene, private player: Player, form: RustForm = 1) {
    super();
    if (form === 2) this.health.revive();
    this.x = RUSTWING_RULES.right;
    this.art = scene.add.graphics().setDepth(12);
    // Sprite art faces left; both feet rest on texture row 744 of 768.
    this.sprite = scene.add.image(this.x, RUSTWING_RULES.floorTop, 'rustwing').setOrigin(.5, .969).setDisplaySize(132, 132).setDepth(13);
    this.slashArt = scene.add.graphics().setDepth(13.5);
    this.glow = scene.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    this.warning = scene.add.graphics().setDepth(11);
    this.hud = scene.add.graphics().setScrollFactor(0).setDepth(51);
    this.label = scene.add.text(520, 20, '', { fontSize: '13px', color: '#e4b48a', stroke: '#140c08', strokeThickness: 3 }).setOrigin(.5).setScrollFactor(0).setDepth(52);
    const room = scene.cameras.main.getBounds();
    this.curtain = scene.add.rectangle(room.x - 20, room.y - 20, room.width + 40, RUSTWING_RULES.floorTop - room.y + 20, 0x000000)
      .setOrigin(0).setDepth(RustWing.curtainDepth).setAlpha(RUSTWING_RULES.introDarkSteps[0]);
    this.shiftLayers(-RustWing.introSink);
    const strike = (s: UltimateStrike): void => {
      if (!this.finished && this.engaged && this.dyingFrom === undefined && s.tryHit(this, this.bodyBounds)) {
        this.hurt('ultimate');
      }
    };
    scene.events.on('ultimate-strike', strike);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off('ultimate-strike', strike));
  }
  update(delta: number): void {
    const now = this.scene.time.now;
    if (this.finished) return;
    if (this.dyingFrom !== undefined) { this.updateDeath(now); return; }
    if (!this.player.active) { this.draw(now); return; }
    if (this.introFrom === undefined) {
      if (!this.player.grounded) { this.draw(now); return; }
      this.introFrom = now;
      this.facing = rustwingFacing(this.x, this.player.sprite.x);
    }
    const intro = rustIntroAt(now - this.introFrom);
    this.eyeFlash = intro.flash;
    this.curtain?.setAlpha(intro.darkness);
    if (!intro.awake) { this.draw(now); return; }
    if (!this.engaged) this.wake(now);
    if (intro.darkness === 0 && this.curtain) { this.curtain.destroy(); this.curtain = undefined; }
    if (!intro.fighting) {
      this.draw(now);
      this.hitPlayer(now);
      return;
    }
    if (!this.transforming(now)) {
      if (now >= this.until) this.advance(now);
      this.move(now, delta);
      if (this.health.form === 2 && now >= this.nextGlob) this.lobMagma(now);
    }
    this.updateEmbers(now, delta);
    this.updateMagma(now, delta);
    // Drawn first so the wing hitboxes match this frame's pose.
    this.draw(now);
    this.hitPlayer(now);
    if (this.finished || this.dyingFrom !== undefined) return;
    this.drawHud();
  }
  private static readonly curtainDepth = 9.4;
  /** Drops every boss layer (11–14) under the curtain but still above the floor (2). */
  private static readonly introSink = 6.5;
  private shiftLayers(by: number): void {
    for (const layer of [this.warning, this.art, this.sprite, this.slashArt, this.glow]) layer.setDepth(layer.depth + by);
  }
  /** Eyes flash and he steps out of the background: hittable now, attacking after the intro pause. */
  private wake(now: number): void {
    this.engaged = true;
    this.shiftLayers(RustWing.introSink);
    this.until = now + RUSTWING_RULES.introPauseMs;
    this.nextGlob = this.until + RUSTWING_RULES.magmaGlobMs;
    this.scene.cameras.main.shake(160, .004);
  }
  private advance(now: number): void {
    if (this.phase === 'rest') {
      let pick = pickRustAttack(this.cycle, this.health.form, this.player.sprite.x - this.x, this.attack);
      const facing = rustwingFacing(this.x, this.player.sprite.x);
      if (pick.attack === 'fire' && rustFireBlocked(this.x, facing, this.health.form)) {
        this.cycle += 1;
        pick = pickRustAttack(this.cycle, this.health.form, this.player.sprite.x - this.x, this.attack);
      }
      this.attack = pick.attack;
      this.countsCycle = pick.advancesCycle;
      this.facing = rustwingFacing(this.x, this.player.sprite.x);
    }
    const third = this.phase === 'lurch' && this.lurchesDone + 1 >= RUSTWING_RULES.lurchCount;
    const duck = this.player.body.center;
    const leap = third && rustThirdMove(this.x, this.y, this.facing, duck.x, duck.y, Math.random()) === 'leap';
    const next = advanceRustPhase(this.phase, this.lurchesDone, this.attack, leap);
    if (next.phase === 'rest' && this.phase !== 'rest' && this.countsCycle) this.cycle += 1;
    if (next.phase === 'rest' && this.phase === 'swipe') this.recoverFrom = now;
    if (this.phase === 'leap') this.land();
    this.phase = next.phase;
    this.lurchesDone = next.lurchesDone;
    this.until = now + rustPhaseDuration(this.phase);
    // Each dash locks onto the duck on the first windup frame, then keeps that direction.
    if (this.phase === 'lurchWindup' || this.phase === 'lungeWindup' || this.phase === 'leapWindup') {
      this.facing = rustwingFacing(this.x, duck.x);
    }
    if (this.phase === 'lurch') {
      this.fromX = this.x;
      this.toX = lurchTarget(this.x, this.facing);
    }
    if (this.phase === 'lunge' || this.phase === 'leap') {
      this.fromX = this.x;
      this.toX = this.phase === 'leap' ? leapTravelTarget(this.x, this.facing) : lungeTarget(this.facing);
      this.leapLanded = false;
    }
    if (this.phase === 'swipeWindup') this.facing = rustwingFacing(this.x, this.player.sprite.x);
    if (this.phase === 'swipe') {
      this.fromX = this.x;
      this.toX = swipeTarget(this.x, this.facing);
      this.slashHit = false;
      this.scene.cameras.main.shake(140, .004);
    }
    if (this.phase === 'fire') this.spit();
    if (this.phase === 'erupt') this.erupt();
  }
  private move(now: number, delta: number): void {
    if (this.phase === 'stalk') {
      this.facing = rustwingFacing(this.x, this.player.sprite.x);
      const step = stalkStep(this.x, this.player.sprite.x, Math.min(delta, 50));
      this.x = step.x;
      if (step.arrived) this.until = now;
      return;
    }
    if (this.phase === 'lurch' || this.phase === 'lunge' || this.phase === 'leap') {
      const prevX = this.x, prevY = this.y;
      const step = rustDashStep(this.x, this.toX, rustDashSpeed(this.phase), delta);
      this.x = step.x;
      if (this.phase === 'leap') this.y = RUSTWING_RULES.floorTop - RUSTWING_RULES.bodyHalfH - leapHeightAt(this.fromX, this.toX, this.x);
      const dt = Math.min(Math.max(delta, 0), 50) / 1000;
      this.dashVx = dt > 0 ? (this.x - prevX) / dt : 0;
      this.dashVy = dt > 0 ? (this.y - prevY) / dt : 0;
      if (step.stopped) {
        if (this.phase === 'leap') this.land();
        this.until = now;
      }
      return;
    }
    this.dashVx = 0;
    this.dashVy = 0;
    if (this.phase === 'swipe') {
      const t = Phaser.Math.Clamp((rustPhaseDuration('swipe') - (this.until - now)) / (RUSTWING_RULES.swipeMs * .6), 0, 1);
      this.x = clampRustX(Phaser.Math.Linear(this.fromX, this.toX, 1 - (1 - t) ** 3));
      return;
    }
  }
  private land(): void {
    if (this.leapLanded) return;
    this.leapLanded = true;
    this.x = this.toX;
    this.y = RUSTWING_RULES.floorTop - RUSTWING_RULES.bodyHalfH;
    hitSpark(this.scene, this.x - 30, RUSTWING_RULES.floorTop - 4, .9);
    hitSpark(this.scene, this.x + 30, RUSTWING_RULES.floorTop - 4, .9);
    this.scene.cameras.main.shake(180, .006);
  }
  private spit(): void {
    for (const { vx, vy } of fireballVelocities(this.facing, this.spits++, rustFireballSpeed(this.health.form))) this.launch(this.x + this.facing * 40, this.y - 20, vx, vy, RUSTWING_RULES.fireballRadius, 0);
  }
  private erupt(): void {
    const x = this.x, y = RUSTWING_RULES.floorTop - RUSTWING_RULES.eruptLaunchHeight;
    const shots = eruptionVelocities(this.volleys, this.facing);
    const magma = new Set(magmaVolleySlots(shots.length, magmaVolleyCount(this.health.hp, this.health.max), shots.map(() => Math.random())));
    shots.forEach(({ vx, vy }, i) => {
      const landX = eruptionLandingX(x, y, vx, vy);
      if (magma.has(i)) this.spawnGlob(x, y, vx, vy, landX);
      else this.launch(x, y, vx, vy, RUSTWING_RULES.eruptRadius, RUSTWING_RULES.eruptGravity).landX = landX;
    });
    this.volleys += 1;
    hitSpark(this.scene, x, y, .9);
    this.scene.cameras.main.shake(120, .004);
  }
  private launch(x: number, y: number, vx: number, vy: number, radius: number, gravity: number): Ember {
    const size = radius * 2.2;
    const shell = this.scene.add.image(x, y, 'rustwing-fireball').setDisplaySize(size, size).setDepth(15);
    const fire = this.scene.add.graphics().setDepth(14.9).setBlendMode(Phaser.BlendModes.ADD);
    const ember: Ember = { shell, fire, x, y, vx, vy, born: this.scene.time.now, radius, gravity };
    this.embers.push(ember);
    return ember;
  }
  private updateEmbers(now: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.embers = this.embers.filter(ember => {
      ember.vy += ember.gravity * dt;
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      const r = ember.radius;
      this.drawEmber(ember, now, dt);
      showHitbox(this.scene, 'danger', { x: ember.x, y: ember.y, radius: r });
      const p = this.player.body, dx = Math.max(p.left - ember.x, 0, ember.x - p.right), dy = Math.max(p.top - ember.y, 0, ember.y - p.bottom);
      if (dx * dx + dy * dy <= r * r) this.player.takeDamage(ember.x, rustHit('fireball'));
      const spent = now - ember.born > RUSTWING_RULES.fireballLifeMs || ember.y > RUSTWING_RULES.floorTop - 4 || ember.x < -20 || ember.x > 660 || ember.y < -40;
      if (spent) {
        if (ember.y > RUSTWING_RULES.floorTop - 4) hitSpark(this.scene, ember.x, RUSTWING_RULES.floorTop - 4, .8);
        ember.shell.destroy();
        ember.fire.destroy();
      }
      return !spent;
    });
  }
  private lobMagma(now: number): void {
    this.nextGlob = now + RUSTWING_RULES.magmaGlobMs;
    const x = this.x, y = this.y + RUSTWING_RULES.bodyHalfH - RUSTWING_RULES.eruptLaunchHeight;
    const { vx, vy, landX } = magmaGlobLaunch(x, y, Math.random(), Math.random());
    this.spawnGlob(x, y, vx, vy, landX);
  }
  private spawnGlob(x: number, y: number, vx: number, vy: number, landX: number): void {
    const art = this.scene.add.graphics().setDepth(14.9);
    this.globs.push({ art, x, y, vx, vy, landX });
  }
  private updateMagma(now: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000, floor = RUSTWING_RULES.floorTop, p = this.player.body, r = RUSTWING_RULES.magmaGlobRadius;
    this.globs = this.globs.filter(glob => {
      glob.vy += RUSTWING_RULES.eruptGravity * dt;
      glob.x += glob.vx * dt;
      glob.y += glob.vy * dt;
      showHitbox(this.scene, 'danger', { x: glob.x, y: glob.y, radius: r });
      const dx = Math.max(p.left - glob.x, 0, glob.x - p.right), dy = Math.max(p.top - glob.y, 0, glob.y - p.bottom);
      if (dx * dx + dy * dy <= r * r) this.player.takeDamage(glob.x, rustHit('magma'));
      const landed = glob.y > floor - 4;
      if (landed) {
        glob.art.destroy();
        hitSpark(this.scene, glob.x, floor - 4, .5);
        this.pools.push({ art: this.scene.add.graphics().setDepth(9), x: glob.x, born: now });
        return false;
      }
      this.drawGlob(glob, now);
      return true;
    });
    this.pools = this.pools.filter(pool => {
      const w = magmaPoolHalfWidth(now - pool.born);
      if (w <= 0) { pool.art.destroy(); return false; }
      const bounds = { left: pool.x - w, right: pool.x + w, top: floor - 6, bottom: floor + 2 };
      showHitbox(this.scene, 'danger', bounds);
      if (rectsOverlap(p, bounds)) this.player.takeDamage(pool.x, rustHit('magma'));
      this.drawPool(pool, w, now);
      return true;
    });
  }
  private drawGlob(glob: MagmaGlob, now: number): void {
    const r = RUSTWING_RULES.magmaGlobRadius, g = glob.art.clear();
    const speed = Math.hypot(glob.vx, glob.vy) || 1, bx = -glob.vx / speed, by = -glob.vy / speed;
    const flicker = .8 + Math.sin(now * 0.04 + glob.landX) * .2;
    // Drips trail back along the arc; the blob stretches along its velocity.
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(i > 2 ? 0x8a1a08 : 0xff4a12, (1 - i / 4) * .7 * flicker).fillCircle(glob.x + bx * r * 1.1 * i, glob.y + by * r * 1.1 * i, r * (1 - i * .22));
    }
    const angle = Math.atan2(glob.vy, glob.vx), stretch = 1 + Math.min(.5, speed / 900);
    g.fillStyle(0xff3a10, .35 * flicker).fillCircle(glob.x, glob.y, r * 1.5);
    g.save().translateCanvas(glob.x, glob.y).rotateCanvas(angle);
    g.fillStyle(0xd8340c).fillEllipse(0, 0, r * 2 * stretch, r * 2 / stretch);
    g.fillStyle(0xffa040).fillEllipse(r * .2, -r * .2, r * 1.2 * stretch, r * 1.1 / stretch);
    g.fillStyle(0xfff0b0, .9).fillCircle(r * .35, -r * .3, r * .3);
    g.restore();
  }
  private drawPool(pool: MagmaPool, w: number, now: number): void {
    const floor = RUSTWING_RULES.floorTop, heat = w / RUSTWING_RULES.magmaPoolHalfW, g = pool.art.clear();
    const flicker = .85 + Math.sin(now * 0.02 + pool.x) * .15;
    g.fillStyle(0xff3a10, .25 * heat * flicker).fillEllipse(pool.x, floor - 3, w * 2.8, 16 * heat + 4);
    g.fillStyle(0x6a1406).fillEllipse(pool.x, floor - 1, w * 2, 9 * heat + 3);
    g.fillStyle(0xe8420e, .6 + heat * .4).fillEllipse(pool.x, floor - 2, w * 1.7, 7 * heat + 2);
    g.fillStyle(0xffb050, heat * flicker).fillEllipse(pool.x + Math.sin(now * 0.005 + pool.x) * w * .2, floor - 3, w * .8, 3 * heat + 1);
    // A bubble swells and pops while it is still hot.
    const t = (now * 0.0015 + pool.x * .01) % 1;
    if (heat > .3) g.fillStyle(0xffd080, (1 - t) * heat).fillCircle(pool.x + Math.sin(pool.x) * w * .4, floor - 4 - t * 4, 1 + t * 2.5);
  }
  private drawEmber(ember: Ember, now: number, dt: number): void {
    const r = ember.radius, speed = Math.hypot(ember.vx, ember.vy) || 1;
    const bx = -ember.vx / speed, by = -ember.vy / speed;
    ember.shell.setPosition(ember.x, ember.y);
    ember.shell.rotation += Math.sign(ember.vx) * 7 * dt;
    const flicker = .8 + Math.sin(now * 0.03 + ember.born) * .2;
    const fire = ember.fire.clear();
    // Flame trail streams back along the flight path, behind the iron shell.
    for (let i = 5; i >= 1; i--) {
      const t = i / 5, wobble = Math.sin(now * 0.02 + i * 1.7) * 3;
      const tx = ember.x + bx * r * 1.5 * i - by * wobble, ty = ember.y + by * r * 1.5 * i + bx * wobble;
      fire.fillStyle(i > 3 ? 0x8a1a08 : 0xff4a12, (1 - t) * .55 * flicker).fillCircle(tx, ty, r * (1.05 - t * .55));
    }
    fire.fillStyle(0xff3a10, .32 * flicker).fillCircle(ember.x, ember.y, r * 1.45);
    fire.fillStyle(0xffa040, .3 * flicker).fillCircle(ember.x, ember.y, r * 1.1);
  }
  private get charging(): boolean { return this.phase === 'lunge'; }
  private hitPlayer(now: number): void {
    const p = this.player.body;
    const bounds = this.bodyBounds;
    showHitbox(this.scene, now >= this.contactGrace ? 'danger' : 'target', bounds);
    const overlap = rectsOverlap(p, bounds), vulnerable = !this.transforming(now);
    const stomp = isStomp({ left: p.left, right: p.right, top: p.top, bottom: p.bottom, previousBottom: p.prev.y + p.height, velocityY: p.velocity.y }, bounds, 10);
    const duck = { left: p.left, right: p.right, top: p.top, bottom: p.bottom };
    const armed = now >= this.contactGrace;
    for (const points of this.wingPolygons) showHitbox(this.scene, armed ? 'danger' : 'target', { points });
    if (this.charging) {
      const hit = rustChargeRect(this.x, this.y, this.facing);
      showHitbox(this.scene, 'danger', hit);
      if (armed && rectsOverlap(hit, duck)) this.player.takeDamage(this.x, rustHit('contact', { x: this.dashVx, y: this.dashVy }));
    }
    if (!this.checkDash(this.player)) {
      if (this.health.touch(now, overlap && vulnerable, stomp)) { hitSpark(this.scene, p.center.x, bounds.top); this.flinch(now); this.player.bounceFromStomp(); }
      else if ((overlap || wingTouches(this.wingPolygons, duck)) && armed && !this.player.isDashing && !stomp) this.player.takeDamage(this.x, rustHit('contact'));
    }
    if (this.health.hp === 0) { this.depleted(now); return; }
    if (this.phase === 'swipe') {
      const pivot = rustWingPivot(this.fromX, this.y, this.facing);
      const head = rustSlashAngle(rustPhaseDuration('swipe') - (this.until - now));
      const arc = rustSlashArc(pivot, this.facing, head, this.x - this.fromX);
      if (arc.length) showHitbox(this.scene, 'danger', { points: arc });
      if (!this.slashHit && rustSlashArcHits(duck, pivot, this.facing, head, this.x - this.fromX) && this.player.takeDamage(this.x, rustHit('swipe'))) {
        this.slashHit = true;
        hitSpark(this.scene, p.center.x, p.center.y, 1.1);
      }
    }
  }
  private get bodyBounds(): Rect { return rustBody(this.x, this.y); }
  protected dashBounds(): Rect | null { return this.finished || !this.engaged || this.dyingFrom !== undefined || this.charging ? null : this.bodyBounds; }
  protected onDash(): void {
    const now = this.scene.time.now;
    if (this.transforming(now) || this.charging) return;
    if (this.health.touch(now, true, true)) this.flinch(now);
    if (this.health.hp === 0) this.depleted(now);
  }
  private hurt(attack: 'dash' | 'stomp' | 'ultimate'): void {
    const now = this.scene.time.now;
    if (this.charging || now < this.contactGrace || this.health.hp <= 0 || this.dyingFrom !== undefined) return;
    this.health.damage(rustDamage(attack));
    this.flinch(now);
    hitSpark(this.scene, this.x, this.y, 1.3);
    if (this.health.hp === 0) this.depleted(now);
  }
  private transforming(now: number): boolean { return now < this.transformUntil; }
  /** First bar empty starts the molten second form; second bar empty starts his death. */
  private depleted(now: number): void {
    if (this.dyingFrom !== undefined) return;
    if (this.health.form === 2) { this.die(now); return; }
    this.health.revive();
    this.transformUntil = now + RUSTWING_RULES.transformMs;
    this.contactGrace = this.transformUntil;
    this.phase = 'rest';
    this.cycle = 0;
    this.lurchesDone = 0;
    this.until = this.transformUntil + 300;
    this.nextGlob = this.transformUntil + RUSTWING_RULES.magmaGlobMs;
    this.recoverFrom = -Infinity;
    this.y = RUSTWING_RULES.floorTop - RUSTWING_RULES.bodyHalfH;
    this.scene.tweens.killTweensOf([this.art, this.slashArt, this.sprite]);
    this.art.setAlpha(1);
    this.slashArt.setAlpha(1);
    this.sprite.setAlpha(1);
    hitSpark(this.scene, this.x, this.y - 20, 1.8);
    this.scene.cameras.main.shake(RUSTWING_RULES.transformMs, .003);
  }
  private flinch(now: number): void {
    this.contactGrace = now + RUSTWING_RULES.hitLock;
    this.flashUntil = now + 90;
    this.scene.tweens.add({ targets: [this.art, this.slashArt, this.sprite], alpha: .45, duration: 70, yoyo: true, repeat: 2 });
  }
  private clearHazards(): void {
    this.hud.clear();
    this.label.setText('');
    this.warning.clear();
    this.embers.forEach(ember => { ember.shell.destroy(); ember.fire.destroy(); });
    this.embers = [];
    this.globs.forEach(glob => glob.art.destroy());
    this.pools.forEach(pool => pool.art.destroy());
    this.globs = [];
    this.pools = [];
    this.curtain?.destroy();
    this.curtain = undefined;
  }
  /** Second bar empty: he stays on screen, staggering and bursting apart before the final explosion. */
  private die(now: number): void {
    this.dyingFrom = now;
    this.nextPop = now;
    this.fallDir = this.x > RUSTWING_RULES.roomWidth / 2 ? -1 : 1;
    this.deathX = this.x;
    this.phase = 'rest';
    this.recoverFrom = -Infinity;
    this.y = RUSTWING_RULES.floorTop - RUSTWING_RULES.bodyHalfH;
    this.clearHazards();
    this.scene.tweens.killTweensOf([this.art, this.slashArt, this.sprite]);
    this.art.setAlpha(1);
    this.slashArt.setAlpha(1);
    this.sprite.setAlpha(1);
    hitSpark(this.scene, this.x, this.y - 10, 1.6);
    this.scene.cameras.main.shake(260, .008);
  }
  private updateDeath(now: number): void {
    const rules = RUSTWING_RULES, pose = rustDeathAt(now - this.dyingFrom!, this.fallDir);
    if (pose.stage === 'burst') { this.finish(); return; }
    this.x = this.deathX + pose.shift;
    this.deathTilt = pose.tilt;
    this.deathFrame = pose.frame;
    if (pose.stage === 'down' && !this.toppled) {
      this.toppled = true;
      this.scene.cameras.main.shake(260, .012);
      for (let i = 0; i < 4; i++) hitSpark(this.scene, this.x + this.fallDir * (20 + i * 30), rules.floorTop - 6, 1);
    }
    if (now >= this.nextPop) {
      const down = pose.stage === 'down';
      this.nextPop = now + rules.deathPopMs * (down ? 2 : 1) * Phaser.Math.FloatBetween(.6, 1.4);
      const rad = Phaser.Math.DegToRad(pose.tilt), ahead = Phaser.Math.Between(-40, 40), up = Phaser.Math.Between(20, 110);
      const feet = rules.floorTop, px = this.x + ahead * Math.cos(rad) + up * Math.sin(rad), py = feet + ahead * Math.sin(rad) - up * Math.cos(rad);
      hitSpark(this.scene, px, py, Phaser.Math.FloatBetween(.7, 1.2));
      if (Math.random() < .35) gearExplosion(this.scene, px, py, 3);
      this.flashUntil = now + 60;
      this.scene.cameras.main.shake(90, .004);
    }
    this.draw(now);
  }
  private finish(): void {
    this.finished = true;
    this.clearHazards();
    const rad = Phaser.Math.DegToRad(this.deathTilt ?? 0), cx = this.x + Math.sin(rad) * 55, cy = RUSTWING_RULES.floorTop - Math.cos(rad) * 55 - 10;
    gearExplosion(this.scene, cx, cy, 30);
    for (let i = 0; i < 6; i++) hitSpark(this.scene, cx + Phaser.Math.Between(-60, 60), cy + Phaser.Math.Between(-30, 20), 1.4);
    this.scene.cameras.main.shake(400, .014);
    this.scene.events.emit('rustwing-defeated', { x: Phaser.Math.Clamp(cx, 60, RUSTWING_RULES.roomWidth - 60) });
    this.scene.tweens.killTweensOf([this.art, this.slashArt, this.sprite]);
    this.art.destroy();
    this.slashArt.destroy();
    this.sprite.destroy();
    this.glow.destroy();
    this.player.chargeUltimate(40);
  }
  private drawHud(): void {
    const now = this.scene.time.now;
    if (this.health.form === 1) {
      this.label.setText('RUSTWING').setColor('#e4b48a');
      this.hud.clear().fillStyle(0x1a100c, .95).fillRoundedRect(413, 32, 214, 24, 4);
      this.hud.lineStyle(2, 0xb07a4a).strokeRoundedRect(413, 32, 214, 24, 4);
      const width = 198 * this.health.hp / this.health.max;
      this.hud.fillStyle(0x8a3a1c).fillRect(421, 39, width, 10).fillStyle(0xe0904a).fillRect(421, 39, width, 3);
      return;
    }
    // The molten bar fills up while he transforms, then drains normally.
    const filling = this.transforming(now) ? 1 - (this.transformUntil - now) / RUSTWING_RULES.transformMs : 1;
    const pulse = .5 + Math.sin(now * 0.01) * .5;
    this.label.setText('MOLTEN RUSTWING').setColor(this.transforming(now) && pulse > .5 ? '#ffffff' : '#ff8a5a');
    this.hud.clear().fillStyle(0x1e0806, .95).fillRoundedRect(413, 32, 214, 24, 4);
    this.hud.lineStyle(2, Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x9a2a14), Phaser.Display.Color.ValueToColor(0xff6a30), 1, pulse).color).strokeRoundedRect(413, 32, 214, 24, 4);
    const width = 198 * filling * this.health.hp / this.health.max;
    this.hud.fillStyle(0xa8180e).fillRect(421, 39, width, 10).fillStyle(0xff7a3a).fillRect(421, 39, width, 3);
    for (const x of [417, 623]) this.hud.fillStyle(0xffb080).fillCircle(x, 36, 2).fillCircle(x, 52, 2);
  }
  private draw(now: number): void {
    const morphing = this.transforming(now);
    const morph = morphing ? 1 - (this.transformUntil - now) / RUSTWING_RULES.transformMs : 0;
    const jitter = morphing ? Math.sin(now * 0.09) * (1.5 + morph * 2.5) : 0;
    const g = this.art.clear(), glow = this.glow.clear(), d = this.facing, x = this.x + jitter, y = this.y;
    const molten = this.health.form === 2;
    const floor = RUSTWING_RULES.floorTop;
    const windup = this.phase.endsWith('Windup');
    const lurching = this.phase === 'lurch' || this.phase === 'lunge' || this.phase === 'stalk';
    const airborne = this.phase === 'leap';
    const beat = airborne ? Math.sin(now * 0.03) * 9 : Math.sin(now * 0.006) * 2;
    const elapsed = rustPhaseDuration(this.phase) - (this.until - now);
    const pose = rustWingPose(this.phase, elapsed, now - this.recoverFrom);
    const feet = y + RUSTWING_RULES.bodyHalfH, height = floor - feet;
    // Crouches into the leap windup so it reads differently from the dash.
    const crouch = this.phase === 'leapWindup' ? Phaser.Math.Clamp(elapsed / RUSTWING_RULES.leapWindupMs, 0, 1) * .12 : 0;
    // Small rock back on windups and forward while charging; pivots at the feet.
    const tilt = this.deathTilt ?? (this.phase === 'leapWindup' ? 0 : windup ? -3 : lurching ? 4 : airborne ? 7 : this.phase === 'swipe' ? 3 : 0) * d;
    const rad = Phaser.Math.DegToRad(tilt), cos = Math.cos(rad), sin = Math.sin(rad);
    const step = this.dyingFrom !== undefined ? this.deathFrame : rustStepFrame(this.phase, elapsed, this.lurchesDone);
    const rise = step === RUST_STEP.stand ? 0 : 2;
    const at = (ahead: number, up: number) => ({ x: x + d * ahead * cos + up * (1 - crouch) * sin, y: feet - rise - up * (1 - crouch) * cos + d * ahead * sin });
    this.sprite.setFrame(step).setPosition(x, feet - rise).setFlipX(d > 0).setAngle(tilt).setDisplaySize(132 * (1 + crouch * .4), 132 * (1 - crouch));
    if (now < this.flashUntil) this.sprite.setTint(0xffd0b0).setTintMode(Phaser.TintModes.FILL);
    else if (morphing && Math.sin(now * 0.035) > .4) this.sprite.setTint(0xff4a20).setTintMode(Phaser.TintModes.FILL);
    else if (molten) this.sprite.setTint(morphing ? redden(morph) : 0xff6a58).setTintMode(Phaser.TintModes.MULTIPLY);
    else this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    const shrink = 1 - height / RUSTWING_RULES.leapHeight * .5;
    g.fillStyle(0x000000, .55 * shrink).fillEllipse(x, floor + 2, 120 * shrink, 12 * shrink);
    // IronWing's wing rig at prototype scale: fewer vanes, rusted, the rear wing snapped short.
    this.warning.clear();
    this.slashArt.clear();
    // Folded wings are built upright, so while he topples they're drawn upright and rotated with him about his feet.
    const toppling = this.deathTilt !== undefined;
    const mount = toppling ? { x: x - d * 4, y: feet - rise - 74 } : at(-4, 74);
    if (toppling) g.save().translateCanvas(x, feet - rise).rotateCanvas(rad).translateCanvas(-x, -(feet - rise));
    // Wings rise as he squats for the leap, then slam down in one flap at takeoff.
    const raise = rustWingRaise(this.phase, elapsed);
    this.wingPolygons = [];
    for (const side of [-1, 1] as const) {
      const broken = side !== d;
      if (!broken && pose) {
        const tremble = this.phase === 'swipeWindup' && elapsed > RUSTWING_RULES.swipeWindupMs * .6 ? Math.sin(now * 0.08) * 2.5 : 0;
        const wing = slashWing(rustWingPivot(x, y, d), d, pose.angle + tremble, pose.length);
        this.drawSlashWing(this.phase === 'swipeWindup' ? g : this.slashArt, wing, this.phase === 'swipe' ? 1 : this.phase === 'rest' ? .4 : 0);
        if (this.phase !== 'swipe') this.wingPolygons.push(...wingHitPolygons(wing));
        continue;
      }
      const lift = (side === d ? beat : beat * .5) * (1 - Math.min(1, Math.abs(raise)));
      const wing = foldedWing(mount, side, broken, lift, raise);
      const [root, hinge] = wing.arm;
      g.lineStyle(8, 0x14100e).lineBetween(root.x, root.y, hinge.x, hinge.y);
      g.lineStyle(3, 0x6e4a26).lineBetween(root.x, root.y - 2, hinge.x, hinge.y - 2);
      for (const vane of wing.vanes) {
        g.fillStyle(0x1c1715).fillPoints(vec(vane.points), true);
        g.lineStyle(2, 0x8a5e2c).strokePoints(vec(vane.points), true);
        g.lineStyle(4, 0x5a2a14).lineBetween(vane.rib[0].x, vane.rib[0].y, vane.rib[1].x, vane.rib[1].y);
        if (vane.hole) g.fillStyle(0x050304).fillCircle(vane.hole.x, vane.hole.y, 2.5);
      }
      g.fillStyle(0x0e0a0a).fillCircle(wing.joint.x, wing.joint.y, 8);
      g.lineStyle(2, 0x8a5e2c).strokeCircle(wing.joint.x, wing.joint.y, 7);
      g.fillStyle(0xa02a14).fillCircle(wing.joint.x, wing.joint.y, 3);
      this.wingPolygons.push(...wingHitPolygons(wing));
    }
    if (toppling) g.restore();
    // Lights layered over the painted sprite: visor eye, cracked dome core, side lamp, shorting wires.
    const flicker = .5 + Math.sin(now * 0.013) * .3 + Math.sin(now * 0.037) * .2;
    const eye = at(36, 79), dome = at(0, 116), lamp = at(-43, 71), wires = at(-16, 45), mouth = at(44, 76);
    const stare = windup ? 1 : .55;
    glow.fillStyle(0xff1a08, .18 * stare + flicker * .12).fillCircle(eye.x, eye.y, 14);
    glow.fillStyle(0xff3a18, .35 * stare + flicker * .2).fillCircle(eye.x, eye.y, 6);
    glow.fillStyle(0xffc090, .5 * stare).fillCircle(eye.x, eye.y, 2);
    if (this.eyeFlash > 0) {
      const f = this.eyeFlash;
      glow.fillStyle(0xff2a0c, .45 * f).fillCircle(eye.x, eye.y, 18 + (1 - f) * 34);
      glow.fillStyle(0xff7a3a, .8 * f).fillCircle(eye.x, eye.y, 9 + (1 - f) * 8);
      glow.fillStyle(0xffffff, f).fillCircle(eye.x, eye.y, 4);
      glow.lineStyle(2, 0xffd0a0, .9 * f).lineBetween(eye.x - 26 - (1 - f) * 20, eye.y, eye.x + 26 + (1 - f) * 20, eye.y);
    }
    glow.fillStyle(0xd01008, (molten ? .3 : .12) + flicker * .1).fillEllipse(dome.x, dome.y, 50, 14);
    if (molten) {
      // Molten form: heat bleeding through the plates and sparks venting from the dome.
      const core = at(0, 62), heat = morphing ? morph : 1;
      glow.fillStyle(0xff2a08, (.08 + flicker * .07) * heat).fillEllipse(core.x, core.y, 118, 96);
      glow.fillStyle(0xff6a20, (.05 + flicker * .05) * heat).fillEllipse(core.x, core.y, 70, 56);
      const vents = morphing || this.phase === 'eruptWindup' ? 10 : 4;
      for (let i = 0; i < vents; i++) {
        const t = (now * (morphing ? .0018 : .0009) + i / vents) % 1;
        const sx = dome.x + Math.sin(i * 2.4 + now * .004) * (12 + t * 14), sy = dome.y - 4 - t * (morphing ? 90 : 55);
        glow.fillStyle(i % 2 ? 0xff5a18 : 0xffc060, (1 - t) * .8).fillCircle(sx, sy, 1.4 + (1 - t) * 1.6);
      }
    }
    if (morphing) {
      for (let i = 0; i < 2; i++) {
        const t = (morph * 3 + i * .5) % 1;
        glow.lineStyle(3, 0xff5020, (1 - t) * .7).strokeCircle(x, floor - 60, 30 + t * 70);
      }
    }
    glow.fillStyle(0xff3010, flicker > .8 ? .35 : .12).fillCircle(lamp.x, lamp.y, 5);
    if (Math.sin(now * 0.011) + Math.sin(now * 0.029) > 1.5) {
      for (let i = 0; i < 3; i++) {
        const a = now * 0.05 + i * 2.1;
        glow.lineStyle(1.5, 0xffd890, .9).lineBetween(wires.x, wires.y, wires.x + Math.cos(a) * 7, wires.y + Math.sin(a) * 7);
      }
      glow.fillStyle(0xfff0c0, .8).fillCircle(wires.x, wires.y, 2);
    }
    const pivot = rustWingPivot(x, y, d), rules = RUSTWING_RULES;
    if (this.phase === 'swipeWindup') {
      // Faint wedge over the whole arc the wing is about to cut, brightening as the windup completes.
      const charge = Phaser.Math.Clamp(elapsed / rules.swipeWindupMs, 0, 1);
      const outline = vec(rustSwipeOutline(pivot, d, swipeTarget(this.x, d) - this.x, rules.swipeReach + rules.wingHitRadius));
      this.warning.fillStyle(0xff4028, .06 + charge * .14).fillPoints(outline, true);
      this.warning.lineStyle(3, 0xff6a32, .3 + charge * .55).strokePoints(outline.slice(1, -1), false);
    }
    if (this.phase === 'swipe') this.drawSlashTrail(glow, pivot, d, rustSlashAngle(elapsed), 1, 1);
    else if (pose && this.phase === 'rest') {
      const fade = (now - this.recoverFrom) / rules.wingRecoverMs;
      this.drawSlashTrail(glow, pivot, d, rules.wingSlashAngle, 1 - fade, 1 - fade * .7);
    }
    if (this.phase === 'fireWindup' || this.phase === 'fire') {
      const charge = this.phase === 'fire' ? 1 : 1 - Math.max(0, this.until - now) / RUSTWING_RULES.fireWindupMs;
      glow.fillStyle(0xff5020, .25 + charge * .4).fillCircle(mouth.x, mouth.y, 8 + charge * 12);
      glow.fillStyle(0xffd080, .3 + charge * .5).fillCircle(mouth.x, mouth.y, 3 + charge * 5);
    }
    if (this.phase === 'eruptWindup') {
      const charge = 1 - Math.max(0, this.until - now) / RUSTWING_RULES.eruptWindupMs;
      glow.fillStyle(0xff4010, .2 + charge * .45).fillCircle(dome.x, dome.y, 10 + charge * 22);
      glow.fillStyle(0xffe0a0, .25 + charge * .55).fillCircle(dome.x, dome.y, 4 + charge * 8);
      const launchY = floor - RUSTWING_RULES.eruptLaunchHeight;
      for (const { vx, vy } of eruptionVelocities(this.volleys, d)) {
        this.drawLandingMark(eruptionLandingX(this.x, launchY, vx, vy), .25 + charge * .45);
      }
    }
    for (const ember of this.embers) if (ember.landX !== undefined && ember.vy > 0) this.drawLandingMark(ember.landX, .8);
    for (const glob of this.globs) if (glob.vy > 0) this.drawLandingMark(glob.landX, .45);
    if (this.phase === 'leapWindup' || airborne) {
      const target = airborne ? this.toX : lungeTarget(d), w = RUSTWING_RULES.bodyHalfW * 2;
      const alpha = airborne ? .8 : .3 + crouch / .12 * .5;
      this.warning.fillStyle(0xff3a18, alpha * .3).fillEllipse(target, floor - 2, w, 12);
      this.warning.lineStyle(3, 0xff7a3a, alpha).strokeEllipse(target, floor - 2, w, 12);
    }
  }
  /** `heat` makes the cutting edge glow. */
  private drawSlashWing(g: Phaser.GameObjects.Graphics, wing: WingShape & { edge: [Point, Point] }, heat: number): void {
    wing.vanes.forEach((vane, n) => {
      const i = wing.vanes.length - 1 - n;
      g.fillStyle(i === 0 ? 0x241a16 : 0x1c1715).fillPoints(vec(vane.points), true);
      g.lineStyle(2, 0x8a5e2c).strokePoints(vec(vane.points), true);
      g.lineStyle(4, 0x5a2a14).lineBetween(vane.rib[0].x, vane.rib[0].y, vane.rib[1].x, vane.rib[1].y);
      if (vane.hole) g.fillStyle(0x050304).fillCircle(vane.hole.x, vane.hole.y, 3);
    });
    for (const t of wing.teeth) {
      g.fillStyle(0x3a2418).fillTriangle(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y);
      g.lineStyle(1.5, 0x9a6a34).strokeTriangle(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y);
    }
    const [root, joint] = wing.arm, [edgeStart, tipEdge] = wing.edge;
    g.lineStyle(11, 0x14100e).lineBetween(root.x, root.y, joint.x, joint.y);
    g.lineStyle(4, 0x6e4a26).lineBetween(root.x, root.y, joint.x, joint.y);
    g.fillStyle(0x0e0a0a).fillCircle(joint.x, joint.y, 9);
    g.lineStyle(2, 0x8a5e2c).strokeCircle(joint.x, joint.y, 8);
    g.fillStyle(0xa02a14).fillCircle(joint.x, joint.y, 3.5);
    if (heat > 0) {
      const glow = this.glow;
      glow.lineStyle(7, 0xff3a10, .45 * heat).lineBetween(edgeStart.x, edgeStart.y, tipEdge.x, tipEdge.y);
      glow.lineStyle(2.5, 0xffd090, .9 * heat).lineBetween(edgeStart.x, edgeStart.y, tipEdge.x, tipEdge.y);
      glow.fillStyle(0xffe0a0, .8 * heat).fillCircle(tipEdge.x, tipEdge.y, 4);
    }
  }
  /** Rust-red crescent behind the wing tip, thick at the head and tapering back along the arc. */
  private drawSlashTrail(glow: Phaser.GameObjects.Graphics, pivot: { x: number; y: number }, d: number, head: number, length: number, alpha: number): void {
    if (alpha <= 0) return;
    const arc = SLASH_TRAIL.arc * Math.max(0, length);
    for (const [thick, color, a] of [[SLASH_TRAIL.thick, 0x8a1a08, .4], [48, 0xff4a12, .5], [18, 0xffc080, .8]] as const) {
      const points = vec(rustSlashCrescent(pivot, d, head, thick, arc));
      if (points.length) glow.fillStyle(color, a * alpha).fillPoints(points, true);
    }
  }
  private drawLandingMark(x: number, alpha: number): void {
    const floor = RUSTWING_RULES.floorTop, r = RUSTWING_RULES.eruptRadius;
    this.warning.fillStyle(0xff3a18, alpha * .35).fillEllipse(x, floor - 2, r * 3, 8);
    this.warning.lineStyle(2, 0xff7a3a, alpha).strokeEllipse(x, floor - 2, r * 3, 8);
  }
}

function vec(points: readonly Point[]): Phaser.Math.Vector2[] {
  return points.map(p => new Phaser.Math.Vector2(p.x, p.y));
}

/** Rust-orange to molten red as the second-form transformation completes. */
function redden(t: number): number {
  const from = Phaser.Display.Color.ValueToColor(0xffffff), to = Phaser.Display.Color.ValueToColor(0xff6a58);
  return Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 1, Math.min(1, t * 1.4)).color;
}
