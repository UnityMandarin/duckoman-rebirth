import Phaser from 'phaser';
import {canUltimateDamage,ownsUltimateFreeze,hasUltimateFreeze} from '../systems/ultimateFreeze';
import type {Player} from './Player';
import type {ThrowableObject} from './ThrowableObject';
import {rectsOverlap,type Rect} from '../systems/contactRules';
import {showHitbox} from '../systems/DebugHitboxes';
import {Dashable} from './Dashable';
import {hitSpark} from '../systems/HitSpark';
import {cappedActorDeltaMs} from '../systems/HollowWardenRules';
import {renderScale} from '../systems/renderScale';
import type {UltimateStrike} from '../systems/ultimateSwingMath';
import {createRegentState,damageRegent,markRegentWallImpact,regentCameraZoom,regentChargeBounds,regentRootBounds,regentSweepBounds,regentWaveBounds,resumeRegentCue,tickRegent,REGENT_RULES,type RegentPhase,type RegentLedge} from '../systems/AntlerRegentRules';

const POSE={idle:0,turn:1,walkA:2,walkB:3,headLower:4,chargeA:5,chargeB:6,wallImpact:7,sweepTell:8,sweepA:9,sweepB:10,rear:11,leap:12,landing:13,stagger:14,roar:15,finalRecoil:16,kneesBuckle:17,sink:18,kneel:19,collapse:20,impact:21,fallen:22,corpseDim:23,corpse:24} as const;
type FxName='lane-warning'|'sweep-arc'|'dust'|'impact'|'shockwave'|'root-eruption'|'roar-glow'|'hit-sparks'|'defeat-dust';
interface Effect {image:Phaser.GameObjects.Image;age:number;life:number;kind:FxName;}
interface RootArt {signal:Phaser.GameObjects.Image;eruption:Phaser.GameObjects.Image;}
interface Wave {image:Phaser.GameObjects.Image;direction:-1|1;age:number;origin:number;}
interface CameraSnapshot {zoom:number;scrollX:number;scrollY:number;lerpX:number;lerpY:number;deadzoneX:number;deadzoneY:number;useBounds:boolean;}

/** Deterministic multi-phase Regent fight. Combat shapes and all tell anchors are in world pixels. */
export class AntlerRegent extends Dashable {
 readonly image:Phaser.GameObjects.Image;
 hp:number=REGENT_RULES.hp;
 engaged=false;
 private state=createRegentState(REGENT_RULES.hp,0);
 private clockMs=0;
 private hurtUntil=0;
 private hitVisualUntil=0;
 private playerDamageUntil=0;
 private lifecycleGap=false;
 private lastBarHp:number=REGENT_RULES.hp;
 private barFrame:Phaser.GameObjects.Image;
 private barFill:Phaser.GameObjects.Image;
 private name:Phaser.GameObjects.Text;
 private warning:Phaser.GameObjects.Image;
 private chargeArt:Phaser.GameObjects.Image;
 private sweepArt:Phaser.GameObjects.Image;
 private roarArt:Phaser.GameObjects.Image;
 private defeatArt:Phaser.GameObjects.Image;
 private rootArt:RootArt[]=[];
 private waves:Wave[]=[];
 private fx:Effect[]=[];
 private walkMs=0;
 private chargeSpeed=0;
 private lastBossX:number;
 private controlsHeld=false;
 private gravityBeforeHold=true;
 private cameraSnapshot?:CameraSnapshot;
 private cameraReturning=false;
 private cameraReturnMs=0;
 get ownsCamera():boolean{return this.hp>0&&this.engaged||this.cameraReturning;}
 private defeatCallbackCalled=false;
 private defeatDustEmitted=false;
 private readonly strike:(strike:UltimateStrike)=>void;
 private readonly pauseListener=()=>{if(!(hasUltimateFreeze(this.scene,this.player)&&this.player.active&&this.player.usingUltimate&&document.visibilityState==='visible')){this.lifecycleGap=true;this.hideHazards();}};
 private readonly resumeListener=()=>{if(!(hasUltimateFreeze(this.scene,this.player)&&this.player.active&&this.player.usingUltimate&&document.visibilityState==='visible'))this.lifecycleGap=true;};
 private readonly visibilityListener=()=>{if(document.visibilityState!=='visible')this.lifecycleGap=true;};
 constructor(private scene:Phaser.Scene,private player:Player,private cake:ThrowableObject,private left:number,private right:number,private defeated:()=>void,private practice=false,private shortIntro=false,private ledges:RegentLedge[]=[]){
  super();this.lastBossX=left+750;
  this.installEffectsFrames();
  this.image=scene.add.image(this.lastBossX,360,'regent-poses',String(POSE.idle)).setOrigin(.5,1).setDisplaySize(230,180).setDepth(12);
  this.warning=scene.add.image(this.lastBossX,360,'regent-effects','lane-warning').setOrigin(.5,1).setDisplaySize(350,44).setDepth(9).setVisible(false);
  this.chargeArt=scene.add.image(this.lastBossX,360,'regent-effects','shockwave').setOrigin(.5,1).setDisplaySize(REGENT_RULES.bodyWidth,REGENT_RULES.chargeBand).setDepth(9).setVisible(false).setAlpha(.42);
  this.sweepArt=scene.add.image(this.lastBossX,320,'regent-effects','sweep-arc').setOrigin(.5,.8).setDisplaySize(250,150).setDepth(10).setVisible(false);
  this.roarArt=scene.add.image(this.lastBossX,300,'regent-effects','roar-glow').setOrigin(.5,.8).setDisplaySize(270,255).setDepth(10).setVisible(false);
  this.defeatArt=scene.add.image(this.lastBossX,360,'regent-defeat-poses',String(POSE.finalRecoil-16)).setOrigin(.5,1).setDisplaySize(230,180).setDepth(12).setVisible(false);
  for(let i=0;i<5;i++)this.rootArt.push({signal:scene.add.image(0,360,'regent-effects','lane-warning').setOrigin(.5,1).setDisplaySize(52,20).setDepth(8).setVisible(false),eruption:scene.add.image(0,360,'regent-effects','root-eruption').setOrigin(.5,1).setDisplaySize(52,80).setDepth(10).setVisible(false)});
  for(const direction of [-1,1] as const)this.waves.push({image:scene.add.image(0,348,'regent-effects','shockwave').setOrigin(.5,1).setDisplaySize(REGENT_RULES.waveWidth,REGENT_RULES.waveHeight).setDepth(9).setVisible(false),direction,age:0,origin:this.lastBossX});
  const frames:FxName[]=['dust','impact','hit-sparks','defeat-dust'];for(const kind of frames)for(let i=0;i<(kind==='dust'||kind==='hit-sparks'?2:1);i++)this.fx.push({image:scene.add.image(0,0,'regent-effects',kind).setOrigin(.5,1).setDepth(kind==='hit-sparks'?16:9).setVisible(false),age:0,life:0,kind});
  this.barFill=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-fill').setOrigin(0).setDisplaySize(216,22).setCrop(0,0,535,188).setScrollFactor(0).setDepth(51).setVisible(false);
  this.barFrame=scene.add.image(411,32,'quality-chapter-hud','chapter-hud-boss-frame').setOrigin(0).setDisplaySize(216,22).setScrollFactor(0).setDepth(52).setVisible(false);
  this.name=scene.add.text(520,19,'THE ANTLER REGENT',{fontSize:'10px',color:'#f0c56f',stroke:'#111820',strokeThickness:3}).setOrigin(.5).setScrollFactor(0).setDepth(52).setVisible(false);
  this.strike=(strike)=>{if(strike.player===this.player&&this.player.usingUltimate&&canUltimateDamage(this.scene,this.player)&&this.engaged&&this.hp>0&&this.clockMs>=this.hurtUntil&&strike.tryHit(this,{left:this.image.x-this.image.displayWidth/2,right:this.image.x+this.image.displayWidth/2,top:this.image.y-this.image.displayHeight,bottom:this.image.y}))this.damage(4,true,true);};
  scene.events.on('ultimate-strike',this.strike);scene.events.on(Phaser.Scenes.Events.PAUSE,this.pauseListener);scene.events.on(Phaser.Scenes.Events.RESUME,this.resumeListener);document.addEventListener('visibilitychange',this.visibilityListener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.shutdown());
 }
 get controlsLocked():boolean{return this.controlsHeld;}
 get phase():RegentPhase{return this.state.phase;}
 /** Called before Player.update so the entrance and Royal Fury can safely hold input. */
 beforePlayerUpdate(delta:number):void {
  if(ownsUltimateFreeze(this.scene,this.player)||!this.canAct()||this.lifecycleGap)return;
  if(!this.engaged&&this.player.sprite.x>=this.left+100)this.beginEncounter();
  if(!this.engaged)return;
  this.syncControlHold(this.state.phase==='intro'||this.state.phase==='roar'||this.state.phase==='defeat');
  this.updateCamera(delta);
 }
 holdPlayer():void {if(!this.controlsHeld)return;const body=this.player.body as typeof this.player.body&{setAllowGravity?:(value:boolean)=>unknown};body.setVelocity(0,0);body.setAllowGravity?.(false);}
 private beginEncounter():void {
  this.engaged=true;this.state=createRegentState(this.hp,this.practice||this.shortIntro?REGENT_RULES.practiceIntroMs:REGENT_RULES.introMs);
  this.name.setVisible(true);this.barFrame.setVisible(true);this.barFill.setVisible(true);
  const camera=this.scene.cameras.main;this.cameraSnapshot={zoom:camera.zoomX,scrollX:camera.scrollX,scrollY:camera.scrollY,lerpX:camera.lerp.x,lerpY:camera.lerp.y,deadzoneX:camera.deadzone?.width??120,deadzoneY:camera.deadzone?.height??130,useBounds:camera.useBounds};
  camera.stopFollow();camera.setLerp(0,0);camera.setDeadzone(0,0);camera.useBounds=false;
  this.image.setFrame(String(POSE.roar));this.roarArt.setPosition(this.image.x,300).setVisible(true).setAlpha(0);
  this.syncControlHold(true);
 }
 private syncControlHold(hold:boolean):void {if(hold===this.controlsHeld)return;this.controlsHeld=hold;const body=this.player.body as typeof this.player.body&{allowGravity?:boolean;setAllowGravity?:(value:boolean)=>unknown};if(hold){this.gravityBeforeHold=body.allowGravity??true;body.setVelocity(0,0);body.setAllowGravity?.(false);}else{body.setVelocity(0,0);body.setAllowGravity?.(this.gravityBeforeHold);}}
 private canAct():boolean{return this.player.active&&document.visibilityState==='visible'&&this.scene.sys.isActive()&&!this.scene.physics.world.isPaused;}
 update(delta:number):void {
  if(ownsUltimateFreeze(this.scene,this.player))return;
  if(this.hp<=0&&this.state.phase==='done')return;if(!this.canAct()){this.lifecycleGap=true;return;}
  if(this.lifecycleGap){const previous=this.state.phase;this.state=resumeRegentCue(this.state);this.lifecycleGap=false;if(previous==='slam-air')this.image.setY(360);this.syncControlHold(this.state.phase==='intro'||this.state.phase==='roar'||this.state.phase==='defeat');this.hideHazards();this.onPhaseChange(previous,this.state.phase);return;}
  const dt=cappedActorDeltaMs(delta,true);this.clockMs+=dt;
  if(!this.engaged){this.animateIdle(dt,false);return;}
  if(this.lastBarHp!==this.hp){this.lastBarHp=this.hp;this.barFill.setCrop(0,0,535*this.hp/REGENT_RULES.hp,188);}
  const body=this.player.body, snapshot={bossX:this.image.x,playerX:this.player.sprite.x,arenaLeft:this.left,arenaRight:this.right,playerFeet:body.bottom,playerLeft:body.left,playerRight:body.right,ledges:this.ledges};
  const before=this.state.phase;this.state=tickRegent(this.state,dt,snapshot);this.hp=this.state.hp;
  if(before!==this.state.phase)this.onPhaseChange(before,this.state.phase);
  const now=this.clockMs,p=this.player;
  if(this.state.phase==='done'){this.completeDefeat();return;}
  this.syncControlHold(this.state.phase==='intro'||this.state.phase==='roar'||this.state.phase==='defeat');
  this.animateBoss(dt,now);
  this.updateAttackMotion(dt);
  this.updateWarningsAndEffects(dt);
  const dashed=this.checkDash(p);if(!dashed)for(const activeContact of this.activeContactBounds()){showHitbox(this.scene,'danger',activeContact);if(rectsOverlap(p.body,activeContact)&&now>=this.playerDamageUntil){p.takeDamage(this.image.x,REGENT_RULES.hazardDamage);this.playerDamageUntil=now+REGENT_RULES.hurtMs;}}
  const target=this.hittable;showHitbox(this.scene,'target',target);
  const contact=rectsOverlap(p.body,{left:this.image.x-69,right:this.image.x+69,top:245,bottom:360});
  const stomp=contact&&p.body.velocity.y>0&&p.body.prev.y+p.body.height<=268;
  if(!dashed){if(stomp&&this.state.phase!=='intro'&&this.state.phase!=='roar'&&this.state.phase!=='defeat'){this.damage(1);p.bounceFromStomp();}else if(this.cake.isThrown&&Math.abs(this.cake.sprite.x-this.image.x)<105&&Math.abs(this.cake.sprite.y-295)<80&&this.cake.registerEnemyHit())this.damage(1);}
  this.updateWaves(dt);
  if(now>=this.hitVisualUntil)this.image.clearTint();else this.image.setTint(0xffc1a0);
  if(this.state.phase==='defeat')this.updateDefeatArt();
 }
 private onPhaseChange(previous:RegentPhase,next:RegentPhase):void {
  if(next==='charge-cue'){this.chargeSpeed=0;const bounds=this.chargeWarningBounds();this.warning.setDisplaySize(bounds.right-bounds.left,64).setPosition((bounds.left+bounds.right)/2,360).setFlipX(false).setVisible(true).setAlpha(.9);}
  if(next==='sweep-cue'){const bounds=regentSweepBounds(this.image.x,this.state.lockedDirection,this.left,this.right);this.warning.setDisplaySize(bounds.right-bounds.left,64).setPosition((bounds.left+bounds.right)/2,360).setFlipX(false).setVisible(true).setAlpha(.9);}
  if(next==='thorn-cue'){this.warning.setVisible(false);this.rootArt.forEach((a,i)=>{const root=this.state.activeRoots[i];if(!root){a.signal.setVisible(false);a.eruption.setVisible(false);return;}a.signal.setDisplaySize(root.width,20).setPosition(root.x,root.surfaceY).setVisible(true).setAlpha(.65);a.eruption.setDisplaySize(root.width,80).setPosition(root.x,root.surfaceY).setVisible(false);});}
  if(next==='thorn-active')this.rootArt.forEach((a,i)=>{const root=this.state.activeRoots[i];a.signal.setVisible(false);if(root)a.eruption.setDisplaySize(root.width,80).setPosition(root.x,root.surfaceY).setVisible(true);else a.eruption.setVisible(false);});
  if(next==='slam-pulse'){this.emitFx('impact',this.image.x,360,140,105,350);this.scene.cameras.main.shake?.(150,.004);for(const wave of this.waves){wave.age=0;wave.origin=this.image.x;wave.image.setPosition(this.image.x,360).setVisible(true);}}
  if(next==='charge-brake'){if(this.state.wallImpact){this.image.setFrame(String(POSE.wallImpact));this.scene.cameras.main.shake?.(130,.003);}this.emitFx('dust',this.image.x-this.state.lockedDirection*70,360,145,78,520);}
  if(next==='roar'){this.hideHazards();this.image.setY(360);this.name.setText('ROYAL FURY');this.image.setFrame(String(POSE.roar));this.roarArt.setPosition(this.image.x,300).setVisible(true).setAlpha(1);this.scene.cameras.main.shake?.(160,.0025);}
  if((previous==='roar'||previous==='intro')&&next==='idle'){this.roarArt.setVisible(false);this.name.setText('THE ANTLER REGENT');}
  if(next==='defeat'){this.hideHazards();this.cameraReturning=true;this.cameraReturnMs=0;this.syncControlHold(true);this.defeatDustEmitted=false;this.defeatArt.setPosition(this.image.x,360).setFrame('0').setVisible(true);this.image.setVisible(false);this.name.setVisible(false);this.barFrame.setVisible(false);this.barFill.setVisible(false);}
  if(next==='stagger'){this.hideHazards();this.image.setPosition(this.image.x,360).setFrame(String(POSE.stagger));}
 }
 private animateBoss(dt:number,now:number):void {
  const phase=this.state.phase,dir=this.state.lockedDirection;
  if(phase==='defeat'){this.updateDefeatArt();return;}
  if(phase==='intro'){const progress=1-this.state.elapsedMs/Math.max(1,this.state.durationMs);this.image.setFrame(String(this.state.elapsedMs<500?POSE.rear:POSE.roar));this.roarArt.setAlpha(Math.max(0,1-progress));return;}
  if(phase==='roar'){this.image.setFrame(String(POSE.roar));this.roarArt.setPosition(this.image.x,300).setAlpha(.5+Math.sin(now*.012)*.18);return;}
  if(phase==='stagger'){this.image.setFrame(String(POSE.stagger));return;}
  if(phase==='charge-cue'){this.image.setFrame(String(POSE.headLower));this.image.setFlipX(dir<0);return;}
  if(phase==='charge-active'){this.image.setFrame(String(Math.floor(now/90)%2?POSE.chargeA:POSE.chargeB));this.image.setFlipX(dir<0);return;}
  if(phase==='charge-brake'){this.image.setFrame(String(this.state.wallImpact?POSE.wallImpact:POSE.stagger));this.image.setFlipX(dir<0);return;}
  if(phase==='sweep-cue'){this.image.setFrame(String(POSE.sweepTell));this.image.setFlipX(dir<0);return;}
  if(phase==='sweep-active'){this.image.setFrame(String(Math.floor(this.state.elapsedMs/80)%2?POSE.sweepA:POSE.sweepB));this.image.setFlipX(dir<0);return;}
  if(phase==='slam-cue'){this.image.setFrame(String(POSE.rear));return;}
  if(phase==='slam-air'){const t=this.state.elapsedMs/Math.max(1,this.state.durationMs),y=360-4*REGENT_RULES.slamRise*t*(1-t);this.image.setPosition(this.image.x,y).setFrame(String(t<.5?POSE.leap:POSE.rear));return;}
  if(phase==='slam-pulse'||phase==='slam-waves'){this.image.setPosition(this.image.x,360).setFrame(String(POSE.landing));return;}
  if(phase.startsWith('thorn-')){this.image.setFrame(String(POSE.headLower));return;}
  const target=this.player.sprite.x<this.image.x?-1:1;this.image.setFlipX(target<0);
  if(phase==='recovery'){this.image.setFrame(String(POSE.stagger));return;}
  const delta=Math.sign(this.player.sprite.x-this.image.x),dist=Math.abs(this.player.sprite.x-this.image.x);
  if(delta&&dist>150){this.image.x=Phaser.Math.Clamp(this.image.x+delta*(this.state.phaseTwo?85:REGENT_RULES.idleWalkSpeed)*dt/1000,this.left+REGENT_RULES.arenaInset,this.right-REGENT_RULES.arenaInset);this.walkMs+=dt;this.image.setFrame(String(Math.floor(this.walkMs/180)%2?POSE.walkA:POSE.walkB));}
  else{this.walkMs+=dt;this.image.setFrame(String(Math.floor(this.walkMs/650)%2?POSE.turn:POSE.idle));}
 }
 private animateIdle(dt:number,_engaged:boolean):void {this.walkMs+=dt;this.image.setFrame(String(Math.floor(this.walkMs/650)%2?POSE.turn:POSE.idle));}
 private updateAttackMotion(dt:number):void {
  if(this.state.phase==='charge-active'){
   const from=this.image.x;this.lastBossX=from;this.chargeSpeed=Math.min(REGENT_RULES.chargeMaxSpeed,this.chargeSpeed+REGENT_RULES.chargeAcceleration*dt/1000);const next=Phaser.Math.Clamp(from+this.state.lockedDirection*this.chargeSpeed*dt/1000,this.left+REGENT_RULES.arenaInset,this.right-REGENT_RULES.arenaInset);this.image.x=next;
   const wall=next===this.left+REGENT_RULES.arenaInset||next===this.right-REGENT_RULES.arenaInset;
   if(wall){this.state=markRegentWallImpact(this.state);this.onPhaseChange('charge-active','charge-brake');}
  }
  if(this.state.phase==='slam-air'&&this.state.elapsedMs>=this.state.durationMs-50)this.image.setPosition(this.image.x,360);
 }
 private activeContactBounds():Rect[] {
  if(this.state.phase==='charge-active'){
   return [this.chargeMotionBounds()];
  }
  if(this.state.phase==='sweep-active')return [regentSweepBounds(this.image.x,this.state.lockedDirection,this.left,this.right)];
  if(this.state.phase==='thorn-active')return this.state.activeRoots.map(regentRootBounds);
  return [];
 }
 private updateWarningsAndEffects(dt:number):void {
  const now=this.clockMs,phase=this.state.phase;
  this.warning.setVisible(phase==='charge-cue'||phase==='sweep-cue');
  if(this.warning.visible)this.warning.setAlpha(.42+Math.sin(now*.012)*.24);
  if(phase==='sweep-active'){const bounds=regentSweepBounds(this.image.x,this.state.lockedDirection,this.left,this.right);this.sweepArt.setDisplaySize(bounds.right-bounds.left,64).setOrigin(.5,.5).setPosition((bounds.left+bounds.right)/2,328).setFlipX(false).setVisible(true).setAlpha(.85);}else this.sweepArt.setVisible(false);
  if(phase==='charge-active'||phase==='charge-brake'){const bounds=this.chargeMotionBounds();this.chargeArt.setDisplaySize(bounds.right-bounds.left,REGENT_RULES.chargeBand).setPosition((bounds.left+bounds.right)/2,360).setVisible(true).setAlpha(.34+Math.sin(now*.025)*.08);}else this.chargeArt.setVisible(false);
  if(phase==='thorn-cue'){this.rootArt.forEach((a,i)=>{if(a.signal.visible)a.signal.setAlpha(.42+Math.sin(now*.01+i)*.25);});}
  if(phase!=='thorn-cue'&&phase!=='thorn-active'&&phase!=='thorn-withdraw')this.rootArt.forEach(a=>{a.signal.setVisible(false);a.eruption.setVisible(false);});
  if(phase==='thorn-active')this.rootArt.forEach((a,i)=>a.eruption.setAlpha(.75+Math.sin(now*.015+i)*.15));
  if(phase==='thorn-withdraw'){const alpha=Math.max(0,1-this.state.elapsedMs/Math.max(1,this.state.durationMs));this.rootArt.forEach(a=>a.eruption.setAlpha(alpha));if(this.state.elapsedMs>=this.state.durationMs)this.rootArt.forEach(a=>a.eruption.setVisible(false));}
  for(const effect of this.fx){if(!effect.image.visible)continue;effect.age+=dt;if(effect.age>=effect.life){effect.image.setVisible(false);continue;}const t=effect.age/effect.life;effect.image.setAlpha(effect.kind==='hit-sparks'?1-t:Math.min(1,t*5)*(1-t*.45));}
 }
 private updateWaves(dt:number):void {
  for(const wave of this.waves){if(!wave.image.visible)continue;wave.age+=dt;const x=wave.origin+wave.direction*REGENT_RULES.waveSpeed*wave.age/1000;wave.image.setX(x);if(wave.age>=REGENT_RULES.waveMaxMs||x<this.left+REGENT_RULES.arenaInset||x>this.right-REGENT_RULES.arenaInset){wave.image.setVisible(false);continue;}const bounds=regentWaveBounds(x,wave.direction);showHitbox(this.scene,'danger',bounds);if(rectsOverlap(this.player.body,bounds)&&this.clockMs>=this.playerDamageUntil){this.player.takeDamage(x,REGENT_RULES.hazardDamage);this.playerDamageUntil=this.clockMs+REGENT_RULES.hurtMs;}}
 }
 private chargeMotionBounds():Rect {const now=regentChargeBounds(this.image.x,this.state.lockedDirection,this.left,this.right),was=regentChargeBounds(this.lastBossX,this.state.lockedDirection,this.left,this.right);return {left:Math.min(now.left,was.left),right:Math.max(now.right,was.right),top:360-REGENT_RULES.chargeBand,bottom:360};}
 private chargeWarningBounds():Rect {const start=regentChargeBounds(this.image.x,this.state.lockedDirection,this.left,this.right),projected=Phaser.Math.Clamp(this.image.x+this.state.lockedDirection*REGENT_RULES.chargeMaxSpeed*REGENT_RULES.chargeActiveMs/1000,this.left+REGENT_RULES.arenaInset,this.right-REGENT_RULES.arenaInset),end=regentChargeBounds(projected,this.state.lockedDirection,this.left,this.right);return {left:Math.min(start.left,end.left),right:Math.max(start.right,end.right),top:360-REGENT_RULES.chargeBand,bottom:360};}
 private updateDefeatArt():void {
  const t=this.state.elapsedMs,frame=t<260?0:t<520?1:t<790?2:t<1080?3:t<1480?4:t<1780?5:t<2100?6:t<2380?7:8;
  this.defeatArt.setFrame(String(frame)).setPosition(this.image.x,360).setAlpha(t<2100?1:Math.max(.58,1-(t-2100)/1800));
  if(!this.defeatDustEmitted&&t>=1400){this.defeatDustEmitted=true;this.emitFx('defeat-dust',this.image.x,360,210,105,1000);}
 }
 private completeDefeat():void {if(this.defeatCallbackCalled)return;this.defeatCallbackCalled=true;this.player.chargeUltimate(50);this.restoreCamera();this.syncControlHold(false);this.defeated();}
 private emitFx(kind:FxName,x:number,y:number,width:number,height:number,life:number):void {const available=this.fx.find(effect=>!effect.image.visible)||this.fx[0];if(!available)return;available.kind=kind;available.age=0;available.life=life;available.image.setFrame(kind).setPosition(x,y).setDisplaySize(width,height).setAlpha(1).setVisible(true);}
 private installEffectsFrames():void {const texture=this.scene.textures.get('regent-effects');if(!texture)return;const cells:Record<FxName,[number,number]>={'lane-warning':[0,0],'sweep-arc':[1,0],dust:[2,0],impact:[0,1],shockwave:[1,1],'root-eruption':[2,1],'roar-glow':[0,2],'hit-sparks':[1,2],'defeat-dust':[2,2]};for(const[name,[col,row]]of Object.entries(cells))if(!texture.has(name))texture.add(name,0,col*512,row*341,512,341);}
 private hideHazards():void {this.warning.setVisible(false);this.chargeArt.setVisible(false);this.sweepArt.setVisible(false);this.rootArt.forEach(a=>{a.signal.setVisible(false);a.eruption.setVisible(false);});this.waves.forEach(w=>w.image.setVisible(false));}
 private updateCamera(delta:number):void {
  const camera=this.scene.cameras.main,dt=Math.max(0,Math.min(delta,50)),scale=renderScale();
  if(this.cameraReturning){this.cameraReturnMs+=dt;const t=Math.min(1,this.cameraReturnMs/700),ease=t*t*(3-2*t),snapshot=this.cameraSnapshot;if(snapshot){camera.setZoom(Phaser.Math.Linear(camera.zoomX,scale,ease));camera.setScroll(Phaser.Math.Linear(camera.scrollX,snapshot.scrollX,ease),Phaser.Math.Linear(camera.scrollY,snapshot.scrollY,ease));}if(t>=1)this.restoreCamera();return;}
  if(!this.engaged||!this.cameraSnapshot)return;
  const combat=this.state.phase!=='intro'&&this.state.phase!=='roar'&&this.state.phase!=='defeat'&&this.state.phase!=='done';
  const dist=Math.abs(this.player.sprite.x-this.image.x),targetWorldZoom=this.state.phase==='intro'?.42:this.state.phase==='roar'?.42:combat?regentCameraZoom(dist,this.right-this.left):.44;
  const zoom=targetWorldZoom*scale,blend=1-Math.exp(-3*dt/1000);camera.setZoom(Phaser.Math.Linear(camera.zoomX,zoom,blend));
  const viewW=camera.width/Math.max(.001,camera.zoomX),viewH=camera.height/Math.max(.001,camera.zoomY),focusX=(this.player.sprite.x+this.image.x)/2;
  const x=Phaser.Math.Clamp(focusX-viewW/2,this.left,Math.max(this.left,this.right-viewW));const y=Phaser.Math.Clamp(360-viewH*.63,-((this.right-this.left)*1024/1536)+760,760-viewH);camera.setScroll(Phaser.Math.Linear(camera.scrollX,x,blend),Phaser.Math.Linear(camera.scrollY,y,blend));
 }
 private restoreCamera():void {const snapshot=this.cameraSnapshot;if(!snapshot)return;const c=this.scene.cameras.main;if(!c){this.cameraReturning=false;this.cameraSnapshot=undefined;return;}c.stopFollow();c.setZoom(renderScale()).setScroll(snapshot.scrollX,snapshot.scrollY).setLerp(snapshot.lerpX,snapshot.lerpY).setDeadzone(snapshot.deadzoneX,snapshot.deadzoneY);c.useBounds=snapshot.useBounds;c.startFollow(this.player.sprite,false,snapshot.lerpX,snapshot.lerpY);this.cameraReturning=false;this.cameraSnapshot=undefined;}
 private shutdown():void {
  this.syncControlHold(false);this.hideHazards();this.scene.events.off('ultimate-strike',this.strike);this.scene.events.off(Phaser.Scenes.Events.PAUSE,this.pauseListener);this.scene.events.off(Phaser.Scenes.Events.RESUME,this.resumeListener);document.removeEventListener('visibilitychange',this.visibilityListener);
  if(this.cameraSnapshot)this.restoreCamera();
  this.fx.forEach(effect=>effect.image.destroy());this.rootArt.forEach(a=>{a.signal.destroy();a.eruption.destroy();});this.waves.forEach(w=>w.image.destroy());this.warning.destroy();this.chargeArt.destroy();this.sweepArt.destroy();this.roarArt.destroy();this.defeatArt.destroy();
 }
 private get hittable():Rect{return {left:this.image.x-62,right:this.image.x+62,top:245,bottom:360};}
 protected dashBounds():Rect|null{return this.hp>0&&this.engaged&&this.canAct()&&this.state.phase!=='intro'&&this.state.phase!=='roar'&&this.state.phase!=='defeat'&&this.state.phase!=='done'?this.hittable:null;}
 protected onDash():void{this.damage(1,false);}
 private damage(amount:number,spark=true,ultimate=false):boolean {
  const now=this.clockMs;if(!(ultimate?canUltimateDamage(this.scene,this.player):this.canAct())||(!ultimate&&this.lifecycleGap)||this.hp<=0||now<this.hurtUntil)return false;
  if(spark)hitSpark(this.scene,this.image.x,295,1.4);
  this.emitFx('hit-sparks',this.image.x,this.image.y-70,82,82,190);
  const previous=this.state.phase;this.state=damageRegent({...this.state,hp:this.hp},amount);this.hp=this.state.hp;this.hurtUntil=now+REGENT_RULES.hurtMs;this.hitVisualUntil=now+190;
  if(previous!==this.state.phase)this.onPhaseChange(previous,this.state.phase);
  return true;
 }
}
