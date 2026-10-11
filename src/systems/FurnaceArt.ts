import { FURNACE_TYPOGRAPHY } from './FurnaceTypography';
import type Phaser from 'phaser';
export const CHAPTER5_DASH_ART_SIZE=Object.freeze({width:126,height:88});
export const FRANKLIN_IMAGE_FX_POOL_SIZE=16;

/** Native measured crops from the authored Chapter 5 utility/climax atlases. */
const UTILITY = [
  ['vent',15,150,310,90],['flame-0',350,55,296,230],['flame-1',650,35,296,250],['flame-2',952,20,302,265],
  ['circuit-1',40,315,265,305],['circuit-2',350,315,270,305],['circuit-3',640,315,270,305],['ember',920,315,334,305],
  ['warning',0,650,355,260],['halo',355,635,285,290],['control-glow',640,635,270,290],['electric',910,635,344,290],
  ['gear',25,930,285,324],['cracks',325,930,295,324],['impact',630,930,280,324],['dash',915,930,339,324],
] as const;
const CLIMAX = [
  ['ultimate',0,0,750,690],['chip-target',750,25,545,650],['chip-burst',0,695,600,519],['panel',615,800,680,314],
] as const;
const LAVA_BASIN_FRAME = ['basin-lower',0,350,1983,360] as const;
const LAVA_SURFACE_FRAME = ['surface',0,48,2048,180] as const;
const LAVA_SPIT_FRAMES = Array.from({length:4},(_,i)=>[`spit-${i}`,i*543,0,543,724] as const);
/** Native measured crops from the transparent pump, straight feed pipe, and opposite outlet elbows. */
export const FURNACE_LAVA_FEED_ATLAS_SIZE = Object.freeze({width:1536,height:1024});
export const FURNACE_LAVA_FEED_FRAMES = Object.freeze({
  pump: Object.freeze({x:704,y:8,width:420,height:492}),
  conduitRailLeft: Object.freeze({x:190,y:350,width:64,height:180}),
  conduitRailRight: Object.freeze({x:326,y:350,width:64,height:180}),
  conduitMolten: Object.freeze({x:260,y:350,width:66,height:180}),
  outletRight: Object.freeze({x:470,y:536,width:420,height:410}),
  outletLeft: Object.freeze({x:916,y:536,width:426,height:410}),
});
export function registerFurnaceFrames(scene: Phaser.Scene): void {
  if(scene.textures.exists('furnace-lava-basin')){const texture=scene.textures.get('furnace-lava-basin'),[name,x,y,width,height]=LAVA_BASIN_FRAME;if(!texture.has(name))texture.add(name,0,x,y,width,height);}
  if(scene.textures.exists('furnace-lava-surface')){const texture=scene.textures.get('furnace-lava-surface'),[name,x,y,width,height]=LAVA_SURFACE_FRAME;if(!texture.has(name))texture.add(name,0,x,y,width,height);}
  if(scene.textures.exists('furnace-lava-spit')){const texture=scene.textures.get('furnace-lava-spit');for(const[name,x,y,width,height]of LAVA_SPIT_FRAMES)if(!texture.has(name))texture.add(name,0,x,y,width,height);}
  if(scene.textures.exists('furnace-lava-feed')){
    const texture=scene.textures.get('furnace-lava-feed');
    for(const [name,frame] of Object.entries(FURNACE_LAVA_FEED_FRAMES))if(!texture.has(name))texture.add(name,0,frame.x,frame.y,frame.width,frame.height);
  }
  for (const [key, names] of [['furnace-utility',UTILITY],['furnace-climax',CLIMAX]] as const) {
    if (!scene.textures.exists(key)) continue;
    const texture=scene.textures.get(key);
    for(const [name,x,y,width,height] of names)if(!texture.has(name))texture.add(name,0,x,y,width,height);
  }
  if(scene.textures.exists('chapter5-typography')){const texture=scene.textures.get('chapter5-typography');for(const[name,f]of Object.entries(FURNACE_TYPOGRAPHY))if(!texture.has(name))texture.add(name,0,f.x,f.y,f.width,f.height);}
}

export interface FurnaceBackdrop {floor:number;embers:Phaser.GameObjects.Image[];}
export function addFurnaceBackdrop(scene:Phaser.Scene,start:number,width:number,floor:number):FurnaceBackdrop {
  const wall=scene.add.tileSprite(start+width/2,floor-200,width,1400,'furnace-backdrop').setOrigin(.5).setDepth(-18).setTint(0x999999);
  wall.tilePositionX=start;
  const embers:Phaser.GameObjects.Image[]=[];
  for(let i=0;i<3;i++)embers.push(scene.add.image(start+80+i*width/3,floor-70-i*23,'furnace-utility','ember').setDisplaySize(20,20).setDepth(-10).setVisible(false));
  return {floor,embers};
}
export function updateFurnaceBackdrop(backdrop:FurnaceBackdrop,clockMs:number,visible=true):void {
  const t=clockMs*.025;for(let i=0;i<backdrop.embers.length;i++)backdrop.embers[i].setVisible(visible).setY(backdrop.floor-30-((t+i*53)%260)).setAlpha(.25+((i%3)/6));
}

export type FurnaceFxFrame = typeof UTILITY[number][0] | typeof CLIMAX[number][0];
export function furnaceFxTexture(frame: FurnaceFxFrame): 'furnace-utility' | 'furnace-climax' {
 return CLIMAX.some(([name])=>name===frame) ? 'furnace-climax' : 'furnace-utility';
}
