import { describe, expect, it } from 'vitest';
import { RELICS, grantRelic, markRustwingDefeated, relicAirJumps, revokeRelic, rustwingDefeated, withRelic } from '../src/systems/relics';
import { CASTLE, CASTLE_SECRET, SECRET_RETURN_X, inSecretHole, secretSeal } from '../src/data/castle';
import { TUNING } from '../src/config/tuning';

describe('relics', () => {
  it('the Bronze Wing grants one midair jump, and collecting it twice changes nothing', () => {
    expect(relicAirJumps([])).toBe(0);
    expect(RELICS['bronze-wing'].airJumps).toBe(1);
    const once = withRelic([], 'bronze-wing');
    expect(withRelic(once, 'bronze-wing')).toEqual(['bronze-wing']);
    expect(relicAirJumps(once)).toBe(1);
  });

  it('seals the castle hole when Rustwing dies, independent of who holds the Bronze Wing', () => {
    const data = new Map<string, unknown>();
    const registry = { get: (key: string) => data.get(key), set: (key: string, value: unknown) => data.set(key, value) };
    expect(rustwingDefeated(registry as never)).toBe(false);
    grantRelic(registry as never, 'bronze-wing');
    expect(rustwingDefeated(registry as never)).toBe(false);
    markRustwingDefeated(registry as never);
    expect(rustwingDefeated(registry as never)).toBe(true);
    revokeRelic(registry as never, 'bronze-wing');
    expect(rustwingDefeated(registry as never)).toBe(true);
  });

  it('plugs the secret hole flush with the floor and returns the duck beside it', () => {
    const seal = secretSeal(), { left, width } = CASTLE_SECRET.hole;
    expect(seal.x - seal.width / 2).toBe(left);
    expect(seal.x + seal.width / 2).toBe(left + width);
    expect(seal.y - seal.height / 2).toBe(360);
    expect(seal.y + seal.height / 2).toBe(CASTLE.bottom);
    const half = TUNING.player.bodyWidth / 2;
    expect(SECRET_RETURN_X - half).toBeGreaterThan(seal.x + seal.width / 2);
    expect(inSecretHole(SECRET_RETURN_X, 361)).toBe(false);
  });
});
