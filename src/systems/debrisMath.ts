export interface Vec { x: number; y: number; }

/** Velocity (px/s) of the blow that killed an enemy; debris scatters along it. */
export type KillImpulse = Vec;

const SPREAD = 0.6;
const MIN_DISTANCE = 40;
const MAX_DISTANCE = 120;
const DISTANCE_PER_SPEED = 0.2;

/**
 * Burst offset for one piece of debris. With an impulse, pieces fan out in a cone around its
 * direction and fly farther for faster blows; without one they pop up in a loose random spray.
 * `rand` returns values in [0, 1).
 */
export function debrisOffset(impulse: KillImpulse | undefined, rand: () => number = Math.random): Vec {
  const speed = impulse ? Math.hypot(impulse.x, impulse.y) : 0;
  if (!impulse || speed < 1) return { x: (rand() * 2 - 1) * 45, y: -(15 + rand() * 25) };
  const angle = Math.atan2(impulse.y, impulse.x) + (rand() * 2 - 1) * SPREAD;
  const distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, speed * DISTANCE_PER_SPEED)) * (0.6 + rand() * 0.6);
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance - 12 };
}
