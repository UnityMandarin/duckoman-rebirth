import { describe, expect, it } from 'vitest';
import { PlayerAbilities } from '../src/systems/PlayerAbilities';

const createAbilities = () => new PlayerAbilities({
  dashCooldown: 500,
  maxStamina: 3,
  dashStaminaCost: 1,
  staminaRegenAmount: 0.5,
  staminaRegenInterval: 2000,
  sprintStaminaCost: 0.25,
  sprintStaminaInterval: 2000
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

  it('drains sprint stamina and disables sprint at zero', () => {
    const abilities = createAbilities();
    abilities.toggleSprint(1000);
    abilities.update(3000);
    expect(abilities.stamina).toBe(2.75);
    abilities.update(25000);
    expect(abilities.stamina).toBe(0);
    expect(abilities.sprinting).toBe(false);
  });

  it('resumes stamina regeneration after sprint is turned off', () => {
    const abilities = createAbilities();
    abilities.toggleSprint(1000);
    abilities.update(3000);
    abilities.toggleSprint(3000);
    abilities.update(5000);
    expect(abilities.stamina).toBe(3);
  });

  it('holding sprint at rest neither starts sprint nor consumes stamina',()=>{
    const abilities=createAbilities();
    abilities.setSprint(false,1000);abilities.setSprint(false,20000);
    expect(abilities.stamina).toBe(3);expect(abilities.sprinting).toBe(false);
  });

  it('charges only moving time, including separate short sprint bursts',()=>{
    const abilities=createAbilities();
    abilities.setSprint(true,1000);abilities.setSprint(false,2000);
    abilities.setSprint(true,2100);abilities.setSprint(false,3100);
    expect(abilities.stamina).toBe(2.75);
    abilities.setSprint(false,5100);expect(abilities.stamina).toBe(3);
  });

  it('never regenerates during an active sprint',()=>{
    const abilities=createAbilities();abilities.tryStartDash(0,255);
    abilities.setSprint(true,500);abilities.update(4500);
    expect(abilities.stamina).toBe(1.5);
  });
});
