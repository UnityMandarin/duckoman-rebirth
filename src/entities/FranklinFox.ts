import Phaser from 'phaser';
import {canUltimateDamage,ownsUltimateFreeze,hasUltimateFreeze} from '../systems/ultimateFreeze';
import type { Player } from './Player';
import { Dashable } from './Dashable';
import type { KillImpulse } from '../systems/debrisMath';
import type { UltimateStrike } from '../systems/ultimateSwingMath';
import {
  createFranklinController,
  damageFranklin,
  franklinAcceptedChargeDamage,
  franklinCanAct,
  franklinCrash,
  franklinDamageAmount,
  franklinTailWaveBounds,
  FRANKLIN_RULES,
  FRANKLIN_VISUAL,
  franklinChipHealth,
  resumeFranklinWarning,
  tickFranklin,
  type FranklinController,
  type FranklinPhase,
} from '../systems/FranklinFireFoxRules';
import { createFranklinActing, sampleFranklinPresentation, franklinAttachment, franklinIntroZoom, sampleFranklinIntroFocus, sampleFranklinCrashFocus, franklinFocusScroll, franklinEase, FRANKLIN_POSES, type FranklinPose, type FranklinBeat, FRANKLIN_PACING, franklinIntroTime, franklinIntroTextAlpha, franklinFireballRay } from '../systems/FranklinPresentation';
import { renderScale } from '../systems/renderScale';

const FRANKLIN_PLAYER_FACING_PHASES:ReadonlySet<string>=new Set(['intro','resistance','overdrive','collapse','safe-chip','rescued']);

interface FoxFireball {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  remainingMs: number;
}
interface FranklinEffect {
  image: Phaser.GameObjects.Image;
  expiresAt: number;
}

/** Franklin stays alive throughout this fight. The final stomp breaks only his control chip. */
export class FranklinFox extends Dashable {
  readonly image: Phaser.GameObjects.Image;
  readonly chipImage: Phaser.GameObjects.Image;
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly healthBack: Phaser.GameObjects.Image;
  readonly healthFill: Phaser.GameObjects.Image;
  controller: FranklinController = createFranklinController();

  private alive = true;
  private cleaned = false;
  private cooldownUntil = 0;
  private previousPlayerBottom = 0;
  private resumePending = false;
  private trailClockMs = 0;
  private trailImages: FranklinEffect[] = [];
  private tailWaveImage: Phaser.GameObjects.Image;
  private pillarImages: FranklinEffect[] = [];
  private wallImpactImage: FranklinEffect;
  private chipChargeImage: Phaser.GameObjects.Image;
  private fireballs: FoxFireball[] = [];
  private readonly acting = createFranklinActing();
  private readonly chipPoint = {x:0,y:0};
  private readonly eyePoint = {x:0,y:0};
  private readonly mouthPoint = {x:0,y:0};
  private readonly tailPoint = {x:0,y:0};
  private readonly backPawPoint = {x:0,y:0};
  private readonly frontPawPoint = {x:0,y:0};
  private readonly chipBounds = {left:0,right:0,top:0,bottom:0};
  private visualClock = 0;
  private hurtMs = 0;
  private rescueMs = 0;
  private rescueStartX = 0;
  private rescueEndX = 0;
  private breakX = 0;
  private breakY = 0;
  private cameraBeat = -1;
  private cameraFollowing = false;
  private cinematicCameraActive = false;
  private inactive = false;
  private crashCameraActive = false;
  private readonly cinematicFocus = {x:0,y:0};
  private readonly cinematicScroll = {x:0,y:0};
  private readonly crashStartFocus = {x:0,y:320};
  private framePose?: FranklinPose;
  private previewClock = 0;
  private readonly localFlames: Phaser.GameObjects.Image[];
  private readonly fragments: Phaser.GameObjects.Image[];
  private readonly heart: Phaser.GameObjects.Image;
  private readonly eyeLight: Phaser.GameObjects.Image;
  private readonly chipLight: Phaser.GameObjects.Image;
  private readonly hudChip: Phaser.GameObjects.Image;
  private readonly introText: Phaser.GameObjects.Text;
  private readonly laserBeam: Phaser.GameObjects.Image;
  private readonly tailWarning: Phaser.GameObjects.Image;
  private readonly resistanceWarning: Phaser.GameObjects.Image;
  private readonly laserEmitter: Phaser.GameObjects.Image;
  private readonly laserReticle: Phaser.GameObjects.Image;
  private readonly fireballRay = {x:0,y:0,dx:0,dy:0,length:0,endX:0,endY:0};
  private readonly pips: Phaser.GameObjects.Image[];
  private readonly afterPlayerVisual = (): void => {
    if (!this.cinematicLocked || !this.presentationActive()) return;
    this.player.facing = this.image.x < this.player.body.center.x ? -1 : 1;
    this.player.visual?.setRotation(this.player.facing * (this.controller.phase === 'intro' ? .035 : -.025));
  };
  private strikeListener: (strike: UltimateStrike) => void;
  private shutdownListener: () => void;
  private readonly onRescued: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    onRescued: () => void,
    x = 790,
    private readonly previewBeat?: FranklinBeat,
  ) {
    super();
    this.onRescued = onRescued;
    this.image = scene.add.image(x, 360, 'franklin-story-poses', 'friendly')
      .setOrigin(0.5, 1).setDisplaySize(FRANKLIN_VISUAL.referenceWidth, FRANKLIN_VISUAL.referenceHeight).setDepth(13);
    this.chipImage = scene.add.image(-1000, -1000, 'franklin-control-chip', 'visible')
      .setOrigin(0.5).setDisplaySize(FRANKLIN_VISUAL.chipPlateWidth, FRANKLIN_VISUAL.chipPlateHeight).setDepth(14);
    this.graphics = scene.add.graphics().setDepth(17);
    // Static light texture: image overlays retain readable, soft cores at arena scale.
    const lightKey='franklin-control-light';
    if(!scene.textures.exists(lightKey)) {
      const light=scene.textures.createCanvas(lightKey,32,32)!;
      const ctx=light.context,halo=ctx.createRadialGradient(16,16,4,16,16,16);
      halo.addColorStop(0,'rgba(255,24,62,.65)');halo.addColorStop(1,'rgba(255,24,62,0)');
      ctx.fillStyle=halo;ctx.fillRect(0,0,32,32);
      ctx.fillStyle='#ff294f';ctx.beginPath();ctx.arc(16,16,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffd0d6';ctx.beginPath();ctx.arc(16,16,2.5,0,Math.PI*2);ctx.fill();light.refresh();
    }
    this.eyeLight=scene.add.image(0,0,lightKey).setDisplaySize(16,16).setDepth(16).setVisible(false);
    this.chipLight=scene.add.image(0,0,lightKey).setDisplaySize(10,10).setDepth(15).setVisible(false);
    this.hudChip = scene.add.image(403, 30, 'franklin-control-chip', 'visible').setDisplaySize(16, 20).setScrollFactor(0).setDepth(63);
    this.healthBack = scene.add.image(414, 18, 'franklin-chip-hp-frame').setOrigin(0).setDisplaySize(220,24).setScrollFactor(0).setDepth(62);
    this.healthFill = scene.add.image(423, 25, 'franklin-chip-hp-fill').setOrigin(0).setDisplaySize(202,10).setScrollFactor(0).setDepth(63);
    this.pips = Array.from({length:3}, (_,i)=>scene.add.image(590+i*12,46,'franklin-chip-hp-fuse').setDisplaySize(8,10).setScrollFactor(0).setDepth(63));
    this.introText=scene.add.text(320,94,'Franklin Fox — one of Duckoman’s best friends.\nA control chip is forcing him to fight.',{fontFamily:'Georgia',fontSize:'13px',color:'#f3e6cc',align:'center',stroke:'#211821',strokeThickness:2,lineSpacing:4,wordWrap:{width:390},shadow:{offsetX:1,offsetY:2,color:'#160e17',blur:2,fill:true}}).setOrigin(.5).setScrollFactor(0).setDepth(64).setVisible(false);
    this.tailWarning=scene.add.image(-1000,-1000,'franklin-tail-warning').setOrigin(0,.5).setDisplaySize(180,6).setDepth(17).setAlpha(.75).setVisible(false);
    this.resistanceWarning=scene.add.image(-1000,-1000,'franklin-resistance-warning').setOrigin(0,.5).setDisplaySize(65,6).setDepth(17).setAlpha(.9).setVisible(false);
    this.laserEmitter=scene.add.image(-1000,-1000,'franklin-eye-scope','emitter').setDisplaySize(14,14).setDepth(17).setVisible(false);
    this.laserBeam=scene.add.image(-1000,-1000,'franklin-eye-scope','beam').setOrigin(0,.5).setDepth(17).setVisible(false);
    this.laserReticle=scene.add.image(-1000,-1000,'franklin-eye-scope','reticle').setDisplaySize(24,24).setDepth(17).setVisible(false);
    this.localFlames = Array.from({length:3},()=>scene.add.image(-1000,-1000,'franklin-flame-pillar','visible').setDisplaySize(9,15).setOrigin(.5,1).setDepth(14).setVisible(false));
    this.fragments = Array.from({length:6},(_,i)=>scene.add.image(-1000,-1000,'franklin-control-chip',`fragment-${i}`).setDisplaySize(4,7).setDepth(16).setVisible(false));
    this.heart = scene.add.image(-1000,-1000,'quality-chapter-hud','chapter-hud-heart-full').setDisplaySize(10,9).setDepth(16).setVisible(false);
    this.strikeListener = strike => {
      if(strike.player===player&&strike.player.usingUltimate&&this.alive&&canUltimateDamage(this.scene,player)&&!this.previewBeat&&this.controller.phase==='safe-chip'&&!this.resumePending){if(strike.tryHit(this,this.chipBounds))this.finalizeRescue(false);return;}
      if (strike.player === player && strike.player.usingUltimate && this.alive&&canUltimateDamage(this.scene,player) && this.canReceiveDamage()) {
        if (strike.tryHit(this, this.image.getBounds())) this.acceptDamage('ultimate');
      }
    };
    this.shutdownListener = () => this.destroy(true);
    scene.events.on('ultimate-strike', this.strikeListener);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPlayerVisual);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownListener);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.markResume);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.markResume);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.previousPlayerBottom = player.body.bottom;
    this.fireballs = Array.from({ length: 8 }, () => {
      const image = scene.add.image(-1000, -1000, 'franklin-fireball', 'visible')
        .setOrigin(0.72, 0.56).setDisplaySize(18 * 1019 / 669, 18).setDepth(14).setVisible(false);
      return { image, x: 0, y: 0, vx: 0, vy: 0, remainingMs: 0 };
    });
    this.trailImages = this.makeEffectPool(8, 'franklin-pounce-trail', 14);
    this.tailWaveImage = scene.add.image(-1000, -1000, 'franklin-tail-wave', 'visible')
      .setOrigin(0.5).setDisplaySize(FRANKLIN_RULES.waveWidth, FRANKLIN_RULES.waveHeight).setDepth(12).setVisible(false);
    this.pillarImages = this.makeEffectPool(4, 'franklin-flame-pillar', 12);
    this.wallImpactImage = this.makeEffectPool(1, 'franklin-wall-impact', 16)[0];
    this.chipChargeImage = scene.add.image(-1000, -1000, 'franklin-chip-charge', 'visible')
      .setOrigin(1, 0.5).setDisplaySize(80, 35).setDepth(12).setVisible(false);
    if(this.previewBeat)this.resetPreview();
    this.applyPose();
    this.updateCamera();
    this.draw();
    this.updateHud();
  }

  private readonly markResume = (): void => {
    if(hasUltimateFreeze(this.scene,this.player)&&this.player.active&&this.player.usingUltimate&&document.visibilityState==='visible')return;
    this.resumePending = true;
    if(this.inactive)return;
    this.inactive=true;this.clearHazards();
    this.restoreCamera(this.controller.phase === 'rescued' ? 1 : .68);this.cameraBeat=-1;this.crashCameraActive=false;
  };
  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') this.markResume();
  };

  private makeEffectPool(count: number, texture: string, depth: number): FranklinEffect[] {
    return Array.from({ length: count }, () => ({
      image: this.scene.add.image(-1000, -1000, texture, 'visible').setDepth(depth).setVisible(false),
      expiresAt: 0,
    }));
  }

  private hideEffectPool(pool: readonly FranklinEffect[]): void {
    for (const effect of pool) {
      effect.expiresAt = 0;
      effect.image.setVisible(false).setPosition(-1000, -1000);
    }
  }

  private showEffect(
    pool: readonly FranklinEffect[], x: number, y: number, direction: number,
    lifetimeMs: number, width: number, height: number,
  ): void {
    const effect = pool.find(candidate => candidate.expiresAt <= this.scene.time.now);
    if (!effect) return;
    effect.expiresAt = this.scene.time.now + lifetimeMs;
    effect.image.setPosition(x, y).setFlipX(direction < 0).setDisplaySize(width, height).setVisible(true);
  }

  get hp(): number { return this.controller.hp; }
  /** Rescue ends combat, not Franklin's life. */
  get isAlive(): boolean { return !this.cleaned; }
  get isCombatActive(): boolean { return this.alive; }
  get phase(): string { return this.controller.phase; }

  get cinematicLocked(): boolean { return this.controller.phase === 'intro' || this.controller.phase === 'rescued' && this.rescueMs < 2800; }
  get chipTarget() { return this.chipBounds; }
  private presentationActive(): boolean { return document.visibilityState === 'visible' && this.player.active && this.scene.sys.isActive() && !this.scene.physics.world.isPaused; }

  private canAct(): boolean {
    return franklinCanAct({
      hidden: document.visibilityState !== 'visible',
      dead: !this.player.active,
      paused: !this.scene.sys.isActive() || this.scene.physics.world.isPaused,
    }) && this.alive;
  }

  private canReceiveDamage(): boolean {
    return !this.previewBeat && !['intro', 'collapse', 'final-cue', 'final-charge', 'crash', 'safe-chip', 'rescued'].includes(this.controller.phase)
      && this.scene.time.now >= this.cooldownUntil && !this.resumePending;
  }

  private bodyBounds() {
    return {
      left: this.image.x - FRANKLIN_VISUAL.bodyWidth / 2,
      right: this.image.x + FRANKLIN_VISUAL.bodyWidth / 2,
      top: this.image.y - FRANKLIN_VISUAL.bodyHeight,
      bottom: this.image.y,
    };
  }

  protected dashBounds() {
    return this.canAct() && this.canReceiveDamage() ? this.bodyBounds() : null;
  }

  protected onDash(_source: Player, _impulse: KillImpulse): void {
    this.acceptDamage('dash');
  }

  /** Public damage path for thrown cakes and direct fight integration. */
  damage(attack: 'dash' | 'stomp' | 'throw' | 'ultimate'): boolean {
    return this.acceptDamage(attack);
  }

  canBeHit(): boolean { return this.canAct() && this.canReceiveDamage(); }
  stopHazards(): void { this.markResume(); }

  overlapsCake(x: number, y: number, radius = 18): boolean {
    const body = this.bodyBounds();
    const nearestX = Phaser.Math.Clamp(x, body.left, body.right);
    const nearestY = Phaser.Math.Clamp(y, body.top, body.bottom);
    return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
  }

  private acceptDamage(attack: 'dash' | 'stomp' | 'throw' | 'ultimate'): boolean {
    if (!(attack==='ultimate'?this.alive&&canUltimateDamage(this.scene,this.player):this.canAct()) || !this.canReceiveDamage()) return false;
    this.cooldownUntil = this.scene.time.now + FRANKLIN_RULES.hitCooldownMs;
    this.controller = damageFranklin(this.controller, franklinDamageAmount(attack));
    this.player.chargeUltimate(FRANKLIN_RULES.hitReward);
    this.hurtMs = 180;
    if (this.controller.phase === 'collapse' || this.controller.phase === 'overdrive') this.clearHazards();
    this.updateHud();
    return true;
  }

  update(deltaMs: number, hidden = document.visibilityState !== 'visible'): void {
    if(this.cleaned||!hidden&&ownsUltimateFreeze(this.scene,this.player))return;
    const body = this.player.body;
    if (!this.presentationActive() || hidden) {
      this.markResume();
      this.previousPlayerBottom = body.bottom;
      this.graphics.clear();
      return;
    }
    this.inactive=false;
    const dt = Math.min(50, Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0));
    if (this.resumePending || deltaMs > 200) {
      this.resumePending = false;
      if(this.controller.phase!=='intro'&&this.controller.phase!=='rescued')this.controller = resumeFranklinWarning(this.controller);
      this.previousPlayerBottom = body.bottom;
      this.clearHazards();
      this.image.setY(360).setRotation(0);
      this.cameraBeat = -1;
      this.applyPose(); this.updateCamera(); this.draw();this.updateHud();
      return;
    }
    this.visualClock += dt;
    this.hurtMs = Math.max(0, this.hurtMs-dt);
    if(this.previewBeat) {
      this.previewClock += dt;
      const length=this.previewBeat==='intro'?FRANKLIN_RULES.introMs:this.previewBeat==='rescued'?4950:this.previewBeat==='barrage'?1900:this.previewBeat==='tail'?1800:this.previewBeat==='crash'?3600:this.previewBeat==='safe-chip'?4000:1200;
      if(this.previewClock>=length){this.previewClock=0;this.resetPreview();this.cameraBeat=-1;}
      if(this.previewBeat==='tail'){this.controller.phase=this.previewClock<900?'tail-cue':'tail';this.controller.elapsed=this.previewClock<900?this.previewClock:this.previewClock-900;}
      else if(this.previewBeat==='barrage'){this.controller.phase=this.previewClock<700?'barrage-cue':'barrage';this.controller.elapsed=this.previewClock<700?this.previewClock:this.previewClock-700;}
      else if(this.previewBeat==='crash'){const elapsed=this.previewClock%1200;if(elapsed<this.controller.elapsed)this.crashCameraActive=false;this.controller.elapsed=elapsed;this.controller.cleanCrashes=Math.min(3,1+Math.floor(this.previewClock/1200));}
      else this.controller.elapsed=this.previewClock;
      if(this.previewBeat==='rescued'){this.rescueMs=this.previewClock/FRANKLIN_PACING.rescueScale;this.updateReunionPosition();}
      this.applyPose();this.updateCamera();this.draw();this.updateHud();this.previousPlayerBottom=body.bottom;
      return;
    }
    if(this.controller.phase==='rescued') {
      this.rescueMs=Math.min(2800,this.rescueMs+dt/FRANKLIN_PACING.rescueScale);
      this.updateReunionPosition();
      this.applyPose();this.updateCamera();this.draw();this.updateHud();this.previousPlayerBottom=body.bottom;
      return;
    }
    const previous = this.controller;
    this.controller = tickFranklin(this.controller, dt, {
      playerX: body.center.x,
      playerY: body.center.y,
      bossX: this.image.x,
      hidden,
      dead: !this.player.active,
      paused: this.scene.physics.world.isPaused,
    });
    this.lockCueInputs(previous, this.controller, body.center.x, body.center.y);
    if (previous.phase === 'wallbounce' && this.controller.phase === 'pounce-cue') {
      // Cue entry turns him toward Duckoman; the impact belongs at the wall just reached.
      this.showEffect([this.wallImpactImage], this.image.x, 325, previous.direction,
        180, 72, 72 * 1031 / 1077);
    }
    this.moveFox(dt);
    this.updateCamera();
    this.updatePounceTrail(dt);
    if (this.controller.phase === 'barrage' && previous.phase !== 'barrage') this.spawnFireball();
    else if (this.controller.phase === 'barrage' && this.controller.projectileIndex > previous.projectileIndex) this.spawnFireball();

    // A valid stomp has priority over contact damage and cannot hurt Duckoman first.
    const stomped = this.resolvePlayerStomp();
    this.updateFireballs(dt);
    if (!stomped) this.resolveAttackDamage();
    this.finishFinalChargeIfAtWall();
    this.previousPlayerBottom = body.bottom;
    this.draw();
    this.updateHud();
  }

  private lockCueInputs(previous: FranklinController, current: FranklinController, playerX: number, playerY: number): void {
    if (current.phase === previous.phase) return;
    if (current.phase === 'pounce-cue') {
      current.direction = playerX < this.image.x ? -1 : 1;
      current.aimX = playerX;
    } else if (current.phase === 'wallbounce-cue') {
      current.direction = this.image.x < 1000 ? -1 : 1;
    } else if (current.phase === 'barrage-cue') {
      current.aimX = playerX;
      current.aimY = playerY;
      current.direction = playerX < this.image.x ? 1 : -1; // Back away from Duckoman.
    } else if (current.phase === 'tail-cue') {
      current.direction = this.image.x < playerX ? 1 : -1;
      current.aimX = this.image.x;
    } else if (current.phase === 'final-cue') {
      current.direction = playerX < this.image.x ? -1 : 1;
      current.aimX = playerX;
    }
    if (current.phase === 'barrage-cue' || current.phase === 'pillars-cue' || current.phase === 'final-cue') {
      this.clearHazards();
    }
  }

  private moveFox(dt: number): void {
    const phase = this.controller.phase;
    const delta = dt / 1000;
    if(phase!=='pounce')this.image.y=360;
    if (phase === 'pounce') {
      const speed = this.controller.phase2 ? FRANKLIN_RULES.overdriveSpeed : FRANKLIN_RULES.pounceSpeed;
      this.image.x = Phaser.Math.Clamp(this.image.x + this.controller.direction * speed * delta, 155, 1845);
      this.image.y = 360 - Math.sin(Math.PI * this.controller.elapsed / FRANKLIN_RULES.pounceMs) * 45;
    } else if (phase === 'wallbounce') {
      this.image.x = Phaser.Math.Clamp(this.image.x + this.controller.direction * FRANKLIN_RULES.wallBounceSpeed * delta, 155, 1845);
    } else if (phase === 'barrage-cue') {
      this.image.x = Phaser.Math.Clamp(this.image.x + this.controller.direction * 100 * delta, 155, 1845);
    } else if (phase === 'final-charge') {
      this.image.x = Phaser.Math.Clamp(this.image.x + this.controller.direction * FRANKLIN_RULES.crashSpeed * delta, 155, 1845);
    }
    const facing = phase === 'barrage-cue' || phase === 'barrage'
      ? (this.controller.aimX < this.image.x ? -1 : 1)
      : this.controller.direction;
    this.image.setFlipX(facing < 0);
    this.applyPose();
  }

  private applyPose(): void {
    sampleFranklinPresentation(this.controller, this.visualClock, this.hurtMs, this.rescueMs, this.acting);
    const a=this.acting, f=FRANKLIN_POSES[a.pose];
    if(this.framePose!==a.pose){this.image.setTexture(f.texture,a.pose);this.framePose=a.pose;}
    const width=66*a.sx,height=66*f.height/f.width*a.sy;
    this.image.setDisplaySize(width,height).setRotation(a.rotation).setOrigin(.5-a.offsetX/width,1-a.offsetY/height);
    if(this.controller.phase==='barrage-cue'||this.controller.phase==='barrage')this.image.setFlipX(this.controller.aimX<this.image.x);
    if(FRANKLIN_PLAYER_FACING_PHASES.has(this.controller.phase))this.image.setFlipX(this.player.body.center.x<this.image.x);
    this.syncAttachments();
  }

  private syncAttachments(): void {
    const a=this.acting,f=FRANKLIN_POSES[a.pose],w=66*a.sx,h=66*f.height/f.width*a.sy;
    franklinAttachment(a.pose,'chip',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.chipPoint);
    franklinAttachment(a.pose,'eye',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.eyePoint);
    franklinAttachment(a.pose,'mouth',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.mouthPoint);
    franklinAttachment(a.pose,'tail',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.tailPoint);
    franklinAttachment(a.pose,'backPaw',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.backPawPoint);
    franklinAttachment(a.pose,'frontPaw',this.image.x,this.image.y,w,h,this.image.flipX,a.rotation,a.offsetX,a.offsetY,this.frontPawPoint);
    const damage=Math.min(3,this.controller.cleanCrashes);
    if(damage===3)this.chipPoint.y-=7;
    this.chipImage.setPosition(this.chipPoint.x,this.chipPoint.y).setFlipX(this.image.flipX).setRotation(a.rotation+(this.image.flipX?-1:1)*damage*.045).setVisible(this.controller.phase!=='rescued');
    this.chipBounds.left=this.chipPoint.x-11;this.chipBounds.right=this.chipPoint.x+11;
    this.chipBounds.top=this.chipPoint.y-9;this.chipBounds.bottom=this.chipPoint.y+9;
  }

  private restoreCamera(multiplier:number):void {
    const camera=this.scene.cameras.main;
    if(!camera)return;
    camera.panEffect?.reset();camera.zoomEffect?.reset();
    camera.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).setZoom(multiplier*renderScale());
    this.cameraFollowing=true;this.cinematicCameraActive=false;
  }

  private focusCamera(multiplier:number):void {
    const camera=this.scene.cameras.main,zoom=multiplier*renderScale();
    if(!this.cinematicCameraActive){camera.stopFollow();this.cameraFollowing=false;this.cinematicCameraActive=true;}
    camera.setZoom(zoom);
    franklinFocusScroll(this.cinematicFocus,camera.width,camera.height,zoom,this.cinematicScroll);
    camera.setScroll(this.cinematicScroll.x,this.cinematicScroll.y);
  }

  private updateCamera():void {
    const phase=this.controller.phase,t=this.controller.elapsed,camera=this.scene.cameras.main;
    if(phase==='intro') {
      if(t<FRANKLIN_PACING.introFollowMs){
        sampleFranklinIntroFocus(franklinIntroTime(t),this.player.body.center.x,this.image.x,this.cinematicFocus);
        this.focusCamera(franklinIntroZoom(franklinIntroTime(t)));
      } else if(!this.cameraFollowing)this.restoreCamera(.68);
    } else if(phase==='crash') {
      if(!this.crashCameraActive){
        this.crashCameraActive=true;this.crashStartFocus.x=this.player.body.center.x;this.crashStartFocus.y=320;
      }
      if(t<950){const zoom=sampleFranklinCrashFocus(t,this.crashStartFocus,this.player.body.center.x,this.image.x,this.cinematicFocus);this.focusCamera(zoom);}
      else if(!this.cameraFollowing)this.restoreCamera(.68);
    } else if(phase==='rescued') {
      if(this.rescueMs<2800){
        this.cinematicFocus.x=(this.player.body.center.x+this.image.x)/2;this.cinematicFocus.y=320;
        this.focusCamera(.68+.32*franklinEase(this.rescueMs/700));
      }else if(!this.cameraFollowing)this.restoreCamera(1);
      this.crashCameraActive=false;
    } else {
      this.crashCameraActive=false;
      if(!this.cameraFollowing)this.restoreCamera(.68);
    }
  }

  private initializeReunion():void {
    this.rescueStartX=this.image.x;
    this.rescueEndX=Phaser.Math.Clamp(this.player.body.center.x+(this.image.x<this.player.body.center.x?-65:65),155,1845);
    this.breakX=this.chipPoint.x;this.breakY=this.chipPoint.y;
  }

  private updateReunionPosition():void {
    this.image.setFlipX(this.player.body.center.x<this.image.x);
    if(this.rescueMs>=1700)this.image.x=this.rescueStartX+(this.rescueEndX-this.rescueStartX)*franklinEase((this.rescueMs-1700)/800);
  }

  private resetPreview():void {
    this.controller=createFranklinController();this.image.setPosition(790,360);this.rescueMs=0;
    if(this.previewBeat==='tail')this.controller.phase='tail-cue';
    else if(this.previewBeat)this.controller.phase=this.previewBeat;
    if(this.previewBeat==='tail'){this.controller.aimX=this.image.x;this.controller.direction=this.player.body.center.x<this.image.x?-1:1;}
    if(this.previewBeat==='barrage'){this.controller.phase='barrage-cue';this.controller.aimX=540;this.controller.aimY=320;this.image.setFlipX(true);}
    if(this.previewBeat==='overdrive')this.controller.phase2=true;
    if(this.previewBeat==='crash')this.controller.cleanCrashes=1;
    if(this.previewBeat==='safe-chip'||this.previewBeat==='rescued')this.controller.cleanCrashes=3;
    this.clearHazards();this.crashCameraActive=false;
    if(this.previewBeat==='rescued'){
      this.controller.phase='safe-chip';this.applyPose();this.initializeReunion();this.controller.phase='rescued';
    }
  }

  private updatePounceTrail(dt: number): void {
    for (const effect of this.trailImages) {
      if (effect.expiresAt && effect.expiresAt <= this.scene.time.now) {
        effect.expiresAt = 0;
        effect.image.setVisible(false);
      } else if (effect.expiresAt) effect.image.setAlpha(Math.max(0, (effect.expiresAt - this.scene.time.now) / 450));
    }
    if (this.controller.phase !== 'pounce') { this.trailClockMs = 0; return; }
    this.trailClockMs += dt;
    if (this.trailClockMs >= 65) {
      this.trailClockMs = 0;
      this.showEffect(this.trailImages, this.image.x - this.controller.direction * 24, this.image.y - 24,
        this.controller.direction, 450, 40, 40 * 293 / 1433);
    }
  }

  private resolvePlayerStomp(): boolean {
    const phase = this.controller.phase;
    const final = phase === 'safe-chip';
    if (!final && !['overdrive', 'pounce-cue', 'pounce', 'wallbounce-cue', 'wallbounce', 'barrage-cue', 'barrage', 'tail-cue', 'tail', 'pillars-cue', 'pillars', 'resistance'].includes(phase)) return false;
    if (!this.player.active || this.player.body.velocity.y <= 0) return false;
    const body = this.player.body;
    const bounds = final
      ? this.chipBounds
      : this.bodyBounds();
    const crossedTop = this.previousPlayerBottom <= bounds.top + 4 && body.bottom >= bounds.top;
    const horizontalOverlap = body.right > bounds.left && body.left < bounds.right;
    if (!crossedTop || !horizontalOverlap) return false;
    if (final) {
      if (this.controller.phase !== 'safe-chip' || !this.alive) return false;
      return this.finalizeRescue(true);
    }
    if (!this.canReceiveDamage() || !this.acceptDamage('stomp')) return false;
    this.player.bounceFromStomp();
    return true;
  }

  private finalizeRescue(stomp:boolean):boolean {
    if(this.controller.phase!=='safe-chip'||!this.alive)return false;
      this.controller.phase = 'rescued';
      this.controller.rescued = true;
      this.alive = false;
      this.controller.elapsed=0;
      this.rescueMs=0;
      this.initializeReunion();
      if(stomp)this.player.bounceFromStomp();
      this.clearHazards();
      this.graphics.clear();
      const bounds=this.chipBounds;
      const centerX = (bounds.left + bounds.right) / 2;
      this.graphics.fillStyle(0x53d7ff, 0.9).fillCircle(centerX, bounds.top, 13);
      this.graphics.fillStyle(0xf7cb73, 0.8).fillCircle(centerX, bounds.top, 6);
      this.image.clearTint();
      this.scene.cameras.main.flash(60,255,225,175);
      this.scene.cameras.main.shake(120,.002);
      this.restoreCamera(.68);
      this.applyPose();
      this.updateHud();
      this.onRescued();
      return true;
  }

  private resolveAttackDamage(): void {
    if (!this.player.active || this.player.isDashing || this.player.usingUltimate) return;
    const body = this.player.body;
    const phase = this.controller.phase;
    let hit = false;
    if (phase === 'pounce' || phase === 'final-charge') {
      const fox = this.bodyBounds();
      hit = body.left < fox.right && body.right > fox.left && body.top < fox.bottom && body.bottom > fox.top;
    } else if (phase === 'tail') {
      const wave = franklinTailWaveBounds(this.controller);
      hit = body.left < wave.right && body.right > wave.left && body.top < wave.bottom && body.bottom > wave.top;
    } else if (phase === 'pillars') {
      hit = this.controller.hazards.some(x => body.left < x + FRANKLIN_RULES.pillarWidth / 2
        && body.right > x - FRANKLIN_RULES.pillarWidth / 2 && body.top < 360 && body.bottom > 220);
    }
    if (hit && this.player.takeDamage(this.image.x, 1) && phase === 'final-charge') {
      this.controller = franklinAcceptedChargeDamage(this.controller);
    }
  }

  private updateFireballs(dt: number): void {
    for (const shot of this.fireballs) {
      if (shot.remainingMs <= 0) continue;
      shot.remainingMs -= dt;
      shot.x += shot.vx * dt / 1000;
      shot.y += shot.vy * dt / 1000;
      if (shot.remainingMs <= 0 || shot.x < 70 || shot.x > 1930 || shot.y < 170 || shot.y > 380) {
        this.deactivateFireball(shot);
        continue;
      }
      shot.image.setPosition(shot.x, shot.y);
      if (!this.canAct()) { this.deactivateFireball(shot); continue; }
      if (this.player.isDashing || this.player.usingUltimate) continue;
      const body = this.player.body;
      if (shot.x + 9 > body.left && shot.x - 9 < body.right && shot.y + 9 > body.top && shot.y - 9 < body.bottom) {
        if (this.player.takeDamage(shot.x, 1)) this.deactivateFireball(shot);
      }
    }
  }

  private spawnFireball(): void {
    const shot = this.fireballs.find(projectile => projectile.remainingMs <= 0);
    if (!shot) return;
    franklinFireballRay(this.image.x,this.image.y,this.controller.aimX,this.controller.aimY,this.fireballRay);
    const ray=this.fireballRay,sign=ray.dx<0?-1:1;
    shot.x=ray.x;shot.y=ray.y;shot.vx=ray.dx*FRANKLIN_RULES.fireballSpeed;shot.vy=ray.dy*FRANKLIN_RULES.fireballSpeed;
    shot.remainingMs = 2600;
    shot.image.setOrigin(sign < 0 ? 0.28 : 0.72, 0.56)
      .setPosition(shot.x, shot.y).setFlipX(sign < 0).setVisible(true);
  }

  private deactivateFireball(shot: FoxFireball): void {
    shot.remainingMs = 0;
    shot.image.setVisible(false).setPosition(-1000, -1000);
  }

  private clearProjectiles(): void {
    for (const shot of this.fireballs) this.deactivateFireball(shot);
  }

  private clearHazards(): void {
    this.clearProjectiles();
    this.tailWarning?.setVisible(false);this.resistanceWarning?.setVisible(false);
    this.laserBeam?.setVisible(false);this.laserEmitter?.setVisible(false);this.laserReticle?.setVisible(false);this.introText?.setVisible(false);
    this.trailClockMs = 0;
    this.hideEffectPool(this.trailImages);
    this.hideEffectPool(this.pillarImages);
    this.hideEffectPool([this.wallImpactImage]);
    this.tailWaveImage.setVisible(false);
    this.chipChargeImage.setVisible(false);
    this.localFlames?.forEach(image=>image.setVisible(false));
    this.heart?.setVisible(false);
    this.eyeLight?.setVisible(false);this.chipLight?.setVisible(false);
  }

  private finishFinalChargeIfAtWall(): void {
    if (this.controller.phase !== 'final-charge') return;
    const atWall = this.image.x <= 155 || this.image.x >= 1845;
    if (!atWall) return;
    this.controller = franklinCrash(this.controller, !this.controller.damagedDuringCharge);
    this.clearHazards();
    this.showEffect([this.wallImpactImage], this.image.x, 325, this.controller.direction, 300, 72, 72 * 1031 / 1077);
    this.scene.cameras.main.shake(120, 0.003);
    this.applyPose();this.crashCameraActive=false;this.updateCamera();
  }

  private draw(): void {
    this.syncAttachments();
    const g=this.graphics.clear(),phase=this.controller.phase,a=this.acting;
    const chip=this.chipBounds,chipX=this.chipPoint.x,chipY=this.chipPoint.y;
    const pulse=.8+.2*Math.sin(this.visualClock*.025);
    this.eyeLight.setPosition(this.eyePoint.x,this.eyePoint.y).setAlpha(a.eye).setVisible(phase!=='rescued'&&a.eye>0);
    this.chipLight.setPosition(chipX,chipY).setAlpha(a.core*pulse).setVisible(phase!=='rescued'&&a.core>0);
    if(phase!=='rescued') {
      if(a.arc>0){
        const midX=(chipX+this.eyePoint.x)/2,midY=(chipY+this.eyePoint.y)/2-3;
        g.lineStyle(1,0xff5264,a.arc*pulse).lineBetween(chipX,chipY,midX,midY).lineBetween(midX,midY,this.eyePoint.x,this.eyePoint.y).lineBetween(midX,midY,midX-2,midY+5);
      }
      const cracks=Math.min(3,this.controller.cleanCrashes),sign=this.image.flipX?-1:1;
      g.lineStyle(.9,0x20141b,.95);
      if(cracks>=1)g.lineBetween(chipX-3,chipY-6,chipX+1,chipY-1).lineBetween(chipX+1,chipY-1,chipX-2,chipY+3);
      if(cracks>=2)g.lineBetween(chipX+4,chipY-5,chipX,chipY+1).lineBetween(chipX,chipY+1,chipX+4,chipY+5);
      if(cracks>=3)g.lineBetween(chipX-4,chipY+1,chipX+4,chipY-2);
      if(cracks>0){g.lineStyle(.8,0xc88d71,.7).lineBetween(chipX-sign*4,chipY+4,chipX-sign*7,chipY+7+cracks);}
    }
    for(let i=0;i<this.localFlames.length;i++) {
      const flame=this.localFlames[i],visible=a.fire>.05&&phase!=='rescued';
      flame.setVisible(visible);
      if(visible){const tail=i===2,paw=i===0?this.backPawPoint:this.frontPawPoint;flame.setPosition(tail?this.tailPoint.x:paw.x,tail?this.tailPoint.y+5:paw.y).setDisplaySize(tail?11:8,(tail?17:13)*(1+a.fire*.3)).setAlpha(a.fire*(.8+.2*Math.sin(this.visualClock*.021+i))).setFlipX(this.image.flipX);}
    }
    this.heart.setVisible(a.heart>0);
    if(a.heart>0)this.heart.setPosition((this.image.x+this.player.body.center.x)/2,Math.min(this.image.y,360)-48-Math.sin(this.visualClock*.004)*2).setAlpha(a.heart);
    if(a.mouthFlash>0)g.fillStyle(0xffd27d,a.mouthFlash).fillCircle(this.mouthPoint.x,this.mouthPoint.y,3);
    if((phase==='tail'&&this.controller.elapsed<340)||phase==='tail-cue'&&a.pose==='tail-sweep'){
      const x=this.tailPoint.x,y=this.tailPoint.y,sign=this.image.flipX?-1:1;
      g.lineStyle(2,0xffab51,.75).lineBetween(x-sign*8,y-8,x+sign*4,y-3).lineBetween(x+sign*4,y-3,x+sign*11,y+5);
    }
    this.tailWaveImage.setVisible(phase === 'tail');
    if (phase === 'tail') {
      const wave = franklinTailWaveBounds(this.controller);
      this.tailWaveImage.setPosition((wave.left + wave.right) / 2, (wave.top + wave.bottom) / 2)
        .setFlipX(this.controller.direction < 0)
        .setDisplaySize(FRANKLIN_RULES.waveWidth, FRANKLIN_RULES.waveHeight);
    }
    this.wallImpactImage.image.setVisible(this.wallImpactImage.expiresAt > this.scene.time.now);
    if (phase === 'final-charge') {
      this.chipChargeImage.setPosition(this.image.x - this.controller.direction * 24, this.image.y - 24)
        .setOrigin(this.controller.direction < 0 ? 0 : 1, 0.5)
        .setFlipX(this.controller.direction < 0)
        .setDisplaySize(80, 80 * 376 / 1816).setVisible(true);
    } else this.chipChargeImage.setVisible(false);
    if (phase === 'wallbounce-cue' || phase === 'final-cue') {
      const wall = this.controller.direction < 0 ? 155 : 1845;
      g.lineStyle(2, 0xffa65e, 0.8).lineBetween(wall, 280, wall, 360);
      if(phase==='final-cue')g.lineStyle(1,0xffb96f,.3).lineBetween(this.image.x,354,wall,354);
    }
    const sight=phase==='barrage-cue'&&!this.inactive&&this.presentationActive();
    this.laserBeam.setVisible(sight);this.laserEmitter.setVisible(sight);this.laserReticle.setVisible(sight);
    if(sight){
      franklinFireballRay(this.image.x,this.image.y,this.controller.aimX,this.controller.aimY,this.fireballRay);
      const ray=this.fireballRay,alpha=.75+.25*Math.min(1,this.controller.elapsed/(this.controller.phase2?600:700));
      const distance=Math.min(ray.length,Math.abs(this.controller.aimX-ray.x)/Math.abs(ray.dx));
      const targetX=ray.x+ray.dx*distance,targetY=ray.y+ray.dy*distance;
      const dx=targetX-this.eyePoint.x,dy=targetY-this.eyePoint.y;
      this.laserBeam.setPosition(this.eyePoint.x,this.eyePoint.y).setDisplaySize(Math.hypot(dx,dy),18).setRotation(Math.atan2(dy,dx)).setAlpha(alpha);
      this.laserEmitter.setPosition(this.eyePoint.x,this.eyePoint.y).setAlpha(alpha);
      this.laserReticle.setPosition(targetX,targetY).setAlpha(alpha);
    }
    const warningActive=!this.inactive&&this.presentationActive();
    this.tailWarning.setVisible(phase==='tail-cue'&&warningActive).setPosition(this.controller.aimX,348).setRotation(this.controller.direction<0?Math.PI:0);
    if (phase === 'pillars-cue' || phase === 'pillars') {
      for (const x of this.controller.hazards) {
        if (phase === 'pillars') {
          const index = this.controller.hazards.indexOf(x);
          const pillar = this.pillarImages[index];
          if (pillar) {
            pillar.expiresAt = this.scene.time.now + Math.max(1, FRANKLIN_RULES.pillarActiveMs - this.controller.elapsed);
            pillar.image.setPosition(x, 360 - FRANKLIN_RULES.pillarHeight / 2)
              .setDisplaySize(FRANKLIN_RULES.pillarWidth, FRANKLIN_RULES.pillarHeight).setAlpha(.65+.35*Math.min(1,this.controller.elapsed/80, (600-this.controller.elapsed)/100)).setVisible(true);
          }
        } else {
          const pulse = 0.2 + 0.12 * (1 + Math.sin(this.controller.elapsed * 0.012));
          g.fillStyle(0xffd08a, pulse).fillRect(
            x - FRANKLIN_RULES.pillarWidth / 2, 354,
            FRANKLIN_RULES.pillarWidth, 6,
          );
          g.lineStyle(1, 0xffe2ad, 0.68).lineBetween(x - 22, 353, x + 22, 353);
        }
      }
      if (phase === 'pillars-cue') this.hideEffectPool(this.pillarImages);
    } else this.hideEffectPool(this.pillarImages);
    this.resistanceWarning.setVisible(phase==='resistance'&&warningActive).setPosition(this.image.x-35,358);
    if (phase === 'safe-chip') {
      g.lineStyle(1, 0x59ddff, .55+.25*pulse).strokeRoundedRect(chip.left, chip.top, chip.right-chip.left, chip.bottom-chip.top,4);
      g.lineStyle(1,0xf5ce75,.9).strokeCircle(chipX,chipY,10+Math.sin(this.visualClock*.006));
      const y=chip.top-9+Math.sin(this.visualClock*.006)*2;
      g.lineStyle(1.5,0xffdd8b,.95).lineBetween(chipX-4,y-3,chipX,y+1).lineBetween(chipX,y+1,chipX+4,y-3);
    }
    if (phase === 'crash') {
      const chipX = (chip.left + chip.right) / 2;
      const chipY = (chip.top + chip.bottom) / 2;
      const flicker = 0.35 + 0.5 * Math.abs(Math.sin(this.controller.elapsed / 60));
      g.fillStyle(0xffe2a2, flicker).fillCircle(chipX - 13, chipY - 10, 2)
        .fillCircle(chipX + 13, chipY + 7, 2).fillCircle(chipX + 5, chipY - 14, 2);
    }
    if(phase==='rescued') {
      const t=this.rescueMs;
      for(let i=0;i<this.fragments.length;i++){
        const image=this.fragments[i],duration=350+i*65,u=Math.min(1,t/duration);
        image.setVisible(t<duration);
        if(t<duration){const direction=(i-2.5)*.65;image.setPosition(this.breakX+direction*24*u,this.breakY-18*Math.sin(Math.PI*u)+18*u*u).setRotation(direction*u*2).setAlpha(1-u);}
      }
      if(t<80){const u=1-t/80;g.lineStyle(1,0xffdc88,u).lineBetween(this.breakX,this.breakY,this.breakX+(this.eyePoint.x-this.breakX)*u,this.breakY+(this.eyePoint.y-this.breakY)*u);}
      if(t<300){const u=t/300;g.lineStyle(1,0xf5cd7c,1-u).strokeCircle(this.breakX,this.breakY,4+21*u);g.lineStyle(1,0x65e9f2,1-u).strokeCircle(this.breakX,this.breakY,3+16*u);}
    } else for(const image of this.fragments)image.setVisible(false);
  }

  private updateHud(): void {
    const hp=franklinChipHealth(this.controller);
    this.healthFill.setCrop(0,0,202*hp/FRANKLIN_RULES.hp,10);
    const narrative=this.controller.phase==='intro'&&!this.inactive&&this.presentationActive();
    this.introText.setVisible(narrative).setAlpha(franklinIntroTextAlpha(this.controller.elapsed));
    for(let i=0;i<3;i++)this.pips[i].setAlpha(i<this.controller.cleanCrashes ? .2 : 1);
    const visible=this.controller.phase!=='rescued';
    this.hudChip.setVisible(visible);this.healthBack.setVisible(visible);this.healthFill.setVisible(visible&&hp>0);for(const pip of this.pips)pip.setVisible(visible);
  }

  private destroy(shutdown=false): void {
    if (this.cleaned) return;
    this.cleaned = true;
    this.alive = false;
    this.clearHazards();
    this.scene.events.off('ultimate-strike', this.strikeListener);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE,this.afterPlayerVisual);
    if(!shutdown)this.restoreCamera(1);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.shutdownListener);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.markResume);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.markResume);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.fireballs.forEach(shot => shot.image.destroy());
    this.trailImages.forEach(effect => effect.image.destroy());
    this.pillarImages.forEach(effect => effect.image.destroy());
    this.wallImpactImage.image.destroy();
    this.tailWaveImage.destroy();
    this.chipChargeImage.destroy();
    this.chipImage.destroy();
    this.image.destroy();
    this.graphics.destroy();
    this.eyeLight.destroy();this.chipLight.destroy();
    this.hudChip.destroy();
    this.pips.forEach(image=>image.destroy());
    this.localFlames.forEach(image=>image.destroy());
    this.fragments.forEach(image=>image.destroy());
    this.heart.destroy();
    this.tailWarning.destroy();this.resistanceWarning.destroy();
    this.introText.destroy();this.laserBeam.destroy();this.laserEmitter.destroy();this.laserReticle.destroy();
    this.healthBack.destroy();
    this.healthFill.destroy();

  }
}
