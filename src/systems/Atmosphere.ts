import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {ChapterKind} from '../data/chapters';
import {damp,particleInView,particleOpacity,projectedX} from './atmosphereMath';

type Kind=ChapterKind|'castle';
type Fleck={image:Phaser.GameObjects.Image;active:boolean;age:number;life:number;vx:number;vy:number;phase:number;factor:number;near:boolean;baseScaleY:number;};
type Bough={image:Phaser.GameObjects.Image;slot:number;factor:number;near:boolean;};
/** Camera-local, fixed-size visual pools. No physics bodies, timers or event listeners. */
export class Atmosphere {
 private readonly particles:Fleck[]=[];
 private readonly fog:{image:Phaser.GameObjects.Image;slot:number;factor:number;alpha:number}[]=[];
 private readonly boughs:Bough[]=[];
 private readonly motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 private spawnIn=0;
 private cursor=0;
 private elapsed=0;
 constructor(private readonly scene:Phaser.Scene,private readonly kind:Kind){
  this.createTextures();
  const colors={castle:0xddb775,jail:0x9fb4c9,outside:0xafba8b,crimson:0xee6478};
  for(const [factor,depth,alpha,y] of [[.32,-16,.11,210],[.72,-2,.07,325]] as const){
   for(let slot=0;slot<3;slot++)this.fog.push({image:scene.add.image(0,y,'atmosphere-haze').setDisplaySize(1100,155).setTint(colors[kind]).setDepth(depth).setScrollFactor(factor,1),slot,factor,alpha});
  }
  if(kind==='outside'&&scene.textures.exists('forest-atmosphere')){
   const atlas=scene.textures.get('forest-atmosphere');
   if(!atlas.has('bough')){atlas.add('bough',0,0,0,1536,680);atlas.add('leaf',0,1140,700,360,324);}
   for(const factor of [.44,1.14])for(let slot=0;slot<4;slot++){
    const near=factor>1;
    this.boughs.push({image:scene.add.image(0,0,'forest-atmosphere','bough').setOrigin(.5,0).setDisplaySize(near?440:340,near?195:150).setDepth(near?45:-10).setScrollFactor(factor,1).setTint(near?0x74866b:0x6c7f70),factor,slot,near});
   }
  }
  for(let i=0;i<36;i++){
   const near=i%3===2,factor=near?1.1:i%3===1?.82:.46;
   const leaf=kind==='outside'&&scene.textures.exists('forest-atmosphere');
   const scrap=!leaf&&i%3!==0&&scene.textures.exists('prison-atlas')&&scene.textures.get('prison-atlas').has('scrap');
   const image=scene.add.image(0,0,leaf?'forest-atmosphere':scrap?'prison-atlas':'atmosphere-mote',leaf?'leaf':scrap?'scrap':undefined)
    .setDisplaySize(near?12:7,near?18:10).setTint(colors[kind]).setScrollFactor(factor,1).setDepth(near?44:-3).setVisible(false);
   this.particles.push({image,active:false,age:0,life:9000,vx:0,vy:0,phase:i*2.399,factor,near,baseScaleY:image.scaleY});
  }
 }
 update(player:Player,delta:number):void{
  const camera=this.scene.cameras.main,dt=Math.max(0,Math.min(delta,50)),reduced=this.motion.matches;
  this.elapsed+=reduced?0:dt;
  for(const fog of this.fog){
   const band=Math.floor(camera.scrollX*fog.factor/900);
   fog.image.setX((band+fog.slot-1)*900+450).setAlpha(fog.alpha*(reduced?1:.9+Math.sin(this.elapsed*.0003+band+fog.slot)*.1));
  }
  for(const bough of this.boughs){
   const band=Math.floor(camera.scrollX*bough.factor/580),x=(band+bough.slot-1)*580+290;
   // The first third is a ruined city; canopy gradually appears as the road enters woodland.
   const forest=Phaser.Math.Clamp((player.sprite.x-8000)/4000,0,1);
   const px=projectedX(x,camera.scrollX,bough.factor),playerX=player.sprite.x-camera.scrollX;
   const clear=Phaser.Math.Clamp((Math.abs(px-playerX)-80)/140,0,1);
   bough.image.setPosition(x,bough.near?40:10).setFlipX((band+bough.slot)%2===0).setAngle(reduced?0:Math.sin(this.elapsed*.0006+band+bough.slot)*1.3)
    .setAlpha(forest*(bough.near?.12+.2*clear:.3));
  }
  if(reduced){for(const p of this.particles){p.active=false;p.image.setVisible(false);}this.spawnIn=0;return;}
  for(const p of this.particles){
   if(!p.active)continue;
   p.age+=dt;
   const x=projectedX(p.image.x,camera.scrollX,p.factor),y=p.image.y-camera.scrollY;
   if(p.age>=p.life||!particleInView(x,y,camera.width,camera.height)){p.active=false;p.image.setVisible(false);continue;}
   const drift=Math.sin(this.elapsed*.001+p.phase)*12;
   const playerX=player.sprite.x-camera.scrollX;
   const gust=Math.abs(x-playerX)<90&&Math.abs(p.image.y-player.sprite.y)<100?player.body.velocity.x*.07:0;
   p.vx=damp(p.vx,drift+gust,2,dt);
   p.image.x+=p.vx*dt/1000;p.image.y+=p.vy*dt/1000;
   const nearPlayer=p.near&&Math.abs(x-playerX)<65&&Math.abs(p.image.y-player.sprite.y)<70;
   p.image.setAngle(Math.sin(p.age*.003+p.phase)*30+p.age*.012)
    .setScale(p.image.scaleX,p.baseScaleY*(.6+.4*Math.abs(Math.cos(p.age*.002+p.phase))))
    .setAlpha(particleOpacity(p.age,p.life,nearPlayer?.12:p.near?.56:.42));
  }
  this.spawnIn-=dt;if(this.spawnIn>0)return;
  const p=this.particles.find(p=>!p.active);if(!p){this.spawnIn=150;return;}
  const n=++this.cursor;
  p.active=true;p.age=0;p.life=8500+n%4*800;p.vx=0;p.vy=24+n%5*7;
  p.image.setPosition(camera.scrollX*p.factor+((n*173)%Math.max(1,camera.width+100))-50,camera.scrollY+20+n%3*32).setVisible(true).setAlpha(0);
  this.spawnIn=this.kind==='crimson'?260:340;
 }
 private createTextures():void{
  for(const [key,width,height] of [['atmosphere-haze',256,64],['atmosphere-mote',16,16]] as const){
   if(this.scene.textures.exists(key))continue;
   const texture=this.scene.textures.createCanvas(key,width,height)!;
   const ctx=texture.context;ctx.save();ctx.scale(width/2,height/2);
   const gradient=ctx.createRadialGradient(1,1,0,1,1,1);gradient.addColorStop(0,'rgba(255,255,255,0.65)');gradient.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,2,2);ctx.restore();texture.refresh();
  }
 }
}
