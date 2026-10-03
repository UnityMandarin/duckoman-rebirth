import Phaser from 'phaser';
import type { Player } from './Player';
import { RELIC_TEXTURES } from '../systems/RelicArt';
import { showHitbox } from '../systems/DebugHitboxes';

const SIZE = 52;

/** Rises out of RustWing's wreck, then hovers and shines until the duck touches it. */
export class BronzeWingRelic {
  private rays: Phaser.GameObjects.Graphics;
  private art: Phaser.GameObjects.Image;
  /** Additive copy of the art that flares as a glint passes. */
  private shine: Phaser.GameObjects.Image;
  private born: number;
  private y: number;
  collected = false;
  constructor(private scene: Phaser.Scene, private x: number, private floorTop: number) {
    this.born = scene.time.now;
    this.y = floorTop - 10;
    this.rays = scene.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
    this.art = scene.add.image(x, this.y, RELIC_TEXTURES['bronze-wing']).setDisplaySize(SIZE, SIZE).setDepth(8.5);
    this.shine = scene.add.image(x, this.y, RELIC_TEXTURES['bronze-wing']).setDisplaySize(SIZE, SIZE).setDepth(8.6)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  }
  /** True on the frame the duck picks it up. */
  update(player: Player): boolean {
    if (this.collected) return false;
    const now = this.scene.time.now, age = now - this.born;
    // Clears the duck's head when walking under, but a single jump reaches it.
    const rise = Math.min(1, age / 1100), hover = this.floorTop - 110;
    this.y = this.floorTop - 10 + (hover - this.floorTop + 10) * (1 - (1 - rise) ** 3) + Math.sin(now * .003) * 4 * rise;
    this.draw(now, rise);
    const reach = { x: this.x, y: this.y, radius: 26 };
    showHitbox(this.scene, 'interact', reach);
    const p = player.body, dx = Math.max(p.left - this.x, 0, this.x - p.right), dy = Math.max(p.top - this.y, 0, this.y - p.bottom);
    if (rise < 1 || !player.active || dx * dx + dy * dy > reach.radius ** 2) return false;
    this.collect();
    return true;
  }
  private draw(now: number, rise: number): void {
    const rays = this.rays.clear(), spin = now * .0006;
    for (let i = 0; i < 8; i++) {
      const a = spin + i * Math.PI / 4, len = (50 + Math.sin(now * .004 + i) * 8) * rise, w = .12;
      rays.fillStyle(i % 2 ? 0xffc870 : 0xffe8b0, .16 * rise).fillTriangle(
        this.x, this.y, this.x + Math.cos(a - w) * len, this.y + Math.sin(a - w) * len, this.x + Math.cos(a + w) * len, this.y + Math.sin(a + w) * len);
    }
    rays.fillStyle(0xffb050, .2 * rise).fillCircle(this.x, this.y, 30);
    rays.fillStyle(0xfff0c8, .18 * rise).fillCircle(this.x, this.y, 16);
    const glint = Math.max(0, 1 - Math.abs(((now * .0005) % 1) - .1) * 10);
    const tilt = Math.sin(now * .002) * .06;
    this.art.setPosition(this.x, this.y).setRotation(tilt).setAlpha(Math.min(1, rise * 2));
    this.shine.setPosition(this.x, this.y).setRotation(tilt).setAlpha(glint * .55 * rise);
  }
  private collect(): void {
    this.collected = true;
    const parts = [this.art, this.shine, this.rays];
    this.scene.tweens.add({ targets: parts, alpha: 0, duration: 260, onComplete: () => parts.forEach(p => p.destroy()) });
    this.scene.tweens.add({ targets: [this.art, this.shine], displayWidth: SIZE * 1.5, displayHeight: SIZE * 1.5, duration: 260 });
    const burst = this.scene.add.circle(this.x, this.y, 10, 0xffe0a0).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: burst, scale: 8, alpha: 0, duration: 420, onComplete: () => burst.destroy() });
  }
}
