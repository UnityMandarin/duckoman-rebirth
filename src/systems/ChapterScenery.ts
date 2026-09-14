import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ChapterKind } from '../data/chapters';

type SceneryKind = ChapterKind | 'castle';
type AtlasFrame = 'arch' | 'pillar' | 'banner' | 'scrap';
type Hanging = { image: Phaser.GameObjects.Image; homeX: number; homeY: number; phase: number };
type Falling = { image: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; active: boolean };

/** Painted atmosphere. Every object is visual only; no body or route is created here. */
export class ChapterScenery {
  private readonly banners: Hanging[] = [];
  private readonly nearPillars: Phaser.GameObjects.Image[] = [];
  private readonly cloth: Falling[] = [];
  private readonly scrolls: Falling[] = [];
  private readonly reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  private releaseAt: number;
  private releaseIndex = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly kind: SceneryKind, private readonly width: number) {
    this.releaseAt = kind === 'castle' ? 4000 : 1700;
    if (kind === 'outside') return;
    if (kind === 'jail') this.createDistance();
    if (!scene.textures.exists('prison-atlas')) return;
    this.addAtlasFrames(); this.createArches(); this.createBanners(); this.createPillars();
    if (kind === 'jail') this.createCloth(); else this.createScrolls();
  }

  update(player: Player): void {
    if (!this.banners.length) return;
    const now = this.scene.time.now, camera = this.scene.cameras.main;
    if (!this.reducedMotion) {
      for (const banner of this.banners) {
        const projected = banner.homeX - camera.scrollX * 0.8;
        const playerProjected = player.sprite.x - camera.scrollX;
        const influence = Math.max(0, 1 - Math.abs(projected - playerProjected) / 120);
        const reactive = Phaser.Math.Clamp(player.body.velocity.x / 300, -1, 1) * 2 * influence;
        banner.image.setAngle(Math.sin(now * 0.001 + banner.phase) * 1.4 + reactive);
      }
      if (this.kind === 'jail') this.updateFalling(this.cloth, player, Math.min(40, this.scene.game.loop.delta), now, 1800, 500);
      else this.updateFalling(this.scrolls, player, Math.min(40, this.scene.game.loop.delta), now, 4000, 500);
    }
    for (const pillar of this.nearPillars) {
      const renderedX = pillar.x - camera.scrollX * 0.12;
      const distance = Math.abs(renderedX - player.sprite.x);
      pillar.setAlpha(0.12 + 0.16 * Phaser.Math.Clamp((distance - 65) / 100, 0, 1));
    }
  }

  private createDistance(): void {
    if (!this.scene.textures.exists('jail-distance')) return;
    const source = this.scene.textures.get('jail-distance').getSourceImage() as { width: number; height: number };
    const height = 1800 * source.height / source.width;
    for (let x = 0; x < this.width; x += 1800) this.scene.add.image(x, 360 - height * 0.8, 'jail-distance').setOrigin(0)
      .setDisplaySize(1802, height).setDepth(-25).setAlpha(0.86).setScrollFactor(0.16, 1);
  }

  private addAtlasFrames(): void {
    const texture = this.scene.textures.get('prison-atlas');
    const frames: Record<AtlasFrame, [number, number, number, number]> = {
      arch: [65, 35, 635, 570], pillar: [790, 0, 350, 625], banner: [155, 620, 455, 625], scrap: [810, 745, 310, 425]
    };
    for (const [name, [x, y, w, h]] of Object.entries(frames) as [AtlasFrame, [number, number, number, number]][])
      if (!texture.has(name)) texture.add(name, 0, x, y, w, h);
  }

  private image(frame: AtlasFrame, x: number, y: number, w: number, h: number, depth: number, scroll: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, 'prison-atlas', frame).setDisplaySize(w, h).setDepth(depth).setScrollFactor(scroll, 1);
  }

  private createArches(): void {
    const count = Math.ceil((this.width * 0.55 + 640) / 1000);
    if (this.kind === 'castle') {
      for (let i = 1; i < count; i++) for (const y of [-713, -353, 367])
        this.image('arch', i * 1000 + 410, y, 334, 300, -12, 0.55).setOrigin(0.5, 1).setTint(0xa48a61).setAlpha(0.5);
    } else for (let i = 0; i < count; i++) this.image('arch', i * 1000 + 410, 367, 334, 300, -12, 0.55).setOrigin(0.5, 1).setAlpha(0.62);
  }

  private createBanners(): void {
    const count = Math.ceil((this.width * 0.8 + 640) / 1440), ys = this.kind === 'castle' ? [-700, -340, 20, 380] : [115];
    for (let i = 0; i < count; i++) for (let j = 0; j < ys.length; j++) {
      const x = i * 1440 + 305 + (i % 2) * 770, y = ys[j];
      const image = this.image('banner', x, y, 80, 110, -5, 0.8).setOrigin(0.5, 0)
        .setTint(this.kind === 'castle' ? 0xc49d62 : 0xffffff).setAlpha(0.76);
      this.banners.push({ image, homeX: x, homeY: y, phase: (i + j) * 1.7 });
    }
  }

  private createPillars(): void {
    const count = Math.ceil((this.width * 1.12 + 640) / 900), ys = this.kind === 'castle' ? [-760, -400, -40, 405] : [405];
    for (let i = 0; i < count; i++) for (const y of ys) this.nearPillars.push(
      this.image('pillar', i * 900 + 35, y, 180, 321, 46, 1.12).setOrigin(0.5, 1)
        .setTint(this.kind === 'castle' ? 0xa28762 : 0x5c626c).setAlpha(0.28));
  }

  private createCloth(): void {
    for (let i = 0; i < 5; i++) this.cloth.push({ image: this.image('scrap', -100, 360, 6, 8, -3, 0.8).setVisible(false).setAlpha(0), x: -100, y: 360, vx: 0, vy: 0, active: false });
  }

  private createScrolls(): void {
    if (!this.scene.textures.exists('royal-scroll')) return;
    const source = this.scene.textures.get('royal-scroll').getSourceImage() as { width: number; height: number }, h = 20, w = h * source.width / source.height;
    for (let i = 0; i < 3; i++) this.scrolls.push({ image: this.scene.add.image(-100, 360, 'royal-scroll').setDisplaySize(w, h)
      .setOrigin(0.5, 0).setDepth(-3).setScrollFactor(0.8, 1).setVisible(false).setAlpha(0), x: -100, y: 360, vx: 0, vy: 0, active: false });
  }

  private updateFalling(pool: Falling[], player: Player, delta: number, now: number, interval: number, retry: number): void {
    const dt = Math.max(0, delta) / 1000, camera = this.scene.cameras.main;
    for (const item of pool) {
      if (!item.active) continue;
      item.x += item.vx * dt; item.y += item.vy * dt;
      const px = item.x - camera.scrollX * 0.8, playerX = player.sprite.x - camera.scrollX;
      if (Math.abs(px - playerX) <= 100) item.vx = Phaser.Math.Clamp(item.vx + player.body.velocity.x * 0.015 * dt, -26, 26);
      item.image.setPosition(item.x, item.y).setAngle(Math.sin(now * 0.003 + item.x) * 10)
        .setAlpha(0.68 * Phaser.Math.Clamp((360 - item.y) / 40, 0, 1));
      const retireY = Math.min(360, camera.scrollY + camera.height + 80);
      if (item.y >= retireY) { item.active = false; item.image.setVisible(false).setAlpha(0); }
    }
    if (now < this.releaseAt) return;
    const visible = this.banners.filter((banner) => {
      const x = banner.homeX - camera.scrollX * 0.8, y = banner.homeY - camera.scrollY;
      return x > -80 && x < camera.width + 80 && y < camera.height + 80 && y + banner.image.displayHeight > -80;
    });
    const item = pool.find((entry) => !entry.active);
    if (!visible.length || !item) { this.releaseAt = now + retry; return; }
    const banner = visible[this.releaseIndex++ % visible.length];
    item.active = true; item.x = banner.homeX; item.y = banner.homeY + banner.image.displayHeight;
    item.vx = this.releaseIndex % 2 ? 4 : -4; item.vy = 30 + (this.releaseIndex % 3) * 4;
    item.image.setPosition(item.x, item.y).setVisible(true).setAlpha(0.68);
    this.releaseAt = now + interval;
  }
}
