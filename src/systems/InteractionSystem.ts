import type { BasicEnemy } from '../entities/BasicEnemy';
import type { Player } from '../entities/Player';
import type { ThrowableObject } from '../entities/ThrowableObject';
import { TUNING } from '../config/tuning';
import { isStomp, enemyContact, rectsOverlap } from './contactRules';

export class InteractionSystem {
  constructor(private readonly player: Player, private readonly enemy: BasicEnemy, private readonly throwable: ThrowableObject) {}
  resolvePlayerEnemy(): void {
    if (!this.player.active || this.enemy.defeated || (this.enemy.isAnimal&&!this.enemy.body.enable)) return;
    const p = this.player.body; const e = this.enemy.body;
    if(this.enemy.isThornBoar){
      const playerRect={left:p.left,right:p.right,top:p.top,bottom:p.bottom};
      const horn=this.enemy.boarHornBounds!;
      if(rectsOverlap(playerRect,horn)){this.player.takeDamage(this.enemy.sprite.x);return;}
      const bodyOverlap=rectsOverlap(playerRect,{left:e.left,right:e.right,top:e.top,bottom:e.bottom});
      if(bodyOverlap){
        const previousBottom=p.prev.y+p.height;
        const stompLeft=this.enemy.facingDirection>0?e.left:e.left+4;
        const stompRight=this.enemy.facingDirection>0?e.right-4:e.right;
        const stomp=p.velocity.y>0&&p.right>stompLeft&&p.left<stompRight&&previousBottom<=e.top+TUNING.contacts.stompTopTolerance&&p.bottom>=e.top;
        if(stomp){if(this.enemy.hit(1,{x:p.velocity.x,y:p.velocity.y}))this.player.chargeUltimate(10);this.player.bounceFromStomp();return;}
      }
      if(this.player.isDashing){this.enemy.receiveDash(this.player);return;}
      if(!bodyOverlap)return;
      this.player.takeDamage(this.enemy.sprite.x);return;
    }
    const stomp=isStomp({ left: p.left, right: p.right, top: p.top, bottom: p.bottom, previousBottom: p.prev.y + p.height, velocityY: p.velocity.y }, { left: e.left, right: e.right, top: e.top }, TUNING.contacts.stompTopTolerance);
    const result=enemyContact(this.player.isDashing,this.enemy.pointed,stomp);
    if(result!=='dash'&&this.enemy.pointed&&!this.enemy.hurtboxes.some(box=>rectsOverlap(p,box)))return;
    if(result==='dash'){this.enemy.receiveDash(this.player);return;}
    if (result==='stomp') {
      if(this.enemy.hit(1,{x:p.velocity.x,y:p.velocity.y}))this.player.chargeUltimate(10); this.player.bounceFromStomp(); return;
    }
    this.player.takeDamage(this.enemy.sprite.x);
  }
  tryPickup(): void { if (this.player.active && this.player.grounded && this.throwable.isIdle) this.throwable.carry(this.player); }
  resolveThrownEnemy(): void {
    const v={x:this.throwable.body.velocity.x,y:this.throwable.body.velocity.y};
    if (!this.enemy.defeated && this.throwable.registerEnemyHit()){if(this.enemy.hit(1,v))this.player.chargeUltimate(10);}
  }
  dropOnDeath(): void { this.throwable.drop(); }
}
