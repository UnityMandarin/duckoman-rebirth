import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {ChapterKind,Ledge} from '../data/chapters';
import {CHAPTER_DIFFICULTY,encounterFor} from '../data/chapterChallenges';
export interface ChapterSurface {shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image;ledge:Ledge;}
export class ChapterTraps {
 private presses:{x:number;ground:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;phase:'idle'|'warn'|'fall'|'return';at:number;hit:boolean}[]=[];
 private crumbles:{surface:ChapterSurface;at:number;broken:boolean}[]=[];
 constructor(private scene:Phaser.Scene,private player:Player,private kind:ChapterKind,surfaces:ChapterSurface[]){
  const sections=kind==='jail'?12:22;
  for(let i=1;i<sections;i++){
   const encounter=encounterFor(kind,i)!;
   const ledges=surfaces.filter(s=>Math.floor(s.ledge.x/1440)===i).sort((a,b)=>a.ledge.x-b.ledge.x);
   if(encounter.type==='crumble'||encounter.type==='relay')for(const surface of ledges.slice(1,-1))this.crumbles.push({surface,at:0,broken:false});
   if(['presses','crossfire','relay'].includes(encounter.type)){
    const targets=encounter.type==='presses'||encounter.type==='crossfire'?[ledges[1],ledges[ledges.length-2]]:[ledges[2]];
    targets.forEach((target,j)=>{
     const x=target.ledge.x,ground=target.ledge.y-16;
     this.presses.push({x,ground,art:scene.add.image(x,-360,'rock-pillar-kit','pillar').setDisplaySize(70,240).setDepth(9),warning:scene.add.graphics().setDepth(8),phase:'idle',at:scene.time.now+1200+j*800,hit:false});
    });
   }
  }
 }
 update():void {
  const now=this.scene.time.now,p=this.player.body,factor=CHAPTER_DIFFICULTY[this.kind];
  for(const trap of this.presses){
   trap.warning.clear();
   const near=Math.abs(p.center.x-trap.x)<650;trap.art.setVisible(near);
   if(!near){trap.phase='idle';trap.at=now+500;trap.art.y=-360;continue;}
   if(trap.phase==='idle'&&now>=trap.at){trap.phase='warn';trap.at=now+900/factor;trap.hit=false;}
   if(trap.phase==='warn'){
    trap.warning.lineStyle(2,0xff5046,.8);
    for(let y=-240;y<trap.ground;y+=18)trap.warning.lineBetween(trap.x,y,trap.x,y+7);
    trap.warning.lineStyle(3,0xff5046).lineBetween(trap.x-35,trap.ground,trap.x+35,trap.ground);
    if(now>=trap.at){trap.phase='fall';trap.at=now;}
   }
   if(trap.phase==='fall'){
    const progress=Math.min(1,(now-trap.at)/180);
    trap.art.y=Phaser.Math.Linear(-360,trap.ground-120,progress*progress);
    if(!trap.hit&&p.right>trap.x-32&&p.left<trap.x+32&&p.bottom>trap.art.y-120&&p.top<trap.art.y+120){trap.hit=this.player.takeDamage(trap.x,2);}
    if(now-trap.at>=500){trap.phase='return';trap.at=now;}
   }else if(trap.phase==='return'){
    trap.art.y=Phaser.Math.Linear(trap.ground-120,-360,Math.min(1,(now-trap.at)/650));
    if(now-trap.at>=650){trap.phase='idle';trap.at=now+Phaser.Math.Between(1500,2600)/factor;}
   }
  }
  for(const crumble of this.crumbles){
   const {shape,art,ledge}=crumble.surface,top=ledge.y-16;
   const over=p.right>ledge.x-ledge.width/2&&p.left<ledge.x+ledge.width/2;
   if(!crumble.at&&over&&Math.abs(p.bottom-top)<9&&this.player.grounded)crumble.at=now+600/factor;
   if(!crumble.at)continue;
   if(!crumble.broken){
    art.setTint(0xd8aa78).setAlpha(.8+Math.sin(now*.07)*.2);
    if(now>=crumble.at){crumble.broken=true;crumble.at=now+2600;(shape.body as Phaser.Physics.Arcade.StaticBody).enable=false;art.setAlpha(.12);}
   }else if(now>=crumble.at&&!(over&&p.bottom>top&&p.top<ledge.y+16)){
    (shape.body as Phaser.Physics.Arcade.StaticBody).enable=true;art.clearTint().setAlpha(1);crumble.at=0;crumble.broken=false;
   }
  }
 }
}
