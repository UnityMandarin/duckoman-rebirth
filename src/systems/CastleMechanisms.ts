import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ThrowableObject } from '../entities/ThrowableObject';
import { STORY } from '../data/castle';

export class CastleMechanisms {
  private traps: {x:number;y:number;kind:'spikes'|'crusher';art:Phaser.GameObjects.Graphics;disabled:boolean;phase:number}[]=[];
  private storyIndex=0;
  private caption:Phaser.GameObjects.Text;
  private captionUntil=0;
  constructor(private scene:Phaser.Scene,private player:Player,throwable:ThrowableObject,terrain:Phaser.Physics.Arcade.StaticGroup) {
    this.caption=scene.add.text(320,350,'',{fontFamily:'Georgia',fontSize:'15px',color:'#ffe5ab',stroke:'#030811',strokeThickness:5,align:'center',wordWrap:{width:530}}).setOrigin(.5).setScrollFactor(0).setDepth(25);
    for(const x of [3440,4670,6190,7810]) {
      const wall=scene.add.image(x,300,'masonry','trimmed').setDisplaySize(40,120).setDepth(3).setTint(0xb49a73);
      scene.physics.add.existing(wall,true);
      const crack=scene.add.graphics().setDepth(4).lineStyle(2,0xffcb73,.8);
      crack.lineBetween(x-5,245,x+9,278).lineBetween(x+9,278,x-8,307).lineBetween(x-8,307,x+4,350);
      let broken=false;
      const destroy=()=>{if(broken)return;broken=true;wall.destroy();crack.destroy();};
      scene.physics.add.collider(player.sprite,wall,undefined,()=>{
        if(player.isDashing){destroy();return false;}return !broken;
      });
      scene.physics.add.collider(throwable.sprite,wall,()=>{if(throwable.registerEnemyHit())destroy();});
    }
    // Consistent brass floor buttons open linked iron gates, with visible wiring.
    for(const [buttonX,gateX] of [[3960,4020],[6580,6660],[8690,8880]]) {
      const gate=scene.add.rectangle(gateX,275,24,170,0x53606d).setStrokeStyle(3,0x9b7140).setDepth(3);
      scene.physics.add.existing(gate,true);scene.physics.add.collider(player.sprite,gate);
      const button=scene.add.rectangle(buttonX,355,42,10,0xffb33d).setStrokeStyle(2,0xe7d29a).setDepth(4);
      scene.physics.add.existing(button,true);
      scene.add.graphics().lineStyle(2,0xb58137,.5).lineBetween(buttonX,358,gateX,358).setDepth(3);
      let opened=false;
      scene.physics.add.overlap(player.sprite,button,()=>{
        if(opened)return;opened=true;
        (gate.body as Phaser.Physics.Arcade.StaticBody).enable=false;
        button.setFillStyle(0x65d9ba);
        scene.tweens.add({targets:gate,y:90,alpha:.25,duration:550});
        const trap=this.traps.find(t=>Math.abs(t.x-gateX)<400);if(trap)trap.disabled=true;
      });
    }
    for(const [x,kind] of [[4800,'spikes'],[5500,'crusher'],[6120,'spikes'],[7040,'spikes'],[7560,'crusher'],[8240,'spikes'],[8780,'crusher']] as const) {
      this.traps.push({x,y:360,kind,art:scene.add.graphics().setDepth(4),disabled:false,phase:(x%700)*2});
    }
    // Old royal standards become scarred, then threaded with occupation cables.
    for(const x of [2900,4250,5700,7100,8500]) {
      scene.add.rectangle(x,-20,60,150,0x501d28).setStrokeStyle(2,0x986b35).setDepth(-4);
      scene.add.image(x,0,'duckoman').setDisplaySize(30,28).setTint(0xbf8d38).setAlpha(.65).setDepth(-3);
      if(x>5000) scene.add.graphics().lineStyle(5,0x151e28).lineBetween(x-80,-120,x+30,120).setDepth(-2);
    }
    void terrain;
  }
  say(text:string):void {this.caption.setText(text);this.captionUntil=this.scene.time.now+6500;}
  update():void {
    const now=this.scene.time.now,p=this.player.body;
    if(this.storyIndex<STORY.length && this.player.sprite.x>=STORY[this.storyIndex].x)this.say(STORY[this.storyIndex++].text);
    this.caption.setAlpha(Math.min(1,Math.max(0,(this.captionUntil-now)/600)));
    for(const t of this.traps) {
      const g=t.art.clear();if(Math.abs(t.x-this.player.sprite.x)>800)continue;
      const phase=(now+t.phase)%3200, warning=phase>=1400&&phase<2200, active=phase>=2200&&phase<2750;
      g.fillStyle(0x253340).fillRect(t.x-42,355,84,5);
      if(t.disabled){g.fillStyle(0x5ebdb0).fillCircle(t.x,356,3);continue;}
      if(warning)g.fillStyle(0xffbd4e,.35+Math.sin(now*.025)*.2).fillRect(t.x-45,351,90,7);
      if(t.kind==='spikes') {
        const height=active?30:5;g.fillStyle(active?0xd6e3eb:0x66818b);
        for(let i=0;i<7;i++)g.fillTriangle(t.x-42+i*12,360,t.x-36+i*12,360-height,t.x-30+i*12,360);
        if(active&&p.right>t.x-42&&p.left<t.x+42&&p.bottom>332&&p.top<360)this.player.takeDamage(t.x);
      } else {
        const y=active?Phaser.Math.Linear(150,315,Math.min(1,(phase-2200)/180)):phase>=2750?Phaser.Math.Linear(315,150,(phase-2750)/450):150;
        g.lineStyle(4,0x6f7581).lineBetween(t.x,40,t.x,y);
        g.fillStyle(0x344759).fillRect(t.x-38,y,76,45);
        g.lineStyle(2,warning?0xffb744:0x94764f).strokeRect(t.x-38,y,76,45);
        if(active&&p.right>t.x-38&&p.left<t.x+38&&p.bottom>y&&p.top<y+45)this.player.takeDamage(t.x,1);
      }
    }
  }
}
