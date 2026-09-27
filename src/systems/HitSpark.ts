import Phaser from 'phaser';

const FRAME_MS = 40;
const RAYS = 8;

/** Plays a short white impact flash at (x, y), then removes itself. */
export function hitSpark(scene: Phaser.Scene, x: number, y: number, scale = 1): void {
  const g = scene.add.graphics().setPosition(x, y).setDepth(16).setBlendMode(Phaser.BlendModes.ADD);
  const spin = Math.random() * Math.PI;
  const rays = (inner: number, outer: number, width: number) => {
    g.lineStyle(width * scale, 0xffffff, 1);
    for (let i = 0; i < RAYS; i++) {
      const a = spin + i * Math.PI * 2 / RAYS, long = i % 2 ? 0.6 : 1;
      g.lineBetween(Math.cos(a) * inner * scale, Math.sin(a) * inner * scale, Math.cos(a) * outer * long * scale, Math.sin(a) * outer * long * scale);
    }
  };
  const frames = [
    () => { g.fillStyle(0xffffff, 1).fillCircle(0, 0, 14 * scale); rays(6, 24, 4); },
    () => { g.fillStyle(0xffffff, 0.9).fillCircle(0, 0, 20 * scale); g.fillStyle(0xfff4c8, 1).fillCircle(0, 0, 11 * scale); rays(16, 34, 3); },
    () => { g.lineStyle(4 * scale, 0xffffff, 0.8).strokeCircle(0, 0, 24 * scale); rays(26, 40, 2); },
    () => { g.lineStyle(2 * scale, 0xffffff, 0.45).strokeCircle(0, 0, 30 * scale); rays(34, 44, 1); }
  ];
  let frame = 0;
  const step = () => {
    if (!g.active) return;
    if (frame >= frames.length) { g.destroy(); return; }
    g.clear();
    frames[frame++]();
    scene.time.delayedCall(FRAME_MS, step);
  };
  step();
}
