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
import { renderScale,setupRenderScale } from '../systems/renderScale';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,canPersistCampaign} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible} from '../systems/debug/debugSettings';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';
import {addWorldEnvironment} from '../systems/WorldEnvironment';
import {TraversalCameraRig} from '../systems/traversalCameraRig';
import {CameraQaTelemetry,visibleCameraQaSurfaceIds} from '../systems/cameraQaTelemetry';
import {qaFixtureEnabled} from '../systems/qaCameraFixture';
import type {DescentPredictionInput,PredictHazard,PredictSurface} from '../systems/descentPrediction';
import type {DescentCameraFrame} from '../systems/predictiveDescentCamera';

declare global {interface Window {__duckomanCameraQA?:{select:(room:number,step:number)=>void;options:(room:number)=>{step:number;id:string;top:number;left:number;right:number}[];command:(action:string)=>void;setIgnoreDamage:(ignore:boolean)=>void;status:()=>Record<string,unknown>;trace:()=>string;launches:()=>string;};}}

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
  private traversalRig?:TraversalCameraRig;private traversalSurfaces:PredictSurface[]=[];private traversalNearby:PredictSurface[]=[];private traversalHazards:PredictHazard[]=[];
  private readonly traversalInput:DescentPredictionInput={x:0,y:0,vx:0,vy:0,halfWidth:23,halfHeight:20,grounded:false,horizontal:0,sprint:false,jumpAvailable:false,dashing:false,dashRemainingMs:0,gravity:TUNING.player.gravity,maxFall:TUNING.player.maxFallVelocity,runSpeed:TUNING.player.maxRunSpeed,sprintSpeed:TUNING.player.sprintSpeed,surfaces:this.traversalNearby,hazards:this.traversalHazards};
  private readonly traversalFrame:DescentCameraFrame={actorTop:0,actorBottom:0,targetBottom:null};
  private devPreview=false; private opened:number[]=[]; private secrets:number[]=[];private bossDefeated=false;
  private qaMode=false;private qaSupport=0;private qaDriveMs=0;private qaDriveHorizontal:-1|0|1=0;private qaSprint=false;private qaJumpNext=false;private qaDashNext=false;private qaUltimateNext=false;private qaFreezeMs=0;private qaTrace:Record<string,unknown>[]=[];private qaLaunches:Record<string,unknown>[]=[];private qaWasGrounded=false;private qaReady=false;private qaFirstFitTime=0;private readonly qaTelemetry=new CameraQaTelemetry();
  preload(): void {preloadSceneAssets(this,'gate-1');preloadRelicArt(this);}
  create(data: {checkpoint?:number;infiniteHealth?:boolean;ultimateCharge?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;devPreview?:boolean;fromSecret?:boolean;qa?:boolean;qaSupport?:number;qaDamage?:boolean} = {}): void {
    this.deathAt=undefined;this.devPreview=!!this.registry.get('devPreview')||!!data.devPreview;this.qaMode=qaFixtureEnabled(!!data.qa,this.devPreview,import.meta.env.DEV,window.location.hostname);this.qaSupport=Math.max(0,data.qaSupport??0);this.qaDriveMs=0;this.qaDriveHorizontal=0;this.qaSprint=false;this.qaJumpNext=false;this.qaDashNext=false;this.qaUltimateNext=false;this.qaFreezeMs=0;this.qaTrace=[];this.qaLaunches=[];this.qaTelemetry.reset(false);this.qaWasGrounded=false;this.qaReady=false;this.qaFirstFitTime=0;
    registerCommonFrames(this);registerChapterHudFrames(this);registerSharedPropFrames(this);
    this.checkpointX=data.checkpoint;this.opened=[...(data.opened??[])];this.secrets=[...(data.secrets??[])];this.bossDefeated=!!(data.bossDefeated??loadProgress().chapters['gate-1'].bossDefeated);
    this.physics.world.resume();
    const sealed=rustwingDefeated(this.registry);
    this.enteredSecret=sealed;
    this.traversalRig=undefined;this.traversalSurfaces.length=0;this.traversalNearby.length=0;this.traversalHazards.length=0;
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
      const top=solid.y-solid.height/2;this.traversalSurfaces.push({id:`castle-solid-${this.traversalSurfaces.length}`,room:Math.floor(solid.x/2560),left:solid.x-solid.width/2,right:solid.x+solid.width/2,top,bottom:top+solid.height,enabled:true,landing:solid.width>solid.height});
    }
    if(sealed){
      const seal=secretSeal();
      const rectangle=this.add.rectangle(seal.x,seal.y,seal.width,seal.height,0x000000,0);
      this.physics.add.existing(rectangle,true); terrain.add(rectangle);
      const top=seal.y-seal.height/2;this.traversalSurfaces.push({id:'castle-secret-seal',room:Math.floor(seal.x/2560),left:seal.x-seal.width/2,right:seal.x+seal.width/2,top,bottom:top+seal.height,enabled:true});
    }
    this.castleCheckpoint=this.add.image(CASTLE_CHECKPOINT.x,CASTLE_CHECKPOINT.surfaceTop,'rest-lantern').setOrigin(.5,1).setDisplaySize(30,54).setDepth(4);
    this.castleCheckpointVisual=addCheckpointVisual(this,this.castleCheckpoint,{coreYRatio:.44,initiallyActive:data.checkpoint===CASTLE_CHECKPOINT.x});
    const qaPlatform=this.qaMode?this.allPlatforms[this.qaSupport%this.allPlatforms.length]:undefined,spawnY=qaPlatform?checkpointSpawnY(qaPlatform.y-qaPlatform.height/2,TUNING.player.bodyHeight):data.fromSecret?checkpointSpawnY(secretSeal().y-secretSeal().height/2,TUNING.player.bodyHeight):data.checkpoint===CASTLE_CHECKPOINT.x?checkpointSpawnY(CASTLE_CHECKPOINT.surfaceTop,TUNING.player.bodyHeight):GATE_1_ROOM.playerSpawn.y;
    this.player = new Player(this,qaPlatform?.x??(data.fromSecret?SECRET_RETURN_X:data.checkpoint===CASTLE_CHECKPOINT.x?CASTLE_CHECKPOINT.x:GATE_1_ROOM.playerSpawn.x), spawnY);
    this.player.infiniteHealth=this.qaMode?data.qaDamage!==true:!!data.infiniteHealth; this.player.ultimateCharge=data.ultimateCharge??0;
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
    new SceneLayerRouter(this,this.hudCamera);this.traversalRig=new TraversalCameraRig(this,this.cameras.main,'gate-1');this.events.on(Phaser.Scenes.Events.PAUSE,()=>this.traversalRig?.suspend());this.events.on(Phaser.Scenes.Events.RESUME,()=>this.traversalRig?.resume());this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.traversalRig?.destroy());if(this.qaMode)this.installGateCameraQA();
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
    if(this.qaMode){if(this.qaDriveMs>0){input.horizontal=this.qaDriveHorizontal;input.sprintHeld=this.qaSprint;this.qaDriveMs=Math.max(0,this.qaDriveMs-delta);if(this.qaDriveMs===0){this.qaDriveHorizontal=0;this.qaSprint=false;}}if(this.qaJumpNext){input.jumpPressed=true;this.qaJumpNext=false;}if(this.qaDashNext){input.dashPressed=true;this.qaDashNext=false;}if(this.qaUltimateNext){input.ultimatePressed=true;this.qaUltimateNext=false;}}
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
      this.traversalRig?.suspend();
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
    this.updateTraversalCamera(input,delta);
    this.boss.update(!!input.throwPressed);
    if(this.qaFreezeMs>0){this.qaFreezeMs=Math.max(0,this.qaFreezeMs-delta);if(this.qaFreezeMs===0)this.scene.pause();}
    this.hud.update();
  }
  private saveCampaign():void {if(this.boss?.transitioning||!canPersistCampaign({devPreview:this.devPreview,infiniteHealth:this.player?.infiniteHealth,runEligible:campaignRunEligible()}))return;let p=loadProgress();p=updateChapter(p,'gate-1',{checkpoint:this.checkpointX??0,charge:Math.max(0,Math.min(100,this.player?.ultimateCharge??0)),opened:this.opened,secrets:this.secrets,bossDefeated:this.bossDefeated});p.currentScene='gate-1';saveProgress(p);}
  private installGateCameraQA():void {
    const local=import.meta.env.DEV&&this.qaMode;if(!local)return;
    const choose=(index:number)=>this.scene.restart({devPreview:true,qa:true,qaSupport:index,qaDamage:!this.player.infiniteHealth});
    const drive=(action:string)=>{if(action==='clearTrace'){this.qaTrace.length=0;this.qaLaunches.length=0;this.qaFirstFitTime=0;this.qaTelemetry.reset(this.player.grounded);return;}if(action==='retry'){choose(this.qaSupport);return;}if(action==='walkLeft'||action==='walkRight'||action==='sprintLeft'||action==='sprintRight'){this.qaDriveMs=300;this.qaDriveHorizontal=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='walkLeftLong'||action==='walkRightLong'||action==='sprintLeftLong'||action==='sprintRightLong'){this.qaDriveMs=1200;this.qaDriveHorizontal=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='takeoff'){this.qaJumpNext=true;return;}if(action==='dash'){this.qaDashNext=true;return;}if(action==='ultimate'){this.player.ultimateCharge=100;this.qaUltimateNext=true;return;}if(action==='pause'){this.scene.pause();return;}if(action==='resume'){this.scene.resume();this.traversalRig?.resume();return;}if(action==='freeze200'||action==='freeze300'){this.qaFreezeMs=Number(action.slice(6));return;}};
    const options=(room:number)=>room===0?this.allPlatforms.map((p,index)=>({step:index,id:`castle:${index}`,top:p.y-p.height/2,left:p.x-p.width/2,right:p.x+p.width/2})):[];
    const status=()=>{const view=this.cameras.main.worldView,actorTop=this.player.visual.y-this.player.visual.displayHeight/2,actorBottom=this.player.visual.y+this.player.visual.displayHeight/2,screenY=(y:number)=>(y-view.y)/view.height*TUNING.simulation.height,screenX=(x:number)=>(x-view.x)/view.width*TUNING.simulation.width,controller=this.traversalRig?.camera,targetId=this.traversalRig?.camera.targetId,target=this.traversalSurfaces.find(s=>s.id===targetId),support=this.traversalSurfaces.find(s=>s.enabled&&this.player.body.right>s.left&&this.player.body.left<s.right&&Math.abs(this.player.body.bottom-s.top)<5),targetTop=target?.top,targetBottom=target?.bottom,actorScreen={top:screenY(actorTop),bottom:screenY(actorBottom)},targetScreen={top:targetTop===undefined?null:screenY(targetTop),bottom:targetBottom===undefined?null:screenY(targetBottom)},hazardVisible=!controller?.risk||controller.riskLeft===undefined||Math.min(TUNING.simulation.width,screenX(controller.riskRight??controller.riskLeft))>Math.max(0,screenX(controller.riskLeft))&&screenY(controller.riskBottom??target?.bottom??Infinity)<=370,fitted=!!target&&target.id!==support?.id&&actorScreen.top>=120&&actorScreen.bottom<=370&&targetScreen.bottom!==null&&targetScreen.bottom<=370&&hazardVisible,normalAlreadyVisible=!target&&actorScreen.top>=120&&actorScreen.bottom<=370&&this.traversalSurfaces.some(s=>s.top>this.player.body.bottom+32&&screenY(s.top)>=120&&screenY(s.top)<=370);const visibleSurfaceIds=visibleCameraQaSurfaceIds({x:view.x,y:view.y,width:view.width,height:view.height,logicalWidth:TUNING.simulation.width,logicalHeight:TUNING.simulation.height},actorScreen,this.traversalSurfaces,this.traversalHazards);return {x:this.player.body.center.x,y:this.player.body.center.y,vx:this.player.body.velocity.x,vy:this.player.body.velocity.y,grounded:this.player.grounded,state:controller?.state,targetId,risk:controller?.risk,riskKind:controller?.riskKind,riskBounds:controller?.risk?{left:controller.riskLeft,right:controller.riskRight,top:controller.riskTop,bottom:controller.riskBottom}:null,zoomRatio:this.cameras.main.zoomY/renderScale(),offsetY:this.cameras.main.followOffset.y,worldView:{x:view.x,y:view.y,width:view.width,height:view.height},actorScreen,visibleSurfaceIds,targetScreen,projectedFit:fitted,normalAlreadyVisible,owner:this.boss.ownsCamera?'boss':'traversal',ready:this.qaReady,damageIgnored:this.player.infiniteHealth};};
    const postRender=()=>{const current=status(),grounded=this.player.grounded,now=this.time.now,platform=this.allPlatforms[this.qaSupport%this.allPlatforms.length],sourceTop=platform.y-platform.height/2,sourceContact=!!platform&&grounded&&Math.abs(this.player.body.bottom-sourceTop)<5&&this.player.body.right>platform.x-platform.width/2&&this.player.body.left<platform.x+platform.width/2;if(!this.qaReady){if(!sourceContact||this.cameras.main.worldView.width<=0)return;this.qaReady=true;}const support=this.traversalSurfaces.find(s=>s.enabled&&this.player.body.right>s.left&&this.player.body.left<s.right&&Math.abs(this.player.body.bottom-s.top)<5),visibleIds=Array.isArray(current.visibleSurfaceIds)?current.visibleSurfaceIds as string[]:[],launch=this.qaTelemetry.sample(now,grounded,support?.id??null,typeof current.targetId==='string'?current.targetId:null,visibleIds);if(launch)this.qaLaunches.push({...launch});this.qaWasGrounded=grounded;this.qaTrace.push({t:now,...current,visibleSurfaceIds:visibleIds,worldView:current.worldView,actorScreen:current.actorScreen,riskBounds:current.riskBounds,actualFit:current.projectedFit,normalAlreadyVisible:current.normalAlreadyVisible});};
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.cameras.main.off(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender);if(window.__duckomanCameraQA===api)delete window.__duckomanCameraQA;});
    const setIgnoreDamage=(ignore:boolean)=>{this.player.infiniteHealth=ignore;};const api={select:(_room:number,index:number)=>choose(index),options,status,command:drive,setIgnoreDamage,trace:()=>JSON.stringify(this.qaTrace),launches:()=>JSON.stringify(this.qaLaunches)};window.__duckomanCameraQA=api;
  }
  private updateTraversalCamera(_input:{horizontal:-1|0|1;sprintHeld?:boolean},delta:number):void {
    const rig=this.traversalRig,player=this.player;if(!rig||!player)return;
    const body=player.body,active=this.sys.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
    if(!active){rig.suspend();return;}
    const bossOwns=this.boss.ownsCamera,approachingBoss=!bossOwns&&body.center.x>=8500;
    if(approachingBoss)rig.neutralize(delta,active,player.active&&!player.usingUltimate);
    else rig.update(body.center.x,body.bottom,delta,bossOwns?'boss':'traversal',active,player.active&&!player.usingUltimate);
  }
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
