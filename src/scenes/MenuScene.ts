import Phaser from 'phaser';
import {loadProgress,saveProgress,resetChapter,sceneDataFromProgress,canPracticeBoss,canPersistCampaign,type CampaignScene} from '../systems/progress';
import {renderQuality,setRenderQuality,setupRenderScale} from '../systems/renderScale';
import type {RenderQuality} from '../systems/performancePolicy';
import {resetCampaignRunEligibility,campaignRunEligible} from '../systems/debug/debugSettings';
import {chapterSections,type ChapterKind} from '../data/chapters';
import {preloadSceneAssets} from './SceneAssets';
import {resetKeys} from '../systems/MenuControl';
const cards:{key:CampaignScene;name:string;art:string;requires?:CampaignScene}[]=[
 {key:'gate-1',name:'Corrupted Kingdom',art:'menu-ruined-kingdom'},
 {key:'jail',name:'Sunken Cells',art:'menu-jail-gallery',requires:'gate-1'},
 {key:'outside',name:'Wildlands',art:'menu-wildwood',requires:'jail'},
 {key:'crimson',name:'Crimson Throne',art:'menu-crimson-crab',requires:'outside'},
 {key:'rescue',name:'Hollow Prison',art:'menu-cistern',requires:'crimson'}
];
export class MenuScene extends Phaser.Scene {
 private pausedScene?:CampaignScene;private selection=0;private resumeAction!:()=>void;private launches:((()=>void)|undefined)[]=[];private replays:((()=>void)|undefined)[]=[];private focus!:Phaser.GameObjects.Rectangle;private graphicsButton!:Phaser.GameObjects.Text;
 constructor(){super('menu');}
 preload():void {preloadSceneAssets(this,'menu');}
 create(data:{pausedScene?:CampaignScene}={}):void {
  this.pausedScene=data.pausedScene;this.launches=[];this.replays=[];this.cameras.main.setBackgroundColor(0x090d12);
  if(this.pausedScene&&this.scene.isPaused(this.pausedScene))this.scene.setVisible(false,this.pausedScene);
  this.add.rectangle(320,200,640,400,0x101722).setStrokeStyle(2,0x71572f);
  this.add.text(320,20,'THE CROWN ROAD',{fontFamily:'Georgia',fontSize:'21px',color:'#f1d18d',stroke:'#160e08',strokeThickness:4}).setOrigin(.5);
  this.add.text(320,45,'A Duckoman Rebirth campaign',{fontFamily:'Georgia',fontSize:'10px',color:'#afa98f'}).setOrigin(.5);
  const progress=loadProgress();
  cards.forEach((card,i)=>{
   const x=64+i*128,unlocked=progress.unlocked.includes(card.key),complete=progress.completed.includes(card.key),container=this.add.container(x,153);
   const panel=this.add.rectangle(0,0,116,190,unlocked?0x1b2430:0x11151b,.98).setStrokeStyle(1,unlocked?0x80683f:0x454448);container.add(panel);
   const img=this.add.image(0,-48,card.art).setDisplaySize(106,76).setAlpha(unlocked?1:.36);container.add(img);
   if(!unlocked){const lock=this.add.image(0,-48,'chained-lock').setDisplaySize(61,61).setDepth(2);container.add(lock);}
   container.add(this.add.text(0,0,`CHAPTER ${i+1}`,{fontFamily:'Georgia',fontSize:'8px',color:'#d2b678'}).setOrigin(.5));
   container.add(this.add.text(0,14,card.name,{fontFamily:'Georgia',fontSize:'10px',color:unlocked?'#f1e6cb':'#797a7d',align:'center',wordWrap:{width:104}}).setOrigin(.5,0));
   const secrets=progress.chapters[card.key].discoveries.length;
   const total=card.key==='gate-1'?3:card.key==='rescue'?0:chapterSections(card.key as ChapterKind).filter(section=>section.secret).length;
   const rescueStatus=card.key==='rescue'?`FRANKLIN: ${progress.chapters.rescue.bossDefeated?'SAVED':progress.chapters.rescue.opened.includes(0)?'RELEASED':'CHAINED'}`:undefined;
   container.add(this.add.text(0,38,rescueStatus??(unlocked?`DISCOVERIES  ${secrets}/${total}${complete?' · COMPLETE':''}`:`LOCKED · ${cards[i-1]?.name}`),{fontSize:rescueStatus?'7px':'8px',color:unlocked?'#c8bda7':'#88817c',align:'center',wordWrap:{width:104}}).setOrigin(.5,0));
   this.button(container,-26,70,'CONTINUE',unlocked?0xa98548:0x3a3b3f,()=>this.openChapter(card.key,false),unlocked,47,true);
   if(i===this.selection)this.focus=this.add.rectangle(x,153,120,194).setFillStyle(0,0).setStrokeStyle(2,0xf4d27f).setDepth(5);
   this.launches.push(unlocked?()=>this.openChapter(card.key,false):undefined);this.replays.push(unlocked?()=>this.openChapter(card.key,true):undefined);
   this.button(container,26,70,'REPLAY',unlocked?0x4b5661:0x33363a,()=>this.openChapter(card.key,true),unlocked,47,true);
  });
  this.resumeAction=()=>{const p=loadProgress();if(this.pausedScene&&this.scene.isPaused(this.pausedScene)){const parentKey=this.pausedScene;this.scene.setVisible(true,parentKey);this.scene.stop();this.scene.resume(parentKey);resetKeys(this.scene.get(parentKey));return;}if(p.ended){this.openChapter('gate-1',true);return;}if(!this.pausedScene&&!hasProgress(p)){this.openChapter('gate-1',true);return;}this.scene.start(p.currentScene,sceneDataFromProgress(p,p.currentScene));};
  const mainAction=()=>{if(loadProgress().ended){this.openChapter('gate-1',true);return;}this.resumeAction();};
  this.button(this,320,293,progress.ended?'REPLAY CAMPAIGN':hasProgress(progress)?'CONTINUE JOURNEY':'BEGIN JOURNEY',0x98713b,mainAction,true,320);
  this.button(this,100,330,'JOURNAL',0x4b5661,()=>this.openJournal(),true,180);
  this.button(this,320,330,'ROUTE PRACTICE',0x4b5661,()=>this.openRouteSelect(0),true,220);
  this.button(this,540,330,'BOSS TRIALS',0x4b5661,()=>this.openRouteSelect(3),true,160);
  this.add.text(320,363,'↑ / ↓ select    ENTER continue    R replay    J journal    P routes    G Regent    C Claw    ESC resume',{fontSize:'8px',color:'#a8a395'}).setOrigin(.5);
  this.graphicsButton=this.button(this,320,385,this.graphicsLabel(),0x292f36,()=>this.toggleGraphics(),true,200);
  setupRenderScale(this,'menu-hud');this.cameras.main.ignore(this.children.list);
  const keyboard=this.input.keyboard;if(keyboard){const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape'){this.resumeAction();return;}if(e.key==='ArrowRight'||e.key==='ArrowDown'){this.selection=(this.selection+1)%cards.length;this.moveFocus();}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){this.selection=(this.selection+cards.length-1)%cards.length;this.moveFocus();}if(e.key==='Enter')this.launches[this.selection]?.();if(e.key.toLowerCase()==='r')this.replays[this.selection]?.();if(e.key.toLowerCase()==='j')this.openJournal();if(e.key.toLowerCase()==='p')this.openRouteSelect(0);if(e.key.toLowerCase()==='g')this.openPractice('regent-practice','outside');if(e.key.toLowerCase()==='c')this.openPractice('crab-practice','crimson');if(e.key.toLowerCase()==='q')this.toggleGraphics();};keyboard.on('keydown',keydown);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>keyboard.off('keydown',keydown));}
 }
 private graphicsLabel():string{return renderQuality()==='smooth'?'GRAPHICS: SMOOTH · FEWER PIXELS':'GRAPHICS: SHARP · MORE PIXELS';}
 private toggleGraphics():void {const next:RenderQuality=renderQuality()==='smooth'?'sharp':'smooth';setRenderQuality(next,this.game);this.graphicsButton?.setText(this.graphicsLabel());}
 private openJournal():void {this.scene.pause();this.scene.launch('journal');}
 private openRouteSelect(tab:number):void {this.scene.pause();this.scene.launch('routes',{pausedScene:this.pausedScene,tab});}
 private openPractice(sceneKey:'regent-practice'|'crab-practice',requiredChapter:'outside'|'crimson'):void {if(!canPracticeBoss(loadProgress(),requiredChapter))return;if(this.pausedScene&&this.scene.isPaused(this.pausedScene))this.scene.stop(this.pausedScene);this.pausedScene=undefined;this.registry.set('devPreview',false);this.scene.start(sceneKey,{practice:true});}
 private button(parent:Phaser.GameObjects.Container|this,x:number,y:number,label:string,color:number,action:()=>void,enabled:boolean,width=62,interactive=enabled,cardButton=width===47):Phaser.GameObjects.Text {const text=this.add.text(x,y,label,{fontFamily:'Georgia',fontSize:cardButton?'7px':'8px',color:enabled?'#fff0cc':'#777',backgroundColor:`#${color.toString(16).padStart(6,'0')}`,padding:cardButton?{x:2,y:2}:{x:5,y:5},align:'center'}).setOrigin(.5).setFixedSize(width,19);if(interactive)text.setInteractive({useHandCursor:true}).on('pointerdown',action);if(parent instanceof Phaser.GameObjects.Container)parent.add(text);return text;}
 private openChapter(scene:CampaignScene,replay:boolean):void {const p=loadProgress();if(!p.unlocked.includes(scene))return;if(this.pausedScene&&this.scene.isPaused(this.pausedScene))this.scene.stop(this.pausedScene);this.registry.set('devPreview',false);if(replay)resetCampaignRunEligibility();if(scene==='rescue'&&!canPersistCampaign({runEligible:campaignRunEligible()})){if(replay)this.scene.start('rescue',{devPreview:true,freshReplay:true});else this.scene.start('rescue',{...sceneDataFromProgress(p,'rescue')});return;}const next=replay?resetChapter(p,scene):p;next.currentScene=scene;next.ended=false;saveProgress(next);this.scene.start(scene,{...sceneDataFromProgress(next,scene),freshReplay:replay});}
 private moveFocus():void {this.focus?.setPosition(64+this.selection*128,153);}
}
function hasProgress(p:ReturnType<typeof loadProgress>):boolean{return p.completed.length>0||p.unlocked.length>1||Object.values(p.chapters).some(c=>c.checkpoint>0||c.charge>0||c.secrets.length||c.opened.length||c.bossDefeated);}
function fmt(ms:number):string{return `${(ms/1000).toFixed(1)}s`;}
