import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createFranklinController, franklinChipBounds, FRANKLIN_RULES, tickFranklin } from '../src/systems/FranklinFireFoxRules';

describe('Franklin movement and cue contracts', () => {
  it('keeps the final stomp and low tail wave within an ordinary held jump', () => {
    const jumpHeight = TUNING.player.jumpVelocity ** 2 / (2 * TUNING.player.gravity);
    expect(jumpHeight - (360 - franklinChipBounds(790).top)).toBeGreaterThan(30);
    expect(jumpHeight - FRANKLIN_RULES.waveHeight).toBeGreaterThan(80);
    const reactionDistance = TUNING.player.maxRunSpeed * (FRANKLIN_RULES.overdrivePillarWarningMs - 250) / 1000;
    expect(reactionDistance).toBeGreaterThan((FRANKLIN_RULES.pillarWidth + TUNING.player.bodyWidth) / 2 + 30);
  });

  it('does not turn a wall bounce around before actually reaching the wall', () => {
    const start = { ...createFranklinController(), phase: 'wallbounce' as const, direction: 1, elapsed: 850 };
    const input = { bossX: 1750, playerX: 1000, playerY: 330 };
    expect(tickFranklin(start, 50, input).phase).toBe('wallbounce');
    expect(tickFranklin(start, 50, { ...input, bossX: 1845 })).toMatchObject({ phase: 'pounce-cue', direction: -1 });
  });

  it('keeps final charge direction frozen throughout its warning', () => {
    let state = { ...createFranklinController(), phase: 'final-cue' as const, direction: -1 };
    for (let i = 0; i < 20; i += 1) {
      state = tickFranklin(state, 50, { bossX: 790, playerX: 1500, playerY: 330 }) as typeof state;
    }
    expect(state).toMatchObject({ phase: 'final-charge', direction: -1 });
  });

  it('freezes pillar marks on cue entry, including the first warning frame', () => {
    const before = { ...createFranklinController(), phase: 'tail' as const, elapsed: 1000, aimX: 155, direction: -1 };
    const cue = tickFranklin(before, 50, { bossX: 155, playerX: 1000, playerY: 330 });
    expect(cue).toMatchObject({ phase: 'pillars-cue', hazards: [700, 1000, 1300] });
    expect(tickFranklin(cue, 50, { bossX: 155, playerX: 1500, playerY: 330 }).hazards).toEqual(cue.hazards);
  });
});
