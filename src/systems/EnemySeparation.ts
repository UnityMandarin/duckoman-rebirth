import type { BasicEnemy } from '../entities/BasicEnemy';
import { rectsOverlap, type Rect } from './contactRules';

/** Soft push: each frame, overlapping pairs move apart by a fraction of their overlap, capped so it never reads as a shove. */
export const SEPARATION = { strength: 0.2, maxStep: 2 } as const;

/** Horizontal nudge per box that eases overlapping boxes apart. Exact ties split by list order so stacks still fan out. */
export function separationPushes(boxes: Rect[], strength: number = SEPARATION.strength, maxStep: number = SEPARATION.maxStep): number[] {
  const pushes = boxes.map(() => 0);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (!rectsOverlap(a, b)) continue;
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const dir = (a.left + a.right) <= (b.left + b.right) ? -1 : 1;
      const step = overlap * strength / 2;
      pushes[i] += dir * step;
      pushes[j] -= dir * step;
    }
  }
  return pushes.map(p => Math.max(-maxStep, Math.min(maxStep, p)));
}

/** Call after enemies set their own velocities; physics picks up the nudged positions next step. */
export function spreadEnemies(enemies: BasicEnemy[]): void {
  const live = enemies.filter(e => !e.defeated && e.body.enable);
  const pushes = separationPushes(live.map(e => ({ left: e.body.left, right: e.body.right, top: e.body.top, bottom: e.body.bottom })));
  live.forEach((e, i) => { if (pushes[i] !== 0) e.sprite.x += pushes[i]; });
}
