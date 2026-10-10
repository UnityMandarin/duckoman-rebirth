import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type {Player} from './Player';
import {rectsOverlap, type Rect} from '../systems/contactRules';
import {hitSpark} from '../systems/HitSpark';
import type {KillImpulse} from '../systems/debrisMath';
import {scatterDebris} from '../systems/DebrisBurst';
import {Dashable} from './Dashable';
import {tagBody} from '../systems/DebugHitboxes';
import type {UltimateStrike} from '../systems/ultimateSwingMath';
import {canHareJump, createBoarState, findHareSupport, harePassiveBounds, isHareNear, hareLandingTimeSeconds, resetBoarPause, safeHareBounds, selectHareClimbTarget, stepBoar, type AnimalSurface} from '../systems/animalRules';

const SPIKE={bodyWidth:46,bodyHeight:84,spikeWidth:10,spikeHeight:22,displayHeight:84,displayWidth:59};

export class BasicEnemy extends Dashable {
  readonly sprite: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Image;
  readonly body: Phaser.Physics.Arcade.Body;
  private direction: -1 | 1 = -1;
  defeated = false;
  hp=1;
  private hurtUntil=0;
  private maxHp=1;
  private readonly healthImage?:Phaser.GameObjects.Image;
  private readonly healthLabel?:Phaser.GameObjects.Text;
  private readonly healthEmpty?:Phaser.GameObjects.Graphics;
  readonly pointed: boolean;
  readonly jumper: boolean;
  private readonly cleanup:()=>void;
  private readonly strike:(strike:UltimateStrike)=>void;
  private jumpAt=0;
  private awake?:boolean;
  private animalPlayer?:Player;
  private animalSurfaces:readonly AnimalSurface[]=[];
  private animalSpeedFactor=1;
  private animalClockMs=0;
  private boarState=createBoarState();
  private boarTell=false;
  private hareNextHopAt=0;
  private hareCommittedX?:number;
  private hareCommittedBaseVX=0;
  private hareFlatHop=false;
  private hareAirBounds?:{left:number;right:number};
  private hareWasGrounded=false;
  private animalRoom=0;

  constructor(scene: Phaser.Scene, x: number, y: number, private patrol?: { left: number; right: number }, pointed=false, jumper=false, private readonly skin?:string,private readonly onDefeated?:()=>void) {
    super();
    this.pointed=pointed;
    this.jumper=jumper;
    this.sprite = scene.add.rectangle(x, y, TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight, 0xef5350);
    this.sprite.setVisible(false);
    this.visual = scene.add.image(x, y, skin??(pointed?'spike-robot':jumper?'jumper-robot':'robot')).setDepth(5);
    this.healthImage=scene.add.image(x,y-64,'robot-health').setDisplaySize(108,36).setDepth(12);
    this.healthEmpty=scene.add.graphics().setDepth(13);
    this.healthLabel=scene.add.text(x,y-84,'1 / 1 HP',{fontFamily:'Arial',fontSize:this.isAnimal?'9px':'11px',color:'#fff2dc',stroke:'#07111f',strokeThickness:this.isAnimal?2:3}).setOrigin(.5,this.isAnimal ? 0.5 : 1).setDepth(14);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(TUNING.enemy.bodyWidth, TUNING.enemy.bodyHeight);
    if(pointed)this.body.setSize(SPIKE.bodyWidth,SPIKE.bodyHeight,false).setOffset((TUNING.enemy.bodyWidth-SPIKE.bodyWidth)/2,TUNING.enemy.bodyHeight-SPIKE.bodyHeight);
    if(jumper)this.body.setSize(42,76,false).setOffset(4,-26);
    if(skin)this.body.setSize(jumper?46:68,jumper?64:48,false).setOffset(jumper?2:-9,jumper?-14:2);
    tagBody(this.sprite,'danger',()=>this.hurtboxes);
    this.body.setGravityY(TUNING.enemy.gravity);
    this.body.setMaxVelocity(TUNING.enemy.moveSpeed, TUNING.enemy.maxFallVelocity);
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    this.strike=(strike:UltimateStrike)=>{
      if(strike.player.sprite.scene!==scene||!strike.player.active||!strike.player.usingUltimate||this.defeated||!this.body.enable||scene.time.now<this.hurtUntil||document.visibilityState!=='visible'||!scene.sys.isActive()||scene.physics.world.isPaused)return;
      const horn=this.boarHornBounds;
      if(this.hurtboxes.some(bounds=>strike.tryHit(this,bounds))||horn&&strike.tryHit(this,horn)){
        const dx=this.sprite.x-strike.hand.x,dy=this.sprite.y-strike.hand.y,len=Math.hypot(dx,dy)||1;
        if(this.hit(2,{x:dx/len*500,y:dy/len*500}))strike.player.chargeUltimate(10);
      }
    };
    this.cleanup=()=>{scene.events.off(Phaser.Scenes.Events.POST_UPDATE,this.syncVisual,this);scene.events.off('ultimate-strike',this.strike);scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);};
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE,this.syncVisual,this);
    scene.events.on('ultimate-strike',this.strike);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
  }

  setPatrolBounds(bounds:{left:number;right:number}):void { this.patrol={...bounds}; }

  get isAnimal():boolean { return this.skin==='thorn-boar'||this.skin==='gloom-hare'; }
  get isThornBoar():boolean { return this.skin==='thorn-boar'; }
  get facingDirection():-1|1 { return this.isThornBoar?this.boarState.direction:this.direction; }
  /** Small logical danger zone aligned to the visible front tusk. */
  get boarHornBounds():Rect|null {
    if(!this.isThornBoar)return null;
    const b=this.body, left=this.facingDirection>0?this.sprite.x+31:this.sprite.x-48;
    return {left,right:left+17,top:b.bottom-40,bottom:b.bottom-19};
  }

  configureAnimal(player:Player,surfaces:readonly AnimalSurface[],speedFactor:number):void {
    if(!this.isAnimal)return;
    this.animalPlayer=player;this.animalSurfaces=surfaces;this.animalSpeedFactor=Math.max(.01,speedFactor);
    this.animalRoom=Math.floor(this.sprite.x/1440);
    if(this.skin==='thorn-boar'){
      this.boarState=createBoarState(-1);this.direction=-1;this.boarTell=false;this.visual.setFlipX(true);this.body.setVelocityX(0);
      this.body.setMaxVelocity(260*this.animalSpeedFactor,TUNING.enemy.maxFallVelocity);
    }else this.body.setMaxVelocity(210*this.animalSpeedFactor,TUNING.enemy.maxFallVelocity);
  }

  setAwake(awake:boolean):void {
    if(this.defeated)return;
    if(this.awake===awake)return;
    this.awake=awake;
    this.body.setEnable(awake);this.visual.setVisible(awake);
    this.healthImage?.setVisible(awake);this.healthLabel?.setVisible(awake);this.healthEmpty?.setVisible(awake);
    if(this.skin==='thorn-boar'){
      this.boarState=resetBoarPause(this.boarState);this.direction=this.boarState.direction;this.visual.setFlipX(this.facingDirection<0);this.boarTell=false;this.animalClockMs=0;this.body.setVelocityX(0);
    }
  }

  update(autoJump=true,deltaMs?:number): void {
    if (this.defeated) return;
    const frameDeltaMs=deltaMs??this.sprite.scene.game.loop.delta;
    if(this.skin==='thorn-boar'){this.updateBoar(frameDeltaMs);return;}
    if(this.skin==='gloom-hare'){this.updateHare(frameDeltaMs);return;}
    if (this.body.blocked.left) this.direction = 1;
    if (this.body.blocked.right) this.direction = -1;
    if (this.patrol && this.sprite.x <= this.patrol.left) this.direction = 1;
    if (this.patrol && this.sprite.x >= this.patrol.right) this.direction = -1;
    this.body.setVelocityX(this.direction * TUNING.enemy.moveSpeed);
    const now=this.sprite.scene.time.now;
    if(autoJump&&this.jumper&&this.body.blocked.down&&now>=this.jumpAt){
      this.body.setVelocityY(TUNING.player.jumpVelocity);this.jumpAt=now+1600;
    }
  }

  private updateBoar(deltaMs:number):void {
    if(!this.body.enable)return;
    const bounds=this.patrol??{left:this.sprite.x-180,right:this.sprite.x+180};
    const step=stepBoar(this.boarState,{deltaMs,x:this.sprite.x,left:bounds.left,right:bounds.right,blockedLeft:this.body.blocked.left,blockedRight:this.body.blocked.right});
    this.boarState=step.state;this.direction=this.boarState.direction;this.visual.setFlipX(this.facingDirection<0);this.boarTell=step.tell;this.body.setVelocityX(step.velocityX);
    const player=this.animalPlayer;
    if(player?.active&&player.body.enable&&this.body.enable&&rectsOverlap(player.body,this.boarHornBounds!))player.takeDamage(this.sprite.x);
  }

  private updateHare(deltaMs:number):void {
    const dt=Math.max(0,Math.min(50,deltaMs));this.animalClockMs+=dt;
    const player=this.animalPlayer;
    const grounded=this.body.blocked.down||this.body.touching.down;
    const half=this.body.width/2,feet=this.body.bottom,roomLeft=this.animalRoom*1440,roomRight=roomLeft+1440;
    if(grounded&&!this.hareWasGrounded){this.hareCommittedX=undefined;this.hareCommittedBaseVX=0;this.hareFlatHop=false;this.hareAirBounds=undefined;}
    if(!grounded&&this.hareCommittedX!==undefined){
      const dx=this.hareCommittedX-this.sprite.x;
      this.body.setVelocityX(Math.abs(dx)<=8?0:Math.sign(dx)*Math.min(210,Math.abs(this.hareCommittedBaseVX)));
      this.hareWasGrounded=false;return;
    }
    if(!grounded&&this.hareFlatHop){
      const bounds=this.hareAirBounds;
      const atLimit=!!bounds&&(this.direction<0?this.sprite.x<=bounds.left+1:this.sprite.x>=bounds.right-1);
      this.body.setVelocityX(atLimit?0:this.direction*100);this.hareWasGrounded=false;return;
    }
    const support=findHareSupport(this.animalSurfaces,this.animalRoom,this.sprite.x,feet,half);
    if(!support){this.body.setVelocityX(0);this.hareWasGrounded=grounded;return;}
    const liveBounds=safeHareBounds(support,roomLeft,roomRight,half);
    if(!liveBounds){this.body.setVelocityX(0);this.hareWasGrounded=grounded;return;}
    const near=player?isHareNear({active:player.active,x:player.sprite.x,feet:player.body.bottom},{x:this.sprite.x,feet}):false;
    const passiveBounds=harePassiveBounds(this.patrol,liveBounds);
    const bounds=near?liveBounds:passiveBounds;
    const targetX=near&&player?Math.max(liveBounds.left,Math.min(liveBounds.right,player.sprite.x)):undefined;
    if(!near){
      if(this.sprite.x<=bounds.left)this.direction=1;else if(this.sprite.x>=bounds.right)this.direction=-1;
      this.body.setVelocityX(this.direction*55);this.hareWasGrounded=grounded;return;
    }
    const toward=Math.sign((targetX??this.sprite.x)-this.sprite.x) as -1|0|1;
    if(toward!==0)this.direction=toward;
    const above=!!player&&player.body.bottom<=feet-16;
    if(canHareJump(near,grounded,this.animalClockMs,this.hareNextHopAt)&&above&&player){
      const climb=selectHareClimbTarget({surfaces:this.animalSurfaces,room:this.animalRoom,x:this.sprite.x,feet,playerX:player.sprite.x,halfBodyWidth:half,roomLeft,roomRight});
      if(climb){
        const seconds=hareLandingTimeSeconds(climb.rise),baseVX=(climb.x-this.sprite.x)/seconds/this.animalSpeedFactor;
        this.hareCommittedX=climb.x;this.hareCommittedBaseVX=Math.max(-210,Math.min(210,baseVX));this.body.setVelocityX(this.hareCommittedBaseVX);this.body.setVelocityY(TUNING.player.jumpVelocity);this.hareNextHopAt=this.animalClockMs+900;this.hareWasGrounded=false;return;
      }
    }
    const direction=toward||this.direction;
    const atLimit=direction<0?this.sprite.x<=liveBounds.left+1:this.sprite.x>=liveBounds.right-1;
    if(canHareJump(near,grounded,this.animalClockMs,this.hareNextHopAt)&&!atLimit){
      const requested=targetX??this.sprite.x;
      const requestedDirection=Math.sign(requested-this.sprite.x);if(requestedDirection)this.direction=requestedDirection<0?-1:1;
      this.hareCommittedX=undefined;this.hareFlatHop=true;this.hareAirBounds=liveBounds;this.body.setVelocityX(this.direction*100);this.body.setVelocityY(TUNING.player.jumpVelocity);this.hareNextHopAt=this.animalClockMs+900;this.hareWasGrounded=false;return;
    }
    this.body.setVelocityX(atLimit?0:direction*55);this.hareWasGrounded=grounded;
  }

  /** Solid hurt regions: the torso, plus the single spike on a pointed robot's head. */
  get hurtboxes(): Rect[] {
    const b=this.body;
    if(!this.pointed)return [{left:b.left,right:b.right,top:b.top,bottom:b.bottom}];
    const spikeBottom=b.top+SPIKE.spikeHeight,cx=b.center.x;
    return [
      {left:cx-SPIKE.spikeWidth/2,right:cx+SPIKE.spikeWidth/2,top:b.top,bottom:spikeBottom},
      {left:b.left,right:b.right,top:spikeBottom,bottom:b.bottom}
    ];
  }

  protected dashBounds(): Rect | null {
    if(this.defeated||!this.body.enable)return null;
    const b=this.body;
    return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
  }

  protected onDash(player: Player, impulse: KillImpulse): void {
    if(this.hit(1,impulse,false))player.chargeUltimate(10);
  }

  override receiveDash(player:Player):void {
    if(!this.isThornBoar){super.receiveDash(player);return;}
    if(this.defeated||!this.body.enable||!player.active)return;
    const horn=this.boarHornBounds!;
    if(rectsOverlap(player.body,horn)){player.takeDamage(this.sprite.x);return;}
    const rear=(player.body.center.x-this.body.center.x)*this.facingDirection<0;
    if(!rear||player.dashVelocity.x*this.facingDirection<=0){
      if(rectsOverlap(player.body,{left:this.body.left,right:this.body.right,top:this.body.top,bottom:this.body.bottom}))player.takeDamage(this.sprite.x);
      return;
    }
    super.receiveDash(player);
  }

  /** `spark` is off for dash hits, which already spark at the contact point. */
  hit(amount=1,impulse?:KillImpulse,spark=true):boolean {
    const now=this.sprite.scene.time.now;
    if(this.defeated||now<this.hurtUntil)return false;
    this.maxHp=Math.max(this.maxHp,this.hp);
    this.hp=Math.max(0,this.hp-amount);this.hurtUntil=now+400;
    if(spark)hitSpark(this.sprite.scene,this.body.center.x,this.body.center.y);
    if(this.hp===0)this.defeat(impulse);
    else {this.visual.setAlpha(.4);this.sprite.scene.tweens.add({targets:this.visual,alpha:1,duration:400});}
    return true;
  }

  defeat(impulse?:KillImpulse): void {
    if (this.defeated) return;
    this.defeated = true;
    this.cleanup();
    this.onDefeated?.();
    this.healthImage?.destroy();this.healthLabel?.destroy();this.healthEmpty?.destroy();
    this.sprite.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisual, this);
    this.sprite.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.cleanup);
    this.body.setEnable(false);
    this.sprite.setVisible(false);
    const scene=this.sprite.scene,x=this.visual.x,y=this.visual.y;
    const cracks=scene.add.graphics().setDepth(15).lineStyle(2,0xffd576)
      .lineBetween(x-20,y-24,x+4,y-4).lineBetween(x+4,y-4,x-8,y+15).lineBetween(x+4,y-4,x+25,y+8);
    const shove=impulse?{x:impulse.x*.05,y:impulse.y*.05}:{x:0,y:0};
    scene.tweens.add({targets:[this.visual,cracks],alpha:0,x:`+=${shove.x}`,y:`+=${shove.y}`,duration:120,onComplete:()=>{this.visual.destroy();cracks.destroy();}});
    const gears=[];
    for(let i=0;i<7;i++){
      const gear=scene.add.graphics().setPosition(x,y).setDepth(15);
      gear.fillStyle(i%2?0xa88348:0x788896).fillCircle(0,0,this.skin?3:5).fillStyle(0x162231).fillCircle(0,0,2);
      if(!this.skin)for(let j=0;j<8;j++){const a=j*Math.PI/4;gear.fillStyle(0xa88348).fillRect(Math.cos(a)*5-1,Math.sin(a)*5-1,3,3);}
      gears.push(gear);
    }
    scatterDebris(scene,gears,impulse);
    this.sprite.scene.time.delayedCall(0, () => this.sprite.destroy());
  }

  private syncVisual(): void {
    if (this.defeated || !this.body.enable) return;
    const phase = this.sprite.scene.time.now * 0.012;
    if(!this.isThornBoar&&Math.abs(this.body.velocity.x)>1)this.direction=this.body.velocity.x>0?1:-1;
    const width=this.skin?(this.jumper?110:100):this.pointed?SPIKE.displayWidth:this.jumper?72:88;
    const height=this.skin?width/1.5:this.pointed?SPIKE.displayHeight:this.jumper?108:88;
    this.visual.setDisplaySize(width, height + Math.sin(phase) * (this.jumper?5:2));
    this.visual.setPosition(this.sprite.x, this.sprite.y - 2 + Math.sin(phase * 2) * 1.4).setFlipX(this.skin||this.pointed?(this.isThornBoar?this.facingDirection:this.direction)<0:this.direction>0);
    if(this.skin||this.pointed)this.visual.setY(this.body.bottom-height/2+Math.sin(phase*2));
    this.visual.setRotation(Math.sin(phase) * (this.jumper?0.055:0.035) + (this.skin==='thorn-boar'&&this.boarTell?-0.075:0));
    this.maxHp=Math.max(this.maxHp,this.hp);
    const barY=this.visual.y-this.visual.displayHeight/2-20;
    this.healthImage?.setPosition(this.sprite.x,barY);
    this.healthLabel?.setPosition(this.isAnimal?this.sprite.x+11:this.sprite.x,this.isAnimal?barY+2:barY-19).setText(`${this.hp} / ${this.maxHp} HP`);
    this.healthEmpty?.clear();
    if(this.hp<this.maxHp)this.healthEmpty?.fillStyle(0x08131b,.95).fillRect(this.sprite.x-23+67*this.hp/this.maxHp,barY-1,67*(1-this.hp/this.maxHp),6);
  }
}
