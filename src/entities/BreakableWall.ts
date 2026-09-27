import Phaser from 'phaser';
import { Dashable } from './Dashable';
import type { Player } from './Player';
import type { Rect } from '../systems/contactRules';
import type { KillImpulse } from '../systems/debrisMath';
import { hitSpark } from '../systems/HitSpark';
import { scatterDebris } from '../systems/DebrisBurst';

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

  protected onDash(_player: Player, impulse: KillImpulse): void { this.break(impulse, false); }

  /** `spark` is off for dash hits, which already spark at the contact point. */
  break(impulse?: KillImpulse, spark = true): void {
    if (this.broken) return;
    this.broken = true;
    const body = this.solid.body as Phaser.Physics.Arcade.StaticBody;
    if (spark) hitSpark(this.scene, body.center.x, body.center.y);
    body.enable = false;
    this.crumble(body, impulse);
    const push = impulse ? impulse.x * 0.05 : 0, tilt = impulse && impulse.x < 0 ? -8 : 8;
    const targets = [...new Set([this.solid, ...this.visuals])];
    this.scene.tweens.add({ targets, alpha: 0, x: `+=${push}`, y: '+=20', angle: tilt, duration: 220, onComplete: () => targets.forEach(t => t.destroy()) });
  }

  private crumble(body: Phaser.Physics.Arcade.StaticBody, impulse?: KillImpulse): void {
    const chunks = [];
    for (let i = 0; i < 9; i++) {
      const size = 4 + Math.random() * 5, points = [];
      for (let j = 0; j < 5; j++) {
        const a = j * Math.PI * 2 / 5 + Math.random() * 0.5, r = size * (0.7 + Math.random() * 0.3);
        points.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      }
      const y = body.top + (i + Math.random()) * body.height / 9;
      chunks.push(this.scene.add.graphics().setPosition(body.center.x + (Math.random() - 0.5) * body.width, y).setDepth(15)
        .fillStyle([0xb49a73, 0x8f7a5c, 0x6d5b45][i % 3]).fillPoints(points, true)
        .lineStyle(1, 0x3a2e22, 0.8).strokePoints(points, true));
    }
    scatterDebris(this.scene, chunks, impulse);
  }
}
