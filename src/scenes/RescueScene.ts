import Phaser from 'phaser';
import {Player} from '../entities/Player';
import {BasicEnemy} from '../entities/BasicEnemy';
import {ThrowableObject} from '../entities/ThrowableObject';
import {HollowWarden} from '../entities/HollowWarden';
import {InputController} from '../systems/InputController';
import {InteractionSystem} from '../systems/InteractionSystem';
import {ChapterHud} from '../systems/ChapterHud';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {setupRenderScale} from '../systems/renderScale';
import {registerCommonFrames,preloadCommon} from './CommonAssets';
import {loadProgress,saveProgress,updateChapter,canPersistCampaign,releaseRescue,clearRescue,completeRescue,replayRescue} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible,debugModeOn,debugToggle,resetCampaignRunEligibility} from '../systems/debug/debugSettings';
import {authorizeFranklinUltimate,consumeFranklinUltimate,createRescueWaveController,rescueEntryCharge,rescueEntryCheckpoint,rescueEntryRecord,rescueRetryRecord,rescueStage,tickRescueWaves,type RescueStage,type RescueWaveController,type RescueSpawn,type UltimateReleaseAuthorization} from '../systems/RescueRules';
import {enemyPatrolBounds} from '../systems/enemyPatrolBounds';
import type {Ledge} from '../data/chapters';

interface RescueStart {devPreview?:boolean;bossPreview?:boolean;retry?:boolean;checkpoint?:number;opened?:number[];bossDefeated?:boolean;ultimateCharge?:number;infiniteHealth?:boolean;}
interface EnemyRuntime {enemy:BasicEnemy;colliders:Phaser.Physics.Arcade.Collider[];}

export class RescueScene extends Phaser.Scene {
 private player!:Player;private controls!:InputController;private hud!:ChapterHud;private cake!:ThrowableObject;
 private enemies:EnemyRuntime[]=[];private platforms:Ledge[]=[];private terrain!:Phaser.Physics.Arcade.StaticGroup;
 private franklin!:Phaser.GameObjects.Image;private chains!:Phaser.GameObjects.Graphics;private seal!:Phaser.GameObjects.Rectangle;private exitGate!:Phaser.GameObjects.Rectangle;
 private objective!:Phaser.GameObjects.Text;private status!:Phaser.GameObjects.Text;private story!:Phaser.GameObjects.Text;private storyUntil=0;private compass!:Phaser.GameObjects.Text;
 private pendingGraphics:Phaser.GameObjects.Graphics[]=[];private waves:RescueWaveController=createRescueWaveController();private stage:RescueStage='chained';private authorization:UltimateReleaseAuthorization={armed:false,consumed:false};private persistedCharge=0;
 private warden?:HollowWarden;private cameraReturnAt=0;private devPreview=false;private leaving=false;private dying=false;private ending=false;private footstepMs=0;private cakeWasGrounded=false;private cakeLandingSent=false;private pagehide=()=>this.saveCampaign();private menuKey=()=>this.openMenu();private readonly ultimateStrike=(source:Player)=>{if(source!==this.player||!source.usingUltimate)return;const used=consumeFranklinUltimate(this.authorization,{stage:this.stage,playerX:source.body.center.x,playerY:source.body.center.y,franklinX:540});this.authorization=used.authorization;if(used.released)this.releaseFranklin();};
 constructor(){super('rescue');}
 preload():void {
  preloadCommon(this);
  for(const [key,path] of [['cistern','assets/chapters/cistern.png'],['road-platform','assets/chapters/road-platform.png'],['franklin-asleep','assets/chapter5/franklin-asleep.png'],['hollow-warden','assets/chapter5/hollow-warden.png']] as const)if(!this.textures.exists(key))this.load.image(key,`${import.meta.env.BASE_URL}${path}`);
  const text=this.add.text(320,200,'Below the throne…',{fontFamily:'Georgia',fontSize:'16px',color:'#d8c59c'}).setOrigin(.5).setScrollFactor(0);
  this.load.once('complete',()=>text.destroy());
 }
 create(data:RescueStart={}):void {
  registerCommonFrames(this);this.addFrame('franklin-asleep','visible',95,168,1588,570);this.addFrame('hollow-warden','visible',250,43,563,1443);
  this.devPreview=!!data.devPreview||!!this.registry.get('devPreview');this.leaving=false;this.dying=false;this.ending=false;this.footstepMs=0;this.cameraReturnAt=0;this.authorization={armed:false,consumed:false};this.waves=createRescueWaveController();this.enemies=[];this.pendingGraphics=[];this.warden=undefined;this.cakeWasGrounded=false;this.cakeLandingSent=false;
  if(!this.devPreview&&!loadProgress().unlocked.includes('rescue')){this.scene.start('menu');return;}
  const saved=loadProgress();let record=rescueEntryRecord({devPreview:this.devPreview,retry:data.retry,bossPreview:data.bossPreview,checkpoint:data.checkpoint,charge:data.ultimateCharge,opened:data.opened,bossDefeated:data.bossDefeated,saved:saved.chapters.rescue});
  let currentStage=rescueStage(record);
  const startCheckpoint=record.checkpoint;
  const entryCharge=rescueEntryCharge(currentStage,startCheckpoint,record.charge);this.persistedCharge=record.charge;
  if(!this.devPreview&&currentStage==='chained'&&startCheckpoint===0){record={...record,checkpoint:rescueEntryCheckpoint(currentStage),charge:0};this.persistChapter(record);}
  else if(!this.devPreview&&currentStage==='chained'&&record.checkpoint!==180){record={...record,checkpoint:180,charge:entryCharge};this.persistChapter(record);}
  this.stage=currentStage;this.physics.world.resume();this.physics.world.setBounds(0,-120,2000,680);this.cameras.main.setBounds(0,-100,2000,560).setBackgroundColor(0x07141b);
  const bg=this.textures.get('cistern'),source=bg.getSourceImage() as HTMLImageElement,h=2000*source.height/source.width,floorRatio=.79;this.add.image(0,360-h*floorRatio,'cistern').setOrigin(0).setDisplaySize(2000,h).setDepth(-20);
  this.add.rectangle(1000,430,2000,140,0x071015,.72).setDepth(-19);
  this.terrain=this.physics.add.staticGroup();const floor=this.add.rectangle(1000,380,2000,40,0x111a20,0);this.physics.add.existing(floor,true);this.terrain.add(floor);
  this.platforms=[{x:1000,y:380,width:2000,height:40},{x:260,y:276,width:180,height:32},{x:960,y:276,width:200,height:32},{x:1450,y:266,width:200,height:32}];
  const road=this.textures.get('road-platform');if(!road.has('walk'))road.add('walk',0,16,190,2135,400);
  for(const p of this.platforms.slice(1)){const body=this.add.rectangle(p.x,p.y,p.width,p.height,0x102027,0);this.physics.add.existing(body,true);this.terrain.add(body);this.add.image(p.x,p.y-p.height/2,'road-platform','walk').setOrigin(.5,0).setDisplaySize(p.width,Math.max(45,p.width*.2)).setDepth(2);}
  const spawn=this.stage==='chained'?180:540;
  this.player=new Player(this,spawn,330);this.player.infiniteHealth=!!data.infiniteHealth;this.player.health=3;this.player.ultimateCharge=entryCharge;this.physics.add.collider(this.player.sprite,this.terrain);
  this.cake=new ThrowableObject(this,spawn+70,325);this.physics.add.collider(this.cake.sprite,this.terrain);
  this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  this.events.on('ultimate-strike',this.ultimateStrike);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off('ultimate-strike',this.ultimateStrike));
  this.franklin=this.add.image(540,360,'franklin-asleep','visible').setOrigin(.5,1).setDisplaySize(150,150*570/1588).setDepth(8);
  this.chains=this.add.graphics().setDepth(9);if(this.stage==='chained')this.drawChains();
  this.seal=this.add.rectangle(1180,180,46,360,0x263846,.88).setStrokeStyle(3,0x8a9b9e,.9);this.seal.setDepth(12);this.physics.add.existing(this.seal,true);if(this.stage==='chained')this.physics.add.collider(this.player.sprite,this.seal);else{this.seal.setVisible(false);(this.seal.body as Phaser.Physics.Arcade.StaticBody).enable=false;}
  this.physics.add.collider(this.cake.sprite,this.seal);
  this.exitGate=this.add.rectangle(1960,180,52,360,0x233a40,.94).setStrokeStyle(3,0x8eb3a6,.9);this.physics.add.existing(this.exitGate,true);this.physics.add.collider(this.player.sprite,this.exitGate);this.physics.add.collider(this.cake.sprite,this.exitGate);
  this.objective=this.add.text(320,91,'',{fontFamily:'Georgia',fontSize:'10px',color:'#e4d1a8',stroke:'#071019',strokeThickness:3,align:'center',wordWrap:{width:500}}).setOrigin(.5).setScrollFactor(0).setDepth(62);
  this.status=this.add.text(402,65,'',{fontFamily:'Georgia',fontSize:'9px',color:'#8ee0d8',stroke:'#071019',strokeThickness:2}).setScrollFactor(0).setDepth(62);
  this.story=this.add.text(320,116,'',{fontFamily:'Georgia',fontSize:'13px',color:'#ecd494',stroke:'#071019',strokeThickness:4,align:'center',wordWrap:{width:510}}).setOrigin(.5,0).setScrollFactor(0).setDepth(63);
  this.compass=this.add.text(620,76,'→ EAST EXIT',{fontFamily:'Georgia',fontSize:'9px',color:'#b9c5c1',stroke:'#071019',strokeThickness:3}).setOrigin(1,0).setScrollFactor(0).setDepth(62);
  this.add.text(13,382,'A/D move · SPACE/L jump · K dash · S tuck/slam · J throw · U ultimate · ESC menu',{fontSize:'8px',color:'#bec9cc',stroke:'#061019',strokeThickness:3}).setScrollFactor(0).setDepth(61);
  this.add.text(540,330,'Z',{fontFamily:'Georgia',fontSize:'13px',color:'#e0e6db'}).setOrigin(.5).setDepth(11).setName('franklin-breath-z');
  const hudCamera=setupRenderScale(this,'rescue-hud');new SceneLayerRouter(this,hudCamera);
  this.add.text(625,10,'MENU',{fontFamily:'Georgia',fontSize:'9px',color:'#ffedc4',backgroundColor:'#352716',padding:{x:7,y:4}}).setOrigin(1,0).setScrollFactor(0).setDepth(64).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openMenu());
  this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(700);
  this.input.keyboard?.on('keydown-ESC',this.menuKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown-ESC',this.menuKey));
  window.addEventListener('pagehide',this.pagehide);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>window.removeEventListener('pagehide',this.pagehide));
  if(this.hasPracticeAssist())markCampaignRunIneligible();
  if(this.stage==='chained')this.player.ultimateCharge=entryCharge;
  if(this.stage==='released')this.spawnWarden();else if(this.stage==='cleared'){this.removeChainsAndSeal();this.openEasternExit();}
  this.updateStageText();this.saveCampaign();
 }
 private addFrame(key:string,name:string,x:number,y:number,w:number,h:number):void {const texture=this.textures.get(key);if(texture&&!texture.has(name))texture.add(name,0,x,y,w,h);}
 private drawChains():void {this.chains.clear().lineStyle(5,0x9ba7a5,.95);for(const x of [492,588]){this.chains.lineBetween(540,337,x,355).lineBetween(x,355,x,360);this.chains.fillStyle(0x778183).fillCircle(x,359,8);this.chains.fillStyle(0xc6d0cd).fillCircle(x,359,3);}}
 private canPersist():boolean{return canPersistCampaign({devPreview:this.devPreview,infiniteHealth:this.player?.infiniteHealth,runEligible:campaignRunEligible()});}
 private persistChapter(record:{checkpoint:number;charge:number;opened:number[];bossDefeated:boolean}):void {if(this.devPreview||!this.canPersist())return;const p=loadProgress();saveProgress(updateChapter(p,'rescue',{checkpoint:record.checkpoint,charge:record.charge,opened:record.opened,secrets:[],discoveries:[],bossDefeated:record.bossDefeated}));this.persistedCharge=record.charge;}
 private saveCampaign():void {if(this.devPreview||this.leaving||!this.player||!this.canPersist())return;const p=loadProgress(),record={checkpoint:this.stage==='chained'?180:540,charge:this.stage==='chained'?this.player.ultimateCharge:0,opened:this.stage==='chained'?[]:[0],bossDefeated:this.stage==='cleared'};saveProgress(updateChapter(p,'rescue',{...record,secrets:[],discoveries:[]}));this.persistedCharge=record.charge;}
 private updateStageText():void {if(this.stage==='chained'){const near=Math.abs(this.player.body.center.x-540)<=160&&Math.abs(this.player.body.center.y-360)<=90,arrow=540<this.player.body.center.x?'←':'→';this.objective.setText(this.player.ultimateCharge>=100?(near?'FRANKLIN NEARBY · U to break the chains':`FRANKLIN ${arrow} · Full U: return to him`):`FRANKLIN ${arrow} · Defeat sentries to charge U`);this.status.setText(`CHARGE  ${Math.floor(this.player.ultimateCharge)} / 100`);}else if(this.stage==='released'){this.objective.setText('FRANKLIN: RELEASED · Hollow Warden at the eastern gate.');this.status.setText('FRANKLIN: RELEASED');}else{this.objective.setText('FRANKLIN: SAFE · Reach the eastern exit.');this.status.setText('FRANKLIN: SAVED');}}
 private spawnWarden():void {if(this.warden||this.stage!=='released')return;this.warden=new HollowWarden(this,this.player,()=>this.onWardenDefeated(),790,2000);this.warden.hear(this.player.body.center.x);this.cameraReturnAt=this.time.now+2000;this.cameras.main.stopFollow();this.tweens.add({targets:this.cameras.main,scrollX:360,scrollY:0,duration:700,ease:'Sine.InOut'});}
 private onWardenDefeated():void {if(this.stage==='cleared')return;this.stage='cleared';if(!this.devPreview&&this.canPersist())saveProgress(clearRescue(loadProgress()));this.removeChainsAndSeal();this.openEasternExit();this.say('The Hollow Warden falls. The eastern passage is open.');this.updateStageText();}
 private removeChainsAndSeal():void {if(this.chains.visible){const shards=this.add.graphics().setDepth(10);shards.lineStyle(3,0xbac5c2,.95);for(const x of [492,588]){shards.lineBetween(540,337,x,355).lineBetween(x,355,x,360);shards.fillStyle(0xc6d0cd).fillCircle(x,359,6);}this.tweens.add({targets:shards,y:-22,alpha:0,duration:520,ease:'Cubic.Out',onComplete:()=>shards.destroy()});}this.chains.clear();this.seal.setVisible(false);if(this.seal.body)(this.seal.body as Phaser.Physics.Arcade.StaticBody).enable=false;}
 private openEasternExit():void {this.exitGate.setVisible(false);(this.exitGate.body as Phaser.Physics.Arcade.StaticBody).enable=false;const glow=this.add.graphics().setDepth(6);glow.lineStyle(3,0x7bf1da,.9).strokeRoundedRect(1918,150,84,210,22);this.tweens.add({targets:glow,alpha:.25,duration:800,yoyo:true,repeat:-1});}
 private releaseFranklin():void {if(this.stage!=='chained')return;this.stage='released';if(!this.devPreview&&this.canPersist())saveProgress(releaseRescue(loadProgress()));this.persistedCharge=0;this.player.ultimateCharge=0;this.player.health=3;this.removeChainsAndSeal();this.clearSentries();this.waves=createRescueWaveController();this.spawnWarden();this.say('The seal breaks. Franklin is still asleep. The Hollow Warden stirs.');this.updateStageText();}
 private clearSentries():void {for(const runtime of this.enemies){runtime.colliders.forEach(c=>c.destroy());runtime.enemy.defeat();}this.enemies=[];this.pendingGraphics.forEach(g=>g.destroy());this.pendingGraphics=[];this.waves=createRescueWaveController();}
 private say(message:string):void {this.story.setText(message).setAlpha(1);this.storyUntil=this.time.now+3600;}
 private spawnEnemy(spec:RescueSpawn):void {
  const placement={x:spec.x,y:spec.feetY-25,type:spec.kind==='pointed'?'pointed':spec.kind==='jumper'?'jumper':'guard',patrol:spec.patrolHalfWidth} as const;
  const bounds=enemyPatrolBounds(placement,this.platforms,48)??{left:Math.max(30,spec.x-spec.patrolHalfWidth),right:Math.min(1970,spec.x+spec.patrolHalfWidth)};
  let runtime:EnemyRuntime|undefined;const removeColliders=()=>runtime?.colliders.forEach(c=>c.destroy());
  const enemy=new BasicEnemy(this,spec.x,spec.feetY-25,bounds,spec.kind==='pointed',spec.kind==='jumper',undefined,removeColliders);
  const interactions=new InteractionSystem(this.player,enemy,this.cake),colliders:Phaser.Physics.Arcade.Collider[]=[];
  colliders.push(this.physics.add.collider(enemy.sprite,this.terrain));
  colliders.push(this.physics.add.collider(enemy.sprite,this.seal));
  colliders.push(this.physics.add.overlap(this.player.sprite,enemy.sprite,()=>interactions.resolvePlayerEnemy()));
  colliders.push(this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>interactions.resolveThrownEnemy()));
  runtime={enemy,colliders};this.enemies.push(runtime);
 }
 private pruneEnemies():void {for(let i=this.enemies.length-1;i>=0;i--){const runtime=this.enemies[i];if(!runtime.enemy.defeated)continue;runtime.colliders.forEach(c=>c.destroy());this.enemies.splice(i,1);}}
 private syncPendingGraphics():void {while(this.pendingGraphics.length<this.waves.pending.length)this.pendingGraphics.push(this.add.graphics().setDepth(6));while(this.pendingGraphics.length>this.waves.pending.length)this.pendingGraphics.pop()!.destroy();this.waves.pending.forEach((pending,i)=>{const g=this.pendingGraphics[i].clear();g.lineStyle(2,0x90e7df,.7).strokeCircle(pending.x,pending.feetY-3,21);g.fillStyle(0x4a7c7a,.13).fillCircle(pending.x,pending.feetY-25,25);});}
 private updateWaves(delta:number):void {
  this.pruneEnemies();const result=tickRescueWaves(this.waves,{deltaMs:delta,stage:this.stage,charge:this.player.ultimateCharge,playerX:this.player.body.center.x,liveEnemies:this.enemies.length});this.waves=result.controller;
  if(result.waveCompleted){this.player.health=Math.min(3,this.player.health+.5);this.hud.update();}
  for(const spec of result.activated)this.spawnEnemy(spec);
  this.syncPendingGraphics();
 }
 private emitNoise(x=this.player.body.center.x):void {this.warden?.hear(x);}
 private interactEnemies():void {for(const runtime of this.enemies){const e=runtime.enemy;if(e.defeated)continue;e.update();e.checkDash(this.player);}}
 private completeExit():void {if(this.ending||this.stage!=='cleared')return;this.ending=true;this.leaving=true;this.player.body.setVelocity(0,0);if(!this.devPreview&&this.canPersist())saveProgress(completeRescue(loadProgress()));this.physics.world.pause();this.add.rectangle(320,200,404,146,0x101722,.97).setStrokeStyle(2,0xc6a368).setScrollFactor(0).setDepth(75);this.add.text(320,160,'FRANKLIN IS SAFE',{fontFamily:'Georgia',fontSize:'18px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(76);this.add.text(320,188,'Still asleep, rescued from the prison below the throne.',{fontSize:'10px',color:'#e0d8c4'}).setOrigin(.5).setScrollFactor(0).setDepth(76);const button=(x:number,label:string,action:()=>void)=>this.add.text(x,229,label,{fontSize:'10px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:9,y:6}}).setOrigin(.5).setScrollFactor(0).setDepth(76).setInteractive({useHandCursor:true}).on('pointerdown',action);button(225,'MENU',()=>this.scene.start('menu'));button(415,'REPLAY',()=>this.replay());}
 private replay():void {this.physics.world.resume();let preview=this.devPreview;if(!preview){if(!this.hasPracticeAssist())resetCampaignRunEligibility();if(this.canPersist())saveProgress(replayRescue(loadProgress()));else preview=true;}this.scene.restart({devPreview:preview,retry:false,bossPreview:false,freshReplay:true,checkpoint:0,ultimateCharge:0,opened:[],bossDefeated:false});}
 private openMenu():void {if(this.ending){this.scene.start('menu');return;}this.saveCampaign();this.scene.pause();this.scene.launch('menu',{pausedScene:'rescue'});}
 update(_time:number,delta:number):void {
  if(!this.player||this.leaving||this.ending)return;const input=this.controls.read();if(input.godModePressed){markCampaignRunIneligible();this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}if(this.hasPracticeAssist())markCampaignRunIneligible();
  if(!this.player.active){if(!this.dying){this.dying=true;this.cake.drop();this.saveCampaign();this.physics.world.pause();const retry=rescueRetryRecord(this.stage,this.player.ultimateCharge);this.time.delayedCall(550,()=>this.scene.restart({devPreview:this.devPreview,retry:true,bossPreview:false,...retry,ultimateCharge:retry.charge,infiniteHealth:this.player.infiniteHealth}));}return;}
  this.hud.update();const priorDash=this.player.isDashing,priorSlam=this.player.abilities.slamming,priorVy=this.player.body.velocity.y;this.player.update(input,delta);
  if(input.jumpPressed&&priorVy>=0&&this.player.body.velocity.y<0)this.emitNoise();if(!priorDash&&this.player.isDashing)this.emitNoise();if(!priorSlam&&this.player.abilities.slamming)this.emitNoise();
  const acceptedU=input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100;
  if(acceptedU){if(this.stage==='chained')this.authorization=authorizeFranklinUltimate(this.authorization,true,this.player.ultimateCharge);this.emitNoise();this.hud.useUltimate();}
  if(input.throwPressed&&this.player.canAct&&this.cake.state==='CARRIED'){this.cake.throw(this.player);if(this.cake.isThrown){this.emitNoise();this.cakeWasGrounded=true;}this.cakeLandingSent=false;}
  if(this.cake.state==='CARRIED')this.cake.follow(this.player);this.cake.update(delta);
  const groundedMoving=this.player.grounded&&Math.abs(this.player.body.velocity.x)>1&&!input.down&&!this.player.isDashing;if(groundedMoving){this.footstepMs+=Math.min(50,Math.max(0,delta));if(this.footstepMs>=450){this.footstepMs=0;this.emitNoise();}}else this.footstepMs=0;
  if(this.cake.isThrown){if(this.cake.body.blocked.down&&!this.cakeWasGrounded&&!this.cakeLandingSent){this.emitNoise(this.cake.sprite.x);this.cakeLandingSent=true;}this.cakeWasGrounded=this.cake.body.blocked.down;}else{this.cakeWasGrounded=false;this.cakeLandingSent=false;}
  if(this.stage==='chained')this.updateWaves(delta);else this.pruneEnemies();
  this.interactEnemies();
  if(this.stage==='chained'&&this.player.ultimateCharge!==this.persistedCharge)this.saveCampaign();
  if(this.warden){this.warden.update(delta);this.warden.checkDash(this.player);if(this.cameraReturnAt&&this.time.now>=this.cameraReturnAt){this.cameraReturnAt=0;this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130);}this.compass.setText(`${this.warden.directionTargetX<this.player.body.center.x?'←':'→'} ${this.warden.phase.toUpperCase().replaceAll('-',' ')}`);}
  if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
  const franklinZ=this.children.getByName('franklin-breath-z') as Phaser.GameObjects.Text|undefined;franklinZ?.setAlpha(.35+.35*(1+Math.sin(this.time.now*.004))/2);
  this.updateStageText();if(this.player.sprite.x>=1960)this.completeExit();
 }
 private hasPracticeAssist():boolean{return !!this.player?.infiniteHealth||debugModeOn()&&(['invincible','infiniteUltimate','infiniteJumps','infiniteDashes'] as const).some(toggle=>debugToggle(toggle));}
}
