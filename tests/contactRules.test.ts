import { describe, expect, it } from 'vitest';
import { circleIntersectsRect, isStomp, rectsOverlap } from '../src/systems/contactRules';

describe('rectsOverlap', () => {
  const spike = { left: 120, right: 130, top: 100, bottom: 122 };
  it('hits only when rects share area', () => {
    expect(rectsOverlap({ left: 125, right: 170, top: 80, bottom: 105 }, spike)).toBe(true);
    expect(rectsOverlap({ left: 131, right: 170, top: 80, bottom: 120 }, spike)).toBe(false);
    expect(rectsOverlap({ left: 80, right: 120, top: 80, bottom: 120 }, spike)).toBe(false);
  });
});

describe('circleIntersectsRect', () => {
  const rect = { left: 100, right: 150, top: 100, bottom: 150 };
  it('hits when the circle reaches an edge or contains the rect', () => {
    expect(circleIntersectsRect({ x: 60, y: 125, radius: 40 }, rect)).toBe(true);
    expect(circleIntersectsRect({ x: 125, y: 125, radius: 5 }, rect)).toBe(true);
  });
  it('uses true circular distance at corners', () => {
    expect(circleIntersectsRect({ x: 70, y: 70, radius: 40 }, rect)).toBe(false);
    expect(circleIntersectsRect({ x: 75, y: 75, radius: 40 }, rect)).toBe(true);
  });
});

const enemy = { left: 100, right: 150, top: 200 };

describe('isStomp', () => {
  it('recognizes descending contact from above', () => {
    expect(isStomp({ left: 105, right: 145, top: 150, bottom: 205, previousBottom: 204, velocityY: 40 }, enemy, 8)).toBe(true);
  });

  it('rejects side and rising contact', () => {
    expect(isStomp({ left: 150, right: 210, top: 150, bottom: 205, previousBottom: 205, velocityY: 40 }, enemy, 8)).toBe(false);
    expect(isStomp({ left: 105, right: 145, top: 150, bottom: 205, previousBottom: 200, velocityY: -40 }, enemy, 8)).toBe(false);
  });
});
