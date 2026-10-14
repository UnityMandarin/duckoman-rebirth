import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ThrowableObject } from '../entities/ThrowableObject';
import { BreakableWall } from '../entities/BreakableWall';
import { CASTLE, STORY } from '../data/castle';
import { rectsOverlap } from './contactRules';
import { showHitbox, tagBody } from './DebugHitboxes';
import type {PredictHazard} from './descentPrediction';
import type {PredictSurface} from './descentPrediction';

interface SpikeTrap {kind:'spikes';x:number;groundY:number;art:Phaser.GameObjects.Image;}
interface CrusherTrap {kind:'crusher';x:number;groundY:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;nextStrike:number;warnAt:number;activeUntil:number;}
type Trap=SpikeTrap|CrusherTrap;
export const CASTLE_BREAKABLE_SIZE={width:42,height:130} as const;

export class CastleMechanisms {
  private traps:Trap[]=[];
  private walls:BreakableWall[]=[];
  private cameraBlockers:{shape:Phaser.GameObjects.Rectangle;surface:PredictSurface;breakable?:BreakableWall}[]=[];
  private storyIndex=0;
  private caption:Phaser.GameObjects.Text;
  private captionUntil=0;
  private readonly onGateOpen:(id:number)=>void;private readonly onSecret:(id:number)=>void;
  constructor(private scene:Phaser.Scene,private player:Player,throwable:ThrowableObject,_terrain:Phaser.Physics.Arcade.StaticGroup,onGateOpen:(id:number)=>void=()=>{},onSecret:(id:number)=>void=()=>{},opened:number[] = [],secrets:number[] = []) {
    this.onGateOpen=onGateOpen;this.onSecret=onSecret;
    this.caption=scene.add.text(320,350,'',{fontFamily:'Georgia',fontSize:'15px',color:'#ffe5ab',stroke:'#030811',strokeThickness:5,align:'center',wordWrap:{width:530}}).setOrigin(.5).setScrollFactor(0).setDepth(25);

    // The only second-layer spaces are small, trapped dead ends behind these walls.
    for(const [i,[x,y]] of ([[3370,300],[6380,300],[7980,300]] as const).entries()) {
      const solid=scene.add.rectangle(x,y,CASTLE_BREAKABLE_SIZE.width,CASTLE_BREAKABLE_SIZE.height,0,0);
      scene.physics.add.existing(solid,true);tagBody(solid,'target');
      const wall=scene.add.image(x,y,'cracked-stone-wall').setDisplaySize(CASTLE_BREAKABLE_SIZE.width,CASTLE_BREAKABLE_SIZE.height).setDepth(3);
      const breakable=new BreakableWall(scene,solid,[wall]);
      const top=solid.y-CASTLE_BREAKABLE_SIZE.height/2;this.cameraBlockers.push({shape:solid,breakable,surface:{id:`castle-wall-${x}`,room:Math.floor(x/2560),left:x-CASTLE_BREAKABLE_SIZE.width/2,right:x+CASTLE_BREAKABLE_SIZE.width/2,top,bottom:top+CASTLE_BREAKABLE_SIZE.height,enabled:true,landing:false}});
      if(secrets.includes(i))breakable.break(undefined,false);
      this.walls.push(breakable);
      scene.physics.add.collider(player.sprite,solid);
      scene.physics.add.collider(throwable.sprite,solid,()=>{
        if(throwable.registerEnemyHit()&&!breakable.isBroken){breakable.break({x:throwable.body.velocity.x,y:throwable.body.velocity.y});this.onSecret(i);}
      });
    }

    // Full-height locks make every button mandatory; the generated art explains the pairing.
    for(const [index,[buttonX,gateX,groundY]] of ([[4020,4225,360],[7070,7310,360],[8740,8940,360]] as const).entries()) {
      const gateBody=scene.add.rectangle(gateX,(CASTLE.top+groundY)/2,26,groundY-CASTLE.top,0,0);
      this.cameraBlockers.push({shape:gateBody,surface:{id:`castle-gate-${index}`,room:Math.floor(gateX/2560),left:gateX-13,right:gateX+13,top:CASTLE.top,bottom:groundY,enabled:true,landing:false}});
      scene.physics.add.existing(gateBody,true);scene.physics.add.collider(player.sprite,gateBody);
      const gate=scene.add.image(gateX,groundY,'lock-kit','door').setOrigin(.5,1).setDisplaySize(116,230).setDepth(4);
      scene.add.rectangle(gateX,(CASTLE.top+130)/2,32,130-CASTLE.top,0x172333).setStrokeStyle(2,0x856236).setDepth(2);
      const button=scene.add.image(buttonX,groundY,'lock-kit','button').setOrigin(.5,1).setDisplaySize(54,16).setDepth(5);
      const trigger=scene.add.rectangle(buttonX,groundY-5,54,10,0,0);
      scene.physics.add.existing(trigger,true);tagBody(trigger,'interact');
      let isOpen=opened.includes(index);
      if(isOpen){(gateBody.body as Phaser.Physics.Arcade.StaticBody).enable=false;gate.setVisible(false);button.setTint(0x77ffff);}
      scene.physics.add.overlap(player.sprite,trigger,()=>{
        if(isOpen)return;isOpen=true;this.onGateOpen(index);
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
  fillPredictionSurfaces(out:PredictSurface[],startIndex=0,roomStart=-Infinity,roomEnd=Infinity):number {
    let count=startIndex;for(const blocker of this.cameraBlockers){const body=blocker.shape.body as Phaser.Physics.Arcade.StaticBody,s=blocker.surface;s.enabled=!!body.enable&&!(blocker.breakable?.isBroken??false);s.left=body.left;s.right=body.right;s.top=body.top;s.bottom=body.bottom;if(!s.enabled||s.room<roomStart||s.room>roomEnd)continue;out[count++]=s;}return count;
  }
  /** Current authored spike and crusher tells for traversal prediction; never advances trap state. */
  fillPredictionHazards(out:PredictHazard[],startIndex=0,left=-Infinity,right=Infinity):number {
    let count=startIndex;const now=this.scene.time.now;
    for(const trap of this.traps){if(trap.x+45<=left||trap.x-45>=right)continue;let h=out[count];if(!h){h={id:'',left:0,right:0,top:0,bottom:0,active:false,kind:'spike'};out[count]=h;}
      h.id='castle-hazard';h.left=trap.x-(trap.kind==='spikes'?38:39);h.right=trap.x+(trap.kind==='spikes'?38:39);
      if(trap.kind==='spikes'){h.top=trap.groundY-26;h.bottom=trap.groundY;h.kind='spike';h.active=true;count++;continue;}
      const active=now<trap.activeUntil,warning=now>=trap.warnAt&&now<trap.nextStrike;if(!active&&!warning){h.active=false;continue;}
      h.top=active?trap.art.y-250:trap.art.y-280;h.bottom=active?trap.art.y:trap.groundY;h.kind=active?'spike':'press';h.active=true;count++;
    }
    for(let i=count;i<out.length;i++)out[i]!.active=false;return count;
  }
  update():void {
    const now=this.scene.time.now,p=this.player.body;
    if(this.storyIndex<STORY.length&&this.player.sprite.x>=STORY[this.storyIndex].x)this.say(STORY[this.storyIndex++].text);
    this.caption.setAlpha(Math.min(1,Math.max(0,(this.captionUntil-now)/600)));
    this.walls.forEach((wall,i)=>{const wasBroken=wall.isBroken;wall.checkDash(this.player);if(!wasBroken&&wall.isBroken)this.onSecret(i);});
    for(const t of this.traps) {
      if(t.kind==='spikes') {
        const pulse=.7+Math.sin(now*.012+t.x)*.3;
        t.art.setAlpha(.78+pulse*.22).setTint(pulse>.88?0xffffff:0xe7a260);
        const zone={left:t.x-38,right:t.x+38,top:t.groundY-26,bottom:t.groundY};
        showHitbox(this.scene,'danger',zone);
        if(rectsOverlap(p,zone))this.player.takeDamage(t.x);
        continue;
      }
      if(now>=t.nextStrike) {
        t.activeUntil=now+520;t.nextStrike=now+Phaser.Math.Between(2200,4300);t.warnAt=t.nextStrike-900;
        this.scene.tweens.killTweensOf(t.art);
        this.scene.tweens.add({targets:t.art,y:t.groundY,duration:190,ease:'Cubic.In',yoyo:true,hold:330,repeat:0});
      }
      const warning=now>=t.warnAt&&now<t.nextStrike;
      t.warning.clear();
      if(warning){
        t.warning.lineStyle(4,0xff3028,.8).lineBetween(t.x-39,t.groundY-4,t.x+39,t.groundY-4);
        t.warning.fillStyle(0xff3028,.85);
        for(let y=t.art.y;y<t.groundY;y+=16)t.warning.fillRect(t.x-2,y,4,7);
      }
      if(now<t.activeUntil){
        const zone={left:t.x-38,right:t.x+38,top:t.art.y-250,bottom:t.art.y};
        showHitbox(this.scene,'danger',zone);
        if(rectsOverlap(p,zone))this.player.takeDamage(t.x,1);
      }
    }
  }
}
