import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import {alignSwordMeterFill,setSwordMeterCharge,SWORD_METER} from '../systems/SwordMeterArt';
import {playUltimateSwing} from '../systems/UltimateSwing';
import { GATE_1_ROOM } from '../data/gate1Room';
import { BasicEnemy } from '../entities/BasicEnemy';
import { Player } from '../entities/Player';
import { ThrowableObject } from '../entities/ThrowableObject';
import { InputController } from '../systems/InputController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { spreadEnemies } from '../systems/EnemySeparation';
import { DashMeter } from '../systems/DashMeter';
import { FallingPillar } from '../entities/FallingPillar';
import { CASTLE, CASTLE_PLATFORMS, CASTLE_ENEMIES } from '../data/castle';
import { CastleMechanisms } from '../systems/CastleMechanisms';
import { CastleBoss } from '../entities/CastleBoss';
import { installLocalQA, replayInput } from '../systems/localQA';
import { ChapterDepth } from '../systems/ChapterDepth';
import { CASTLE_BOSS_CHECKPOINT, CASTLE_CHECKPOINT, checkpointSpawnY, isCheckpointContact } from '../systems/checkpointPolicy';
import { installHitboxDebug, installPlatformLabels } from '../systems/DebugHitboxes';
import { setupRenderScale } from '../systems/renderScale';

export class Gate1Scene extends Phaser.Scene {
  private player!: Player; private enemy!: BasicEnemy; private throwable!: ThrowableObject;
  private inputController!: InputController; private interactions!: InteractionSystem;
  private healthText!: Phaser.GameObjects.Text; private abilityText!: Phaser.GameObjects.Text; private resetText!: Phaser.GameObjects.Text; private deathAt: number | undefined;
  constructor() { super('gate-1'); }
  private hud!: Phaser.GameObjects.Graphics;
  private swordFill!: Phaser.GameObjects.Image;
  private swordFrame!: Phaser.GameObjects.Image;
  private displayedHealth = 3;
  private healthChangedAt = -1000;
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  private extraEnemies: BasicEnemy[] = [];
  private pillar!: FallingPillar;
  private mechanisms!: CastleMechanisms;
  private boss!: CastleBoss;
  private allPlatforms = [...GATE_1_ROOM.platforms,...CASTLE_PLATFORMS];
  private hudCamera!:Phaser.Cameras.Scene2D.Camera;
  private dashMeter!:DashMeter;
  private depthPresentation!:ChapterDepth;
  private castleCheckpoint!:Phaser.GameObjects.Image;
  private checkpointX?:number;
  preload(): void {
    this.load.image('castle-background', 'assets/gate3/royal-hall.png');
    this.load.image('castle-depth', 'assets/gate3/royal-hall.png');
    this.load.image('ironwing-button','assets/gate3/ironwing-button.png');
    this.load.image('ironwing-bomb','assets/gate3/ironwing-bomb.png');
    this.load.image('ironwing-eye','assets/gate3/ironwing-eye.png');
    this.load.image('duckoman', 'assets/gate3/duckoman.png');
    this.load.image('robot-health','assets/tutorial/robot-health.png');
    this.load.image('dash-arrows-wind','assets/tutorial/dash-arrows-wind.png');
    this.load.image('robot', 'assets/gate3/robot.png');
    this.load.image('cake', 'assets/gate3/cake.png');
    this.load.image('masonry', 'assets/gate3/masonry.png');
    this.load.image('spike-robot','assets/gate3/spike-robot.png');
    this.load.image('jumper-robot','assets/gate3/jumper-robot.png');
    this.load.image('spike-platform','assets/gate3/spike-platform.png');
    this.load.image('lock-kit','assets/gate3/lock-kit.png');
    this.load.image('rock-pillar-kit','assets/gate3/rock-pillar-kit.png');
    this.load.image('rest-lantern','assets/chapters/rest-lantern.png');
    this.load.image('prison-atlas','assets/depth/prison-atlas.png');
    this.load.image('royal-scroll','assets/depth/royal-scroll.png');
    this.load.image('royal-archive','assets/depth/royal-archive.png');
    this.load.image('ultimate-sword-frame','assets/hud/ultimate-sword-frame.png');
    this.load.image('ultimate-sword-fill','assets/hud/ultimate-sword-fill.png');
  }
  create(data: {checkpoint?:number;infiniteHealth?:boolean;ultimateCharge?:number} = {}): void {
    this.deathAt=undefined;
    this.checkpointX=data.checkpoint;
    this.physics.world.resume();
    this.textures.get('masonry').add('trimmed', 0, 28, 112, 1980, 456);
    this.textures.get('lock-kit').add('door',0,10,10,915,990);
    this.textures.get('lock-kit').add('button',0,1015,790,510,210);
    this.textures.get('rock-pillar-kit').add('pillar',0,1100,10,435,1000);
    this.textures.get('spike-platform').add('hazard',0,16,175,1740,505);
    this.cameras.main.setBackgroundColor(0x07111f);
    this.physics.world.setBounds(0, CASTLE.top, CASTLE.width, CASTLE.bottom-CASTLE.top);
    // Backdrop floor stays at the collision floor height through vertical traversal.
    for(let i=0;i<3;i++)this.add.image(i*5000-400,-1340,'castle-depth').setOrigin(0).setDisplaySize(5100,1700)
      .setFlipX(i%2===1).setScrollFactor(.72,1).setDepth(-21);
    this.add.rectangle(CASTLE.width/2,490,CASTLE.width,260,0x08111b).setDepth(-18);
    const background=this.textures.get('castle-background').getSourceImage();
    // Crop strips fade the old architecture into the continuation, never a hard image edge.
    for(let i=0;i<90;i++)this.add.image(i*20,-170,'castle-background').setOrigin(0)
      .setCrop(i*background.width/90,0,background.width/90,background.height)
      .setDisplaySize(1800,600).setX(0).setScrollFactor(.6,0).setDepth(-20)
      .setAlpha(i<80?1:(90-i)/10);
    this.add.rectangle(TUNING.simulation.width / 2, TUNING.simulation.height / 2, TUNING.simulation.width, TUNING.simulation.height, 0x06101c, 0.18)
      .setScrollFactor(0).setDepth(-19);
    // One authored archive landmark: distant props stay behind the playable route.
    const archive=this.textures.get('royal-archive').getSourceImage();
    const archiveWidth=820, archiveHeight=archiveWidth*archive.height/archive.width;
    this.add.image(0,360-archiveHeight*.886,'royal-archive').setOrigin(0)
      .setDisplaySize(archiveWidth,archiveHeight).setScrollFactor(.65,1).setDepth(-15);
    const terrain = this.physics.add.staticGroup();
    for (const platform of this.allPlatforms) {
      this.createPlatformVisual(platform.x, platform.y, platform.width, platform.height);
      const rectangle = this.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x000000, 0);
      this.physics.add.existing(rectangle, true); terrain.add(rectangle);
    }
    this.castleCheckpoint=this.add.image(CASTLE_CHECKPOINT.x,CASTLE_CHECKPOINT.surfaceTop,'rest-lantern').setOrigin(.5,1).setDisplaySize(30,54).setDepth(4);
    if(data.checkpoint===CASTLE_CHECKPOINT.x)this.castleCheckpoint.setTint(0xffe2a3);
    const start=[CASTLE_CHECKPOINT,CASTLE_BOSS_CHECKPOINT].find(c=>c.x===data.checkpoint);
    const spawnY=start?checkpointSpawnY(start.surfaceTop,TUNING.player.bodyHeight):GATE_1_ROOM.playerSpawn.y;
    this.player = new Player(this, start?start.x:GATE_1_ROOM.playerSpawn.x, spawnY);
    this.player.infiniteHealth=!!data.infiniteHealth; this.player.ultimateCharge=data.ultimateCharge??0;
    this.depthPresentation=new ChapterDepth(this,'castle',CASTLE.width); this.depthPresentation.setPlayer(this.player);
    this.enemy = new BasicEnemy(this, GATE_1_ROOM.enemySpawn.x, GATE_1_ROOM.enemySpawn.y);
    const throwableSpawn=start===CASTLE_CHECKPOINT?{x:5745,y:160}:start===CASTLE_BOSS_CHECKPOINT?{x:8900,y:330}:GATE_1_ROOM.throwableSpawn;
    this.throwable = new ThrowableObject(this, throwableSpawn.x, throwableSpawn.y);
    this.extraEnemies=[...GATE_1_ROOM.extraEnemies.map(spawn=>new BasicEnemy(this,spawn.x,spawn.y,spawn)),...CASTLE_ENEMIES.map(spawn=>new BasicEnemy(this,spawn.x,325,spawn,spawn.pointed,spawn.jumper))];
    this.shadows = [this.player, this.enemy, this.throwable, ...this.extraEnemies].map(() => this.add.ellipse(0, 0, 52, 9, 0x000000, 0.5).setDepth(3));
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateShadows, this));
    this.inputController = new InputController(this); this.interactions = new InteractionSystem(this.player, this.enemy, this.throwable);
    this.physics.add.collider(this.player.sprite, terrain); this.physics.add.collider(this.enemy.sprite, terrain); this.physics.add.collider(this.throwable.sprite, terrain);
    this.physics.add.overlap(this.player.enemyContactTargets, this.enemy.sprite, () => this.interactions.resolvePlayerEnemy());
    this.physics.add.overlap(this.player.sprite, this.throwable.sprite, () => this.interactions.tryPickup());
    this.physics.add.overlap(this.throwable.sprite, this.enemy.sprite, () => this.interactions.resolveThrownEnemy());
    for(const enemy of this.extraEnemies) {
      const contact=new InteractionSystem(this.player,enemy,this.throwable);
      this.physics.add.collider(enemy.sprite,terrain);
      this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>contact.resolvePlayerEnemy());
      this.physics.add.overlap(this.throwable.sprite,enemy.sprite,()=>contact.resolveThrownEnemy());
    }
    this.pillar=new FallingPillar(this,this.player);
    this.mechanisms=new CastleMechanisms(this,this.player,this.throwable,terrain);
    this.boss=new CastleBoss(this,this.player,this.throwable,terrain,text=>this.mechanisms.say(text));
    this.cameras.main.setBounds(0, CASTLE.top, CASTLE.width, CASTLE.bottom-CASTLE.top);
    this.cameras.main.roundPixels=true;
    this.cameras.main.startFollow(this.player.sprite,false,.18,.12);
    this.cameras.main.setDeadzone(96,150);
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(19);
    this.swordFill=this.add.image(0,0,'ultimate-sword-fill').setScrollFactor(0).setDepth(19.5);
    alignSwordMeterFill(this.swordFill);
    this.swordFrame=this.add.image(SWORD_METER.frameX,SWORD_METER.frameY,'ultimate-sword-frame').setOrigin(0).setDisplaySize(SWORD_METER.frameWidth,SWORD_METER.frameHeight).setScrollFactor(0).setDepth(20);
    this.add.image(43, 40, 'duckoman').setDisplaySize(40, 38).setScrollFactor(0).setDepth(20);
    this.dashMeter = new DashMeter(this, 20);
    this.healthText = this.add.text(82, 10, '', { fontFamily: 'Arial', fontSize: '14px', color: '#fff2d4', stroke: '#130b05', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateHealthHud();
    this.add.text(16, 80, 'A/D move · Hold Left Shift sprint · L/Space jump · J throw · K dash · S tuck/slam', { fontFamily: 'Arial', fontSize: '10px', color: '#c9d6e4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    for(const [x,y,label] of [[180,270,'Press L to jump'],[610,290,'Cake weapon: press J to throw'],[850,280,'Jump on or dash to kill'],[3570,270,'Spike robot: dash to kill'],[4870,220,'Hold Shift → L jump → K dash']] as const)
      this.add.text(x,y,label,{fontFamily:'Arial',fontSize:'11px',color:'#ffdf60',stroke:'#171005',strokeThickness:4}).setOrigin(.5,1).setDepth(12);
    // First-half dash cues: first robot, cracked wall, spike robot, and gap's airborne dash point.
    for(const [x,y] of [[850,238],[3270,290],[3570,230],[5010,105],[5130,280]] as const) {
      this.add.image(x,y,'dash-arrows-wind').setDisplaySize(100,70).setDepth(9);
      this.add.text(x,y+36,'K · DASH',{fontFamily:'Arial',fontSize:'10px',color:'#a6f8ff',stroke:'#07111f',strokeThickness:3}).setOrigin(.5,0).setDepth(9);
    }
    this.abilityText = this.add.text(82, 58, '', { fontFamily: 'Arial', fontSize: '11px', color: '#e1edf4', stroke: '#000000', strokeThickness: 3 }).setScrollFactor(0).setDepth(20);
    this.updateAbilityHud();
    this.resetText = this.add.text(TUNING.simulation.width / 2, TUNING.simulation.height / 2, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
    this.resetText.setDepth(30);
    this.add.text(1860,345,'S · S: slam\nJump on landing for boost',{fontFamily:'Arial',fontSize:'10px',color:'#efd7a1',stroke:'#07101b',strokeThickness:3}).setOrigin(0.5,1).setDepth(8);
    this.events.emit('play-ready');
    installLocalQA(this,this.player,()=>this.boss.probeVictory());
    installHitboxDebug(this);
    installPlatformLabels(this,this.allPlatforms);
    this.game.canvas.tabIndex=0;
    this.game.canvas.focus();
    this.hudCamera=setupRenderScale(this,'hud');
    const splitLayers=()=>{
      for(const child of this.children.list){
        const item=child as Phaser.GameObjects.Image;
        item.cameraFilter=item.scrollFactorX===0?this.cameras.main.id:this.hudCamera.id;
      }
    };
    splitLayers();this.events.on(Phaser.Scenes.Events.POST_UPDATE,splitLayers);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off(Phaser.Scenes.Events.POST_UPDATE,splitLayers));
    window.dispatchEvent(new Event('duckoman-ready'));
    const previewChapter=new URLSearchParams(window.location.search).get('chapter');
    if(['localhost','127.0.0.1'].includes(window.location.hostname)&&(previewChapter==='jail'||previewChapter==='outside'||previewChapter==='crimson')){
      this.time.delayedCall(0,()=>this.scene.start(previewChapter));
    }
  }
  update(_time: number, delta: number): void {
    if(this.boss.transitioning||this.player.usingUltimate)return;
    const input = (this.player.active?replayInput(this.time.now):undefined) ?? this.inputController.read();
    if(input.godModePressed&&this.player.active){
      this.player.infiniteHealth=!this.player.infiniteHealth;
      if(this.player.infiniteHealth)this.player.health=TUNING.player.maxHealth;
    }
    this.updateHealthHud();
    if (this.player.lifeState === 'DEAD') {
      // Finish the falling pillar instead of freezing it midair after a lethal hit.
      this.pillar.update();
      this.physics.world.pause();
      this.interactions.dropOnDeath(); this.deathAt ??= this.time.now;
      this.resetText.setText('Duckoman down\nPress a movement key or jump to reset');
      if (this.time.now - this.deathAt >= TUNING.player.deathResetDelay && input.anyResetInput)
        this.scene.restart({checkpoint:this.checkpointX,infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge});
      return;
    }
    this.player.update(input, delta);
    if(this.checkpointX===undefined&&this.player.grounded&&isCheckpointContact(this.player.sprite.x,this.player.body.bottom,CASTLE_CHECKPOINT.x,CASTLE_CHECKPOINT.surfaceTop)){
      this.checkpointX=CASTLE_CHECKPOINT.x; this.castleCheckpoint.setTint(0xffe2a3); this.mechanisms.say('Checkpoint · The royal hall holds.');
    }
    this.depthPresentation.update();
    if(input.ultimatePressed&&this.player.canAct&&this.player.ultimateCharge>=100&&!this.player.usingUltimate)this.useUltimate();
    if (this.player.canAct && input.throwPressed && this.throwable.state === 'CARRIED') this.throwable.throw(this.player);
    this.throwable.follow(this.player); this.throwable.update(delta); this.enemy.update();
    this.extraEnemies.forEach(enemy=>{const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<1000;enemy.setAwake(awake);if(awake)enemy.update();});
    spreadEnemies([this.enemy,...this.extraEnemies]);
    this.pillar.update();
    this.mechanisms.update();
    this.boss.update(!!input.throwPressed);
    this.updateAbilityHud();
  }
  private updateHealthHud(): void {
    if (this.displayedHealth !== this.player.health) { this.displayedHealth = this.player.health; this.healthChangedAt = this.time.now; }
    this.healthText.setText('DUCKOMAN');
    const g = this.hud.clear();
    g.fillStyle(0x03070d, 0.7).fillRoundedRect(7, 4, 360, 72, 18);
    g.fillStyle(0x090c10).fillCircle(43, 40, 31);
    g.lineStyle(4, 0x70441a).strokeCircle(43, 40, 32);
    g.lineStyle(1, 0xf9ce71).strokeCircle(43, 40, 29).strokeCircle(43, 40, 35);
    for (let i=0;i<8;i++) { const a=i*Math.PI/4; g.fillStyle(0xe5aa42).fillCircle(43+Math.cos(a)*32,40+Math.sin(a)*32,2); }
    const charge=this.player.usingUltimate?0:this.player.ultimateCharge/100;
    setSwordMeterCharge(this.swordFill,charge);
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
    }
    this.dashMeter.draw(g,this.player.dashCharge,this.player.dashDisabled);
  }
  private updateAbilityHud(): void {
    this.abilityText.setText(this.player.ultimateCharge>=100?'U · ULTIMATE READY':'U · ULTIMATE');
  }
  private useUltimate():void {playUltimateSwing(this,this.player,{frame:this.swordFrame,fill:this.swordFill});}
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
