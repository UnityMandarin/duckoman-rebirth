import Phaser from 'phaser';
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
import {installHitboxDebug,installPlatformLabels,showHitbox,tagBody} from '../systems/DebugHitboxes';
import {setupRenderScale} from '../systems/renderScale';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {registerCommonFrames} from './CommonAssets';
import {preloadSceneAssets,registerSharedPropFrames} from './SceneAssets';
import {addMenuControl,requestPauseMenu} from '../systems/MenuControl';
import {loadProgress,saveProgress,updateChapter,unlockAfter,SAVE_CHECKPOINTS,sceneDataFromProgress,canPersistCampaign,type CampaignScene} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible,onDebugChange,debugModeOn,debugToggle} from '../systems/debug/debugSettings';
import {recordTrialOutcome,saveProgress as persistTrial} from '../systems/progress';
import {TrialClock,TrialEligibility} from '../systems/trialRules';
import {enemyPatrolBounds} from '../systems/enemyPatrolBounds';
import {SKILL_ROUTES,skillRoute,type SkillRoute,type SkillRouteId} from '../data/skillRoutes';
import {CrownRoute} from '../systems/CrownRoute';
import type {RouteVictory} from '../systems/RouteAttempt';
import {canPracticeRoute,recordRouteOutcome} from '../systems/progress';
import {roomFor,JAIL_ROOMS,OUTSIDE_ROOMS} from '../data/qualityRooms';
import {addIdentityBlock,addIdentityChapterSigns,addIdentityDoor,addIdentityFloor,chapterSpikeFlipY,floorVisual,openIdentityDoor,platformVisual,preloadChapterIdentity,registerChapterIdentity,type IdentityDoor} from '../systems/ChapterVisuals';
import {addCheckpointVisual,type CheckpointVisual} from '../systems/CheckpointVisual';

interface JourneyState {infiniteHealth?:boolean;checkpoint?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;ultimateCharge?:number;devPreview?:boolean;previewSection?:number;practice?:boolean;routePractice?:SkillRouteId;}
interface Gate {id:number;buttons:Phaser.GameObjects.Image[];labels:Phaser.GameObjects.Text[];wall:Phaser.GameObjects.Rectangle;door:IdentityDoor;}

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
 private objective!:Phaser.GameObjects.Text;
 private label!:Phaser.GameObjects.Text;
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
 private routeCourse?:SkillRoute;private routeControllers:CrownRoute[]=[];private routeController?:CrownRoute;private routeHud?:Phaser.GameObjects.Text;private routeDone=false;private readonly routePracticeAlias:boolean;
 constructor(private readonly kind:ChapterKind,sceneKey:string=kind){super(sceneKey);this.routePracticeAlias=sceneKey.endsWith('-route-practice');}
 preload():void {
  preloadSceneAssets(this,this.kind);
  preloadChapterIdentity(this,this.kind);
  preloadRelicArt(this);
  const loading=this.add.text(320,200,this.kind==='jail'?'Beyond the bars…':'Beyond the fallen kingdom…',{fontFamily:'Georgia',fontSize:'16px',color:'#d8c59c'}).setOrigin(.5).setScrollFactor(0);
  this.load.once('complete',()=>loading.destroy());
 }
 create(data:JourneyState={}):void {
  const requested=data.routePractice===undefined?undefined:skillRoute(data.routePractice),progress=loadProgress();
  if((this.routePracticeAlias&&(!requested||requested.chapter!==this.kind||!canPracticeRoute(progress,requested.id)))||(!this.routePracticeAlias&&data.routePractice!==undefined)){this.scene.start('menu');return;}
  this.routeCourse=requested;this.routeControllers=[];this.routeController=undefined;this.routeHud=undefined;this.routeDone=false;
  registerCommonFrames(this);registerSharedPropFrames(this);this.registerQualityFrames();registerChapterHudFrames(this);registerChapterIdentity(this,this.kind);this.devPreview=!!this.registry.get('devPreview')||!!data.devPreview;this.previewSection=data.previewSection;
  this.practice=this.routePracticeAlias||!!data.practice;this.practiceBoss=this.kind==='crimson'?'crimson':'outside';this.trialClock=new TrialClock();this.trialHits=0;this.trialEligibility=new TrialEligibility(true);this.trialDone=false;
  const saved=progress.chapters[this.kind as CampaignScene];this.state=this.devPreview||this.practice?{opened:[],secrets:[],checkpoint:data.previewSection!==undefined?data.previewSection*SECTION_WIDTH:0,ultimateCharge:0}:{...saved,...data,opened:[...new Set([...saved.opened,...(data.opened??[])])],secrets:[...new Set([...saved.secrets,...(data.secrets??[])])]};
  this.enemies=[];this.gates=[];this.secrets=[];this.checkpoints=[];this.checkpointVisuals=new WeakMap();this.hazards=[];this.walls=[];this.solids=[];
  this.section=-1;this.dying=false;this.leaving=false;this.boss=undefined;
  const width=CHAPTER_WIDTH[this.kind],arenaStart=(this.kind==='crimson'?10:22)*SECTION_WIDTH,arenaRight=width-400,routeStart=this.routeCourse?this.routeCourse.section*SECTION_WIDTH:0,previewStart=data.previewSection===undefined?0:data.previewSection*SECTION_WIDTH,worldStart=this.routeCourse?routeStart:this.practice?arenaStart:this.devPreview?previewStart:0,worldWidth=this.routeCourse||this.devPreview&&data.previewSection!==undefined?SECTION_WIDTH:this.practice?arenaRight-arenaStart:width;
  const worldTop=this.kind==='jail'?-160:-160,worldBottom=this.kind==='jail'?1840:this.kind==='outside'?620:460;
  this.physics.world.resume();this.physics.world.setBounds(worldStart,worldTop,worldWidth,worldBottom-worldTop);
  this.cameras.main.setBounds(worldStart,worldTop,worldWidth,worldBottom-worldTop).setBackgroundColor(0x09131c);
  this.createBackdrop(width,this.routeCourse?[routeStart,routeStart+SECTION_WIDTH]:this.devPreview&&data.previewSection!==undefined?[previewStart,previewStart+SECTION_WIDTH]:undefined);
  this.depthPresentation=new ChapterDepth(this,this.kind,width,false);
  this.terrain=this.physics.add.staticGroup();this.platforms=chapterPlatforms(this.kind).filter(p=>this.routeCourse?p.x>=routeStart&&p.x<routeStart+SECTION_WIDTH:this.devPreview&&data.previewSection!==undefined?p.x>=previewStart&&p.x<previewStart+SECTION_WIDTH:true);
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
  const spawn=this.routeCourse?routeStart+100:this.practice?arenaStart+120:this.devPreview&&data.previewSection!==undefined?previewStart+40:this.state.checkpoint??(bossPreview?(this.kind==='crimson'?10:22)*1440+120:100),spawnSurface=this.platforms.filter(surface=>surface.role==='floor'&&spawn>=surface.x-surface.width/2&&spawn<=surface.x+surface.width/2).sort((a,b)=>a.y-a.height/2-(b.y-b.height/2))[0],spawnY=spawnSurface?spawnSurface.y-spawnSurface.height/2-20:335;
  this.player=new Player(this,spawn,spawnY);this.player.infiniteHealth=!!data.infiniteHealth;this.player.health=this.routeCourse?3:this.player.health;this.player.ultimateCharge=this.routeCourse?0:data.ultimateCharge??this.state.ultimateCharge??saved.charge??0;
  this.shadow=this.add.ellipse(spawn,spawnY+25,54,9,0x000000,.35).setDepth(3);
  this.physics.add.collider(this.player.sprite,this.terrain);
  this.cake=new ThrowableObject(this,spawn+70,spawnY-7);this.physics.add.collider(this.cake.sprite,this.terrain);
  this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  this.story=this.add.text(320,110,'',{fontFamily:'Georgia',fontSize:'14px',color:'#ecd494',stroke:'#071019',strokeThickness:4,align:'center',wordWrap:{width:520}}).setOrigin(.5,0).setScrollFactor(0).setDepth(52);
  this.objective=this.add.text(320,88,'',{fontSize:'10px',color:'#c9d5d6',stroke:'#071019',strokeThickness:3,align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(52);
  this.label=this.add.text(625,346,'',{fontFamily:'system-ui',fontSize:'10px',color:'#ded4b7'}).setOrigin(1).setScrollFactor(0).setDepth(52);
  this.depthPresentation.setSurfaces(depthSurfaces);this.depthPresentation.setPlayer(this.player);this.depthPresentation.setShadow(this.shadow);if(!this.practice||this.routeCourse)this.populate();
  if(!this.practice||this.routeCourse)this.traps=new ChapterTraps(this,this.player,this.kind,surfaces,this.routeCourse?[this.routeCourse.section]:this.devPreview&&data.previewSection!==undefined?[data.previewSection]:undefined);
  if(this.kind==='jail'&&!this.practice){
   if(data.previewSection===undefined||data.previewSection===0)this.addGate(0,240,1740,[{x:140,y:1680}]);
   if(data.previewSection===undefined||data.previewSection===3)this.addGate(4,4*1440-70,1020,[{x:3*1440+1130,y:700}]);
   if(data.previewSection===undefined||data.previewSection===7)this.addGate(8,7*1440+1090,300,[{x:7*1440+805,y:72}]);
   if(data.previewSection===undefined||data.previewSection===11)this.addGate(12,12*1440-120,1740,[{x:11*1440+1120,y:1680}]);
  }else if(this.kind==='outside'){
   if(this.practice&&!this.routeCourse)this.boss=new AntlerRegent(this,this.player,this.cake,arenaStart,arenaRight,()=>this.finishTrial());
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===23))this.addGate(99,CHAPTER_WIDTH.outside-150,360,[]);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===22)&&!this.state.bossDefeated)this.boss=new AntlerRegent(this,this.player,this.cake,22*1440,CHAPTER_WIDTH.outside-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate)this.openGateArt(gate,700);
    this.say('The corruption breaks. The road to Franklin Fox is open.');
   });
  }
  if(this.kind==='crimson'){
   if(this.practice&&!this.routeCourse)this.boss=new CrabBoss(this,this.player,arenaStart,arenaRight,()=>this.finishTrial());
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===11))this.addGate(99,CHAPTER_WIDTH.crimson-150,360,[]);
   if(!this.practice&&(!this.devPreview||this.previewSection===undefined||this.previewSection===10)&&!this.state.bossDefeated)this.boss=new CrabBoss(this,this.player,10*1440,CHAPTER_WIDTH.crimson-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate)this.openGateArt(gate,700);
    this.say('The Crimson Claw falls. Beneath the throne, a prison beacon still pulses. Franklin is alive.');
   });
  }
  this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(700);
  const hudCamera=setupRenderScale(this,'journey-hud');new SceneLayerRouter(this,hudCamera);
  addMenuControl(this,()=>this.openMenu());
  const escape=(event:KeyboardEvent)=>{if(event.repeat)return;if(this.routeCourse){if(!this.routeDone)this.scene.start('routes');return;}if(!this.practice||!this.trialDone)this.openMenu();};this.input.keyboard?.on('keydown-ESC',escape);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown-ESC',escape));
  const pagehide=()=>this.saveCampaign();window.addEventListener('pagehide',pagehide);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>window.removeEventListener('pagehide',pagehide));
  if(!this.practice)this.saveCampaign();
  if(this.practice&&!this.routeCourse){this.trialHud=this.add.text(320,90,`${this.practiceBoss==='outside'?'BROKEN REGENT':'CRIMSON CLAW'} TRIAL · TIME 0.0 · HITS 0`,{fontSize:'10px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(61).setName('trial-hud');const invalidate=()=>{if(this.hasPracticeAssist())this.trialEligibility.invalidate();};const unsubscribe=onDebugChange(invalidate);this.events.once(Phaser.Scenes.Events.SHUTDOWN,unsubscribe);invalidate();const markGap=()=>this.trialClock.markGap();const visibility=()=>markGap();document.addEventListener('visibilitychange',visibility);this.events.on(Phaser.Scenes.Events.PAUSE,markGap);this.events.on(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.on(Phaser.Core.Events.BLUR,markGap);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{document.removeEventListener('visibilitychange',visibility);this.events.off(Phaser.Scenes.Events.PAUSE,markGap);this.events.off(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.off(Phaser.Core.Events.BLUR,markGap);});const damage=()=>this.trialHits++;this.events.on('player-damaged',damage);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off('player-damaged',damage));}
  if((!this.practice&&!this.devPreview)||this.routeCourse){
   if(this.routeCourse){this.story.setVisible(false);this.objective.setText('Collect 1 → 2 → 3, then cross the finish');this.routeHud=this.add.text(320,110,'',{fontSize:'10px',color:'#f1d18d',stroke:'#071019',strokeThickness:3,align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(61);}
   const addController=(route:SkillRoute)=>{
    const start=route.section*SECTION_WIDTH,ledges=this.platforms.filter(p=>p.role==='ledge'&&p.x>=start&&p.x<start+SECTION_WIDTH);
    let controller!:CrownRoute;
    const initiallyEligible=this.routeCourse?!this.devPreview&&!this.hasPracticeAssist():this.canPersist()&&!this.hasPracticeAssist();
    controller=new CrownRoute(this,this.player,route,ledges,{initiallyEligible,isAssisted:()=>this.hasPracticeAssist(),onVictory:outcome=>{if(this.routeCourse)this.finishRoutePractice(outcome);else this.recordCampaignRoute(route,controller,outcome);}});
    this.routeControllers.push(controller);if(route.id===this.routeCourse?.id)this.routeController=controller;
   };
   if(this.routeCourse)addController(this.routeCourse);else for(const route of SKILL_ROUTES.filter(candidate=>candidate.chapter===this.kind))addController(route);
  }
  installHitboxDebug(this);installPlatformLabels(this,this.platforms);
 }
 private registerQualityFrames():void {
  const crop:{key:string;height:number}[]=[
   {key:'jail-deep-cells',height:604},{key:'jail-upper-gallery',height:675},{key:'jail-sluice',height:640},
   {key:'outside-wind-ruins',height:690},{key:'outside-fox-river',height:620},{key:'crimson-vault',height:620},{key:'ruined-kingdom',height:480},{key:'wildwood',height:480},{key:'deepwood',height:480},{key:'jail-gallery',height:480},{key:'cistern',height:480}
  ];
  for(const item of crop){const key=`quality-${item.key}`;if(!this.textures.exists(key))continue;const texture=this.textures.get(key),image=texture.getSourceImage() as {width:number;height:number},h=Math.min(item.height,image.height);if(!texture.has('background-only'))texture.add('background-only',0,0,0,image.width,h);}
 }
 private createBackdrop(width:number,sectionBounds?:readonly [number,number]):void {
  const start=sectionBounds?.[0]??0,end=sectionBounds?.[1]??width,first=Math.max(0,Math.floor(start/SECTION_WIDTH)),last=Math.min(Math.ceil(end/SECTION_WIDTH),Math.ceil(width/SECTION_WIDTH));
  const floors=this.kind==='jail'?JAIL_ROOMS:this.kind==='outside'?OUTSIDE_ROOMS:[];
  for(let i=first;i<last;i++){
   const room=floors[i],floorY=room?.floor??360,key=room?(this.textures.exists(`quality-${room.background}`)?`quality-${room.background}`:room.background):this.kind==='crimson'?(i>=9?'quality-crimson-vault':'quality-ruined-kingdom'):'ruined-kingdom';
   const texture=this.textures.get(key),image=texture?.getSourceImage() as {width:number;height:number}|undefined;
   if(image){const h=texture.has('background-only')?texture.get('background-only').cutHeight:image.height,displayH=key==='quality-crimson-vault'?650:Math.max(this.kind==='jail'?650:520,SECTION_WIDTH*h/image.width);
    const backdrop=this.add.image(i*SECTION_WIDTH,floorY-displayH,key,texture.has('background-only')?'background-only':undefined).setOrigin(0).setDisplaySize(SECTION_WIDTH,displayH).setDepth(-20);
    if(this.kind==='crimson'&&i<9)backdrop.setTint(0xdb687b);
   }
   if(room){
    const gaps:number[][]=[];let at=0;for(const[a,b]of room.intervals){if(a>at)gaps.push([at,a]);at=b;}if(at<1440)gaps.push([at,1440]);
    const bedY=this.kind==='jail'?1820:520;
    for(const[a,b]of gaps){const gx=i*SECTION_WIDTH+(a+b)/2,gw=b-a;
     this.add.rectangle(gx,(floorY+bedY)/2,gw,bedY-floorY,0x071019,.92).setOrigin(.5).setDepth(-18);
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
   if(this.routeCourse&&i!==this.routeCourse.section||this.devPreview&&this.previewSection!==undefined&&i!==this.previewSection)return;
   const x=i*SECTION_WIDTH;
   if(this.kind==='crimson'){
    const stains=this.add.graphics().setDepth(1);
    for(let j=0;j<6;j++)stains.fillStyle(j%2?0x8e142e:0x490b22,.72).fillEllipse(x+210+j*209,363+j%3*8,46+j%3*17,6+j%2*4);
   }
   const quality=roomFor(this.kind,i);
   addIdentityChapterSigns(this,this.kind,i,x,quality?.floor??360);
   if(!this.routeCourse&&(quality?.checkpoint!==undefined||(!quality&&shouldCheckpoint(this.kind,i)))){
    const floorY=quality?.floor??360,checkpoint=this.add.image(x+80,floorY-28,`identity-${this.kind}`,'rest').setDisplaySize(30,54).setDepth(4).setData('floorY',floorY);this.checkpoints.push(checkpoint);
    this.checkpointVisuals.set(checkpoint,addCheckpointVisual(this,checkpoint,{coreYRatio:this.kind==='crimson'?.37:this.kind==='jail'?.60:.65,haloColor:this.kind==='crimson'?0xff443b:0xffc95f,coreColor:this.kind==='crimson'?0xffb18b:0xffefb0,initiallyActive:checkpoint.x<=(this.state.checkpoint??0)}));
   }
   if(!this.routeCourse&&section.secret&&!this.state.secrets!.includes(i)){
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
  if(!this.player||this.leaving||this.routeDone)return;
  const input=this.controls.read();
  if(input.godModePressed){if(this.routeCourse){this.routeController?.invalidate();if(!this.routePracticeAlias)markCampaignRunIneligible();}else if(this.practice)this.trialEligibility.invalidate();else markCampaignRunIneligible();this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}
  if(this.practice&&!this.routeCourse){if(this.hasPracticeAssist())this.trialEligibility.invalidate();const elapsed=this.trialClock.tick(delta,{active:this.scene.isActive(),visible:document.visibilityState==='visible',alive:this.player.active,finished:this.trialDone});if(!this.trialDone){this.player.update(input,delta);if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();this.hud.update();this.cake.follow(this.player);this.cake.update(delta);this.boss?.update(delta);this.depthPresentation.update();this.trialHud?.setText(`${this.practiceBoss==='outside'?'BROKEN REGENT':'CRIMSON CLAW'} TRIAL · TIME ${(elapsed/1000).toFixed(1)} · HITS ${this.trialHits}`);if(!this.player.active)this.finishTrial(false);}return;}
  this.hud.update();
  if(!this.player.active){
   if(this.routeCourse){this.routeController?.update(delta,false);this.finishRoutePractice();return;}
   if(!this.dying){this.dying=true;this.cake.drop();this.say('Fell — returning to your last rest');this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge,devPreview:this.devPreview,previewSection:this.previewSection}));}return;
  }
  this.player.update(input,delta);
  for(const wall of this.walls)wall.checkDash(this.player);
  for(const solid of this.solids)solid.checkDash(this.player);
  if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();
  let interacted=false;
  for(const gate of this.gates){
   if(this.state.opened!.includes(gate.id))continue;
   gate.buttons.forEach(b=>showHitbox(this,'interact',{x:b.x,y:b.y,radius:65}));
   const near=gate.buttons.some(b=>Phaser.Math.Distance.Between(b.x,b.y,this.player.sprite.x,this.player.sprite.y)<65);gate.buttons.forEach(b=>b.setTint(near?0xffde95:0xffffff));
   if(near&&input.throwPressed&&this.player.canAct){
    interacted=true;this.state.opened!.push(gate.id);this.openGateArt(gate,650);this.saveCampaign();
    gate.buttons.forEach(b=>b.setTint(0x7fe0b0));this.say(gate.id===0?'Free of the cell. The eastern sluice is my way out.':'Lock released. Both paths reconnect ahead.');
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
  const intent=this.player.canAct&&(input.horizontal!==0||input.jumpPressed||input.dashPressed);
  if(this.routeCourse){
   this.depthPresentation.update();this.routeController?.update(delta,intent);
   const localX=this.player.sprite.x-this.routeCourse.section*SECTION_WIDTH,next=this.routeController?.nextRing??0;
   this.objective.setText(localX>=1300&&next<3?`Collect ring ${next+1} before finishing`:'Collect 1 → 2 → 3, then cross the finish');
   this.routeHud?.setText(`${this.routeCourse.name} · ${next}/3 · TIME ${((this.routeController?.elapsedMs??0)/1000).toFixed(1)}s · HITS ${this.routeController?.hits??0}`);
   if(!this.player.active)this.finishRoutePractice();return;
  }
  const sections=chapterSections(this.kind);
  const index=Math.max(0,Math.min(Math.floor(this.player.sprite.x/1440),sections.length-1));
  if(index!==this.section){this.section=index;const section=sections[index],encounter=encounterFor(this.kind,index),room=roomFor(this.kind,index);this.label.setText(`${room?.name??section.name} · ${index+1}/${sections.length}${this.kind==='outside'&&index<22?' · Boss: 23':''}`);const objective=this.kind==='jail'&&index===0&&!this.practice?'Reach the cell latch · J to release':this.kind==='jail'&&index===6?'FLOOR 2 · Descend east to the sluice':encounter?{gallery:'Choose the upper route or follow the road',split:'High route or low road — both reconnect',bridge:'Cross the span; keep a landing in sight',switchback:'Climb back, then move east',arena:'Read the guard, then commit',descent:'Climb once; carry momentum downhill',sprint:'Link landings without rushing',tower:'Ride upward, step off at the top',sanctuary:'A quiet stretch — recover and look around'}[encounter.format]:'';this.objective.setText(objective);if(!this.routeCourse){const story=room?.story??section.story;if(story)this.say(story);}}
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
  for(const route of this.routeControllers)route.update(delta,intent);
  if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
  if(this.kind==='jail'&&this.player.sprite.x>CHAPTER_WIDTH.jail-40&&this.player.grounded&&Math.abs(this.player.body.bottom-1740)<20&&this.state.opened!.includes(12)){
   this.completeAndAdvance('outside');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('outside',{...sceneDataFromProgress(p,'outside'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});
  }else if(this.player.sprite.x>CHAPTER_WIDTH[this.kind]-40){
   if(this.state.bossDefeated&&this.kind==='outside'){this.completeAndAdvance('crimson');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('crimson',{...sceneDataFromProgress(p,'crimson'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});}
   else if(this.state.bossDefeated&&this.kind==='crimson'){this.completeAndAdvance('rescue');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('rescue',{...sceneDataFromProgress(p,'rescue'),devPreview:this.devPreview});});}
  }
 }
 private canPersist():boolean{return canPersistCampaign({devPreview:this.devPreview,infiniteHealth:this.player?.infiniteHealth,runEligible:campaignRunEligible()});}
 private recordCampaignRoute(route:SkillRoute,presentation:CrownRoute,outcome:RouteVictory):void {
  if(!outcome.eligible||!Number.isFinite(outcome.elapsedMs)||outcome.elapsedMs<=0||!Number.isInteger(outcome.hits)||outcome.hits<0||!this.canPersist()){this.say(`${route.name} · RECORD INELIGIBLE`);return;}
  const before=loadProgress(),best=before.routes[route.id].bestMs,newBest=best===undefined||outcome.elapsedMs<best;
  if(presentation.claimCampaignCharge()){this.player.chargeUltimate(20);this.saveCampaign();}
  const latest=loadProgress();saveProgress(recordRouteOutcome(latest,route.id,{...outcome,eligible:true}));
  this.say(`${route.name} · ${(outcome.elapsedMs/1000).toFixed(1)}s${outcome.hits===0?' · CLEAN':''}${newBest?' · NEW BEST':''}`);
 }
 private finishRoutePractice(outcome?:RouteVictory):void {
  if(this.routeDone||!this.routeCourse)return;this.routeDone=true;
  const route=this.routeCourse,prior=loadProgress(),eligible=!!outcome?.eligible&&Number.isFinite(outcome.elapsedMs)&&outcome.elapsedMs>0&&Number.isInteger(outcome.hits)&&outcome.hits>=0,best=prior.routes[route.id].bestMs,newBest=!!outcome&&eligible&&(best===undefined||outcome.elapsedMs<best);
  if(outcome&&eligible)saveProgress(recordRouteOutcome(prior,route.id,{...outcome,eligible:true}));
  this.physics.world.pause();
  const victory=!!outcome,head=victory?'ROUTE CLEAR':'ROUTE FAILED';
  const detail=victory?`TIME ${(outcome!.elapsedMs/1000).toFixed(1)}s · HITS ${outcome!.hits}${eligible?`${outcome!.hits===0?' · CLEAN':''}${newBest?' · NEW PB':''}`:' · RECORD INELIGIBLE'}`:`TIME ${((this.routeController?.elapsedMs??0)/1000).toFixed(1)}s · HITS ${this.routeController?.hits??0}`;
  this.add.rectangle(320,200,430,146,0x101722,.97).setStrokeStyle(2,0xc6a368).setScrollFactor(0).setDepth(70);
  this.add.text(320,155,`${route.name} · ${head}`,{fontFamily:'Georgia',fontSize:'17px',color:'#f1d18d',align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(71);
  this.add.text(320,190,detail,{fontSize:'10px',color:'#e0d8c4',align:'center',wordWrap:{width:390}}).setOrigin(.5).setScrollFactor(0).setDepth(71);
  const retry=()=>this.scene.restart({routePractice:route.id}),routes=()=>this.scene.start('routes'),menu=()=>this.scene.start('menu'),button=(x:number,label:string,action:()=>void)=>this.add.text(x,235,label,{fontSize:'10px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(71).setInteractive({useHandCursor:true}).on('pointerdown',action);
  button(185,'RETRY · ENTER',retry);button(320,'PRACTICE · ESC',routes);button(455,'MENU',menu);
  const resultKey=(event:KeyboardEvent)=>{if(event.repeat)return;if(event.key==='Enter')retry();else if(event.key==='Escape')routes();};this.input.keyboard?.on('keydown',resultKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',resultKey));
 }
 private saveCampaign():void {if(this.practice||this.leaving||!this.canPersist())return;const scene=this.kind as CampaignScene,p=loadProgress(),allowed=SAVE_CHECKPOINTS[scene].includes(this.state.checkpoint??0);saveProgress(updateChapter(p,scene,{checkpoint:allowed?(this.state.checkpoint??0):0,charge:Math.max(0,Math.min(100,this.player?.ultimateCharge??this.state.ultimateCharge??0)),opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false}));}
 private completeAndAdvance(next:'outside'|'crimson'|'rescue'):void {if(this.practice||!this.canPersist())return;let p=loadProgress();p=updateChapter(p,this.kind as CampaignScene,{checkpoint:SAVE_CHECKPOINTS[this.kind as CampaignScene].includes(this.state.checkpoint??0)?this.state.checkpoint??0:0,charge:this.player.ultimateCharge,opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false});p=unlockAfter(this.kind as CampaignScene,p);p.currentScene=next;if(next==='rescue')p.ended=false;saveProgress(p);}
 private hasPracticeAssist():boolean{return !!this.player?.infiniteHealth||debugModeOn()&&(['invincible','infiniteUltimate','infiniteJumps','infiniteDashes'] as const).some(toggle=>debugToggle(toggle));}
 private finishTrial(victory=true):void {if(this.trialDone)return;this.trialDone=true;const elapsed=this.trialClock.finish(),prior=loadProgress(),eligible=this.trialEligibility.eligible&&!this.player.infiniteHealth,priorBest=prior.trials[this.practiceBoss].bestMs,newBest=victory&&eligible&&(priorBest===undefined||elapsed<priorBest);if(victory&&eligible)persistTrial(recordTrialOutcome(prior,this.practiceBoss,{victory,elapsedMs:elapsed,hits:this.trialHits,eligible}));this.physics.world.pause();const head=victory?'TRIAL COMPLETE':'TRIAL FAILED',badges=eligible?[...(newBest?['NEW PERSONAL BEST']:[]),...(this.trialHits===0?['HITLESS CLEAR']:[])]:['RECORD INELIGIBLE'],detail=victory?`TIME ${(elapsed/1000).toFixed(1)}s · HITS ${this.trialHits} · ${badges.length?badges.join(' · '):'CLEAR RECORDED'}`:'Duckoman fell before the boss was defeated.';this.add.rectangle(320,200,390,126,0x101722,.96).setStrokeStyle(2,0xc6a368).setScrollFactor(0).setDepth(70);this.add.text(320,160,head,{fontFamily:'Georgia',fontSize:'18px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(71);this.add.text(320,196,detail,{fontSize:'10px',color:'#e0d8c4',align:'center',wordWrap:{width:360}}).setOrigin(.5).setScrollFactor(0).setDepth(71);const retry=()=>this.scene.restart({practice:true}),menu=()=>this.scene.start('menu'),button=(x:number,label:string,act:()=>void)=>this.add.text(x,237,label,{fontSize:'10px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(71).setInteractive({useHandCursor:true}).on('pointerdown',act);button(250,'RETRY · ENTER',retry);button(390,'MENU · ESC',menu);const resultKey=(event:KeyboardEvent)=>{if(event.repeat)return;if(event.key==='Enter')retry();else if(event.key==='Escape')menu();};this.input.keyboard?.on('keydown',resultKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',resultKey));}
 private openMenu():boolean {if(this.practice)return requestPauseMenu(this,()=>{},this.sys.settings.key);return requestPauseMenu(this,()=>this.saveCampaign(),this.kind);}
}
