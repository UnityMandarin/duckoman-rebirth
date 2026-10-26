import Phaser from 'phaser';
import {Player} from '../entities/Player';
import {BasicEnemy} from '../entities/BasicEnemy';
import {ThrowableObject} from '../entities/ThrowableObject';
import {InputController} from '../systems/InputController';
import {InteractionSystem} from '../systems/InteractionSystem';
import {ChapterHud,registerChapterHudFrames} from '../systems/ChapterHud';
import {ChapterTraps,type ChapterSurface,type TrapEncounterSource} from '../systems/ChapterTraps';
import {registerFurnaceFrames} from '../systems/FurnaceArt';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {registerChapterIdentity,preloadChapterIdentity,addIdentityBlock} from '../systems/ChapterVisuals';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {setupRenderScale} from '../systems/renderScale';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,completeLateChapter,resetChapter,updateChapter,canPersistCampaign,SAVE_CHECKPOINTS,type CampaignScene} from '../systems/progress';
import {AdventureDirector} from '../systems/AdventureDirector';
import {canOpenPauseMenu} from '../systems/adventureRules';
import {campaignRunEligible} from '../systems/debug/debugSettings';
import {LATE_ROOMS,LATE_CHAPTER_LENGTH,LATE_ROOM_WIDTH,LATE_CHECKPOINTS,lateExitPlatform,latePlatformCoversExit,lateRoute,latePreviewSpawn,lateStandingOnExit,type LateChapterKey,type LatePlatform} from '../data/lateChapters';
import type {Encounter} from '../data/chapterChallenges';
import {TUNING} from '../config/tuning';
import {lateAtmospherePlan} from '../data/lateAtmosphere';

type Start={checkpoint?:number;ultimateCharge?:number;devPreview?:boolean;previewSection?:number;freshReplay?:boolean;infiniteHealth?:boolean;qa?:boolean;qaStep?:number;qaDamage?:boolean};
type Rest={x:number;top:number;room:number;visual:CheckpointVisual};
type Robot={enemy:BasicEnemy;core:Phaser.GameObjects.Image;plate:Phaser.GameObjects.Image};
const chapterScene=(key:LateChapterKey):CampaignScene=>key;
const palette=(key:LateChapterKey)=>key==='stormworks'?{glow:0x7dd5e3,core:0xffd080,story:'#d8f2f3',ground:0x263741}:{glow:0xe2c783,core:0xffedb3,story:'#f1e6bd',ground:0x3a3540};
const localPreview=()=>import.meta.env.DEV&&['localhost','127.0.0.1'].includes(window.location.hostname);
declare global {interface Window {__duckomanLateQA?:{select:(room:number,step:number)=>void;command:(action:string)=>void;status:()=>Record<string,unknown>;};}}

/** Focused runner for the two post-rescue traversal chapters. */
export class LateChapterScene extends Phaser.Scene {
 private player!:Player;private controls!:InputController;private adventure!:AdventureDirector;private hud!:ChapterHud;private cake!:ThrowableObject;private terrain!:Phaser.Physics.Arcade.StaticGroup;private traps!:ChapterTraps;
 private key:LateChapterKey='stormworks';private state:Start={};private dying=false;private leaving=false;private room=-1;private story!:Phaser.GameObjects.Text;private storyUntil=0;private rests:Rest[]=[];private robots:Robot[]=[];private fallLimits:number[]=[];
 private qaMode=false;private qaDriveMs=0;private qaDirection:-1|0|1=0;private qaSprint=false;private qaJump=false;private qaDash=false;private qaDashDelayMs=-1;
 constructor(key:LateChapterKey){super(key);this.key=key;}
 init(data:Start):void{if(data.devPreview)this.registry.set('devPreview',true);}
 preload():void{preloadSceneAssets(this,'late');preloadChapterIdentity(this,'crimson');preloadChapterIdentity(this,'jail');}
 create(data:Start={}):void{
  const preview=!!data.devPreview&&localPreview(),progress=loadProgress(),sceneKey=chapterScene(this.key);
  if(!preview&&!progress.unlocked.includes(sceneKey)){this.scene.start('menu');return;}
  const saved=progress.chapters[sceneKey],section=Math.max(0,Math.min(11,Math.floor(data.previewSection??0)));const allowed=SAVE_CHECKPOINTS[sceneKey],requested=data.freshReplay?0:data.checkpoint??(preview?0:saved.checkpoint),safeCheckpoint=allowed.includes(requested)?requested:0;this.state={...data,checkpoint:safeCheckpoint,ultimateCharge:data.freshReplay?0:data.ultimateCharge??(preview?0:saved.charge),previewSection:preview&&data.previewSection!==undefined?section:data.previewSection,freshReplay:false,devPreview:preview};
  this.qaMode=!!data.qa&&preview;this.qaDriveMs=0;this.qaDirection=0;this.qaSprint=false;this.qaJump=false;this.qaDash=false;this.qaDashDelayMs=-1;
  this.dying=false;this.leaving=false;this.room=-1;this.rests=[];this.robots=[];
  registerCommonFrames(this);registerSharedPropFrames(this);registerChapterHudFrames(this);registerChapterIdentity(this,'crimson');registerChapterIdentity(this,'jail');registerFurnaceFrames(this);
  const rooms=LATE_ROOMS[this.key],minY=Math.min(...rooms.flatMap(r=>[r.entryTop,r.exitTop,...r.steps.map(s=>s.top)]))-360,maxY=Math.max(...rooms.flatMap(r=>[r.entryTop,r.exitTop,...r.steps.map(s=>s.top)]))+700;
  this.physics.world.resume();this.physics.world.setBounds(0,minY,LATE_CHAPTER_LENGTH,maxY-minY);this.cameras.main.setBounds(0,minY, LATE_CHAPTER_LENGTH,maxY-minY).setBackgroundColor(this.key==='stormworks'?0x14232b:0x1e1d2b);
  this.terrain=this.physics.add.staticGroup();const surfaces:ChapterSurface[]=[];this.fallLimits=[];
  rooms.forEach((r,i)=>{
   const base=i*LATE_ROOM_WIDTH;
   this.platform(base+96,r.entryTop,192,i,-1,surfaces,false);
   r.steps.forEach((p,j)=>this.platform(base+p.x,p.top,p.width,i,j,surfaces,true));
   const exit=lateExitPlatform(r),last=r.steps.at(-1)!;
   if(!latePlatformCoversExit(last,exit))this.platform(base+exit.x,exit.top,exit.width,i,-2,surfaces,false);
   this.fallLimits.push(Math.max(r.entryTop,r.exitTop,...r.steps.map(p=>p.top))+260);
   for(const machine of r.machines){const p=r.steps[machine.step];if(!p||(machine.type!=='lift'&&machine.type!=='ferry'))continue;this.addMachineSupports(base,p,machine.type);}
   if(i%2===0){const x=base+80,marker=this.add.image(x,r.entryTop-28,'identity-jail','rest').setDisplaySize(30,54).setTint(this.key==='stormworks'?0x72bfc9:0xe2ce91).setDepth(5);this.rests.push({x,top:r.entryTop,room:i,visual:addCheckpointVisual(this,marker,{coreYRatio:.37,haloColor:palette(this.key).glow,coreColor:palette(this.key).core,initiallyActive:x<=(this.state.checkpoint??0)})});}
   for(const placement of r.robots){const p=r.steps[placement.step];if(!p)continue;const x=base+p.x,enemy=new BasicEnemy(this,x,p.top-25,{left:x-p.width/2+TUNING.enemy.bodyWidth/2,right:x+p.width/2-TUNING.enemy.bodyWidth/2},placement.type==='pointed',placement.type==='jumper');enemy.hp=2;enemy.visual.setTint(placement.type==='pointed'?0xf0bd68:placement.type==='jumper'?0xb68ca0:0x7ec5cd);this.physics.add.collider(enemy.sprite,this.terrain);this.robots.push({enemy,core:this.add.image(x,p.top-25,'furnace-utility','gear').setDisplaySize(10,10).setDepth(8).setVisible(false),plate:this.add.image(x,p.top-22,'furnace-utility','vent').setDisplaySize(24,8).setDepth(7).setVisible(false)});
   }
  });
  this.addChapterAtmosphere(minY,maxY);const lastRoom=rooms.at(-1)!,beacon=lateExitPlatform(lastRoom);this.add.image(LATE_CHAPTER_LENGTH-96,beacon.top-86,'furnace-utility','electric').setDisplaySize(100,84).setDepth(4).setAlpha(.9);
  const checkpoint=this.state.checkpoint??80,previewSpawn=preview&&this.state.previewSection!==undefined?latePreviewSpawn(this.key,this.state.previewSection):undefined,roomIndex=this.qaMode?section:previewSpawn?.room??Math.max(0,Math.min(11,Math.floor(checkpoint/LATE_ROOM_WIDTH))),roomData=rooms[roomIndex]!,qaStep=this.state.qaStep??-1,qaSurface=qaStep===-2?lateExitPlatform(roomData):qaStep<0?{x:96,top:roomData.entryTop}:roomData.steps[qaStep],spawnX=this.qaMode?roomIndex*LATE_ROOM_WIDTH+(qaSurface?.x??96):previewSpawn?.x??(checkpoint||80),spawnTop=this.qaMode||previewSpawn?(qaSurface?.top??roomData.entryTop):roomData.entryTop;
  this.player=new Player(this,spawnX,spawnTop-25);this.player.infiniteHealth=this.qaMode?data.qaDamage!==true:!!this.state.infiniteHealth;this.player.health=3;this.player.ultimateCharge=this.state.ultimateCharge??0;
  this.physics.add.collider(this.player.sprite,this.terrain);this.cake=new ThrowableObject(this,spawnX+50,spawnTop-35);this.physics.add.collider(this.cake.sprite,this.terrain);this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  for(const r of rooms)for(const placement of r.robots){const p=r.steps[placement.step];if(!p)continue;const x=rooms.indexOf(r)*LATE_ROOM_WIDTH+p.x,enemy=this.robots.find(e=>Math.abs(e.enemy.sprite.x-x)<1)?.enemy;if(!enemy)continue;const interactions=new InteractionSystem(this.player,enemy,this.cake);this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>interactions.resolvePlayerEnemy());this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>interactions.resolveThrownEnemy());}
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);this.adventure=new AdventureDirector(this,this.key as CampaignScene,this.player,this.cake);
  const source:TrapEncounterSource={count:12,encounter:(i)=>this.encounter(i),floor:i=>rooms[i]?.entryTop??360};this.traps=new ChapterTraps(this,this.player,'jail',surfaces,undefined,source);
  this.story=this.add.text(320,68,'',{fontFamily:'Georgia',fontSize:'12px',color:palette(this.key).story,stroke:'#101318',strokeThickness:3,backgroundColor:'#111822bb',padding:{x:12,y:8},align:'center',wordWrap:{width:430}}).setScrollFactor(0).setDepth(52).setOrigin(.5,0).setVisible(false);
  const hudCamera=setupRenderScale(this,`late-${this.key}-hud`);new SceneLayerRouter(this,hudCamera);this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,86).fadeIn(400);
  const menu=(event?:KeyboardEvent)=>{if(!event?.repeat&&canOpenPauseMenu(this.adventure?.talking??false))requestPauseMenu(this,()=>this.saveCampaign(),sceneKey);};addMenuControl(this,()=>canOpenPauseMenu(this.adventure?.talking??false)?requestPauseMenu(this,()=>this.saveCampaign(),sceneKey):true);this.input.keyboard?.on('keydown-ESC',menu);
  const save=()=>this.saveCampaign();this.events.on(Phaser.Scenes.Events.PAUSE,this.traps.suspend);this.game.events.on(Phaser.Core.Events.BLUR,this.traps.suspend);document.addEventListener('visibilitychange',this.onVisibility);window.addEventListener('pagehide',save);
  if(this.qaMode)this.installLateQA(roomIndex);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.keyboard?.off('keydown-ESC',menu);this.game.events.off(Phaser.Core.Events.BLUR,this.traps.suspend);document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pagehide',save);});
 }
 private readonly onVisibility=()=>{if(document.visibilityState!=='visible')this.traps?.suspend();};
 private installLateQA(room:number):void{
  const errors:string[]=[],onerror=(event:ErrorEvent)=>{errors.push(event.message||'window error');};window.addEventListener('error',onerror);
  const select=(nextRoom:number,step:number)=>this.scene.restart({devPreview:true,previewSection:Math.max(0,Math.min(11,nextRoom)),qa:true,qaStep:step,qaDamage:this.player.infiniteHealth?false:true});
  const command=(action:string)=>{if(action==='retry'){select(room,this.state.qaStep??-1);return;}if(action==='walkLeft'||action==='walkRight'||action==='sprintLeft'||action==='sprintRight'){this.qaDriveMs=500;this.qaDirection=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='walkRightLong'||action==='walkLeftLong'||action==='sprintRightLong'||action==='sprintLeftLong'){this.qaDriveMs=1200;this.qaDirection=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;}if(action==='jump')this.qaJump=true;if(action==='jumpDashRight'){this.qaDirection=1;this.qaDriveMs=750;this.qaSprint=true;this.qaJump=true;this.qaDashDelayMs=250;}if(action==='runFirstLink'||action==='runNextLink'){const route=lateRoute(LATE_ROOMS[this.key][room]!),from=this.state.qaStep===undefined||this.state.qaStep<0?0:this.state.qaStep===-2?route.length-1:this.state.qaStep+1,to=route[Math.min(route.length-1,from+1)]!,direction=Math.sign(to.x-route[from]!.x) as -1|0|1;this.qaDirection=direction;this.qaDriveMs=750;this.qaSprint=true;this.qaJump=true;this.qaDashDelayMs=250;}if(action==='dash')this.qaDash=true;if(action==='pause')this.scene.pause();if(action==='resume')this.scene.resume();if(action==='ultimate'){this.player.ultimateCharge=100;this.hud.useUltimate();}};
  const status=()=>({scene:this.key,room,x:this.player.body.center.x,y:this.player.body.center.y,vx:this.player.body.velocity.x,vy:this.player.body.velocity.y,grounded:this.player.grounded,support:this.terrain.getChildren().find(o=>{const r=o as Phaser.GameObjects.Rectangle&{body?:Phaser.Physics.Arcade.StaticBody};return r.body?.enable&&this.player.body.right>r.body.left&&this.player.body.left<r.body.right&&Math.abs(this.player.body.bottom-r.body.top)<5;})?.name??null,health:this.player.health,ultimateCharge:this.player.ultimateCharge,checkpoint:this.state.checkpoint??0,activeTraps:this.traps.activeTrapSections(),gameClock:this.time.now,paused:this.physics.world.isPaused,errors:[...errors]});
  const api={select,command,status};window.__duckomanLateQA=api;this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('error',onerror);if(window.__duckomanLateQA===api)delete window.__duckomanLateQA;});
 }
 private encounter(index:number):Encounter|undefined{const room=LATE_ROOMS[this.key][index];if(!room)return;return {type:'conveyor',format:'tower',pacing:'test',steps:room.steps.map(p=>[p.x,p.top,p.width] as const),spikes:[],enemies:[],moving:room.machines};}
 private addChapterAtmosphere(minY:number,maxY:number):void{
  const texture=this.key==='stormworks'?'world-v3-crimson-works':'world-v3-castle-audience';
  if(!this.textures.exists(texture))return;const src=this.textures.get(texture).getSourceImage() as HTMLImageElement;
  const field=lateAtmospherePlan(this.key,minY,maxY,src.width,src.height);
  for(const x of field.tileXs){
   const image=this.add.image(x,field.top,texture).setOrigin(0).setScale(field.scale).setScrollFactor(field.parallaxX,field.parallaxY).setDepth(-30).setAlpha(.34);
   if(this.key==='crown-edge')image.setTint(0xe2c783);
  }
 }
 private platform(x:number,top:number,width:number,room:number,step:number,surfaces:ChapterSurface[],ledge:boolean):ChapterSurface{
  const height=ledge?48:64,shape=this.add.rectangle(x,top+height/2,width,height,0x25232a,0).setName(`${room}:${step}`);this.physics.add.existing(shape,true);this.terrain.add(shape);
  const frame=step<0?(this.key==='stormworks'?'cap-a':'cap-c'):this.key==='stormworks'?(step%4===0?'cap-c':'cap-a'):(step%4===0?'cap-a':'cap-c');
  const art=addIdentityBlock(this,'jail',{x,top,width,height:ledge?48:64,frame,depth:2});if(this.key==='stormworks')art.setTint(ledge?0x91cbd4:0x7fbbc8);
  const surface:ChapterSurface={shape,art,ledge:{x,y:top+height/2,width,height,room,step,role:ledge?'ledge':'floor'}};if(ledge)surfaces.push(surface);return surface;
 }
 private addMachineSupports(base:number,p:LatePlatform,type:'lift'|'ferry'):void{
  const texture=this.textures.get('identity-jail'),frame=texture.get('chain'),scale=type==='lift'?360/frame.height:240/frame.height;
  const anchors=type==='lift'?[base+p.x]:[base+p.x-65,base+p.x+65];for(const x of anchors){this.add.image(x,p.top-(type==='lift'?295:185),'identity-jail','chain').setOrigin(.5,0).setScale(scale).setAlpha(.78).setDepth(-8);this.add.image(x,p.top-(type==='lift'?300:190),'furnace-utility','gear').setDisplaySize(34,34).setDepth(-7).setAlpha(.86);}
 }
 private saveCampaign():void{if(this.state.devPreview||this.leaving||!this.player||!canPersistCampaign({infiniteHealth:this.player.infiniteHealth,runEligible:campaignRunEligible()}))return;const key=chapterScene(this.key),checkpoint=LATE_CHECKPOINTS.includes(this.state.checkpoint??0)?this.state.checkpoint??0:0;saveProgress(updateChapter(loadProgress(),key,{checkpoint,charge:this.state.ultimateCharge??0,opened:[],bossDefeated:false,secrets:[],discoveries:[]}));}
 private say(text:string):void{this.story.setText(text).setAlpha(1).setVisible(true);this.storyUntil=this.time.now+5600;}
 update(_time:number,delta:number):void{
  if(!this.player||this.leaving)return;const index=Math.max(0,Math.min(11,Math.floor(this.player.sprite.x/LATE_ROOM_WIDTH))),live=this.player.active&&this.sys.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
  if(!live){this.traps.update(delta);if(!this.player.active&&!this.dying){this.dying=true;this.cake.drop();this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth}));}return;}
  const input=this.controls.read();if(this.adventure?.update(input))return;if(this.qaMode){if(this.qaDriveMs>0){input.horizontal=this.qaDirection;input.sprintHeld=this.qaSprint;this.qaDriveMs=Math.max(0,this.qaDriveMs-delta);if(this.qaDriveMs===0){this.qaDirection=0;this.qaSprint=false;}}if(this.qaJump){input.jumpPressed=true;this.qaJump=false;}if(this.qaDashDelayMs>=0){this.qaDashDelayMs-=delta;if(this.qaDashDelayMs<=0){input.dashPressed=true;this.qaDashDelayMs=-1;}}if(this.qaDash){input.dashPressed=true;this.qaDash=false;}}this.player.update(input,delta);if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();if(this.physics.world.isPaused){this.traps.update(delta);this.hud.update();return;}
  if(input.throwPressed&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);this.cake.follow(this.player);this.cake.update(delta);this.traps.update(delta);
  for(const robot of this.robots){const enemy=robot.enemy,awake=!enemy.defeated&&Math.abs(enemy.sprite.x-this.player.sprite.x)<760&&Math.abs(enemy.sprite.y-this.player.sprite.y)<560;if(!enemy.defeated)enemy.setAwake(awake);robot.core.setVisible(awake);robot.plate.setVisible(awake);if(awake){enemy.update(true,delta);enemy.checkDash(this.player);robot.core.setPosition(enemy.body.center.x,enemy.body.center.y-3);robot.plate.setPosition(enemy.body.center.x,enemy.body.center.y-3);}}
  if(index!==this.room){this.room=index;if(index===0)this.say(this.key==='stormworks'?'Stormworks Citadel: the relay beacon is dark. Restore the signal and reach the crown road.':'Crown’s Edge: the last switchbacks climb above the broken kingdom. Reach the dawn beacon.');}
  for(const rest of this.rests)if(rest.x>(this.state.checkpoint??0)&&Math.abs(this.player.sprite.x-rest.x)<36&&this.player.grounded&&Math.abs(this.player.body.bottom-rest.top)<12){this.state.checkpoint=rest.x;this.state.ultimateCharge=this.player.ultimateCharge;if(this.state.devPreview)this.state.previewSection=rest.room;this.player.health=Math.min(3,this.player.health+.5);rest.visual.activate();this.saveCampaign();}
  if(this.player.body.bottom>this.fallLimits[index]!){this.player.health=0;(this.player as unknown as {lifeState:string}).lifeState='DEAD';this.player.body.setVelocity(0,0).setEnable(false);}
  const finalRoom=LATE_ROOMS[this.key][11]!;if(index===11&&this.player.grounded&&lateStandingOnExit(finalRoom,11,this.player.body)){this.complete();return;}
  this.hud.update();if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/450));
 }
 private complete():void{if(this.leaving)return;this.leaving=true;this.player.body.setVelocity(0,0);if(!this.state.devPreview&&canPersistCampaign({infiniteHealth:this.player.infiniteHealth,runEligible:campaignRunEligible()})){const p=completeLateChapter(loadProgress(),this.key,this.player.ultimateCharge);saveProgress(p);}
  this.physics.world.pause();this.add.image(320,200,'furnace-climax','panel').setDisplaySize(400,185).setScrollFactor(0).setDepth(72).setAlpha(.94);this.add.text(320,137,this.key==='stormworks'?'THE CITADEL SIGNAL IS RESTORED':'THE ROAD TO MEESE BEGINS',{fontFamily:'Georgia',fontSize:'16px',color:palette(this.key).story,align:'center',wordWrap:{width:360}}).setOrigin(.5).setScrollFactor(0).setDepth(73);
  const button=(x:number,label:string,action:()=>void)=>this.add.text(x,239,label,{fontFamily:'Georgia',fontSize:'12px',color:'#f1e2be',backgroundColor:'#27313b',padding:{x:13,y:9}}).setOrigin(.5).setScrollFactor(0).setDepth(74).setInteractive({useHandCursor:true}).on('pointerdown',action);
  button(188,'MENU',()=>this.scene.start('menu'));button(320,this.key==='stormworks'?'CONTINUE':'REVISIT CHAPTERS',()=>this.continueCampaign());button(452,'REPLAY',()=>this.replay());this.input.keyboard?.once('keydown-ENTER',()=>{if(this.key==='stormworks')this.continueCampaign();else this.scene.start('menu');});
 }
 private startRecord(key:LateChapterKey,mode:'continue'|'replay'):Start{if(this.state.devPreview)return {devPreview:true,previewSection:0,checkpoint:0,ultimateCharge:0,freshReplay:mode==='replay'};const progress=loadProgress();if(mode==='replay'){if(canPersistCampaign({infiniteHealth:this.player.infiniteHealth,runEligible:campaignRunEligible()}))saveProgress(resetChapter(progress,key));return {checkpoint:0,ultimateCharge:0,freshReplay:true};}const record=progress.chapters[key];return {checkpoint:record.checkpoint,ultimateCharge:record.charge};}
 private continueCampaign():void{if(this.key==='stormworks')this.scene.start('crown-edge',this.startRecord('crown-edge','continue'));else this.scene.start('menu');}
 private replay():void{this.scene.start(this.key,this.startRecord(this.key,'replay'));}
}
