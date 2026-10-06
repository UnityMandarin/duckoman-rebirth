import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import {alignSwordMeterFill,setSwordMeterCharge,SWORD_METER} from './SwordMeterArt';
import {playUltimateSwing} from './UltimateSwing';
import {RelicHud} from './RelicArt';

export const CHAPTER_HUD_FRAMES:Record<string,[number,number,number,number]>={
 'chapter-hud-backplate':[16,119,700,197], 'chapter-hud-portrait':[727,2,333,362],
 'chapter-hud-heart-full':[1237,107,265,232], 'chapter-hud-heart-empty':[1767,106,265,233],
 'chapter-hud-dash-frame':[23,472,503,140], 'chapter-hud-dash-fill':[561,472,505,140],
 'chapter-hud-boss-frame':[1086,446,533,188], 'chapter-hud-boss-fill':[1631,445,535,188]
};
export function registerChapterHudFrames(scene:Phaser.Scene):void {
 if(!scene.textures.exists('quality-chapter-hud'))return;
 const atlas=scene.textures.get('quality-chapter-hud');
 for(const[name,[x,y,w,h]]of Object.entries(CHAPTER_HUD_FRAMES))if(!atlas.has(name))atlas.add(name,0,x,y,w,h);
}

export function heartFillAmount(health:number,index:number):number{return Phaser.Math.Clamp(health-index,0,1);}
export function dashFillCrop(charge:number):number{return Math.round(505*Phaser.Math.Clamp(charge,0,1));}
export function swordFillCrop(charge:number):[number,number,number,number]{return [0,340,Math.round(2172*Phaser.Math.Clamp(charge,0,1)),44];}
export function drawSwordMeter(ctx:CanvasRenderingContext2D,frame:CanvasImageSource,fill:CanvasImageSource,charge:number):void{
 const [sx,sy,sw,sh]=swordFillCrop(charge);ctx.clearRect(0,0,300,64);
 if(sw>0)ctx.drawImage(fill,sx,sy,sw,sh,37,25.5,187*Phaser.Math.Clamp(charge,0,1),9.5);
 ctx.drawImage(frame,0,0,300,64);
}
export function drawDashMeter(ctx:CanvasRenderingContext2D,atlas:CanvasImageSource,charge:number,disabled=false):void{
 const amount=Phaser.Math.Clamp(charge,0,1),[fx,fy,fw,fh]=CHAPTER_HUD_FRAMES['chapter-hud-dash-frame'],[x,y,fillWidth,height]=CHAPTER_HUD_FRAMES['chapter-hud-dash-fill'];
 ctx.clearRect(0,0,97,13);ctx.globalAlpha=disabled?.5:1;
 if(amount>0)ctx.drawImage(atlas,x,y,fillWidth*amount,height,0,0,97*amount,13);
 ctx.drawImage(atlas,fx,fy,fw,fh,0,0,97,13);ctx.globalAlpha=1;
}

const key=(label:string,description:string):string=>`<span class="game-control"><kbd>${label}</kbd><span>${description}</span></span>`;
/** Draws the original HUD artwork without its ornate green and gold backplate. */
export class ChapterHud {
 private fullHearts:Phaser.GameObjects.Image[]=[];
 private emptyHearts:Phaser.GameObjects.Image[]=[];
 private healthText:Phaser.GameObjects.Text;
 private abilityText?:HTMLElement;
 private displayedHealth=-1;
 private healthChangedAt=0;
 private drawKey=''; private abilityReady?:boolean; private swordCharge=-1;
 private domMeterKey='';
 private swordFill:Phaser.GameObjects.Image;
 private swordFrame:Phaser.GameObjects.Image;
 private relics:RelicHud;
 private controls?:HTMLElement;
 private domLayer?:HTMLElement;
 private swordCanvas?:HTMLCanvasElement;
 private dashCanvas?:HTMLCanvasElement;
 private dashDuck?:HTMLImageElement;
 private swordFrameSource?:CanvasImageSource;
 private swordFillSource?:CanvasImageSource;
 private hudAtlasSource?:CanvasImageSource;
 private resizeObserver?:ResizeObserver;
 private readonly bindings:Array<[string,()=>void]> = [];
 constructor(private scene:Phaser.Scene,private player:Player){
  scene.add.image(43,40,'duckoman').setDisplaySize(35,35).setScrollFactor(0).setDepth(50);
  scene.add.image(43,40,'quality-chapter-hud','chapter-hud-portrait').setDisplaySize(48,48).setScrollFactor(0).setDepth(51);
  this.healthText=scene.add.text(185,10,'DUCKOMAN',{fontSize:'11px',color:'#e8d8b7'}).setScrollFactor(0).setDepth(51);
  for(let i=0;i<3;i++){
   const x=82+i*28,y=8;
   this.emptyHearts.push(scene.add.image(x,y,'quality-chapter-hud','chapter-hud-heart-empty').setOrigin(0).setDisplaySize(22,21).setScrollFactor(0).setDepth(51));
   this.fullHearts.push(scene.add.image(x,y,'quality-chapter-hud','chapter-hud-heart-full').setOrigin(0).setDisplaySize(22,21).setScrollFactor(0).setDepth(52));
  }
  this.swordFill=scene.add.image(0,0,'ultimate-sword-fill').setScrollFactor(0).setDepth(49).setVisible(false);
  alignSwordMeterFill(this.swordFill);
  this.swordFrame=scene.add.image(SWORD_METER.frameX,SWORD_METER.frameY,'ultimate-sword-frame').setOrigin(0).setDisplaySize(SWORD_METER.frameWidth,SWORD_METER.frameHeight).setScrollFactor(0).setDepth(52).setVisible(false);
  this.relics=new RelicHud(scene,50);
  this.swordFrameSource=scene.textures.get('ultimate-sword-frame').getSourceImage() as CanvasImageSource;
  this.swordFillSource=scene.textures.get('ultimate-sword-fill').getSourceImage() as CanvasImageSource;
  this.hudAtlasSource=scene.textures.get('quality-chapter-hud').getSourceImage() as CanvasImageSource;
  this.createControls();
  const charge=this.player.usingUltimate?0:this.player.ultimateCharge/100;this.drawDomMeters(charge,this.player.dashCharge,this.player.dashDisabled);this.domMeterKey=`${charge}|${this.player.dashCharge}|${this.player.dashDisabled}`;
 }
 private createControls():void {
  if(typeof document==='undefined')return;
  const parent=document.getElementById('game');if(!parent)return;
  parent.classList.add('game-hud-root');
  const layer=document.createElement('div');layer.className='game-hud-dom';
  layer.innerHTML='<div class="game-hud-glass" aria-hidden="true"></div><canvas class="game-hud-sword" width="600" height="128" aria-hidden="true"></canvas><span class="game-hud-ultimate">U · ULTIMATE</span><canvas class="game-hud-dash" width="194" height="26" aria-hidden="true"></canvas><img class="game-hud-duck" src="'+(import.meta.env.BASE_URL||'/')+'assets/gate3/duckoman.png" alt="">';
  parent.appendChild(layer);this.domLayer=layer;this.swordCanvas=layer.querySelector('.game-hud-sword') as HTMLCanvasElement;this.dashCanvas=layer.querySelector('.game-hud-dash') as HTMLCanvasElement;this.dashDuck=layer.querySelector('.game-hud-duck') as HTMLImageElement;this.abilityText=layer.querySelector('.game-hud-ultimate') as HTMLElement;
  const updateScale=():void=>{if(this.domLayer)this.domLayer.style.transform=`scale(${parent.clientWidth/640})`;};updateScale();
  if(typeof ResizeObserver!=='undefined'){this.resizeObserver=new ResizeObserver(updateScale);this.resizeObserver.observe(parent);}
  const controls=document.createElement('nav');controls.className='game-controls';controls.setAttribute('aria-label','Game controls');
  controls.innerHTML=key('A/D · ←/→','Move')+key('L Shift','Sprint')+key('Space / L','Jump')+key('K','Dash')+key('S','Tuck/slam')+key('J','Interact/throw')+key('U','Ultimate');
  parent.appendChild(controls);this.controls=controls;
  this.listen('pause',()=>this.setDomHidden(true));this.listen('sleep',()=>this.setDomHidden(true));
  this.listen('resume',()=>this.setDomHidden(false));this.listen('wake',()=>this.setDomHidden(false));
  this.listen('shutdown',()=>this.destroy());this.listen('destroy',()=>this.destroy());
 }
 private listen(event:string,fn:()=>void):void{this.scene.events.on(event,fn);this.bindings.push([event,fn]);}
 private setDomHidden(hidden:boolean):void{if(this.controls)this.controls.hidden=hidden;if(this.domLayer)this.domLayer.hidden=hidden;}
 private drawDomMeters(charge:number,dash:number,disabled:boolean):void{
  if(this.swordCanvas&&this.swordFrameSource&&this.swordFillSource){const ctx=this.swordCanvas.getContext('2d');if(ctx){ctx.setTransform(2,0,0,2,0,0);drawSwordMeter(ctx,this.swordFrameSource,this.swordFillSource,charge);}}
  if(this.dashCanvas&&this.hudAtlasSource){const ctx=this.dashCanvas.getContext('2d');if(ctx){ctx.setTransform(2,0,0,2,0,0);drawDashMeter(ctx,this.hudAtlasSource,dash,disabled);}}
 }
 update():void {
  if(this.displayedHealth!==this.player.health){this.displayedHealth=this.player.health;this.healthChangedAt=this.scene.time.now;}
  this.updateAbilityHud();this.relics.update();
  const charge=this.player.usingUltimate?0:this.player.ultimateCharge/100;
  if(charge!==this.swordCharge){this.swordCharge=charge;setSwordMeterCharge(this.swordFill,charge);}
  const domMeterKey=`${charge}|${this.player.dashCharge}|${this.player.dashDisabled}`;
  if(domMeterKey!==this.domMeterKey){this.domMeterKey=domMeterKey;this.drawDomMeters(charge,this.player.dashCharge,this.player.dashDisabled);if(this.dashDuck)this.dashDuck.title=this.player.dashDisabled?'Dash disabled until landing':'Dash cooldown';}
  const pulse=Math.max(0,1-(this.scene.time.now-this.healthChangedAt)/420),pulseKey=Math.round(pulse*100),dashKey=Math.round(this.player.dashCharge*97),key=`${this.player.health}|${pulseKey}|${dashKey}|${this.player.dashCharge>=1}|${this.player.dashDisabled}`;
  if(key===this.drawKey)return;this.drawKey=key;
  for(let i=0;i<3;i++){
   const amount=heartFillAmount(this.player.health,i),y=8-Math.sin((pulseKey/100)*Math.PI)*2;
   this.emptyHearts[i].setY(y).setVisible(amount<1);
   this.fullHearts[i].setPosition(82+i*28,y).setVisible(amount>0).setCrop(0,0,Math.max(1,265*amount),232);
  }
 }
 private updateAbilityHud():void {const ready=this.player.ultimateCharge>=100;if(this.abilityReady===ready)return;this.abilityReady=ready;if(this.abilityText)this.abilityText.textContent=ready?'U · ULTIMATE READY':'U · ULTIMATE';}
 useUltimate():void{playUltimateSwing(this.scene,this.player,{frame:this.swordFrame,fill:this.swordFill,setVisible:visible=>{if(visible){this.domMeterKey='';this.update();}if(this.domLayer)this.domLayer.classList.toggle('ultimate-in-flight',!visible);}});}
 destroy():void{for(const[event,fn]of this.bindings)this.scene.events.off(event,fn);this.bindings.length=0;this.resizeObserver?.disconnect();this.resizeObserver=undefined;this.domLayer?.remove();this.domLayer=undefined;this.controls?.remove();this.controls=undefined;}
}
