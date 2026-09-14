import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ChapterKind } from '../data/chapters';

type AtlasFrame = 'arch' | 'pillar' | 'banner' | 'scrap';
type Hanging = { image: Phaser.GameObjects.Image; homeX: number; homeY: number; phase: number };
type Falling = { image: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; active: boolean };

/** Painted atmosphere for the jail chapter. It owns no bodies and cannot affect play. */
export class ChapterScenery {
  private readonly banners: Hanging[] = [];
  private readonly nearPillars: Phaser.GameObjects.Image[] = [];
  private readonly scraps: Falling[] = [];
  private readonly reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  private releaseAt = 1700;
  private scrapCursor = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly kind: ChapterKind, private readonly width: number) {
    if (kind !== 'jail') return;
    this.createDistance();
    if (!scene.textures.exists('prison-atlas')) return;
    this.addAtlasFrames();
    this.createArches();
    this.createBanners();
    this.createPillars();
    this.createScraps();
  }

  private createDistance(): void {
    if (!this.scene.textures.exists('jail-distance')) return;
    const source = this.scene.textures.get('jail-distance').getSourceImage() as { width: number; height: number };
    const height = 1800 * source.height / source.width;
    for (let x = 0; x < this.width; x += 1800) {
      this.scene.add.image(x, 360 - height * 0.8, 'jail-distance').setOrigin(0).setDisplaySize(1802, height)
        .setDepth(-25).setAlpha(0.86).setScrollFactor(0.16, 1);
    }
  }

  update(player: Player): void {
    if (!this.banners.length) return;
    const now = this.scene.time.now;
    if (!this.reducedMotion) {
      const reactive = Phaser.Math.Clamp(player.body.velocity.x / 300, -1, 1) * 2;
      for (const banner of this.banners) {
        const distance = Math.abs(banner.homeX - this.scene.cameras.main.scrollX * 0.8 - (player.sprite.x - this.scene.cameras.main.scrollX));
        const influence = Math.max(0, 1 - distance / 120);
        banner.image.setAngle(Math.sin(now * 0.001 + banner.phase) * 1.4 + reactive * influence);
      }
      this.updateScraps(player, Math.min(40, this.scene.game.loop.delta), now);
    }
    for (const pillar of this.nearPillars) {
      const distance = Math.abs(pillar.x - this.scene.cameras.main.scrollX * 0.12 - player.sprite.x);
      pillar.setAlpha(0.12 + 0.16 * Phaser.Math.Clamp((distance - 65) / 100, 0, 1));
    }
  }

  private addAtlasFrames(): void {
    const texture = this.scene.textures.get('prison-atlas');
    const frameData: Record<AtlasFrame, [number, number, number, number]> = {
      arch: [65, 35, 635, 570], pillar: [790, 0, 350, 625], banner: [155, 620, 455, 625], scrap: [810, 745, 310, 425]
    };
    for (const [name, [x, y, width, height]] of Object.entries(frameData) as [AtlasFrame, [number, number, number, number]][]) {
      if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
    }
  }

  private image(frame: AtlasFrame, x: number, y: number, width: number, height: number, depth: number, scroll: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, 'prison-atlas', frame).setDisplaySize(width, height).setDepth(depth).setScrollFactor(scroll, 1);
  }

  private createArches(): void {
    const count = Math.ceil((this.width * 0.55 + 640) / 1000);
    for (let i = 0; i < count; i++) this.image('arch', i * 1000 + 410, 367, 334, 300, -12, 0.55).setOrigin(0.5, 1).setAlpha(0.62);
  }

  private createBanners(): void {
    const count = Math.ceil((this.width * 0.8 + 640) / 1440);
    for (let i = 0; i < count; i++) {
      const x = i * 1440 + 305 + (i % 2) * 770;
      const image = this.image('banner', x, 115, 80, 110, -5, 0.8).setOrigin(0.5, 0).setAlpha(0.76);
      this.banners.push({ image, homeX: x, homeY: 115, phase: i * 1.7 });
    }
  }

  private createPillars(): void {
    const count = Math.ceil((this.width * 1.12 + 640) / 900);
    for (let i = 0; i < count; i++) this.nearPillars.push(this.image('pillar', i * 900 + 35, 405, 180, 321, 46, 1.12).setOrigin(0.5, 1).setTint(0x5c626c).setAlpha(0.28));
  }

  private createScraps(): void {
    for (let i = 0; i < 5; i++) {
      const image = this.image('scrap', -100, 360, 6, 8, -3, 0.8).setVisible(false).setAlpha(0);
      this.scraps.push({ image, x: -100, y: 360, vx: 0, vy: 0, active: false });
    }
  }

  private updateScraps(player: Player, delta: number, now: number): void {
    const dt = Math.max(0, delta) / 1000;
    for (const scrap of this.scraps) {
      if (!scrap.active) continue;
      scrap.x += scrap.vx * dt;
      scrap.y += scrap.vy * dt;
      const projectedX = scrap.x - this.scene.cameras.main.scrollX * 0.8;
      const playerX = player.sprite.x - this.scene.cameras.main.scrollX;
      if (Math.abs(projectedX - playerX) <= 100) scrap.vx = Phaser.Math.Clamp(scrap.vx + player.body.velocity.x * 0.015 * dt, -26, 26);
      scrap.image.setPosition(scrap.x, scrap.y).setAngle(Math.sin(now * 0.004 + scrap.x) * 16)
        .setAlpha(0.68 * Phaser.Math.Clamp((360 - scrap.y) / 40, 0, 1));
      if (scrap.y >= 360) {
        scrap.active = false;
        scrap.image.setVisible(false).setAlpha(0);
      }
    }
    if (now < this.releaseAt) return;
    const camera = this.scene.cameras.main;
    const visible = this.banners.filter((banner) => {
      const projectedX = banner.homeX - camera.scrollX * 0.8;
      return projectedX > -80 && projectedX < camera.width + 80;
    });
    if (!visible.length) { this.releaseAt = now + 500; return; }
    const banner = visible[this.scrapCursor++ % visible.length];
    const scrap = this.scraps.find((item) => !item.active);
    if (!scrap) return;
    scrap.active = true;
    scrap.x = banner.homeX + (this.scrapCursor % 3 - 1) * 18;
    scrap.y = banner.homeY + banner.image.displayHeight;
    scrap.vx = (this.scrapCursor % 2 ? 1 : -1) * 5;
    scrap.vy = 24 + (this.scrapCursor % 3) * 5;
    scrap.image.setPosition(scrap.x, scrap.y).setVisible(true).setAlpha(0.68);
    this.releaseAt = now + 1800 + (this.scrapCursor % 3) * 500;
  }
}
