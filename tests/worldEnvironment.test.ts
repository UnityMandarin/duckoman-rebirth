import { describe, expect, it } from 'vitest';
import { createEnvironmentPlan, environmentWindow, pierFitsBank } from '../src/data/worldEnvironment';
import { CHAPTER_WIDTH, chapterPlatforms, SECTION_WIDTH } from '../src/data/chapters';
import { encounterFor } from '../src/data/chapterChallenges';
import { CASTLE_PLATFORMS, CASTLE_SECRET } from '../src/data/castle';
import { JAIL_ROOMS, OUTSIDE_ROOMS } from '../src/data/qualityRooms';

describe('connected authored world environments', () => {
  it('covers every room and preserves a continuous global origin across Jail elevation changes', () => {
    for (const kind of ['jail', 'outside', 'crimson'] as const) {
      const plan = createEnvironmentPlan(kind);
      expect(plan.rooms).toHaveLength(kind === 'outside' ? 24 : 12);
      expect(plan.rooms[0].start).toBe(0);
      expect(plan.rooms.at(-1)!.end).toBe(CHAPTER_WIDTH[kind]);
      plan.rooms.forEach((room, i) => {
        expect(room.leftAnchor).toBe(i * SECTION_WIDTH);
        expect(room.rightAnchor).toBe((i + 1) * SECTION_WIDTH);
        if (i) expect(room.leftAnchor).toBe(plan.rooms[i - 1].rightAnchor);
      });
      expect(plan.gridOrigin).toEqual([0, -160]);
      expect(plan.farScroll).toEqual([.8, 1]);
      // Generated fields are1536x1024: one vertical image covers every camera extremum.
      expect(plan.top - 128 + 1024 * plan.farScale).toBeGreaterThanOrEqual(plan.bottom);
    }
    expect(createEnvironmentPlan('jail').rooms.map(r => r.floor)).toEqual(JAIL_ROOMS.map(r => r.floor));
  });

  it('derives all floor banks and gaps from authored collision, including continuous Crimson floor', () => {
    for (const kind of ['jail', 'outside'] as const) {
      const plan = createEnvironmentPlan(kind), authored = kind === 'jail' ? JAIL_ROOMS : OUTSIDE_ROOMS;
      authored.forEach((room, i) => {
        expect(plan.rooms[i].floorIntervals).toEqual(room.intervals.map(([a, b]) => [i * SECTION_WIDTH + a, i * SECTION_WIDTH + b]));
        for (const [a, b] of plan.rooms[i].gaps) {
          expect(pierFitsBank(plan.rooms[i], (a + b) / 2, 20)).toBe(false);
          expect(plan.rooms[i].floorIntervals.every(([c, d]) => d <= a || c >= b)).toBe(true);
        }
      });
    }
    expect(createEnvironmentPlan('outside').rooms[13].gaps).toEqual([[13 * SECTION_WIDTH + 300, 13 * SECTION_WIDTH + 1180]]);
    for (const room of createEnvironmentPlan('crimson').rooms) {
      expect(room.gaps).toEqual([]);
      expect(room.floor).toBe(360);
    }
  });

  it('registers support tracks to the exact authored step and live +/-65 movement ranges', () => {
    for (const kind of ['jail', 'outside', 'crimson'] as const) {
      const surfaces = chapterPlatforms(kind);
      for (const room of createEnvironmentPlan(kind).rooms) {
        const moving = encounterFor(kind, room.index)?.moving ?? [];
        expect(room.machines).toHaveLength(moving.length);
        room.machines.forEach(m => {
          const p = surfaces.find(p => p.room === room.index && p.step === m.step)!;
          expect([m.x, m.y, m.width]).toEqual([p.x, p.y, p.width]);
          expect(m.travelX).toEqual([p.x - (m.type === 'ferry' ? 65 : 0), p.x + (m.type === 'ferry' ? 65 : 0)]);
          expect(m.travelY).toEqual([p.y - (m.type === 'lift' ? 65 : 0), p.y + (m.type === 'lift' ? 65 : 0)]);
        });
      }
    }
  });

  it('uses surviving Castle geometry, excludes the secret shaft and retains the dash landings', () => {
    const plan = createEnvironmentPlan('castle');
    expect(plan.top).toBe(-800);
    expect(plan.bottom).toBe(560);
    expect(plan.rooms[0].gaps).toEqual([[CASTLE_SECRET.hole.left, CASTLE_SECRET.hole.left + CASTLE_SECRET.hole.width]]);
    expect(pierFitsBank(plan.rooms[0], CASTLE_SECRET.hole.left + 10, 20)).toBe(false);
    expect(plan.rooms[2].steps.some(p => p.x === 4790)).toBe(true);
    expect(plan.rooms[2].steps.some(p => p.x === 5330)).toBe(true);
    const castleSteps = plan.rooms.flatMap(r => r.steps);
    expect(castleSteps.some(p => p.x === 4750 && p.y === -255)).toBe(false);
    expect(CASTLE_PLATFORMS.some(p => p.x === 4750 && p.y === -255)).toBe(false);
  });

  it('renders neighbor context for previews and confines practice scenery to the arena approach', () => {
    const plan = createEnvironmentPlan('outside');
    expect(environmentWindow(plan, [13 * 1440, 14 * 1440]).map(r => r.index)).toEqual([12, 13, 14]);
    expect(environmentWindow(plan, [22 * 1440, plan.width - 400]).map(r => r.index)).toEqual([21, 22, 23]);
    expect(environmentWindow(plan, [0, 1440]).map(r => r.index)).toEqual([0, 1]);
  });


});
