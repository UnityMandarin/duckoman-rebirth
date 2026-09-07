import type { BasicEnemy } from '../entities/BasicEnemy';
import type { Player } from '../entities/Player';
import type { ThrowableObject } from '../entities/ThrowableObject';
import { TUNING } from '../config/tuning';
import { isStomp } from './contactRules';

export class InteractionSystem {
  constructor(private readonly player: Player, private readonly enemy: BasicEnemy, private readonly throwable: ThrowableObject) {}
  resolvePlayerEnemy(): void {
    if (!this.player.active || this.enemy.defeated) return;
    if (this.player.isDashing) { this.enemy.defeat(); return; }
    const p = this.player.body; const e = this.enemy.body;
    if (isStomp({ left: p.left, right: p.right, top: p.top, bottom: p.bottom, previousBottom: p.prev.y + p.height, velocityY: p.velocity.y }, { left: e.left, right: e.right, top: e.top }, TUNING.contacts.stompTopTolerance)) {
      this.enemy.defeat(); this.player.bounceFromStomp(); return;
    }
    this.player.takeDamage(this.enemy.sprite.x);
  }
  tryPickup(): void { if (this.player.active && this.player.grounded && this.throwable.isIdle) this.throwable.carry(this.player); }
  resolveThrownEnemy(): void { if (!this.enemy.defeated && this.throwable.registerEnemyHit()) this.enemy.defeat(); }
  dropOnDeath(): void { this.throwable.drop(); }
}
