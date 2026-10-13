import Phaser from 'phaser';
import {canPracticeBoss,loadProgress} from '../systems/progress';
import {setupRenderScale} from '../systems/renderScale';
import {preloadSceneAssets} from './SceneAssets';

type Boss='outside'|'crimson';
interface GalleryData {pausedScene?:string;}

export class BossTrialsScene extends Phaser.Scene {
 private selected=0;
 private pausedScene?:string;
 private cards:Phaser.GameObjects.Container[]=[];
 constructor(){super('boss-trials');}
 preload():void {preloadSceneAssets(this,'menu');}
 create(data:GalleryData={}):void {
  this.pausedScene=data.pausedScene;
  this.selected=0;
  this.cameras.main.setBackgroundColor(0x090d12);
  this.add.rectangle(320,200,640,400,0x101722).setStrokeStyle(2,0x71572f);
  this.add.text(320,20,'BOSS TRIALS',{fontFamily:'Georgia',fontSize:'21px',color:'#f1d18d',stroke:'#160e08',strokeThickness:3}).setOrigin(.5);
  this.add.text(320,344,'← / → boss    ENTER practice    ESC back',{fontSize:'8px',color:'#a8a395'}).setOrigin(.5);
  this.add.text(320,375,'BACK',{fontFamily:'Georgia',fontSize:'9px',color:'#fff0cc',backgroundColor:'#352716',padding:{x:8,y:4}}).setOrigin(.5).setFixedSize(90,20).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.back());
  this.renderCards();
  setupRenderScale(this,'menu-hud');this.cameras.main.ignore(this.children.list);
  const keyboard=this.input.keyboard;if(keyboard){const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape'){this.back();return;}if(e.key==='ArrowLeft'){this.move(-1);return;}if(e.key==='ArrowRight'){this.move(1);return;}if(e.key==='ArrowUp'){this.move(-1);return;}if(e.key==='ArrowDown'){this.move(1);return;}if(e.key==='Enter')this.launchSelected();};keyboard.on('keydown',keydown);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>keyboard.off('keydown',keydown));}
 }
 private move(delta:number):void {this.selected=(this.selected+delta+this.itemCount())%this.itemCount();this.renderCards();}
 private itemCount():number{return 2;}
 private renderCards():void {
  this.cards.forEach(card=>card.destroy(true));this.cards=[];
  (['outside','crimson'] as Boss[]).forEach((boss,i)=>this.cards.push(this.makeBossCard(boss,i)));
  this.cameras.main.ignore(this.cards);
 }
 private makeBossCard(boss:Boss,index:number):Phaser.GameObjects.Container {
  const x=215+index*210,progress=loadProgress(),unlocked=canPracticeBoss(progress,boss),record=progress.trials[boss],card=this.add.container(x,201),name=boss==='outside'?'BROKEN REGENT':'CRIMSON CLAW',art=boss==='outside'?'menu-wildwood':'menu-crimson-crab';
  card.add(this.add.rectangle(0,0,195,205,unlocked?0x1b2430:0x11151b,.98).setStrokeStyle(1,this.selected===index?0xf1d18d:0x65583e).setInteractive().on('pointerdown',()=>{this.selected=index;this.renderCards();}));
  card.add(this.add.image(0,-57,art).setDisplaySize(170,60).setAlpha(unlocked?1:.32));
  if(!unlocked)card.add(this.add.image(0,-57,'chained-lock').setDisplaySize(45,45).setDepth(2));
  card.add(this.add.text(0,-16,name,{fontFamily:'Georgia',fontSize:'11px',color:'#f1e6cb',align:'center'}).setOrigin(.5,0));
  card.add(this.add.text(0,45,unlocked?(record.bestMs?'BEST '+fmt(record.bestMs):'No clear yet'):'LOCKED',{fontSize:'9px',color:'#d6c9ad',align:'center'}).setOrigin(.5,0));
  card.add(this.add.text(0,59,record.hitless?'HITLESS':'',{fontSize:'8px',color:'#b8dc99'}).setOrigin(.5,0));
  const button=this.add.text(0,81,unlocked?'PRACTICE':'LOCKED',{fontFamily:'Georgia',fontSize:'9px',color:unlocked?'#fff0cc':'#777',backgroundColor:unlocked?'#594426':'#303237',padding:{x:6,y:5},align:'center'}).setOrigin(.5).setFixedSize(130,23);
  if(unlocked)button.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.startBoss(boss));card.add(button);
  return card;
 }
 private launchSelected():void {const boss=(['outside','crimson'] as Boss[])[this.selected];if(boss&&canPracticeBoss(loadProgress(),boss))this.startBoss(boss);}
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
function fmt(ms:number):string{return (ms/1000).toFixed(1)+'s';}
