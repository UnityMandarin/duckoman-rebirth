import type { Player } from '../entities/Player';
import { circleIntersectsRect, type Circle, type Rect } from './contactRules';

/**
 * Blade angles are screen degrees for a right-facing swing (0 = straight ahead, negative = up).
 * Every pose stays in front of Duckoman: raised high, level, then low.
 */
export const SWING = { poses: [-88, 0, 75], trail: 125, sweepFrames: 8, frames: 12 } as const;
export const SWING_START = SWING.poses[0], SWING_END = SWING.poses[SWING.poses.length - 1];

type Point = { x: number; y: number };

/** Hit circles strung along the blade from hilt to tip at `bladeDegrees`, overlapping so there are no gaps. */
export function bladeCircles(hand: Point, facing: number, bladeDegrees: number, reach: number, radius: number): Circle[] {
  const count = Math.ceil(reach / radius), a = bladeDegrees * Math.PI / 180;
  const dx = facing * Math.cos(a), dy = Math.sin(a);
  return Array.from({ length: count }, (_, i) => {
    const d = reach * (i + 1) / count;
    return { x: hand.x + dx * d, y: hand.y + dy * d, radius };
  });
}

/** True if the blade touches `rect` anywhere between `from` and `to` degrees, stepping finely enough that the tip leaves no gaps. */
export function sweptBladeHits(rect: Rect, hand: Point, facing: number, from: number, to: number, reach: number, radius: number): boolean {
  const maxStep = (radius / reach) * 180 / Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) / maxStep));
  for (let i = 0; i <= steps; i++) {
    const blade = from + (to - from) * i / steps;
    if (bladeCircles(hand, facing, blade, reach, radius).some(c => circleIntersectsRect(c, rect))) return true;
  }
  return false;
}

/**
 * Passed with each `ultimate-strike` event, once per swing frame. Listeners call `tryHit` with their hurt bounds;
 * it answers true the first time the blade's sweep since last frame touches them, and never again this swing.
 */
export class UltimateStrike {
  private from: number = SWING_START;
  private to: number = SWING_START;
  private readonly struck = new Set<object>();
  constructor(readonly player: Player, readonly hand: Point, readonly facing: number, readonly reach: number, readonly radius: number) {}
  sweepTo(bladeDegrees: number): void { this.from = this.to; this.to = bladeDegrees; }
  tryHit(target: object, bounds: Rect): boolean {
    if (this.struck.has(target) || !sweptBladeHits(bounds, this.hand, this.facing, this.from, this.to, this.reach, this.radius)) return false;
    this.struck.add(target);
    return true;
  }
}

/** The sword art's blade points to local -x from the hilt pivot; facing left mirrors it with a negative scaleX. */
export function bladeContainerAngle(facing: number, bladeDegrees: number): number {
  return facing * (bladeDegrees + 180);
}

/** Blade angle at swing progress `t` (0..1), passing through each pose in turn. */
export function bladeAt(t: number): number {
  const { poses } = SWING, segments = poses.length - 1;
  const at = Math.min(Math.max(t, 0), 1) * segments, i = Math.min(Math.floor(at), segments - 1);
  return poses[i] + (poses[i + 1] - poses[i]) * (at - i);
}

/** Arc for one slash sprite frame: sweep frames chase the blade tip, fade frames pull the tail in and dim. */
export function slashFrameAt(index: number): { tail: number; head: number; thickness: number; alpha: number } {
  const { trail, sweepFrames, frames } = SWING;
  if (index < sweepFrames) {
    const head = bladeAt((index + 1) / sweepFrames);
    return { tail: Math.max(SWING_START, head - trail), head, thickness: 1, alpha: 1 };
  }
  const fade = (index - sweepFrames + 1) / (frames - sweepFrames + 1);
  const tail = Math.max(SWING_START, SWING_END - trail);
  return { tail: tail + (SWING_END - tail) * fade * 0.7, head: SWING_END, thickness: 1 - fade * 0.5, alpha: 1 - fade };
}
