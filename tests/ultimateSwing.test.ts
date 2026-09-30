import { describe, expect, it } from 'vitest';
import { bladeAt, bladeCircles, bladeContainerAngle, slashFrameAt, sweptBladeHits, SWING, SWING_END, SWING_START, UltimateStrike } from '../src/systems/ultimateSwingMath';

describe('ultimate swing', () => {
  it('keeps the blade in front of Duckoman for the whole swing', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const blade = bladeAt(t);
      expect(blade).toBeGreaterThan(-90);
      expect(blade).toBeLessThan(90);
    }
  });
  it('passes through each pose: raised, level, low', () => {
    expect(bladeAt(0)).toBe(SWING.poses[0]);
    expect(bladeAt(0.5)).toBe(SWING.poses[1]);
    expect(bladeAt(1)).toBe(SWING.poses[2]);
    expect(SWING_START).toBeLessThan(0);
    expect(SWING_END).toBeGreaterThan(0);
  });
  it('mirrors the sword container when facing left', () => {
    expect(bladeContainerAngle(1, SWING_START)).toBe(SWING_START + 180);
    expect(bladeContainerAngle(-1, SWING_START)).toBe(-(SWING_START + 180));
  });
  it('slash sweep frames chase the tip and finish on the last pose', () => {
    const heads = Array.from({ length: SWING.sweepFrames }, (_, i) => slashFrameAt(i).head);
    expect(heads.every((h, i) => i === 0 || h > heads[i - 1])).toBe(true);
    expect(heads[heads.length - 1]).toBe(SWING_END);
    for (let i = 0; i < SWING.frames; i++) expect(slashFrameAt(i).tail).toBeGreaterThanOrEqual(SWING_START);
  });
  it('strings overlapping circles from the hand out to the tip, mirrored by facing', () => {
    const circles = bladeCircles({ x: 0, y: 0 }, -1, 0, 290, 24);
    expect(circles.at(-1)!.x).toBeCloseTo(-290);
    expect(circles.every((c, i) => i === 0 || Math.abs(c.x - circles[i - 1].x) <= 2 * c.radius)).toBe(true);
  });
  it('hits anything the blade sweeps over, near or at the tip, and nothing behind', () => {
    const hand = { x: 0, y: 0 }, box = (x: number, y: number) => ({ left: x - 20, right: x + 20, top: y - 20, bottom: y + 20 });
    const hits = (x: number, y: number) => sweptBladeHits(box(x, y), hand, 1, SWING_START, SWING_END, 290, 24);
    expect(hits(280, 0)).toBe(true);
    expect(hits(0, -280)).toBe(true);
    expect(hits(200, -200)).toBe(true);
    expect(hits(60, 30)).toBe(true);
    expect(hits(-150, 0)).toBe(false);
    expect(hits(400, 0)).toBe(false);
  });
  it('hits each target once per swing, only from the part swept since last frame', () => {
    const strike = new UltimateStrike({} as never, { x: 0, y: 0 }, 1, 290, 24);
    const below = { left: 240, right: 280, top: 100, bottom: 140 }, target = {};
    strike.sweepTo(-45);
    expect(strike.tryHit(target, below)).toBe(false);
    strike.sweepTo(40);
    expect(strike.tryHit(target, below)).toBe(true);
    strike.sweepTo(60);
    expect(strike.tryHit(target, below)).toBe(false);
  });
  it('fade frames dim toward nothing', () => {
    const alphas = Array.from({ length: SWING.frames - SWING.sweepFrames }, (_, i) => slashFrameAt(SWING.sweepFrames + i).alpha);
    expect(alphas.every((a, i) => a < 1 && (i === 0 || a < alphas[i - 1]))).toBe(true);
  });
});
