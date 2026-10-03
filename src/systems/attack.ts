import { TUNING } from '../config/tuning';

/** A hit something can land on Duckoman. Knockback scales the usual shove; velocity is added on top, in px/s. */
export interface Attack {
  damage: number;
  knockback?: number;
  velocity?: { x: number; y: number };
}

/** Shove applied to a victim at `victimX` by a hit from `attackerX`. */
export function attackVelocity(victimX: number, attackerX: number, attack: Pick<Attack, 'knockback' | 'velocity'>): { x: number; y: number } {
  const scale = attack.knockback ?? 1;
  const direction = victimX < attackerX ? -1 : 1;
  const shove = TUNING.player.damageKnockback;
  return {
    x: direction * shove.x * scale + (attack.velocity?.x ?? 0),
    y: shove.y * scale + (attack.velocity?.y ?? 0)
  };
}
