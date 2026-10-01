export const JAIL_CHECKPOINT_SECTIONS = [3,6,9] as const;
export const CASTLE_CHECKPOINT = { x: 5725, surfaceTop: 183 } as const;

export function shouldCheckpoint(kind: 'jail' | 'outside' | 'crimson', index: number): boolean {
  return kind === 'crimson' ? index > 0 && (index % 3 === 0 || index === 10) : kind === 'jail' ? (JAIL_CHECKPOINT_SECTIONS as readonly number[]).includes(index) : index > 0 && (index % 3 === 0 || index === 22);
}

export function checkpointSpawnY(surfaceTop: number, bodyHeight: number): number {
  return surfaceTop - bodyHeight / 2;
}

export function isCheckpointContact(actorX: number, actorBottom: number, markerX: number, surfaceTop: number, radius = 40, tolerance = 9): boolean {
  return Math.abs(actorX - markerX) <= radius && Math.abs(actorBottom - surfaceTop) <= tolerance;
}
