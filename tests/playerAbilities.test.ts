import { describe, expect, it } from 'vitest';
import { PlayerAbilities, dashBounceVelocity } from '../src/systems/PlayerAbilities';
import { TUNING } from '../src/config/tuning';

const createAbilities = () => new PlayerAbilities({ dashCooldown: 1000 });

describe('PlayerAbilities', () => {
  it('holding down halves the dash bounce angle at the same speed', () => {
    const bounce = TUNING.player.dashBounce;
    expect(dashBounceVelocity(bounce, false)).toEqual({ x: bounce.x, y: bounce.y });
    const flat = dashBounceVelocity(bounce, true), angle = (v: { x: number; y: number }) => Math.atan2(-v.y, v.x);
    expect(angle(flat)).toBeCloseTo(angle(bounce) * .5);
    expect(Math.hypot(flat.x, flat.y)).toBeCloseTo(Math.hypot(bounce.x, bounce.y));
    expect(flat.y).toBeLessThan(0);
  });

  it('enforces the one-second dash cooldown', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170, true)).toBe(true);
    expect(abilities.tryStartDash(1999, 170, true)).toBe(false);
    expect(abilities.tryStartDash(2000, 170, true)).toBe(true);
  });

  it('reports dash charge refilling across the cooldown', () => {
    const abilities = createAbilities();
    expect(abilities.dashCharge(0)).toBe(1);
    abilities.tryStartDash(1000, 170, true);
    expect(abilities.dashCharge(1000)).toBe(0);
    expect(abilities.dashCharge(1500)).toBe(0.5);
    expect(abilities.dashCharge(2000)).toBe(1);
  });

  it('allows only one dash per airborne period', () => {
    const abilities = createAbilities();
    expect(abilities.airDashSpent).toBe(false);
    expect(abilities.tryStartDash(1000, 170, false)).toBe(true);
    expect(abilities.airDashSpent).toBe(true);
    expect(abilities.tryStartDash(5000, 170, false)).toBe(false);
    abilities.land();
    expect(abilities.airDashSpent).toBe(false);
    expect(abilities.tryStartDash(6000, 170, false)).toBe(true);
  });

  it('does not spend the air dash on a grounded dash', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170, true)).toBe(true);
    expect(abilities.tryStartDash(2000, 170, false)).toBe(true);
  });

  it('ignores cooldown and the air limit with unlimited dashes', () => {
    const abilities = createAbilities();
    abilities.unlimitedDashes = true;
    expect(abilities.tryStartDash(1000, 170, false)).toBe(true);
    expect(abilities.tryStartDash(1001, 170, false)).toBe(true);
    expect(abilities.airDashSpent).toBe(false);
    expect(abilities.dashCharge(1001)).toBe(1);
  });

  it('arms one boosted jump after a slam landing', () => {
    const abilities = createAbilities();
    abilities.startSlam();
    expect(abilities.landSlam(2000, 750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(false);
  });

  it('sprints whenever sprint is held while moving', () => {
    const abilities = createAbilities();
    abilities.setSprint(true);
    expect(abilities.sprinting).toBe(true);
    abilities.setSprint(false);
    expect(abilities.sprinting).toBe(false);
  });
});
