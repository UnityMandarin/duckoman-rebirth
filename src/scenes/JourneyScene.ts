import Phaser from 'phaser';
import {TUNING} from '../config/tuning';
import {Player} from '../entities/Player';
import {BasicEnemy} from '../entities/BasicEnemy';
import {ThrowableObject} from '../entities/ThrowableObject';
import {CrabBoss} from '../entities/CrabBoss';
import {AntlerRegent} from '../entities/AntlerRegent';
import {BreakableWall} from '../entities/BreakableWall';
import {SolidDashable} from '../entities/SolidDashable';
import {InputController} from '../systems/InputController';
import {InteractionSystem} from '../systems/InteractionSystem';
import {ChapterHud,registerChapterHudFrames} from '../systems/ChapterHud';
import {preloadRelicArt} from '../systems/RelicArt';
import {ChapterTraps} from '../systems/ChapterTraps';
import {ChapterDepth} from '../systems/ChapterDepth';
import type {ChapterDepthSurface} from '../systems/ChapterDepth';
import type {ChapterSurface} from '../systems/ChapterTraps';
import type {AnimalSurface} from '../systems/animalRules';
import {CHAPTER_DIFFICULTY,encounterFor} from '../data/chapterChallenges';
import {chapterSections,CHAPTER_WIDTH,SECTION_WIDTH,chapterPlatforms} from '../data/chapters';
import type {ChapterKind,Ledge} from '../data/chapters';
import {isCheckpointContact,shouldCheckpoint} from '../systems/checkpointPolicy';
import {rectsOverlap} from '../systems/contactRules';
import {installHitboxDebug,showHitbox,tagBody} from '../systems/DebugHitboxes';
import {renderScale,setupRenderScale} from '../systems/renderScale';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,unlockAfter,SAVE_CHECKPOINTS,sceneDataFromProgress,canPersistCampaign,type CampaignScene} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible,onDebugChange,debugModeOn,debugToggle} from '../systems/debug/debugSettings';
import {recordTrialOutcome,saveProgress as persistTrial} from '../systems/progress';
import {TrialClock,TrialEligibility} from '../systems/trialRules';
import {enemyPatrolBounds} from '../systems/enemyPatrolBounds';
import {roomFor,JAIL_ROOMS,OUTSIDE_ROOMS} from '../data/qualityRooms';
import {addIdentityBlock,addIdentityChapterSigns,addIdentityDoor,addIdentityFloor,chapterSpikeFlipY,floorVisual,openIdentityDoor,platformVisual,preloadChapterIdentity,registerChapterIdentity,type IdentityDoor} from '../systems/ChapterVisuals';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';
import {addWorldEnvironment} from '../systems/WorldEnvironment';
import {DescentPredictor,predictedSurfaceMotionOffset,type DescentPrediction,type DescentPredictionInput,type PredictHazard,type PredictSurface,resetDescentPrediction} from '../systems/descentPrediction';
import {PredictiveDescentCamera,type DescentCameraFrame,type DescentCameraView} from '../systems/predictiveDescentCamera';
import type {TrapPredictionMotion,TrapPredictionWind} from '../systems/ChapterTraps';
import {QaFixtureReadiness,qaApproachSpawn,qaInitialInfiniteHealth} from '../systems/qaCameraFixture';
import {dangerLookaheadBottom,traversalCameraOwner,TraversalCameraRig} from '../systems/traversalCameraRig';
import {CameraQaTelemetry,visibleCameraQaSurfaceIds} from '../systems/cameraQaTelemetry';

interface JourneyState {infiniteHealth?:boolean;checkpoint?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;ultimateCharge?:number;devPreview?:boolean;previewSection?:number;practice?:boolean;qa?:boolean;qaStep?:number;qaDamage?:boolean;}
interface Gate {id:number;buttons:Phaser.GameObjects.Image[];labels:Phaser.GameObjects.Text[];wall:Phaser.GameObjects.Rectangle;door:IdentityDoor;}
interface JailPredictSurface extends PredictSurface {shape:Phaser.GameObjects.Rectangle;}
interface JailStaticHazard {room:number;data:PredictHazard;}

declare global {interface Window {__duckomanCameraQA?:{select:(room:number,step:number)=>void;options:(room:number)=>{step:number;id:string;top:number;left:number;right:number}[];command:(action:string)=>void;setIgnoreDamage:(ignore:boolean)=>void;status:()=>Record<string,unknown>;trace:()=>string;launches:()=>string;};}}

export class JourneyScene extends Phaser.Scene {
 private player!:Player;
 private controls!:InputController;
 private hud!:ChapterHud;
 private terrain!:Phaser.Physics.Arcade.StaticGroup;
 private cake!:ThrowableObject;
 private enemies:BasicEnemy[]=[];
 private gates:Gate[]=[];
 private secrets:{id:number;x:number;y:number;art:Phaser.GameObjects.Image;text:string}[]=[];
 private checkpoints:Phaser.GameObjects.Image[]=[];
 private checkpointVisuals=new WeakMap<Phaser.GameObjects.Image,CheckpointVisual>();
 private hazards:{x:number;y:number;width:number;height?:number;pit?:boolean}[]=[];
 private story!:Phaser.GameObjects.Text;
 private shadow!:Phaser.GameObjects.Ellipse;
 private state:JourneyState={};
 private platforms:Ledge[]=[];
 private animalSurfacesByRoom=new Map<number,AnimalSurface[]>();
 private section=-1;
 private storyUntil=0;
 private dying=false;
 private leaving=false;
 private boss?:AntlerRegent|CrabBoss;
 private depthPresentation!:ChapterDepth;
 private traps!:ChapterTraps;
 private walls:BreakableWall[]=[];
 private solids:SolidDashable[]=[];
 private devPreview=false;
 private previewSection?:number;
 private practice=false;private practiceBoss:'outside'|'crimson'='outside';private trialClock=new TrialClock();private trialHits=0;private trialEligibility=new TrialEligibility(true);private trialDone=false;
 private trialHud?:Phaser.GameObjects.Text;
 private jailCamera?:PredictiveDescentCamera;
 private jailRig?:TraversalCameraRig;
 private jailSurfaceAdapters:JailPredictSurface[]=[];
 private jailNearbySurfaces:PredictSurface[]=[];
 private jailStaticHazards:JailStaticHazard[]=[];
 private jailHazards:PredictHazard[]=[];
 private jailPrediction:DescentPrediction={state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false};
 private jailPredictionInput:DescentPredictionInput={x:0,y:0,vx:0,vy:0,halfWidth:23,halfHeight:20,grounded:false,horizontal:0,sprint:false,jumpAvailable:false,dashing:false,dashRemainingMs:0,gravity:TUNING.player.gravity,maxFall:TUNING.player.maxFallVelocity,runSpeed:TUNING.player.maxRunSpeed,sprintSpeed:TUNING.player.sprintSpeed,surfaces:this.jailNearbySurfaces,hazards:this.jailHazards};
 private jailMotionScratch:TrapPredictionMotion={axis:'x',base:0,phase:0,clockMs:0};
 private jailWindScratch:TrapPredictionWind={direction:0,strength:0,drift:0};
 private readonly jailCameraView:DescentCameraView={y:0,height:400,logicalHeight:TUNING.simulation.height,baseZoom:1,zoom:1,offsetY:0};
 private readonly jailCameraFrame:DescentCameraFrame={actorTop:0,actorBottom:0,targetBottom:null};
 private readonly jailCameraBounds=new Phaser.Geom.Rectangle();
 private qaDriveMs=0;private qaDriveHorizontal:-1|0|1=0;private qaSprint=false;private qaJumpNext=false;private qaDashNext=false;private qaUltimateNext=false;private qaFreezeMs=0;private qaLastReport=0;private qaMessage?: (event:MessageEvent)=>void;
 private qaTrace:Record<string,unknown>[]=[];
 private qaLaunches:{launchT:number;source:string|null;target:string|null;firstFitT:number|null;leadMs:number|null}[]=[];
 private readonly qaTelemetry=new CameraQaTelemetry();
 private qaPreviousGrounded=true;private qaLaunchTime=0;private qaFirstFitTime=0;private qaLaunchLeadMs:number|null=null;
 private qaMode=false;private qaSelectedStep=0;private qaSetupReady=false;
 private readonly qaReadiness=new QaFixtureReadiness();
 constructor(private readonly kind:ChapterKind,sceneKey:string=kind){super(sceneKey);}
 preload():void {
  preloadSceneAssets(this,this.kind);
  preloadChapterIdentity(this,this.kind);
  preloadRelicArt(this);
  const loading=this.add.text(320,200,this.kind==='jail'?'Beyond the bars…':'Beyond the fallen kingdom…',{fontFamily:'Georgia',fontSize:'16px',color:'#d8c59c'}).setOrigin(.5).setScrollFactor(0);
  this.load.once('complete',()=>loading.destroy());
 }
 create(data:JourneyState={}):void {
  registerCommonFrames(this);registerSharedPropFrames(this);registerChapterHudFrames(this);registerChapterIdentity(this,this.kind);this.devPreview=!!this.registry.get('devPreview')||!!data.devPreview;this.previewSection=data.previewSection;
  this.practice=!!data.practice;this.practiceBoss=this.kind==='crimson'?'crimson':'outside';this.trialClock=new TrialClock();this.trialHits=0;this.trialEligibility=new TrialEligibility(true);this.trialDone=false;
  const progress=loadProgress(),saved=progress.chapters[this.kind as CampaignScene];this.state=this.devPreview||this.practice?{opened:[],secrets:[],checkpoint:data.previewSection!==undefined?data.previewSection*SECTION_WIDTH:0,ultimateCharge:0}:{...saved,...data,opened:[...new Set([...saved.opened,...(data.opened??[])])],secrets:[...new Set([...saved.secrets,...(data.secrets??[])])]};
  this.enemies=[];this.gates=[];this.secrets=[];this.checkpoints=[];this.checkpointVisuals=new WeakMap();this.hazards=[];this.walls=[];this.solids=[];this.jailCamera=undefined;this.jailRig=undefined;this.jailSurfaceAdapters=[];this.jailNearbySurfaces.length=0;this.jailStaticHazards=[];this.jailHazards.length=0;this.qaDriveMs=0;this.qaDriveHorizontal=0;this.qaSprint=false;this.qaJumpNext=false;this.qaDashNext=false;this.qaUltimateNext=false;this.qaFreezeMs=0;this.qaTrace=[];this.qaLaunches=[];this.qaTelemetry.reset(false);this.qaPreviousGrounded=true;this.qaLaunchTime=0;this.qaFirstFitTime=0;this.qaLaunchLeadMs=null;this.qaSetupReady=false;this.qaReadiness.reset();
  this.section=-1;this.dying=false;this.leaving=false;this.boss=undefined;
  const width=CHAPTER_WIDTH[this.kind],arenaStart=(this.kind==='crimson'?10:22)*SECTION_WIDTH,arenaRight=width-400,previewStart=data.previewSection===undefined?0:data.previewSection*SECTION_WIDTH,qaPreview=!!data.qa&&this.devPreview&&['jail','outside','crimson'].includes(this.kind)&&['localhost','127.0.0.1'].includes(window.location.hostname),worldStart=this.practice?arenaStart:this.devPreview&&!qaPreview?previewStart:0,worldWidth=this.devPreview&&data.previewSection!==undefined&&!qaPreview?SECTION_WIDTH:this.practice?arenaRight-arenaStart:width;
  this.qaMode=qaPreview;this.qaSelectedStep=Number.isInteger(data.qaStep)?data.qaStep??0:0;
  const worldTop=this.kind==='jail'?-160:-160,worldBottom=this.kind==='jail'?1840:this.kind==='outside'?620:460;
  this.physics.world.resume();this.physics.world.setBounds(worldStart,worldTop,worldWidth,worldBottom-worldTop);
  this.cameras.main.setBounds(worldStart,worldTop,worldWidth,worldBottom-worldTop).setBackgroundColor(0x09131c);
  addWorldEnvironment(this,this.kind,this.practice?[arenaStart,arenaRight]:this.devPreview&&data.previewSection!==undefined&&!qaPreview?[previewStart,previewStart+SECTION_WIDTH]:undefined);
  this.createPitHazards(width,this.practice?[arenaStart,arenaRight]:this.devPreview&&data.previewSection!==undefined&&!qaPreview?[previewStart,previewStart+SECTION_WIDTH]:undefined);
  this.depthPresentation=new ChapterDepth(this,this.kind,width,false);
  this.terrain=this.physics.add.staticGroup();this.platforms=chapterPlatforms(this.kind).filter(p=>this.devPreview&&data.previewSection!==undefined&&!qaPreview?p.x>=previewStart&&p.x<previewStart+SECTION_WIDTH:true);
  const surfaces:ChapterSurface[]=[],floorIntervals=new Map<number,number>();this.animalSurfacesByRoom=new Map();
  const depthSurfaces:ChapterDepthSurface[]=[];
  for(const p of this.platforms){
   const body=this.add.rectangle(p.x,p.y,p.width,p.height,0x102027,0);this.physics.add.existing(body,true);this.terrain.add(body);
   const room=p.room??Math.floor(p.x/SECTION_WIDTH),roomSurfaces=this.animalSurfacesByRoom.get(room)??[];
   const liveBody=body.body as Phaser.Physics.Arcade.StaticBody;
   roomSurfaces.push({room,get left(){return liveBody.left;},get right(){return liveBody.right;},get top(){return liveBody.top;},get bottom(){return liveBody.bottom;},get enabled(){return liveBody.enable;}});this.animalSurfacesByRoom.set(room,roomSurfaces);
   if(p.role==='ledge'){
    const artFrame=platformVisual(this.kind,room,p.step??0),artHeight=artFrame==='shutter'?32:48;
    const art=addIdentityBlock(this,this.kind,{x:p.x,top:p.y-16,width:p.width,height:artHeight,frame:artFrame});
    surfaces.push({shape:body,art,ledge:p});
    depthSurfaces.push({shape:body,art,ledge:p});
   }else {
    depthSurfaces.push({shape:body,ledge:p});
    const top=p.y-p.height/2,room=p.room??Math.floor(p.x/SECTION_WIDTH),interval=floorIntervals.get(room)??0;floorIntervals.set(room,interval+1);
    addIdentityFloor(this,this.kind,{x:p.x,top,width:p.width,height:p.height,frame:floorVisual(this.kind,room,interval)});
   }
  }
  const bossPreview=this.kind!=='jail'&&['localhost','127.0.0.1'].includes(window.location.hostname)&&new URLSearchParams(window.location.search).has('boss');
  const qaStep=Number.isInteger(data.qaStep)?data.qaStep??0:0;
  const qaSurface=qaPreview?this.platforms.find(surface=>(surface.room??Math.floor(surface.x/SECTION_WIDTH))===this.previewSection&&(qaStep<0?surface.role==='floor':surface.role==='ledge'&&surface.step===qaStep)):undefined;
  const qaSpawn=qaSurface?(qaSurface.role==='floor'?qaSurface.x:qaApproachSpawn(qaSurface.x-qaSurface.width/2,qaSurface.x+qaSurface.width/2,TUNING.player.bodyWidth/2,320)):undefined;
  const spawn=this.practice?arenaStart+120:qaSpawn??(this.devPreview&&data.previewSection!==undefined?previewStart+40:bossPreview?(this.kind==='crimson'?10:22)*1440+120:this.state.checkpoint??100),spawnSurface=qaSurface??this.platforms.filter(surface=>surface.role==='floor'&&spawn>=surface.x-surface.width/2&&spawn<=surface.x+surface.width/2).sort((a,b)=>a.y-a.height/2-(b.y-b.height/2))[0],spawnY=spawnSurface?spawnSurface.y-spawnSurface.height/2-20:335;
  this.player=new Player(this,spawn,spawnY);this.player.infiniteHealth=qaInitialInfiniteHealth(qaPreview,data.qaDamage,data.infiniteHealth);this.player.ultimateCharge=data.ultimateCharge??this.state.ultimateCharge??saved.charge??0;
  this.shadow=this.add.ellipse(spawn,spawnY+25,54,9,0x000000,.35).setDepth(3);
  this.physics.add.collider(this.player.sprite,this.terrain);
  this.cake=new ThrowableObject(this,spawn+70,spawnY-7);this.physics.add.collider(this.cake.sprite,this.terrain);
  this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  this.story=this.add.text(320,110,'',{fontFamily:'Georgia',fontSize:'14px',color:'#ecd494',stroke:'#071019',strokeThickness:4,align:'center',wordWrap:{width:520}}).setOrigin(.5,0).setScrollFactor(0).setDepth(52);
  this.depthPresentation.setSurfaces(depthSurfaces);this.depthPresentation.setPlayer(this.player);this.depthPresentation.setShadow(this.shadow);if(!this.practice)this.populate();
  if(!this.practice)this.traps=new ChapterTraps(this,this.player,this.kind,surfaces,this.devPreview&&data.previewSection!==undefined&&!qaPreview?[data.previewSection]:undefined);
  if(this.kind==='jail'&&!this.practice){
   if(qaPreview||data.previewSection===undefined||data.previewSection===0)this.addGate(0,240,1740,[{x:140,y:1680}]);
   if(qaPreview||data.previewSection===undefined||data.previewSection===3)this.addGate(4,4*1440-70,1020,[{x:3*1440+1130,y:700}]);
   if(qaPreview||data.previewSection===undefined||data.previewSection===7)this.addGate(8,7*1440+1090,300,[{x:7*1440+805,y:72}]);
   if(qaPreview||data.previewSection===undefined||data.previewSection===11)this.addGate(12,12*1440-120,1740,[{x:11*1440+1120,y:1680}]);
  }else if(this.kind==='outside'){
   if(this.practice)this.boss=new AntlerRegent(this,this.player,this.cake,arenaStart,arenaRight,()=>this.finishTrial(),true,false,this.platforms.filter(p=>p.role==='ledge'&&p.x+p.width/2>arenaStart&&p.x-p.width/2<arenaRight).map(p=>({left:p.x-p.width/2,right:p.x+p.width/2,top:p.y-p.height/2})));
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===23))this.addGate(99,CHAPTER_WIDTH.outside-150,360,[]);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===22)&&!this.state.bossDefeated)this.boss=new AntlerRegent(this,this.player,this.cake,22*1440,CHAPTER_WIDTH.outside-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate)this.openGateArt(gate,700);
    this.say('The corruption breaks. The road to Franklin Fox is open.');
   },false,(this.state.checkpoint??0)>=22*SECTION_WIDTH,this.platforms.filter(p=>p.role==='ledge'&&p.x+p.width/2>22*SECTION_WIDTH&&p.x-p.width/2<CHAPTER_WIDTH.outside-400).map(p=>({left:p.x-p.width/2,right:p.x+p.width/2,top:p.y-p.height/2})));
  }
  if(this.kind==='crimson'){
   if(this.practice)this.boss=new CrabBoss(this,this.player,arenaStart,arenaRight,()=>this.finishTrial());
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===11))this.addGate(99,CHAPTER_WIDTH.crimson-150,360,[]);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===10)&&!this.state.bossDefeated)this.boss=new CrabBoss(this,this.player,10*1440,CHAPTER_WIDTH.crimson-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate)this.openGateArt(gate,700);
    this.say('The Crimson Claw falls. Beneath the throne, a prison beacon still pulses. Franklin is alive.');
   });
  }
  if(!this.practice)this.initializeJailPrediction(depthSurfaces,qaPreview,qaStep);
  this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(700);
  const hudCamera=setupRenderScale(this,'journey-hud');new SceneLayerRouter(this,hudCamera);this.qaSetupReady=qaPreview;
  addMenuControl(this,()=>this.openMenu());
  const escape=(event:KeyboardEvent)=>{if(event.repeat)return;if(!this.practice||!this.trialDone)this.openMenu();};this.input.keyboard?.on('keydown-ESC',escape);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown-ESC',escape));
  const pagehide=()=>this.saveCampaign();window.addEventListener('pagehide',pagehide);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>window.removeEventListener('pagehide',pagehide));
  if(!this.practice)this.saveCampaign();
  if(this.practice){this.trialHud=this.add.text(320,90,`${this.practiceBoss==='outside'?'BROKEN REGENT':'CRIMSON CLAW'} TRIAL · TIME 0.0 · HITS 0`,{fontSize:'10px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(61).setName('trial-hud');const invalidate=()=>{if(this.hasPracticeAssist())this.trialEligibility.invalidate();};const unsubscribe=onDebugChange(invalidate);this.events.once(Phaser.Scenes.Events.SHUTDOWN,unsubscribe);invalidate();const markGap=()=>this.trialClock.markGap();const visibility=()=>markGap();document.addEventListener('visibilitychange',visibility);this.events.on(Phaser.Scenes.Events.PAUSE,markGap);this.events.on(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.on(Phaser.Core.Events.BLUR,markGap);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{document.removeEventListener('visibilitychange',visibility);this.events.off(Phaser.Scenes.Events.PAUSE,markGap);this.events.off(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.off(Phaser.Core.Events.BLUR,markGap);});const damage=()=>this.trialHits++;this.events.on('player-damaged',damage);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off('player-damaged',damage));}
  installHitboxDebug(this);
 }
 /** Gameplay pit art and hazard registration: kept independent from background composition. */
 private initializeJailPrediction(depthSurfaces:readonly ChapterDepthSurface[],qaPreview:boolean,qaStep:number):void {
  this.jailCamera=new PredictiveDescentCamera();
  this.jailRig=new TraversalCameraRig(this,this.cameras.main,this.jailCamera);this.jailPrediction=this.jailRig.prediction;
  const pause=()=>this.jailCamera?.suspend(),resume=()=>this.jailCamera?.resume(),shutdown=()=>this.jailCamera?.destroy();
  this.events.on(Phaser.Scenes.Events.PAUSE,pause);this.events.on(Phaser.Scenes.Events.RESUME,resume);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.events.off(Phaser.Scenes.Events.PAUSE,pause);this.events.off(Phaser.Scenes.Events.RESUME,resume);shutdown();});
  for(let index=0;index<depthSurfaces.length;index++){
   const entry=depthSurfaces[index]!,body=entry.shape.body as Phaser.Physics.Arcade.StaticBody,room=entry.ledge.room??Math.floor(entry.ledge.x/SECTION_WIDTH);
   this.jailSurfaceAdapters.push({id:`r${room}:${entry.ledge.role??'ledge'}:${entry.ledge.step??index}`,room,left:body.left,right:body.right,top:body.top,bottom:body.bottom,enabled:body.enable,shape:entry.shape});
  }
  for(const gate of this.gates){
   const body=gate.wall.body as Phaser.Physics.Arcade.StaticBody,room=Math.floor(gate.wall.x/SECTION_WIDTH);
   this.jailSurfaceAdapters.push({id:`gate-${gate.id}`,room,left:body.left,right:body.right,top:body.top,bottom:body.bottom,enabled:body.enable,landing:false,shape:gate.wall});
  }
  for(let i=0;i<this.hazards.length;i++){
   const hazard=this.hazards[i]!,room=Math.floor(hazard.x/SECTION_WIDTH),pit=!!hazard.pit,top=pit?hazard.y:hazard.y-(hazard.height??20)/2,bottom=hazard.y+(pit?0:(hazard.height??20)/2);
   const data:PredictHazard={id:`${pit?'pit':'spike'}-${room}-${i}`,left:hazard.x-hazard.width/2,right:hazard.x+hazard.width/2,top,bottom,active:false,kind:pit?'pit':'spike'};
   this.jailStaticHazards.push({room,data});this.jailHazards.push(data);
  }
  if(qaPreview)this.installJailCameraQA(qaStep);
 }
 private updateJailPredictionCamera(input:{horizontal:-1|0|1;sprintHeld?:boolean},delta:number):void {
  const player=this.player,camera=this.cameras.main,controller=this.jailCamera;if(!player||!controller)return;
  const bossOwnsCamera=!!this.boss&&(this.boss instanceof AntlerRegent||this.boss instanceof CrabBoss)&&this.boss.ownsCamera;
  const active=this.scene.isActive()&&!this.physics.world.isPaused&&document.visibilityState==='visible';
  if(!active){controller.suspend();return;}
  controller.resume();
  const room=Math.floor(player.body.center.x/SECTION_WIDTH);
  this.jailNearbySurfaces.length=0;
  for(const surface of this.jailSurfaceAdapters){
   const body=surface.shape.body as Phaser.Physics.Arcade.StaticBody;surface.enabled=body.enable;surface.room=Math.floor(body.center.x/SECTION_WIDTH);
   if(Math.abs(surface.room-room)>1)continue;
   const moving=surface.landing!==false&&this.traps.predictionMotion(surface.shape,this.jailMotionScratch);
   if(moving){
    surface.motion??={axis:'x',base:0,phase:0,clockMs:0};surface.motion.axis=this.jailMotionScratch.axis;surface.motion.base=this.jailMotionScratch.base;surface.motion.phase=this.jailMotionScratch.phase;surface.motion.clockMs=this.jailMotionScratch.clockMs;
    const current=predictedSurfaceMotionOffset(surface.motion);
    if(surface.motion.axis==='x'){surface.left=surface.motion.base+current-body.width/2;surface.right=surface.motion.base+current+body.width/2;surface.top=body.top;surface.bottom=body.bottom;}
    else{surface.left=body.left;surface.right=body.right;surface.top=surface.motion.base+current-body.height/2;surface.bottom=surface.motion.base+current+body.height/2;}
   }else{surface.motion=undefined;surface.left=body.left;surface.right=body.right;surface.top=body.top;surface.bottom=body.bottom;}
   this.jailNearbySurfaces.push(surface);
  }
  for(const item of this.jailStaticHazards)item.data.active=Math.abs(item.room-room)<=1;
  this.traps.fillPredictionHazards(this.jailHazards,this.jailStaticHazards.length,room-1,room+1);
  const model=this.jailPredictionInput,body=player.body,now=this.time.now;
  model.x=body.center.x;model.y=body.center.y;model.vx=body.velocity.x;model.vy=body.velocity.y;model.halfWidth=body.width/2;model.halfHeight=body.height/2;model.grounded=player.grounded;model.supportId=undefined;
  model.horizontal=input.horizontal;model.sprint=!!player.sprinting||!!input.sprintHeld;model.jumpAvailable=player.grounded&&player.canAct;model.dashing=player.isDashing;model.dashRemainingMs=player.dashRemainingMs;
  this.traps.predictionWind(room,this.jailWindScratch);model.windDirection=this.jailWindScratch.direction;model.windStrength=this.jailWindScratch.strength;model.windDrift=this.jailWindScratch.drift;
  model.horizontalDrift=0;
  if(player.grounded){for(const surface of this.jailSurfaceAdapters){const live=surface.shape.body as Phaser.Physics.Arcade.StaticBody;if(live.enable&&body.right>live.left&&body.left<live.right&&Math.abs(body.bottom-live.top)<10){model.supportId=surface.id;model.horizontalDrift=this.traps.predictionSurfaceDrift(surface.shape);break;}}}
  model.gravity=TUNING.player.gravity;model.maxFall=TUNING.player.maxFallVelocity;model.runSpeed=TUNING.player.maxRunSpeed;model.sprintSpeed=TUNING.player.sprintSpeed;
  const view=camera.worldView,baseZoom=renderScale(),actorTop=player.visual.y-player.visual.displayHeight/2,actorBottom=player.visual.y+player.visual.displayHeight/2;
  if(view.height<=0||view.width<=0)return;
  let targetBottom:number|null=null;
  if(this.jailPrediction.state==='landing'){
   targetBottom=Math.max(this.jailPrediction.targetY+20,this.jailPrediction.risk?this.jailPrediction.riskBottom??this.jailPrediction.targetY+20:this.jailPrediction.targetY+20);
  }else if(this.jailPrediction.state==='danger')targetBottom=dangerLookaheadBottom({y:view.y,height:view.height,logicalHeight:TUNING.simulation.height,baseZoom,zoom:camera.zoomY,offsetY:camera.followOffset.y},actorTop);
  const target=this.jailSurfaceAdapters.find(surface=>surface.id===this.jailPrediction.targetId),framing=this.jailCameraFrame,projection=this.jailCameraView,bounds=camera.getBounds(this.jailCameraBounds);framing.actorTop=actorTop;framing.actorBottom=actorBottom;framing.targetBottom=targetBottom;framing.targetLeft=target?.left;framing.targetRight=target?.right;framing.hazardLeft=this.jailPrediction.risk?this.jailPrediction.riskLeft:undefined;framing.hazardRight=this.jailPrediction.risk?this.jailPrediction.riskRight:undefined;projection.x=view.x;projection.width=view.width;projection.y=view.y;projection.height=view.height;projection.baseZoom=baseZoom;projection.zoom=camera.zoomY;projection.offsetY=camera.followOffset.y;projection.boundsTop=camera.useBounds?bounds.top:undefined;projection.boundsBottom=camera.useBounds?bounds.bottom:undefined;
  const bossApproach=(this.kind==='outside'&&body.center.x>=22*SECTION_WIDTH-400||this.kind==='crimson'&&body.center.x>=10*SECTION_WIDTH-400);if(bossApproach&&!bossOwnsCamera){this.jailRig?.neutralize(delta,true,player.active&&!player.usingUltimate);if((window as Window).__duckomanCameraQA&&now-this.qaLastReport>=50){this.qaLastReport=now;window.parent.postMessage({type:'duckoman-camera-status',status:this.jailCameraStatus(undefined,view,actorTop,actorBottom,targetBottom)},'*');}return;}
  const status=this.jailRig?.update(model,framing,delta,traversalCameraOwner(!!this.boss,bossOwnsCamera),true,player.active&&!player.usingUltimate)??controller.update(this.jailPrediction,projection,framing,delta,true,player.active&&!player.usingUltimate);
  if((window as Window).__duckomanCameraQA&&now-this.qaLastReport>=50){this.qaLastReport=now;window.parent.postMessage({type:'duckoman-camera-status',status:this.jailCameraStatus(status,view,actorTop,actorBottom,targetBottom)},'*');}
 }
 private jailCameraStatus(status?:unknown,view=this.cameras.main.worldView,actorTop=(this.player?.visual.y??30)-30,actorBottom=(this.player?.visual.y??-30)+30,targetBottom:number|null=null):Record<string,unknown>{
  const controller=this.jailCamera,zoomRatio=this.cameras.main.zoomY/renderScale(),screenY=(y:number)=>view.height?(y-view.y)/view.height*TUNING.simulation.height:null,screenX=(x:number)=>view.width?(x-view.x)/view.width*TUNING.simulation.width:null;
  const target=this.jailSurfaceAdapters.find(surface=>surface.id===controller?.targetId),targetY=controller?.targetY,targetScreenY=targetY!==undefined?screenY(targetY):targetBottom===null?null:screenY(targetBottom),targetProjected=target&&targetY!==undefined?{left:screenX(target.left),right:screenX(target.right),top:screenY(targetY),bottom:screenY(targetY+(target.bottom-target.top))}:null;
  const actorProjected={top:screenY(actorTop),bottom:screenY(actorBottom)},usableTouchdown=target?Math.min(view.width,target.right-view.x)-Math.max(0,target.left-view.x)>=56:false,hazard=controller?.risk&&controller.riskLeft!==undefined?{left:screenX(controller.riskLeft)??0,right:screenX(controller.riskRight??controller.riskLeft)??0}:null,hazardVisible=!hazard||Math.min(TUNING.simulation.width,hazard.right)>Math.max(0,hazard.left),targetSafeBottom=targetY===undefined?null:Math.max(targetY+20,controller?.risk&&controller.riskBottom!==undefined?controller.riskBottom:targetY+20),targetSafeScreen=targetSafeBottom===null?null:screenY(targetSafeBottom),projectedFit=typeof actorProjected.top==='number'&&typeof actorProjected.bottom==='number'&&actorProjected.top>=120&&actorProjected.bottom<=370&&typeof targetSafeScreen==='number'&&targetSafeScreen<=370&&usableTouchdown&&hazardVisible,body=this.player?.body,support=this.jailSurfaceAdapters.find(surface=>!!body&&surface.enabled&&body.right>surface.left&&body.left<surface.right&&Math.abs(body.bottom-surface.top)<5),normalAlreadyVisible=!target&&typeof actorProjected.top==='number'&&typeof actorProjected.bottom==='number'&&actorProjected.top>=120&&actorProjected.bottom<=370&&this.jailSurfaceAdapters.some(surface=>surface.enabled&&surface.top>(support?.top??Infinity)+32&&typeof screenY(surface.top)==='number'&&(screenY(surface.top) as number)>=120&&(screenY(surface.top) as number)<=370);
  const visibleSurfaceIds=visibleCameraQaSurfaceIds({x:view.x,y:view.y,width:view.width,height:view.height,logicalWidth:TUNING.simulation.width,logicalHeight:TUNING.simulation.height},actorProjected,this.jailSurfaceAdapters,this.jailHazards);
  return {x:this.player?.body.center.x,y:this.player?.body.center.y,vx:this.player?.body.velocity.x,vy:this.player?.body.velocity.y,grounded:this.player?.grounded,state:controller?.state,targetId:controller?.targetId,targetX:controller?.targetX,targetY:controller?.targetY,risk:controller?.risk,riskKind:controller?.riskKind,riskBounds:controller?.risk&&controller.riskLeft!==undefined?{left:controller.riskLeft,right:controller.riskRight,top:controller.riskTop,bottom:controller.riskBottom}:null,zoomRatio,offsetY:this.cameras.main.followOffset.y,worldView:{x:view.x,y:view.y,width:view.width,height:view.height},actorScreen:actorProjected,targetScreenY,targetProjected,targetSafeScreen,projectedFit,normalAlreadyVisible,visibleSurfaceIds,visible:projectedFit,owner:controller?.owner,supports:this.jailSurfaceAdapters.filter(s=>s.enabled&&Math.floor(s.room)===Math.floor((this.player?.body.center.x??0)/SECTION_WIDTH)).map(s=>({id:s.id,left:s.left,right:s.right,top:s.top})),diagnostic:status};
 }
 private installJailCameraQA(step:number):void {
  const local=import.meta.env.DEV&&['localhost','127.0.0.1'].includes(window.location.hostname);if(!local)return;const player=this.player;
  const qaSurface=()=>this.jailSurfaceAdapters.find(surface=>surface.room===this.previewSection&&(step<0?surface.id.startsWith(`r${this.previewSection}:floor:`):surface.id===`r${this.previewSection}:ledge:${step}`));
  const select=(room:number,nextStep:number)=>this.scene.restart({devPreview:true,previewSection:room,qa:true,qaStep:nextStep});
  const command=(action:string)=>{
   const source=qaSurface(),player=this.player;if(!player)return;
   if(action==='clearTrace'){this.qaTrace.length=0;this.qaLaunches.length=0;this.qaFirstFitTime=0;this.qaLaunchTime=0;this.qaLaunchLeadMs=null;this.qaPreviousGrounded=player.grounded;this.qaTelemetry.reset(player.grounded);return;}
   if(action==='approach'){this.scene.restart({devPreview:true,previewSection:this.previewSection,qa:true,qaStep:step,qaDamage:!player.infiniteHealth});return;}
   if(action==='walkRight'||action==='walkLeft'||action==='sprintRight'||action==='sprintLeft'||action==='walkRightLong'||action==='walkLeftLong'||action==='sprintRightLong'||action==='sprintLeftLong'){
    this.qaDriveMs=action.endsWith('Long')?1200:300;this.qaDriveHorizontal=action.includes('Left')?-1:1;this.qaSprint=action.startsWith('sprint');return;
   }
   if(action==='takeoff'){this.qaJumpNext=true;return;}
   if(action==='dash'){this.qaDashNext=true;return;}
   if(action==='ultimate'){this.player.ultimateCharge=100;this.qaUltimateNext=true;return;}
   if(action==='retry'){select(this.previewSection??0,step);return;}
   if(action==='freeze200'||action==='freeze300'){this.qaFreezeMs=Number(action.slice(6));return;}
   if(action==='pause'){this.physics.world.pause();return;}
   if(action==='resume'){this.physics.world.resume();this.jailCamera?.resume();return;}
   if(action==='fall'&&source){player.sprite.setPosition(Math.min(source.right-30,source.left+60),source.top+55);player.body.reset(player.sprite.x,player.sprite.y);player.body.setAllowGravity(true);player.body.setVelocity(0,320);return;}
   if(action==='landing'&&this.jailCamera?.targetId){const target=this.jailSurfaceAdapters.find(surface=>surface.id===this.jailCamera?.targetId);if(target){const body=target.shape.body as Phaser.Physics.Arcade.StaticBody;player.sprite.setPosition(body.center.x,body.top-80);player.body.reset(player.sprite.x,player.sprite.y);player.body.setAllowGravity(true);player.body.setVelocity(0,420);}}
  };
  const ready=()=>{
   const support=qaSurface(),body=player.body,staticBody=support?.shape.body as Phaser.Physics.Arcade.StaticBody|undefined,view=this.cameras.main.worldView;
   const sourceContact=!!support&&!!staticBody?.enable&&player.grounded&&body.right>staticBody.left&&body.left<staticBody.right&&body.bottom>=staticBody.top-2&&body.bottom<=staticBody.top+3;
   return this.qaReadiness.observe(sourceContact,this.qaSetupReady&&view.width>0&&view.height>0);
  };
  const setIgnoreDamage=(ignore:boolean)=>{player.infiniteHealth=ignore;};
  const camera=this.cameras.main,postRender=()=>{
   if(!ready())return;
   const view=camera.worldView,actorTop=this.player.visual.y-this.player.visual.displayHeight/2,actorBottom=this.player.visual.y+this.player.visual.displayHeight/2,status=this.jailCameraStatus(undefined,view,actorTop,actorBottom),fit=!!status.projectedFit,grounded=this.player.grounded,now=this.time.now;
   const targetId=typeof status.targetId==='string'?status.targetId:null,body=this.player.body,support=this.jailSurfaceAdapters.find(surface=>{const live=surface.shape.body as Phaser.Physics.Arcade.StaticBody;return live.enable&&body.right>live.left&&body.left<live.right&&Math.abs(body.bottom-live.top)<5;}),visibleIds=Array.isArray(status.visibleSurfaceIds)?status.visibleSurfaceIds as string[]:[],launch=this.qaTelemetry.sample(now,grounded,support?.id??null,targetId,visibleIds);if(launch)this.qaLaunches.push(launch);
   this.qaPreviousGrounded=grounded;
   this.qaTrace.push({t:now,x:this.player.body.center.x,y:this.player.body.center.y,vx:this.player.body.velocity.x,vy:this.player.body.velocity.y,grounded,state:String(status.state??''),targetId:status.targetId as string|undefined,risk:!!status.risk,riskBounds:status.riskBounds,zoomRatio:Number(status.zoomRatio),offsetY:Number(status.offsetY),actualFit:fit,visibleSurfaceIds:visibleIds,worldView:status.worldView,actorScreen:status.actorScreen,normalAlreadyVisible:!!status.normalAlreadyVisible,launchLeadMs:launch?.leadMs??null});
  };
  camera.on(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>camera.off(Phaser.Cameras.Scene2D.Events.POST_RENDER,postRender));
  const options=(room:number)=>{const matching=this.jailSurfaceAdapters.filter(surface=>surface.id.startsWith(`r${room}:`));const floor=matching.find(surface=>surface.id.startsWith(`r${room}:floor:`));return [...(floor?[floor]:[]),...matching.filter(surface=>surface.id.startsWith(`r${room}:ledge:`))].map(surface=>({step:surface.id.startsWith(`r${room}:floor:`)?-1:Number(surface.id.split(':').at(-1)),id:surface.id,top:surface.top,left:surface.left,right:surface.right}));};
  const api={select,options,command,setIgnoreDamage,status:()=>({...this.jailCameraStatus(),ready:ready(),damageIgnored:player.infiniteHealth}),trace:()=>JSON.stringify(this.qaTrace),launches:()=>JSON.stringify(this.qaLaunches)};window.__duckomanCameraQA=api;
  this.qaMessage=event=>{if(event.source!==window.parent||event.data?.type!=='duckoman-camera-command')return;const data=event.data as {action?:string;room?:number;step?:number};if(data.action==='select'&&Number.isInteger(data.room)&&Number.isInteger(data.step))select(data.room!,data.step!);else if(data.action)command(data.action);};
  window.addEventListener('message',this.qaMessage);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{if(window.__duckomanCameraQA===api)delete window.__duckomanCameraQA;if(this.qaMessage)window.removeEventListener('message',this.qaMessage);});
 }
 private createPitHazards(width:number,sectionBounds?:readonly [number,number]):void {
  const start=sectionBounds?.[0]??0,end=sectionBounds?.[1]??width,first=Math.max(0,Math.floor(start/SECTION_WIDTH)),last=Math.min(Math.ceil(end/SECTION_WIDTH),Math.ceil(width/SECTION_WIDTH));
  const floors=this.kind==='jail'?JAIL_ROOMS:this.kind==='outside'?OUTSIDE_ROOMS:[];
  for(let i=first;i<last;i++){
   const room=floors[i],floorY=room?.floor??360;
   if(room){
    const gaps:number[][]=[];let at=0;for(const[a,b]of room.intervals){if(a>at)gaps.push([at,a]);at=b;}if(at<1440)gaps.push([at,1440]);
    const bedY=this.kind==='jail'?1820:520;
    for(const[a,b]of gaps){const gx=i*SECTION_WIDTH+(a+b)/2,gw=b-a;
     const leftAdjacent=room.intervals.findIndex(([,end])=>end===a),rightAdjacent=room.intervals.findIndex(([start])=>start===b);
     if(leftAdjacent>=0){const intervalWidth=room.intervals[leftAdjacent]![1]-room.intervals[leftAdjacent]![0],capWidth=Math.min(100,intervalWidth);addIdentityBlock(this,this.kind,{x:i*SECTION_WIDTH+a-capWidth/2,top:floorY,width:capWidth,height:48,frame:floorVisual(this.kind,i,leftAdjacent),depth:2}).setFlipX(true);}
     if(rightAdjacent>=0){const intervalWidth=room.intervals[rightAdjacent]![1]-room.intervals[rightAdjacent]![0],capWidth=Math.min(100,intervalWidth);addIdentityBlock(this,this.kind,{x:i*SECTION_WIDTH+b+capWidth/2,top:floorY,width:capWidth,height:48,frame:floorVisual(this.kind,i,rightAdjacent),depth:2});}
     for(let sx=i*SECTION_WIDTH+a+42;sx<i*SECTION_WIDTH+b-30;sx+=84)this.add.image(sx,bedY,`identity-${this.kind}`,'spikes').setOrigin(.5,1).setDisplaySize(84,38).setFlipY(chapterSpikeFlipY(this.kind)).setDepth(2);
     this.hazards.push({x:gx,y:bedY,width:gw,pit:true});
    }
   }
  }
 }
 private populate():void {
  const sections=chapterSections(this.kind);
  sections.forEach((section,i)=>{
   if(this.devPreview&&this.previewSection!==undefined&&i!==this.previewSection)return;
   const x=i*SECTION_WIDTH;
   if(this.kind==='crimson'){
    const stains=this.add.graphics().setDepth(1);
    for(let j=0;j<6;j++)stains.fillStyle(j%2?0x8e142e:0x490b22,.72).fillEllipse(x+210+j*209,363+j%3*8,46+j%3*17,6+j%2*4);
   }
   const quality=roomFor(this.kind,i);
   addIdentityChapterSigns(this,this.kind,i,x,quality?.floor??360);
   if((quality?.checkpoint!==undefined||(!quality&&shouldCheckpoint(this.kind,i)))){
    const floorY=quality?.floor??360,checkpoint=this.add.image(x+80,floorY-28,`identity-${this.kind}`,'rest').setDisplaySize(30,54).setDepth(4).setData('floorY',floorY);this.checkpoints.push(checkpoint);
    this.checkpointVisuals.set(checkpoint,addCheckpointVisual(this,checkpoint,{coreYRatio:this.kind==='crimson'?.37:this.kind==='jail'?.60:.65,haloColor:this.kind==='crimson'?0xff443b:0xffc95f,coreColor:this.kind==='crimson'?0xffb18b:0xffefb0,initiallyActive:checkpoint.x<=(this.state.checkpoint??0)}));
   }
   if(section.secret&&!this.state.secrets!.includes(i)){
    const route=this.platforms.filter(p=>p.room===i&&p.role==='ledge');
    const ledge=route.reduce((best,p)=>p.y<best.y?p:best,route[0]);
    const art=this.add.image(ledge.x+45,ledge.y-49,'sealed-dispatch').setDisplaySize(28,24).setDepth(5);
    this.secrets.push({id:i,x:ledge.x+45,y:ledge.y-49,art,text:section.secret});
    if(i%2===1){
     const body=this.add.rectangle(ledge.x-20,ledge.y-52,24,72,0,0);this.physics.add.existing(body,true);tagBody(body,'target');
     const rock=this.add.image(body.x,body.y,'cracked-stone-wall').setDisplaySize(28,76).setDepth(6);
     this.physics.add.collider(this.player.sprite,body);this.physics.add.collider(this.cake.sprite,body);this.walls.push(new BreakableWall(this,body,[rock]));
    }
   }
   if(i===0||this.kind==='outside'&&i>=22||this.kind==='crimson'&&i>=10)return;
   const encounter=encounterFor(this.kind,i)!;
   const ledges=this.platforms.filter(platform=>platform.room===i);
   for(const placement of encounter.enemies){
    const ex=x+placement.x,support=placement.support==='floor'?ledges.find(p=>p.role==='floor'&&ex>=p.x-p.width/2&&ex<=p.x+p.width/2):ledges.find(p=>p.role==='ledge'&&p.step===placement.support),supportTop=support?support.y-support.height/2:360,ey=supportTop-25,span=placement.patrol;
    const pointed=placement.type==='pointed',jumper=placement.type==='jumper'||placement.type==='hare';
    const skin=placement.type==='boar'?'thorn-boar':placement.type==='hare'?'gloom-hare':undefined;
    const enemy=new BasicEnemy(this,ex,ey,{left:ex-span,right:ex+span},pointed,jumper,skin);
    const patrol=support?enemyPatrolBounds({...placement,x:ex,y:ey},[support],enemy.body.width):undefined;
    if(patrol)enemy.setPatrolBounds(patrol);
    if(this.kind==='crimson'){enemy.hp=2;enemy.visual.setTint(0xff596a);}
    if(skin)enemy.configureAnimal(this.player,this.animalSurfacesByRoom.get(i)??[],CHAPTER_DIFFICULTY[this.kind]);
    else enemy.body.setMaxVelocity(100*CHAPTER_DIFFICULTY[this.kind],900);
    this.physics.add.collider(enemy.sprite,this.terrain);
    const contacts=new InteractionSystem(this.player,enemy,this.cake);
    this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>contacts.resolvePlayerEnemy());
    this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>contacts.resolveThrownEnemy());this.enemies.push(enemy);
   }
   for(const spike of encounter.spikes){const entry=typeof spike==='number'?{x:spike,support:'floor' as const}:spike,hx=x+entry.x,support=entry.support==='floor'?ledges.find(p=>p.role==='floor'&&hx>=p.x-p.width/2&&hx<=p.x+p.width/2):ledges.find(p=>p.role==='ledge'&&p.step===entry.support),top=support?support.y-support.height/2:360;
    this.hazards.push({x:hx,y:top,width:72,height:20});this.add.image(hx,top,`identity-${this.kind}`,'spikes').setOrigin(.5,1).setDisplaySize(84,42).setFlipY(chapterSpikeFlipY(this.kind)).setDepth(4);
   }
  });
 }
 private addGate(id:number,x:number,ground:number,buttons:{x:number;y:number}[]):void {
  const wall=this.add.rectangle(x,ground-280,42,560,0,0);this.physics.add.existing(wall,true);
  this.physics.add.collider(this.player.sprite,wall);this.physics.add.collider(this.cake.sprite,wall);
  const opened=this.state.opened!.includes(id),door=addIdentityDoor(this,this.kind,{x,ground,width:42,height:560,opened});
  const images=buttons.map(b=>this.add.image(b.x,b.y,`identity-${this.kind}`,'latch').setDisplaySize(28,48).setDepth(7));
  const labels=buttons.map(b=>this.add.text(b.x,b.y+28,'J',{fontFamily:'Georgia',fontSize:'9px',color:'#f4e4c2',stroke:'#10141b',strokeThickness:2}).setOrigin(.5,0).setDepth(8));
  if(opened)(wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;
  this.gates.push({id,buttons:images,labels,wall,door});
 }
 private openGateArt(gate:Gate,duration:number):void {
  (gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;
  openIdentityDoor(this,this.kind,gate.door,duration);
 }
 private forcePitDeath(attackerX:number):void {
  if(!this.player.active||this.dying)return;
  this.player.infiniteHealth=false;
  const accepted=this.player.takeDamage(attackerX,Math.max(3,this.player.health));
  if(!accepted){const runtime=this.player as unknown as {lifeState:string;invulnerableUntil:number;ultimateUntil:number};runtime.invulnerableUntil=0;runtime.ultimateUntil=0;runtime.lifeState='DEAD';this.player.health=0;this.player.body.setVelocity(0,0).setEnable(false);this.player.visual.setAlpha(.35);}
 }
 private say(message:string):void {this.story.setText(message).setAlpha(1);this.storyUntil=this.time.now+6500;}
 update(_time:number,delta:number):void {
  if(!this.player||this.leaving)return;
  if(!this.player.active)this.jailCamera?.suspend();
  const input=this.controls.read();
  if(this.qaDriveMs>0){input.horizontal=this.qaDriveHorizontal;input.sprintHeld=this.qaSprint;this.qaDriveMs=Math.max(0,this.qaDriveMs-delta);if(this.qaDriveMs===0){this.qaDriveHorizontal=0;this.qaSprint=false;}}
  if(this.qaJumpNext){input.jumpPressed=true;this.qaJumpNext=false;}
  if(this.qaDashNext){input.dashPressed=true;this.qaDashNext=false;}
  if(this.qaUltimateNext){input.ultimatePressed=true;this.qaUltimateNext=false;}
  if(input.godModePressed){if(this.practice)this.trialEligibility.invalidate();else markCampaignRunIneligible();this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}
  if(this.practice){if(this.hasPracticeAssist())this.trialEligibility.invalidate();const regent=this.boss instanceof AntlerRegent?this.boss:undefined;regent?.beforePlayerUpdate(delta);const elapsed=this.trialClock.tick(delta,{active:this.scene.isActive()&&!regent?.controlsLocked,visible:document.visibilityState==='visible',alive:this.player.active,finished:this.trialDone});if(!this.trialDone){if(regent?.controlsLocked)regent.holdPlayer();else this.player.update(input,delta);if(input.ultimatePressed&&!regent?.controlsLocked&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();this.hud.update();this.cake.follow(this.player);this.cake.update(delta);this.boss?.update(delta);this.depthPresentation.update();this.trialHud?.setText(`${this.practiceBoss==='outside'?'BROKEN REGENT':'CRIMSON CLAW'} TRIAL · TIME ${(elapsed/1000).toFixed(1)} · HITS ${this.trialHits}`);if(!this.player.active)this.finishTrial(false);}return;}
  this.hud.update();
  if(!this.player.active){
   if(!this.dying){this.dying=true;this.cake.drop();this.say('Fell — returning to your last rest');this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge,devPreview:this.devPreview,previewSection:this.previewSection,qa:this.qaMode,qaStep:this.qaSelectedStep,qaDamage:!this.player.infiniteHealth}));}return;
  }
  const regent=this.boss instanceof AntlerRegent?this.boss:undefined;regent?.beforePlayerUpdate(delta);if(regent?.controlsLocked)regent.holdPlayer();else this.player.update(input,delta);
  for(const wall of this.walls)wall.checkDash(this.player);
  for(const solid of this.solids)solid.checkDash(this.player);
  if(input.ultimatePressed&&!regent?.controlsLocked&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();
  let interacted=false;
  for(const gate of this.gates){
   if(this.state.opened!.includes(gate.id))continue;
   gate.buttons.forEach(b=>showHitbox(this,'interact',{x:b.x,y:b.y,radius:65}));
   const near=gate.buttons.some(b=>Phaser.Math.Distance.Between(b.x,b.y,this.player.sprite.x,this.player.sprite.y)<65);gate.buttons.forEach(b=>b.setTint(near?0xffde95:0xffffff));
   if(near&&input.throwPressed&&this.player.canAct){
    interacted=true;this.state.opened!.push(gate.id);this.openGateArt(gate,650);this.saveCampaign();
    gate.buttons.forEach(b=>b.setTint(0x7fe0b0));this.say(gate.id===0?'Free of the cell. The eastern sluice is my way out.':'Lock released.');
   }
  }
  if(input.throwPressed&&!interacted&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);
  this.cake.follow(this.player);this.cake.update(delta);
  for(const enemy of this.enemies){if(enemy.defeated)continue;const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<850&&Math.abs(enemy.sprite.y-this.player.sprite.y)<650;enemy.setAwake(awake);if(awake){enemy.update(true,delta);enemy.body.setVelocityX(enemy.body.velocity.x*CHAPTER_DIFFICULTY[this.kind]);}}
  this.traps.update();
  for(const h of this.hazards){
   if(h.pit){if(this.player.body.bottom>=h.y&&this.player.body.velocity.y>=0)this.forcePitDeath(h.x);continue;}
   const halfH=(h.height??20)/2,zone={left:h.x-h.width/2,right:h.x+h.width/2,top:h.y-halfH,bottom:h.y+halfH};
   showHitbox(this,'danger',zone);
   if(rectsOverlap(this.player.body,zone))this.player.takeDamage(h.x,1);
  }
  const sections=chapterSections(this.kind);
  const index=Math.max(0,Math.min(Math.floor(this.player.sprite.x/1440),sections.length-1));
  if(index!==this.section){this.section=index;const section=sections[index],room=roomFor(this.kind,index),story=room?.story??section.story;if(story)this.say(story);}
  for(const checkpoint of this.checkpoints)if((this.kind==='jail'?isCheckpointContact(this.player.sprite.x,this.player.body.bottom,checkpoint.x,checkpoint.getData('floorY')??360):Math.abs(this.player.sprite.x-checkpoint.x)<35)&&this.player.grounded&&checkpoint.x>(this.state.checkpoint??0)){
   this.state.checkpoint=checkpoint.x;this.player.health=Math.min(3,this.player.health+.5);this.state.ultimateCharge=this.player.ultimateCharge;this.checkpointVisuals.get(checkpoint)?.activate();this.say('Checkpoint · Half a heart restored.');this.saveCampaign();
  }
  for(const secret of this.secrets){
   if(!secret.art.active)continue;secret.art.setAngle(Math.sin(this.time.now*.003)*8);
   showHitbox(this,'interact',{x:secret.x,y:secret.y,radius:40});
   if(Phaser.Math.Distance.Between(this.player.sprite.x,this.player.sprite.y,secret.x,secret.y)<40){secret.art.destroy();this.state.secrets!.push(secret.id);this.player.chargeUltimate(20);this.say(secret.text);this.saveCampaign();}
  }
  this.boss?.update(delta);
  this.depthPresentation.update();
  if(!this.practice)this.updateJailPredictionCamera(input,delta);
  if(this.qaFreezeMs>0){this.qaFreezeMs=Math.max(0,this.qaFreezeMs-delta);if(this.qaFreezeMs===0)this.physics.world.pause();}
  if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
  if(this.kind==='jail'&&this.player.sprite.x>CHAPTER_WIDTH.jail-40&&this.player.grounded&&Math.abs(this.player.body.bottom-1740)<20&&this.state.opened!.includes(12)){
   this.completeAndAdvance('outside');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('outside',{...sceneDataFromProgress(p,'outside'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});
  }else if(this.player.sprite.x>CHAPTER_WIDTH[this.kind]-40){
   if(this.state.bossDefeated&&this.kind==='outside'){this.completeAndAdvance('crimson');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('crimson',{...sceneDataFromProgress(p,'crimson'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});}
   else if(this.state.bossDefeated&&this.kind==='crimson'){this.completeAndAdvance('rescue');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('rescue',{...sceneDataFromProgress(p,'rescue'),devPreview:this.devPreview});});}
  }
 }
 private canPersist():boolean{return canPersistCampaign({devPreview:this.devPreview,infiniteHealth:this.player?.infiniteHealth,runEligible:campaignRunEligible()});}
 private saveCampaign():void {if(this.practice||this.leaving||!this.canPersist())return;const scene=this.kind as CampaignScene,p=loadProgress(),allowed=SAVE_CHECKPOINTS[scene].includes(this.state.checkpoint??0);saveProgress(updateChapter(p,scene,{checkpoint:allowed?(this.state.checkpoint??0):0,charge:Math.max(0,Math.min(100,this.player?.ultimateCharge??this.state.ultimateCharge??0)),opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false}));}
 private completeAndAdvance(next:'outside'|'crimson'|'rescue'):void {if(this.practice||!this.canPersist())return;let p=loadProgress();p=updateChapter(p,this.kind as CampaignScene,{checkpoint:SAVE_CHECKPOINTS[this.kind as CampaignScene].includes(this.state.checkpoint??0)?this.state.checkpoint??0:0,charge:this.player.ultimateCharge,opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false});p=unlockAfter(this.kind as CampaignScene,p);p.currentScene=next;if(next==='rescue')p.ended=false;saveProgress(p);}
 private hasPracticeAssist():boolean{return !!this.player?.infiniteHealth||debugModeOn()&&(['invincible','infiniteUltimate','infiniteJumps','infiniteDashes'] as const).some(toggle=>debugToggle(toggle));}
 private finishTrial(victory=true):void {if(this.trialDone)return;this.trialDone=true;const elapsed=this.trialClock.finish(),prior=loadProgress(),eligible=this.trialEligibility.eligible&&!this.player.infiniteHealth,priorBest=prior.trials[this.practiceBoss].bestMs,newBest=victory&&eligible&&(priorBest===undefined||elapsed<priorBest);if(victory&&eligible)persistTrial(recordTrialOutcome(prior,this.practiceBoss,{victory,elapsedMs:elapsed,hits:this.trialHits,eligible}));this.physics.world.pause();const head=victory?'TRIAL COMPLETE':'TRIAL FAILED',badges=eligible?[...(newBest?['NEW PERSONAL BEST']:[]),...(this.trialHits===0?['HITLESS CLEAR']:[])]:['RECORD INELIGIBLE'],detail=victory?`TIME ${(elapsed/1000).toFixed(1)}s · HITS ${this.trialHits} · ${badges.length?badges.join(' · '):'CLEAR RECORDED'}`:'Duckoman fell before the boss was defeated.';this.add.rectangle(320,200,390,126,0x101722,.96).setStrokeStyle(2,0xc6a368).setScrollFactor(0).setDepth(70);this.add.text(320,160,head,{fontFamily:'Georgia',fontSize:'18px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(71);this.add.text(320,196,detail,{fontSize:'10px',color:'#e0d8c4',align:'center',wordWrap:{width:360}}).setOrigin(.5).setScrollFactor(0).setDepth(71);const retry=()=>this.scene.restart({practice:true}),menu=()=>this.scene.start('menu'),button=(x:number,label:string,act:()=>void)=>this.add.text(x,237,label,{fontSize:'10px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(71).setInteractive({useHandCursor:true}).on('pointerdown',act);button(250,'RETRY · ENTER',retry);button(390,'MENU · ESC',menu);const resultKey=(event:KeyboardEvent)=>{if(event.repeat)return;if(event.key==='Enter')retry();else if(event.key==='Escape')menu();};this.input.keyboard?.on('keydown',resultKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',resultKey));}
 private openMenu():boolean {if(this.practice)return requestPauseMenu(this,()=>{},this.sys.settings.key);return requestPauseMenu(this,()=>this.saveCampaign(),this.kind);}
}
