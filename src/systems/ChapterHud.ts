import Phaser from 'phaser';
import type {Player} from '../entities/Player';
/** Shares the kingdom's hand-built HUD and ultimate choreography in the new chapters. */
export class ChapterHud {
 private hud:Phaser.GameObjects.Graphics;
 private healthText:Phaser.GameObjects.Text;
 private abilityText:Phaser.GameObjects.Text;
 private displayedHealth=-1;
 private healthChangedAt=0;
 constructor(private scene:Phaser.Scene,private player:Player){
  this.hud=scene.add.graphics().setScrollFactor(0).setDepth(50);
  scene.add.image(43,40,'duckoman').setDisplaySize(45,42).setScrollFactor(0).setDepth(51);
  this.healthText=scene.add.text(82,10,'DUCKOMAN',{fontSize:'11px',color:'#e8d8b7'}).setScrollFactor(0).setDepth(51);
  this.abilityText=scene.add.text(82,58,'U · ULTIMATE',{fontSize:'10px',color:'#dfceaa'}).setScrollFactor(0).setDepth(51);
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
    g.fillStyle(0x090b10).fillRoundedRect(81, 32, 250, 21, 9);
    g.lineStyle(2, 0xb17c29).strokeRoundedRect(81, 32, 250, 21, 9);
    const w=this.player.usingUltimate?0:242*this.player.ultimateCharge/100;
    if(w>0) { g.fillStyle(0xe96416).fillRoundedRect(85,36,w,13,5); g.fillStyle(0xffcb52).fillRoundedRect(85,36,w,6,3); g.fillStyle(0xfff2b0).fillRect(89,36,Math.max(0,w-8),2); }
    // Sword tip, shaded crossguard, leather grip and brass pommel.
    g.fillStyle(0x684018).fillTriangle(77,32,67,42,77,53);
    g.fillStyle(0xffd27b).fillTriangle(77,33,69,42,77,41);
    g.fillStyle(0x754918).fillRoundedRect(328,27,7,31,3);
    g.fillStyle(0xeaba5d).fillRoundedRect(329,27,3,30,1);
    g.fillStyle(0x38211b).fillRoundedRect(335,38,20,9,2);
    for(let x=337;x<355;x+=4) { g.lineStyle(1,0xc18539).lineBetween(x,38,x-2,47); }
    g.fillStyle(0x9c6221).fillCircle(358,42,7);
    g.lineStyle(1,0xffd881).strokeCircle(358,42,5);
    g.fillStyle(0xffe5a0).fillCircle(357,40,2);
    if(w>8) {
      const shine=89+(this.scene.time.now*0.045)%Math.max(1,w-8);
      g.fillStyle(0xffffff,0.18+Math.sin(this.scene.time.now*0.003)*0.08).fillTriangle(shine,37,Math.min(shine+7,85+w),37,shine-3,48);
    }
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
      const fill=Phaser.Math.Clamp(this.player.stamina-i,0,1);
      g.fillStyle(0x072838).fillRoundedRect(220+i*34,58,29,13,5);
      if(fill>0) {
        const sx=220+i*34, sw=29*fill;
        g.fillStyle(0x075a9b).fillRoundedRect(sx,58,sw,13,5);
        g.fillStyle(0x12c8ee).fillRoundedRect(sx+1,59,Math.max(0,sw-2),9,4);
        g.fillStyle(0xa5f5ff).fillRoundedRect(sx+2,59,Math.max(0,sw-4),3,2);
        g.fillStyle(0x03517c).fillTriangle(sx+2,68,sx+sw-2,68,sx+sw/2,71);
        g.fillStyle(0xffffff,0.55).fillTriangle(sx+3,60,sx+Math.min(9,sw),60,sx+3,65);
      }
    }
  }
  private updateAbilityHud(): void {
    this.abilityText.setText(this.player.ultimateCharge>=100?'U · ULTIMATE READY':'U · ULTIMATE');
  }
  useUltimate():void {
    const p=this.player;p.ultimateCharge=0;p.ultimateUntil=this.scene.time.now+900;
    p.abilities.setSprint(false,this.scene.time.now);
    p.abilities.cancelTransient();p.body.setVelocity(0,0).setAllowGravity(false);
    // Lift the actual HUD sword artwork into the world, then swing from Duckoman's hand.
    if(this.scene.textures.exists('ultimate-sword'))this.scene.textures.remove('ultimate-sword');
    this.hud.generateTexture('ultimate-sword',640,100);
    this.scene.textures.get('ultimate-sword').add('blade',0,67,27,298,31);
    const start=this.scene.cameras.main.getWorldPoint(215,42);
    const sword=this.scene.add.image(start.x,start.y,'ultimate-sword','blade').setDisplaySize(220,25).setDepth(45);
    this.scene.tweens.add({targets:sword,x:p.sprite.x+p.facing*22,y:p.sprite.y-10,displayWidth:130,displayHeight:20,duration:280,ease:'Cubic.InOut',onComplete:()=>{
      sword.setOrigin(.9,.5).setFlipX(p.facing<0).setAngle(p.facing*-100);
      this.scene.tweens.add({targets:sword,angle:p.facing*70,duration:360,ease:'Cubic.InOut'});
      this.scene.time.delayedCall(160,()=>{
        this.scene.events.emit('ultimate-strike',p);
        const arc=this.scene.add.graphics().setPosition(p.sprite.x,p.sprite.y).setDepth(44).lineStyle(14,0xffda70,.75);
        arc.beginPath().arc(0,0,125,-1.5,1.5).strokePath();
        arc.setScale(p.facing,1);this.scene.tweens.add({targets:arc,alpha:0,duration:250,onComplete:()=>arc.destroy()});
      });
    }});
    this.scene.time.delayedCall(900,()=>{sword.destroy();p.body.setAllowGravity(true);});
  }
}
