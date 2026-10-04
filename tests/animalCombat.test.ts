import {afterEach,describe,expect,it,vi} from 'vitest';

vi.mock('phaser',()=>({default:{Scenes:{Events:{POST_UPDATE:'post-update',SHUTDOWN:'shutdown'}}}}));
vi.mock('../src/systems/DebugHitboxes',()=>({tagBody:vi.fn()}));
vi.mock('../src/systems/HitSpark',()=>({hitSpark:vi.fn()}));
vi.mock('../src/systems/DebrisBurst',()=>({scatterDebris:vi.fn()}));

import {BasicEnemy} from '../src/entities/BasicEnemy';
import {InteractionSystem} from '../src/systems/InteractionSystem';
import {hareLandingTimeSeconds} from '../src/systems/animalRules';
import {UltimateStrike} from '../src/systems/ultimateSwingMath';
import type {Player} from '../src/entities/Player';
import type Phaser from 'phaser';

type Listener={fn:(...args:any[])=>void;context?:unknown;once:boolean};
class FakeEvents {
 private listeners=new Map<string,Listener[]>();
 on(name:string,fn:(...args:any[])=>void,context?:unknown){this.list(name).push({fn,context,once:false});return this;}
 once(name:string,fn:(...args:any[])=>void,context?:unknown){this.list(name).push({fn,context,once:true});return this;}
 off(name:string,fn:(...args:any[])=>void,context?:unknown){this.listeners.set(name,this.list(name).filter(l=>l.fn!==fn||(context!==undefined&&l.context!==context)));return this;}
 emit(name:string,...args:any[]){for(const l of [...this.list(name)]){l.fn.apply(l.context,args);if(l.once)this.off(name,l.fn,l.context);}return true;}
 count(name:string){return this.list(name).length;}
 private list(name:string){let list=this.listeners.get(name);if(!list)this.listeners.set(name,list=[]);return list;}
}
class FakeDisplay {
 visible=true;destroyed=false;alpha=1;x:number;y:number;width:number;height:number;displayWidth:number;displayHeight:number;rotation=0;flipX=false;text='';body?:FakeBody;depth=0;key?:string;
 scene?:FakeScene;
 constructor(x=0,y=0,width=0,height=0,key?:string){this.x=x;this.y=y;this.width=width;this.height=height;this.displayWidth=width;this.displayHeight=height;this.key=key;}
 setVisible(v:boolean){this.visible=v;return this;}setDepth(v:number){this.depth=v;return this;}setDisplaySize(w:number,h:number){this.displayWidth=w;this.displayHeight=h;return this;}
 setPosition(x:number,y:number){this.x=x;this.y=y;return this;}setX(x:number){this.x=x;return this;}setY(y:number){this.y=y;return this;}
 setFlipX(v:boolean){this.flipX=v;return this;}setRotation(v:number){this.rotation=v;return this;}setAngle(v:number){this.rotation=v;return this;}
 setAlpha(v:number){this.alpha=v;return this;}setOrigin(){return this;}setScrollFactor(){return this;}setText(v:string){this.text=v;return this;}setCrop(){return this;}
 destroy(){this.destroyed=true;this.scene=undefined;return this;}clear(){return this;}lineStyle(){return this;}lineBetween(){return this;}fillStyle(){return this;}fillCircle(){return this;}fillRect(){return this;}
}
class FakeBody {
 width:number;height:number;offsetX=0;offsetY=0;enable=true;velocity={x:0,y:0};prev={x:0,y:0};blocked={left:false,right:false,down:false};touching={down:false};gravityY=0;maxVelocity={x:Infinity,y:Infinity};velocityYWrites=0;
 constructor(private object:FakeDisplay){this.width=object.width;this.height=object.height;}
 get left(){return this.object.x-this.object.width/2+this.offsetX;}get right(){return this.left+this.width;}get top(){return this.object.y-this.object.height/2+this.offsetY;}get bottom(){return this.top+this.height;}get center(){return {x:this.left+this.width/2,y:this.top+this.height/2};}
 setSize(w:number,h:number){this.width=w;this.height=h;return this;}setOffset(x:number,y:number){this.offsetX=x;this.offsetY=y;return this;}
 setGravityY(v:number){this.gravityY=v;return this;}setMaxVelocity(x:number,y:number){this.maxVelocity={x,y};return this;}setVelocityX(x:number){this.velocity.x=x;return this;}setVelocityY(y:number){this.velocity.y=y;this.velocityYWrites++;return this;}setEnable(v:boolean){this.enable=v;return this;}
}
class FakeScene {
 readonly events=new FakeEvents();readonly objects:FakeDisplay[]=[];time={now:1000,delayedCall:(_ms:number,fn:()=>void)=>{fn();return {};}};game={loop:{delta:16}};
 add={rectangle:(x:number,y:number,w:number,h:number,_color:number)=>this.addObject(new FakeDisplay(x,y,w,h)),image:(x:number,y:number,key:string)=>this.addObject(new FakeDisplay(x,y,0,0,key)),
  graphics:()=>this.addObject(new FakeDisplay()),text:(x:number,y:number,text:string)=>{const o=this.addObject(new FakeDisplay(x,y));o.text=text;return o;}};
 physics={add:{existing:(o:FakeDisplay)=>{o.body=new FakeBody(o);return o.body;}}};
 tweens={add:(config:{onComplete?:()=>void})=>{config.onComplete?.();return {};}};
 private addObject<T extends FakeDisplay>(o:T):T{o.scene=this;this.objects.push(o);return o;}
}
function sceneFixture(){return new FakeScene();}
function playerFixture(x=100,y=100){
 const object=new FakeDisplay(x,y,46,40),body=new FakeBody(object);body.prev={x:body.left,y:body.top};
 const player={sprite:object,body,active:true,isDashing:false,dashVelocity:{x:440,y:0},dashImpact:vi.fn(),bounceFromDash:vi.fn(),bounceFromStomp:vi.fn(),chargeUltimate:vi.fn(),takeDamage:vi.fn(),
  dashHits:vi.fn(()=>false),grounded:true,usingUltimate:false};
 return player as unknown as Player;
}
function makeAnimal(scene:FakeScene,skin:'thorn-boar'|'gloom-hare'='thorn-boar',x=100,y=100){return new BasicEnemy(scene as unknown as Phaser.Scene,x,y,{left:x-80,right:x+80},false,false,skin);}
function contact(scene:FakeScene,player:Player,enemy:BasicEnemy){return new InteractionSystem(player,enemy,{} as never);}
function fakeBody(enemy:BasicEnemy):FakeBody{return enemy.body as unknown as FakeBody;}
afterEach(()=>vi.clearAllMocks());

describe('animal combat integration',()=>{
 it('routes a real one-HP boar dash through contact, awards charge, and defeats it once',()=>{
  const scene=sceneFixture(),player=playerFixture(),enemy=makeAnimal(scene);Object.assign(player,{isDashing:true});
  contact(scene,player,enemy).resolvePlayerEnemy();
  expect(enemy.defeated).toBe(true);expect(enemy.hp).toBe(0);expect(player.dashImpact).toHaveBeenCalledTimes(1);expect(player.bounceFromDash).toHaveBeenCalledTimes(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it('ignores updates after combat death destroys the sprite and clears its scene',()=>{
  const scene=sceneFixture(),player=playerFixture(),enemy=makeAnimal(scene);Object.assign(player,{isDashing:true});
  contact(scene,player,enemy).resolvePlayerEnemy();
  expect(enemy.defeated).toBe(true);expect(enemy.sprite.scene).toBeUndefined();
  const velocity={...enemy.body.velocity},objectCount=scene.objects.length;
  expect(()=>enemy.update()).not.toThrow();
  expect(()=>enemy.update(false)).not.toThrow();
  expect(()=>enemy.update(true,16)).not.toThrow();
  expect(enemy.body.velocity).toEqual(velocity);expect(scene.objects).toHaveLength(objectCount);
 });
 it('uses the real descending stomp path to defeat one HP and bounce the player',()=>{
  const scene=sceneFixture(),player=playerFixture(100,60),enemy=makeAnimal(scene);player.body.velocity.y=120;player.body.prev.y=20;
  contact(scene,player,enemy).resolvePlayerEnemy();
  expect(enemy.defeated).toBe(true);expect(player.bounceFromStomp).toHaveBeenCalledTimes(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);expect(player.takeDamage).not.toHaveBeenCalled();
 });
 it('does not treat rising overlap as a stomp and applies contact damage instead',()=>{
  const scene=sceneFixture(),player=playerFixture(),enemy=makeAnimal(scene);player.body.velocity.y=-80;player.body.prev.y=50;
  contact(scene,player,enemy).resolvePlayerEnemy();
  expect(enemy.hp).toBe(1);expect(enemy.defeated).toBe(false);expect(player.bounceFromStomp).not.toHaveBeenCalled();expect(player.takeDamage).toHaveBeenCalledWith(enemy.sprite.x);
 });
 it('keeps the real nearby ultimate-strike handler able to remove a two-HP boar',()=>{
  const scene=sceneFixture(),player=playerFixture(),enemy=makeAnimal(scene);enemy.hp=2;
  const strike=new UltimateStrike(player,{x:100,y:100},1,220,22);strike.sweepTo(0);scene.events.emit('ultimate-strike',strike);
  expect(enemy.hp).toBe(0);expect(enemy.defeated).toBe(true);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it.each(['thorn-boar','gloom-hare'] as const)('tracks %s health visuals and two separated hits through 2/2 then 1/2 HP',skin=>{
  const scene=sceneFixture(),enemy=makeAnimal(scene,skin);enemy.hp=2;scene.events.emit('post-update');
  const image=scene.objects.find(o=>o.key==='robot-health')!,label=scene.objects.find(o=>o.text.includes('HP'))!;
  expect(image).toBeDefined();expect(label).toBeDefined();expect(label.text).toBe('2 / 2 HP');expect(image.x).toBe(enemy.sprite.x);expect(label.x).toBe(image.x+11);expect(label.y).toBe(image.y+2);
  enemy.hit(1,undefined,false);scene.events.emit('post-update');expect(label.text).toBe('1 / 2 HP');expect(image.y).toBeCloseTo(enemy.visual.y-enemy.visual.displayHeight/2-20,4);
  scene.time.now+=401;enemy.hit(1,undefined,false);expect(enemy.defeated).toBe(true);expect(image.destroyed).toBe(true);expect(label.destroyed).toBe(true);
 });
 it('toggles animal body and all health art with awake state and cleans art on defeat',()=>{
  const scene=sceneFixture(),enemy=makeAnimal(scene,'gloom-hare');scene.events.emit('post-update');
  const image=scene.objects.find(o=>o.key==='robot-health')!,label=scene.objects.find(o=>o.text.includes('HP'))!,empty=scene.objects.find(o=>o.depth===13)!;
  enemy.setAwake(false);expect(enemy.body.enable).toBe(false);expect(enemy.visual.visible).toBe(false);expect(image.visible).toBe(false);expect(label.visible).toBe(false);expect(empty.visible).toBe(false);
  enemy.setAwake(true);expect(enemy.body.enable).toBe(true);expect(image.visible).toBe(true);expect(label.visible).toBe(true);enemy.defeat();
  expect(image.destroyed).toBe(true);expect(label.destroyed).toBe(true);expect(empty.destroyed).toBe(true);
 });
 it('registers one POST_UPDATE visual sync callback per enemy',()=>{
  const scene=sceneFixture();makeAnimal(scene);
  expect(scene.events.count('post-update')).toBe(1);
 });
 it('retains robot patrol reversal and the jumper auto-jump switch',()=>{
  const scene=sceneFixture(),robot=new BasicEnemy(scene as unknown as Phaser.Scene,100,100,{left:80,right:120});
  robot.update();expect(robot.body.velocity.x).toBe(-100);robot.body.blocked.left=true;robot.update();expect(robot.body.velocity.x).toBe(100);
  const jumper=new BasicEnemy(scene as unknown as Phaser.Scene,100,100,{left:80,right:120},false,true);jumper.body.blocked.down=true;jumper.update(false);expect(jumper.body.velocity.y).toBe(0);jumper.update();expect(jumper.body.velocity.y).toBeLessThan(0);
 });
 it('keeps a distant supported hare grounded, then allows one close-range hop only',()=>{
  const scene=sceneFixture(),player=playerFixture(900,75),hare=new BasicEnemy(scene as unknown as Phaser.Scene,400,75,{left:320,right:480},false,true,'gloom-hare');
  hare.configureAnimal(player,[{room:0,left:300,right:500,top:100,bottom:600,enabled:true}],1);hare.body.blocked.down=true;
  for(let i=0;i<8;i++)hare.update(true,50);
  expect(hare.body.bottom).toBe(100);expect(hare.body.velocity.y).toBe(0);expect(fakeBody(hare).velocityYWrites).toBe(0);
  player.sprite.setPosition(450,40);hare.update(true,16);
  expect(hare.body.velocity.y).toBe(-600);expect(fakeBody(hare).velocityYWrites).toBe(1);
  hare.body.blocked.down=false;hare.update(true,16);hare.update(true,16);
  expect(hare.body.velocity.y).toBe(-600);expect(fakeBody(hare).velocityYWrites).toBe(1);
 });
 it('commits a room-offset hare climb, lands on the new support, and patrols within it',()=>{
  const scene=sceneFixture(),roomOffset=2880,startX=roomOffset+255,startY=249,player=playerFixture(roomOffset+450,196);
  const hare=new BasicEnemy(scene as unknown as Phaser.Scene,startX,startY,{left:roomOffset+105,right:roomOffset+255},false,true,'gloom-hare');
  const surfaces=[
   {room:2,left:roomOffset+70,right:roomOffset+290,top:274,bottom:620,enabled:true},
   {room:2,left:roomOffset+350,right:roomOffset+550,top:236,bottom:620,enabled:true}
  ];
  hare.configureAnimal(player,surfaces,1.44);hare.body.blocked.down=true;
  const expectedVX=(385-255)/hareLandingTimeSeconds(38)/1.44;
  hare.update(true,16);
  expect(hare.body.bottom).toBe(274);expect(hare.body.velocity.y).toBe(-600);expect(hare.body.velocity.x).toBeCloseTo(expectedVX,5);
  hare.body.blocked.down=false;hare.sprite.setPosition(startX+20,230);hare.update(true,16);
  expect(hare.body.velocity.x).toBeCloseTo(expectedVX,5);expect(hare.body.velocity.x).not.toBe(0);expect(hare.body.velocity.x).not.toBe(210);
  hare.sprite.setPosition(roomOffset+385,211);hare.body.velocity.y=0;hare.body.blocked.down=true;hare.update(true,16);
  expect(fakeBody(hare).velocityYWrites).toBe(1);expect(hare.body.velocity.y).toBe(0);expect(hare.body.velocity.x).toBeGreaterThan(0);
  player.sprite.setPosition(roomOffset+900,196);hare.update(true,16);
  expect(hare.body.velocity.y).toBe(0);expect(fakeBody(hare).velocityYWrites).toBe(1);expect(hare.body.velocity.x).toBeGreaterThan(0);expect(hare.body.velocity.x).not.toBe(-55);
 });
 it('holds a thorn boar still for a full tell, charges, reverses at bounds, and retells after waking',()=>{
  const scene=sceneFixture(),player=playerFixture(),boar=makeAnimal(scene,'thorn-boar',100,100);boar.setPatrolBounds({left:80,right:120});boar.configureAnimal(player,[],1);
  expect(boar.body.velocity.x).toBe(0);
  for(let i=0;i<19;i++){boar.update(true,50);expect(boar.body.velocity.x).toBe(0);}
  boar.update(true,50);expect(boar.body.velocity.x).toBe(-260);
  boar.sprite.setX(80);boar.update(true,16);expect(boar.body.velocity.x).toBe(0);
  for(let i=0;i<19;i++){boar.update(true,50);expect(boar.body.velocity.x).toBe(0);}
  boar.update(true,50);expect(boar.body.velocity.x).toBe(260);
  boar.setAwake(false);boar.setAwake(true);expect(boar.body.velocity.x).toBe(0);
  for(let i=0;i<19;i++){boar.update(true,50);expect(boar.body.velocity.x).toBe(0);}
  boar.update(true,50);expect(boar.body.velocity.x).toBe(260);
 });
});
