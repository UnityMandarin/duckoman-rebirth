import {describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Math:{Clamp:(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))},Scenes:{Events:{PAUSE:'pause',SLEEP:'sleep',SHUTDOWN:'shutdown'}},Core:{Events:{BLUR:'blur'}}}}));
import {ChapterTraps} from '../src/systems/ChapterTraps';
import {addConveyorBeltDeck,identityTexture} from '../src/systems/ChapterVisuals';
import {chapterPlatforms} from '../src/data/chapters';
import {encounterFor,encounterSurfaceEffects} from '../src/data/chapterChallenges';

function object(x=0,y=0){return {x,y,depth:2,displayHeight:48,visible:true,alpha:1,scaleX:1,scaleY:1,tint:undefined as number|undefined,tilePositionX:0,setVisible(value:boolean){this.visible=value;return this;},setOrigin(){return this;},setTileScale(){return this;},setDepth(value:number){this.depth=value;return this;},setDisplaySize(){return this;},setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setX(x:number){this.x=x;return this;},setY(y:number){this.y=y;return this;},setFlipX(){return this;},setAlpha(value:number){this.alpha=value;return this;},setScale(x:number,y=x){this.scaleX=x;this.scaleY=y;return this;},setTint(value:number){this.tint=value;return this;},clearTint(){this.tint=undefined;return this;},clear(){return this;},lineStyle(){return this;},lineBetween(){return this;}};}
function canvas(){return {getContext:()=>({drawImage:vi.fn(),fillRect:vi.fn(),set fillStyle(_value:string){}}),add:vi.fn(),refresh:vi.fn()};}
function harness(kind:'outside'|'crimson',section:number){
 const nativeHeight=kind==='outside'?135:109,identity={has:()=>true,get:()=>({cutX:10,cutY:20,width:300,height:nativeHeight}),getSourceImage:()=>({})},canvases=new Map<string,any>(),textures={exists:(key:string)=>key.startsWith('identity-')||canvases.has(key),get:(key:string)=>key.startsWith('identity-')?identity:canvases.get(key),createCanvas:(key:string)=>{const texture=canvas();canvases.set(key,texture);return texture;}};
 const tiles:any[]=[],events={on:vi.fn(),once:vi.fn(),off:vi.fn()},add={image:(x:number,y:number)=>object(x,y),tileSprite:(x:number,y:number,width:number,height:number,key:string,frame:string)=>{const tile=object(x,y);Object.assign(tile,{width,height,key,frame});tiles.push(tile);return tile;},text:()=>object(),graphics:()=>object()};
 const scene:any={events,game:{events,loop:{delta:50}},textures,add,sys:{isActive:()=>true},physics:{world:{isPaused:false}}};
 const ledges=chapterPlatforms(kind).filter(surface=>(surface.room??Math.floor(surface.x/1440))===section&&surface.role==='ledge');
 const surfaces=ledges.map(ledge=>({ledge,shape:{x:ledge.x,y:ledge.y,body:{enable:true,left:ledge.x-ledge.width/2,right:ledge.x+ledge.width/2,top:ledge.y-16,bottom:ledge.y+16,updateFromGameObject(){this.left=ledge.x-ledge.width/2;this.right=ledge.x+ledge.width/2;this.top=ledge.y-16;this.bottom=ledge.y+16;}}},art:object(ledge.x,ledge.y-16)}));
 const body:any={center:{x:section*1440+800,y:400},left:section*1440+788,right:section*1440+812,top:360,bottom:400,position:{x:0,y:0},prev:{x:0,y:0},velocity:{x:0,y:0}},player:any={active:true,body,grounded:true,isDashing:false,usingUltimate:false,sprite:{x:body.center.x,y:body.center.y},takeDamage:()=>false};
 const traps=new ChapterTraps(scene,player,kind,surfaces as any,[section]);
 return {traps,player,surfaces,scene,tiles,canvases,nativeHeight};
}
const visible=()=>{vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('window',{matchMedia:()=>({matches:false})});};
const setPlayer=(player:any,x:number,y:number)=>{const b=player.body;b.center.x=x;b.center.y=y;b.left=x-12;b.right=x+12;b.top=y-20;b.bottom=y+20;};
const phase=(direction:number,strength:number,now:number)=>((-direction*strength*now/1000*2)%40+40)%40;

function testAuthoredConveyors(kind:'outside'|'crimson',section:number){
 visible();const state=harness(kind,section),specials=(state.traps as any).specials.get(section) as any[];
 const expected=encounterSurfaceEffects(encounterFor(kind,section)!).filter(effect=>effect.type==='conveyor');
 const conveyors=specials.filter(special=>special.type==='conveyor');
 expect(conveyors.length).toBeGreaterThan(0);expect(conveyors.every(special=>special.deck)).toBe(true);
 expect(specials.filter(special=>special.type!=='conveyor').every(special=>special.deck===undefined)).toBe(true);
 expect(conveyors.length).toBe(expected.length);
 for(const effect of expected)expect(conveyors.some(special=>special.surface.ledge===state.surfaces[effect.platformIndex]!.ledge&&special.strength===effect.strength&&special.direction===effect.direction)).toBe(true);
 for(const special of conveyors){
  const frameHeight=state.nativeHeight,cropY=kind==='outside'?4:11;
  expect(special.deck.width).toBe(special.surface.ledge.width-8);expect(special.deck.height).toBe(8);
  expect(special.deck.x).toBe(special.surface.art.x);expect(special.deck.y).toBeCloseTo(special.surface.art.y+cropY*48/frameHeight);
  expect(special.deck.depth).toBe(special.surface.art.depth+.01);
 }
 const press=(state.traps as any).presses.get(section) as any[]|undefined;
 if(kind==='crimson'&&section===4)expect(press?.length).toBeGreaterThan(0);
 if(press)expect(press.every(entry=>!('deck' in entry))).toBe(true);
 vi.unstubAllGlobals();
}

describe('conveyor belt visual motion',()=>{
 it('wires every authored outside and Crimson conveyor to a narrow deck, leaving press and other specials unskinned',()=>{
  testAuthoredConveyors('outside',3);testAuthoredConveyors('crimson',4);testAuthoredConveyors('crimson',6);
  visible();const ferries=harness('crimson',5),nonConveyor=(ferries.traps as any).specials.get(5) as any[];expect(nonConveyor.length).toBeGreaterThan(0);expect(nonConveyor.every(special=>special.type!=='conveyor'&&special.deck===undefined)).toBe(true);vi.unstubAllGlobals();
 });
 it('scrolls with direction and authored strength while preserving chassis and exact player carry',()=>{
  visible();const {traps,player,surfaces}=harness('crimson',6),special=(traps as any).specials.get(6).find((entry:any)=>entry.type==='conveyor'),initial={shapeX:special.surface.shape.x,shapeY:special.surface.shape.y,artX:special.surface.art.x,artY:special.surface.art.y,ledgeX:special.surface.ledge.x,ledgeY:special.surface.ledge.y};
  setPlayer(player,special.surface.ledge.x,special.surface.ledge.y-36);const initialX=player.body.center.x,initialSpriteX=player.sprite.x;traps.update(50);
  expect(special.deck.tilePositionX).toBe(phase(special.direction,special.strength,50));
  expect(player.body.position.x).toBe(special.direction*special.strength*.05);expect(player.body.prev.x).toBe(special.direction*special.strength*.05);expect(player.sprite.x).toBe(initialSpriteX+special.direction*special.strength*.05);
  expect({shapeX:special.surface.shape.x,shapeY:special.surface.shape.y,artX:special.surface.art.x,artY:special.surface.art.y,ledgeX:special.surface.ledge.x,ledgeY:special.surface.ledge.y}).toEqual(initial);
  vi.unstubAllGlobals();
 });
 it('uses proportional signed speeds over a short live clock interval',()=>{
  visible();const lower=harness('outside',3),higher=harness('crimson',6),a=(lower.traps as any).specials.get(3).find((entry:any)=>entry.type==='conveyor'),b=(higher.traps as any).specials.get(6).find((entry:any)=>entry.type==='conveyor');
  lower.traps.update(10);higher.traps.update(10);
  const signedTravel=(direction:number,value:number)=>(((value+20)%40)-20)*-direction;
  const deltaA=signedTravel(a.direction,a.deck.tilePositionX),deltaB=signedTravel(b.direction,b.deck.tilePositionX);
  expect(deltaA).toBeCloseTo(2*a.strength*.01);expect(deltaB).toBeCloseTo(2*b.strength*.01);expect(deltaB/deltaA).toBeCloseTo(b.strength/a.strength);vi.unstubAllGlobals();
 });
 it('keeps absolute phase frozen through pause and resumes from the clock after culling',()=>{
  visible();const {traps,player,scene}=harness('crimson',6),special=(traps as any).specials.get(6).find((entry:any)=>entry.type==='conveyor');
  setPlayer(player,special.surface.ledge.x,special.surface.ledge.y-36);traps.update(50);
  expect(special.deck.tilePositionX).toBe(phase(special.direction,special.strength,50));
  const beforePause=(traps as any).clockMs;scene.physics.world.isPaused=true;traps.update(50);
  expect((traps as any).clockMs).toBe(beforePause);expect(special.deck.visible).toBe(false);
  scene.physics.world.isPaused=false;traps.update(50);expect((traps as any).clockMs).toBe(beforePause+50);
  expect(special.deck.tilePositionX).toBe(phase(special.direction,special.strength,beforePause+50));expect(special.deck.visible).toBe(true);
  const beforeCull=special.deck.tilePositionX;setPlayer(player,special.surface.ledge.x,1400);traps.update(50);expect(special.deck.visible).toBe(false);
  const afterCull=(traps as any).clockMs;expect(afterCull).toBe(beforePause+100);setPlayer(player,special.surface.ledge.x,special.surface.ledge.y-36);traps.update(50);
  expect(special.deck.visible).toBe(true);expect(special.deck.tilePositionX).toBe(phase(special.direction,special.strength,afterCull+50));expect(special.deck.tilePositionX).not.toBe(beforeCull);
  vi.unstubAllGlobals();
 });
 it('creates one cached 40 by 16 canvas per chapter while making separate overlays',()=>{
  const calls:any[]=[],cached=new Map<string,any>(),ctx={drawImage:(...args:any[])=>calls.push(args),fillRect:vi.fn(),set fillStyle(_value:string){}};
  const texture:any={has:()=>true,get:()=>({cutX:100,cutY:200,width:300,height:48}),getSourceImage:()=>({})},can={getContext:()=>ctx,add:vi.fn(),refresh:vi.fn()},tiles:any[]=[],scene:any={textures:{exists:(key:string)=>key===identityTexture('outside')||cached.has(key),get:()=>texture,createCanvas:vi.fn((key:string,w:number,h:number)=>{expect([w,h]).toEqual([40,16]);cached.set(key,can);return can;})},add:{tileSprite:(...args:any[])=>{tiles.push(args);return object();}}};
  addConveyorBeltDeck(scene,'outside',{x:10,y:20,width:92,depth:2.01});addConveyorBeltDeck(scene,'outside',{x:110,y:25,width:122,depth:2.01});
  expect(calls[0].slice(1,5)).toEqual([184,204,56,22]);expect(scene.textures.createCanvas).toHaveBeenCalledTimes(1);expect(can.refresh).toHaveBeenCalledTimes(1);
  expect(tiles).toHaveLength(2);expect(tiles[0]).toEqual([10,20,92,8,'conveyor-deck-outside','deck']);expect(tiles[1]).toEqual([110,25,122,8,'conveyor-deck-outside','deck']);
 });
});
