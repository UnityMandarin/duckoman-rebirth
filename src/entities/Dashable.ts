import type { Player } from './Player';
import type { Rect } from '../systems/contactRules';
import type { KillImpulse } from '../systems/debrisMath';
/** Anything the player's dash can hit. A dash that connects always bounces the player back off it. */
export abstract class Dashable {
  /** Area the dash can connect with right now, or null when it can't be dashed (broken, defeated, offstage). */
  protected abstract dashBounds(): Rect | null;
  /** What the dash does to this object. `impulse` is the dash velocity. */
  protected abstract onDash(player: Player, impulse: KillImpulse): void;

  /** Resolves a dash contact that has already been detected, e.g. by a physics overlap. */
  receiveDash(player: Player): void {
    player.dashImpact(this.dashBounds());
    this.onDash(player, player.dashVelocity);
    player.bounceFromDash();
  }

  /** Polls for a dash contact this frame and resolves it. */
  checkDash(player: Player): boolean {
    const bounds = this.dashBounds();
    if (!bounds || !player.dashHits(bounds)) return false;
    this.receiveDash(player);
    return true;
  }
}
