import Phaser from 'phaser';
import { ownedRelics, type RelicId } from './relics';

export const RELIC_TEXTURES: Record<RelicId, string> = { 'bronze-wing': 'bronze-wing' };

/** Call from every scene's preload that shows the relic HUD or lets the duck use relics. */
export function preloadRelicArt(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  if (!scene.textures.exists(RELIC_TEXTURES['bronze-wing'])) scene.load.image(RELIC_TEXTURES['bronze-wing'], `${base}assets/gate3/bronze-wing.png`);
}

/** Owned relics in a row under the duck's HUD panel. */
export class RelicHud {
  private icons: Phaser.GameObjects.Image[] = [];
  /** White silhouettes ringed behind each icon, forming its soft outline. */
  private outlines: Phaser.GameObjects.Image[] = [];
  private shown = '';
  constructor(private scene: Phaser.Scene, private depth: number) {}
  update(): void {
    const owned = ownedRelics(this.scene.registry);
    if (owned.join() !== this.shown) this.layout(owned);
    // A slow glint sweeps across each icon.
    const glint = Math.max(0, 1 - Math.abs(((this.scene.time.now * .00035) % 1) - .15) * 12);
    for (const icon of this.icons) icon.setTint(Phaser.Display.Color.GetColor(255, 255, 255 - 40 * (1 - glint)));
  }
  private layout(owned: readonly RelicId[]): void {
    this.shown = owned.join();
    [...this.icons, ...this.outlines].forEach(image => image.destroy());
    this.icons = [];
    this.outlines = [];
    // Just beneath the duck's health/ultimate panel (which ends 76px down).
    const slot = 32, left = 10, top = 80, size = slot - 4;
    owned.forEach((id, i) => {
      const x = left + slot * (i + .5), y = top + slot / 2;
      // A tight bright ring plus a wider faint one reads as a soft edge.
      for (const [radius, alpha] of [[.6, .45], [1.2, .14]]) {
        for (let k = 0; k < 12; k++) {
          const a = k * Math.PI / 6;
          this.outlines.push(this.scene.add.image(x + Math.cos(a) * radius, y + Math.sin(a) * radius, RELIC_TEXTURES[id])
            .setDisplaySize(size, size).setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha)
            .setScrollFactor(0).setDepth(this.depth));
        }
      }
      this.icons.push(this.scene.add.image(x, y, RELIC_TEXTURES[id]).setDisplaySize(size, size).setScrollFactor(0).setDepth(this.depth + .1));
    });
  }
}
