import { describe, expect, it } from 'vitest';
import { isStomp } from '../src/systems/contactRules';

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
