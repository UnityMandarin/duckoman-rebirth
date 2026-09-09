import Phaser from 'phaser';
import { GATE_1_ROOM } from '../data/gate1Room';
import type { Player } from './Player';
import { pillarPhase } from '../systems/PillarTiming';

export class FallingPillar {
  private triggeredAt: number | undefined;
  private landed = false;
  private hit = false;
  private previousBottom = -10;
  private readonly shape: Phaser.GameObjects.Rectangle;
  private readonly art: Phaser.GameObjects.Container;
  private readonly warning: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Rectangle;
  private readonly guide:Phaser.GameObjects.Graphics;
  get surface() {
    const p=GATE_1_ROOM.pillar;
    return this.landed ? {x:p.x,y:360-p.height/2,width:p.width,height:p.height} : undefined;
  }
  constructor(private readonly scene: Phaser.Scene, private readonly player: Player) {
    this.guide=scene.add.graphics().setDepth(12);
    const p=GATE_1_ROOM.pillar;
    this.shape=scene.add.rectangle(p.x,-200,p.width,p.height,0,0);
    scene.physics.add.existing(this.shape,true);
    (this.shape.body as Phaser.Physics.Arcade.StaticBody).enable=false;
    scene.physics.add.collider(player.sprite,this.shape);
    const pieces: Phaser.GameObjects.GameObject[]=[];
    for(let i=0;i<4;i++) pieces.push(scene.add.image(0,i*p.height/4,'masonry','trimmed').setOrigin(0.5,0).setDisplaySize(p.width,p.height/4+5));
    this.art=scene.add.container(p.x,-p.height-10,pieces).setDepth(4).setVisible(false);
    this.zone=scene.add.rectangle(p.x,357,p.width,6,0xff3028,0.9).setDepth(7).setVisible(false);
    this.warning=scene.add.text(p.x,160,'⚠ FALLING PILLAR',{fontFamily:'Arial',fontSize:'14px',color:'#ffd789',stroke:'#180b05',strokeThickness:4}).setOrigin(0.5).setDepth(12).setVisible(false);
  }
  update(): void {
    const p=GATE_1_ROOM.pillar;
    if(this.triggeredAt===undefined) {
      if(this.player.sprite.x<p.triggerX || !this.player.active) return;
      this.triggeredAt=this.scene.time.now;
    }
    const elapsed=this.scene.time.now-this.triggeredAt;
    const phase=pillarPhase(elapsed,p.warningMs,p.fallMs);
    if(phase==='warning') {
      this.guide.clear().fillStyle(0xff3329,.9);
      for(let y=-10;y<357;y+=16)this.guide.fillRect(p.x-2,y,4,7);
      this.warning.setVisible(true); this.zone.setVisible(true).setAlpha(0.4+Math.abs(Math.sin(elapsed/100))*0.6); return;
    }
    this.guide.clear();
    this.warning.setVisible(false); this.art.setVisible(true);
    const progress=Phaser.Math.Clamp((elapsed-p.warningMs)/p.fallMs,0,1);
    const top=Phaser.Math.Linear(-p.height-10,360-p.height,progress*progress);
    const bottom=top+p.height;
    this.art.y=top;
    const body=this.player.body;
    if(this.player.active && !this.landed && !this.hit && body.right>p.x-p.width/2 && body.left<p.x+p.width/2 && body.bottom>top && body.top<=bottom && body.bottom>=this.previousBottom) {
      this.hit=this.player.takeDamage(p.x,p.damage);
    }
    this.previousBottom=bottom;
    if(phase==='landed' && !this.landed) {
      this.landed=true; this.zone.setVisible(false);
      this.shape.setPosition(p.x,360-p.height/2);
      const staticBody=this.shape.body as Phaser.Physics.Arcade.StaticBody;
      staticBody.updateFromGameObject(); staticBody.enable=true;
      const impact=this.scene.add.ellipse(p.x,357,90,10,0xe5bf81,0.65).setDepth(6);
      this.scene.tweens.add({targets:impact,scaleX:2,alpha:0,duration:280,onComplete:()=>impact.destroy()});
      if(this.player.active && body.right>p.x-p.width/2 && body.left<p.x+p.width/2 && body.bottom>360-p.height && body.top<360) {
        const x=body.center.x<p.x?p.x-p.width/2-body.halfWidth-2:p.x+p.width/2+body.halfWidth+2;
        body.reset(x,this.player.sprite.y);
      }
    }
  }
}
