import { describe, expect, it } from 'vitest';
import { CASTLE, CASTLE_PLATFORMS, CASTLE_SECRET, inSecretHole, reachedSecretPortal, secretHoleSolids, secretShaftWalls } from '../src/data/castle';
import { GATE_1_ROOM } from '../src/data/gate1Room';
import { TUNING } from '../src/config/tuning';

const b2 = GATE_1_ROOM.platforms.find(platform => platform.x === 1590 && platform.width === 90)!;
const holeRight = CASTLE_SECRET.hole.left + CASTLE_SECRET.hole.width;
const holeCenter = CASTLE_SECRET.hole.left + CASTLE_SECRET.hole.width / 2;
const hallFloors = [...GATE_1_ROOM.platforms, ...CASTLE_PLATFORMS].filter(platform => platform.y - platform.height / 2 === 360);

describe('castle secret under B2', () => {
  it('opens a duck-width hole under B2 toward A7', () => {
    const b2Left = b2.x - b2.width / 2;
    const b2Right = b2.x + b2.width / 2;
    expect(CASTLE_SECRET.hole.left).toBe(b2Left);
    expect(holeRight).toBeLessThan(b2Right);
    expect(b2Right - holeRight).toBeGreaterThan(TUNING.player.bodyWidth / 2);
    expect(CASTLE_SECRET.hole.width).toBe(Math.round((TUNING.player.bodyWidth + 6) * 1.1));
  });

  it('keeps the hall floor looking solid and only opens collision at the hole', () => {
    const covering = hallFloors.filter(floor => {
      const left = floor.x - floor.width / 2;
      const right = floor.x + floor.width / 2;
      return Math.min(right, holeRight) - Math.max(left, CASTLE_SECRET.hole.left) > 0;
    });
    expect(covering.length).toBeGreaterThan(0);
    const solids = secretHoleSolids(hallFloors).filter(floor => floor.y - floor.height / 2 === 360);
    for (const solid of solids) {
      const left = solid.x - solid.width / 2;
      const right = solid.x + solid.width / 2;
      expect(Math.min(right, holeRight) - Math.max(left, CASTLE_SECRET.hole.left)).toBeLessThanOrEqual(0);
    }
  });

  it('keeps B2 full width with room to walk under it into the hole', () => {
    expect(secretHoleSolids([b2])).toEqual([b2]);
    const b2Bottom = b2.y + b2.height / 2;
    expect(360 - b2Bottom).toBeGreaterThan(TUNING.player.bodyHeight);
  });

  it('portals into a separate empty room instead of extending the castle map', () => {
    expect(CASTLE_SECRET.scene).toBe('castle-secret');
    expect(CASTLE.bottom).toBe(400);
    expect(CASTLE_SECRET.room.width).toBe(TUNING.simulation.width);
    expect(CASTLE_SECRET.room.height).toBe(TUNING.simulation.height);
    expect(inSecretHole(holeCenter, 361)).toBe(true);
    expect(inSecretHole(80, 360)).toBe(false);
    expect(inSecretHole(holeCenter, 360)).toBe(false);
  });

  it('places the portal at the bottom of a shaft below the camera so Duckoman falls out of view first', () => {
    const { portalY } = CASTLE_SECRET.hole;
    expect(portalY - TUNING.player.bodyHeight).toBeGreaterThan(CASTLE.bottom);
    expect(reachedSecretPortal(holeCenter, 361)).toBe(false);
    expect(reachedSecretPortal(holeCenter, CASTLE.bottom + TUNING.player.bodyHeight)).toBe(false);
    expect(reachedSecretPortal(holeCenter, portalY)).toBe(true);
    expect(reachedSecretPortal(80, portalY)).toBe(false);
    for (const wall of secretShaftWalls()) {
      expect(wall.y - wall.height / 2).toBe(CASTLE.bottom);
      expect(wall.y + wall.height / 2).toBe(portalY);
      const left = wall.x - wall.width / 2, right = wall.x + wall.width / 2;
      expect(Math.min(right, holeRight) - Math.max(left, CASTLE_SECRET.hole.left)).toBeLessThanOrEqual(0);
    }
  });
});
