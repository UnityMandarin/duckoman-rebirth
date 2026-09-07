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
  private hud!: Phaser.GameObjects.Graphics;
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  preload(): void {
    this.load.image('castle-background', 'assets/gate3/castle-background.png');
    this.load.image('duckoman', 'assets/gate3/duckoman.png');
    this.load.image('robot', 'assets/gate3/robot.png');
    this.load.image('cake', 'assets/gate3/cake.png');
    this.load.image('masonry', 'assets/gate3/masonry.png');
  }
  create(): void {
    this.textures.get('masonry').add('trimmed', 0, 28, 112, 1980, 456);
    this.cameras.main.setBackgroundColor(0x07111f);
    this.physics.world.setBounds(0, 0, GATE_1_ROOM.world.width, GATE_1_ROOM.world.height);
    this.add.image(0, 0, 'castle-background').setOrigin(0)
      .setDisplaySize(1050, 591).setY(-155).setScrollFactor(0.6, 0).setDepth(-20);
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
    this.shadows = [this.player, this.enemy, this.throwable].map(() => this.add.ellipse(0, 0, 52, 9, 0x000000, 0.5).setDepth(3));
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this));
    this.inputController = new InputController(this); this.interactions = new InteractionSystem(this.player, this.enemy, this.throwable);
    this.physics.add.collider(this.player.sprite, terrain); this.physics.add.collider(this.enemy.sprite, terrain); this.physics.add.collider(this.throwable.sprite, terrain);
    this.physics.add.overlap(this.player.sprite, this.enemy.sprite, () => this.interactions.resolvePlayerEnemy());
    this.physics.add.overlap(this.player.sprite, this.throwable.sprite, () => this.interactions.tryPickup());
    this.physics.add.overlap(this.throwable.sprite, this.enemy.sprite, () => this.interactions.resolveThrownEnemy());
    this.cameras.main.setBounds(0, 0, GATE_1_ROOM.world.width, GATE_1_ROOM.world.height);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 1, 0, TUNING.simulation.height / 2 - this.player.sprite.y);
    this.cameras.main.setDeadzone(0, TUNING.simulation.height);
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(19);
    this.add.image(43, 40, 'duckoman').setDisplaySize(40, 38).setScrollFactor(0).setDepth(20);
    this.healthText = this.add.text(82, 10, '', { fontFamily: 'Arial', fontSize: '14px', color: '#fff2d4', stroke: '#130b05', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateHealthHud();
    this.add.text(16, 80, 'A/D move · R sprint · Space/L jump/throw · K dash · S crouch/slam', { fontFamily: 'Arial', fontSize: '11px', color: '#c9d6e4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.abilityText = this.add.text(82, 58, '', { fontFamily: 'Arial', fontSize: '11px', color: '#e1edf4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
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
  private updateHealthHud(): void {
    this.healthText.setText(`Health: ${this.player.health.toFixed(1)} / ${TUNING.player.maxHealth}`);
    const g = this.hud.clear();
    g.fillStyle(0x03070d, 0.7).fillRoundedRect(7, 4, 360, 72, 18);
    g.fillStyle(0x090c10).fillCircle(43, 40, 31);
    g.lineStyle(4, 0x70441a).strokeCircle(43, 40, 32);
    g.lineStyle(1, 0xf9ce71).strokeCircle(43, 40, 29).strokeCircle(43, 40, 35);
    for (let i=0;i<8;i++) { const a=i*Math.PI/4; g.fillStyle(0xe5aa42).fillCircle(43+Math.cos(a)*32,40+Math.sin(a)*32,2); }
    g.fillStyle(0x090b10).fillRoundedRect(81, 32, 250, 21, 9);
    g.lineStyle(2, 0xb17c29).strokeRoundedRect(81, 32, 250, 21, 9);
    const w=242*this.player.health/TUNING.player.maxHealth;
    if(w>0) { g.fillStyle(0xe96416).fillRoundedRect(85,36,w,13,5); g.fillStyle(0xffcb52).fillRoundedRect(85,36,w,6,3); g.fillStyle(0xfff2b0).fillRect(89,36,Math.max(0,w-8),2); }
    for(let i=0;i<3;i++) {
      const x=221+i*32, y=17;
      g.fillStyle(this.player.health>i ? 0xf42327 : 0x47242c);
      g.fillCircle(x-4,y-2,5).fillCircle(x+4,y-2,5).fillTriangle(x-9,y-1,x+9,y-1,x,y+10);
      const fill=Phaser.Math.Clamp(this.player.stamina-i,0,1);
      g.fillStyle(0x072838).fillRoundedRect(220+i*34,58,29,13,5);
      if(fill>0) { g.fillStyle(0x08bde9).fillRoundedRect(220+i*34,58,29*fill,13,5); g.fillStyle(0x78e8ff).fillRoundedRect(223+i*34,59,23*fill,4,2); }
    }
  }
  private updateAbilityHud(): void {
    this.abilityText.setText(`Stamina: ${this.player.stamina.toFixed(2)} / ${TUNING.player.maxStamina}${this.player.sprinting ? ' · SPRINT' : ''}${this.player.boostReady ? ' · BOOST READY' : ''}`);
  }
  private createPlatformVisual(x: number, y: number, width: number, height: number): void {
    const top=y-height/2;
    if(width>600) {
      for(let left=x-width/2;left<x+width/2;left+=160) this.add.image(left,top,'masonry','trimmed').setOrigin(0).setDisplaySize(160,56).setDepth(2);
    } else this.add.image(x,top,'masonry','trimmed').setOrigin(0.5,0).setDisplaySize(width,Math.max(height, width/4)).setDepth(2);
  }
  private updateShadows(): void {
    [this.player, this.enemy, this.throwable].forEach((actor,i) => {
      if(i===1 && this.enemy.defeated) { this.shadows[i].setVisible(false); return; }
      const bottom=actor.sprite.y+actor.body.halfHeight;
      const surface=GATE_1_ROOM.platforms.filter(p=>actor.sprite.x>=p.x-p.width/2 && actor.sprite.x<=p.x+p.width/2 && p.y-p.height/2>=bottom-8).sort((a,b)=>a.y-a.height/2-(b.y-b.height/2))[0];
      if(!surface) { this.shadows[i].setVisible(false); return; }
      const top=surface.y-surface.height/2, distance=Math.max(0,top-bottom);
      this.shadows[i].setVisible(true).setPosition(actor.sprite.x,top+2).setScale(Math.max(0.35,1-distance/220),1).setAlpha(Math.max(0.08,0.48-distance/400));
    });
  }
}
