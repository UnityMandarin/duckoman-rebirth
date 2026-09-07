import { describe, expect, it } from 'vitest';
import { PlayerAbilities } from '../src/systems/PlayerAbilities';

describe('PlayerAbilities', () => {
  it('enforces dash cooldown from activation', () => {
    const abilities = new PlayerAbilities();
    expect(abilities.tryStartDash(1000, 170, 2000)).toBe(true);
    expect(abilities.isDashing(1169)).toBe(true);
    expect(abilities.isDashing(1170)).toBe(false);
    expect(abilities.tryStartDash(2999, 170, 2000)).toBe(false);
    expect(abilities.tryStartDash(3000, 170, 2000)).toBe(true);
  });

  it('arms one boosted jump after a slam landing', () => {
    const abilities = new PlayerAbilities();
    abilities.startSlam();
    expect(abilities.landSlam(2000, 750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(false);
  });

  it('expires the landing boost and cancels transient states on damage', () => {
    const abilities = new PlayerAbilities();
    abilities.startSlam();
    abilities.landSlam(2000, 750);
    expect(abilities.consumeBoost(2751)).toBe(false);
    abilities.tryStartDash(3000, 170, 2000);
    abilities.cancelTransient();
    expect(abilities.isDashing(3001)).toBe(false);
    expect(abilities.dashCooldownRemaining(3001)).toBe(1999);
  });
});
