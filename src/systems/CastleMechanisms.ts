import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ThrowableObject } from '../entities/ThrowableObject';
import { CASTLE, STORY } from '../data/castle';

interface SpikeTrap {kind:'spikes';x:number;groundY:number;art:Phaser.GameObjects.Image;}
interface CrusherTrap {kind:'crusher';x:number;groundY:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;nextStrike:number;warnAt:number;activeUntil:number;}
type Trap=SpikeTrap|CrusherTrap;

export class CastleMechanisms {
  private traps:Trap[]=[];
  private storyIndex=0;
  private caption:Phaser.GameObjects.Text;
  private captionUntil=0;
  constructor(private scene:Phaser.Scene,private player:Player,throwable:ThrowableObject,_terrain:Phaser.Physics.Arcade.StaticGroup) {
    this.caption=scene.add.text(320,350,'',{fontFamily:'Georgia',fontSize:'15px',color:'#ffe5ab',stroke:'#030811',strokeThickness:5,align:'center',wordWrap:{width:530}}).setOrigin(.5).setScrollFactor(0).setDepth(25);

    // The only second-layer spaces are small, trapped dead ends behind these walls.
    for(const [x,y] of [[3370,300],[6380,300],[7980,300]] as const) {
      const wall=scene.add.image(x,y,'masonry','trimmed').setDisplaySize(42,130).setDepth(3).setTint(0xb49a73);
      scene.physics.add.existing(wall,true);
      const crack=scene.add.graphics().setDepth(4).lineStyle(2,0xffcb73,.9)
        .lineBetween(x-5,y-55,x+9,y-20).lineBetween(x+9,y-20,x-8,y+12).lineBetween(x-8,y+12,x+4,y+55);
      let broken=false;
      const destroy=()=>{if(broken)return;broken=true;wall.destroy();crack.destroy();};
      scene.physics.add.collider(player.sprite,wall,undefined,()=>player.isDashing?(destroy(),false):!broken);
      scene.physics.add.collider(throwable.sprite,wall,()=>{if(throwable.registerEnemyHit())destroy();});
    }

    // Full-height locks make every button mandatory; the generated art explains the pairing.
    for(const [buttonX,gateX,groundY] of [[4020,4225,360],[7070,7310,360],[8740,8940,360]] as const) {
      const gateBody=scene.add.rectangle(gateX,(CASTLE.top+groundY)/2,26,groundY-CASTLE.top,0,0);
      scene.physics.add.existing(gateBody,true);scene.physics.add.collider(player.sprite,gateBody);
      const gate=scene.add.image(gateX,groundY,'lock-kit','door').setOrigin(.5,1).setDisplaySize(116,230).setDepth(4);
      scene.add.rectangle(gateX,(CASTLE.top+130)/2,32,130-CASTLE.top,0x172333).setStrokeStyle(2,0x856236).setDepth(2);
      const button=scene.add.image(buttonX,groundY,'lock-kit','button').setOrigin(.5,1).setDisplaySize(54,16).setDepth(5);
      const trigger=scene.add.rectangle(buttonX,groundY-5,54,10,0,0);
      scene.physics.add.existing(trigger,true);
      let opened=false;
      scene.physics.add.overlap(player.sprite,trigger,()=>{
        if(opened)return;opened=true;
        (gateBody.body as Phaser.Physics.Arcade.StaticBody).enable=false;
        button.setTint(0x77ffff);
        scene.tweens.add({targets:[gate,gateBody],y:CASTLE.top+40,alpha:.12,duration:650});
      });
    }

    const spikes:[number,number][]=[3050,3560,3880,4660,4920,5250,5500,5800,6250,6690,6960,7520,7800,8290,8540,9330,9970,11070].map(x=>[x,360]);
    for(const [x,groundY] of spikes) {
      const art=scene.add.image(x,groundY+18,'spike-platform','hazard').setOrigin(.5,1).setDisplaySize(84,48).setFlipY(true).setDepth(5);
      this.traps.push({kind:'spikes',x,groundY,art});
    }
    for(const x of [3700,5100,6500,8100,9460,10890]) {
      const groundY=360;
      const art=scene.add.image(x,-100,'rock-pillar-kit','pillar').setOrigin(.5,1).setDisplaySize(78,280).setDepth(7);
      const warning=scene.add.graphics().setDepth(6);
      const next=this.scene.time.now+Phaser.Math.Between(1600,3600);
      this.traps.push({kind:'crusher',x,groundY,art,warning,nextStrike:next,warnAt:next-850,activeUntil:0});
    }

  }
  say(text:string):void {this.caption.setText(text);this.captionUntil=this.scene.time.now+6500;}
  update():void {
    const now=this.scene.time.now,p=this.player.body;
    if(this.storyIndex<STORY.length&&this.player.sprite.x>=STORY[this.storyIndex].x)this.say(STORY[this.storyIndex++].text);
    this.caption.setAlpha(Math.min(1,Math.max(0,(this.captionUntil-now)/600)));
    for(const t of this.traps) {
      if(t.kind==='spikes') {
        const pulse=.7+Math.sin(now*.012+t.x)*.3;
        t.art.setAlpha(.78+pulse*.22).setTint(pulse>.88?0xffffff:0xe7a260);
        if(p.right>t.x-38&&p.left<t.x+38&&p.bottom>t.groundY-26&&p.top<t.groundY)this.player.takeDamage(t.x);
        continue;
      }
      if(now>=t.nextStrike) {
        t.activeUntil=now+520;t.nextStrike=now+Phaser.Math.Between(2200,4300);t.warnAt=t.nextStrike-900;
        this.scene.tweens.killTweensOf(t.art);
        this.scene.tweens.add({targets:t.art,y:t.groundY,duration:190,ease:'Cubic.In',yoyo:true,hold:330,repeat:0});
      }
      const warning=now>=t.warnAt&&now<t.nextStrike;
      t.warning.clear();
      if(warning)t.warning.lineStyle(4,0xff3028,.65+Math.sin(now*.025)*.3).lineBetween(t.x-39,t.groundY-4,t.x+39,t.groundY-4);
      if(now<t.activeUntil&&p.right>t.x-38&&p.left<t.x+38&&p.bottom>t.art.y-250&&p.top<t.art.y)this.player.takeDamage(t.x,1);
    }
  }
}
