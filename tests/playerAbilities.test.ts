import { describe, expect, it } from 'vitest';
import { PlayerAbilities } from '../src/systems/PlayerAbilities';

const createAbilities = () => new PlayerAbilities({ dashCooldown: 1000 });

describe('PlayerAbilities', () => {
  it('enforces the one-second dash cooldown', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170, true)).toBe(true);
    expect(abilities.tryStartDash(1999, 170, true)).toBe(false);
    expect(abilities.tryStartDash(2000, 170, true)).toBe(true);
  });

  it('allows only one dash per airborne period', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170, false)).toBe(true);
    expect(abilities.tryStartDash(5000, 170, false)).toBe(false);
    abilities.land();
    expect(abilities.tryStartDash(6000, 170, false)).toBe(true);
  });

  it('does not spend the air dash on a grounded dash', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170, true)).toBe(true);
    expect(abilities.tryStartDash(2000, 170, false)).toBe(true);
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
