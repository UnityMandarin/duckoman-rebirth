import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import type {ChapterKind,Ledge} from '../data/chapters';
import {CHAPTER_DIFFICULTY,encounterFor,encounterSurfaceEffects,advanceWindDrift,addWindDrift,canReceiveWind,type SurfaceEffect} from '../data/chapterChallenges';
import {rectsOverlap} from './contactRules';
import {showHitbox} from './DebugHitboxes';
import {roomFor} from '../data/qualityRooms';
import {identityTexture} from './ChapterVisuals';
import {advanceQualityTrapClock,qualityTrapDeltaMs,trapIdleCadenceMs,pressPhaseAfterGap,pressStartsWarning,pressCanFall,shutterCanClose,crumblePhaseAfterGap,specialPhaseAfterGap,trapSectionBuildCount,activeTrapEncounterIndex,trapRoomTransition,trapDustScale,pressImpactCenterY,QUALITY_PRESS_HALF_HEIGHT,QUALITY_TRAP_WARNING_MS,type TrapPressPhase,type TrapCrumblePhase} from './qualityTrapClock';

export interface ChapterSurface {shape:Phaser.GameObjects.Rectangle;art:Phaser.GameObjects.Image|Phaser.GameObjects.TileSprite;ledge:Ledge;}
type Press={section:number;x:number;ground:number;art:Phaser.GameObjects.Image;warning:Phaser.GameObjects.Graphics;phase:TrapPressPhase;at:number;hit:boolean;zone:{left:number;right:number;top:number;bottom:number};};
type Crumble={section:number;surface:ChapterSurface;phase:TrapCrumblePhase;at:number;baseX:number;baseY:number;brokenAt:number;visible:boolean;};
type Special={section:number;surface:ChapterSurface;type:SurfaceEffect['type'];x:number;y:number;phase:number;direction:-1|1;strength:number;cycleStart:number;holdSolid:boolean;visible:boolean;justRevealed:boolean;};
type DustFx={image:Phaser.GameObjects.Image;active:boolean;started:number;x:number;y:number;section:number;duration:number;scale:number;baseScaleX:number;baseScaleY:number;};
const WIND_POOL_SIZE=12,DUST_POOL_SIZE=12,SECTION_WIDTH=1440,ACTIVE_X=1510,ACTIVE_Y=720;

/** Authored Chapter 2/3 motion, tells and safe recovery. */
export class ChapterTraps {
 private readonly presses=new Map<number,Press[]>();
 private readonly crumbles=new Map<number,Crumble[]>();
 private readonly specials=new Map<number,Special[]>();
 private readonly effects=new Map<number,Phaser.GameObjects.Text[]>();
 private readonly windStreaks:Phaser.GameObjects.Image[]=[];
 private readonly dust:DustFx[]=[];
 private readonly roomActive:boolean[]=[];
 private windDriftX=0;
 private clockMs=0;
 private lastDust=0;
 private suspendedGap=false;
 private readonly reducedMotion:MediaQueryList|undefined;
 private readonly sectionCount:number;
 constructor(private readonly scene:Phaser.Scene,private readonly player:Player,private readonly kind:ChapterKind,surfaces:ChapterSurface[],onlySections?:readonly number[]){
  this.sectionCount=kind==='jail'?12:kind==='crimson'?10:22;
  for(let i=0;i<this.sectionCount;i++)this.roomActive.push(false);
  this.reducedMotion=typeof window!=='undefined'?window.matchMedia?.('(prefers-reduced-motion: reduce)'):undefined;
  for(let i=0;i<WIND_POOL_SIZE;i++)this.windStreaks.push(scene.add.image(0,0,'quality-concept-props','wind-streak').setDisplaySize(i<8?54:46,i<8?17:14).setDepth(i<8?7:6).setVisible(false));
  for(let i=0;i<DUST_POOL_SIZE;i++){const image=scene.add.image(0,0,'quality-concept-props','impact-dust').setDisplaySize(66,52).setDepth(14).setVisible(false);this.dust.push({image,active:false,started:0,x:0,y:0,section:-1,duration:460,scale:1,baseScaleX:image.scaleX,baseScaleY:image.scaleY});}
  const put=<T,>(map:Map<number,T[]>,section:number,item:T):void=>{let bucket=map.get(section);if(!bucket){bucket=[];map.set(section,bucket);}bucket.push(item);};
  const buildSections=onlySections??undefined;
  const first=buildSections?0:1,last=buildSections?buildSections.length:trapSectionBuildCount(this.sectionCount);
  for(let cursor=first;cursor<last;cursor++){
   const section=buildSections?buildSections[cursor]:cursor;if(section===undefined)continue;
   const encounter=encounterFor(kind,section);if(!encounter)continue;
   const ledges:ChapterSurface[]=[];for(const surface of surfaces)if(Math.floor(surface.ledge.x/SECTION_WIDTH)===section)ledges.push(surface);
   // Crimson's pre-authored encounters use the legacy conveyor fallback; Chapters 2/3 use explicit moving indexes only.
   const effectSource=kind==='crimson'?encounter:{...encounter,conveyor:undefined};
   for(const effect of encounterSurfaceEffects(effectSource)){
    const surface=ledges[effect.platformIndex];if(!surface)continue;
    put(this.specials,section,{section,surface,type:effect.type,x:surface.ledge.x,y:surface.ledge.y,phase:effect.platformIndex*Math.PI,direction:effect.direction,strength:effect.strength,cycleStart:0,holdSolid:false,visible:false,justRevealed:false});
   }
   if(encounter.wind){
    const floor=roomFor(kind,section)?.floor??360;
    put(this.effects,section,scene.add.text(section*SECTION_WIDTH+720,floor-76,`WIND  ${encounter.wind.direction<0?'←':'→'}  ·  DASH TO HOLD YOUR LINE`,{fontSize:'11px',color:'#c0e3dc',stroke:'#071119',strokeThickness:4}).setOrigin(.5).setDepth(6).setAlpha(.16));
   }
   for(const moving of encounter.moving??[]){
    const surface=ledges[moving.step];if(!surface)continue;
    if(moving.type==='crumble')put(this.crumbles,section,{section,surface,phase:'idle',at:0,baseX:surface.ledge.x,baseY:surface.ledge.y,brokenAt:0,visible:false});
    if(moving.type==='presses'){
     const x=surface.ledge.x,ground=surface.ledge.y-16;
     put(this.presses,section,{section,x,ground,art:scene.add.image(x,ground-480,identityTexture(kind),'press').setDisplaySize(88,225).setDepth(9).setVisible(false),warning:scene.add.graphics().setDepth(8),phase:'idle',at:1200+moving.step*240,hit:false,zone:{left:x-32,right:x+32,top:ground-480-QUALITY_PRESS_HALF_HEIGHT,bottom:ground-480+QUALITY_PRESS_HALF_HEIGHT}});
    }
   }
  }
  this.scene.events.on(Phaser.Scenes.Events.PAUSE,this.markGap);
  this.scene.events.on(Phaser.Scenes.Events.SLEEP,this.markGap);
  this.scene.game.events.on(Phaser.Core.Events.BLUR,this.markGap);
  document.addEventListener('visibilitychange',this.visibilityChanged);
  this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.shutdown);
 }
 private readonly markGap=():void=>{this.suspendedGap=true;};
 private readonly visibilityChanged=():void=>{if(document.visibilityState!=='visible')this.markGap();};
 private readonly shutdown=():void=>{
  this.scene.events.off(Phaser.Scenes.Events.PAUSE,this.markGap);this.scene.events.off(Phaser.Scenes.Events.SLEEP,this.markGap);
  this.scene.game.events.off(Phaser.Core.Events.BLUR,this.markGap);document.removeEventListener('visibilitychange',this.visibilityChanged);
  this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.shutdown);
 };
 update(deltaMs=this.scene.game.loop.delta):void {
  const p=this.player.body,live=this.player.active&&this.scene.sys.isActive()&&!this.scene.physics.world.isPaused&&document.visibilityState==='visible';
  if(!live){this.suspendedGap=true;for(const streak of this.windStreaks)streak.setVisible(false);return;}
  const resumed=this.suspendedGap;this.suspendedGap=false;
  const stepMs=qualityTrapDeltaMs(deltaMs,true);this.clockMs=advanceQualityTrapClock(this.clockMs,stepMs,true);
  const now=this.clockMs,factor=CHAPTER_DIFFICULTY[this.kind],section=Math.floor(p.center.x/SECTION_WIDTH),encounterIndex=activeTrapEncounterIndex(section,this.sectionCount),roomStart=encounterIndex===undefined?this.sectionCount:Math.max(0,section-1),roomEnd=encounterIndex===undefined?-1:Math.min(this.sectionCount-1,section+1);
  for(let room=0;room<this.sectionCount;room++){
   const active=encounterIndex!==undefined&&Math.abs(room-section)<=1,transition=trapRoomTransition(this.roomActive[room],active);
   if(transition==='exit')this.suspendRoom(room,now,factor);
   else if(transition==='enter')this.enterRoom(room,now);
   this.roomActive[room]=active;
  }
  if(resumed)this.restartTells(section,p.center.y,now);
  let encounterWindDirection:-1|1|undefined,encounterWindStrength=0;
  const activeEncounter=encounterIndex===undefined?undefined:encounterFor(this.kind,encounterIndex);if(activeEncounter?.wind){encounterWindDirection=activeEncounter.wind.direction;encounterWindStrength=activeEncounter.wind.strength;}
  if(encounterWindDirection!==undefined){
   const receivesWind=canReceiveWind(true,this.player.grounded,this.player.isDashing,this.player.usingUltimate);
   this.windDriftX=advanceWindDrift(this.windDriftX,encounterWindDirection,encounterWindStrength*.45,stepMs/1000,receivesWind,85);
   p.velocity.x=addWindDrift(p.velocity.x,this.windDriftX,receivesWind);
  }else{if(this.windDriftX!==0)p.velocity.x-=this.windDriftX;this.windDriftX=0;}
  for(let i=roomStart;i<=roomEnd;i++){
   const texts=this.effects.get(i);if(texts)for(const cue of texts)cue.setAlpha(i===section&&Math.abs(cue.y-p.center.y)<ACTIVE_Y?.85:.16);
   const specials=this.specials.get(i);if(specials)for(const special of specials)this.updateSpecial(special,now,p,section);
   const presses=this.presses.get(i);if(presses)for(const press of presses)this.updatePress(press,now,p,section,factor,resumed);
   const crumbles=this.crumbles.get(i);if(crumbles)for(const crumble of crumbles)this.updateCrumble(crumble,now,p,section,resumed);
  }
  this.updateWindVisuals(now,p,encounterWindDirection,roomStart,roomEnd);
  this.updateDust(now,p,section,roomStart,roomEnd);
 }
 private inWindow(section:number,x:number,y:number,playerSection:number,playerY:number):boolean{return Math.abs(section-playerSection)<=1&&Math.abs(x-this.player.body.center.x)<=ACTIVE_X&&Math.abs(y-playerY)<=ACTIVE_Y;}
 private updateSpecial(special:Special,now:number,p:Phaser.Physics.Arcade.Body,playerSection:number):void {
  const {shape,art,ledge}=special.surface,body=shape.body as Phaser.Physics.Arcade.StaticBody,baseTop=special.y-16;
  if(!this.inWindow(special.section,special.x,special.y,playerSection,p.center.y)){special.visible=false;return;}
  const overlaps=p.right>body.left&&p.left<body.right&&p.bottom>body.top&&p.top<body.bottom;
  special.justRevealed=!special.visible;special.visible=true;
  if(special.justRevealed){
   if(special.type==='shutters')this.resetShutter(special,now,overlaps);
   else if(special.type==='ferry'||special.type==='lift'){
    const displacement=special.type==='ferry'?shape.x-special.x:shape.y-special.y;
    special.phase=Math.asin(Phaser.Math.Clamp(displacement/65,-1,1))-now/950;
   }
  }
  if(special.type==='shutters'){
   if(special.holdSolid){
    if(!overlaps){body.enable=true;special.holdSolid=false;special.cycleStart=now;}
    else body.enable=false;
    art.setPosition(special.x,baseTop+(overlaps?16:0)).setAlpha(overlaps?.15:1);
    return;
   }
   const elapsed=((now-special.cycleStart)%3000+3000)%3000,closing=elapsed<2100;
   if(closing){if(!body.enable&&shutterCanClose(overlaps))body.enable=true;}
   else body.enable=false;
   const openProgress=closing?0:(elapsed-2100)/900;
   art.setPosition(special.x,baseTop+openProgress*23).setAlpha(closing?(elapsed>1600?.68+Math.sin(now*.035)*.25:1):Math.max(.12,1-openProgress*.88));
   return;
  }
  if(special.type==='conveyor'){
   const standing=body.enable&&this.player.grounded&&Math.abs(p.bottom-body.top)<10&&p.right>body.left&&p.left<body.right;
   const dx=special.direction*special.strength*qualityTrapDeltaMs(this.scene.game.loop.delta,true)/1000;
   if(standing&&!this.player.usingUltimate){p.position.x+=dx;p.prev.x+=dx;this.player.sprite.x+=dx;}
   return;
  }
  const wave=Math.sin(now/950+special.phase),nx=special.x+(special.type==='ferry'?wave*65:0),ny=special.y+(special.type==='lift'?wave*65:0),dx=nx-shape.x,dy=ny-shape.y;
  shape.setPosition(nx,ny);body.updateFromGameObject();art.setPosition(nx,ny-16);ledge.x=nx;ledge.y=ny;
  const standing=body.enable&&this.player.grounded&&Math.abs(p.bottom-body.top)<10&&p.right>body.left&&p.left<body.right;
  if(standing&&!special.justRevealed&&!this.player.usingUltimate){p.position.x+=dx;p.position.y+=dy;p.prev.x+=dx;p.prev.y+=dy;this.player.sprite.x+=dx;this.player.sprite.y+=dy;}
 }
 private resetShutter(special:Special,now:number,overlaps:boolean):void {
  const body=special.surface.shape.body as Phaser.Physics.Arcade.StaticBody;
  const restarted=specialPhaseAfterGap('shutters',overlaps);
  special.cycleStart=now;special.holdSolid=!restarted.solid;body.enable=restarted.solid;
  special.surface.art.setPosition(special.x,special.y-16+(overlaps?16:0)).setAlpha(overlaps?.15:1);
 }
 private updatePress(press:Press,now:number,p:Phaser.Physics.Arcade.Body,playerSection:number,factor:number,resumed:boolean):void {
  const near=this.inWindow(press.section,press.x,press.ground,playerSection,p.center.y);
  if(resumed){press.phase=pressPhaseAfterGap(press.phase);press.at=now;press.hit=false;press.warning.clear();press.art.setVisible(false).setPosition(press.x,press.ground-480);}
  if(!near){press.phase='idle';press.at=now+trapIdleCadenceMs(factor);press.hit=false;press.warning.clear();press.art.setVisible(false).setPosition(press.x,press.ground-480);return;}
  if(press.phase==='idle'&&pressStartsWarning(press.phase,now,press.at)){press.phase='warn';press.at=now+QUALITY_TRAP_WARNING_MS;press.hit=false;press.art.setVisible(true).setPosition(press.x,press.ground-480);}
  press.warning.clear();
  if(press.phase==='warn'){
   const elapsed=QUALITY_TRAP_WARNING_MS-(press.at-now);press.art.setX(press.x+Math.sin(elapsed*.075)*3);
   press.warning.lineStyle(2,0xff5046,.8);
   for(let y=press.ground-520;y<press.ground;y+=18)press.warning.lineBetween(press.x,y,press.x,y+7);
   press.warning.lineStyle(3,0xff5046).lineBetween(press.x-35,press.ground,press.x+35,press.ground);
   if(pressCanFall(press.phase,now,press.at)){press.phase='fall';press.at=now;press.art.setX(press.x);}
  }
  if(press.phase==='fall'){
   const elapsed=now-press.at,progress=Math.min(1,elapsed/240),ease=progress*progress,impactY=pressImpactCenterY(press.ground);
   press.art.setVisible(true).setY(Phaser.Math.Linear(press.ground-480,impactY,ease));
   press.zone.top=press.art.y-QUALITY_PRESS_HALF_HEIGHT;press.zone.bottom=press.art.y+QUALITY_PRESS_HALF_HEIGHT;
   if(!press.hit)showHitbox(this.scene,'danger',press.zone);
   if(!press.hit&&rectsOverlap(p,press.zone))press.hit=this.player.takeDamage(press.x,2);
   if(elapsed>=240){press.phase='impact';press.at=now;this.emitDust(press.x,press.ground,1,press.section);}
  }else if(press.phase==='impact'){
   const impactY=pressImpactCenterY(press.ground);press.art.setPosition(press.x,impactY);press.zone.top=press.art.y-QUALITY_PRESS_HALF_HEIGHT;press.zone.bottom=press.art.y+QUALITY_PRESS_HALF_HEIGHT;
   if(!press.hit)showHitbox(this.scene,'danger',press.zone);
   if(!press.hit&&rectsOverlap(p,press.zone))press.hit=this.player.takeDamage(press.x,2);
   if(now-press.at>=500){press.phase='return';press.at=now;}
  }else if(press.phase==='return'){
   const t=Math.min(1,(now-press.at)/650),ease=t*t*(3-2*t),impactY=pressImpactCenterY(press.ground);press.art.setPosition(press.x,Phaser.Math.Linear(impactY,press.ground-480,ease));
   if(t>=1){press.phase='idle';press.art.setVisible(false);press.at=now+trapIdleCadenceMs(factor);}
  }
 }
 private updateCrumble(crumble:Crumble,now:number,p:Phaser.Physics.Arcade.Body,playerSection:number,resumed:boolean):void {
  const {shape,art,ledge}=crumble.surface,body=shape.body as Phaser.Physics.Arcade.StaticBody,top=crumble.baseY-16,near=this.inWindow(crumble.section,crumble.baseX,top,playerSection,p.center.y);
  if(resumed&&crumble.phase==='warn'){crumble.phase=crumblePhaseAfterGap(crumble.phase);crumble.at=now;art.clearTint().setAlpha(1).setPosition(crumble.baseX,top);}
  if(!near){if(crumble.visible&&crumble.phase==='warn'){crumble.phase='idle';crumble.at=0;art.clearTint().setAlpha(1).setPosition(crumble.baseX,top);}crumble.visible=false;return;}
  crumble.visible=true;
  const over=p.right>crumble.baseX-ledge.width/2&&p.left<crumble.baseX+ledge.width/2;
  if(crumble.phase==='idle'&&over&&Math.abs(p.bottom-top)<9&&this.player.grounded){crumble.phase='warn';crumble.at=now+QUALITY_TRAP_WARNING_MS;}
  if(crumble.phase==='warn'){
   art.setTint(0xd8aa78).setAlpha(.78+.22*Math.sin((QUALITY_TRAP_WARNING_MS-(crumble.at-now))*.06)).setPosition(crumble.baseX+Math.sin(now*.05)*2,top);
   if(now>=crumble.at){crumble.phase='drop';crumble.at=now;body.enable=false;this.emitDust(crumble.baseX,top,1,crumble.section);}
  }
  if(crumble.phase==='drop'){
   const t=Math.min(1,(now-crumble.at)/300),drop=48*t*t;
   shape.setPosition(crumble.baseX,crumble.baseY+drop);body.updateFromGameObject();art.setPosition(crumble.baseX,top+drop);ledge.x=crumble.baseX;ledge.y=crumble.baseY+drop;
   if(t>=1){crumble.phase='broken';crumble.brokenAt=now;}
  }else if(crumble.phase==='broken'){
   if(now-crumble.brokenAt>=900&&!this.overlapsRestoredCrumble(p,crumble.baseX,crumble.baseY,ledge.width)){
    shape.setPosition(crumble.baseX,crumble.baseY);body.updateFromGameObject();body.enable=true;art.setPosition(crumble.baseX,top).clearTint().setAlpha(1);ledge.x=crumble.baseX;ledge.y=crumble.baseY;crumble.phase='idle';crumble.at=0;
   }
  }
 }
 private overlapsRestoredCrumble(p:Phaser.Physics.Arcade.Body,x:number,y:number,width:number):boolean{return p.right>x-width/2&&p.left<x+width/2&&p.bottom>y-16&&p.top<y+16;}
 private updateWindVisuals(now:number,p:Phaser.Physics.Arcade.Body,direction:-1|1|undefined,roomStart:number,roomEnd:number):void {
  const ambient=direction!==undefined&&!this.reducedMotion?.matches;
  for(let i=0;i<8;i++){
   const image=this.windStreaks[i];if(!ambient){image.setVisible(false);continue;}
   let wrap=((now*.16*direction+i*177+720)%1440+1440)%1440-720;
   image.setVisible(true).setPosition(p.center.x+wrap,p.center.y+((i%4)-1.5)*53).setFlipX(direction<0).setAlpha(.36+(i%3)*.11);
  }
  let arrowSlot=8;
  for(let i=roomStart;i<=roomEnd;i++){
   const list=this.specials.get(i);if(!list)continue;
   for(const special of list){if(special.type!=='conveyor'||arrowSlot>=WIND_POOL_SIZE)continue;
    const image=this.windStreaks[arrowSlot++],body=special.surface.shape.body as Phaser.Physics.Arcade.StaticBody;
    const active=this.inWindow(i,special.x,special.y,Math.floor(p.center.x/SECTION_WIDTH),p.center.y);
    image.setVisible(active).setPosition(special.x,body.top+8).setFlipX(special.direction<0).setAlpha(active?.58:0);
   }
  }
  while(arrowSlot<WIND_POOL_SIZE)this.windStreaks[arrowSlot++].setVisible(false);
 }
 private emitDust(x:number,y:number,scale:number,section:number):void {
  let fx:DustFx|undefined;
  for(let i=0;i<DUST_POOL_SIZE;i++){const candidate=this.dust[(this.lastDust+i)%DUST_POOL_SIZE];if(!candidate.active){fx=candidate;this.lastDust=(this.lastDust+i+1)%DUST_POOL_SIZE;break;}}
  if(!fx){fx=this.dust[this.lastDust];this.lastDust=(this.lastDust+1)%DUST_POOL_SIZE;}
  fx.active=true;fx.started=this.clockMs;fx.x=x;fx.y=y;fx.section=section;fx.duration=460;fx.scale=scale;fx.image.setPosition(x,y).setScale(trapDustScale(fx.baseScaleX,scale),trapDustScale(fx.baseScaleY,scale)).setAlpha(1).setVisible(true);
 }
 private updateDust(now:number,p:Phaser.Physics.Arcade.Body,section:number,roomStart:number,roomEnd:number):void {
  for(const fx of this.dust){if(!fx.active)continue;
   if(now-fx.started>=fx.duration){fx.active=false;fx.image.setVisible(false);continue;}
   if(roomStart>roomEnd||fx.section<roomStart||fx.section>roomEnd||Math.abs(fx.x-p.center.x)>ACTIVE_X||Math.abs(fx.y-p.center.y)>ACTIVE_Y||Math.abs(fx.section-section)>1){fx.image.setVisible(false);continue;}
   const t=(now-fx.started)/fx.duration,multiplier=fx.scale*(.8+t*.45);fx.image.setVisible(true).setPosition(fx.x,fx.y-t*30).setScale(trapDustScale(fx.baseScaleX,multiplier),trapDustScale(fx.baseScaleY,multiplier)).setAlpha(1-t);
  }
 }
 private restartTells(section:number,playerY:number,now:number):void {
  for(const [room,list] of this.presses)for(const press of list){
   if(Math.abs(room-section)>1||Math.abs(press.ground-playerY)>ACTIVE_Y)continue;
   press.phase=pressPhaseAfterGap(press.phase);press.at=now;press.hit=false;press.warning.clear();press.art.setVisible(false).setPosition(press.x,press.ground-480);
  }
  for(const list of this.specials.values())for(const special of list)if(special.type==='shutters'){
   if(Math.abs(special.section-section)>1||Math.abs(special.y-playerY)>ACTIVE_Y)continue;
   const body=special.surface.shape.body as Phaser.Physics.Arcade.StaticBody,p=this.player.body,overlaps=p.right>body.left&&p.left<body.right&&p.bottom>body.top&&p.top<body.bottom;
   this.resetShutter(special,now,overlaps);special.visible=true;
  }
  for(const [room,list] of this.crumbles)for(const crumble of list)if(Math.abs(room-section)<=1&&Math.abs(crumble.baseY-playerY)<=ACTIVE_Y&&crumble.phase==='warn'){
   crumble.phase=crumblePhaseAfterGap(crumble.phase);crumble.at=now;crumble.surface.art.clearTint().setAlpha(1).setPosition(crumble.baseX,crumble.baseY-16);
  }
  this.windDriftX=0;
 }
 private suspendRoom(section:number,now:number,factor:number):void {
  const texts=this.effects.get(section);if(texts)for(const cue of texts)cue.setAlpha(.16);
  const presses=this.presses.get(section);if(presses)for(const press of presses){press.phase='idle';press.at=now+trapIdleCadenceMs(factor);press.hit=false;press.warning.clear();press.art.setVisible(false).setPosition(press.x,press.ground-480);}
  const specials=this.specials.get(section);if(specials)for(const special of specials)special.visible=false;
  const crumbles=this.crumbles.get(section);if(crumbles)for(const crumble of crumbles){
   crumble.visible=false;
   if(crumble.phase==='warn'){crumble.phase=crumblePhaseAfterGap(crumble.phase);crumble.at=0;crumble.surface.art.clearTint().setAlpha(1).setPosition(crumble.baseX,crumble.baseY-16);}
  }
 }
 private enterRoom(section:number,now:number):void {
  const presses=this.presses.get(section);if(presses)for(const press of presses){press.phase='idle';press.at=now;press.hit=false;press.warning.clear();press.art.setVisible(false).setPosition(press.x,press.ground-480);}
  const specials=this.specials.get(section);if(specials)for(const special of specials)special.visible=false;
  const crumbles=this.crumbles.get(section);if(crumbles)for(const crumble of crumbles){crumble.visible=false;if(crumble.phase==='warn'){crumble.phase='idle';crumble.at=0;crumble.surface.art.clearTint().setAlpha(1).setPosition(crumble.baseX,crumble.baseY-16);}}
 }
}
