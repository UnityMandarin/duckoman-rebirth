import Phaser from 'phaser';
import { Dashable } from './Dashable';
import type { Player } from './Player';
import type { Rect } from '../systems/contactRules';
import type { KillImpulse } from '../systems/debrisMath';

/** A static obstacle that crumbles when dashed (or hit by a thrown cake). */
export class BreakableWall extends Dashable {
  private broken = false;

  /** `solid` must already have a static physics body; `visuals` fade out when it breaks. */
  constructor(private readonly scene: Phaser.Scene, readonly solid: Phaser.GameObjects.GameObject, private readonly visuals: Phaser.GameObjects.GameObject[]) {
    super();
  }

  get isBroken(): boolean { return this.broken; }

  protected dashBounds(): Rect | null {
    if (this.broken) return null;
    const b = this.solid.body as Phaser.Physics.Arcade.StaticBody;
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
  }

  protected onDash(_player: Player, impulse: KillImpulse): void { this.break(impulse); }

  break(impulse?: KillImpulse): void {
    if (this.broken) return;
    this.broken = true;
    (this.solid.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    const push = impulse ? impulse.x * 0.05 : 0, tilt = impulse && impulse.x < 0 ? -8 : 8;
    const targets = [...new Set([this.solid, ...this.visuals])];
    this.scene.tweens.add({ targets, alpha: 0, x: `+=${push}`, y: '+=20', angle: tilt, duration: 220, onComplete: () => targets.forEach(t => t.destroy()) });
  }
}
