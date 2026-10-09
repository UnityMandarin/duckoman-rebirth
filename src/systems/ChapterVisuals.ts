import type Phaser from 'phaser';
import {CHAPTER_DOORS,CHAPTER_SIGNS,CHAPTER_SPIKES_FLIP_Y,CHAPTER_SURFACES,RESCUE_SURFACES,type CapFrame,type IdentityChapter,type IdentityFrame,type PlatformFrame} from '../data/chapterVisuals';
import {planTerrainAxis,type TerrainSegment} from './chapterTerrainPieces';

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
const PIXELS_PER_WORLD=2;
// Rescue's metadata frame is the opaque inner repeat face; partial edges need the atlas's full closed contour.
const RESCUE_FOUNDATION_FINISH={x:-6,y:-6,width:258,height:177};
type Slice={source:number;size:number;destination:number;drawSize:number};
type AxisPiece={segment:TerrainSegment;slices:Slice[]};
function axisPieces(segments:TerrainSegment[],sourceSize:number,scale:number,partialSourceStart=0,partialSourceSize=sourceSize):AxisPiece[]{
 let destination=0;
 return segments.map(segment=>{
  const slices:Slice[]=[];
  if(segment.kind==='full'){
   const units=segment.units??1;
   for(let i=0;i<units;i++)slices.push({source:0,size:sourceSize,destination:destination+i*sourceSize*scale,drawSize:sourceSize*scale});
  }else{
   const sourceWidth=segment.width/scale,edge=sourceWidth/2;
   slices.push({source:partialSourceStart,size:edge,destination,drawSize:edge*scale});
   slices.push({source:partialSourceStart+partialSourceSize-edge,size:edge,destination:destination+edge*scale,drawSize:edge*scale});
  }
  const result={segment,slices};destination+=segment.width;return result;
 });
}
function makeTerrainCanvas(scene:Phaser.Scene,key:string,width:number,height:number,draw:(context:CanvasRenderingContext2D)=>void):string{
 if(scene.textures.exists(key))return key;
 const pixelWidth=Math.max(1,Math.ceil(width*PIXELS_PER_WORLD)),pixelHeight=Math.max(1,Math.ceil(height*PIXELS_PER_WORLD));
 const texture=scene.textures.createCanvas(key,pixelWidth,pixelHeight);if(!texture)throw new Error(`Could not create terrain texture ${key}.`);const context=texture.getContext();
 draw(context);texture.add('terrain',0,0,0,width*PIXELS_PER_WORLD,height*PIXELS_PER_WORLD);texture.refresh();return key;
}
function terrainKey(parts:unknown[]):string{return `terrain-piece-${parts.map(value=>String(value).replace(/[^a-zA-Z0-9.-]/g,'_')).join('-')}`;}
function drawTerrainPattern(context:CanvasRenderingContext2D,source:HTMLImageElement|HTMLCanvasElement,frame:Phaser.Textures.Frame,xSlices:Slice[],ySlices:Slice[]):void{
 for(const sx of xSlices)for(const sy of ySlices){
  if(sx.size<=0||sy.size<=0)continue;
  context.drawImage(source,frame.cutX+sx.source,frame.cutY+sy.source,sx.size,sy.size,sx.destination*PIXELS_PER_WORLD,sy.destination*PIXELS_PER_WORLD,sx.drawSize*PIXELS_PER_WORLD,sy.drawSize*PIXELS_PER_WORLD);
 }
}
function addFinishedStrip(scene:Phaser.Scene,chapter:IdentityChapter,frame:IdentityFrame,width:number,height:number,depth:number,originX=.5):Phaser.GameObjects.Image{
 const key=identityTexture(chapter),texture=scene.textures.get(key),native=texture.get(frame),scale=height/native.height,unitWidth=native.width*scale,segments=planTerrainAxis(width,unitWidth),xSlices=axisPieces(segments,native.width,scale).flatMap(piece=>piece.slices),ySlices=[{source:0,size:native.height,destination:0,drawSize:height}];
 const cache=terrainKey([chapter,frame,width,height]),source=texture.getSourceImage() as HTMLImageElement;
 const pieceKey=makeTerrainCanvas(scene,cache,width,height,context=>drawTerrainPattern(context,source,native,xSlices,ySlices));
 return scene.add.image(0,0,pieceKey,'terrain').setOrigin(originX,0).setScale(1/PIXELS_PER_WORLD).setDepth(depth);
}
function addFoundationGroup(scene:Phaser.Scene,chapter:IdentityChapter,frame:Phaser.Textures.Frame,x:number,top:number,depth:number,scale:number,unitWidth:number,unitHeight:number,xSegment:TerrainSegment,ySegment:TerrainSegment):Phaser.GameObjects.Image|Phaser.GameObjects.TileSprite{
 const key=identityTexture(chapter),native=scene.textures.get(key).get(frame.name),fullX=xSegment.kind==='full',fullY=ySegment.kind==='full';
 if(fullX&&fullY)return scene.add.tileSprite(x,top,xSegment.width,ySegment.width,key,frame.name).setOrigin(.5,0).setTileScale(scale,scale).setDepth(depth);
 const patternWidth=fullX?unitWidth:xSegment.width,patternHeight=fullY?unitHeight:ySegment.width;
 const rescueFinish=chapter==='rescue'&&frame.name==='foundation'?RESCUE_FOUNDATION_FINISH:undefined;
 const xPieces=axisPieces([{...xSegment,width:patternWidth,...(fullX?{units:1}:{})}],native.width,scale,fullX?0:rescueFinish?.x??0,fullX?native.width:rescueFinish?.width??native.width)[0]!.slices;
 const yPieces=axisPieces([{...ySegment,width:patternHeight,...(fullY?{units:1}:{})}],native.height,scale,fullY?0:rescueFinish?.y??0,fullY?native.height:rescueFinish?.height??native.height)[0]!.slices;
 const textureKey=terrainKey(['foundation',chapter,fullX?'full':'partial',patternWidth,fullY?'full':'partial',patternHeight]);
 const source=scene.textures.get(key).getSourceImage() as HTMLImageElement;
 makeTerrainCanvas(scene,textureKey,patternWidth,patternHeight,context=>drawTerrainPattern(context,source,native,xPieces,yPieces));
 if(fullX||fullY)return scene.add.tileSprite(x,top,xSegment.width,ySegment.width,textureKey,'terrain').setOrigin(.5,0).setTileScale(1/PIXELS_PER_WORLD,1/PIXELS_PER_WORLD).setDepth(depth);
 return scene.add.image(x,top,textureKey,'terrain').setOrigin(.5,0).setScale(1/PIXELS_PER_WORLD).setDepth(depth);
}
export function addIdentityBlock(scene:Phaser.Scene,chapter:IdentityChapter,{x,top,width,height=48,frame,depth=2}:{x:number;top:number;width:number;height?:number;frame:IdentityFrame;depth?:number}):Phaser.GameObjects.Image{
 assertFrame(scene,chapter,frame);
 return addFinishedStrip(scene,chapter,frame,width,height,depth).setPosition(x,top).setOrigin(.5,0).setScale(1/PIXELS_PER_WORLD);
}
const BELT_DECK_CROPS:Partial<Record<IdentityChapter,{x:number;y:number;width:number;height:number}>>={outside:{x:84,y:4,width:56,height:22},crimson:{x:96,y:11,width:45,height:18},jail:{x:86,y:5,width:41,height:16}};
export function conveyorBeltDeckOffset(chapter:IdentityChapter,displayHeight:number,beltFrameHeight:number):number{
 const crop=BELT_DECK_CROPS[chapter];if(!crop)throw new Error(`Missing measured conveyor deck crop for ${chapter}.`);
 return crop.y*displayHeight/beltFrameHeight;
}
/** A narrow, cached repeat of the authored belt tread, independent of platform physics and art. */
export function addConveyorBeltDeck(scene:Phaser.Scene,chapter:IdentityChapter,{x,y,width,depth}:{x:number;y:number;width:number;depth:number}):Phaser.GameObjects.TileSprite{
 assertFrame(scene,chapter,'belt');
 const key=`conveyor-deck-${chapter}`;
 if(!scene.textures.exists(key)){
  const crop=BELT_DECK_CROPS[chapter],texture=scene.textures.get(identityTexture(chapter)),frame=texture.get('belt');
  if(!crop)throw new Error(`Missing measured conveyor deck crop for ${chapter}.`);
  const canvas=scene.textures.createCanvas(key,40,16);if(!canvas)throw new Error(`Could not create conveyor deck texture ${key}.`);
  const context=canvas.getContext(),source=texture.getSourceImage() as HTMLImageElement;
  context.drawImage(source,frame.cutX+crop.x,frame.cutY+crop.y,crop.width,crop.height,0,0,40,16);
  // A tiny dark seam at the repeat edge makes the source material read as linked treads.
  context.fillStyle='rgba(8, 12, 16, 0.36)';context.fillRect(39,0,1,16);
  context.fillStyle='rgba(255, 255, 255, 0.18)';context.fillRect(0,0,40,1);
  canvas.add('deck',0,0,0,40,16);canvas.refresh();
 }
 return scene.add.tileSprite(x,y,width,8,key,'deck').setOrigin(.5,0).setTileScale(.5,.5).setDepth(depth);
}
export function addIdentityFloor(scene:Phaser.Scene,chapter:IdentityChapter,{x,top,width,height,frame}:{x:number;top:number;width:number;height:number;frame:CapFrame}):{cap:Phaser.GameObjects.Image;foundation?:Phaser.GameObjects.Container;backing?:Phaser.GameObjects.Rectangle}{
 assertFrame(scene,chapter,'foundation');assertFrame(scene,chapter,frame);const key=identityTexture(chapter),tile=addFinishedStrip(scene,chapter,frame,width,Math.min(48,height),1).setPosition(x,top);
 const foundationHeight=height;
 let foundation:Phaser.GameObjects.Container|undefined,backing:Phaser.GameObjects.Rectangle|undefined;
 if(foundationHeight>0){const fill={jail:0x172633,outside:0x35281e,crimson:0x1b1119,rescue:0x36313b}[chapter],f=scene.textures.get(key).get('foundation'),scale=128/f.height,unitWidth=f.width*scale,unitHeight=128,xSegments=planTerrainAxis(width,unitWidth),ySegments=planTerrainAxis(foundationHeight,unitHeight);backing=scene.add.rectangle(x,top+foundationHeight/2,width,foundationHeight,fill,1).setDepth(-1);
  const xStart=x-width/2;let xOffset=0;foundation=scene.add.container(0,0).setDepth(0);
  for(const xSegment of xSegments){let yOffset=0;for(const ySegment of ySegments){const groupWidth=xSegment.width,groupHeight=ySegment.width,groupX=xStart+xOffset+groupWidth/2,groupTop=top+yOffset,group=addFoundationGroup(scene,chapter,f,groupX,groupTop,0,scale,unitWidth,unitHeight,xSegment,ySegment).setDepth(0);foundation.add(group);yOffset+=groupHeight;}xOffset+=xSegment.width;}
 }
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
