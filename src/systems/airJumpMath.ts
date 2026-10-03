export type AirJumpPuff = { x: number; y: number; r: number; alpha: number };
export type AirJumpCurl = { points: { x: number; y: number }[]; alpha: number };

const PUFF_ANGLES = [0.12, 0.3, 0.5, 0.7, 0.88].map(f => Math.PI * f);

/** Soft cloud puffs fanning out under the feet, plus a wind curl on each side. `t` is 0..1. */
export function airJumpWind(t: number): { puffs: AirJumpPuff[]; curls: AirJumpCurl[] } {
  const clamped = Math.min(1, Math.max(0, t));
  const spread = 1 - (1 - clamped) ** 3;
  const fade = (1 - clamped) ** 1.5;
  const puffs = PUFF_ANGLES.map((a, i) => {
    const middle = i === 2;
    const dist = (middle ? 3 : 5) + (middle ? 8 : 18) * spread;
    return {
      x: Math.cos(a) * dist * 1.25,
      y: 2 + Math.sin(a) * dist * 0.55,
      r: (middle ? 4.5 : 3.6) + 2.6 * spread - 2.4 * clamped * clamped,
      alpha: 0.6 * fade
    };
  });
  const curls = [-1, 1].map(side => {
    const cx = side * (9 + 13 * spread), cy = 4 + 3 * spread;
    const radius = 3.5 + 2.5 * spread;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const a = Math.PI * (0.5 + 1.4 * k);
      const r = radius * (1 - 0.55 * k);
      points.push({ x: cx - side * Math.cos(a) * r, y: cy - Math.sin(a) * r * 0.8 });
    }
    return { points, alpha: 0.75 * fade };
  });
  return { puffs, curls };
}
