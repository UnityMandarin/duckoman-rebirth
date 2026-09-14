export const JAIL_CHECKPOINT_SECTION = 6;
export const CASTLE_CHECKPOINT = { x: 5725, surfaceTop: 183 } as const;

export function shouldCheckpoint(kind: 'jail' | 'outside', index: number): boolean {
  return kind === 'jail' ? index === JAIL_CHECKPOINT_SECTION : index > 0 && (index % 3 === 0 || index === 22);
}

export function checkpointSpawnY(surfaceTop: number, bodyHeight: number): number {
  return surfaceTop - bodyHeight / 2;
}

export function isCheckpointContact(actorX: number, actorBottom: number, markerX: number, surfaceTop: number, radius = 40, tolerance = 9): boolean {
  return Math.abs(actorX - markerX) <= radius && Math.abs(actorBottom - surfaceTop) <= tolerance;
}
