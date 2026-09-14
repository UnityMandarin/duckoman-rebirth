import { describe, expect, it } from 'vitest';
import { CASTLE_PLATFORMS } from '../src/data/castle';
import { CASTLE_CHECKPOINT, JAIL_CHECKPOINT_SECTION, checkpointSpawnY, isCheckpointContact, shouldCheckpoint } from '../src/systems/checkpointPolicy';

describe('chapter checkpoint policy', () => {
  it('keeps jail to one midpoint checkpoint section', () => {
    expect(Array.from({ length: 12 }, (_, index) => index).filter((index) => shouldCheckpoint('jail', index))).toEqual([JAIL_CHECKPOINT_SECTION]);
    expect(Array.from({ length: 24 }, (_, index) => index).filter((index) => shouldCheckpoint('outside', index))).toEqual([3, 6, 9, 12, 15, 18, 21, 22]);
  });
  it('spawns castle Duckoman flush on the midpoint support', () => {
    const support = CASTLE_PLATFORMS.find((platform) => platform.x === CASTLE_CHECKPOINT.x);
    expect(support && support.y - support.height / 2).toBe(CASTLE_CHECKPOINT.surfaceTop);
    expect(checkpointSpawnY(CASTLE_CHECKPOINT.surfaceTop, 55)).toBe(155.5);
    expect(isCheckpointContact(CASTLE_CHECKPOINT.x, CASTLE_CHECKPOINT.surfaceTop, CASTLE_CHECKPOINT.x, CASTLE_CHECKPOINT.surfaceTop)).toBe(true);
    expect(isCheckpointContact(CASTLE_CHECKPOINT.x, 270, CASTLE_CHECKPOINT.x, CASTLE_CHECKPOINT.surfaceTop)).toBe(false);
    expect(isCheckpointContact(CASTLE_CHECKPOINT.x - 100, CASTLE_CHECKPOINT.surfaceTop, CASTLE_CHECKPOINT.x, CASTLE_CHECKPOINT.surfaceTop)).toBe(false);
  });
});
