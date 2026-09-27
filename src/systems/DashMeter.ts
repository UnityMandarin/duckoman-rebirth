import Phaser from 'phaser';

const X = 220, Y = 58, W = 97, H = 13;

/** Dash cooldown bar with a white dashing-duck icon, shared by every HUD. */
export class DashMeter {
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, iconDepth: number) {
    this.icon = scene.add.image(X + 18, Y + H / 2, 'duckoman').setDisplaySize(11, 10).setRotation(0.18)
      .setTint(0xffffff).setTintMode(Phaser.TintModes.FILL).setScrollFactor(0).setDepth(iconDepth);
  }

  /** `disabled` means no dash is available until landing, e.g. after an air dash. */
  draw(g: Phaser.GameObjects.Graphics, charge: number, disabled: boolean): void {
    const a = disabled ? 0.5 : 1;
    const sw = W * charge;
    g.fillStyle(0x072838, a).fillRoundedRect(X, Y, W, H, 5);
    if (sw > 0) {
      g.fillStyle(0x075a9b, a).fillRoundedRect(X, Y, sw, H, 5);
      g.fillStyle(0x12c8ee, a).fillRoundedRect(X + 1, Y + 1, Math.max(0, sw - 2), 9, 4);
      g.fillStyle(0xa5f5ff, a).fillRoundedRect(X + 2, Y + 1, Math.max(0, sw - 4), 3, 2);
      g.fillStyle(0xffffff, 0.55 * a).fillTriangle(X + 3, Y + 2, X + Math.min(9, sw), Y + 2, X + 3, Y + 7);
    }
    const iconAlpha = (charge >= 1 ? 1 : 0.55) * a;
    g.lineStyle(1.5, 0xffffff, 0.9 * iconAlpha);
    for (const [dy, len] of [[4.25, 3], [6.5, 4.5], [8.75, 3]]) g.lineBetween(X + 12 - len, Y + dy, X + 12, Y + dy);
    this.icon.setAlpha(iconAlpha);
  }
}
