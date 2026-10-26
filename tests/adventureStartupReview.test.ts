import { describe, expect, it } from 'vitest';
import { resolveAdventurePlacementPlan } from '../src/systems/adventurePlacements';
import type { CampaignScene } from '../src/systems/progress';

const chapters: CampaignScene[] = [
  'gate-1', 'jail', 'outside', 'crimson', 'rescue', 'stormworks', 'crown-edge',
];

describe('adventure startup anchors', () => {
  it('resolves every authored person and device support before chapter startup', () => {
    const expected: Record<CampaignScene, { people: number; devices: string[] }> = {
      'gate-1': { people: 1, devices: [] },
      jail: { people: 2, devices: ['jail-captive-route'] },
      outside: { people: 1, devices: ['outside-water-restored'] },
      crimson: { people: 2, devices: ['crimson-freight-bypass'] },
      rescue: { people: 0, devices: [] },
      stormworks: { people: 1, devices: ['stormworks-signal'] },
      'crown-edge': { people: 2, devices: ['crown-edge-beacon-a', 'crown-edge-beacon-b'] },
    };

    for (const chapter of chapters) {
      const plan = resolveAdventurePlacementPlan(chapter);
      expect(plan.people, chapter).toHaveLength(expected[chapter].people);
      expect(Object.keys(plan.devices).sort(), chapter).toEqual(expected[chapter].devices.sort());
      for (const point of plan.people) {
        expect(Number.isFinite(point.x), chapter).toBe(true);
        expect(Number.isFinite(point.top), chapter).toBe(true);
      }
      for (const device of Object.values(plan.devices)) {
        for (const point of [device.lever, device.relay]) {
          expect(Number.isFinite(point.x), chapter).toBe(true);
          expect(Number.isFinite(point.top), chapter).toBe(true);
        }
      }
    }
  });
});
