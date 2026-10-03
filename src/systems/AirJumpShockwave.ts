import Phaser from 'phaser';
import { airJumpWind } from './airJumpMath';

/** A soft puff of wind under the duck on a midair jump. */
export function airJumpShockwave(scene: Phaser.Scene, x: number, y: number): void {
  const g = scene.add.graphics().setPosition(x, y).setDepth(9.4);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: 300,
    onUpdate: tween => {
      const t = tween.getValue() ?? 0;
      const { puffs, curls } = airJumpWind(t);
      g.clear();
      for (const puff of puffs) {
        if (puff.r <= 0) continue;
        g.fillStyle(0xe4f1ec, puff.alpha * 0.45).fillCircle(puff.x, puff.y, puff.r * 1.35);
        g.fillStyle(0xffffff, puff.alpha).fillCircle(puff.x, puff.y - puff.r * 0.15, puff.r);
      }
      for (const curl of curls) {
        g.lineStyle(1.5, 0xf2faf7, curl.alpha).strokePoints(curl.points.map(p => new Phaser.Math.Vector2(p.x, p.y)), false);
      }
    },
    onComplete: () => g.destroy()
  });
}
