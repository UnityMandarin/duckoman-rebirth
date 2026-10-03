import Phaser from 'phaser';
import type {Player} from '../entities/Player';
import {createUltimateSwordVisual,setSwordMeterCharge,SWORD_METER} from './SwordMeterArt';
import {renderScale} from './renderScale';
import {bladeAt,bladeCircles,bladeContainerAngle,SWING,SWING_END,SWING_START,slashFrameAt,UltimateStrike} from './ultimateSwingMath';
import {showHitbox} from './DebugHitboxes';

const SWORD_LENGTH=244;
/** Keeps the HUD sword's proportions so the swung blade reads as the same artwork. */
const SWORD_HEIGHT=SWORD_LENGTH*SWORD_METER.frameHeight/SWORD_METER.frameWidth;
const HUD_SWORD_WIDTH=220;
/** The hilt pivot sits at 90% of the frame width, so this is how far the tip travels from the hand. */
const REACH=SWORD_LENGTH*.9;
/** Half the blade's drawn width, rounded up so the edge of the art still connects. */
const BLADE_HIT_RADIUS=22;
const SLASH_KEY='ultimate-slash',SPARKLE_KEY='ultimate-sparkle';
/** Slash frames are drawn at half world size and scaled up; the glow hides the softness. */
const TEX_SCALE=2,TEX_R=REACH/TEX_SCALE,TEX_THICK=80/TEX_SCALE,TEX_PAD=18,COLS=4;
const DEG=Math.PI/180;
/** Cell bounds for an arc that starts above level and ends below it, always in front (so it crosses 0°). */
const ARC_LEFT=Math.min(0,Math.cos(SWING_START*DEG))*TEX_R,ARC_TOP=Math.sin(SWING_START*DEG)*TEX_R,ARC_BOTTOM=Math.sin(SWING_END*DEG)*TEX_R;
const CELL_W=Math.ceil(TEX_R-ARC_LEFT+TEX_PAD*2),CELL_H=Math.ceil(ARC_BOTTOM-ARC_TOP+TEX_PAD*2);
const CENTER_X=TEX_PAD-ARC_LEFT,CENTER_Y=TEX_PAD-ARC_TOP;

function crescent(ctx:CanvasRenderingContext2D,from:number,to:number,thick:number):void {
  const steps=36;
  ctx.beginPath();
  for(let i=0;i<=steps;i++){const a=(from+(to-from)*i/steps)*DEG;ctx.lineTo(CENTER_X+Math.cos(a)*TEX_R,CENTER_Y+Math.sin(a)*TEX_R);}
  // Thin at the tail, full at the head that rides the blade tip.
  for(let i=steps;i>=0;i--){const t=i/steps,a=(from+(to-from)*t)*DEG,r=TEX_R-thick*t**1.4;ctx.lineTo(CENTER_X+Math.cos(a)*r,CENTER_Y+Math.sin(a)*r);}
  ctx.closePath();ctx.fill();
}

function ensureTextures(scene:Phaser.Scene):void {
  if(!scene.textures.exists(SLASH_KEY)) {
    const rows=Math.ceil(SWING.frames/COLS);
    const tex=scene.textures.createCanvas(SLASH_KEY,CELL_W*COLS,CELL_H*rows)!;
    const ctx=tex.getContext();
    for(let i=0;i<SWING.frames;i++) {
      const {tail,head,thickness,alpha}=slashFrameAt(i);
      const x=(i%COLS)*CELL_W,y=Math.floor(i/COLS)*CELL_H;
      ctx.save();ctx.beginPath();ctx.rect(x,y,CELL_W,CELL_H);ctx.clip();ctx.translate(x,y);
      const thick=TEX_THICK*thickness;
      ctx.shadowColor=`rgba(255,170,40,${alpha})`;ctx.shadowBlur=16;
      ctx.fillStyle=`rgba(255,190,64,${alpha*.7})`;crescent(ctx,tail,head,thick);
      ctx.shadowBlur=8;
      ctx.fillStyle=`rgba(255,228,150,${alpha*.9})`;crescent(ctx,tail,head,thick*.6);
      ctx.shadowColor=`rgba(255,255,255,${alpha})`;ctx.shadowBlur=6;
      ctx.fillStyle=`rgba(255,255,255,${alpha})`;crescent(ctx,tail,head,thick*.26);
      const h=head*DEG,r=TEX_R-thick*.3;
      ctx.beginPath();ctx.arc(CENTER_X+Math.cos(h)*r,CENTER_Y+Math.sin(h)*r,thick*.3*alpha,0,Math.PI*2);ctx.fill();
      ctx.restore();
      tex.add(i,0,x,y,CELL_W,CELL_H);
    }
    tex.refresh();
  }
  if(!scene.textures.exists(SPARKLE_KEY)) {
    const size=32,tex=scene.textures.createCanvas(SPARKLE_KEY,size,size)!,ctx=tex.getContext(),c=size/2;
    ctx.shadowColor='rgba(255,196,80,1)';ctx.shadowBlur=6;ctx.fillStyle='#fffbea';
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:c-5;ctx.lineTo(c+Math.cos(a)*r,c+Math.sin(a)*r);}
    ctx.closePath();ctx.fill();
    tex.refresh();
  }
}

/** Lift 260 + wind-up 110 + swing 220 + hold 80 + throw back 280, with a little slack before play resumes. */
const DURATION=1000;
const THROW_HOLD=80,THROW_MS=280;

export interface HudSword {frame:Phaser.GameObjects.Image;fill:Phaser.GameObjects.Image;}

/**
 * Super freeze: physics stops and the scene skips its update while `player.usingUltimate`,
 * so only the swing's own tweens run. Everything but Duckoman and the swing sits under a dim.
 */
function superFreeze(scene:Phaser.Scene,p:Player):void {
  const cam=scene.cameras.main;
  // World-space so the HUD camera's scroll-factor-0 layer doesn't draw it over the sword.
  const dim=scene.add.rectangle(cam.midPoint.x,cam.midPoint.y,cam.width/cam.zoom*3,cam.height/cam.zoom*3,0x000000,.5).setDepth(43);
  const depth=p.visual.depth;
  p.visual.setDepth(43.5);
  scene.physics.world.pause();
  scene.time.delayedCall(DURATION,()=>{dim.destroy();p.visual.setDepth(depth);scene.physics.world.resume();});
}

/**
 * Spends the ultimate: the HUD sword flies to Duckoman's hand at full size and cuts a white-gold arc overhead.
 * The meter is emptied and hidden while its sword is out, then reappears when Duckoman throws the sword back to it.
 */
export function playUltimateSwing(scene:Phaser.Scene,p:Player,hud?:HudSword):void {
  ensureTextures(scene);
  if(hud){setSwordMeterCharge(hud.fill,0);hud.frame.setAlpha(0);hud.fill.setAlpha(0);}
  p.ultimateCharge=0;p.ultimateUntil=scene.time.now+DURATION;
  superFreeze(scene,p);
  p.abilities.setSprint(false);
  p.abilities.cancelTransient();p.body.setVelocity(0,0).setAllowGravity(false);
  const face=p.facing,hand={x:p.sprite.x+face*10,y:p.sprite.y-8};
  const start=scene.cameras.main.getWorldPoint(215*renderScale(),42*renderScale());
  const sword=createUltimateSwordVisual(scene,start.x,start.y,SWORD_LENGTH,SWORD_HEIGHT).setScale(HUD_SWORD_WIDTH/SWORD_LENGTH);
  const slash=scene.add.image(hand.x,hand.y,SLASH_KEY,0).setOrigin(CENTER_X/CELL_W,CENTER_Y/CELL_H)
    .setScale(face*TEX_SCALE,TEX_SCALE).setBlendMode(Phaser.BlendModes.ADD).setDepth(44).setVisible(false);
  scene.tweens.add({targets:sword,x:hand.x,y:hand.y,scaleX:face,scaleY:1,angle:bladeContainerAngle(face,SWING_START+20),duration:260,ease:'Cubic.InOut',onComplete:()=>{
    scene.tweens.add({targets:sword,angle:bladeContainerAngle(face,SWING_START),duration:110,ease:'Sine.easeOut',onComplete:()=>swing(scene,p,sword,slash,face,hand,hud)});
  }});
  scene.time.delayedCall(DURATION,()=>{
    if(sword.active){sword.destroy();showHudSword(hud);}
    slash.destroy();p.body.setAllowGravity(true);
  });
}

function showHudSword(hud?:HudSword):void {
  if(hud){hud.frame.setAlpha(1);hud.fill.setAlpha(1);}
}

/** Spins the sword back up to the meter, shrinking to HUD size, and hands it back to the HUD on arrival. */
function throwBack(scene:Phaser.Scene,sword:Phaser.GameObjects.Container,face:number,hud?:HudSword):void {
  const home=scene.cameras.main.getWorldPoint(215*renderScale(),42*renderScale()),size=HUD_SWORD_WIDTH/SWORD_LENGTH;
  let lastGhost=-1000;
  scene.tweens.add({targets:sword,x:home.x,y:home.y,scaleX:size,scaleY:size,angle:face*720,duration:THROW_MS,ease:'Quad.easeInOut',
    onUpdate:()=>{if(scene.time.now-lastGhost>=30){lastGhost=scene.time.now;bladeGhost(scene,sword);}},
    onComplete:()=>{sword.destroy();showHudSword(hud);}});
}

function swing(scene:Phaser.Scene,p:Player,sword:Phaser.GameObjects.Container,slash:Phaser.GameObjects.Image,face:number,hand:{x:number;y:number},hud?:HudSword):void {
  let flashed=false,lastGhost=-1000;
  const strike=new UltimateStrike(p,hand,face,REACH,BLADE_HIT_RADIUS);
  slash.setVisible(true);
  scene.tweens.addCounter({from:0,to:1,duration:220,ease:'Cubic.easeOut',
    onUpdate:tween=>{
      const t=tween.getValue()??0,blade=bladeAt(t);
      sword.setAngle(bladeContainerAngle(face,blade));
      if(slash.active)slash.setFrame(Math.min(SWING.sweepFrames-1,Math.floor(t*SWING.sweepFrames)));
      if(scene.time.now-lastGhost>=24){lastGhost=scene.time.now;bladeGhost(scene,sword);}
      strike.sweepTo(blade);
      scene.events.emit('ultimate-strike',strike);
      for(const circle of bladeCircles(hand,face,blade,REACH,BLADE_HIT_RADIUS))showHitbox(scene,'attack',circle);
      if(!flashed&&t>=.35){flashed=true;scene.cameras.main.flash(110,255,242,205).shake(170,.006);}
    },
    onComplete:()=>{
      sparkles(scene,hand,face);
      for(let i=0;i<SWING.frames-SWING.sweepFrames;i++)scene.time.delayedCall(i*40,()=>{if(slash.active)slash.setFrame(SWING.sweepFrames+i);});
      scene.time.delayedCall((SWING.frames-SWING.sweepFrames)*40,()=>{if(slash.active)slash.setVisible(false);});
      scene.time.delayedCall(THROW_HOLD,()=>{if(sword.active)throwBack(scene,sword,face,hud);});
    }});
}

/** A white-gold silhouette of the blade left behind on its path, matching the sword's current size and mirroring. */
function bladeGhost(scene:Phaser.Scene,sword:Phaser.GameObjects.Container):void {
  const ghost=scene.add.image(sword.x,sword.y,'ultimate-sword-frame').setOrigin(.9,.5).setDisplaySize(SWORD_LENGTH,SWORD_HEIGHT)
    .setAngle(sword.angle).setTint(0xfff0c4).setTintMode(Phaser.TintModes.FILL).setBlendMode(Phaser.BlendModes.ADD).setAlpha(.45).setDepth(44.5);
  ghost.setScale(ghost.scaleX*sword.scaleX,ghost.scaleY*sword.scaleY);
  scene.tweens.add({targets:ghost,alpha:0,duration:170,onComplete:()=>ghost.destroy()});
}

function sparkles(scene:Phaser.Scene,hand:{x:number;y:number},face:number):void {
  for(let i=0;i<16;i++) {
    const blade=Phaser.Math.Linear(SWING_START,SWING_END,Math.random())*DEG,r=REACH*Phaser.Math.FloatBetween(.55,1);
    const x=hand.x+face*Math.cos(blade)*r,y=hand.y+Math.sin(blade)*r;
    const s=scene.add.image(x,y,SPARKLE_KEY).setBlendMode(Phaser.BlendModes.ADD).setDepth(46).setScale(Phaser.Math.FloatBetween(.6,1.4)).setAngle(Math.random()*90);
    scene.tweens.add({targets:s,x:x+face*Math.cos(blade)*40,y:y+Math.sin(blade)*40-20,angle:s.angle+90,alpha:0,scale:0,
      duration:Phaser.Math.Between(260,420),ease:'Cubic.easeOut',onComplete:()=>s.destroy()});
  }
}
