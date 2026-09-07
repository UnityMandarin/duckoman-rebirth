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
  private healthText!: Phaser.GameObjects.Text; private abilityText!: Phaser.GameObjects.Text; private resetText!: Phaser.GameObjects.Text; private deathAt: number | undefined;
  constructor() { super('gate-1'); }
  preload(): void {
    this.load.image('castle-background', 'assets/gate3/castle-background.png');
    this.load.image('duckoman', 'assets/gate3/duckoman.png');
    this.load.image('robot', 'assets/gate3/robot.png');
    this.load.image('cake', 'assets/gate3/cake.png');
  }
  create(): void {
    this.cameras.main.setBackgroundColor(0x07111f);
    this.physics.world.setBounds(0, 0, GATE_1_ROOM.world.width, GATE_1_ROOM.world.height);
    this.add.image(TUNING.simulation.width / 2, TUNING.simulation.height / 2, 'castle-background')
      .setDisplaySize(711, TUNING.simulation.height).setScrollFactor(0).setDepth(-20);
    this.add.rectangle(TUNING.simulation.width / 2, TUNING.simulation.height / 2, TUNING.simulation.width, TUNING.simulation.height, 0x06101c, 0.18)
      .setScrollFactor(0).setDepth(-19);
    const terrain = this.physics.add.staticGroup();
    for (const platform of GATE_1_ROOM.platforms) {
      this.createPlatformVisual(platform.x, platform.y, platform.width, platform.height);
      const rectangle = this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0);
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
    this.add.rectangle(10, 9, 426, 76, 0x050b13, 0.78).setOrigin(0).setStrokeStyle(1, 0xc9872d, 0.8).setScrollFactor(0).setDepth(19);
    this.healthText = this.add.text(22, 16, '', { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#ffe9b0', stroke: '#130b05', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateHealthHud();
    this.add.text(22, 42, 'A/D move  ·  R sprint  ·  Space/L jump/throw  ·  K dash  ·  S crouch/slam', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#c9d6e4' }).setScrollFactor(0).setDepth(20);
    this.abilityText = this.add.text(22, 61, '', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#69d8ff' }).setScrollFactor(0).setDepth(20);
    this.updateAbilityHud();
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
    this.updateAbilityHud();
  }
  private updateHealthHud(): void { this.healthText.setText(`Health: ${this.player.health.toFixed(1)} / ${TUNING.player.maxHealth}`); }
  private updateAbilityHud(): void {
    this.abilityText.setText(`Stamina: ${this.player.stamina.toFixed(2)} / ${TUNING.player.maxStamina}${this.player.sprinting ? ' · SPRINT' : ''}${this.player.boostReady ? ' · BOOST READY' : ''}`);
  }
  private createPlatformVisual(x: number, y: number, width: number, height: number): void {
    this.add.rectangle(x, y, width, height, 0x101827, 0.98).setStrokeStyle(2, 0x03070c, 1).setDepth(1);
    this.add.rectangle(x, y - height / 2 + 2, width, 4, 0xf0a23a, 0.9).setDepth(2);
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(1, 0x334257, 0.8);
    for (let seam = x - width / 2 + 32; seam < x + width / 2; seam += 32) graphics.lineBetween(seam, y - height / 2 + 5, seam - 5, y + height / 2 - 2);
  }
}
