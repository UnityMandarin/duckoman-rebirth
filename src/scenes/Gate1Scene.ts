import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import { GATE_1_ROOM } from '../data/gate1Room';
import { BasicEnemy } from '../entities/BasicEnemy';
import { Player } from '../entities/Player';
import { ThrowableObject } from '../entities/ThrowableObject';
import { InputController } from '../systems/InputController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { ChapterHud,registerChapterHudFrames } from '../systems/ChapterHud';
import { FallingPillar } from '../entities/FallingPillar';
import { CASTLE, CASTLE_PLATFORMS, CASTLE_ENEMIES, CASTLE_SECRET, SECRET_RETURN_X, reachedSecretPortal, secretHoleSolids, secretSeal, secretShaftWalls } from '../data/castle';
import { rustwingDefeated } from '../systems/relics';
import { preloadRelicArt } from '../systems/RelicArt';
import { CastleMechanisms } from '../systems/CastleMechanisms';
import { CastleBoss } from '../entities/CastleBoss';
import { installLocalQA, replayInput } from '../systems/localQA';
import { ChapterDepth } from '../systems/ChapterDepth';
import { CASTLE_CHECKPOINT, checkpointSpawnY, isCheckpointContact } from '../systems/checkpointPolicy';
import { installHitboxDebug } from '../systems/DebugHitboxes';
import { setupRenderScale } from '../systems/renderScale';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,canPersistCampaign} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible} from '../systems/debug/debugSettings';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';
import {addWorldEnvironment} from '../systems/WorldEnvironment';

export class Gate1Scene extends Phaser.Scene {
  private player!: Player; private enemy!: BasicEnemy; private throwable!: ThrowableObject;
  private inputController!: InputController; private interactions!: InteractionSystem;
  private resetText!: Phaser.GameObjects.Text; private deathAt: number | undefined;
  constructor() { super('gate-1'); }
  private hud!: ChapterHud;
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  private extraEnemies: BasicEnemy[] = [];
  private pillar!: FallingPillar;
  private mechanisms!: CastleMechanisms;
  private boss!: CastleBoss;
  private allPlatforms = [...GATE_1_ROOM.platforms,...CASTLE_PLATFORMS];
  private hudCamera!:Phaser.Cameras.Scene2D.Camera;
  private depthPresentation!:ChapterDepth;
  private castleCheckpoint!:Phaser.GameObjects.Image;
  private castleCheckpointVisual!:CheckpointVisual;
  private checkpointX?:number;
  private enteredSecret=false;
  private devPreview=false; private opened:number[]=[]; private secrets:number[]=[];private bossDefeated=false;
  preload(): void {preloadSceneAssets(this,'gate-1');preloadRelicArt(this);}
  create(data: {checkpoint?:number;infiniteHealth?:boolean;ultimateCharge?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;devPreview?:boolean;fromSecret?:boolean} = {}): void {
    this.deathAt=undefined;
    registerCommonFrames(this);registerChapterHudFrames(this);registerSharedPropFrames(this);this.devPreview=!!this.registry.get('devPreview')||!!data.devPreview;
    this.checkpointX=data.checkpoint;this.opened=[...(data.opened??[])];this.secrets=[...(data.secrets??[])];this.bossDefeated=!!(data.bossDefeated??loadProgress().chapters['gate-1'].bossDefeated);
    this.physics.world.resume();
    const sealed=rustwingDefeated(this.registry);
    this.enteredSecret=sealed;
    const masonry=this.textures.get('masonry');
    if(!masonry.has('column'))masonry.add('column',0,40,132,1960,180);
    this.cameras.main.setBackgroundColor(0x07111f);
    this.physics.world.setBounds(0, CASTLE.top, CASTLE.width, CASTLE_SECRET.hole.portalY-CASTLE.top);
    addWorldEnvironment(this,'castle');
    const hole=CASTLE_SECRET.hole;
    this.add.rectangle(hole.left+hole.width/2,(360+hole.portalY)/2,hole.width,hole.portalY-360,0x040910,.96).setDepth(-18);
    const terrain = this.physics.add.staticGroup();
    for (const platform of this.allPlatforms) {
      this.createPlatformVisual(platform.x, platform.y, platform.width, platform.height);
    }
    for (const solid of [...secretHoleSolids(this.allPlatforms), ...secretShaftWalls()]) {
      const rectangle = this.add.rectangle(solid.x, solid.y, solid.width, solid.height, 0x000000, 0);
      this.physics.add.existing(rectangle, true); terrain.add(rectangle);
    }
    if(sealed){
      const seal=secretSeal();
      const rectangle=this.add.rectangle(seal.x,seal.y,seal.width,seal.height,0x000000,0);
      this.physics.add.existing(rectangle,true); terrain.add(rectangle);
    }
    this.castleCheckpoint=this.add.image(CASTLE_CHECKPOINT.x,CASTLE_CHECKPOINT.surfaceTop,'rest-lantern').setOrigin(.5,1).setDisplaySize(30,54).setDepth(4);
    this.castleCheckpointVisual=addCheckpointVisual(this,this.castleCheckpoint,{coreYRatio:.44,initiallyActive:data.checkpoint===CASTLE_CHECKPOINT.x});
    const spawnY=data.fromSecret?checkpointSpawnY(secretSeal().y-secretSeal().height/2,TUNING.player.bodyHeight):data.checkpoint===CASTLE_CHECKPOINT.x?checkpointSpawnY(CASTLE_CHECKPOINT.surfaceTop,TUNING.player.bodyHeight):GATE_1_ROOM.playerSpawn.y;
    this.player = new Player(this, data.fromSecret?SECRET_RETURN_X:data.checkpoint===CASTLE_CHECKPOINT.x?CASTLE_CHECKPOINT.x:GATE_1_ROOM.playerSpawn.x, spawnY);
    this.player.infiniteHealth=!!data.infiniteHealth; this.player.ultimateCharge=data.ultimateCharge??0;
    this.depthPresentation=new ChapterDepth(this,'castle',CASTLE.width,false); this.depthPresentation.setPlayer(this.player);
    this.enemy = new BasicEnemy(this, GATE_1_ROOM.enemySpawn.x, GATE_1_ROOM.enemySpawn.y);
    this.throwable = new ThrowableObject(this, data.checkpoint===CASTLE_CHECKPOINT.x?5745:GATE_1_ROOM.throwableSpawn.x, data.checkpoint===CASTLE_CHECKPOINT.x?160:GATE_1_ROOM.throwableSpawn.y);
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
    this.mechanisms=new CastleMechanisms(this,this.player,this.throwable,terrain,(id)=>{if(!this.opened.includes(id))this.opened.push(id);this.saveCampaign();},(id)=>{if(!this.secrets.includes(id))this.secrets.push(id);this.saveCampaign();},this.opened,this.secrets);
    this.boss=new CastleBoss(this,this.player,this.throwable,terrain,text=>this.mechanisms.say(text),()=>{this.bossDefeated=true;this.saveCampaign();},this.bossDefeated);
    this.cameras.main.setBounds(0, CASTLE.top, CASTLE.width, CASTLE.bottom-CASTLE.top);
    this.cameras.main.roundPixels=true;
    this.cameras.main.startFollow(this.player.sprite,false,.18,.12);
    this.cameras.main.setDeadzone(96,150);
    if(data.fromSecret)this.cameras.main.setScroll(this.player.sprite.x-TUNING.simulation.width/2,this.player.sprite.y-TUNING.simulation.height/2);
    this.hud = new ChapterHud(this, this.player);
    this.resetText = this.add.text(TUNING.simulation.width / 2, TUNING.simulation.height / 2, '', { fontFamily: 'system-ui', fontSize: '20px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setScrollFactor(0);
    this.resetText.setDepth(30);
    this.events.emit('play-ready');
    installLocalQA(this,this.player,()=>this.boss.probeVictory());
    installHitboxDebug(this);
    this.game.canvas.tabIndex=0;
    this.game.canvas.focus();
    this.hudCamera=setupRenderScale(this,'hud');
    new SceneLayerRouter(this,this.hudCamera);
    if(data.fromSecret){this.cameras.main.fadeIn(600,255,230,180);this.hudCamera.fadeIn(600,255,230,180);}
    addMenuControl(this,()=>this.openMenu());
    const escape=(event:KeyboardEvent)=>{if(event.repeat)return;this.openMenu();};this.input.keyboard?.on('keydown-ESC',escape);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown-ESC',escape));
    const pagehide=()=>this.saveCampaign();window.addEventListener('pagehide',pagehide);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>window.removeEventListener('pagehide',pagehide));
    this.saveCampaign();
    window.dispatchEvent(new Event('duckoman-ready'));
  }
  update(_time: number, delta: number): void {
    if(this.boss.transitioning)return;
    const input = (this.player.active?replayInput(this.time.now):undefined) ?? this.inputController.read();
    if(input.godModePressed&&this.player.active){
      markCampaignRunIneligible();
      this.player.infiniteHealth=!this.player.infiniteHealth;
      if(this.player.infiniteHealth)this.player.health=TUNING.player.maxHealth;
    }
    this.hud.update();
    if (this.player.lifeState === 'DEAD') {
      // Finish the falling pillar instead of freezing it midair after a lethal hit.
      this.pillar.update();
      this.physics.world.pause();
      this.interactions.dropOnDeath(); this.deathAt ??= this.time.now;
      this.resetText.setText('Duckoman down\nPress a movement key or jump to reset');
      if (this.time.now - this.deathAt >= TUNING.player.deathResetDelay && input.anyResetInput)
        this.scene.restart({checkpoint:this.checkpointX,infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge,opened:this.opened,secrets:this.secrets,bossDefeated:this.bossDefeated});
      return;
    }
    this.player.update(input, delta);
    if(!this.enteredSecret&&this.player.active&&reachedSecretPortal(this.player.body.center.x,this.player.body.bottom)){
      this.enteredSecret=true;
      this.saveCampaign();
      this.scene.start(CASTLE_SECRET.scene,{
        infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge,checkpoint:this.checkpointX,
        opened:this.opened,secrets:this.secrets,bossDefeated:this.bossDefeated,devPreview:this.devPreview,
        vx:this.player.body.velocity.x,vy:this.player.body.velocity.y
      });
      return;
    }
    if(this.checkpointX===undefined&&this.player.grounded&&isCheckpointContact(this.player.sprite.x,this.player.body.bottom,CASTLE_CHECKPOINT.x,CASTLE_CHECKPOINT.surfaceTop)){
      this.checkpointX=CASTLE_CHECKPOINT.x; this.castleCheckpointVisual.activate(); this.mechanisms.say('Checkpoint · The royal hall holds.');
      this.saveCampaign();
    }
    this.depthPresentation.update();
    if(input.ultimatePressed&&this.player.canAct&&this.player.ultimateCharge>=100&&!this.player.usingUltimate)this.hud.useUltimate();
    if (this.player.canAct && input.throwPressed && this.throwable.state === 'CARRIED') this.throwable.throw(this.player);
    this.throwable.follow(this.player); this.throwable.update(delta); this.enemy.update();
    this.extraEnemies.forEach(enemy=>{const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<1000;enemy.setAwake(awake);if(awake)enemy.update();});
    this.pillar.update();
    this.mechanisms.update();
    this.boss.update(!!input.throwPressed);
    this.hud.update();
  }
  private saveCampaign():void {if(this.boss?.transitioning||!canPersistCampaign({devPreview:this.devPreview,infiniteHealth:this.player?.infiniteHealth,runEligible:campaignRunEligible()}))return;let p=loadProgress();p=updateChapter(p,'gate-1',{checkpoint:this.checkpointX??0,charge:Math.max(0,Math.min(100,this.player?.ultimateCharge??0)),opened:this.opened,secrets:this.secrets,bossDefeated:this.bossDefeated});p.currentScene='gate-1';saveProgress(p);}
  private openMenu():boolean {return requestPauseMenu(this,()=>this.saveCampaign(),'gate-1');}
  private createPlatformVisual(x: number, y: number, width: number, height: number): void {
    const top=y-height/2;
    if(height>width) {
      for(let dy=0;dy<height;dy+=18)this.add.image(x,top+dy,'masonry','column').setOrigin(.5,0).setDisplaySize(width,Math.min(20,height-dy)).setDepth(2);
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
