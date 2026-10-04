import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import {DashMeter} from './DashMeter';
import {alignSwordMeterFill,setSwordMeterCharge,SWORD_METER} from './SwordMeterArt';
import {playUltimateSwing} from './UltimateSwing';
import {RelicHud} from './RelicArt';
const CHAPTER_HUD_FRAMES:Record<string,[number,number,number,number]>={
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
/** Shares the kingdom's hand-built HUD and ultimate choreography in the new chapters. */
export class ChapterHud {
 private backplate:Phaser.GameObjects.Image;
 private fullHearts:Phaser.GameObjects.Image[]=[];
 private emptyHearts:Phaser.GameObjects.Image[]=[];
 private dashFrame:Phaser.GameObjects.Image;
 private dashFill:Phaser.GameObjects.Image;
 private healthText:Phaser.GameObjects.Text;
 private abilityText:Phaser.GameObjects.Text;
 private displayedHealth=-1;
 private healthChangedAt=0;
 private drawKey='';private abilityReady?:boolean;private swordCharge=-1;
 private dashMeter:DashMeter;
 private swordFill:Phaser.GameObjects.Image;
 private swordFrame:Phaser.GameObjects.Image;
 private relics:RelicHud;
 constructor(private scene:Phaser.Scene,private player:Player){
  this.relics=new RelicHud(scene,50);
  this.backplate=scene.add.image(7,4,'quality-chapter-hud','chapter-hud-backplate').setOrigin(0).setDisplaySize(360,72).setScrollFactor(0).setDepth(48);
  scene.add.image(43,40,'duckoman').setDisplaySize(35,35).setScrollFactor(0).setDepth(50);
  scene.add.image(43,40,'quality-chapter-hud','chapter-hud-portrait').setDisplaySize(48,48).setScrollFactor(0).setDepth(51);
  this.healthText=scene.add.text(82,10,'DUCKOMAN',{fontSize:'11px',color:'#e8d8b7'}).setScrollFactor(0).setDepth(51);
  this.abilityText=scene.add.text(82,58,'U · ULTIMATE',{fontSize:'10px',color:'#dfceaa'}).setScrollFactor(0).setDepth(51);
  for(let i=0;i<3;i++){
   const x=211+i*33,y=8;
   this.emptyHearts.push(scene.add.image(x,y,'quality-chapter-hud','chapter-hud-heart-empty').setOrigin(0).setDisplaySize(22,21).setScrollFactor(0).setDepth(51));
   this.fullHearts.push(scene.add.image(x,y,'quality-chapter-hud','chapter-hud-heart-full').setOrigin(0).setDisplaySize(22,21).setScrollFactor(0).setDepth(52));
  }
  this.dashMeter=new DashMeter(scene,51);
  this.dashFrame=scene.add.image(220,58,'quality-chapter-hud','chapter-hud-dash-frame').setOrigin(0).setDisplaySize(97,13).setScrollFactor(0).setDepth(50);
  this.dashFill=scene.add.image(220,58,'quality-chapter-hud','chapter-hud-dash-fill').setOrigin(0).setDisplaySize(97,13).setScrollFactor(0).setDepth(49);
  this.swordFill=scene.add.image(0,0,'ultimate-sword-fill').setScrollFactor(0).setDepth(49);
  alignSwordMeterFill(this.swordFill);
  this.swordFrame=scene.add.image(SWORD_METER.frameX,SWORD_METER.frameY,'ultimate-sword-frame').setOrigin(0).setDisplaySize(SWORD_METER.frameWidth,SWORD_METER.frameHeight).setScrollFactor(0).setDepth(52);
 }
  update(): void {
    if (this.displayedHealth !== this.player.health) { this.displayedHealth = this.player.health; this.healthChangedAt = this.scene.time.now; }
    this.updateAbilityHud();
    this.relics.update();
    const charge=this.player.usingUltimate?0:this.player.ultimateCharge/100;
    if(charge!==this.swordCharge){this.swordCharge=charge;setSwordMeterCharge(this.swordFill,charge);}
    const pulse=Math.max(0,1-(this.scene.time.now-this.healthChangedAt)/420),pulseKey=Math.round(pulse*100),dashKey=Math.round(this.player.dashCharge*97),key=`${this.player.health}|${pulseKey}|${dashKey}|${this.player.dashCharge>=1}|${this.player.dashDisabled}`;
    if(key===this.drawKey)return;this.drawKey=key;
    for(let i=0;i<3;i++){
      const amount=Phaser.Math.Clamp(this.player.health-i,0,1),y=8-Math.sin((pulseKey/100)*Math.PI)*2;
      this.emptyHearts[i].setY(y).setVisible(amount<1);
      this.fullHearts[i].setPosition(211+i*33,y).setVisible(amount>0).setCrop(0,0,Math.max(1,265*amount),232);
    }
    const alpha=this.player.dashDisabled?.5:1;
    this.dashFrame.setAlpha(alpha);this.dashFill.setAlpha(alpha).setVisible(this.player.dashCharge>0).setCrop(0,0,Math.max(1,505*this.player.dashCharge),140);
  }
  private updateAbilityHud(): void {
    const ready=this.player.ultimateCharge>=100;if(this.abilityReady===ready)return;this.abilityReady=ready;this.abilityText.setText(ready?'U · ULTIMATE READY':'U · ULTIMATE');
  }
  useUltimate():void {playUltimateSwing(this.scene,this.player,{frame:this.swordFrame,fill:this.swordFill});}
}
