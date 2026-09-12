import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {ChapterKind,Ledge} from '../data/chapters';
import {CHAPTER_DIFFICULTY,encounterFor} from '../data/chapterChallenges';
export interface ChapterSurface {shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image;ledge:Ledge;}
export class ChapterTraps {
 private presses:{x:number;ground:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;phase:'idle'|'warn'|'fall'|'return';at:number;hit:boolean}[]=[];
 private crumbles:{surface:ChapterSurface;at:number;broken:boolean}[]=[];
 private specials:{surface:ChapterSurface;type:string;x:number;y:number;phase:number}[]=[];
 private wind:Phaser.GameObjects.Graphics;
 constructor(private scene:Phaser.Scene,private player:Player,private kind:ChapterKind,surfaces:ChapterSurface[]){
  this.wind=scene.add.graphics().setDepth(8);
  const sections=kind==='jail'?12:22;
  for(let i=1;i<sections;i++){
   const encounter=encounterFor(kind,i)!;
   const ledges=surfaces.filter(s=>Math.floor(s.ledge.x/1440)===i).sort((a,b)=>a.ledge.x-b.ledge.x);
   if(['ferry','lift','conveyor','shutters'].includes(encounter.type))ledges.slice(1,-1).forEach((surface,j)=>this.specials.push({surface,type:encounter.type,x:surface.ledge.x,y:surface.ledge.y,phase:j*Math.PI}));
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
  this.wind.clear();
  const section=Math.floor(p.center.x/1440);
  if(encounterFor(this.kind,section)?.type==='gust'){
   const strength=Math.sin(now/1600)*100;
   if(!this.player.grounded&&!this.player.isDashing&&!this.player.usingUltimate)p.velocity.x+=strength;
   this.wind.lineStyle(1,0xb6d9d1,.35);
   for(let j=0;j<12;j++){const x=section*1440+(now*.08+j*137)%1440,y=130+j%5*38;this.wind.lineBetween(x,y,x+Math.sign(strength)*28,y);}
  }
  for(const special of this.specials){
   const {shape,art,ledge}=special.surface;
   const body=shape.body as Phaser.Physics.Arcade.StaticBody;
   const standing=body.enable&&this.player.grounded&&Math.abs(p.bottom-body.top)<10&&p.right>body.left&&p.left<body.right;
   if(special.type==='shutters'){
    const phase=(now+special.phase*450)%3000;
    const solid=phase<2100;
    const overlaps=p.right>body.left&&p.left<body.right&&p.bottom>body.top&&p.top<body.bottom;
    if(!solid)body.enable=false;else if(!overlaps)body.enable=true;
    art.setAlpha(body.enable?(phase>1650?.6+Math.sin(now*.04)*.3:1):.12);
    continue;
   }
   if(special.type==='conveyor'){
    const dx=Math.cos(special.phase)*70*this.scene.game.loop.delta/1000;
    if(standing&&!this.player.usingUltimate){p.position.x+=dx;p.prev.x+=dx;this.player.sprite.x+=dx;}
    this.wind.lineStyle(2,0xc5b079,.65);
    for(let j=0;j<4;j++){const x=body.left+(now*.05+j*40)%ledge.width;this.wind.lineBetween(x,body.top+7,x+Math.sign(dx)*10,body.top+7);}
    continue;
   }
   const wave=Math.sin(now/950+special.phase);
   const nx=special.x+(special.type==='ferry'?wave*65:0),ny=special.y+(special.type==='lift'?wave*65:0);
   const dx=nx-shape.x,dy=ny-shape.y;
   shape.setPosition(nx,ny);body.updateFromGameObject();art.setPosition(nx,ny-16);ledge.x=nx;ledge.y=ny;
   if(standing){p.position.x+=dx;p.position.y+=dy;p.prev.x+=dx;p.prev.y+=dy;this.player.sprite.x+=dx;this.player.sprite.y+=dy;}
  }
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
