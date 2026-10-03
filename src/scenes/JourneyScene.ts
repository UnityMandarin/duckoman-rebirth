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
import {ChapterHud} from '../systems/ChapterHud';
import {preloadRelicArt} from '../systems/RelicArt';
import {ChapterTraps} from '../systems/ChapterTraps';
import {ChapterDepth} from '../systems/ChapterDepth';
import type {ChapterDepthSurface} from '../systems/ChapterDepth';
import type {ChapterSurface} from '../systems/ChapterTraps';
import {CHAPTER_DIFFICULTY,encounterFor} from '../data/chapterChallenges';
import {chapterSections,CHAPTER_ART,CHAPTER_WIDTH,SECTION_WIDTH,chapterPlatforms} from '../data/chapters';
import type {ChapterKind,Ledge} from '../data/chapters';
import {isCheckpointContact,shouldCheckpoint} from '../systems/checkpointPolicy';
import {rectsOverlap} from '../systems/contactRules';
import {installHitboxDebug,installPlatformLabels,showHitbox,tagBody} from '../systems/DebugHitboxes';
import {setupRenderScale} from '../systems/renderScale';
import {SceneLayerRouter} from '../systems/SceneLayerRouter';
import {registerCommonFrames} from './CommonAssets';
import {loadProgress,saveProgress,updateChapter,unlockAfter,SAVE_CHECKPOINTS,sceneDataFromProgress,canPersistCampaign,type CampaignScene} from '../systems/progress';
import {campaignRunEligible,markCampaignRunIneligible,onDebugChange,debugModeOn,debugToggle} from '../systems/debug/debugSettings';
import {recordTrialOutcome,saveProgress as persistTrial} from '../systems/progress';
import {TrialClock,TrialEligibility} from '../systems/trialRules';
import {enemyPatrolBounds} from '../systems/enemyPatrolBounds';
import {SKILL_ROUTES,skillRoute,type SkillRoute,type SkillRouteId} from '../data/skillRoutes';
import {CrownRoute} from '../systems/CrownRoute';
import type {RouteVictory} from '../systems/RouteAttempt';
import {canPracticeRoute,recordRouteOutcome} from '../systems/progress';

interface JourneyState {infiniteHealth?:boolean;checkpoint?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;ultimateCharge?:number;devPreview?:boolean;practice?:boolean;routePractice?:SkillRouteId;}
interface Gate {id:number;buttons:Phaser.GameObjects.Image[];wall:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image;}

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
 private hazards:{x:number;y:number;width:number}[]=[];
 private story!:Phaser.GameObjects.Text;
 private objective!:Phaser.GameObjects.Text;
 private label!:Phaser.GameObjects.Text;
 private shadow!:Phaser.GameObjects.Ellipse;
 private state:JourneyState={};
 private platforms:Ledge[]=[];
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
 private practice=false;private practiceBoss:'outside'|'crimson'='outside';private trialClock=new TrialClock();private trialHits=0;private trialEligibility=new TrialEligibility(true);private trialDone=false;
 private trialHud?:Phaser.GameObjects.Text;
 private routeCourse?:SkillRoute;private routeControllers:CrownRoute[]=[];private routeController?:CrownRoute;private routeHud?:Phaser.GameObjects.Text;private routeDone=false;private readonly routePracticeAlias:boolean;
 constructor(private readonly kind:ChapterKind,sceneKey:string=kind){super(sceneKey);this.routePracticeAlias=sceneKey.endsWith('-route-practice');}
 preload():void {
  preloadRelicArt(this);
  const needed=this.kind==='jail'?['jail-gallery','cistern','road-platform','rest-lantern','sealed-dispatch']:CHAPTER_ART;
  for(const key of needed)if(!this.textures.exists(key))this.load.image(key,`${import.meta.env.BASE_URL}assets/chapters/${key}.png`);
  if(this.kind==='jail'&&!this.textures.exists('jail-distance'))this.load.image('jail-distance',`${import.meta.env.BASE_URL}assets/depth/jail-distance.png`);
  if(this.kind!=='outside'&&!this.textures.exists('prison-atlas'))this.load.image('prison-atlas',`${import.meta.env.BASE_URL}assets/depth/prison-atlas.png`);
  if(this.kind==='outside'&&!this.textures.exists('forest-atmosphere'))this.load.image('forest-atmosphere',`${import.meta.env.BASE_URL}assets/depth/forest-atmosphere.png`);
  if(this.kind==='crimson'&&!this.textures.exists('crimson-crab'))this.load.image('crimson-crab',`${import.meta.env.BASE_URL}assets/chapters/crimson-crab.png`);
  if(!this.textures.exists('ultimate-sword-frame'))this.load.image('ultimate-sword-frame',`${import.meta.env.BASE_URL}assets/hud/ultimate-sword-frame.png`);
  if(!this.textures.exists('ultimate-sword-fill'))this.load.image('ultimate-sword-fill',`${import.meta.env.BASE_URL}assets/hud/ultimate-sword-fill.png`);
  const loading=this.add.text(320,200,this.kind==='jail'?'Beyond the bars…':'Beyond the fallen kingdom…',{fontFamily:'Georgia',fontSize:'16px',color:'#d8c59c'}).setOrigin(.5).setScrollFactor(0);
  this.load.once('complete',()=>loading.destroy());
 }
 create(data:JourneyState={}):void {
  const requested=data.routePractice===undefined?undefined:skillRoute(data.routePractice),progress=loadProgress();
  if((this.routePracticeAlias&&(!requested||requested.chapter!==this.kind||!canPracticeRoute(progress,requested.id)))||(!this.routePracticeAlias&&data.routePractice!==undefined)){this.scene.start('menu');return;}
  this.routeCourse=requested;this.routeControllers=[];this.routeController=undefined;this.routeHud=undefined;this.routeDone=false;
  registerCommonFrames(this);this.devPreview=!!this.registry.get('devPreview')||!!data.devPreview;
  this.practice=this.routePracticeAlias||!!data.practice;this.practiceBoss=this.kind==='crimson'?'crimson':'outside';this.trialClock=new TrialClock();this.trialHits=0;this.trialEligibility=new TrialEligibility(true);this.trialDone=false;
  const saved=progress.chapters[this.kind as CampaignScene];this.state=this.practice?{opened:[],secrets:[],checkpoint:0,ultimateCharge:0}:{...saved,...data,opened:[...new Set([...saved.opened,...(data.opened??[])])],secrets:[...new Set([...saved.secrets,...(data.secrets??[])])]};
  this.enemies=[];this.gates=[];this.secrets=[];this.checkpoints=[];this.hazards=[];this.walls=[];this.solids=[];
  this.section=-1;this.dying=false;this.leaving=false;this.boss=undefined;
  const width=CHAPTER_WIDTH[this.kind],arenaStart=(this.kind==='crimson'?10:22)*SECTION_WIDTH,arenaRight=width-400,routeStart=this.routeCourse?this.routeCourse.section*SECTION_WIDTH:0,worldStart=this.routeCourse?routeStart:this.practice?arenaStart:0,worldWidth=this.routeCourse?SECTION_WIDTH:this.practice?arenaRight-arenaStart:width;
  this.physics.world.resume();this.physics.world.setBounds(worldStart,-240,worldWidth,700);
  this.cameras.main.setBounds(worldStart,-100,worldWidth,560).setBackgroundColor(0x09131c);
  this.createBackdrop(width,this.routeCourse?[routeStart,routeStart+SECTION_WIDTH]:undefined);
  this.depthPresentation=new ChapterDepth(this,this.kind,width,!this.routeCourse);
  this.terrain=this.physics.add.staticGroup();this.platforms=chapterPlatforms(this.kind).filter(p=>!this.routeCourse||p.x>=routeStart&&p.x<routeStart+SECTION_WIDTH);
  const surfaces:ChapterSurface[]=[];
  const depthSurfaces:ChapterDepthSurface[]=[];
  const road=this.textures.get('road-platform');if(!road.has('walk'))road.add('walk',0,16,190,2135,400);
  for(const p of this.platforms){
   const body=this.add.rectangle(p.x,p.y,p.width,p.height,0x102027,0);this.physics.add.existing(body,true);this.terrain.add(body);
   if(p.height<60){
    this.add.ellipse(p.x+8,p.y+30,p.width*.95,20,0x020810,.28).setDepth(-1);
    const art=this.add.image(p.x,p.y-p.height/2,'road-platform','walk').setOrigin(.5,0).setDisplaySize(p.width,Math.max(45,p.width*.2)).setDepth(2).setTint(this.kind==='jail'?0xaebcca:this.kind==='crimson'?0xf09097:0xffffff);
    surfaces.push({shape:body,art,ledge:p});
    depthSurfaces.push({shape:body,art,ledge:p});
   }else depthSurfaces.push({shape:body,ledge:p});
  }
  const bossPreview=this.kind!=='jail'&&['localhost','127.0.0.1'].includes(window.location.hostname)&&new URLSearchParams(window.location.search).has('boss');
  const spawn=this.routeCourse?routeStart+100:this.practice?arenaStart+120:this.state.checkpoint??(bossPreview?(this.kind==='crimson'?10:22)*1440+120:100);
  this.player=new Player(this,spawn,332.5);this.player.infiniteHealth=!!data.infiniteHealth;this.player.health=this.routeCourse?3:this.player.health;this.player.ultimateCharge=this.routeCourse?0:data.ultimateCharge??0;
  this.shadow=this.add.ellipse(spawn,358,54,9,0x000000,.35).setDepth(3);
  this.physics.add.collider(this.player.sprite,this.terrain);
  this.cake=new ThrowableObject(this,spawn+70,325);this.physics.add.collider(this.cake.sprite,this.terrain);
  this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  this.story=this.add.text(320,110,'',{fontFamily:'Georgia',fontSize:'14px',color:'#ecd494',stroke:'#071019',strokeThickness:4,align:'center',wordWrap:{width:520}}).setOrigin(.5,0).setScrollFactor(0).setDepth(52);
  this.objective=this.add.text(320,88,'',{fontSize:'10px',color:'#c9d5d6',stroke:'#071019',strokeThickness:3,align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(52);
  this.label=this.add.text(625,365,'',{fontSize:'10px',color:'#ded4b7'}).setOrigin(1).setScrollFactor(0).setDepth(52);
  this.add.text(13,382,'A/D · Hold Left Shift sprint · L jump · K dash · S tuck/slam · J interact/throw · U',{fontSize:'9px',color:'#bec9cc',stroke:'#061019',strokeThickness:3}).setScrollFactor(0).setDepth(51);
  this.depthPresentation.setSurfaces(depthSurfaces);this.depthPresentation.setPlayer(this.player);this.depthPresentation.setShadow(this.shadow);if(!this.practice||this.routeCourse)this.populate();
  if(!this.practice||this.routeCourse)this.traps=new ChapterTraps(this,this.player,this.kind,surfaces,this.routeCourse?[this.routeCourse.section]:undefined);
  if(this.kind==='jail'&&!this.practice){
   this.addGate(0,620,[{x:430,y:160}]);
   this.add.text(400,115,'J · Release the cell latch',{fontSize:'11px',color:'#ffe092',stroke:'#08111b',strokeThickness:4}).setOrigin(.5).setDepth(17);
   for(const i of [3,7,11])this.addGate(i+1,(i+1)*1440-70,[{x:i*1440+1080,y:318},{x:i*1440+990,y:145}]);
  }else if(this.kind==='outside'){
   if(this.practice&&!this.routeCourse)this.boss=new AntlerRegent(this,this.player,this.cake,arenaStart,arenaRight,()=>this.finishTrial());
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice)this.addGate(99,CHAPTER_WIDTH.outside-150,[]);
   if(!this.practice&&!this.state.bossDefeated)this.boss=new AntlerRegent(this,this.player,this.cake,22*1440,CHAPTER_WIDTH.outside-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate){(gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;this.tweens.add({targets:gate.art,y:-260,duration:700});}
    this.say('The corruption breaks. The road to Franklin Fox is open.');
   });
  }
  if(this.kind==='crimson'){
   if(this.practice&&!this.routeCourse)this.boss=new CrabBoss(this,this.player,arenaStart,arenaRight,()=>this.finishTrial());
   else if(this.state.bossDefeated)this.state.opened!.push(99);
   if(!this.practice)this.addGate(99,CHAPTER_WIDTH.crimson-150,[]);
   if(!this.practice&&!this.state.bossDefeated)this.boss=new CrabBoss(this,this.player,10*1440,CHAPTER_WIDTH.crimson-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);this.saveCampaign();
    const gate=this.gates.find(g=>g.id===99);
    if(gate){(gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;this.tweens.add({targets:gate.art,y:-260,duration:700});}
    this.say('The Crimson Claw falls. Beneath the throne, a prison beacon still pulses. Franklin is alive.');
   });
  }
  this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(700);
  const hudCamera=setupRenderScale(this,'journey-hud');new SceneLayerRouter(this,hudCamera);
  this.add.text(625,62,'MENU',{fontFamily:'Georgia',fontSize:'9px',color:'#ffedc4',backgroundColor:'#352716',padding:{x:7,y:4}}).setOrigin(1,0).setScrollFactor(0).setDepth(60).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openMenu());
  const escape=()=>{if(this.routeCourse){if(!this.routeDone)this.scene.start('routes');return;}if(!this.practice||!this.trialDone)this.openMenu();};this.input.keyboard?.on('keydown-ESC',escape);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown-ESC',escape));
  const pagehide=()=>this.saveCampaign();window.addEventListener('pagehide',pagehide);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>window.removeEventListener('pagehide',pagehide));
  if(!this.practice)this.saveCampaign();
  if(this.practice&&!this.routeCourse){this.trialHud=this.add.text(320,90,`${this.practiceBoss==='outside'?'BROKEN REGENT':'CRIMSON CLAW'} TRIAL · TIME 0.0 · HITS 0`,{fontSize:'10px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(61).setName('trial-hud');const invalidate=()=>{if(this.hasPracticeAssist())this.trialEligibility.invalidate();};const unsubscribe=onDebugChange(invalidate);this.events.once(Phaser.Scenes.Events.SHUTDOWN,unsubscribe);invalidate();const markGap=()=>this.trialClock.markGap();const visibility=()=>markGap();document.addEventListener('visibilitychange',visibility);this.events.on(Phaser.Scenes.Events.PAUSE,markGap);this.events.on(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.on(Phaser.Core.Events.BLUR,markGap);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{document.removeEventListener('visibilitychange',visibility);this.events.off(Phaser.Scenes.Events.PAUSE,markGap);this.events.off(Phaser.Scenes.Events.SLEEP,markGap);this.game.events.off(Phaser.Core.Events.BLUR,markGap);});const damage=()=>this.trialHits++;this.events.on('player-damaged',damage);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off('player-damaged',damage));}
  if(!this.practice||this.routeCourse){
   if(this.routeCourse){this.story.setVisible(false);this.objective.setText('Collect 1 → 2 → 3, then cross the finish');this.routeHud=this.add.text(320,110,'',{fontSize:'10px',color:'#f1d18d',stroke:'#071019',strokeThickness:3,align:'center'}).setOrigin(.5).setScrollFactor(0).setDepth(61);}
   const addController=(route:SkillRoute)=>{
    const start=route.section*SECTION_WIDTH,ledges=this.platforms.filter(p=>p.height<60&&p.x>=start&&p.x<start+SECTION_WIDTH);
    let controller!:CrownRoute;
    const initiallyEligible=this.routeCourse?!this.devPreview&&!this.hasPracticeAssist():this.canPersist()&&!this.hasPracticeAssist();
    controller=new CrownRoute(this,this.player,route,ledges,{initiallyEligible,isAssisted:()=>this.hasPracticeAssist(),onVictory:outcome=>{if(this.routeCourse)this.finishRoutePractice(outcome);else this.recordCampaignRoute(route,controller,outcome);}});
    this.routeControllers.push(controller);if(route.id===this.routeCourse?.id)this.routeController=controller;
   };
   if(this.routeCourse)addController(this.routeCourse);else for(const route of SKILL_ROUTES.filter(candidate=>candidate.chapter===this.kind))addController(route);
  }
  installHitboxDebug(this);installPlatformLabels(this,this.platforms);
 }
 private createBackdrop(width:number,sectionBounds?:readonly [number,number]):void {
  // The painted ground moves one-to-one with collision terrain, never like wallpaper.
  const start=sectionBounds?.[0]??0,end=sectionBounds?.[1]??width,first=Math.max(0,Math.floor(start/1800)),last=Math.ceil(end/1800);
  for(let i=first;i<last;i++){
   const key=this.kind==='crimson'?'ruined-kingdom':this.kind==='jail'?(i<3||i===5||i===6?'jail-gallery':'cistern'):i<6?'ruined-kingdom':i<15?'deepwood':'wildwood';
   const texture=this.textures.get(key),source=texture.getSourceImage(),h=1800*source.height/source.width;
   const floorRatio=key==='ruined-kingdom'?.725:key==='deepwood'?.76:key==='cistern'?.79:.80;
   if(this.kind==='jail'&&key==='jail-gallery'&&this.textures.exists('jail-distance')){
    const cropY=Math.round(source.height*floorRatio);
    if(!texture.has('floor-only'))texture.add('floor-only',0,0,cropY,source.width,source.height-cropY);
    const floorHeight=1800*(source.height-cropY)/source.width;
    const floorY=360-h*floorRatio+(h-floorHeight);
    this.add.image(i*1800,floorY,key,'floor-only').setOrigin(0).setDisplaySize(1802,floorHeight).setDepth(-20).setFlipX(i%2===1);
   }else this.add.image(i*1800,360-h*floorRatio,key).setOrigin(0).setDisplaySize(1802,h).setDepth(-20).setFlipX(i%2===1).setTint(this.kind==='crimson'?0xef677d:0xffffff);
  }
  this.add.rectangle(start+(end-start)/2,440,end-start,100,this.kind==='crimson'?0x260b18:0x081015).setDepth(-19);
 }
 private populate():void {
  const sections=chapterSections(this.kind);
  sections.forEach((section,i)=>{
   if(this.routeCourse&&i!==this.routeCourse.section)return;
   const x=i*SECTION_WIDTH;
   if(this.kind==='crimson'){
    const stains=this.add.graphics().setDepth(1);
    for(let j=0;j<6;j++)stains.fillStyle(j%2?0x8e142e:0x490b22,.72).fillEllipse(x+210+j*209,363+j%3*8,46+j%3*17,6+j%2*4);
   }
   if(!this.routeCourse&&shouldCheckpoint(this.kind,i)){
    const checkpoint=this.add.image(x+80,333,'rest-lantern').setDisplaySize(30,54).setDepth(4);this.checkpoints.push(checkpoint);
    this.add.text(x+80,300,'REST / SAVE',{fontSize:'9px',color:'#f1d18d',stroke:'#071019',strokeThickness:3}).setOrigin(.5).setDepth(5);
   }
   if(!this.routeCourse&&section.secret&&!this.state.secrets!.includes(i)){
    const route=this.platforms.filter(p=>p.x>x&&p.x<x+1440&&p.height<60);
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
   const ledges=this.platforms.filter(p=>p.x>x&&p.x<x+1440);
   for(const placement of encounter.enemies){
    const ex=x+placement.x,ey=placement.y,span=placement.patrol;
    const pointed=placement.type==='pointed',jumper=placement.type==='jumper'||placement.type==='hare';
    const skin=placement.type==='boar'?'thorn-boar':placement.type==='hare'?'gloom-hare':undefined;
    const enemy=new BasicEnemy(this,ex,ey,{left:ex-span,right:ex+span},pointed,jumper,skin);
    const patrol=enemyPatrolBounds({...placement,x:ex},ledges,enemy.body.width);
    if(patrol)enemy.setPatrolBounds(patrol);
    if(this.kind==='crimson'){enemy.hp=2;enemy.visual.setTint(0xff596a);}
    enemy.body.setMaxVelocity(100*CHAPTER_DIFFICULTY[this.kind],900);
    this.physics.add.collider(enemy.sprite,this.terrain);
    const contacts=new InteractionSystem(this.player,enemy,this.cake);
    this.physics.add.overlap(this.player.enemyContactTargets,enemy.sprite,()=>contacts.resolvePlayerEnemy());
    this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>contacts.resolveThrownEnemy());this.enemies.push(enemy);
   }
   for(const dx of encounter.spikes){const hx=x+dx;this.hazards.push({x:hx,y:356,width:84});this.add.image(hx,348,'spike-platform','hazard').setDisplaySize(84,32).setFlipY(true).setDepth(4);}
   const clue={gallery:'Choose the upper route or follow the road',split:'High route or low road — both reconnect',bridge:'Cross the span; keep a landing in sight',switchback:'Climb back, then move east',arena:'Read the guard, then commit',descent:'Climb once; carry momentum downhill',sprint:'Link landings without rushing',tower:'Ride upward, step off at the top',sanctuary:'A quiet stretch — recover and look around'}[encounter.format];
   const instruction={rest:'A quiet road',presses:'Wait for the red line',crumble:'Cracked ledges break',relay:'Jump, land, dash',crossfire:'Red lines mark falling stone',ambush:'Choose your landing',ascent:'Climb, turn, cross',ferry:'Ride, then jump',lift:'Ride up, then step off',gust:'Wind bends jumps; dash holds course',conveyor:'Arrows show the moving floor',shutters:'Fading ledges will vanish'}[encounter.type];
   this.add.text(x+100,278,`${clue} · ${instruction}`,{fontSize:'10px',color:'#e8d69b',stroke:'#071119',strokeThickness:4}).setDepth(5);
  });
 }
 private addGate(id:number,x:number,buttons:{x:number;y:number}[]):void {
  const pier=this.add.rectangle(x,-22.5,125,435,0,0);this.physics.add.existing(pier,true);
  this.physics.add.collider(this.player.sprite,pier);this.physics.add.collider(this.cake.sprite,pier);this.solids.push(new SolidDashable(pier));
  this.add.image(x,-22.5,'rock-pillar-kit','pillar').setDisplaySize(125,435).setDepth(7);
  if(this.state.opened!.includes(id))return;
  const wall=this.add.rectangle(x,277.5,30,165,0,0);this.physics.add.existing(wall,true);
  this.physics.add.collider(this.player.sprite,wall);this.physics.add.collider(this.cake.sprite,wall);
  const art=this.add.image(x,360,'lock-kit','door').setOrigin(.5,1).setDisplaySize(125,165).setDepth(7);
  const images=buttons.map(b=>this.add.image(b.x,b.y,'lock-kit','button').setDisplaySize(40,22).setDepth(7));this.gates.push({id,buttons:images,wall,art});
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
   if(!this.dying){this.dying=true;this.cake.drop();this.say('Fell — returning to your last rest');this.physics.world.pause();this.time.delayedCall(550,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth,ultimateCharge:0}));}return;
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
    interacted=true;this.state.opened!.push(gate.id);(gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;this.saveCampaign();
    this.tweens.add({targets:gate.art,y:-260,duration:650,ease:'Cubic.InOut'});gate.buttons.forEach(b=>b.setTint(0x7fe0b0));this.say(gate.id===0?'Free of the cell. The eastern sluice is my way out.':'Lock released. Both paths reconnect ahead.');
   }
  }
  if(input.throwPressed&&!interacted&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);
  this.cake.follow(this.player);this.cake.update(delta);
  for(const enemy of this.enemies){if(enemy.defeated)continue;const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<850;enemy.setAwake(awake);if(awake){enemy.update();enemy.body.setVelocityX(enemy.body.velocity.x*CHAPTER_DIFFICULTY[this.kind]);}}
  this.traps.update();
  for(const h of this.hazards){
   const zone={left:h.x-h.width/2,right:h.x+h.width/2,top:h.y-15,bottom:h.y};
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
  if(index!==this.section){this.section=index;const section=sections[index],encounter=encounterFor(this.kind,index);this.label.setText(`${section.name} · ${index+1}/${sections.length}${this.kind==='outside'&&index<22?' · Boss: 23':''}`);const objective=this.kind==='jail'&&index===0&&!this.practice?'Reach the cell latch · J to release':encounter?{gallery:'Choose the upper route or follow the road',split:'High route or low road — both reconnect',bridge:'Cross the span; keep a landing in sight',switchback:'Climb back, then move east',arena:'Read the guard, then commit',descent:'Climb once; carry momentum downhill',sprint:'Link landings without rushing',tower:'Ride upward, step off at the top',sanctuary:'A quiet stretch — recover and look around'}[encounter.format]:'';this.objective.setText(objective);if(!this.routeCourse&&section.story)this.say(section.story);}
  for(const checkpoint of this.checkpoints)if((this.kind==='jail'?isCheckpointContact(this.player.sprite.x,this.player.body.bottom,checkpoint.x,360):Math.abs(this.player.sprite.x-checkpoint.x)<35)&&this.player.grounded&&checkpoint.x>(this.state.checkpoint??0)){
   this.state.checkpoint=checkpoint.x;this.player.health=Math.min(3,this.player.health+.5);this.state.ultimateCharge=this.player.ultimateCharge;checkpoint.setTint(0xffe2a3);this.say('Checkpoint · Half a heart restored.');this.saveCampaign();
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
  if(this.player.sprite.x>CHAPTER_WIDTH[this.kind]-40){
   if(this.kind==='jail'){this.completeAndAdvance('outside');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('outside',{...sceneDataFromProgress(p,'outside'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});}
   else if(this.state.bossDefeated&&this.kind==='outside'){this.completeAndAdvance('crimson');this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>{const p=loadProgress();this.scene.start('crimson',{...sceneDataFromProgress(p,'crimson'),ultimateCharge:this.player.ultimateCharge,infiniteHealth:this.player.infiniteHealth,devPreview:this.devPreview});});}
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
  const resultKey=(event:KeyboardEvent)=>{if(event.key==='Enter')retry();else if(event.key==='Escape')routes();};this.input.keyboard?.on('keydown',resultKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',resultKey));
 }
 private saveCampaign():void {if(this.practice||this.leaving||!this.canPersist())return;const scene=this.kind as CampaignScene,p=loadProgress(),allowed=SAVE_CHECKPOINTS[scene].includes(this.state.checkpoint??0);saveProgress(updateChapter(p,scene,{checkpoint:allowed?(this.state.checkpoint??0):0,charge:Math.max(0,Math.min(100,this.player?.ultimateCharge??this.state.ultimateCharge??0)),opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false}));}
 private completeAndAdvance(next:'outside'|'crimson'|'rescue'):void {if(this.practice||!this.canPersist())return;let p=loadProgress();p=updateChapter(p,this.kind as CampaignScene,{checkpoint:SAVE_CHECKPOINTS[this.kind as CampaignScene].includes(this.state.checkpoint??0)?this.state.checkpoint??0:0,charge:this.player.ultimateCharge,opened:this.state.opened??[],secrets:this.state.secrets??[],bossDefeated:this.state.bossDefeated??false});p=unlockAfter(this.kind as CampaignScene,p);p.currentScene=next;if(next==='rescue')p.ended=false;saveProgress(p);}
 private hasPracticeAssist():boolean{return !!this.player?.infiniteHealth||debugModeOn()&&(['invincible','infiniteUltimate','infiniteJumps','infiniteDashes'] as const).some(toggle=>debugToggle(toggle));}
 private finishTrial(victory=true):void {if(this.trialDone)return;this.trialDone=true;const elapsed=this.trialClock.finish(),prior=loadProgress(),eligible=this.trialEligibility.eligible&&!this.player.infiniteHealth,priorBest=prior.trials[this.practiceBoss].bestMs,newBest=victory&&eligible&&(priorBest===undefined||elapsed<priorBest);if(victory&&eligible)persistTrial(recordTrialOutcome(prior,this.practiceBoss,{victory,elapsedMs:elapsed,hits:this.trialHits,eligible}));this.physics.world.pause();const head=victory?'TRIAL COMPLETE':'TRIAL FAILED',badges=eligible?[...(newBest?['NEW PERSONAL BEST']:[]),...(this.trialHits===0?['HITLESS CLEAR']:[])]:['RECORD INELIGIBLE'],detail=victory?`TIME ${(elapsed/1000).toFixed(1)}s · HITS ${this.trialHits} · ${badges.length?badges.join(' · '):'CLEAR RECORDED'}`:'Duckoman fell before the boss was defeated.';this.add.rectangle(320,200,390,126,0x101722,.96).setStrokeStyle(2,0xc6a368).setScrollFactor(0).setDepth(70);this.add.text(320,160,head,{fontFamily:'Georgia',fontSize:'18px',color:'#f1d18d'}).setOrigin(.5).setScrollFactor(0).setDepth(71);this.add.text(320,196,detail,{fontSize:'10px',color:'#e0d8c4',align:'center',wordWrap:{width:360}}).setOrigin(.5).setScrollFactor(0).setDepth(71);const retry=()=>this.scene.restart({practice:true}),menu=()=>this.scene.start('menu'),button=(x:number,label:string,act:()=>void)=>this.add.text(x,237,label,{fontSize:'10px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(71).setInteractive({useHandCursor:true}).on('pointerdown',act);button(250,'RETRY · ENTER',retry);button(390,'MENU · ESC',menu);const resultKey=(event:KeyboardEvent)=>{if(event.key==='Enter')retry();else if(event.key==='Escape')menu();};this.input.keyboard?.on('keydown',resultKey);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',resultKey));}
 private openMenu():void {if(this.practice){this.scene.start('menu');return;}this.saveCampaign();this.scene.pause();this.scene.launch('menu',{pausedScene:this.kind});}
}
