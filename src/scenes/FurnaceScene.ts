import { FURNACE_TYPOGRAPHY } from '../systems/FurnaceTypography';
import Phaser from 'phaser';
import {Player} from '../entities/Player';
import {BasicEnemy} from '../entities/BasicEnemy';
import {ThrowableObject} from '../entities/ThrowableObject';
import {InputController} from '../systems/InputController';
import {InteractionSystem} from '../systems/InteractionSystem';
import {ChapterHud,registerChapterHudFrames} from '../systems/ChapterHud';
import {ChapterTraps,type ChapterSurface, type TrapEncounterSource} from '../systems/ChapterTraps';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {addIdentityBlock,addIdentityFloor,addIdentityDoor,preloadChapterIdentity,registerChapterIdentity} from '../systems/ChapterVisuals';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {renderScale,setupRenderScale} from '../systems/renderScale';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,canPersistCampaign} from '../systems/progress';
import {AdventureDirector} from '../systems/AdventureDirector';
import {canOpenPauseMenu} from '../systems/adventureRules';
import {campaignRunEligible,markCampaignRunIneligible} from '../systems/debug/debugSettings';
import {FURNACE_ROOMS,FURNACE_ROOM_WIDTH,FURNACE_BOSS_CHECKPOINT,FURNACE_CHECKPOINTS,type FurnaceCircuit} from '../data/furnace';
import {FurnaceRhythm,FURNACE_FLAME_HEIGHT,furnaceHeatHazardBounds} from '../systems/FurnaceRhythm';
import {addFurnaceBackdrop,updateFurnaceBackdrop,registerFurnaceFrames,type FurnaceBackdrop} from '../systems/FurnaceArt';
import {FurnaceLava} from '../systems/FurnaceLava';
import {rectsOverlap} from '../systems/contactRules';
import {TUNING} from '../config/tuning';
import {TraversalCameraRig} from '../systems/traversalCameraRig';
import {CameraQaTelemetry,visibleCameraQaSurfaceIds} from '../systems/cameraQaTelemetry';
import {predictedSurfaceMotionOffset,type DescentPredictionInput,type PredictHazard,type PredictSurface} from '../systems/descentPrediction';
import type {DescentCameraFrame} from '../systems/predictiveDescentCamera';
import type {Encounter} from '../data/chapterChallenges';
import type {Ledge} from '../data/chapters';
declare global {interface Window {__duckomanCameraQA?:{select:(room:number,step:number)=>void;options:(room:number)=>{step:number;id:string;top:number;left:number;right:number}[];command:(action:string)=>void;setIgnoreDamage:(ignore:boolean)=>void;status:()=>Record<string,unknown>;trace:()=>string;launches:()=>string;};}}
export interface FurnaceStart {checkpoint?:number;ultimateCharge?:number;opened?:number[];bossDefeated?:boolean;infiniteHealth?:boolean;devPreview?:boolean;previewSection?:number;bossPreview?:boolean;bossBeat?:string;freshReplay?:boolean;qa?:boolean;qaStep?:number;qaDamage?:boolean;}
export function furnaceStartRecord(data:FurnaceStart,saved:{checkpoint:number;charge:number;opened:number[];bossDefeated:boolean},preview:boolean):FurnaceStart {return preview?{checkpoint:80,ultimateCharge:0,opened:[],bossDefeated:false,...data,devPreview:true}:{checkpoint:saved.checkpoint,ultimateCharge:saved.charge,opened:saved.opened,bossDefeated:saved.bossDefeated,...data};}
export function furnaceArenaEntry(data:FurnaceStart):boolean {return !data.freshReplay&&(!!data.bossPreview||!!data.bossDefeated||data.opened?.includes(0)===true||(data.checkpoint??0)>=FURNACE_BOSS_CHECKPOINT);}
export const FURNACE_ENCOUNTERS:readonly Encounter[]=Object.freeze(FURNACE_ROOMS.map(r=>Object.freeze({type:'conveyor' as const,format:'tower' as const,pacing:'test' as const,steps:Object.freeze(r.steps.map(p=>Object.freeze([p.x,p.top,p.width] as const))),spikes:Object.freeze([]),enemies:Object.freeze([]),moving:Object.freeze(r.machines.map(m=>Object.freeze({...m})))})));
export function furnaceEncounter(room:number):Encounter|undefined {return FURNACE_ENCOUNTERS[room];}
const FURNACE_FALL_LIMITS=FURNACE_ROOMS.map(r=>Math.max(r.entryTop,r.exitTop,...r.steps.map(p=>p.top))+280);
interface HeatPlate {room:number;circuit:FurnaceCircuit;shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image|Phaser.GameObjects.TileSprite;core:Phaser.GameObjects.Image;flame:Phaser.GameObjects.Image;zone:{left:number;right:number;top:number;bottom:number};}
interface Robot {enemy:BasicEnemy;core:Phaser.GameObjects.Image;plate:Phaser.GameObjects.Image;}
export class FurnaceScene extends Phaser.Scene {
 private player!:Player;private controls!:InputController;private adventure!:AdventureDirector;private hud!:ChapterHud;private cake!:ThrowableObject;private terrain!:Phaser.Physics.Arcade.StaticGroup;private traps!:ChapterTraps;
 private backdrops:FurnaceBackdrop[]=[];private rhythm=new FurnaceRhythm();private heat:HeatPlate[]=[];private robots:Robot[]=[];private rests:{x:number;top:number;visual:CheckpointVisual}[]=[];
 private lava?:FurnaceLava;
 private traversalRig?:TraversalCameraRig;private traversalNearby:PredictSurface[]=[];private traversalEntries:{surface:PredictSurface;shape:Phaser.GameObjects.Rectangle}[]=[];private traversalHazards:PredictHazard[]=[];private readonly trapsMotionScratch={axis:'x' as const,base:0,phase:0,clockMs:0};
 private traversalHazardCount=0;
 private readonly traversalInput:DescentPredictionInput={x:0,y:0,vx:0,vy:0,halfWidth:23,halfHeight:20,grounded:false,horizontal:0,sprint:false,jumpAvailable:false,dashing:false,dashRemainingMs:0,gravity:TUNING.player.gravity,maxFall:TUNING.player.maxFallVelocity,runSpeed:TUNING.player.maxRunSpeed,sprintSpeed:TUNING.player.sprintSpeed,surfaces:this.traversalNearby,hazards:this.traversalHazards};
 private readonly traversalFrame:DescentCameraFrame={actorTop:0,actorBottom:0,targetBottom:null};
 private prebossRest?:CheckpointVisual;private prebossReady=false;private state:FurnaceStart={};private dying=false;private leaving=false;private room=-1;private story!:Phaser.GameObjects.Image;private storyUntil=0;
 private qaMode=false;private qaStep=-1;private qaDriveMs=0;private qaDriveHorizontal:-1|0|1=0;private qaSprint=false;private qaJumpNext=false;private qaDashNext=false;private qaUltimateNext=false;private qaFreezeMs=0;private qaTrace:Record<string,unknown>[]=[];private qaLaunches:Record<string,unknown>[]=[];private qaWasGrounded=false;private qaReady=false;private qaFirstFitTime=0;private readonly qaTelemetry=new CameraQaTelemetry();
 constructor(){super('rescue');}
 preload():void {preloadSceneAssets(this,'furnace');preloadChapterIdentity(this,'crimson');}
 create(data:FurnaceStart={}):void {
  const progress=loadProgress(),saved=progress.chapters.rescue,preview=!!data.devPreview||!!this.registry.get('devPreview');
  if(!preview&&!progress.unlocked.includes('rescue')){this.scene.start('menu');return;}
  this.state=furnaceStartRecord(data,saved,preview);
  this.qaMode=!!data.qa&&preview&&import.meta.env.DEV&&['localhost','127.0.0.1'].includes(window.location.hostname);this.qaStep=Math.max(-1,data.qaStep??-1);this.qaDriveMs=0;this.qaDriveHorizontal=0;this.qaSprint=false;this.qaJumpNext=false;this.qaDashNext=false;this.qaUltimateNext=false;this.qaFreezeMs=0;this.qaTrace=[];this.qaLaunches=[];this.qaTelemetry.reset(false);this.qaWasGrounded=false;this.qaReady=false;this.qaFirstFitTime=0;
  if(furnaceArenaEntry(this.state)){this.scene.start('rescue-boss',this.state);return;}
  this.state.checkpoint=preview&&data.previewSection!==undefined?data.previewSection*FURNACE_ROOM_WIDTH+80:this.state.checkpoint??80;
  registerCommonFrames(this);registerSharedPropFrames(this);registerChapterHudFrames(this);registerChapterIdentity(this,'crimson');registerFurnaceFrames(this);
  this.dying=false;this.leaving=false;this.room=-1;this.rhythm=new FurnaceRhythm();this.heat=[];this.robots=[];this.rests=[];this.backdrops=[];this.lava=undefined;this.traversalRig=undefined;this.traversalNearby.length=0;this.traversalEntries=[];this.traversalHazards.length=0;this.traversalHazardCount=0;this.prebossRest=undefined;this.prebossReady=false;
  this.physics.world.resume();this.physics.world.setBounds(0,-1100,FURNACE_BOSS_CHECKPOINT+192,1800);
  this.cameras.main.setBounds(0,-700,FURNACE_BOSS_CHECKPOINT+192,1400).setBackgroundColor(0x171114);
  this.terrain=this.physics.add.staticGroup();const surfaces:ChapterSurface[]=[];
  for(let i=0;i<FURNACE_ROOMS.length;i++){
   const room=FURNACE_ROOMS[i],base=i*FURNACE_ROOM_WIDTH;this.backdrops.push(addFurnaceBackdrop(this,base,FURNACE_ROOM_WIDTH,room.entryTop));
   this.platform(base+96,room.entryTop,192,i,-1,surfaces,false);this.platform(base+1396,room.exitTop,88,i,-2,surfaces,false);
   for(let j=0;j<room.steps.length;j++){const p=room.steps[j],surface=this.platform(base+p.x,p.top,p.width,i,j,surfaces,true);if(p.circuit){
    const core=this.add.image(base+p.x,p.top+9,'furnace-utility','vent').setDisplaySize(p.width-16,14).setDepth(5).setTint(0x7a341d).setAlpha(.75);
    const flame=this.add.image(base+p.x,p.top-FURNACE_FLAME_HEIGHT/2,'furnace-utility','flame-0').setDisplaySize(p.width,FURNACE_FLAME_HEIGHT).setOrigin(.5,1).setDepth(6).setVisible(false);
    this.heat.push({room:i,circuit:p.circuit,shape:surface.shape,art:surface.art,core,flame,zone:{left:0,right:0,top:0,bottom:0}});
   }}
   if(i%2===0){const x=base+80,rest=this.add.image(x,room.entryTop-28,'identity-crimson','rest').setDisplaySize(30,54).setDepth(5);this.rests.push({x,top:room.entryTop,visual:addCheckpointVisual(this,rest,{coreYRatio:.37,haloColor:0xff7938,coreColor:0xffd388,initiallyActive:x<=(this.state.checkpoint??0)})});}
  }
  this.platform(FURNACE_BOSS_CHECKPOINT+96,360,192,11,-1,surfaces,false);
  const prebossMarker=this.add.image(FURNACE_BOSS_CHECKPOINT+80,332,'identity-crimson','rest').setDisplaySize(30,54).setDepth(5);
  this.prebossRest=addCheckpointVisual(this,prebossMarker,{coreYRatio:.37,haloColor:0xff7938,coreColor:0xffd388});
  addIdentityDoor(this,'crimson',{x:FURNACE_BOSS_CHECKPOINT+170,ground:360,width:38,height:230,opened:true});

  const previewRoom=Math.max(0,Math.min(10,data.previewSection??0)),previewSurface=this.qaMode&&data.qaStep!==undefined&&data.qaStep>=0?FURNACE_ROOMS[previewRoom].steps[data.qaStep]:undefined,spawn=this.qaMode?(previewSurface?previewRoom*FURNACE_ROOM_WIDTH+previewSurface.x:previewRoom*FURNACE_ROOM_WIDTH+96):(this.state.checkpoint||80),spawnRoom=Math.min(10,Math.floor(spawn/FURNACE_ROOM_WIDTH)),spawnTop=previewSurface?.top??FURNACE_ROOMS[spawnRoom].entryTop;
  this.player=new Player(this,spawn,spawnTop-25);this.player.infiniteHealth=this.qaMode?data.qaDamage!==true:!!data.infiniteHealth;this.player.health=3;this.player.ultimateCharge=this.state.ultimateCharge??0;
  this.physics.add.collider(this.player.sprite,this.terrain);this.cake=new ThrowableObject(this,spawn+50,spawnTop-35);this.physics.add.collider(this.cake.sprite,this.terrain);this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);this.adventure=new AdventureDirector(this,'rescue',this.player);
  const source:TrapEncounterSource={count:11,encounter:furnaceEncounter,floor:room=>FURNACE_ROOMS[room].entryTop};this.traps=new ChapterTraps(this,this.player,'crimson',surfaces,undefined,source);
  for(let i=0;i<FURNACE_ROOMS.length;i++)for(const placement of FURNACE_ROOMS[i].robots){const p=FURNACE_ROOMS[i].steps[placement.step],x=i*1440+p.x,enemy=new BasicEnemy(this,x,p.top-25,{left:x-p.width/2+TUNING.enemy.bodyWidth/2,right:x+p.width/2-TUNING.enemy.bodyWidth/2},placement.type==='pointed',placement.type==='jumper');enemy.hp=2;enemy.visual.setTint(placement.type==='pointed'?0xffb762:placement.type==='jumper'?0xcf7350:0xd6543c);this.physics.add.collider(enemy.sprite,this.terrain);const interactions=new InteractionSystem(this.player,enemy,this.cake);this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>interactions.resolvePlayerEnemy());this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>interactions.resolveThrownEnemy());const plate=this.add.image(x,p.top-22,'furnace-utility','vent').setDisplaySize(23,9).setDepth(7),core=this.add.image(x,p.top-25,'furnace-utility','gear').setDisplaySize(8,8).setDepth(8);enemy.setAwake(false);this.robots.push({enemy,core,plate});}
  this.story=this.add.image(320,105,'chapter5-typography','story-2').setDisplaySize(FURNACE_TYPOGRAPHY['story-2'].width/2,FURNACE_TYPOGRAPHY['story-2'].height/2).setScrollFactor(0).setDepth(52).setOrigin(.5,0).setVisible(false);
  const hudCamera=setupRenderScale(this,'furnace-hud');this.lava=new FurnaceLava(this,this.player);new SceneLayerRouter(this,hudCamera);this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(500);this.traversalRig=new TraversalCameraRig(this,this.cameras.main,'rescue');if(this.qaMode)this.installFurnaceCameraQA(previewRoom);
  const menu=(event?:KeyboardEvent)=>{if(!event?.repeat&&canOpenPauseMenu(this.adventure?.talking??false))requestPauseMenu(this,()=>this.saveCampaign(),'rescue');};addMenuControl(this,()=>canOpenPauseMenu(this.adventure?.talking??false)?requestPauseMenu(this,()=>this.saveCampaign(),'rescue'):true);this.input.keyboard?.on('keydown-ESC',menu);
  const gap=()=>{this.rhythm.suspend();this.lava?.suspend();},visibility=()=>{if(document.visibilityState!=='visible')gap();},save=()=>this.saveCampaign();this.events.on(Phaser.Scenes.Events.PAUSE,gap);this.events.on(Phaser.Scenes.Events.SLEEP,gap);this.game.events.on(Phaser.Core.Events.BLUR,gap);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',save);
  this.events.on(Phaser.Scenes.Events.PAUSE,()=>this.traversalRig?.suspend());this.events.on(Phaser.Scenes.Events.RESUME,()=>this.traversalRig?.resume());
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.traversalRig?.destroy();this.input.keyboard?.off('keydown-ESC',menu);this.events.off(Phaser.Scenes.Events.PAUSE,gap);this.events.off(Phaser.Scenes.Events.SLEEP,gap);this.game.events.off(Phaser.Core.Events.BLUR,gap);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',save);});
 }
 private platform(x:number,top:number,width:number,room:number,step:number,surfaces:ChapterSurface[],ledge:boolean):ChapterSurface {
  const height=ledge?48:64;const shape=this.add.rectangle(x,top+height/2,width,height,0x26212a,0);this.physics.add.existing(shape,true);this.terrain.add(shape);
  const combat=step<0||FURNACE_ROOMS[room]?.robots.some(robot=>robot.step===step)===true;
  const art=ledge?addIdentityBlock(this,'crimson',{x,top,width,height:48,frame:combat?'cap-b':'cap-a'}):addIdentityFloor(this,'crimson',{x,top,width,height:64,frame:'cap-b'}).cap;
  art.setTint(0x64534b);const geometry:Ledge={x,y:top+height/2,width,height,room,step,role:ledge?'ledge':'floor'},surface={shape,art,ledge:geometry};const adapter:PredictSurface={id:`furnace:${room}:${step}`,room,left:x-width/2,right:x+width/2,top,bottom:top+height,enabled:true};this.traversalEntries.push({surface:adapter,shape});if(ledge)surfaces.push(surface);
  return surface;
 }
 private saveCampaign():void {if(this.state.devPreview||this.leaving||!this.player||!canPersistCampaign({infiniteHealth:this.player.infiniteHealth,runEligible:campaignRunEligible()}))return;saveProgress(updateChapter(loadProgress(),'rescue',{checkpoint:FURNACE_CHECKPOINTS.includes(this.state.checkpoint??0)?this.state.checkpoint??0:0,charge:this.state.ultimateCharge??0,opened:this.state.checkpoint===FURNACE_BOSS_CHECKPOINT?[0]:[],bossDefeated:false,secrets:[],discoveries:[]}));}
 private say(message:string):void {const frame=message.startsWith('Checkpoint')?'checkpoint':'story-2';this.story.setTexture('chapter5-typography',frame).setDisplaySize(FURNACE_TYPOGRAPHY[frame].width/2,FURNACE_TYPOGRAPHY[frame].height/2).setAlpha(1).setVisible(true);this.storyUntil=this.time.now+6500;}
 private updateTraversalCamera(_input:{horizontal:-1|0|1;sprintHeld?:boolean},_room:number,delta:number):void {
  const rig=this.traversalRig,player=this.player;if(!rig||!player)return;
  const body=player.body,active=this.sys.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
  if(!active){rig.suspend();return;}
  rig.update(body.center.x,body.bottom,delta,'traversal',active,player.active&&!player.usingUltimate);
 }
 private installFurnaceCameraQA(room:number):void {
  if(!this.qaMode)return;
  const options=(at:number)=>{const r=FURNACE_ROOMS[at];if(!r)return[];const base=at*FURNACE_ROOM_WIDTH,out=[{step:-1,id:`furnace:${at}:entry`,top:r.entryTop,left:base,right:base+192},...r.steps.map((p,step)=>({step,id:`furnace:${at}:${step}`,top:p.top,left:base+p.x-p.width/2,right:base+p.x+p.width/2}))];return out;};
  const select=(nextRoom:number,step:number)=>this.scene.restart({devPreview:true,previewSection:nextRoom,qa:true,qaStep:step,qaDamage:!this.player.infiniteHealth});
  const command=(action:string)=>{if(action==='clearTrace'){this.qaTrace.length=0;this.qaLaunches.length=0;this.qaFirstFitTime=0;this.qaTelemetry.reset(this.player.grounded);return;}if(action==='retry'){select(room,this.qaStep);return;}if(action==='walkLeft'||action==='walkRight'||action==='sprintLeft'||action==='sprintRight'){this.qaDriveMs=300;this.qaDriveHorizontal=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='walkLeftLong'||action==='walkRightLong'||action==='sprintLeftLong'||action==='sprintRightLong'){this.qaDriveMs=1200;this.qaDriveHorizontal=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='takeoff'){this.qaJumpNext=true;return;}if(action==='dash'){this.qaDashNext=true;return;}if(action==='ultimate'){this.player.ultimateCharge=100;this.qaUltimateNext=true;return;}if(action==='pause'){this.scene.pause();return;}if(action==='resume'){this.scene.resume();this.traversalRig?.resume();return;}if(action==='freeze200'||action==='freeze300'){this.qaFreezeMs=Number(action.slice(6));}};
  const status=()=>{const camera=this.cameras.main,view=camera.worldView,actorTop=this.player.visual.y-this.player.visual.displayHeight/2,actorBottom=this.player.visual.y+this.player.visual.displayHeight/2,screenY=(y:number)=>(y-view.y)/view.height*TUNING.simulation.height,rig=this.traversalRig,targetId=rig?.camera.targetId,target=this.traversalEntries.find(entry=>entry.surface.id===targetId)?.surface,support=this.traversalEntries.find(entry=>entry.surface.enabled&&this.player.body.right>entry.surface.left&&this.player.body.left<entry.surface.right&&Math.abs(this.player.body.bottom-entry.surface.top)<5)?.surface,actorScreen={top:screenY(actorTop),bottom:screenY(actorBottom)},targetScreen=target?{top:screenY(target.top),bottom:screenY(target.bottom)}:null,projectedFit=!!target&&target.id!==support?.id&&actorScreen.top>=120&&actorScreen.bottom<=370&&targetScreen!==null&&targetScreen.bottom<=370,normalAlreadyVisible=!target&&actorScreen.top>=120&&actorScreen.bottom<=370&&this.traversalEntries.some(e=>e.surface.top>this.player.body.bottom+32&&screenY(e.surface.top)>=120&&screenY(e.surface.top)<=370);const visibleSurfaceIds=visibleCameraQaSurfaceIds({x:view.x,y:view.y,width:view.width,height:view.height,logicalWidth:TUNING.simulation.width,logicalHeight:TUNING.simulation.height},actorScreen,this.traversalEntries.map(entry=>entry.surface),this.traversalHazards);return {x:this.player.body.center.x,y:this.player.body.center.y,vx:this.player.body.velocity.x,vy:this.player.body.velocity.y,grounded:this.player.grounded,state:rig?.camera.state,targetId,risk:rig?.camera.risk,riskKind:rig?.camera.riskKind,riskBounds:rig?.camera.risk?{left:rig.camera.riskLeft,right:rig.camera.riskRight,top:rig.camera.riskTop,bottom:rig.camera.riskBottom}:null,zoomRatio:camera.zoomY/renderScale(),offsetY:camera.followOffset.y,worldView:{x:view.x,y:view.y,width:view.width,height:view.height},actorScreen,visibleSurfaceIds,targetScreen,projectedFit,normalAlreadyVisible,owner:'traversal',ready:this.qaReady,damageIgnored:this.player.infiniteHealth};};
  const postRender=()=>{const current=status(),now=this.time.now,grounded=this.player.grounded,source=options(room).find(o=>o.step===this.qaStep),sourceContact=!!source&&grounded&&Math.abs(this.player.body.bottom-source.top)<5&&this.player.body.right>source.left&&this.player.body.left<source.right;if(!this.qaReady){if(!sourceContact||this.cameras.main.worldView.width<=0)return;this.qaReady=true;}const support=this.traversalEntries.find(e=>e.surface.enabled&&this.player.body.right>e.surface.left&&this.player.body.left<e.surface.right&&Math.abs(this.player.body.bottom-e.surface.top)<5)?.surface,visibleIds=Array.isArray(current.visibleSurfaceIds)?current.visibleSurfaceIds as string[]:[],launch=this.qaTelemetry.sample(now,grounded,support?.id??null,typeof current.targetId==='string'?current.targetId:null,visibleIds);if(launch)this.qaLaunches.push({...launch});this.qaWasGrounded=grounded;this.qaTrace.push({t:now,...current,visibleSurfaceIds:visibleIds,worldView:current.worldView,actorScreen:current.actorScreen,riskBounds:current.riskBounds,actualFit:current.projectedFit,normalAlreadyVisible:current.normalAlreadyVisible});};
  const camera=this.cameras.main;camera.on(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender);const api={select,options,command,setIgnoreDamage:(ignore:boolean)=>{this.player.infiniteHealth=ignore;},status,trace:()=>JSON.stringify(this.qaTrace),launches:()=>JSON.stringify(this.qaLaunches)};window.__duckomanCameraQA=api;this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{camera.off(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender);if(window.__duckomanCameraQA===api)delete window.__duckomanCameraQA;});
 }
 update(_time:number,delta:number):void {
  if(!this.player||this.leaving)return;
  const index=Math.max(0,Math.min(10,Math.floor(this.player.sprite.x/1440))),localX=this.player.sprite.x-index*1440;
  const live=this.player.active&&this.sys.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
  if(!live){this.traversalRig?.suspend();this.rhythm.update(index,localX,delta,false);this.lava?.suspend();this.traps.update(delta);if(!this.player.active&&!this.dying){this.dying=true;this.cake.drop();this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth}));}return;}
  const input=this.controls.read();if(this.adventure?.update(input))return;if(this.qaMode){if(this.qaDriveMs>0){input.horizontal=this.qaDriveHorizontal;input.sprintHeld=this.qaSprint;this.qaDriveMs=Math.max(0,this.qaDriveMs-delta);if(this.qaDriveMs===0){this.qaDriveHorizontal=0;this.qaSprint=false;}}if(this.qaJumpNext){input.jumpPressed=true;this.qaJumpNext=false;}if(this.qaDashNext){input.dashPressed=true;this.qaDashNext=false;}if(this.qaUltimateNext){input.ultimatePressed=true;this.qaUltimateNext=false;}}if(input.godModePressed){markCampaignRunIneligible();this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}
  this.player.update(input,delta);if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();if(this.physics.world.isPaused){this.traversalRig?.suspend();this.rhythm.update(index,localX,delta,false);this.lava?.suspend();this.traps.update(delta);this.hud.update();return;}this.rhythm.update(index,localX,delta,true);
  if(input.throwPressed&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);this.cake.follow(this.player);this.cake.update(delta);this.traps.update(delta);const lavaContact=this.lava?.update(delta)??false;
  for(const robot of this.robots){const enemy=robot.enemy,awake=!enemy.defeated&&Math.abs(enemy.sprite.x-this.player.sprite.x)<850&&Math.abs(enemy.sprite.y-this.player.sprite.y)<650;if(!enemy.defeated)enemy.setAwake(awake);robot.core.setVisible(awake);robot.plate.setVisible(awake);if(awake){enemy.update(true,delta);enemy.checkDash(this.player);robot.plate.setPosition(enemy.body.center.x,enemy.body.center.y-3);robot.core.setPosition(enemy.body.center.x,enemy.body.center.y-3);}}
  for(const plate of this.heat){const body=plate.shape.body as Phaser.Physics.Arcade.StaticBody,phase=plate.room===index?this.rhythm.heat(plate.circuit):'safe',warning=phase==='warning',burn=phase==='burn';plate.core.setPosition(body.center.x,body.top+9).setTint(burn?0xffe0a0:warning?0xf89034:0x793821).setAlpha(warning?.5+.4*Math.sin(this.rhythm.elapsedMs*.016):burn?1:.55);plate.flame.setTexture('furnace-utility',`flame-${Math.floor(this.rhythm.elapsedMs/110)%3}`).setPosition(body.center.x,body.top).setOrigin(.5,1).setVisible(burn).setAlpha(burn?.78+.12*Math.sin(this.rhythm.elapsedMs*.022+plate.circuit):1);plate.art.setTint(burn?0xff9b54:warning?0xb77c4d:0x64534b);plate.zone.left=body.left;plate.zone.right=body.right;plate.zone.top=body.top-FURNACE_FLAME_HEIGHT;plate.zone.bottom=body.top+2;if(burn&&rectsOverlap(this.player.body,plate.zone))this.player.takeDamage(body.center.x,.5);}
  this.updateTraversalCamera(input,index,delta);
  if(this.qaFreezeMs>0){this.qaFreezeMs=Math.max(0,this.qaFreezeMs-delta);if(this.qaFreezeMs===0)this.scene.pause();}
  for(let i=0;i<this.backdrops.length;i++)updateFurnaceBackdrop(this.backdrops[i],this.rhythm.elapsedMs,Math.abs(i-index)<=1);
  if(index!==this.room){this.room=index;if(FURNACE_ROOMS[index].story)this.say(FURNACE_ROOMS[index].story!);}
  for(const rest of this.rests)if(rest.x>(this.state.checkpoint??0)&&Math.abs(this.player.sprite.x-rest.x)<35&&this.player.grounded&&Math.abs(this.player.body.bottom-rest.top)<12){this.state.checkpoint=rest.x;this.state.ultimateCharge=this.player.ultimateCharge;this.player.health=Math.min(3,this.player.health+.5);rest.visual.activate();this.saveCampaign();this.say('Checkpoint · Half a heart restored.');}
  if(lavaContact||this.player.body.bottom>FURNACE_FALL_LIMITS[index]){this.player.health=0;const runtime=this.player as unknown as {lifeState:string};runtime.lifeState='DEAD';this.player.body.setVelocity(0,0).setEnable(false);}
  if(!this.prebossReady&&this.player.sprite.x>=FURNACE_BOSS_CHECKPOINT+50&&this.player.grounded&&Math.abs(this.player.body.bottom-360)<12){
   this.prebossReady=true;this.state.checkpoint=FURNACE_BOSS_CHECKPOINT;this.state.ultimateCharge=this.player.ultimateCharge;this.prebossRest?.activate();this.saveCampaign();
  }
  if(this.prebossReady&&this.player.sprite.x>=FURNACE_BOSS_CHECKPOINT+140&&this.player.grounded){
   this.leaving=true;this.traversalRig?.suspend();this.player.body.setVelocity(0,0);this.cameras.main.fadeOut(200);this.time.delayedCall(200,()=>this.scene.start('rescue-boss',{...this.state,opened:[0],bossDefeated:false,ultimateCharge:this.state.ultimateCharge}));
  }
  this.hud.update();if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
 }
}
