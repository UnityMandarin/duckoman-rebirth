import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';

describe('Gate 1 tuning', () => {
  it('keeps the original pixel conversion values centralized', () => {
    expect(TUNING.player.maxRunSpeed).toBe(200);
    expect(TUNING.player.jumpVelocity).toBe(-600);
    expect(TUNING.player.boostedJumpVelocity).toBeLessThan(TUNING.player.jumpVelocity);
    expect(TUNING.player.dashCooldown).toBe(500);
    expect(TUNING.player.maxStamina).toBe(3);
    expect(TUNING.player.crouchHeight).toBeLessThan(TUNING.player.bodyHeight);
    expect(TUNING.player.dashSpeed).toBeGreaterThan(TUNING.player.maxRunSpeed);
    expect(TUNING.player.slamVelocity).toBeLessThanOrEqual(TUNING.player.maxFallVelocity);
    expect(TUNING.player.stompBounceVelocity).toBe(-450);
    expect(TUNING.throwable.launchSpeed).toBe(500);
  });
});
