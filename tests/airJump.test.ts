import { describe, expect, it } from 'vitest';
import { airJumpWind } from '../src/systems/airJumpMath';

describe('airJumpWind', () => {
  it('fans the puffs outward, keeps them near the feet, and fades out', () => {
    const start = airJumpWind(0);
    const end = airJumpWind(1);
    expect(Math.abs(end.puffs[0].x)).toBeGreaterThan(Math.abs(start.puffs[0].x));
    expect(start.puffs[2].alpha).toBeGreaterThan(0);
    expect(end.puffs.every(p => p.alpha === 0)).toBe(true);
    expect(end.curls.every(c => c.alpha === 0)).toBe(true);
    const reach = Math.max(...end.puffs.map(p => Math.hypot(p.x, p.y) + p.r), ...end.curls.flatMap(c => c.points.map(p => Math.hypot(p.x, p.y))));
    expect(reach).toBeGreaterThan(20);
    expect(reach).toBeLessThan(40);
  });

  it('puts one wind curl on each side', () => {
    const [left, right] = airJumpWind(0.5).curls;
    expect(left.points.every(p => p.x < 0)).toBe(true);
    expect(right.points.every(p => p.x > 0)).toBe(true);
  });
});
