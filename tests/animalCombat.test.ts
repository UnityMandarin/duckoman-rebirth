import {beginUltimateFreeze} from '../src/systems/ultimateFreeze';
import {afterEach,describe,expect,it,vi} from 'vitest';

vi.mock('phaser',()=>({default:{Scenes:{Events:{POST_UPDATE:'post-update',SHUTDOWN:'shutdown'}}}}));
vi.mock('../src/systems/DebugHitboxes',()=>({tagBody:vi.fn()}));
vi.mock('../src/systems/HitSpark',()=>({hitSpark:vi.fn()}));
vi.mock('../src/systems/DebrisBurst',()=>({scatterDebris:vi.fn()}));

import {BasicEnemy} from '../src/entities/BasicEnemy';
import {InteractionSystem} from '../src/systems/InteractionSystem';
import {hareLandingTimeSeconds} from '../src/systems/animalRules';
import {circleIntersectsRect,rectsOverlap} from '../src/systems/contactRules';
import {UltimateStrike} from '../src/systems/ultimateSwingMath';
import {Player} from '../src/entities/Player';
import {TUNING} from '../src/config/tuning';
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
 allowGravity=true;setGravityY(v:number){this.gravityY=v;return this;}setMaxVelocity(x:number,y:number){this.maxVelocity={x,y};return this;}setVelocityX(x:number){this.velocity.x=x;return this;}setVelocityY(y:number){this.velocity.y=y;this.velocityYWrites++;return this;}setVelocity(x:number,y:number){this.velocity={x,y};return this;}setAcceleration(){return this;}setAllowGravity(v:boolean){this.allowGravity=v;return this;}setEnable(v:boolean){this.enable=v;return this;}
}
class FakeScene {
 readonly events=new FakeEvents();readonly objects:FakeDisplay[]=[];time={now:1000,delayedCall:(_ms:number,fn:()=>void)=>{fn();return {};}};game={loop:{delta:16}};
 add={rectangle:(x:number,y:number,w:number,h:number,_color:number)=>this.addObject(new FakeDisplay(x,y,w,h)),image:(x:number,y:number,key:string)=>this.addObject(new FakeDisplay(x,y,0,0,key)),
  graphics:()=>this.addObject(new FakeDisplay()),text:(x:number,y:number,text:string)=>{const o=this.addObject(new FakeDisplay(x,y));o.text=text;return o;}};
 sys={isActive:()=>true};
 physics={world:{isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}},add:{existing:(o:FakeDisplay)=>{o.body=new FakeBody(o);return o.body;}}};
 tweens={add:(config:{onComplete?:()=>void})=>{config.onComplete?.();return {};}};
 private addObject<T extends FakeDisplay>(o:T):T{o.scene=this;this.objects.push(o);return o;}
}
function sceneFixture(){return new FakeScene();}
function playerFixture(x=100,y=100){
 const object=new FakeDisplay(x,y,46,40),body=new FakeBody(object);body.prev={x:body.left,y:body.top};
 const player={sprite:object,body,active:true,isDashing:false,dashVelocity:{x:440,y:0},dashImpact:vi.fn(),bounceFromDash:vi.fn(),bounceFromStomp:vi.fn(),chargeUltimate:vi.fn(),takeDamage:vi.fn(),
  dashHits:vi.fn((target:import('../src/systems/contactRules').Rect)=>circleIntersectsRect({x:body.center.x,y:body.center.y,radius:TUNING.player.dashHitboxRadius},target)),grounded:true,usingUltimate:false};
 return player as unknown as Player;
}
function realPlayerFixture(scene:FakeScene,x=100,y=100,dashing=false){
 const object=new FakeDisplay(x,y,TUNING.player.bodyWidth,TUNING.player.bodyHeight),body=new FakeBody(object);body.prev={x:body.left,y:body.top};
 let dashActive=dashing;const cancelTransient=vi.fn(()=>{dashActive=false;});
 const player=Object.create(Player.prototype) as Player;
 Object.assign(player,{sprite:object,body,visual:new FakeDisplay(x,y),lifeState:'ACTIVE',health:3,infiniteHealth:false,ultimateUntil:0,invulnerableUntil:0,facing:-1,
  abilities:{isDashing:()=>dashActive,cancelTransient},dashMomentum:0});object.scene=scene;
 return {player,body,cancelTransient};
}
function makeAnimal(scene:FakeScene,skin:'thorn-boar'|'gloom-hare'='thorn-boar',x=100,y=100){return new BasicEnemy(scene as unknown as Phaser.Scene,x,y,{left:x-80,right:x+80},false,false,skin);}
function turnBoarRight(scene:FakeScene,boar:BasicEnemy){boar.setPatrolBounds({left:100,right:200});for(let i=0;i<20;i++)boar.update(true,50);boar.update(true,50);boar.sprite.setX(100);boar.update(true,16);scene.events.emit('post-update');}
function contact(scene:FakeScene,player:Player,enemy:BasicEnemy){return new InteractionSystem(player,enemy,{} as never);}
function fakeBody(enemy:BasicEnemy):FakeBody{return enemy.body as unknown as FakeBody;}
afterEach(()=>vi.clearAllMocks());

describe('animal combat integration',()=>{
 it('routes a rear one-HP boar dash through contact, awards charge, and defeats it once',()=>{
  const scene=sceneFixture(),player=playerFixture(150,100),enemy=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:-440,y:0}});
  contact(scene,player,enemy).resolvePlayerEnemy();
  expect(enemy.defeated).toBe(true);expect(enemy.hp).toBe(0);expect(player.dashImpact).toHaveBeenCalledTimes(1);expect(player.bounceFromDash).toHaveBeenCalledTimes(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it('ignores updates after combat death destroys the sprite and clears its scene',()=>{
  const scene=sceneFixture(),player=playerFixture(150,100),enemy=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:-440,y:0}});
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
 it('keeps the boar horn narrow and mirrors its logical region with facing',()=>{
  const scene=sceneFixture(),boar=makeAnimal(scene,'thorn-boar',120,100);boar.configureAnimal(playerFixture(),[],1);
  const left=boar.boarHornBounds!;expect(left.left).toBe(72);expect(left.right).toBe(89);expect(left.top).toBe(85);expect(left.bottom).toBe(106);
  turnBoarRight(scene,boar);
  const right=boar.boarHornBounds!;expect(boar.facingDirection).toBe(1);expect(right.left).toBe(131);expect(right.right).toBe(148);
 });
 it('rejects frontal dash and damages the player on actual horn overlap',()=>{
  const scene=sceneFixture(),player=playerFixture(60,100),boar=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:440,y:0}});
  boar.receiveDash(player);expect(boar.hp).toBe(1);expect(player.dashImpact).not.toHaveBeenCalled();expect(player.takeDamage).toHaveBeenCalledWith(boar.sprite.x);
 });
 it('routes a frontal body overlap outside the tusk through normal player damage',()=>{
  const scene=sceneFixture(),player=playerFixture(92,100),boar=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:440,y:0}});
  expect(rectsOverlap(player.body,boar.body)).toBe(true);expect(rectsOverlap(player.body,boar.boarHornBounds!)).toBe(false);
  expect(boar.checkDash(player)).toBe(true);expect(boar.hp).toBe(1);expect(player.takeDamage).toHaveBeenCalledTimes(1);expect(player.dashImpact).not.toHaveBeenCalled();
 });
 it('does not turn dash-circle-only front contact into damage or impact',()=>{
  const scene=sceneFixture(),player=playerFixture(66,35),boar=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:440,y:0}});
  expect(player.dashHits({left:boar.body.left,right:boar.body.right,top:boar.body.top,bottom:boar.body.bottom})).toBe(true);
  expect(circleIntersectsRect({x:player.body.center.x,y:player.body.center.y,radius:44},boar.boarHornBounds!)).toBe(false);
  boar.checkDash(player);contact(scene,player,boar).resolvePlayerEnemy();
  expect(boar.hp).toBe(1);expect(player.takeDamage).not.toHaveBeenCalled();expect(player.dashImpact).not.toHaveBeenCalled();expect(player.bounceFromStomp).not.toHaveBeenCalled();
 });
 it('allows a rear dash-circle overlap from the physics callback without requiring body overlap',()=>{
  const scene=sceneFixture(),player=playerFixture(160,100),boar=makeAnimal(scene);Object.assign(player,{isDashing:true,dashVelocity:{x:-440,y:0}});boar.hp=2;
  expect(rectsOverlap(player.body,boar.body)).toBe(false);expect(player.dashHits({left:boar.body.left,right:boar.body.right,top:boar.body.top,bottom:boar.body.bottom})).toBe(true);
  contact(scene,player,boar).resolvePlayerEnemy();expect(boar.hp).toBe(1);expect(player.dashImpact).toHaveBeenCalledTimes(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it('uses actual horn overlap before body handling and keeps a centered top stomp safe',()=>{
  const scene=sceneFixture(),player=playerFixture(60,100),boar=makeAnimal(scene);player.body.velocity.y=120;player.body.prev.y=25;
  contact(scene,player,boar).resolvePlayerEnemy();expect(player.takeDamage).toHaveBeenCalled();expect(boar.hp).toBe(1);
  const topPlayer=playerFixture(100,60),topBoar=makeAnimal(scene);topPlayer.body.velocity.y=120;topPlayer.body.prev.y=20;
  contact(scene,topPlayer,topBoar).resolvePlayerEnemy();expect(topBoar.defeated).toBe(true);expect(topPlayer.bounceFromStomp).toHaveBeenCalled();expect(topPlayer.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it('requires a physical rear entry for dash damage and preserves two-HP cooldown',()=>{
  const scene=sceneFixture(),player=playerFixture(150,100),boar=makeAnimal(scene);boar.hp=2;Object.assign(player,{isDashing:true,dashVelocity:{x:-440,y:0}});
  boar.receiveDash(player);expect(boar.hp).toBe(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
  boar.receiveDash(player);expect(boar.hp).toBe(1);scene.time.now+=401;boar.receiveDash(player);expect(boar.defeated).toBe(true);
  const rightScene=sceneFixture(),rightBoar=makeAnimal(rightScene);turnBoarRight(rightScene,rightBoar);rightBoar.hp=2;
  const leftRear=playerFixture(50,100);Object.assign(leftRear,{isDashing:true,dashVelocity:{x:440,y:0}});rightBoar.receiveDash(leftRear);
  expect(rightBoar.hp).toBe(1);expect(leftRear.chargeUltimate).toHaveBeenCalledWith(10);expect(leftRear.dashImpact).toHaveBeenCalledTimes(1);
 });
 it.each([
  {facing:'left',x:60,vx:440},
  {facing:'right',x:150,vx:-440}
 ] as const)('keeps the $facing horn dangerous for one- and two-HP boars',({facing,x,vx})=>{
  const scene=sceneFixture(),boar=makeAnimal(scene);if(facing==='right')turnBoarRight(scene,boar);
  const player=playerFixture(x,100);Object.assign(player,{isDashing:true,dashVelocity:{x:vx,y:0}});boar.hp=2;
  boar.receiveDash(player);expect(boar.hp).toBe(2);expect(player.takeDamage).toHaveBeenCalledTimes(1);expect(player.dashImpact).not.toHaveBeenCalled();
  boar.hp=1;const oneHpPlayer=playerFixture(x,100);Object.assign(oneHpPlayer,{isDashing:true,dashVelocity:{x:vx,y:0}});boar.receiveDash(oneHpPlayer);
  expect(boar.hp).toBe(1);expect(boar.defeated).toBe(false);expect(oneHpPlayer.takeDamage).toHaveBeenCalledTimes(1);
 });
 it.each([
  {facing:'left',rearX:150,wrongVx:440},
  {facing:'right',rearX:50,wrongVx:-440}
 ] as const)('rejects a wrong-way dash from the $facing boar rear and damages on body contact',({facing,rearX,wrongVx})=>{
  const scene=sceneFixture(),boar=makeAnimal(scene);if(facing==='right')turnBoarRight(scene,boar);
  const player=playerFixture(rearX,100);Object.assign(player,{isDashing:true,dashVelocity:{x:wrongVx,y:0}});boar.receiveDash(player);
  expect(boar.hp).toBe(1);expect(player.takeDamage).toHaveBeenCalledTimes(1);expect(player.dashImpact).not.toHaveBeenCalled();
 });
 it('resolves a descending top stomp before dash and trims only the front edge',()=>{
  const scene=sceneFixture(),boar=makeAnimal(scene),player=playerFixture(100,60);Object.assign(player,{isDashing:true});player.body.velocity.y=120;player.body.prev.y=20;
  contact(scene,player,boar).resolvePlayerEnemy();expect(boar.defeated).toBe(true);expect(player.bounceFromStomp).toHaveBeenCalled();expect(player.dashImpact).not.toHaveBeenCalled();
  const frontScene=sceneFixture(),frontBoar=makeAnimal(frontScene),front=playerFixture(45,60);front.body.velocity.y=120;front.body.prev.y=20;
  contact(frontScene,front,frontBoar).resolvePlayerEnemy();expect(frontBoar.hp).toBe(1);expect(frontBoar.defeated).toBe(false);expect(front.bounceFromStomp).not.toHaveBeenCalled();expect(front.takeDamage).toHaveBeenCalled();
  const backScene=sceneFixture(),backBoar=makeAnimal(backScene),back=playerFixture(145,60);back.body.velocity.y=120;back.body.prev.y=20;
  contact(backScene,back,backBoar).resolvePlayerEnemy();expect(backBoar.defeated).toBe(true);expect(back.bounceFromStomp).toHaveBeenCalled();
 });
 it('does not turn a side overlap or dash-circle overlap above the body into a stomp',()=>{
  const scene=sceneFixture(),boar=makeAnimal(scene),side=playerFixture(100,100);side.body.velocity.y=100;side.body.prev.y=80;
  contact(scene,side,boar).resolvePlayerEnemy();expect(boar.hp).toBe(1);expect(side.bounceFromStomp).not.toHaveBeenCalled();expect(side.takeDamage).toHaveBeenCalled();
  const above=playerFixture(100,40);Object.assign(above,{isDashing:true});above.body.velocity.y=120;above.body.prev.y=0;
  expect(above.dashHits({left:boar.body.left,right:boar.body.right,top:boar.body.top,bottom:boar.body.bottom})).toBe(true);
  contact(scene,above,boar).resolvePlayerEnemy();expect(boar.hp).toBe(1);expect(above.bounceFromStomp).not.toHaveBeenCalled();
 });
 it('polls horn-only outer contact once through real Player damage and dash cancellation',()=>{
  const scene=sceneFixture(),{player,cancelTransient}=realPlayerFixture(scene,34,100,true),boar=makeAnimal(scene);boar.configureAnimal(player,[],1);
  const damaged=vi.fn();scene.events.on('player-damaged',damaged);
  expect(player.body.right).toBeLessThan(boar.body.left);expect(rectsOverlap(player.body,boar.boarHornBounds!)).toBe(true);
  boar.update(true,16);contact(scene,player,boar).resolvePlayerEnemy();boar.update(true,16);
  expect(player.health).toBe(2.5);expect(player.lifeState).toBe('HURT');expect(player.isDashing).toBe(false);expect(cancelTransient).toHaveBeenCalledTimes(1);expect(damaged).toHaveBeenCalledTimes(1);
 });
 it('ignores sleeping horn polling, overlap and direct dash, then preserves facing after wake',()=>{
  const scene=sceneFixture(),player=playerFixture(900,100),boar=makeAnimal(scene);boar.configureAnimal(player,[],1);turnBoarRight(scene,boar);player.sprite.setPosition(34,100);boar.setAwake(false);
  Object.assign(player,{isDashing:true,dashVelocity:{x:-440,y:0}});boar.update(true,16);boar.receiveDash(player);contact(scene,player,boar).resolvePlayerEnemy();
  expect(player.takeDamage).not.toHaveBeenCalled();expect(boar.hp).toBe(1);
  boar.setAwake(true);scene.events.emit('post-update');expect(boar.facingDirection).toBe(1);expect(boar.visual.flipX).toBe(false);
 });
 it('keeps thrown cake and pointed robot combat rules intact',()=>{
  const cakeScene=sceneFixture(),cakePlayer=playerFixture(),boar=makeAnimal(cakeScene);boar.hp=2;
  const cake={body:{velocity:{x:220,y:-90}},registerEnemyHit:vi.fn(()=>true)};
  new InteractionSystem(cakePlayer,boar,cake as never).resolveThrownEnemy();expect(boar.hp).toBe(1);
  const robotScene=sceneFixture(),robot=new BasicEnemy(robotScene as unknown as Phaser.Scene,100,100,{left:40,right:160},true);
  robot.hp=2;const stomp=playerFixture(100,25);stomp.body.prev.y=0;stomp.body.velocity.y=120;contact(robotScene,stomp,robot).resolvePlayerEnemy();
  expect(robot.hp).toBe(2);expect(stomp.takeDamage).toHaveBeenCalled();expect(stomp.bounceFromStomp).not.toHaveBeenCalled();
  const dashScene=sceneFixture(),dashRobot=new BasicEnemy(dashScene as unknown as Phaser.Scene,100,100,{left:40,right:160},true);dashRobot.hp=2;
  const dasher=playerFixture(100,100);Object.assign(dasher,{isDashing:true});contact(dashScene,dasher,dashRobot).resolvePlayerEnemy();expect(dashRobot.hp).toBe(1);
 });
 it('keeps Gloom-Hare dash contact on the generic enemy route',()=>{
  const scene=sceneFixture(),hare=makeAnimal(scene,'gloom-hare');hare.hp=2;
  const player=playerFixture(150,100);Object.assign(player,{isDashing:true});contact(scene,player,hare).resolvePlayerEnemy();
  expect(hare.hp).toBe(1);expect(player.dashImpact).toHaveBeenCalledTimes(1);expect(player.chargeUltimate).toHaveBeenCalledWith(10);
 });
 it('lets ultimate penetrate the real horn rectangle without filling gaps or changing dash defense',()=>{
  vi.stubGlobal('document',{visibilityState:'visible'});const scene=sceneFixture(),enemy=makeAnimal(scene),player=playerFixture();enemy.hp=2;Object.assign(player,{usingUltimate:true});player.sprite.scene=scene as any;
  const horn=enemy.boarHornBounds!,visited:any[]=[];scene.events.emit('ultimate-strike',{player,hand:{x:0,y:0},tryHit:(_target:any,bounds:any)=>{visited.push(bounds);return bounds.left===horn.left&&bounds.top===horn.top;}});
  expect(visited.length).toBe(2);expect(visited[1]).toEqual(horn);expect(enemy.defeated).toBe(true);
 });
 it('keeps the real nearby ultimate-strike handler able to remove a two-HP boar',()=>{
  const scene=sceneFixture(),player=playerFixture(),enemy=makeAnimal(scene);enemy.hp=2;
  vi.stubGlobal('document',{visibilityState:'visible'});Object.assign(player,{usingUltimate:true});player.sprite.scene=scene as any;beginUltimateFreeze(scene as any,player);expect(scene.physics.world.isPaused).toBe(true);const strike=new UltimateStrike(player,{x:100,y:100},1,220,22);strike.sweepTo(0);scene.events.emit('ultimate-strike',strike);
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
