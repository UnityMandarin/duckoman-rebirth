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
import {setupRenderScale} from '../systems/renderScale';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,canPersistCampaign} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible} from '../systems/debug/debugSettings';
import {FURNACE_ROOMS,FURNACE_ROOM_WIDTH,FURNACE_BOSS_CHECKPOINT,FURNACE_CHECKPOINTS,type FurnaceCircuit} from '../data/furnace';
import {FurnaceRhythm,FURNACE_FLAME_HEIGHT} from '../systems/FurnaceRhythm';
import {addFurnaceBackdrop,updateFurnaceBackdrop,registerFurnaceFrames,type FurnaceBackdrop} from '../systems/FurnaceArt';
import {FurnaceLava} from '../systems/FurnaceLava';
import {rectsOverlap} from '../systems/contactRules';
import {TUNING} from '../config/tuning';
import type {Encounter} from '../data/chapterChallenges';
import type {Ledge} from '../data/chapters';
export interface FurnaceStart {checkpoint?:number;ultimateCharge?:number;opened?:number[];bossDefeated?:boolean;infiniteHealth?:boolean;devPreview?:boolean;previewSection?:number;bossPreview?:boolean;bossBeat?:string;freshReplay?:boolean;}
export function furnaceStartRecord(data:FurnaceStart,saved:{checkpoint:number;charge:number;opened:number[];bossDefeated:boolean},preview:boolean):FurnaceStart {return preview?{checkpoint:80,ultimateCharge:0,opened:[],bossDefeated:false,...data,devPreview:true}:{checkpoint:saved.checkpoint,ultimateCharge:saved.charge,opened:saved.opened,bossDefeated:saved.bossDefeated,...data};}
export function furnaceArenaEntry(data:FurnaceStart):boolean {return !data.freshReplay&&(!!data.bossPreview||!!data.bossDefeated||data.opened?.includes(0)===true||(data.checkpoint??0)>=FURNACE_BOSS_CHECKPOINT);}
export const FURNACE_ENCOUNTERS:readonly Encounter[]=Object.freeze(FURNACE_ROOMS.map(r=>Object.freeze({type:'conveyor' as const,format:'tower' as const,pacing:'test' as const,steps:Object.freeze(r.steps.map(p=>Object.freeze([p.x,p.top,p.width] as const))),spikes:Object.freeze([]),enemies:Object.freeze([]),moving:Object.freeze(r.machines.map(m=>Object.freeze({...m})))})));
export function furnaceEncounter(room:number):Encounter|undefined {return FURNACE_ENCOUNTERS[room];}
const FURNACE_FALL_LIMITS=FURNACE_ROOMS.map(r=>Math.max(r.entryTop,r.exitTop,...r.steps.map(p=>p.top))+280);
interface HeatPlate {room:number;circuit:FurnaceCircuit;shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image|Phaser.GameObjects.TileSprite;label:Phaser.GameObjects.Image;core:Phaser.GameObjects.Image;flame:Phaser.GameObjects.Image;zone:{left:number;right:number;top:number;bottom:number};}
interface Robot {enemy:BasicEnemy;core:Phaser.GameObjects.Image;plate:Phaser.GameObjects.Image;}
export class FurnaceScene extends Phaser.Scene {
 private player!:Player;private controls!:InputController;private hud!:ChapterHud;private cake!:ThrowableObject;private terrain!:Phaser.Physics.Arcade.StaticGroup;private traps!:ChapterTraps;
 private backdrops:FurnaceBackdrop[]=[];private rhythm=new FurnaceRhythm();private heat:HeatPlate[]=[];private robots:Robot[]=[];private rests:{x:number;top:number;visual:CheckpointVisual}[]=[];
 private lava?:FurnaceLava;
 private prebossRest?:CheckpointVisual;private prebossReady=false;private state:FurnaceStart={};private dying=false;private leaving=false;private room=-1;private label!:Phaser.GameObjects.Image;private story!:Phaser.GameObjects.Image;private storyUntil=0;
 constructor(){super('rescue');}
 preload():void {preloadSceneAssets(this,'furnace');preloadChapterIdentity(this,'crimson');}
 create(data:FurnaceStart={}):void {
  const progress=loadProgress(),saved=progress.chapters.rescue,preview=!!data.devPreview||!!this.registry.get('devPreview');
  if(!preview&&!progress.unlocked.includes('rescue')){this.scene.start('menu');return;}
  this.state=furnaceStartRecord(data,saved,preview);
  if(furnaceArenaEntry(this.state)){this.scene.start('rescue-boss',this.state);return;}
  this.state.checkpoint=preview&&data.previewSection!==undefined?data.previewSection*FURNACE_ROOM_WIDTH+80:this.state.checkpoint??80;
  registerCommonFrames(this);registerSharedPropFrames(this);registerChapterHudFrames(this);registerChapterIdentity(this,'crimson');registerFurnaceFrames(this);
  this.dying=false;this.leaving=false;this.room=-1;this.rhythm=new FurnaceRhythm();this.heat=[];this.robots=[];this.rests=[];this.backdrops=[];this.lava=undefined;this.prebossRest=undefined;this.prebossReady=false;
  this.physics.world.resume();this.physics.world.setBounds(0,-1100,FURNACE_BOSS_CHECKPOINT+192,1800);
  this.cameras.main.setBounds(0,-700,FURNACE_BOSS_CHECKPOINT+192,1400).setBackgroundColor(0x171114);
  this.terrain=this.physics.add.staticGroup();const surfaces:ChapterSurface[]=[];
  for(let i=0;i<FURNACE_ROOMS.length;i++){
   const room=FURNACE_ROOMS[i],base=i*FURNACE_ROOM_WIDTH;this.backdrops.push(addFurnaceBackdrop(this,base,FURNACE_ROOM_WIDTH,room.entryTop));
   this.platform(base+96,room.entryTop,192,i,-1,surfaces,false);this.platform(base+1396,room.exitTop,88,i,-2,surfaces,false);
   for(let j=0;j<room.steps.length;j++){const p=room.steps[j],surface=this.platform(base+p.x,p.top,p.width,i,j,surfaces,true);if(p.circuit){
    const label=this.add.image(base+p.x,p.top-29,'furnace-utility',`circuit-${p.circuit}`).setDisplaySize(34,32).setDepth(7);
    const core=this.add.image(base+p.x,p.top+9,'furnace-utility','vent').setDisplaySize(p.width-16,14).setDepth(5).setTint(0x7a341d).setAlpha(.75);
    const flame=this.add.image(base+p.x,p.top-FURNACE_FLAME_HEIGHT/2,'furnace-utility','flame-0').setDisplaySize(p.width,FURNACE_FLAME_HEIGHT).setOrigin(.5,1).setDepth(6).setVisible(false);
    this.heat.push({room:i,circuit:p.circuit,shape:surface.shape,art:surface.art,label,core,flame,zone:{left:0,right:0,top:0,bottom:0}});
   }}
   if(i%2===0){const x=base+80,rest=this.add.image(x,room.entryTop-28,'identity-crimson','rest').setDisplaySize(30,54).setDepth(5);this.rests.push({x,top:room.entryTop,visual:addCheckpointVisual(this,rest,{coreYRatio:.37,haloColor:0xff7938,coreColor:0xffd388,initiallyActive:x<=(this.state.checkpoint??0)})});}
  }
  this.platform(FURNACE_BOSS_CHECKPOINT+96,360,192,11,-1,surfaces,false);
  const prebossMarker=this.add.image(FURNACE_BOSS_CHECKPOINT+80,332,'identity-crimson','rest').setDisplaySize(30,54).setDepth(5);
  this.prebossRest=addCheckpointVisual(this,prebossMarker,{coreYRatio:.37,haloColor:0xff7938,coreColor:0xffd388});
  addIdentityDoor(this,'crimson',{x:FURNACE_BOSS_CHECKPOINT+170,ground:360,width:38,height:230,opened:true});

  const spawn=this.state.checkpoint||80,spawnRoom=Math.min(10,Math.floor(spawn/FURNACE_ROOM_WIDTH)),spawnTop=FURNACE_ROOMS[spawnRoom].entryTop;
  this.player=new Player(this,spawn,spawnTop-25);this.player.infiniteHealth=!!data.infiniteHealth;this.player.health=3;this.player.ultimateCharge=this.state.ultimateCharge??0;
  this.physics.add.collider(this.player.sprite,this.terrain);this.cake=new ThrowableObject(this,spawn+50,spawnTop-35);this.physics.add.collider(this.cake.sprite,this.terrain);this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  const source:TrapEncounterSource={count:11,encounter:furnaceEncounter,floor:room=>FURNACE_ROOMS[room].entryTop};this.traps=new ChapterTraps(this,this.player,'crimson',surfaces,undefined,source);
  for(let i=0;i<FURNACE_ROOMS.length;i++)for(const placement of FURNACE_ROOMS[i].robots){const p=FURNACE_ROOMS[i].steps[placement.step],x=i*1440+p.x,enemy=new BasicEnemy(this,x,p.top-25,{left:x-p.width/2+TUNING.enemy.bodyWidth/2,right:x+p.width/2-TUNING.enemy.bodyWidth/2},placement.type==='pointed',placement.type==='jumper');enemy.hp=2;enemy.visual.setTint(placement.type==='pointed'?0xffb762:placement.type==='jumper'?0xcf7350:0xd6543c);this.physics.add.collider(enemy.sprite,this.terrain);const interactions=new InteractionSystem(this.player,enemy,this.cake);this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>interactions.resolvePlayerEnemy());this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>interactions.resolveThrownEnemy());const plate=this.add.image(x,p.top-22,'furnace-utility','vent').setDisplaySize(23,9).setDepth(7),core=this.add.image(x,p.top-25,'furnace-utility','gear').setDisplaySize(8,8).setDepth(8);enemy.setAwake(false);this.robots.push({enemy,core,plate});}
  this.label=this.add.image(620,347,'chapter5-typography','room-0').setDisplaySize(FURNACE_TYPOGRAPHY['room-0'].width/2,FURNACE_TYPOGRAPHY['room-0'].height/2).setScrollFactor(0).setDepth(52).setOrigin(1,0.5);
  this.story=this.add.image(320,105,'chapter5-typography','story-0').setDisplaySize(FURNACE_TYPOGRAPHY['story-0'].width/2,FURNACE_TYPOGRAPHY['story-0'].height/2).setScrollFactor(0).setDepth(52).setOrigin(.5,0).setVisible(false);
  const hudCamera=setupRenderScale(this,'furnace-hud');this.lava=new FurnaceLava(this,this.player);new SceneLayerRouter(this,hudCamera);this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(500);
  const menu=(event?:KeyboardEvent)=>{if(!event?.repeat)requestPauseMenu(this,()=>this.saveCampaign(),'rescue');};addMenuControl(this,()=>requestPauseMenu(this,()=>this.saveCampaign(),'rescue'));this.input.keyboard?.on('keydown-ESC',menu);
  const gap=()=>{this.rhythm.suspend();this.lava?.suspend();},visibility=()=>{if(document.visibilityState!=='visible')gap();},save=()=>this.saveCampaign();this.events.on(Phaser.Scenes.Events.PAUSE,gap);this.events.on(Phaser.Scenes.Events.SLEEP,gap);this.game.events.on(Phaser.Core.Events.BLUR,gap);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',save);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.keyboard?.off('keydown-ESC',menu);this.events.off(Phaser.Scenes.Events.PAUSE,gap);this.events.off(Phaser.Scenes.Events.SLEEP,gap);this.game.events.off(Phaser.Core.Events.BLUR,gap);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',save);});
 }
 private platform(x:number,top:number,width:number,room:number,step:number,surfaces:ChapterSurface[],ledge:boolean):ChapterSurface {
  const height=ledge?48:64;const shape=this.add.rectangle(x,top+height/2,width,height,0x26212a,0);this.physics.add.existing(shape,true);this.terrain.add(shape);
  const combat=step<0||FURNACE_ROOMS[room]?.robots.some(robot=>robot.step===step)===true;
  const art=ledge?addIdentityBlock(this,'crimson',{x,top,width,height:48,frame:combat?'cap-b':'cap-a'}):addIdentityFloor(this,'crimson',{x,top,width,height:64,frame:'cap-b'}).cap;
  art.setTint(0x64534b);const geometry:Ledge={x,y:top+height/2,width,height,room,step,role:ledge?'ledge':'floor'},surface={shape,art,ledge:geometry};if(ledge)surfaces.push(surface);
  return surface;
 }
 private saveCampaign():void {if(this.state.devPreview||this.leaving||!this.player||!canPersistCampaign({infiniteHealth:this.player.infiniteHealth,runEligible:campaignRunEligible()}))return;saveProgress(updateChapter(loadProgress(),'rescue',{checkpoint:FURNACE_CHECKPOINTS.includes(this.state.checkpoint??0)?this.state.checkpoint??0:0,charge:this.state.ultimateCharge??0,opened:this.state.checkpoint===FURNACE_BOSS_CHECKPOINT?[0]:[],bossDefeated:false,secrets:[],discoveries:[]}));}
 private say(message:string):void {const frame=message.startsWith('Three circuits')?'story-0':message.startsWith('Dash after')?'story-1':message.startsWith('Checkpoint')?'checkpoint':'story-2';this.story.setTexture('chapter5-typography',frame).setDisplaySize(FURNACE_TYPOGRAPHY[frame].width/2,FURNACE_TYPOGRAPHY[frame].height/2).setAlpha(1).setVisible(true);this.storyUntil=this.time.now+6500;}
 update(_time:number,delta:number):void {
  if(!this.player||this.leaving)return;
  const index=Math.max(0,Math.min(10,Math.floor(this.player.sprite.x/1440))),localX=this.player.sprite.x-index*1440;
  const live=this.player.active&&this.sys.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
  if(!live){this.rhythm.update(index,localX,delta,false);this.lava?.suspend();this.traps.update(delta);if(!this.player.active&&!this.dying){this.dying=true;this.cake.drop();this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth}));}return;}
  const input=this.controls.read();if(input.godModePressed){markCampaignRunIneligible();this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}
  this.player.update(input,delta);if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();if(this.physics.world.isPaused){this.rhythm.update(index,localX,delta,false);this.lava?.suspend();this.traps.update(delta);this.hud.update();return;}this.rhythm.update(index,localX,delta,true);
  if(input.throwPressed&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);this.cake.follow(this.player);this.cake.update(delta);this.traps.update(delta);const lavaContact=this.lava?.update(delta)??false;
  for(const robot of this.robots){const enemy=robot.enemy,awake=!enemy.defeated&&Math.abs(enemy.sprite.x-this.player.sprite.x)<850&&Math.abs(enemy.sprite.y-this.player.sprite.y)<650;if(!enemy.defeated)enemy.setAwake(awake);robot.core.setVisible(awake);robot.plate.setVisible(awake);if(awake){enemy.update(true,delta);enemy.checkDash(this.player);robot.plate.setPosition(enemy.body.center.x,enemy.body.center.y-3);robot.core.setPosition(enemy.body.center.x,enemy.body.center.y-3);}}
  for(const plate of this.heat){const body=plate.shape.body as Phaser.Physics.Arcade.StaticBody,phase=plate.room===index?this.rhythm.heat(plate.circuit):'safe',warning=phase==='warning',burn=phase==='burn';plate.label.setPosition(body.center.x,body.top-29);plate.core.setPosition(body.center.x,body.top+9).setTint(burn?0xffe0a0:warning?0xf89034:0x793821).setAlpha(warning?.5+.4*Math.sin(this.rhythm.elapsedMs*.016):burn?1:.55);plate.flame.setTexture('furnace-utility',`flame-${Math.floor(this.rhythm.elapsedMs/110)%3}`).setPosition(body.center.x,body.top).setOrigin(.5,1).setVisible(burn).setAlpha(burn?.78+.12*Math.sin(this.rhythm.elapsedMs*.022+plate.circuit):1);plate.art.setTint(burn?0xff9b54:warning?0xb77c4d:0x64534b);if(burn){plate.zone.left=body.left;plate.zone.right=body.right;plate.zone.top=body.top-FURNACE_FLAME_HEIGHT;plate.zone.bottom=body.top+2;if(rectsOverlap(this.player.body,plate.zone))this.player.takeDamage(body.center.x,.5);}}
  for(let i=0;i<this.backdrops.length;i++)updateFurnaceBackdrop(this.backdrops[i],this.rhythm.elapsedMs,Math.abs(i-index)<=1);
  if(index!==this.room){this.room=index;const frame=`room-${index}` as keyof typeof FURNACE_TYPOGRAPHY;this.label.setTexture('chapter5-typography',frame).setDisplaySize(FURNACE_TYPOGRAPHY[frame].width/2,FURNACE_TYPOGRAPHY[frame].height/2);if(FURNACE_ROOMS[index].story)this.say(FURNACE_ROOMS[index].story!);}
  for(const rest of this.rests)if(rest.x>(this.state.checkpoint??0)&&Math.abs(this.player.sprite.x-rest.x)<35&&this.player.grounded&&Math.abs(this.player.body.bottom-rest.top)<12){this.state.checkpoint=rest.x;this.state.ultimateCharge=this.player.ultimateCharge;this.player.health=Math.min(3,this.player.health+.5);rest.visual.activate();this.saveCampaign();this.say('Checkpoint · Half a heart restored.');}
  if(lavaContact||this.player.body.bottom>FURNACE_FALL_LIMITS[index]){this.player.health=0;const runtime=this.player as unknown as {lifeState:string};runtime.lifeState='DEAD';this.player.body.setVelocity(0,0).setEnable(false);}
  if(!this.prebossReady&&this.player.sprite.x>=FURNACE_BOSS_CHECKPOINT+50&&this.player.grounded&&Math.abs(this.player.body.bottom-360)<12){
   this.prebossReady=true;this.state.checkpoint=FURNACE_BOSS_CHECKPOINT;this.state.ultimateCharge=this.player.ultimateCharge;this.prebossRest?.activate();this.saveCampaign();
  }
  if(this.prebossReady&&this.player.sprite.x>=FURNACE_BOSS_CHECKPOINT+140&&this.player.grounded){
   this.leaving=true;this.player.body.setVelocity(0,0);this.cameras.main.fadeOut(200);this.time.delayedCall(200,()=>this.scene.start('rescue-boss',{...this.state,opened:[0],bossDefeated:false,ultimateCharge:this.state.ultimateCharge}));
  }
  this.hud.update();if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
 }
}
