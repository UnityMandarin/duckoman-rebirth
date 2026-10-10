import type Phaser from 'phaser';
import type { InputSnapshot } from './InputController';
import { FRANKLIN_RULES, type FranklinController } from './FranklinFireFoxRules';

export type FranklinPose = 'idle'|'crouch'|'lunge'|'spit'|'tail-windup'|'tail-sweep'|'cast'|'hurt'|'resist'|'exhausted'|'friendly'|'landing';
export type FranklinBeat = 'intro'|'overdrive'|'resistance'|'tail'|'barrage'|'crash'|'safe-chip'|'rescued';
type Anchor = readonly [number, number];
interface PoseFrame { texture:string; x:number; y:number; width:number; height:number; chip:Anchor; eye:Anchor; mouth:Anchor; tail:Anchor; backPaw:Anchor;frontPaw:Anchor; }
const combat = 'franklin-combat-poses', story = 'franklin-story-poses';
function frame(texture:string, cell:number, rect:readonly number[], chip:Anchor, eye:Anchor, mouth:Anchor, tail:Anchor):PoseFrame {
  return {texture,x:cell%3*512+rect[0],y:Math.floor(cell/3)*512+rect[1],width:rect[2]-rect[0],height:rect[3]-rect[1],chip,eye,mouth,tail,backPaw:[.40,.97],frontPaw:[.84,.97]};
}
// Eye anchors measured from the painted eye pixels; hardware stays behind the ear, clear of the face.
export const FRANKLIN_POSES:Readonly<Record<FranklinPose,PoseFrame>> = {
 idle:frame(combat,0,[45,133,448,429],[.56,.26],[.855,.287],[.96,.37],[.13,.76]),
 crouch:frame(combat,1,[43,228,465,437],[.64,.34],[.863,.431],[.97,.58],[.13,.54]),
 lunge:frame(combat,2,[46,151,480,398],[.62,.23],[.862,.382],[.98,.52],[.17,.23]),
 spit:frame(combat,3,[40,123,472,408],[.61,.27],[.840,.136],[.94,.38],[.18,.68]),
 'tail-windup':frame(combat,4,[62,96,472,414],[.66,.37],[.817,.349],[.97,.46],[.20,.28]),
 'tail-sweep':frame(combat,5,[111,104,476,411],[.45,.25],[.653,.336],[.91,.56],[.71,.75]),
 cast:frame(story,0,[74,96,483,466],[.35,.29],[.679,.187],[.96,.31],[.20,.74]),
 hurt:frame(story,1,[78,136,461,455],[.36,.26],[.608,.238],[.97,.30],[.20,.67]),
 resist:frame(story,2,[41,171,467,465],[.60,.33],[.810,.366],[.98,.52],[.20,.25]),
 exhausted:frame(story,3,[44,173,505,382],[.56,.52],[.771,.655],[.97,.79],[.13,.62]),
 friendly:frame(story,4,[89,67,473,382],[.55,.27],[.784,.311],[.98,.42],[.18,.72]),
 landing:frame(story,5,[70,62,481,393],[.56,.45],[.792,.660],[.97,.60],[.25,.22]),
};
FRANKLIN_POSES.lunge.backPaw=[.22,.80];FRANKLIN_POSES.lunge.frontPaw=[.90,.72];
FRANKLIN_POSES.cast.backPaw=[.78,.96];FRANKLIN_POSES.cast.frontPaw=[.55,.92];
FRANKLIN_POSES.hurt.backPaw=[.72,.94];FRANKLIN_POSES.hurt.frontPaw=[.44,.94];

export function registerFranklinFrames(scene:Phaser.Scene):void {
 for(const [name,f] of Object.entries(FRANKLIN_POSES)) {
  const texture=scene.textures.get(f.texture); if(!texture.has(name))texture.add(name,0,f.x,f.y,f.width,f.height);
 }
 const scope=scene.textures.get('franklin-eye-scope');
 if(!scope.has('beam'))scope.add('beam',0,200,286,1640,140);
 if(!scope.has('emitter'))scope.add('emitter',0,25,261,190,190);
 if(!scope.has('reticle'))scope.add('reticle',0,1830,196,340,320);
 const texture=scene.textures.get('franklin-control-chip');
 for(let i=0;i<6;i++)if(!texture.has(`fragment-${i}`))texture.add(`fragment-${i}`,0,42+(i%3)*346,86+Math.floor(i/3)*586,346,586);
}
export function parseFranklinBeat(value:string|null|undefined, gate:{local:boolean;devPreview:boolean;bossPreview:boolean}):FranklinBeat|undefined {
 return gate.local&&gate.devPreview&&gate.bossPreview&&['intro','overdrive','resistance','tail','barrage','crash','safe-chip','rescued'].includes(value??'')?value as FranklinBeat:undefined;
}
/** Read input before calling this: held edges are consumed while gravity and stomp bounce stay intact. */
export function maskFranklinInput(input:InputSnapshot):void {
 input.horizontal=0;input.down=false;input.downPressed=false;input.dashPressed=false;input.sprintPressed=false;input.sprintHeld=false;input.jumpPressed=false;input.jumpReleased=false;input.ultimatePressed=false;input.throwPressed=false;input.godModePressed=false;input.anyResetInput=false;
}
export interface FranklinActing {pose:FranklinPose;sx:number;sy:number;rotation:number;offsetX:number;offsetY:number;eye:number;core:number;arc:number;fire:number;heart:number;mouthFlash:number;}
export function createFranklinActing():FranklinActing {return {pose:'friendly',sx:1,sy:1,rotation:0,offsetX:0,offsetY:0,eye:0,core:0,arc:0,fire:0,heart:0,mouthFlash:0};}
const flinchExcluded = new Set(['intro','overdrive','collapse','crash','safe-chip','rescued']);
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const franklinEase=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** Writes into one reusable sample; presentation never changes combat coordinates or clocks. */
export function sampleFranklinPresentation(c:FranklinController,clock:number,hurtMs:number,rescueMs:number,out:FranklinActing):void {
 const p=c.phase,t=p==='intro'?franklinIntroTime(c.elapsed):c.elapsed;
 out.pose='idle';out.sx=1;out.sy=1+Math.sin(clock*.003)*.015;out.rotation=0;out.offsetX=0;out.offsetY=0;out.eye=1;out.core=.8;out.arc=0;out.fire=c.phase2?.65:.25;out.heart=0;out.mouthFlash=0;
 if(p==='intro') {
  out.eye=0;out.core=0;out.fire=0;
  if(t<900){out.pose='friendly';out.heart=Math.sin(Math.PI*t/900);}
  else if(t<1800){out.pose=t<1450?'idle':'hurt';out.core=franklinEase((t-900)/600);out.eye=franklinEase((t-1400)/400);out.arc=out.core;}
  else if(t<2900){out.pose=t<2100?'hurt':'resist';out.core=1;out.eye=1;out.arc=.8;out.offsetX=Math.sin(t*.05)*2;out.rotation=Math.sin(t*.035)*.035;}
  else if(t<3900){out.pose=t<3400?'crouch':'cast';out.core=1;out.eye=1;out.fire=franklinEase((t-2900)/500);out.arc=.6;}
  else{out.pose='idle';out.core=1;out.eye=1;out.fire=.35;}
 } else if(p==='overdrive') {
  out.pose=t<250?'hurt':t<800?'resist':t<1050?'cast':'crouch';out.core=1;out.fire=.9;out.arc=.9;out.offsetX=Math.sin(t*.055)*2.5;out.rotation=Math.sin(t*.035)*.04;
 } else if(p==='pounce-cue'||p==='final-cue'||p==='wallbounce-cue') {
  out.pose='crouch';const length=p==='final-cue'?1000:p==='wallbounce-cue'?650:c.phase2?650:800;
  const ease=franklinEase(t/length);out.sx=1+.05*ease;out.sy=1-.08*ease;out.fire=.4+.5*ease;out.arc=p==='final-cue'?.8:.15;
 } else if(p==='pounce') {
  out.pose=t<500?'lunge':'landing';out.rotation=t<120?-.05*franklinEase(t/120):0;out.sy=t>=500?1-.07*(1-franklinEase((t-500)/150)):1;out.fire=.8;
 } else if(p==='wallbounce'||p==='final-charge'){out.pose='lunge';out.fire=1;out.arc=p==='final-charge'?.8:0;out.sy=1+Math.sin(t*.035)*.035;}
 else if(p==='barrage-cue'){out.pose=t<160?'landing':Math.floor((t-160)/160)%2?'crouch':'idle';out.rotation=Math.sin(t*.02)*.025;}
 else if(p==='barrage'){const shot=t%300;out.pose=shot<145?'spit':shot<210?'hurt':'idle';out.mouthFlash=shot<65?1-shot/65:0;out.rotation=shot<145?-.035:0;}
 else if(p==='tail-cue'){out.pose=t<(c.phase2?750:900)/2?'tail-windup':'tail-sweep';out.fire=.5+.5*franklinEase(t/(c.phase2?750:900));out.rotation=Math.sin(t*.006)*.035;}
 else if(p==='tail'){out.pose=t<150?'tail-windup':t<340?'tail-sweep':'idle';out.fire=t<340?1:.4;}
 else if(p==='pillars-cue'||p==='pillars'){out.pose='cast';out.sy=1+.035*Math.sin(Math.min(t,500)*.006);out.fire=.7;out.offsetY=p==='pillars'?-3*(1-franklinEase(t/180)):0;}
 else if(p==='resistance'){out.pose='resist';out.offsetX=Math.sin(t*.045)*2.6;out.rotation=Math.sin(t*.03)*.04;out.eye=t<100?1:t<750?.08:t<800?.12:franklinEase((t-800)/350);out.fire=.15+.6*franklinEase((t-800)/400);out.arc=franklinEase((t-800)/300);out.core=.6+.4*out.arc;}
 else if(p==='collapse'){out.pose=t<700?'exhausted':t<1450?'cast':'exhausted';out.fire=t<700?.1:t<1450?.8:.1;out.arc=t>=700&&t<1450?1:0;out.rotation=t<700?-.025:0;}
 else if(p==='crash'){out.pose=t<240?'hurt':'exhausted';out.offsetX=t<240?-Math.sin(Math.PI*t/240)*3*c.direction:0;out.fire=t<240?.4:.03;out.arc=t<240?1:.2;}
 else if(p==='safe-chip'){out.pose='exhausted';out.eye=.06;out.fire=0;out.core=.15;out.sy=1+Math.sin(clock*.004)*.02;}
 else if(p==='rescued'){out.pose=rescueMs<500?'exhausted':'friendly';out.eye=0;out.core=0;out.fire=0;out.arc=0;out.heart=rescueMs>=1700?franklinEase((rescueMs-1700)/400):0;out.offsetY=rescueMs>=1700&&rescueMs<2500?-Math.sin(Math.PI*(rescueMs-1700)/800)*9:0;}
 if(hurtMs>0&&!flinchExcluded.has(p)){out.pose='hurt';out.rotation=-.06*c.direction*(hurtMs/180);out.offsetX=-2*c.direction*hurtMs/180;}
}
export interface FranklinPoint {x:number;y:number;}
/** Same visible transform for all attachments, including flip, visual shake and pivot rotation. */
export function franklinAttachment(pose:FranklinPose,key:'chip'|'eye'|'mouth'|'tail'|'backPaw'|'frontPaw',x:number,y:number,width:number,height:number,flip:boolean,rotation:number,offsetX:number,offsetY:number,out:FranklinPoint):void {
 const a=FRANKLIN_POSES[pose][key],dx=(a[0]-.5)*width*(flip?-1:1)+offsetX,dy=(a[1]-1)*height+offsetY;
 const cos=Math.cos(rotation),sin=Math.sin(rotation);out.x=x+dx*cos-dy*sin;out.y=y+dx*sin+dy*cos;
}
export function franklinIntroZoom(t:number):number {
 if(t<900)return 1.1;
 if(t<1400)return 1.1+1.1*franklinEase((t-900)/500);
 if(t<2900)return 2.2;
 if(t<3400)return 2.2-franklinEase((t-2900)/500);
 if(t<3900)return 1.2;
 return 1.2-.52*franklinEase((t-3900)/700);
}

/** Cinematic focus is expressed in rendered world coordinates, independent of Phaser pan's center convention. */
export function sampleFranklinIntroFocus(t:number,playerX:number,bossX:number,out:FranklinPoint):void {
 const mutual=(playerX+bossX)/2,head=bossX+4;
 if(t<900){out.x=mutual;out.y=320;}
 else if(t<1400){const u=franklinEase((t-900)/500);out.x=mutual+(head-mutual)*u;out.y=320+10*u;}
 else if(t<3400){out.x=head;out.y=330;}
 else {const u=franklinEase((t-3400)/1200);out.x=head+(playerX-head)*u;out.y=330-10*u;}
}
export function sampleFranklinCrashFocus(t:number,start:FranklinPoint,playerX:number,bossX:number,out:FranklinPoint):number {
 const head=bossX+4;
 if(t<250){const u=franklinEase(t/250);out.x=start.x+(head-start.x)*u;out.y=start.y+(330-start.y)*u;return .68+.42*u;}
 if(t<500){out.x=head;out.y=330;return 1.1;}
 const u=franklinEase((t-500)/450);out.x=head+(playerX-head)*u;out.y=330-10*u;return 1.1-.42*u;
}
/** This game's renderScale wrapper renders stored scroll as top-left. Do not use camera.pan here. */
export function franklinFocusScroll(focus:FranklinPoint,width:number,height:number,zoom:number,out:FranklinPoint):void {
 const viewWidth=width/zoom,viewHeight=height/zoom;
 out.x=Math.max(0,Math.min(Math.max(0,2000-viewWidth),focus.x-viewWidth/2));
 out.y=Math.max(-100,Math.min(Math.max(-100,460-viewHeight),focus.y-viewHeight/2));
}

/** Presentation pacing affects only intro and reunion, never damaging attack clocks. */
export const FRANKLIN_PACING = { introScale: 2, rescueScale: 1.5, introFollowMs: 9200, rescueLogicalMs: 2800 } as const;
export const franklinIntroTime = (actualMs:number):number => actualMs/FRANKLIN_PACING.introScale;
export const franklinIntroTextAlpha = (actualMs:number):number => Math.max(0,Math.min(1,actualMs/400,(10200-actualMs)/1000));
export interface FranklinRay { x:number;y:number;dx:number;dy:number;length:number;endX:number;endY:number; }
/** Identical clamped launch vector for the sight and projectile; writes into reusable storage. */
export function franklinFireballRay(bossX:number,bossY:number,aimX:number,aimY:number,out:FranklinRay):void {
 const sign=aimX<bossX?-1:1,angle=Math.max(-.7,Math.min(.7,Math.atan2(aimY-320,Math.abs(aimX-bossX))));
 out.x=bossX;out.y=bossY-40;out.dx=sign*Math.cos(angle);out.dy=Math.sin(angle);
 let length=Math.min(1600,((sign<0?155:1845)-out.x)/out.dx);
 if(out.dy>0)length=Math.min(length,(360-out.y)/out.dy);
 else if(out.dy<0)length=Math.min(length,(-100-out.y)/out.dy);
 out.length=Math.max(0,length);out.endX=out.x+out.dx*out.length;out.endY=out.y+out.dy*out.length;
}
