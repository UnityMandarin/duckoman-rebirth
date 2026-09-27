import Phaser from 'phaser';
import { debrisOffset, type KillImpulse } from './debrisMath';

type Piece = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.AlphaSingle;

/** Flings each piece from where it stands along `impulse`, then drops, fades and destroys it. */
export function scatterDebris(scene: Phaser.Scene, pieces: Piece[], impulse?: KillImpulse): void {
  const spin = impulse && impulse.x < 0 ? -1 : 1;
  for (const piece of pieces) {
    const burst = debrisOffset(impulse), bx = piece.x + burst.x, by = piece.y + burst.y, startY = piece.y;
    scene.tweens.add({targets: piece, x: bx, y: by, angle: 180 * spin, duration: 150, delay: impulse ? 0 : 80, ease: impulse ? 'Quad.easeOut' : 'Linear', onComplete: () => {
      scene.tweens.add({targets: piece, x: bx + burst.x * .25, y: Math.max(by, startY) + 45, alpha: 0, angle: 360 * spin, duration: 270, onComplete: () => piece.destroy()});
    }});
  }
}
