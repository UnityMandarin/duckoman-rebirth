import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {ChapterKind,Ledge} from '../data/chapters';
import {CHAPTER_DIFFICULTY,encounterFor,encounterSurfaceEffects,advanceWindDrift,addWindDrift,canReceiveWind} from '../data/chapterChallenges';
import {rectsOverlap} from './contactRules';
import {showHitbox} from './DebugHitboxes';
import {nearbySectionIndexes} from './performancePolicy';
export interface ChapterSurface {shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image;ledge:Ledge;}
type Press={section:number;x:number;ground:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;phase:'idle'|'warn'|'fall'|'return';at:number;hit:boolean};
type Crumble={section:number;surface:ChapterSurface;at:number;broken:boolean};
type Special={section:number;surface:ChapterSurface;type:string;x:number;y:number;phase:number;direction:-1|1;strength:number};
export class ChapterTraps {
 private presses=new Map<number,Press[]>();
 private crumbles=new Map<number,Crumble[]>();
 private specials=new Map<number,Special[]>();
 private activeWind?:{direction:-1|1;strength:number};
 private windDriftX=0;
 private effects=new Map<number,Phaser.GameObjects.Text[]>();
 private wind:Phaser.GameObjects.Graphics;
 private activeSections=new Set<number>();private lastPlayerSection=-1;private readonly sectionCount:number;
 constructor(private scene:Phaser.Scene,private player:Player,private kind:ChapterKind,surfaces:ChapterSurface[],onlySections?:readonly number[]){
  this.wind=scene.add.graphics().setDepth(8);
  const sections=kind==='jail'?12:kind==='crimson'?10:22;this.sectionCount=sections;
  const put=<T,>(map:Map<number,T[]>,section:number,item:T):void=>{const bucket=map.get(section)??[];bucket.push(item);map.set(section,bucket);};
  const buildSections=onlySections??Array.from({length:sections-1},(_,i)=>i+1);
  for(const i of buildSections){
   const encounter=encounterFor(kind,i);if(!encounter)continue;
   const ledges=surfaces.filter(s=>Math.floor(s.ledge.x/1440)===i);
   for(const effect of encounterSurfaceEffects(encounter)){
    const surface=ledges[effect.platformIndex];
    if(surface)put(this.specials,i,{section:i,surface,type:effect.type,x:surface.ledge.x,y:surface.ledge.y,phase:effect.platformIndex*Math.PI,direction:effect.direction,strength:effect.strength});
   }
   if(encounter.conveyor)for(const surface of ledges.slice(1,-1)){
    const cue=scene.add.text(surface.ledge.x,surface.ledge.y-27,encounter.conveyor.direction<0?'← ← ←':'→ → →',{fontSize:'13px',color:'#ffe09b',stroke:'#23180b',strokeThickness:3}).setOrigin(.5).setDepth(6).setAlpha(.16);
    put(this.effects,i,cue);
   }
   if(encounter.wind){
    const cue=scene.add.text(i*1440+720,154,`WIND  ${encounter.wind.direction<0?'←':'→'}  ·  DASH TO HOLD YOUR LINE`,{fontSize:'11px',color:'#c0e3dc',stroke:'#071119',strokeThickness:4}).setOrigin(.5).setDepth(6).setAlpha(.16);
    put(this.effects,i,cue);
   }
   if(encounter.type==='crumble'||encounter.type==='relay')for(const surface of ledges.slice(1,-1))put(this.crumbles,i,{section:i,surface,at:0,broken:false});
   if(['presses','crossfire','relay'].includes(encounter.type)){
    const targets=encounter.type==='presses'||encounter.type==='crossfire'?[ledges[1],ledges[ledges.length-2]]:[ledges[2]];
    targets.filter((target):target is ChapterSurface=>!!target).forEach((target,j)=>{
     const x=target.ledge.x,ground=target.ledge.y-16;
     put(this.presses,i,{section:i,x,ground,art:scene.add.image(x,-360,'rock-pillar-kit','pillar').setDisplaySize(70,240).setDepth(9),warning:scene.add.graphics().setDepth(8),phase:'idle',at:scene.time.now+1200+j*800,hit:false});
    });
   }
  }
 }
 update():void {
  const now=this.scene.time.now,p=this.player.body,factor=CHAPTER_DIFFICULTY[this.kind],dt=Math.min(50,Math.max(0,this.scene.game.loop.delta))/1000,section=Math.floor(p.center.x/1440),indexes=nearbySectionIndexes(section,this.sectionCount,1),active=new Set(indexes),entered=new Set(indexes.filter(i=>!this.activeSections.has(i)));
  this.wind.clear();this.activeWind=encounterFor(this.kind,section)?.wind;
  for(const previous of this.activeSections)if(!active.has(previous)){for(const cue of this.effects.get(previous)??[])cue.setAlpha(.16);for(const trap of this.presses.get(previous)??[]){trap.phase='idle';trap.at=now+Math.max(650,900/factor);trap.hit=false;trap.warning.clear();trap.art.setVisible(false).setY(-360);}}
  if(this.lastPlayerSection!==section){for(const cue of this.effects.get(this.lastPlayerSection)??[])cue.setAlpha(.16);this.lastPlayerSection=section;}
  for(const index of indexes)for(const cue of this.effects.get(index)??[])cue.setAlpha(index===section?.85:.16);
  if(this.activeWind){
   const {direction,strength}=this.activeWind;
   const receivesWind=canReceiveWind(true,this.player.grounded,this.player.isDashing,this.player.usingUltimate);
   this.windDriftX=advanceWindDrift(this.windDriftX,direction,strength*.45,dt,receivesWind,85);
   p.velocity.x=addWindDrift(p.velocity.x,this.windDriftX,receivesWind);
   this.wind.lineStyle(1,0xb6d9d1,.35);
   for(let j=0;j<12;j++){const x=section*1440+(now*.08+j*137)%1440,y=130+j%5*38;this.wind.lineBetween(x,y,x+direction*28,y);}
  }else this.windDriftX=0;
  for(const index of indexes)for(const special of this.specials.get(index)??[]){
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
    const dx=special.direction*special.strength*dt;
    if(standing&&!this.player.usingUltimate){p.position.x+=dx;p.prev.x+=dx;this.player.sprite.x+=dx;}
    this.wind.lineStyle(2,0xc5b079,.65);
    for(let j=0;j<4;j++){const x=body.left+(now*.05+j*40)%ledge.width;this.wind.lineBetween(x,body.top+7,x+special.direction*10,body.top+7);}
    continue;
   }
   const wave=Math.sin(now/950+special.phase);
   const nx=special.x+(special.type==='ferry'?wave*65:0),ny=special.y+(special.type==='lift'?wave*65:0);
   const dx=nx-shape.x,dy=ny-shape.y;
   shape.setPosition(nx,ny);body.updateFromGameObject();art.setPosition(nx,ny-16);ledge.x=nx;ledge.y=ny;
   if(standing&&!entered.has(special.section)){p.position.x+=dx;p.position.y+=dy;p.prev.x+=dx;p.prev.y+=dy;this.player.sprite.x+=dx;this.player.sprite.y+=dy;}
  }
  for(const index of indexes)for(const trap of this.presses.get(index)??[]){
   trap.warning.clear();
   if(entered.has(trap.section)){trap.phase='idle';trap.at=now+Math.max(650,900/factor);trap.hit=false;trap.art.setY(-360);}
   const near=Math.abs(p.center.x-trap.x)<650;trap.art.setVisible(near);
   if(!near){trap.phase='idle';trap.at=now+Math.max(650,900/factor);trap.art.y=-360;continue;}
   if(trap.phase==='idle'&&now>=trap.at){trap.phase='warn';trap.at=now+Math.max(650,900/factor);trap.hit=false;}
   if(trap.phase==='warn'){
    trap.warning.lineStyle(2,0xff5046,.8);
    for(let y=-240;y<trap.ground;y+=18)trap.warning.lineBetween(trap.x,y,trap.x,y+7);
    trap.warning.lineStyle(3,0xff5046).lineBetween(trap.x-35,trap.ground,trap.x+35,trap.ground);
    if(now>=trap.at){trap.phase='fall';trap.at=now;}
   }
   if(trap.phase==='fall'){
    const progress=Math.min(1,(now-trap.at)/180);
    trap.art.y=Phaser.Math.Linear(-360,trap.ground-120,progress*progress);
    const zone={left:trap.x-32,right:trap.x+32,top:trap.art.y-120,bottom:trap.art.y+120};
    if(!trap.hit)showHitbox(this.scene,'danger',zone);
    if(!trap.hit&&rectsOverlap(p,zone)){trap.hit=this.player.takeDamage(trap.x,2);}
    if(now-trap.at>=500){trap.phase='return';trap.at=now;}
   }else if(trap.phase==='return'){
    trap.art.y=Phaser.Math.Linear(trap.ground-120,-360,Math.min(1,(now-trap.at)/650));
    if(now-trap.at>=650){trap.phase='idle';trap.at=now+Phaser.Math.Between(1500,2600)/factor;}
   }
  }
  for(const index of indexes)for(const crumble of this.crumbles.get(index)??[]){
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
  this.activeSections=active;
 }
}
