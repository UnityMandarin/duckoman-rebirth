import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { GATE_1_ROOM } from '../data/gate1Room';
import { BasicEnemy } from '../entities/BasicEnemy';
import { Player } from '../entities/Player';
import { ThrowableObject } from '../entities/ThrowableObject';
import { InputController } from '../systems/InputController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { FallingPillar } from '../entities/FallingPillar';
import { CASTLE, CASTLE_PLATFORMS, CASTLE_ENEMIES } from '../data/castle';
import { CastleMechanisms } from '../systems/CastleMechanisms';
import { CastleBoss } from '../entities/CastleBoss';
import { installLocalQA, replayInput } from '../systems/localQA';

export class Gate1Scene extends Phaser.Scene {
  private player!: Player; private enemy!: BasicEnemy; private throwable!: ThrowableObject;
  private inputController!: InputController; private interactions!: InteractionSystem;
  private healthText!: Phaser.GameObjects.Text; private abilityText!: Phaser.GameObjects.Text; private resetText!: Phaser.GameObjects.Text; private deathAt: number | undefined;
  constructor() { super('gate-1'); }
  private hud!: Phaser.GameObjects.Graphics;
  private displayedHealth = 3;
  private healthChangedAt = -1000;
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  private extraEnemies: BasicEnemy[] = [];
  private pillar!: FallingPillar;
  private mechanisms!: CastleMechanisms;
  private boss!: CastleBoss;
  private allPlatforms = [...GATE_1_ROOM.platforms,...CASTLE_PLATFORMS];
  preload(): void {
    this.load.image('castle-background', 'assets/gate3/castle-panorama.png');
    this.load.image('castle-depth', 'assets/gate3/castle-depth.png');
    this.load.image('duckoman', 'assets/gate3/duckoman.png');
    this.load.image('robot', 'assets/gate3/robot.png');
    this.load.image('cake', 'assets/gate3/cake.png');
    this.load.image('masonry', 'assets/gate3/masonry.png');
  }
  create(): void {
    this.deathAt=undefined;
    this.textures.get('masonry').add('trimmed', 0, 28, 112, 1980, 456);
    this.cameras.main.setBackgroundColor(0x07111f);
    this.physics.world.setBounds(0, CASTLE.top, CASTLE.width, CASTLE.bottom-CASTLE.top);
    this.add.image(1600,-260,'castle-depth').setOrigin(0).setDisplaySize(5200,920).setScrollFactor(.6,.25).setDepth(-21);
    const background=this.textures.get('castle-background').getSourceImage();
    // Crop strips fade the old architecture into the continuation, never a hard image edge.
    for(let i=0;i<90;i++)this.add.image(i*20,-170,'castle-background').setOrigin(0)
      .setCrop(i*background.width/90,0,background.width/90,background.height)
      .setDisplaySize(1800,600).setX(0).setScrollFactor(.6,0).setDepth(-20)
      .setAlpha(i<80?1:(90-i)/10);
    this.add.rectangle(TUNING.simulation.width / 2, TUNING.simulation.height / 2, TUNING.simulation.width, TUNING.simulation.height, 0x06101c, 0.18)
      .setScrollFactor(0).setDepth(-19);
    const terrain = this.physics.add.staticGroup();
    for (const platform of this.allPlatforms) {
      this.createPlatformVisual(platform.x, platform.y, platform.width, platform.height);
      const rectangle = this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0);
      this.physics.add.existing(rectangle, true); terrain.add(rectangle);
    }
    this.player = new Player(this, GATE_1_ROOM.playerSpawn.x, GATE_1_ROOM.playerSpawn.y);
    this.enemy = new BasicEnemy(this, GATE_1_ROOM.enemySpawn.x, GATE_1_ROOM.enemySpawn.y);
    this.throwable = new ThrowableObject(this, GATE_1_ROOM.throwableSpawn.x, GATE_1_ROOM.throwableSpawn.y);
    this.extraEnemies=[...GATE_1_ROOM.extraEnemies.map(spawn=>new BasicEnemy(this,spawn.x,spawn.y,spawn)),...CASTLE_ENEMIES.map(spawn=>new BasicEnemy(this,spawn.x,spawn.y,spawn,spawn.pointed))];
    this.shadows = [this.player, this.enemy, this.throwable, ...this.extraEnemies].map(() => this.add.ellipse(0, 0, 52, 9, 0x000000, 0.5).setDepth(3));
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this));
    this.inputController = new InputController(this); this.interactions = new InteractionSystem(this.player, this.enemy, this.throwable);
    this.physics.add.collider(this.player.sprite, terrain); this.physics.add.collider(this.enemy.sprite, terrain); this.physics.add.collider(this.throwable.sprite, terrain);
    this.physics.add.overlap(this.player.sprite, this.enemy.sprite, () => this.interactions.resolvePlayerEnemy());
    this.physics.add.overlap(this.player.sprite, this.throwable.sprite, () => this.interactions.tryPickup());
    this.physics.add.overlap(this.throwable.sprite, this.enemy.sprite, () => this.interactions.resolveThrownEnemy());
    for(const enemy of this.extraEnemies) {
      const contact=new InteractionSystem(this.player,enemy,this.throwable);
      this.physics.add.collider(enemy.sprite,terrain);
      this.physics.add.overlap(this.player.sprite,enemy.sprite,()=>contact.resolvePlayerEnemy());
      this.physics.add.overlap(this.throwable.sprite,enemy.sprite,()=>contact.resolveThrownEnemy());
    }
    this.pillar=new FallingPillar(this,this.player);
    this.mechanisms=new CastleMechanisms(this,this.player,this.throwable,terrain);
    this.boss=new CastleBoss(this,this.player,this.throwable,terrain,text=>this.mechanisms.say(text));
    this.cameras.main.setBounds(0, CASTLE.top, CASTLE.width, CASTLE.bottom-CASTLE.top);
    this.cameras.main.startFollow(this.player.sprite, true, 1, .1, 0, TUNING.simulation.height / 2 - this.player.sprite.y);
    this.cameras.main.setDeadzone(0, TUNING.simulation.height);
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(19);
    this.add.image(43, 40, 'duckoman').setDisplaySize(40, 38).setScrollFactor(0).setDepth(20);
    this.healthText = this.add.text(82, 10, '', { fontFamily: 'Arial', fontSize: '14px', color: '#fff2d4', stroke: '#130b05', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateHealthHud();
    this.add.text(16, 80, 'A/D move · R sprint · Space/L jump/throw · K dash · S tuck · S again slam', { fontFamily: 'Arial', fontSize: '11px', color: '#c9d6e4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.abilityText = this.add.text(82, 58, '', { fontFamily: 'Arial', fontSize: '11px', color: '#e1edf4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateAbilityHud();
    this.resetText = this.add.text(TUNING.simulation.width / 2, TUNING.simulation.height / 2, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
    this.resetText.setDepth(30);
    this.add.text(1860,345,'S · S: slam\nJump on landing for boost',{fontFamily:'Arial',fontSize:'10px',color:'#efd7a1',stroke:'#07101b',strokeThickness:3}).setOrigin(0.5,1).setDepth(8);
    this.events.emit('play-ready');
    installLocalQA(this,this.player,()=>this.boss.probeVictory());
    if(document.documentElement.dataset.entered!=='true') this.scene.pause();
    window.dispatchEvent(new Event('duckoman-ready'));
  }
  update(_time: number, delta: number): void {
    const input = (this.player.active?replayInput(this.time.now):undefined) ?? this.inputController.read();
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
    this.extraEnemies.forEach(enemy=>{const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<1000;enemy.setAwake(awake);if(awake)enemy.update();});
    this.pillar.update();
    this.mechanisms.update();
    this.boss.update();
    // Preserve the original horizontal feel; vertical following begins only above its old view.
    this.cameras.main.setFollowOffset(0,this.player.sprite.y>170 ? 200-this.player.sprite.y : 0);
    this.cameras.main.setDeadzone(0,this.player.sprite.y>170?400:150);
    this.updateAbilityHud();
  }
  private updateHealthHud(): void {
    if (this.displayedHealth !== this.player.health) { this.displayedHealth = this.player.health; this.healthChangedAt = this.time.now; }
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
    // Sword tip, shaded crossguard, leather grip and brass pommel.
    g.fillStyle(0x684018).fillTriangle(77,32,67,42,77,53);
    g.fillStyle(0xffd27b).fillTriangle(77,33,69,42,77,41);
    g.fillStyle(0x754918).fillRoundedRect(328,27,7,31,3);
    g.fillStyle(0xeaba5d).fillRoundedRect(329,27,3,30,1);
    g.fillStyle(0x38211b).fillRoundedRect(335,38,20,9,2);
    for(let x=337;x<355;x+=4) { g.lineStyle(1,0xc18539).lineBetween(x,38,x-2,47); }
    g.fillStyle(0x9c6221).fillCircle(358,42,7);
    g.lineStyle(1,0xffd881).strokeCircle(358,42,5);
    g.fillStyle(0xffe5a0).fillCircle(357,40,2);
    if(w>8) {
      const shine=89+(this.time.now*0.045)%Math.max(1,w-8);
      g.fillStyle(0xffffff,0.18+Math.sin(this.time.now*0.003)*0.08).fillTriangle(shine,37,Math.min(shine+7,85+w),37,shine-3,48);
    }
    for(let i=0;i<3;i++) {
      const pulse=Math.max(0,1-(this.time.now-this.healthChangedAt)/420);
      const x=221+i*32, y=17-Math.sin(pulse*Math.PI)*2;
      const amount=Phaser.Math.Clamp(this.player.health-i,0,1);
      g.fillStyle(0x190c17).fillCircle(x-4,y-2,6).fillCircle(x+4,y-2,6).fillTriangle(x-10,y-1,x+10,y-1,x,y+11);
      // Each lobe and half-triangle is independent so 0.5 health is a true half heart.
      for(let side=0;side<2;side++) {
        const lit=amount>side*0.5;
        const dir=side===0?-1:1;
        g.fillStyle(lit?0xa90824:0x39232d).fillCircle(x+dir*4,y-2,5).fillTriangle(x,y-1,x+dir*9,y-1,x,y+9);
        if(lit) {
          g.fillStyle(0xf82c42).fillCircle(x+dir*4,y-3,4).fillTriangle(x,y-2,x+dir*7,y-2,x,y+6);
          g.fillStyle(0xff8c92).fillEllipse(x+dir*4-1,y-5,4,2);
          g.fillStyle(0xffded8,0.8).fillCircle(x+dir*4-2,y-5,0.9);
        }
      }
      const fill=Phaser.Math.Clamp(this.player.stamina-i,0,1);
      g.fillStyle(0x072838).fillRoundedRect(220+i*34,58,29,13,5);
      if(fill>0) {
        const sx=220+i*34, sw=29*fill;
        g.fillStyle(0x075a9b).fillRoundedRect(sx,58,sw,13,5);
        g.fillStyle(0x12c8ee).fillRoundedRect(sx+1,59,Math.max(0,sw-2),9,4);
        g.fillStyle(0xa5f5ff).fillRoundedRect(sx+2,59,Math.max(0,sw-4),3,2);
        g.fillStyle(0x03517c).fillTriangle(sx+2,68,sx+sw-2,68,sx+sw/2,71);
        g.fillStyle(0xffffff,0.55).fillTriangle(sx+3,60,sx+Math.min(9,sw),60,sx+3,65);
      }
    }
  }
  private updateAbilityHud(): void {
    this.abilityText.setText(`Stamina: ${this.player.stamina.toFixed(2)} / ${TUNING.player.maxStamina}${this.player.sprinting ? ' · SPRINT' : ''}${this.player.boostReady ? ' · BOOST READY' : ''}`);
  }
  private createPlatformVisual(x: number, y: number, width: number, height: number): void {
    const top=y-height/2;
    if(height>width) {
      for(let dy=0;dy<height;dy+=30)this.add.image(x,top+dy,'masonry','trimmed').setOrigin(.5,0).setDisplaySize(width,Math.min(30,height-dy)).setDepth(2);
    } else if(width>600) {
      for(let left=x-width/2;left<x+width/2;left+=160) this.add.image(left,top,'masonry','trimmed').setOrigin(0).setDisplaySize(160,56).setDepth(2);
    } else this.add.image(x,top,'masonry','trimmed').setOrigin(0.5,0).setDisplaySize(width,Math.max(height, width/4)).setDepth(2);
  }
  private updateShadows(): void {
    [this.player, this.enemy, this.throwable, ...this.extraEnemies].forEach((actor,i) => {
      if(actor instanceof BasicEnemy && (actor.defeated || !actor.body.enable)) { this.shadows[i].setVisible(false); return; }
      const bottom=actor.body.bottom;
      const surfaces = this.pillar?.surface ? [...this.allPlatforms,this.pillar.surface] : this.allPlatforms;
      const surface=surfaces.filter(p=>actor.sprite.x>=p.x-p.width/2 && actor.sprite.x<=p.x+p.width/2 && p.y-p.height/2>=bottom-8).sort((a,b)=>a.y-a.height/2-(b.y-b.height/2))[0];
      if(!surface) { this.shadows[i].setVisible(false); return; }
      const top=surface.y-surface.height/2, distance=Math.max(0,top-bottom);
      this.shadows[i].setVisible(true).setPosition(actor.sprite.x,top+2).setScale(Math.max(0.35,1-distance/220),1).setAlpha(Math.max(0.08,0.48-distance/400));
    });
  }
}
