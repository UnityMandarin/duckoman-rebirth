import type Phaser from 'phaser';
import {CHAPTER_DOORS,CHAPTER_SIGNS,CHAPTER_SPIKES_FLIP_Y,CHAPTER_SURFACES,RESCUE_SURFACES,type CapFrame,type IdentityChapter,type IdentityFrame,type PlatformFrame} from '../data/chapterVisuals';

type FrameRect=[number,number,number,number];
type ChapterMetadata={width:number;height:number;frames:Partial<Record<IdentityFrame,FrameRect>>};
type IdentityMetadata=Partial<Record<IdentityChapter,ChapterMetadata>>;
export interface IdentityDoor{frame:Phaser.GameObjects.Image;leaf:Phaser.GameObjects.Image;chapter:IdentityChapter;x:number;ground:number;width:number;height:number;opened:boolean;}
export const identityTexture=(chapter:IdentityChapter):string=>`identity-${chapter}`;
export const identityAssetPath=(chapter:IdentityChapter):string=>`assets/identity/${chapter}.png`;
const FRAME_NAMES:readonly IdentityFrame[]=['cap-a','cap-b','cap-c','foundation','belt','carrier','cracked','shutter','door-frame','door-leaf','sign','rest','chain','spikes','press','latch'];
const metadata=(scene:Phaser.Scene,chapter:IdentityChapter):ChapterMetadata=>{
 if(!scene.cache.json.exists('identity-frames'))throw new Error('Chapter identity metadata is not loaded (identity-frames).');
 const source=scene.cache.json.get('identity-frames') as IdentityMetadata,entry=source?.[chapter];
 if(!entry||!Number.isFinite(entry.width)||!Number.isFinite(entry.height)||!entry.frames)throw new Error(`Missing measured identity metadata for ${chapter}.`);
 return entry;
};
export function preloadChapterIdentity(scene:Phaser.Scene,chapter:IdentityChapter):void{
 const texture=identityTexture(chapter),base=import.meta.env.BASE_URL;
 if(!scene.textures.exists(texture)&&!Array.from(scene.load.list).some(file=>file.key===texture))scene.load.image(texture,`${base}${identityAssetPath(chapter)}`);
 if(!scene.cache.json.exists('identity-frames')&&!Array.from(scene.load.list).some(file=>file.key==='identity-frames'))scene.load.json('identity-frames',`${base}assets/identity/frames.json`);
}
export function registerChapterIdentity(scene:Phaser.Scene,chapter:IdentityChapter):void{
 const textureKey=identityTexture(chapter);
 if(!scene.textures.exists(textureKey))throw new Error(`Missing chapter identity atlas ${textureKey}; no generic visual fallback is allowed.`);
 const texture=scene.textures.get(textureKey),meta=metadata(scene,chapter);
 if(texture.getSourceImage().width!==meta.width||texture.getSourceImage().height!==meta.height)throw new Error(`Identity atlas dimensions do not match measured metadata for ${chapter}.`);
 for(const name of FRAME_NAMES){const rect=meta.frames[name];if(!rect)throw new Error(`Missing measured ${chapter} identity frame: ${name}.`);const [x,y,width,height]=rect;
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0||x<0||y<0||x+width>meta.width||y+height>meta.height)throw new Error(`Invalid measured ${chapter} identity frame: ${name}.`);
  if(!texture.has(name))texture.add(name,0,x,y,width,height);
 }
}
export function platformVisual(chapter:IdentityChapter,room:number,step:number):PlatformFrame{
 const chosen=chapter==='rescue'?RESCUE_SURFACES.steps[step]:CHAPTER_SURFACES[chapter]?.[room]?.steps[step];
 if(!chosen)throw new RangeError(`No authored platform identity for ${chapter} room ${room} step ${step}.`);return chosen;
}
export function floorVisual(chapter:IdentityChapter,room:number,interval=0):CapFrame{
 const chosen=chapter==='rescue'?RESCUE_SURFACES.floor[interval]:CHAPTER_SURFACES[chapter]?.[room]?.floor[interval];
 if(!chosen)throw new RangeError(`No authored floor identity for ${chapter} room ${room} interval ${interval}.`);return chosen;
}
function assertFrame(scene:Phaser.Scene,chapter:IdentityChapter,frame:IdentityFrame):void{
 if(!scene.textures.exists(identityTexture(chapter))||!scene.textures.get(identityTexture(chapter)).has(frame))throw new Error(`Required identity frame is not registered: ${chapter}/${frame}.`);
}
export function addIdentitySign(scene:Phaser.Scene,chapter:IdentityChapter,{x,y,text,width=168}:{x:number;y:number;text:string;width?:number}):{art:Phaser.GameObjects.Image;label:Phaser.GameObjects.Text}{
 assertFrame(scene,chapter,'sign');const art=scene.add.image(x,y,identityTexture(chapter),'sign').setOrigin(.5,1).setDisplaySize(width,92).setDepth(3);
 const divider=text.indexOf(' / '),copy=divider<0?text:`${text.slice(0,divider)}\n${text.slice(divider+3)}`;
 const palette={jail:'#f4e4c2',outside:'#f4efdb',crimson:'#f1d891',rescue:'#e7d9ff'};
 const label=scene.add.text(x,y-60,copy,{fontFamily:'Georgia',fontSize:'9px',color:palette[chapter],stroke:'#100e16',strokeThickness:2,align:'center',wordWrap:{width:Math.min(132,width*.78)}}).setOrigin(.5).setDepth(4);
 return {art,label};
}
export function addIdentityBlock(scene:Phaser.Scene,chapter:IdentityChapter,{x,top,width,height=48,frame,depth=2}:{x:number;top:number;width:number;height?:number;frame:IdentityFrame;depth?:number}):Phaser.GameObjects.TileSprite{
 assertFrame(scene,chapter,frame);const key=identityTexture(chapter),native=scene.textures.get(key).get(frame),scale=height/native.height;
 return scene.add.tileSprite(x,top,width,height,key,frame).setOrigin(.5,0).setTileScale(scale,scale).setDepth(depth);
}
export function addIdentityFloor(scene:Phaser.Scene,chapter:IdentityChapter,{x,top,width,height,frame}:{x:number;top:number;width:number;height:number;frame:CapFrame}):{cap:Phaser.GameObjects.TileSprite;foundation?:Phaser.GameObjects.TileSprite;backing?:Phaser.GameObjects.Rectangle}{
 assertFrame(scene,chapter,'foundation');const key=identityTexture(chapter),tile=addIdentityBlock(scene,chapter,{x,top,width,height:Math.min(48,height),frame,depth:1});
 const foundationHeight=height;
 let foundation:Phaser.GameObjects.TileSprite|undefined,backing:Phaser.GameObjects.Rectangle|undefined;
 if(foundationHeight>0){const fill={jail:0x172633,outside:0x35281e,crimson:0x1b1119,rescue:0x36313b}[chapter],f=scene.textures.get(key).get('foundation'),scale=128/f.height;backing=scene.add.rectangle(x,top+foundationHeight/2,width,foundationHeight,fill,1).setDepth(-1);foundation=scene.add.tileSprite(x,top,width,foundationHeight,key,'foundation').setOrigin(.5,0).setTileScale(scale,scale).setDepth(0);}
 return {cap:tile,foundation,backing};
}
export function addIdentityDoor(scene:Phaser.Scene,chapter:IdentityChapter,{x,ground,width,height,opened}:{x:number;ground:number;width:number;height:number;opened:boolean}):IdentityDoor{
 assertFrame(scene,chapter,'door-frame');assertFrame(scene,chapter,'door-leaf');
 const frameHeight=chapter==='rescue'?376:height+18;
 const frame=scene.add.image(x,ground,identityTexture(chapter),'door-frame').setOrigin(.5,1).setDisplaySize(132,frameHeight).setDepth(4);
 const leaf=scene.add.image(x,ground,identityTexture(chapter),'door-leaf').setOrigin(.5,1).setDisplaySize(width,height).setDepth(3).setVisible(!opened);
 return {frame,leaf,chapter,x,ground,width,height,opened};
}
export function openIdentityDoor(scene:Phaser.Scene,chapter:IdentityChapter,door:IdentityDoor,duration:number):void{
 if(door.chapter!==chapter||door.opened)return;door.opened=true;scene.tweens.killTweensOf(door.leaf);
 const mode=CHAPTER_DOORS[chapter],leaf=door.leaf;
 const clipLiftedLeaf=():void=>{const nativeWidth=leaf.frame.width,nativeHeight=leaf.frame.height,distanceMoved=Math.min(door.height,Math.max(0,door.ground-leaf.y)),cropTop=nativeHeight*distanceMoved/door.height;leaf.setCrop(0,cropTop,nativeWidth,Math.max(0,nativeHeight-cropTop));};
 if(mode.kind==='lift')scene.tweens.add({targets:leaf,y:door.ground-mode.distance,duration,ease:'Sine.easeInOut',onUpdate:clipLiftedLeaf,onComplete:()=>leaf.setVisible(false)});
 else if(mode.kind==='fold')scene.tweens.add({targets:leaf,scaleX:0,alpha:0,duration,ease:'Cubic.easeIn',onComplete:()=>leaf.setVisible(false)});
 else if(mode.kind==='lift-fade')scene.tweens.add({targets:leaf,y:door.ground-mode.distance,alpha:0,duration,ease:'Cubic.easeIn',onUpdate:clipLiftedLeaf,onComplete:()=>leaf.setVisible(false)});
 else scene.tweens.add({targets:leaf,alpha:0,scaleX:leaf.scaleX*.96,scaleY:leaf.scaleY*.96,duration,ease:'Cubic.easeInOut',onComplete:()=>leaf.setVisible(false)});
}
export function chapterSpikeFlipY(chapter:IdentityChapter):boolean{return CHAPTER_SPIKES_FLIP_Y[chapter];}
export function addIdentityChapterSigns(scene:Phaser.Scene,chapter:IdentityChapter,room:number,xOffset:number,supportTop:number):void{
 for(const sign of CHAPTER_SIGNS[chapter])if(sign.room===room)addIdentitySign(scene,chapter,{x:xOffset+sign.x,y:sign.bottomY??supportTop,text:sign.text,width:sign.width});
}
