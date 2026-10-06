import type Phaser from 'phaser';

export interface CheckpointVisualOptions {
  /** Vertical position of the light core as a fraction of the rendered marker height. */
  coreYRatio: number;
  initiallyActive?: boolean;
  haloColor?: number;
  coreColor?: number;
}

/** Adds a small, static checkpoint glow without changing the marker's collision or bounds. */
export class CheckpointVisual {
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly core: Phaser.GameObjects.Ellipse;
  private active: boolean;
  private pulse?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly marker: Phaser.GameObjects.Image,
    options: CheckpointVisualOptions,
  ) {
    this.active = !!options.initiallyActive;
    const top = marker.y - marker.displayHeight * marker.originY;
    const coreY = top + marker.displayHeight * options.coreYRatio;
    const depth = marker.depth;
    const haloColor = options.haloColor ?? 0xffc95f;
    const coreColor = options.coreColor ?? 0xffefb0;
    this.halo = scene.add.graphics().setPosition(marker.x, coreY)
      .fillStyle(haloColor, 0.07).fillEllipse(0, 0, 38, 46)
      .fillStyle(haloColor, 0.12).fillEllipse(0, 0, 26, 34)
      .fillStyle(haloColor, 0.2).fillEllipse(0, 0, 16, 22)
      .setDepth(depth - 0.01).setVisible(this.active).setAlpha(this.active ? 0.55 : 1);
    this.core = scene.add.ellipse(marker.x, coreY, 6, 13, coreColor, 0.98)
      .setDepth(depth + 0.01).setVisible(this.active);
    if (this.active) marker.clearTint();
    else marker.setTint(0x626875);
    marker.once('destroy', this.dispose, this);
  }

  activate(): void {
    if (this.active || !this.marker.active) return;
    this.active = true;
    this.marker.clearTint();
    this.halo.setVisible(true).setAlpha(0.95).setScale(1.2);
    this.core.setVisible(true);
    this.pulse = this.scene.tweens.add({
      targets: this.halo,
      alpha: 0.55,
      scale: 1,
      duration: 450,
      ease: 'Cubic.Out',
      onComplete: () => { this.pulse = undefined; },
    });
  }

  private dispose(): void {
    this.pulse?.stop();
    this.pulse = undefined;
    this.halo.destroy();
    this.core.destroy();
  }
}

export function addCheckpointVisual(
  scene: Phaser.Scene,
  marker: Phaser.GameObjects.Image,
  options: CheckpointVisualOptions,
): CheckpointVisual {
  return new CheckpointVisual(scene, marker, options);
}
