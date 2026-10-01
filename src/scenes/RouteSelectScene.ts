import Phaser from 'phaser';
import {SKILL_ROUTES,type SkillRoute} from '../data/skillRoutes';
import {canPracticeBoss,canPracticeRoute,loadProgress,type CampaignProgress} from '../systems/progress';
import {setupRenderScale} from '../systems/renderScale';

const TABS=['SUNKEN CELLS','WILDLANDS','CRIMSON THRONE','BOSS TRIALS'];
const CHAPTERS=['jail','outside','crimson'] as const;
type Boss='outside'|'crimson';
interface GalleryData {pausedScene?:string;tab?:number;}

export class RouteSelectScene extends Phaser.Scene {
 private tab=0;
 private selected=0;
 private pausedScene?:string;
 private tabs:Phaser.GameObjects.Rectangle[]=[];
 private cards:Phaser.GameObjects.Container[]=[];
 constructor(){super('routes');}
 create(data:GalleryData={}):void {
  this.pausedScene=data.pausedScene;
  this.tab=Number.isInteger(data.tab)&&data.tab!>=0&&data.tab!<4?data.tab!:0;
  this.selected=0;
  this.cameras.main.setBackgroundColor(0x090d12);
  this.add.rectangle(320,200,640,400,0x101722).setStrokeStyle(2,0x71572f);
  this.add.text(320,20,'ROUTE PRACTICE',{fontFamily:'Georgia',fontSize:'21px',color:'#f1d18d',stroke:'#160e08',strokeThickness:3}).setOrigin(.5);
  this.add.text(320,47,'Choose a chapter drill or test a boss',{fontFamily:'Georgia',fontSize:'10px',color:'#afa98f'}).setOrigin(.5);
  this.tabs=TABS.map((label,i)=>this.add.rectangle(85+i*157,77,144,23,0x252b32).setStrokeStyle(1,0x65583e).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.setTab(i)));
  TABS.forEach((label,i)=>this.add.text(85+i*157,77,label,{fontFamily:'Georgia',fontSize:'8px',color:'#e4d4b3'}).setOrigin(.5).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.setTab(i)));
  this.add.text(320,320,'Drills unlock when you reach their chapter',{fontSize:'9px',color:'#b7ae9a'}).setOrigin(.5);
  this.add.text(320,344,'← / → chapter    ↑ / ↓ course    ENTER practice    ESC back',{fontSize:'8px',color:'#a8a395'}).setOrigin(.5);
  this.add.text(320,375,'BACK',{fontFamily:'Georgia',fontSize:'9px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:4}}).setOrigin(.5).setFixedSize(90,20).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.back());
  this.renderCards();
  setupRenderScale(this,'menu-hud');this.cameras.main.ignore(this.children.list);
  const keyboard=this.input.keyboard;if(keyboard){const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape'){this.back();return;}if(e.key==='ArrowLeft'){this.setTab((this.tab+3)%4);return;}if(e.key==='ArrowRight'){this.setTab((this.tab+1)%4);return;}if(e.key==='ArrowUp'){this.move(-1);return;}if(e.key==='ArrowDown'){this.move(1);return;}if(e.key==='Enter')this.launchSelected();};keyboard.on('keydown',keydown);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>keyboard.off('keydown',keydown));}
 }
 private setTab(tab:number):void {this.tab=tab;this.selected=0;this.renderCards();}
 private move(delta:number):void {this.selected=(this.selected+delta+this.itemCount())%this.itemCount();this.renderCards();}
 private itemCount():number{return this.tab===3?2:3;}
 private renderCards():void {
  this.cards.forEach(card=>card.destroy(true));this.cards=[];
  this.tabs.forEach((tab,i)=>tab.setFillStyle(i===this.tab?0x594426:0x252b32).setStrokeStyle(i===this.tab?2:1,i===this.tab?0xf1d18d:0x65583e));
  if(this.tab===3){(['outside','crimson'] as Boss[]).forEach((boss,i)=>this.cards.push(this.makeBossCard(boss,i)));}
  else {const chapter=CHAPTERS[this.tab],routes=SKILL_ROUTES.filter(route=>route.chapter===chapter),progress=loadProgress();routes.forEach((route,i)=>this.cards.push(this.makeRouteCard(route,i,progress)));}
  this.cameras.main.ignore(this.cards);
 }
 private makeRouteCard(route:SkillRoute,index:number,progress:CampaignProgress):Phaser.GameObjects.Container {
  const x=110+index*210,unlocked=canPracticeRoute(progress,route.id),record=progress.routes[route.id],art=chapterArt(route.chapter),card=this.add.container(x,201);
  card.add(this.add.rectangle(0,0,190,205,unlocked?0x1b2430:0x11151b,.98).setStrokeStyle(1,this.selected===index?0xf1d18d:0x65583e).setInteractive().on('pointerdown',()=>{this.selected=index;this.renderCards();}));
  card.add(this.add.image(0,-57,art).setDisplaySize(170,60).setAlpha(unlocked?1:.32));
  if(!unlocked)card.add(this.add.image(0,-57,'chained-lock').setDisplaySize(45,45).setDepth(2));
  card.add(this.add.text(0,-16,route.name,{fontFamily:'Georgia',fontSize:'11px',color:'#f1e6cb',align:'center',wordWrap:{width:170}}).setOrigin(.5,0));
  card.add(this.add.text(0,15,route.goal,{fontSize:'9px',color:'#c8c0ae',align:'center',wordWrap:{width:170}}).setOrigin(.5,0));
  card.add(this.add.text(0,45,record.bestMs?'BEST '+fmt(record.bestMs):'No clear yet',{fontSize:'9px',color:'#d6c9ad',align:'center'}).setOrigin(.5,0));
  card.add(this.add.text(0,59,record.hitless?'CLEAN':'',{fontSize:'8px',color:'#b8dc99'}).setOrigin(.5,0));
  const button=this.add.text(0,81,unlocked?'PRACTICE':'LOCKED',{fontFamily:'Georgia',fontSize:'9px',color:unlocked?'#fff0cc':'#777',backgroundColor:unlocked?'#594426':'#303237',padding:{x:6,y:5},align:'center'}).setOrigin(.5).setFixedSize(130,23);
  if(unlocked)button.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.startRoute(route));card.add(button);
  return card;
 }
 private makeBossCard(boss:Boss,index:number):Phaser.GameObjects.Container {
  const x=215+index*210,progress=loadProgress(),unlocked=canPracticeBoss(progress,boss),record=progress.trials[boss],card=this.add.container(x,201),name=boss==='outside'?'BROKEN REGENT':'CRIMSON CLAW',art=boss==='outside'?'menu-wildwood':'menu-crimson-crab';
  card.add(this.add.rectangle(0,0,195,205,unlocked?0x1b2430:0x11151b,.98).setStrokeStyle(1,this.selected===index?0xf1d18d:0x65583e).setInteractive().on('pointerdown',()=>{this.selected=index;this.renderCards();}));
  card.add(this.add.image(0,-57,art).setDisplaySize(170,60).setAlpha(unlocked?1:.32));
  if(!unlocked)card.add(this.add.image(0,-57,'chained-lock').setDisplaySize(45,45).setDepth(2));
  card.add(this.add.text(0,-16,name,{fontFamily:'Georgia',fontSize:'11px',color:'#f1e6cb',align:'center'}).setOrigin(.5,0));
  card.add(this.add.text(0,12,boss==='outside'?'Bait the charge; punish recovery':'Dash / U in recovery · avoid red lines',{fontSize:'9px',color:'#c8c0ae',align:'center',wordWrap:{width:175},lineSpacing:1}).setOrigin(.5,0));
  card.add(this.add.text(0,45,unlocked?(record.bestMs?'BEST '+fmt(record.bestMs):'No clear yet'):'Reach the arena rest',{fontSize:'9px',color:'#d6c9ad',align:'center'}).setOrigin(.5,0));
  card.add(this.add.text(0,59,record.hitless?'HITLESS':'',{fontSize:'8px',color:'#b8dc99'}).setOrigin(.5,0));
  const button=this.add.text(0,81,unlocked?'PRACTICE':'LOCKED',{fontFamily:'Georgia',fontSize:'9px',color:unlocked?'#fff0cc':'#777',backgroundColor:unlocked?'#594426':'#303237',padding:{x:6,y:5},align:'center'}).setOrigin(.5).setFixedSize(130,23);
  if(unlocked)button.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.startBoss(boss));card.add(button);
  return card;
 }
 private launchSelected():void {
  if(this.tab===3){const boss=(['outside','crimson'] as Boss[])[this.selected];if(boss&&canPracticeBoss(loadProgress(),boss))this.startBoss(boss);return;}
  const routes=SKILL_ROUTES.filter(route=>route.chapter===CHAPTERS[this.tab]),route=routes[this.selected];if(route&&canPracticeRoute(loadProgress(),route.id))this.startRoute(route);
 }
 private startRoute(route:SkillRoute):void {if(!canPracticeRoute(loadProgress(),route.id))return;this.leaveForPractice();this.scene.start(route.chapter+'-route-practice',{routePractice:route.id});}
 private startBoss(boss:Boss):void {if(!canPracticeBoss(loadProgress(),boss))return;this.leaveForPractice();this.scene.start(boss==='outside'?'regent-practice':'crab-practice',{practice:true});}
 private leaveForPractice():void {
  if(this.pausedScene&&this.scene.isPaused(this.pausedScene))this.scene.stop(this.pausedScene);
  if(this.scene.isActive('menu')||this.scene.isPaused('menu'))this.scene.stop('menu');
  this.registry.set('devPreview',false);
  this.scene.stop();
 }
 private back():void {
  const menuExists=this.scene.isActive('menu')||this.scene.isPaused('menu');
  this.scene.stop();
  if(menuExists)this.scene.resume('menu');else this.scene.start('menu');
 }
}
function chapterArt(chapter:SkillRoute['chapter']):string{return chapter==='jail'?'menu-jail-gallery':chapter==='outside'?'menu-wildwood':'menu-crimson-crab';}
function fmt(ms:number):string{return (ms/1000).toFixed(1)+'s';}
