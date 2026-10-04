import Phaser from 'phaser';
import type {Player} from './Player';
import {Dashable} from './Dashable';
import type {KillImpulse} from '../systems/debrisMath';
import {WARDEN_RULES,WARDEN_WALK_SPEED,chooseWardenPortal,createWardenController,damageWarden,recheckWardenPortal,resumeWardenWarning,tickWarden,wardenAcceptedDamage,wardenCanAct,wardenClawShape,wardenDashTouchesRibs,wardenLineHitsRect,wardenRibBounds,wardenSonicLine,wardenVulnerable,type WardenController,type WardenPhase} from '../systems/HollowWardenRules';
import type {UltimateStrike} from '../systems/ultimateSwingMath';

export class HollowWarden extends Dashable {
 readonly image:Phaser.GameObjects.Image;
 controller:WardenController;
 readonly warning:Phaser.GameObjects.Graphics;
 readonly ribs:Phaser.GameObjects.Graphics;
 readonly portalRings:Phaser.GameObjects.Image[];
 private readonly slashImages:Phaser.GameObjects.Image[];
 readonly noiseStatus:Phaser.GameObjects.Text;
 readonly healthText:Phaser.GameObjects.Text;
 readonly directionText:Phaser.GameObjects.Text;
 private readonly bossBarFrame:Phaser.GameObjects.Image;
 private readonly bossBarFill:Phaser.GameObjects.Image;
 private readonly sniffPulse:Phaser.GameObjects.Graphics;
 private readonly noisePulses:{x:number;started:number;graphic:Phaser.GameObjects.Image}[]=[];
 private cooldownUntil=0;
 private lastHeardX?:number;
 private quietMs=0;
 private heardUntil=0;
 private sniffed=false;
 private hitToken='';
 private hitThisPhase=false;
 private alive=true;
 private lifecycleGap=false;
 private resumeGuard=false;
 private warningGeometrySignature='';
 private ribGeometrySignature='';
 private revealUntil:number;
 private readonly strikeListener:(strike:UltimateStrike)=>void;
 private readonly shutdownListener:()=>void;
 private readonly pauseListener=()=>{this.lifecycleGap=true;};
 private readonly resumeListener=()=>{this.lifecycleGap=true;};
 private readonly visibilityListener=()=>{if(document.visibilityState!=='visible')this.lifecycleGap=true;};
 constructor(private readonly scene:Phaser.Scene,private readonly player:Player,onDefeated:()=>void,x=790,revealMs=2000){
  super();this.controller=createWardenController();this.revealUntil=scene.time.now+revealMs;
  this.image=scene.add.image(x,360,'hollow-warden','visible').setOrigin(.5,1).setDisplaySize(563/1443*240,240).setDepth(13);
  this.warning=scene.add.graphics().setDepth(16);this.ribs=scene.add.graphics().setDepth(17);
  this.portalRings=[0,1,2].map(()=>scene.add.image(0,350,'quality-concept-props','rescue-violet-portal').setDisplaySize(72,92).setDepth(14).setVisible(false));
  this.slashImages=[0,1].map(()=>scene.add.image(0,0,'quality-concept-props','rescue-sonic-slash').setDisplaySize(210,125).setDepth(15).setVisible(false));
  this.noisePulses.length=0;for(let i=0;i<3;i++)this.noisePulses.push({x:0,started:-10000,graphic:scene.add.image(0,345,'quality-concept-props','rescue-dust').setDisplaySize(70,62).setDepth(7).setVisible(false)});
  this.sniffPulse=scene.add.graphics().setDepth(14);
  this.noiseStatus=scene.add.text(414,10,'QUIET',{fontFamily:'Georgia',fontSize:'9px',color:'#99b4ba'}).setScrollFactor(0).setDepth(62);
  this.healthText=scene.add.text(414,30,'WARDEN · 32 / 32',{fontFamily:'Georgia',fontSize:'9px',color:'#e4c18a'}).setScrollFactor(0).setDepth(62);
  this.directionText=scene.add.text(414,49,'→ LISTEN',{fontFamily:'Georgia',fontSize:'9px',color:'#a9c4c8'}).setScrollFactor(0).setDepth(62);
  this.bossBarFill=scene.add.image(414,64,'quality-chapter-hud','chapter-hud-boss-fill').setOrigin(0).setDisplaySize(210,11).setCrop(0,0,535,188).setScrollFactor(0).setDepth(51);
  this.bossBarFrame=scene.add.image(414,64,'quality-chapter-hud','chapter-hud-boss-frame').setOrigin(0).setDisplaySize(210,11).setScrollFactor(0).setDepth(52);
  this.strikeListener=(strike)=>{
   if(strike.player!==this.player||!this.alive||!strike.player.usingUltimate)return;
   const r=wardenRibBounds(this.image.x);
   if(!strike.tryHit(this,{left:r.x,right:r.x+r.width,top:r.y,bottom:r.y+r.height}))return;
   this.accept('ultimate');
  };
  this.shutdownListener=()=>this.shutdown();scene.events.on('ultimate-strike',this.strikeListener);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdownListener);scene.events.on(Phaser.Scenes.Events.PAUSE,this.pauseListener);scene.events.on(Phaser.Scenes.Events.RESUME,this.resumeListener);document.addEventListener('visibilitychange',this.visibilityListener);
  this.onDefeated=onDefeated;
 }
 private readonly onDefeated:()=>void;
 get hp():number{return this.controller.hp;}
 get phase():WardenPhase{return this.controller.phase;}
 get isAlive():boolean{return this.alive;}
 private canAct(hidden=document.visibilityState!=='visible'):boolean{return this.alive&&wardenCanAct({hidden,playerActive:this.player.active,sceneActive:this.scene.sys.isActive(),paused:this.scene.physics.world.isPaused});}
 get directionTargetX():number {return ['portal-feint','portal-cue','portal-transfer'].includes(this.controller.phase)?this.controller.lockedPortalX??this.image.x:this.image.x;}
 hear(x:number):void {if(!this.canAct()||!Number.isFinite(x))return;this.lastHeardX=Phaser.Math.Clamp(x,100,1900);this.quietMs=0;this.heardUntil=this.scene.time.now+1000;this.sniffed=false;this.addNoise(this.lastHeardX);}
 update(deltaMs:number,hidden=document.visibilityState!=='visible'):void {
  if(!this.canAct(hidden)){this.lifecycleGap=true;this.portalRings.forEach(x=>x.setVisible(false));this.slashImages.forEach(x=>x.setVisible(false));return;}const now=this.scene.time.now;
  if(this.lifecycleGap){this.controller=resumeWardenWarning(this.controller);this.hitThisPhase=false;this.lifecycleGap=false;this.resumeGuard=true;this.warningGeometrySignature='';this.ribGeometrySignature='';this.portalRings.forEach(x=>x.setVisible(false));this.slashImages.forEach(x=>x.setVisible(false));this.drawWarnings();this.updateHud(now);return;}else this.resumeGuard=false;
  const was=this.controller.phase;
  this.quietMs+=Math.min(50,Math.max(0,Number.isFinite(deltaMs)?deltaMs:0));
  if(this.quietMs>=2000&&!this.sniffed){this.sniffed=true;this.lastHeardX=Phaser.Math.Clamp(this.player.body.center.x,100,1900);this.heardUntil=now+550;this.drawSniff();}
  this.controller=tickWarden(this.controller,deltaMs,{bossX:this.image.x,bossY:360,playerX:this.player.body.center.x,playerY:this.player.body.center.y,playerWidth:this.player.body.width,playerHeight:this.player.body.height,hidden,dead:!this.player.active,paused:this.scene.physics.world.isPaused});
  if(this.controller.phase!==was){this.hitThisPhase=false;if(this.controller.phase==='portal-transfer'&&this.controller.lockedPortalX!==undefined)this.image.x=this.controller.lockedPortalX;}
  if(this.controller.phase==='listen'&&this.lastHeardX!==undefined){const difference=this.lastHeardX-this.image.x;if(Math.abs(difference)>3)this.image.x=Phaser.Math.Clamp(this.image.x+Math.sign(difference)*WARDEN_WALK_SPEED*Math.min(50,Math.max(0,deltaMs))/1000,100,1900);}
  const direction=this.controller.lockedDirection;this.image.setFlipX(direction<0);
  this.drawWarnings();this.updatePulses(now);this.updateHud(now);this.resolveAttack();
  if(this.controller.phase==='defeated'&&this.alive)this.finishDefeat();
 }
 protected dashBounds(){if(!this.canAct()||this.lifecycleGap||this.resumeGuard||!wardenVulnerable(this.controller)||this.scene.time.now<this.cooldownUntil)return null;const r=wardenRibBounds(this.image.x);return {left:r.x,right:r.x+r.width,top:r.y,bottom:r.y+r.height};}
 protected onDash(source:Player,_impulse:KillImpulse):void {if(!this.accept('dash'))return;source.chargeUltimate(10);}
 private accept(attack:'dash'|'ultimate'):boolean {if(!this.canAct()||this.lifecycleGap||this.resumeGuard)return false;const damage=wardenAcceptedDamage(this.controller,{attack,bossX:this.image.x,playerX:this.player.body.center.x,playerY:this.player.body.center.y,cooldownMs:Math.max(0,this.cooldownUntil-this.scene.time.now)});if(damage<=0)return false;this.cooldownUntil=this.scene.time.now+WARDEN_RULES.hitCooldownMs;this.controller=damageWarden(this.controller,damage);this.healthText.setText(`WARDEN · ${this.controller.hp} / 32`);this.bossBarFill.setCrop(0,0,535*this.controller.hp/WARDEN_RULES.hp,188);if(this.controller.phase==='defeated')this.finishDefeat();return true;}
 private finishDefeat():void {if(!this.alive)return;this.alive=false;this.onDefeated();this.warning.clear();this.ribs.clear();this.portalRings.forEach(g=>g.setVisible(false));this.bossBarFill.setCrop(0,0,0,188);this.image.setTint(0x788b92).setAlpha(.5);}
 private resolveAttack():void {
  const phase=this.controller.phase;if(phase!=='claw-active'&&phase!=='sonic-active'&&phase!=='portal-claw-active')return;
  const token=`${phase}:${this.controller.attackIndex}:${this.controller.sonicPass}`;if(token!==this.hitToken){this.hitToken=token;this.hitThisPhase=false;}
  if(this.hitThisPhase||this.player.isDashing||this.player.usingUltimate||!this.player.active)return;
  const body=this.player.body;let touches=false;
  if(phase==='claw-active'||phase==='portal-claw-active'){
   const shape=wardenClawShape(this.image.x,this.controller.lockedDirection);touches=body.left<shape.x+shape.width&&body.right>shape.x&&body.top<shape.y+shape.height&&body.bottom>shape.y;
  }else touches=wardenLineHitsRect(wardenSonicLine(this.controller,this.image.x),{x:body.left,y:body.top,width:body.width,height:body.height});
  if(touches)this.hitThisPhase=this.player.takeDamage(this.image.x,phase==='claw-active'||phase==='portal-claw-active'?WARDEN_RULES.claw.damage:WARDEN_RULES.beam.damage);
 }
 private drawWarnings():void {
  const c=this.controller,p=c.phase;
  const warningGeometry=p==='claw-cue'||p==='claw-active'||p==='portal-claw-cue'||p==='portal-claw-active'?(()=>{const r=wardenClawShape(this.image.x,c.lockedDirection);return `${p}:${r.x}:${r.y}:${r.width}:${r.height}`;})():p==='sonic-cue'||p==='sonic-active'?(()=>{const r=wardenSonicLine(c,this.image.x);return `${p}:${r.x1}:${r.y1}:${r.x2}:${r.y2}`;})():`empty:${p}`;
  if(warningGeometry!==this.warningGeometrySignature){const g=this.warning.clear();this.warningGeometrySignature=warningGeometry;
   if(p==='claw-cue'||p==='claw-active'||p==='portal-claw-cue'||p==='portal-claw-active'){const shape=wardenClawShape(this.image.x,c.lockedDirection),active=p.endsWith('active');g.fillStyle(active?0xf65270:0xef7185,active?.48:.22).fillRect(shape.x,shape.y,shape.width,shape.height);g.lineStyle(active?3:2,active?0xff7089:0xe7a6b1,.9).strokeRect(shape.x,shape.y,shape.width,shape.height);}
   else if(p==='sonic-cue'||p==='sonic-active'){const line=wardenSonicLine(c,this.image.x),active=p==='sonic-active';g.lineStyle(active?16:2,active?0x77f4ff:0x70e8ed,active?.85:.6).lineBetween(line.x1,line.y1,line.x2,line.y2);}
  }
  const gold=wardenVulnerable(c),ribGeometry=gold?`gold:${this.image.x}`:`empty:${p}`;
  if(ribGeometry!==this.ribGeometrySignature){this.ribs.clear();this.ribGeometrySignature=ribGeometry;if(gold){const b=wardenRibBounds(this.image.x);this.ribs.fillStyle(0xffd35b,.18).fillRoundedRect(b.x,b.y,b.width,b.height,5).lineStyle(2,0xfff1ac,1).strokeRoundedRect(b.x,b.y,b.width,b.height,5);}}
  const portal=p==='portal-feint'||p==='portal-cue'||p==='portal-transfer';
  const portalX=c.lockedPortalX,age=c.elapsedMs,scale=.25+.75*Math.min(1,age/300);this.portalRings.forEach((ring,i)=>{const at=i===0?this.image.x:i===1?portalX:undefined,active=portal&&at!==undefined;ring.setVisible(active);if(active)ring.setPosition(at!,350).setDisplaySize(72*scale,92*scale).setAlpha(i===0?.7:.9);});
  const slash=p==='sonic-cue'||p==='sonic-active';this.slashImages.forEach((image,i)=>{const active=slash&&((p==='sonic-active')===(i===1));image.setVisible(active);if(active){const line=wardenSonicLine(c,this.image.x);image.setPosition((line.x1+line.x2)/2,(line.y1+line.y2)/2).setRotation(Math.atan2(line.y2-line.y1,line.x2-line.x1)).setAlpha(i===0?.35:.8);}});
 }
 private drawSniff():void {this.sniffPulse.clear().setAlpha(1).lineStyle(2,0x91f1ed,.8).strokeCircle(this.image.x,218,26);}
 private addNoise(x:number):void {let slot=this.noisePulses.find(p=>this.scene.time.now-p.started>=800);if(!slot)slot=this.noisePulses.reduce((a,b)=>a.started<b.started?a:b);slot.x=x;slot.started=this.scene.time.now;slot.graphic.setPosition(x,345).setDisplaySize(70*.35,62*.35).setAlpha(1).setVisible(true);}
 private updatePulses(now:number):void {for(const p of this.noisePulses){const age=now-p.started;if(age>=800){p.graphic.setVisible(false);continue;}const scale=.35+age/800*.9;p.graphic.setDisplaySize(70*scale,62*scale).setAlpha(1-age/800);}if(this.sniffPulse.alpha>0){this.sniffPulse.setAlpha(Math.max(0,this.sniffPulse.alpha-.04));if(this.sniffPulse.alpha===0)this.sniffPulse.clear();}}
 private updateHud(now:number):void {const clue=this.controller.phase,attack=clue.includes('claw')?'CLAW':clue.includes('sonic')?'SONIC':clue.includes('portal')?'PORTAL':clue==='listen'?'LISTEN':'REVEAL',target=clue==='portal-cue'||clue==='portal-feint'||clue==='portal-transfer'?this.controller.lockedPortalX:this.image.x,arrow=target===undefined?'':target<this.player.body.center.x?'←':'→';this.directionText.setText(`${arrow} ${attack}`);this.noiseStatus.setText(now<this.heardUntil?'HEARD':'QUIET').setColor(now<this.heardUntil?'#a6f0e9':'#99b4ba');if(now<this.revealUntil)this.healthText.setText('HOLLOW WARDEN · REVEAL');else this.healthText.setText(`WARDEN · ${this.controller.hp} / 32`);}
 shutdown():void {this.scene.events.off('ultimate-strike',this.strikeListener);this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.shutdownListener);this.scene.events.off(Phaser.Scenes.Events.PAUSE,this.pauseListener);this.scene.events.off(Phaser.Scenes.Events.RESUME,this.resumeListener);document.removeEventListener('visibilitychange',this.visibilityListener);for(const p of this.noisePulses)p.graphic.destroy();this.noisePulses.length=0;this.portalRings.forEach(p=>p.destroy());this.slashImages.forEach(p=>p.destroy());this.warning.destroy();this.ribs.destroy();this.sniffPulse.destroy();this.image.destroy();this.noiseStatus.destroy();this.healthText.destroy();this.directionText.destroy();this.bossBarFill.destroy();this.bossBarFrame.destroy();}
}
