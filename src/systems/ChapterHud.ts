import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import {DashMeter} from './DashMeter';
import {alignSwordMeterFill,setSwordMeterCharge,SWORD_METER} from './SwordMeterArt';
import {playUltimateSwing} from './UltimateSwing';
/** Shares the kingdom's hand-built HUD and ultimate choreography in the new chapters. */
export class ChapterHud {
 private hud:Phaser.GameObjects.Graphics;
 private healthText:Phaser.GameObjects.Text;
 private abilityText:Phaser.GameObjects.Text;
 private displayedHealth=-1;
 private healthChangedAt=0;
 private dashMeter:DashMeter;
 private swordFill:Phaser.GameObjects.Image;
 private swordFrame:Phaser.GameObjects.Image;
 constructor(private scene:Phaser.Scene,private player:Player){
  this.hud=scene.add.graphics().setScrollFactor(0).setDepth(48);
  scene.add.image(43,40,'duckoman').setDisplaySize(45,42).setScrollFactor(0).setDepth(51);
  this.healthText=scene.add.text(82,10,'DUCKOMAN',{fontSize:'11px',color:'#e8d8b7'}).setScrollFactor(0).setDepth(51);
  this.abilityText=scene.add.text(82,58,'U · ULTIMATE',{fontSize:'10px',color:'#dfceaa'}).setScrollFactor(0).setDepth(51);
  this.dashMeter=new DashMeter(scene,51);
  this.swordFill=scene.add.image(0,0,'ultimate-sword-fill').setScrollFactor(0).setDepth(49);
  alignSwordMeterFill(this.swordFill);
  this.swordFrame=scene.add.image(SWORD_METER.frameX,SWORD_METER.frameY,'ultimate-sword-frame').setOrigin(0).setDisplaySize(SWORD_METER.frameWidth,SWORD_METER.frameHeight).setScrollFactor(0).setDepth(52);
 }
  update(): void {
    if (this.displayedHealth !== this.player.health) { this.displayedHealth = this.player.health; this.healthChangedAt = this.scene.time.now; }
    this.healthText.setText('DUCKOMAN');
    this.updateAbilityHud();
    const g = this.hud.clear();
    g.fillStyle(0x03070d, 0.7).fillRoundedRect(7, 4, 360, 72, 18);
    g.fillStyle(0x090c10).fillCircle(43, 40, 31);
    g.lineStyle(4, 0x70441a).strokeCircle(43, 40, 32);
    g.lineStyle(1, 0xf9ce71).strokeCircle(43, 40, 29).strokeCircle(43, 40, 35);
    for (let i=0;i<8;i++) { const a=i*Math.PI/4; g.fillStyle(0xe5aa42).fillCircle(43+Math.cos(a)*32,40+Math.sin(a)*32,2); }
    const charge=this.player.usingUltimate?0:this.player.ultimateCharge/100;
    setSwordMeterCharge(this.swordFill,charge);
    for(let i=0;i<3;i++) {
      const pulse=Math.max(0,1-(this.scene.time.now-this.healthChangedAt)/420);
      const x=221+i*32, y=17-Math.sin(pulse*Math.PI)*2;
      const amount=Phaser.Math.Clamp(this.player.health-i,0,1);
      g.fillStyle(0x190c17).fillCircle(x-4,y-2,6).fillCircle(x+4,y-2,6).fillTriangle(x-10,y-1,x+10,y-1,x,y+11);
      // Each lobe and half-triangle is independent so 0.5 health is a true half heart.
      for(let side=0;side<2;side++) {
        const lit=amount>side*0.5;
        const dir=side===0?-1:1;
        g.fillStyle(lit?0xa90824:0x39232d).fillCircle(x+dir*4,y-2,5).fillTriangle(x,y-1,x+dir*9,y-1,x,y+9);
        if(lit) {
          g.fillStyle(0xf82c42).fillCircle(x+dir*4,y-3,4).fillTriangle(x,y-2,x+dir*7,y-2,x,y+6);
          g.fillStyle(0xff8c92).fillEllipse(x+dir*4-1,y-5,4,2);
          g.fillStyle(0xffded8,0.8).fillCircle(x+dir*4-2,y-5,0.9);
        }
      }
    }
    this.dashMeter.draw(g,this.player.dashCharge,this.player.dashDisabled);
  }
  private updateAbilityHud(): void {
    this.abilityText.setText(this.player.ultimateCharge>=100?'U · ULTIMATE READY':'U · ULTIMATE');
  }
  useUltimate():void {playUltimateSwing(this.scene,this.player,{frame:this.swordFrame,fill:this.swordFill});}
}
