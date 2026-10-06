import {describe,expect,it} from 'vitest';
import {CHAPTER_SURFACES,RESCUE_SURFACES,type IdentityChapter} from '../src/data/chapterVisuals';
import {addIdentityBlock,addIdentityFloor,floorVisual,identityAssetPath,identityTexture,platformVisual} from '../src/systems/ChapterVisuals';
import {JAIL_ROOMS,OUTSIDE_ROOMS} from '../src/data/qualityRooms';
import {encounterFor} from '../src/data/chapterChallenges';

const code=(frame:string):string=>({'cap-a':'A','cap-b':'B','cap-c':'C',cracked:'R',shutter:'S',belt:'T',carrier:'M'} as Record<string,string>)[frame]??'?';
type MockObject={x:number;y:number;width:number;height:number;scaleX:number;scaleY:number;tileScaleX:number;tileScaleY:number;alpha:number;tint?:number;depth?:number;setOrigin(x:number,y:number):MockObject;setTileScale(x:number,y:number):MockObject;setScale(x:number,y?:number):MockObject;setDepth(depth:number):MockObject;setFlipX(value:boolean):MockObject;setPosition(x:number,y:number):MockObject;setAlpha(value:number):MockObject;setTint(value:number):MockObject;};
type DrawCall={sx:number;sy:number;sw:number;sh:number;dx:number;dy:number;dw:number;dh:number};
type MockFrame={name:string;width:number;height:number;cutX:number;cutY:number};
type MockContainer=MockObject&{children:MockObject[];add(child:MockObject):MockContainer};
function mockRenderer(){
 const objects:MockObject[]=[],rectangles:{x:number;y:number;width:number;height:number;color:number;depth?:number}[]=[],drawCalls:DrawCall[]=[],frames:Record<string,MockFrame>={
  'cap-a':{name:'cap-a',width:200,height:80,cutX:0,cutY:0},'cap-b':{name:'cap-b',width:180,height:60,cutX:0,cutY:80},'cap-c':{name:'cap-c',width:190,height:70,cutX:0,cutY:140},foundation:{name:'foundation',width:240,height:64,cutX:0,cutY:210},carrier:{name:'carrier',width:320,height:50,cutX:0,cutY:274},belt:{name:'belt',width:300,height:50,cutX:0,cutY:324},cracked:{name:'cracked',width:310,height:50,cutX:0,cutY:374},shutter:{name:'shutter',width:290,height:50,cutX:0,cutY:424}};
 const rescueFrames:Record<string,MockFrame>={...frames,foundation:{name:'foundation',width:249,height:94,cutX:972,cutY:89}};
 const textures:Record<string,{frames:Record<string,MockFrame>;has(name:string):boolean;get(name:string):MockFrame;getSourceImage():HTMLImageElement}>={'identity-outside':{frames,has(name){return name in frames;},get(name){return frames[name]??{name,width:100,height:100,cutX:0,cutY:0};},getSourceImage(){return {} as HTMLImageElement;}},'identity-rescue':{frames:rescueFrames,has(name){return name in rescueFrames;},get(name){return rescueFrames[name]??{name,width:100,height:100,cutX:0,cutY:0};},getSourceImage(){return {} as HTMLImageElement;}}};
 const scene={textures:{exists:(key:string)=>key in textures,get:(key:string)=>textures[key]!,createCanvas(key:string,width:number,height:number){const ctx={drawImage(_source:unknown,sx:number,sy:number,sw:number,sh:number,dx:number,dy:number,dw:number,dh:number){drawCalls.push({sx,sy,sw,sh,dx,dy,dw,dh});}} as unknown as CanvasRenderingContext2D;const texture={getContext:()=>ctx,add(name:string,_source:number,_x:number,_y:number,w:number,h:number){frames[name]={name,width:w,height:h,cutX:0,cutY:0};},refresh(){}};textures[key]={frames:{...frames},has(name){return name in this.frames;},get(name){return this.frames[name]??frames[name]??{name,width:100,height:100,cutX:0,cutY:0};},getSourceImage(){return {} as HTMLImageElement;}};return texture;}},add:{image(x:number,y:number,_key:string,frameName=''){const frame=frames[frameName]??{width:100,height:100};const obj:MockObject={x,y,width:frame.width,height:frame.height,scaleX:1,scaleY:1,tileScaleX:1,tileScaleY:1,alpha:1,setOrigin(){return this;},setTileScale(a,b){this.tileScaleX=a;this.tileScaleY=b;return this;},setScale(a,b=a){this.scaleX=a;this.scaleY=b;return this;},setDepth(value){this.depth=value;return this;},setFlipX(){return this;},setPosition(a,b){this.x=a;this.y=b;return this;},setAlpha(value){this.alpha=value;return this;},setTint(value){this.tint=value;return this;}};objects.push(obj);return obj;},container(x:number,y:number){const obj:MockContainer={x,y,width:0,height:0,scaleX:1,scaleY:1,tileScaleX:1,tileScaleY:1,alpha:1,children:[],setOrigin(){return this;},setTileScale(a,b){this.tileScaleX=a;this.tileScaleY=b;return this;},setScale(a,b=a){this.scaleX=a;this.scaleY=b;return this;},setDepth(value){this.depth=value;return this;},setFlipX(){return this;},setPosition(a,b){this.x=a;this.y=b;return this;},setAlpha(value){this.alpha=value;return this;},setTint(value){this.tint=value;return this;},add(child){this.children.push(child);return this;}};objects.push(obj);return obj;},tileSprite(x:number,y:number,width:number,height:number){const obj:MockObject={x,y,width,height,scaleX:1,scaleY:1,tileScaleX:1,tileScaleY:1,alpha:1,setOrigin(){return this;},setTileScale(a,b){this.tileScaleX=a;this.tileScaleY=b;return this;},setScale(a,b=a){this.scaleX=a;this.scaleY=b;return this;},setDepth(value){this.depth=value;return this;},setFlipX(){return this;},setPosition(a,b){this.x=a;this.y=b;return this;},setAlpha(value){this.alpha=value;return this;},setTint(value){this.tint=value;return this;}};objects.push(obj);return obj;},rectangle(x:number,y:number,width:number,height:number,color:number){const rect={x,y,width,height,color,depth:undefined as number|undefined,setDepth(depth:number){this.depth=depth;return this;}};rectangles.push(rect);return rect;}}};
 return {scene,objects,rectangles,drawCalls};
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
 it('keeps every finished block in its exact authored bounds and preserves both source edges at full scale',()=>{
  const {scene,objects,drawCalls}=mockRenderer(),block=addIdentityBlock(scene as never,'outside',{x:500,top:120,width:900,height:48,frame:'carrier'}) as unknown as MockObject;
  expect(objects).toHaveLength(1);expect([block.x,block.y,block.width*block.scaleX,block.height*block.scaleY,block.scaleX,block.scaleY]).toEqual([500,120,900,48,.5,.5]);
  const calls=drawCalls.filter(call=>call.sy===274);
  expect(calls.length).toBe(4);expect(calls.slice(0,2).every(call=>call.sw===320&&call.dw===320*48/50*2)).toBe(true);
  expect(calls.slice(-2).map(call=>call.sx)).toEqual([0,320-calls[2]!.sw]);
  expect(calls.slice(-2).every(call=>Math.abs(call.dw-call.sw*48/50*2)<1e-8)).toBe(true);
  block.setPosition(510,121).setAlpha(.7).setTint(0xffccaa);expect([block.x,block.y,block.alpha,block.tint]).toEqual([510,121,.7,0xffccaa]);
 });
 it('finishes Rescue foundation bottom partials from the measured outer contour at the unchanged scale',()=>{
  const {scene,objects,drawCalls}=mockRenderer(),unitWidth=249*128/94,width=unitWidth*2,floor=addIdentityFloor(scene as never,'rescue',{x:width/2,top:0,width,height:240,frame:'cap-a'});
  expect(floor.foundation).toBeDefined();
  const fullCore=objects.find(item=>item.depth===0&&item.tileScaleX===128/94);expect(fullCore).toBeDefined();
  const bottomEdge=drawCalls.filter(call=>call.sy>=200).sort((a,b)=>a.sy-b.sy).at(-1);
  expect(bottomEdge).toBeDefined();expect(bottomEdge!.sy+bottomEdge!.sh).toBeCloseTo(260,7);
  expect(bottomEdge!.dh).toBeCloseTo(bottomEdge!.sh*(128/94)*2,7);
 });
 it('renders floor caps as one exact strip and foundations as bounded repeated groups',()=>{
  const {scene,objects,rectangles}=mockRenderer(),floor=addIdentityFloor(scene as never,'outside',{x:720,top:300,width:1440,height:360,frame:'cap-a'});
  expect([floor.cap.x,floor.cap.y,floor.cap.scaleX,floor.cap.scaleY]).toEqual([720,300,.5,.5]);
  expect(floor.foundation).toBeDefined();expect((floor.foundation as unknown as MockContainer).children.length).toBeLessThanOrEqual(9);expect(objects.slice(1).every(item=>item.depth===0)).toBe(true);
  expect(objects.filter(item=>item.depth===0).length).toBeLessThanOrEqual(9);
  expect(rectangles).toHaveLength(1);expect([rectangles[0]!.x,rectangles[0]!.y,rectangles[0]!.width,rectangles[0]!.height,rectangles[0]!.depth]).toEqual([720,480,1440,360,-1]);
 });
});
