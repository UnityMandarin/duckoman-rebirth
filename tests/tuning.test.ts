import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';

describe('Gate 1 tuning', () => {
  it('keeps the original pixel conversion values centralized', () => {
    expect(TUNING.player.maxRunSpeed).toBe(200);
    expect(TUNING.player.jumpVelocity).toBe(-600);
    expect(TUNING.player.stompBounceVelocity).toBe(-450);
    expect(TUNING.throwable.launchSpeed).toBe(500);
  });
});
