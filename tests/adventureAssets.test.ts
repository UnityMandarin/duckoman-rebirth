import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));
import { ADVENTURE_NPC_ATLAS, ADVENTURE_NPC_KEYS, preloadAdventureAssets, registerAdventureFrames } from '../src/systems/AdventureAssets';

describe('adventure NPC atlas', () => {
  it('loads a 3 by 2 sheet and registers the six named frames inside their own cells', () => {
    const frames = new Map<string, { x: number; y: number; width: number; height: number }>();
    const scene = {
      textures: {
        exists: (key: string) => key === ADVENTURE_NPC_ATLAS,
        get: () => ({
          has: (key: string) => frames.has(key),
          add: (key: string, _source: number, x: number, y: number, width: number, height: number) => frames.set(key, { x, y, width, height })
        })
      },
      load: { spritesheet: vi.fn() }
    } as any;

    preloadAdventureAssets({ ...scene, textures: { exists: () => false }, load: scene.load });
    expect(scene.load.spritesheet).toHaveBeenCalledWith(ADVENTURE_NPC_ATLAS, 'assets/adventure/npc-atlas.png', { frameWidth: 512, frameHeight: 512 });
    registerAdventureFrames(scene);
    expect([...frames.keys()]).toEqual([...ADVENTURE_NPC_KEYS]);
    for (const [index, key] of ADVENTURE_NPC_KEYS.entries()) {
      const f = frames.get(key)!;
      const cellX = (index % 3) * 512, cellY = Math.floor(index / 3) * 512;
      expect(f.x).toBeGreaterThanOrEqual(cellX);
      expect(f.y).toBeGreaterThanOrEqual(cellY);
      expect(f.x + f.width).toBeLessThanOrEqual(cellX + 512);
      expect(f.y + f.height).toBeLessThanOrEqual(cellY + 512);
      expect(f.width).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThan(0);
    }
    registerAdventureFrames(scene);
    expect(frames.size).toBe(6);
  });
});
