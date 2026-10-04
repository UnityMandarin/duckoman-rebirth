import {describe,expect,it} from 'vitest';
import {CHAPTER_SURFACES,RESCUE_SURFACES,type IdentityChapter} from '../src/data/chapterVisuals';
import {addIdentityBlock,addIdentityFloor,floorVisual,identityAssetPath,identityTexture,platformVisual} from '../src/systems/ChapterVisuals';
import {JAIL_ROOMS,OUTSIDE_ROOMS} from '../src/data/qualityRooms';
import {encounterFor} from '../src/data/chapterChallenges';

const code=(frame:string):string=>({'cap-a':'A','cap-b':'B','cap-c':'C',cracked:'R',shutter:'S',belt:'T',carrier:'M'} as Record<string,string>)[frame]??'?';
type MockTile={x:number;y:number;width:number;height:number;scaleX:number;scaleY:number;tileScaleX:number;tileScaleY:number;tilePositionX:number;alpha:number;tint?:number;setOrigin(x:number,y:number):MockTile;setTileScale(x:number,y:number):MockTile;setDepth(depth:number):MockTile;setFlipX(value:boolean):MockTile;setPosition(x:number,y:number):MockTile;setAlpha(value:number):MockTile;setTint(value:number):MockTile;};
function mockRenderer():{scene:unknown;tiles:MockTile[];rectangles:{x:number;y:number;width:number;height:number;color:number;depth?:number}[]} {
 const tiles:MockTile[]=[],rectangles:{x:number;y:number;width:number;height:number;color:number;depth?:number}[]=[],frames:Record<string,{width:number;height:number}>={'cap-a':{width:200,height:80},'cap-b':{width:180,height:60},'cap-c':{width:190,height:70},foundation:{width:240,height:64},carrier:{width:320,height:50}};
 const texture={has:(frame:string)=>frame in frames,get:(frame:string)=>frames[frame]??{width:100,height:100}},scene={
  textures:{exists:(key:string)=>key==='identity-outside',get:()=>texture},
  add:{tileSprite:(x:number,y:number,width:number,height:number)=>{const tile:MockTile={x,y,width,height,scaleX:1,scaleY:1,tileScaleX:1,tileScaleY:1,tilePositionX:0,alpha:1,setOrigin(){return this;},setTileScale(a,b){this.tileScaleX=a;this.tileScaleY=b;return this;},setDepth(){return this;},setFlipX(){return this;},setPosition(a,b){this.x=a;this.y=b;return this;},setAlpha(value){this.alpha=value;return this;},setTint(value){this.tint=value;return this;}};tiles.push(tile);return tile;},rectangle:(x:number,y:number,width:number,height:number,color:number)=>{const rect={x,y,width,height,color,depth:undefined as number|undefined,setDepth(depth:number){this.depth=depth;return this;}};rectangles.push(rect);return rect;}}
 };
 return {scene,tiles,rectangles};
}
describe('authored chapter identity tables',()=>{
 it('covers every authored room, floor interval, and available geometry step',()=>{
  expect(CHAPTER_SURFACES.jail).toHaveLength(12);expect(CHAPTER_SURFACES.outside).toHaveLength(24);expect(CHAPTER_SURFACES.crimson).toHaveLength(12);
  expect(RESCUE_SURFACES.floor).toHaveLength(1);expect(RESCUE_SURFACES.steps).toHaveLength(3);
  JAIL_ROOMS.forEach((room,index)=>{expect(CHAPTER_SURFACES.jail[index]!.steps).toHaveLength(room.steps.length);expect(CHAPTER_SURFACES.jail[index]!.floor).toHaveLength(room.intervals.length);});
  OUTSIDE_ROOMS.forEach((room,index)=>{expect(CHAPTER_SURFACES.outside[index]!.steps).toHaveLength(room.steps.length);expect(CHAPTER_SURFACES.outside[index]!.floor).toHaveLength(room.intervals.length);});
  for(let room=0;room<10;room++)expect(CHAPTER_SURFACES.crimson[room]!.steps).toHaveLength(encounterFor('crimson',room)?.steps.length??0);
 });
 it('represents Rescue room 0 steps 0–2 and rejects missing authored indexes',()=>{
  expect([platformVisual('rescue',0,0),platformVisual('rescue',0,1),platformVisual('rescue',0,2)]).toEqual(['cap-a','cap-b','cap-c']);
  expect(floorVisual('rescue',0)).toBe('cap-a');expect(platformVisual('jail',5,1)).toBe('cracked');expect(floorVisual('outside',4,2)).toBe('cap-c');
  expect(()=>platformVisual('jail',0,9)).toThrow(RangeError);expect(()=>floorVisual('outside',1,2)).toThrow(RangeError);expect(()=>platformVisual('rescue',0,3)).toThrow(RangeError);
 });
 it('uses distinct atlas paths and texture keys for all four chapters',()=>{
  const chapters:IdentityChapter[]=['jail','outside','crimson','rescue'];
  expect(new Set(chapters.map(identityAssetPath)).size).toBe(4);expect(new Set(chapters.map(identityTexture)).size).toBe(4);
 });
 it('keeps explicit moving-surface frames aligned to the authored room mechanics',()=>{
  for(const chapter of ['jail','outside'] as const){
   const rooms=chapter==='jail'?JAIL_ROOMS:OUTSIDE_ROOMS;
   rooms.forEach((room,index)=>room.moving.forEach(move=>{
    const expected=move.type==='shutters'?'shutter':move.type==='crumble'?'cracked':move.type==='conveyor'?'belt':move.type==='ferry'||move.type==='lift'?'carrier':undefined;
    if(expected)expect(platformVisual(chapter,index,move.step)).toBe(expected);
   }));
  }
  for(let room=0;room<10;room++){
   const encounter=encounterFor('crimson',room);encounter?.moving?.forEach(move=>{
    const expected=move.type==='shutters'?'shutter':move.type==='crumble'?'cracked':move.type==='conveyor'?'belt':move.type==='ferry'||move.type==='lift'?'carrier':undefined;
    if(expected)expect(platformVisual('crimson',room,move.step)).toBe(expected);
   });
  }
 });
 it('repeats wide and narrow blocks at native proportions and exact requested bounds',()=>{
  const {scene,tiles}=mockRenderer(),wide=addIdentityBlock(scene as never,'outside',{x:500,top:120,width:900,height:48,frame:'carrier'}) as unknown as MockTile,narrow=addIdentityBlock(scene as never,'outside',{x:80,top:36,width:70,height:48,frame:'carrier'}) as unknown as MockTile;
  expect(tiles).toHaveLength(2);expect([wide.width,wide.height,wide.x-wide.width/2,wide.x+wide.width/2]).toEqual([900,48,50,950]);expect([narrow.width,narrow.height,narrow.x-narrow.width/2,narrow.x+narrow.width/2]).toEqual([70,48,45,115]);
  for(const tile of [wide,narrow]){expect(tile.tileScaleX).toBe(tile.tileScaleY);expect(tile.tileScaleX).toBe(48/50);expect(tile.scaleX).toBe(1);expect(tile.scaleY).toBe(1);expect(tile.tilePositionX).toBe(0);}
  wide.setPosition(510,121).setAlpha(.7).setTint(0xffccaa);expect(tiles).toHaveLength(2);expect([wide.x,wide.y,wide.alpha,wide.tint]).toEqual([510,121,.7,0xffccaa]);
 });
 it('tiles cap and foundation floors uniformly within their existing visual bounds',()=>{
  const {scene,tiles,rectangles}=mockRenderer(),floor=addIdentityFloor(scene as never,'outside',{x:720,top:300,width:1440,height:360,frame:'cap-a'});
  expect(tiles).toHaveLength(2);expect([floor.cap.width,floor.cap.height,floor.cap.tileScaleX,floor.cap.tileScaleY,floor.cap.scaleX]).toEqual([1440,48,48/80,48/80,1]);
  expect(floor.foundation).toBe(tiles[1]);expect([floor.foundation!.x,floor.foundation!.y,floor.foundation!.width,floor.foundation!.height,floor.foundation!.tileScaleX,floor.foundation!.tileScaleY,floor.foundation!.scaleX]).toEqual([720,300,1440,360,2,2,1]);
  expect(rectangles).toHaveLength(1);expect([rectangles[0]!.x,rectangles[0]!.y,rectangles[0]!.width,rectangles[0]!.height,rectangles[0]!.depth]).toEqual([720,480,1440,360,-1]);
 });
});
