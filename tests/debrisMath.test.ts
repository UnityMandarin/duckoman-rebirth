import { describe, expect, it } from 'vitest';
import { debrisOffset } from '../src/systems/debrisMath';

const seq = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

describe('debrisOffset', () => {
  it('flies along the kill direction', () => {
    const right = debrisOffset({ x: 440, y: 0 }, seq(0.5, 0.5));
    expect(right.x).toBeGreaterThan(40);
    const left = debrisOffset({ x: -440, y: 0 }, seq(0.5, 0.5));
    expect(left.x).toBeLessThan(-40);
    const down = debrisOffset({ x: 311, y: 311 }, seq(0.5, 0.5));
    expect(down.x).toBeGreaterThan(0);
    expect(down.y).toBeGreaterThan(0);
  });

  it('keeps every piece within the cone around the direction', () => {
    for (const r of [0, 0.25, 0.75, 0.999]) expect(debrisOffset({ x: 440, y: 0 }, seq(r, 0.5)).x).toBeGreaterThan(0);
  });

  it('throws faster blows farther', () => {
    const slow = debrisOffset({ x: 250, y: 0 }, seq(0.5, 0.5));
    const fast = debrisOffset({ x: 550, y: 0 }, seq(0.5, 0.5));
    expect(fast.x).toBeGreaterThan(slow.x);
  });

  it('falls back to an upward random spray without a direction', () => {
    const offset = debrisOffset(undefined, seq(0.5, 0.5));
    expect(offset.y).toBeLessThan(0);
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(45);
  });
});
