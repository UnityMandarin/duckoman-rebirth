import { describe, expect, it } from 'vitest';
import { separationPushes } from '../src/systems/EnemySeparation';

const box = (left: number, width = 40, top = 300, height = 50) => ({ left, right: left + width, top, bottom: top + height });

describe('separationPushes', () => {
  it('leaves non-overlapping enemies alone', () => {
    expect(separationPushes([box(0), box(40), box(200)])).toEqual([0, 0, 0]);
  });
  it('eases an overlapping pair apart by a fraction of the overlap', () => {
    const [a, b] = separationPushes([box(0), box(30)], 0.2, 10);
    expect(a).toBeCloseTo(-1);
    expect(b).toBeCloseTo(1);
  });
  it('fans out an exact stack by list order and caps each step', () => {
    const [a, b] = separationPushes([box(100), box(100)], 0.2, 2);
    expect(a).toBe(-2);
    expect(b).toBe(2);
  });
  it('ignores enemies stacked vertically without touching', () => {
    expect(separationPushes([box(0, 40, 200), box(10, 40, 300)])).toEqual([0, 0]);
  });
});
