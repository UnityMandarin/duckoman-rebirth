import Phaser from 'phaser';
import {Player} from '../entities/Player';
import {BasicEnemy} from '../entities/BasicEnemy';
import {ThrowableObject} from '../entities/ThrowableObject';
import {AntlerRegent} from '../entities/AntlerRegent';
import {InputController} from '../systems/InputController';
import {InteractionSystem} from '../systems/InteractionSystem';
import {ChapterHud} from '../systems/ChapterHud';
import {CHAPTER_ART,CHAPTER_WIDTH,SECTION_WIDTH,JAIL_SECTIONS,OUTSIDE_SECTIONS,chapterPlatforms} from '../data/chapters';
import type {ChapterKind,Ledge} from '../data/chapters';

interface JourneyState {infiniteHealth?:boolean;checkpoint?:number;opened?:number[];secrets?:number[];bossDefeated?:boolean;ultimateCharge?:number;}
interface Gate {id:number;buttons:Phaser.GameObjects.Image[];wall:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image;}

export class JourneyScene extends Phaser.Scene {
 private player!:Player;
 private controls!:InputController;
 private hud!:ChapterHud;
 private terrain!:Phaser.Physics.Arcade.StaticGroup;
 private cake!:ThrowableObject;
 private enemies:BasicEnemy[]=[];
 private gates:Gate[]=[];
 private secrets:{id:number;x:number;y:number;art:Phaser.GameObjects.Image;text:string}[]=[];
 private checkpoints:Phaser.GameObjects.Image[]=[];
 private hazards:{x:number;y:number;width:number}[]=[];
 private story!:Phaser.GameObjects.Text;
 private label!:Phaser.GameObjects.Text;
 private shadow!:Phaser.GameObjects.Ellipse;
 private state:JourneyState={};
 private platforms:Ledge[]=[];
 private section=-1;
 private storyUntil=0;
 private dying=false;
 private leaving=false;
 private boss?:AntlerRegent;
 private foreground!:Phaser.GameObjects.Graphics;
 private walls:{body:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image}[]=[];
 constructor(private readonly kind:ChapterKind){super(kind);}
 preload():void {
  const needed=this.kind==='jail'?['jail-gallery','cistern','road-platform','rest-lantern','sealed-dispatch']:CHAPTER_ART;
  for(const key of needed)if(!this.textures.exists(key))this.load.image(key,`${import.meta.env.BASE_URL}assets/chapters/${key}.png`);
  const loading=this.add.text(320,200,this.kind==='jail'?'Beyond the bars…':'Beyond the fallen kingdom…',{fontFamily:'Georgia',fontSize:'16px',color:'#d8c59c'}).setOrigin(.5).setScrollFactor(0);
  this.load.once('complete',()=>loading.destroy());
 }
 create(data:JourneyState={}):void {
  this.state={...data,opened:[...(data.opened??[])],secrets:[...(data.secrets??[])]};
  this.enemies=[];this.gates=[];this.secrets=[];this.checkpoints=[];this.hazards=[];this.walls=[];
  this.section=-1;this.dying=false;this.leaving=false;this.boss=undefined;
  const width=CHAPTER_WIDTH[this.kind];
  this.physics.world.resume();this.physics.world.setBounds(0,-240,width,700);
  this.cameras.main.setBounds(0,-100,width,560).setZoom(1).setBackgroundColor(0x09131c);
  this.createBackdrop(width);
  this.terrain=this.physics.add.staticGroup();this.platforms=chapterPlatforms(this.kind);
  const road=this.textures.get('road-platform');if(!road.has('walk'))road.add('walk',0,16,190,2135,400);
  for(const p of this.platforms){
   const body=this.add.rectangle(p.x,p.y,p.width,p.height,0x102027,0);this.physics.add.existing(body,true);this.terrain.add(body);
   if(p.height<60){
    this.add.ellipse(p.x+8,p.y+30,p.width*.95,20,0x020810,.28).setDepth(-1);
    this.add.image(p.x,p.y-p.height/2,'road-platform','walk').setOrigin(.5,0).setDisplaySize(p.width,Math.max(45,p.width*.2)).setDepth(2).setTint(this.kind==='jail'?0xaebcca:0xffffff);
   }
  }
  const spawn=this.state.checkpoint??100;
  this.player=new Player(this,spawn,332.5);this.player.infiniteHealth=!!data.infiniteHealth;this.player.ultimateCharge=data.ultimateCharge??0;
  this.shadow=this.add.ellipse(spawn,358,54,9,0x000000,.35).setDepth(3);
  this.physics.add.collider(this.player.sprite,this.terrain);
  this.cake=new ThrowableObject(this,spawn+70,325);this.physics.add.collider(this.cake.sprite,this.terrain);
  this.physics.add.overlap(this.player.sprite,this.cake.sprite,()=>{if(this.player.active&&this.player.grounded&&this.cake.isIdle)this.cake.carry(this.player);});
  this.controls=new InputController(this);this.hud=new ChapterHud(this,this.player);
  this.story=this.add.text(320,100,'',{fontFamily:'Georgia',fontSize:'14px',color:'#ecd494',stroke:'#071019',strokeThickness:4,align:'center',wordWrap:{width:520}}).setOrigin(.5,0).setScrollFactor(0).setDepth(52);
  this.label=this.add.text(625,365,'',{fontSize:'10px',color:'#ded4b7'}).setOrigin(1).setScrollFactor(0).setDepth(52);
  this.add.text(13,382,'A/D · Hold Left Shift sprint · L jump · K dash · S tuck/slam · J interact/throw · U',{fontSize:'9px',color:'#bec9cc',stroke:'#061019',strokeThickness:3}).setScrollFactor(0).setDepth(51);
  this.foreground=this.add.graphics().setDepth(1);this.populate();
  if(this.kind==='jail'){
   this.addGate(0,620,[{x:430,y:160}]);
   this.add.text(400,115,'J · Release the cell latch',{fontSize:'11px',color:'#ffe092',stroke:'#08111b',strokeThickness:4}).setOrigin(.5).setDepth(17);
   for(const i of [3,7,11])this.addGate(i+1,(i+1)*1440-70,[{x:i*1440+1080,y:318},{x:i*1440+990,y:145}]);
  }else{
   if(this.state.bossDefeated)this.state.opened!.push(99);
   this.addGate(99,CHAPTER_WIDTH.outside-150,[]);
   if(!this.state.bossDefeated)this.boss=new AntlerRegent(this,this.player,this.cake,22*1440,CHAPTER_WIDTH.outside-400,()=>{
    this.state.bossDefeated=true;this.state.opened!.push(99);
    const gate=this.gates.find(g=>g.id===99);
    if(gate){(gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;this.tweens.add({targets:gate.art,y:-260,duration:700});}
    this.say('The corruption breaks. The road to Franklin Fox is open.');
   });
  }
  this.cameras.main.startFollow(this.player.sprite,false,.14,.12).setDeadzone(120,130).fadeIn(700);
  const main=this.cameras.main,hudCamera=this.cameras.add(0,0,640,400).setName('journey-hud');
  const split=()=>{for(const child of this.children.list){const object=child as Phaser.GameObjects.Image;object.cameraFilter=object.scrollFactorX===0?main.id:hudCamera.id;}};
  this.events.on(Phaser.Scenes.Events.POST_UPDATE,split);this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.events.off(Phaser.Scenes.Events.POST_UPDATE,split));split();
 }
 private createBackdrop(width:number):void {
  // The painted ground moves one-to-one with collision terrain, never like wallpaper.
  for(let i=0;i<Math.ceil(width/1800);i++){
   const key=this.kind==='jail'?(i<3||i===5||i===6?'jail-gallery':'cistern'):i<6?'ruined-kingdom':i<15?'deepwood':'wildwood';
   const texture=this.textures.get(key).getSourceImage(),h=1800*texture.height/texture.width;
   const floorRatio=key==='ruined-kingdom'?.725:key==='deepwood'?.76:key==='cistern'?.79:.80;
   this.add.image(i*1800,360-h*floorRatio,key).setOrigin(0).setDisplaySize(1802,h).setDepth(-20).setFlipX(i%2===1);
  }
  this.add.rectangle(width/2,440,width,100,0x081015).setDepth(-19);
 }
 private populate():void {
  const sections=this.kind==='jail'?JAIL_SECTIONS:OUTSIDE_SECTIONS;
  sections.forEach((section,i)=>{
   const x=i*SECTION_WIDTH;
   if(i>0){
    const checkpoint=this.add.image(x+80,333,'rest-lantern').setDisplaySize(30,54).setDepth(4);this.checkpoints.push(checkpoint);
    this.add.text(x+80,304,'REST',{fontSize:'8px',color:'#b6d1c9'}).setOrigin(.5).setDepth(4);
   }
   if(section.secret&&!this.state.secrets!.includes(i)){
    const route=this.platforms.filter(p=>p.x>x&&p.x<x+1440&&p.height<60);
    const ledge=route.reduce((best,p)=>p.y<best.y?p:best,route[0]);
    const art=this.add.image(ledge.x+45,ledge.y-49,'sealed-dispatch').setDisplaySize(28,24).setDepth(5);
    this.secrets.push({id:i,x:ledge.x+45,y:ledge.y-49,art,text:section.secret});
    if(i%2===1){
     const body=this.add.rectangle(ledge.x-20,ledge.y-52,24,72,0,0);this.physics.add.existing(body,true);
     const rock=this.add.image(body.x,body.y,'rock-pillar-kit','pillar').setDisplaySize(28,76).setDepth(6);
     this.physics.add.collider(this.player.sprite,body);this.physics.add.collider(this.cake.sprite,body);this.walls.push({body,art:rock});
    }
   }
   if(i===0||this.kind==='outside'&&i>=22)return;
   const count=section.route==='gauntlet'?3:2;
   for(let j=0;j<count;j++){
    const ex=x+530+j*260,jumper=j===1,pointed=!jumper&&i%3===0;
    const enemy=new BasicEnemy(this,ex,325,{left:ex-95,right:ex+95},pointed,jumper,this.kind==='outside'?(jumper?'gloom-hare':'thorn-boar'):undefined);
    this.physics.add.collider(enemy.sprite,this.terrain);
    const contacts=new InteractionSystem(this.player,enemy,this.cake);
    this.physics.add.overlap(this.player.sprite,enemy.sprite,()=>contacts.resolvePlayerEnemy());
    this.physics.add.overlap(this.cake.sprite,enemy.sprite,()=>contacts.resolveThrownEnemy());this.enemies.push(enemy);
   }
   const offsets=section.route==='gap'?[700,784]:section.route==='gauntlet'?[355,655,975]:[630];
   for(const dx of offsets){const hx=x+dx;this.hazards.push({x:hx,y:356,width:84});this.add.image(hx,348,'spike-platform','hazard').setDisplaySize(84,32).setFlipY(true).setDepth(4);}
   if(section.route==='gap')this.add.text(x+460,140,'Hold Shift · L · K',{fontSize:'10px',color:'#e8d69b',stroke:'#071119',strokeThickness:4}).setDepth(5);
  });
 }
 private addGate(id:number,x:number,buttons:{x:number;y:number}[]):void {
  const pier=this.add.rectangle(x,-22.5,125,435,0,0);this.physics.add.existing(pier,true);
  this.physics.add.collider(this.player.sprite,pier);this.physics.add.collider(this.cake.sprite,pier);
  this.add.image(x,-22.5,'rock-pillar-kit','pillar').setDisplaySize(125,435).setDepth(7);
  if(this.state.opened!.includes(id))return;
  const wall=this.add.rectangle(x,277.5,30,165,0,0);this.physics.add.existing(wall,true);
  this.physics.add.collider(this.player.sprite,wall);this.physics.add.collider(this.cake.sprite,wall);
  const art=this.add.image(x,360,'lock-kit','door').setOrigin(.5,1).setDisplaySize(125,165).setDepth(7);
  const images=buttons.map(b=>this.add.image(b.x,b.y,'lock-kit','button').setDisplaySize(40,22).setDepth(7));this.gates.push({id,buttons:images,wall,art});
 }
 private say(message:string):void {this.story.setText(message).setAlpha(1);this.storyUntil=this.time.now+6500;}
 update(_time:number,delta:number):void {
  if(!this.player||this.leaving)return;
  const input=this.controls.read();
  if(input.godModePressed){this.player.infiniteHealth=!this.player.infiniteHealth;if(this.player.infiniteHealth)this.player.health=3;}
  this.hud.update();
  if(!this.player.active){
   if(!this.dying){this.dying=true;this.cake.drop();this.physics.world.pause();this.time.delayedCall(900,()=>this.scene.restart({...this.state,infiniteHealth:this.player.infiniteHealth,ultimateCharge:0}));}return;
  }
  this.player.update(input,delta);
  for(const wall of this.walls){
   if(!wall.body.active)continue;
   if(this.player.isDashing&&Math.abs(this.player.sprite.x-wall.body.x)<55&&Math.abs(this.player.sprite.y-wall.body.y)<60){
    wall.body.destroy();this.tweens.add({targets:wall.art,alpha:0,y:wall.art.y+20,angle:8,duration:220,onComplete:()=>wall.art.destroy()});
   }
  }
  if(input.ultimatePressed&&this.player.canAct&&!this.player.usingUltimate&&this.player.ultimateCharge>=100)this.hud.useUltimate();
  let interacted=false;
  for(const gate of this.gates){
   if(this.state.opened!.includes(gate.id))continue;
   const near=gate.buttons.some(b=>Phaser.Math.Distance.Between(b.x,b.y,this.player.sprite.x,this.player.sprite.y)<65);gate.buttons.forEach(b=>b.setTint(near?0xffde95:0xffffff));
   if(near&&input.throwPressed&&this.player.canAct){
    interacted=true;this.state.opened!.push(gate.id);(gate.wall.body as Phaser.Physics.Arcade.StaticBody).enable=false;
    this.tweens.add({targets:gate.art,y:-260,duration:650,ease:'Cubic.InOut'});gate.buttons.forEach(b=>b.setTint(0x7fe0b0));this.say(gate.id===0?'Free of the cell. The eastern sluice is my way out.':'Lock released. Both paths reconnect ahead.');
   }
  }
  if(input.throwPressed&&!interacted&&this.player.canAct&&this.cake.state==='CARRIED')this.cake.throw(this.player);
  this.cake.follow(this.player);this.cake.update(delta);
  for(const enemy of this.enemies){if(enemy.defeated)continue;const awake=Math.abs(enemy.sprite.x-this.player.sprite.x)<850;enemy.setAwake(awake);if(awake)enemy.update();}
  for(const h of this.hazards)if(Math.abs(this.player.sprite.x-h.x)<h.width/2+23&&this.player.body.bottom>h.y-15&&this.player.body.top<h.y)this.player.takeDamage(h.x,.5);
  const index=Math.min(Math.floor(this.player.sprite.x/1440),(this.kind==='jail'?12:24)-1);
  if(index!==this.section){this.section=index;const section=(this.kind==='jail'?JAIL_SECTIONS:OUTSIDE_SECTIONS)[index];this.label.setText(section.name);if(section.story)this.say(section.story);}
  for(const checkpoint of this.checkpoints)if(Math.abs(this.player.sprite.x-checkpoint.x)<35&&this.player.grounded&&checkpoint.x>(this.state.checkpoint??0)){
   this.state.checkpoint=checkpoint.x;this.player.health=3;this.state.ultimateCharge=this.player.ultimateCharge;checkpoint.setTint(0xffe2a3);this.say('Checkpoint · A moment to breathe.');
  }
  for(const secret of this.secrets){
   if(!secret.art.active)continue;secret.art.setAngle(Math.sin(this.time.now*.003)*8);
   if(Phaser.Math.Distance.Between(this.player.sprite.x,this.player.sprite.y,secret.x,secret.y)<40){secret.art.destroy();this.state.secrets!.push(secret.id);this.player.chargeUltimate(20);this.say(secret.text);}
  }
  this.boss?.update(delta);
  const floor=this.platforms.filter(p=>Math.abs(p.x-this.player.sprite.x)<p.width/2&&p.y-p.height/2>=this.player.body.bottom-8).sort((a,b)=>a.y-b.y)[0];
  if(floor){const dist=Math.max(0,floor.y-floor.height/2-this.player.body.bottom);this.shadow.setPosition(this.player.sprite.x,floor.y-floor.height/2+2).setScale(Math.max(.35,1-dist/350),1).setAlpha(Math.max(.08,.32-dist/900));}
  this.foreground.clear();
  if(this.kind==='jail')for(const p of this.platforms)if(p.height<60&&Math.abs(p.x-this.player.sprite.x)<650)this.foreground.lineStyle(2,0x1b2931,.7).lineBetween(p.x-p.width*.35,p.y+8,p.x-p.width*.35,359).lineBetween(p.x+p.width*.35,p.y+8,p.x+p.width*.35,359);
  if(this.time.now>this.storyUntil)this.story.setAlpha(Math.max(0,this.story.alpha-delta/500));
  if(this.player.sprite.x>CHAPTER_WIDTH[this.kind]-40){
   if(this.kind==='jail'){this.leaving=true;this.cameras.main.fadeOut(600);this.time.delayedCall(600,()=>this.scene.start('outside',{infiniteHealth:this.player.infiniteHealth,ultimateCharge:this.player.ultimateCharge}));}
   else if(this.state.bossDefeated){this.say('FRANKLIN FOX’S BORDER\nMy kingdom has fallen. But my story is not over.');this.leaving=true;this.player.body.setVelocity(0,0);}
  }
 }
}
