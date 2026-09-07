import { describe, expect, it } from 'vitest';
import { PlayerAbilities } from '../src/systems/PlayerAbilities';

const createAbilities = () => new PlayerAbilities({
  dashCooldown: 500,
  maxStamina: 3,
  dashStaminaCost: 1,
  staminaRegenAmount: 0.5,
  staminaRegenInterval: 2000
});

describe('PlayerAbilities', () => {
  it('spends stamina and enforces the hidden half-second dash lock', () => {
    const abilities = createAbilities();
    expect(abilities.tryStartDash(1000, 170)).toBe(true);
    expect(abilities.stamina).toBe(2);
    expect(abilities.tryStartDash(1499, 170)).toBe(false);
    expect(abilities.tryStartDash(1500, 170)).toBe(true);
    expect(abilities.stamina).toBe(1);
  });

  it('regenerates half a stamina point every two seconds', () => {
    const abilities = createAbilities();
    abilities.tryStartDash(1000, 170);
    abilities.update(2999);
    expect(abilities.stamina).toBe(2);
    abilities.update(3000);
    expect(abilities.stamina).toBe(2.5);
    abilities.update(5000);
    expect(abilities.stamina).toBe(3);
  });

  it('arms one boosted jump after a slam landing', () => {
    const abilities = createAbilities();
    abilities.startSlam();
    expect(abilities.landSlam(2000, 750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(true);
    expect(abilities.consumeBoost(2750)).toBe(false);
  });
});
