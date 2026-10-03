import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { CASTLE_SECRET } from '../data/castle';
import { Player } from '../entities/Player';
import { InputController } from '../systems/InputController';
import { ChapterHud } from '../systems/ChapterHud';
import { installHitboxDebug, installPlatformLabels } from '../systems/DebugHitboxes';
import { setupRenderScale } from '../systems/renderScale';
import { SceneLayerRouter } from '../systems/SceneLayerRouter';
import { markCampaignRunIneligible } from '../systems/debug/debugSettings';
import { RustWing } from '../entities/RustWing';
import { RUSTWING_RULES, type RustForm } from '../systems/rustWingMath';
import { BronzeWingRelic } from '../entities/BronzeWingRelic';
import { CreatorLetter, LETTER_TEXTURE } from '../entities/CreatorLetter';
import { preloadRelicArt } from '../systems/RelicArt';
import { grantRelic, markRustwingDefeated, RELICS } from '../systems/relics';

interface SecretState { infiniteHealth?: boolean; ultimateCharge?: number; checkpoint?: number; vx?: number; vy?: number; rustForm?: RustForm; opened?: number[]; secrets?: number[]; bossDefeated?: boolean; devPreview?: boolean; }

export class CastleSecretScene extends Phaser.Scene {
  private player!: Player;
  private inputController!: InputController;
  private hud!: ChapterHud;
  private resetText!: Phaser.GameObjects.Text;
  private deathAt: number | undefined;
  private state: SecretState = {};
  private boss!: RustWing;
  private relic?: BronzeWingRelic;
  private leaving = false;
  private letter?: CreatorLetter;
  private announcement?: Phaser.GameObjects.Text;
  /** Milliseconds the Bronze Wing banner still needs on screen before the warp. */
  private announceLeft?: number;
  constructor() { super(CASTLE_SECRET.scene); }
  preload(): void {
    preloadRelicArt(this);
    const base = import.meta.env.BASE_URL;
    if (!this.textures.exists(LETTER_TEXTURE)) this.load.image(LETTER_TEXTURE, `${base}assets/chapters/${LETTER_TEXTURE}.png`);
    if (!this.textures.exists('duckoman')) this.load.image('duckoman', `${base}assets/gate3/duckoman.png`);
    if (!this.textures.exists('masonry')) this.load.image('masonry', `${base}assets/gate3/masonry.png`);
    if (!this.textures.exists('rustwing-lair')) this.load.image('rustwing-lair', `${base}assets/gate3/rustwing-lair.png`);
    if (!this.textures.exists('rustwing-fireball')) this.load.image('rustwing-fireball', `${base}assets/gate3/rustwing-fireball.png`);
    if (!this.textures.exists('rustwing')) this.load.spritesheet('rustwing', `${base}assets/gate3/rustwing-walk.png`, { frameWidth: 768, frameHeight: 768 });
    if (!this.textures.exists('ultimate-sword-frame')) this.load.image('ultimate-sword-frame', `${base}assets/hud/ultimate-sword-frame.png`);
    if (!this.textures.exists('ultimate-sword-fill')) this.load.image('ultimate-sword-fill', `${base}assets/hud/ultimate-sword-fill.png`);
  }
  create(data: SecretState = {}): void {
    this.state = data;
    this.deathAt = undefined;
    this.physics.world.resume();
    const masonry = this.textures.get('masonry');
    if (!masonry.has('trimmed')) masonry.add('trimmed', 0, 28, 112, 1980, 456);
    const { width, height, floor, spawn } = CASTLE_SECRET.room;
    this.cameras.main.setBackgroundColor(0x0a1522);
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a1522).setDepth(-18);
    // Scaled so the painted ledge's top edge (82% down the art) meets the floor top.
    const lair = this.textures.get('rustwing-lair').getSourceImage();
    const floorTop = floor.y - floor.height / 2;
    const lairHeight = floorTop / 0.82;
    this.add.image(width / 2, 0, 'rustwing-lair').setOrigin(0.5, 0).setDisplaySize(lairHeight * lair.width / lair.height, lairHeight).setDepth(-17);
    const terrain = this.physics.add.staticGroup();
    this.add.image(floor.x, floor.y - floor.height / 2, 'masonry', 'trimmed').setOrigin(0.5, 0).setDisplaySize(floor.width, 56).setDepth(2);
    const floorBody = this.add.rectangle(floor.x, floor.y, floor.width, floor.height, 0, 0);
    this.physics.add.existing(floorBody, true);
    terrain.add(floorBody);
    this.player = new Player(this, spawn.x, spawn.y);
    this.player.infiniteHealth = !!data.infiniteHealth;
    this.player.ultimateCharge = data.ultimateCharge ?? 0;
    this.player.body.setVelocity(data.vx ?? 0, data.vy ?? TUNING.player.maxFallVelocity);
    this.physics.add.collider(this.player.sprite, terrain);
    this.inputController = new InputController(this);
    this.hud = new ChapterHud(this, this.player);
    this.boss = new RustWing(this, this.player, data.rustForm);
    this.relic = undefined;
    this.leaving = false;
    this.letter = undefined;
    this.announceLeft = undefined;
    this.announcement = undefined;
    const dropRelic = ({ x }: { x: number }): void => {
      markRustwingDefeated(this.registry);
      this.relic = new BronzeWingRelic(this, x, RUSTWING_RULES.floorTop);
      this.letter = new CreatorLetter(this, 34, RUSTWING_RULES.floorTop);
    };
    this.events.once('rustwing-defeated', dropRelic);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off('rustwing-defeated', dropRelic));
    this.resetText = this.add.text(width / 2, height / 2, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.cameras.main.roundPixels = true;
    installHitboxDebug(this);
    installPlatformLabels(this, [floor]);
    this.game.canvas.tabIndex = 0;
    this.game.canvas.focus();
    const hudCamera = setupRenderScale(this, 'secret-hud');
    new SceneLayerRouter(this, hudCamera);
  }
  update(_time: number, delta: number): void {
    if (this.leaving) return;
    const input = this.inputController.read();
    if (input.godModePressed && this.player.active) {
      markCampaignRunIneligible();
      this.player.infiniteHealth = !this.player.infiniteHealth;
      if (this.player.infiniteHealth) this.player.health = TUNING.player.maxHealth;
    }
    this.hud.update();
    if (this.player.lifeState === 'DEAD') {
      this.physics.world.pause();
      this.deathAt ??= this.time.now;
      this.resetText.setText('Duckoman down\nPress a movement key or jump to reset');
      if (this.time.now - this.deathAt >= TUNING.player.deathResetDelay && input.anyResetInput)
        this.scene.start('gate-1', { infiniteHealth: this.player.infiniteHealth, ultimateCharge: this.player.ultimateCharge, checkpoint: this.state.checkpoint, opened: this.state.opened, secrets: this.state.secrets, bossDefeated: this.state.bossDefeated, devPreview: this.state.devPreview });
      return;
    }
    if (!this.player.usingUltimate) this.player.update(input, delta);
    if (input.ultimatePressed && this.player.canAct && this.player.ultimateCharge >= 100 && !this.player.usingUltimate)
      this.hud.useUltimate();
    this.boss.update(delta);
    if (this.relic?.update(this.player)) this.collectRelic();
    this.letter?.update(this.player);
    if (this.announcement && this.announceLeft !== undefined) {
      // The banner hides while the maker's page plays and only counts down while on screen; the warp follows it.
      const showing = !this.letter?.reading;
      this.announcement.setVisible(showing);
      if (showing) this.announceLeft -= delta;
      if (this.announceLeft <= 0) this.warp();
    }
  }
  /** Bronze Wing collected: announce it, then warp back up to the royal hall beside the sealed hole. */
  private collectRelic(): void {
    const relic = RELICS['bronze-wing'];
    grantRelic(this.registry, 'bronze-wing');
    this.cameras.main.flash(220, 255, 220, 160);
    const { width } = CASTLE_SECRET.room;
    this.announcement = this.add.text(width / 2, 120, `${relic.name}\n${relic.blurb}`, { fontFamily: 'system-ui', fontSize: '18px', color: '#ffd896', stroke: '#140c08', strokeThickness: 4, align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(30);
    this.announceLeft = 2500;
  }
  private warp(): void {
    this.leaving = true;
    this.cameras.main.fadeOut(500, 255, 230, 180);
    this.cameras.getCamera('secret-hud')?.fadeOut(500, 255, 230, 180);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('gate-1', {
      infiniteHealth: this.player.infiniteHealth, ultimateCharge: this.player.ultimateCharge, checkpoint: this.state.checkpoint, fromSecret: true,
      opened: this.state.opened, secrets: this.state.secrets, bossDefeated: this.state.bossDefeated, devPreview: this.state.devPreview
    }));
  }
}
