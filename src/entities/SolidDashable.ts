import Phaser from 'phaser';
import { Dashable } from './Dashable';
import type { Player } from './Player';
import type { Rect } from '../systems/contactRules';

/** Unbreakable scenery (pillars, piers) that a dash bounces off. */
export class SolidDashable extends Dashable {
  /** `solid` must already have a static physics body. */
  constructor(private readonly solid: Phaser.GameObjects.GameObject) {
    super();
  }

  protected dashBounds(): Rect | null {
    const b = this.solid.body as Phaser.Physics.Arcade.StaticBody | null;
    if (!b || !b.enable) return null;
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  }

  protected onDash(): void {}

  /** Only dashing into the face ahead counts; the round dash hitbox would otherwise catch pillars behind or underfoot. */
  checkDash(player: Player): boolean {
    const bounds = this.dashBounds(), p = player.body;
    if (!bounds || bounds.top >= p.bottom || bounds.bottom <= p.top) return false;
    const ahead = player.dashVelocity.x > 0 ? bounds.left >= p.center.x : bounds.right <= p.center.x;
    return ahead && super.checkDash(player);
  }
}
