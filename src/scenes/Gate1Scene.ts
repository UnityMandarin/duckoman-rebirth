import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { GATE_1_ROOM } from '../data/gate1Room';
import { BasicEnemy } from '../entities/BasicEnemy';
import { Player } from '../entities/Player';
import { ThrowableObject } from '../entities/ThrowableObject';
import { InputController } from '../systems/InputController';
import { InteractionSystem } from '../systems/InteractionSystem';

export class Gate1Scene extends Phaser.Scene {
  private player!: Player; private enemy!: BasicEnemy; private throwable!: ThrowableObject;
  private inputController!: InputController; private interactions!: InteractionSystem;
  private healthText!: Phaser.GameObjects.Text; private resetText!: Phaser.GameObjects.Text; private deathAt: number | undefined;
  constructor() { super('gate-1'); }
  create(): void {
    this.cameras.main.setBackgroundColor(0x20242b);
    this.physics.world.setBounds(0, 0, GATE_1_ROOM.world.width, GATE_1_ROOM.world.height);
    const terrain = this.physics.add.staticGroup();
    for (const platform of GATE_1_ROOM.platforms) {
      const rectangle = this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x6b7280);
      this.physics.add.existing(rectangle, true); terrain.add(rectangle);
    }
    this.player = new Player(this, GATE_1_ROOM.playerSpawn.x, GATE_1_ROOM.playerSpawn.y);
    this.enemy = new BasicEnemy(this, GATE_1_ROOM.enemySpawn.x, GATE_1_ROOM.enemySpawn.y);
    this.throwable = new ThrowableObject(this, GATE_1_ROOM.throwableSpawn.x, GATE_1_ROOM.throwableSpawn.y);
    this.inputController = new InputController(this); this.interactions = new InteractionSystem(this.player, this.enemy, this.throwable);
    this.physics.add.collider(this.player.sprite, terrain); this.physics.add.collider(this.enemy.sprite, terrain); this.physics.add.collider(this.throwable.sprite, terrain);
    this.physics.add.overlap(this.player.sprite, this.enemy.sprite, () => this.interactions.resolvePlayerEnemy());
    this.physics.add.overlap(this.player.sprite, this.throwable.sprite, () => this.interactions.tryPickup());
    this.physics.add.overlap(this.throwable.sprite, this.enemy.sprite, () => this.interactions.resolveThrownEnemy());
    this.cameras.main.setBounds(0, 0, GATE_1_ROOM.world.width, GATE_1_ROOM.world.height);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 1, 0, TUNING.simulation.height / 2 - this.player.sprite.y);
    this.cameras.main.setDeadzone(0, TUNING.simulation.height);
    this.healthText = this.add.text(12, 12, '', { fontFamily: 'system-ui', fontSize: '18px', color: '#f8fafc' }).setScrollFactor(0);
    this.updateHealthHud();
    this.add.text(12, 38, 'A/D or arrows: move · Space/L: jump / throw', { fontFamily: 'system-ui', fontSize: '13px', color: '#cbd5e1' }).setScrollFactor(0);
    this.resetText = this.add.text(TUNING.simulation.width / 2, TUNING.simulation.height / 2, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
  }
  update(_time: number, delta: number): void {
    const input = this.inputController.read();
    this.updateHealthHud();
    if (this.player.lifeState === 'DEAD') {
      this.interactions.dropOnDeath(); this.deathAt ??= this.time.now;
      this.resetText.setText('Duckoman down\nPress a movement key or jump to reset');
      if (this.time.now - this.deathAt >= TUNING.player.deathResetDelay && input.anyResetInput) this.scene.restart();
      return;
    }
    this.player.update(input, delta);
    if (this.player.canAct && input.jumpPressed && this.throwable.state === 'CARRIED') this.throwable.throw(this.player);
    this.throwable.follow(this.player); this.throwable.update(delta); this.enemy.update();
  }
  private updateHealthHud(): void { this.healthText.setText(`Health: ${this.player.health.toFixed(1)} / ${TUNING.player.maxHealth}`); }
}
