import { describe, expect, it } from 'vitest';
import { FURNACE_TYPOGRAPHY } from '../src/systems/FurnaceTypography';
import { FURNACE_ROOMS } from '../src/data/furnace';
import franklinSource from '../src/entities/FranklinFox.ts?raw';
import { readFileSync } from 'node:fs';
import { registerFurnaceFrames, furnaceFxTexture, FURNACE_LAVA_FEED_ATLAS_SIZE, FURNACE_LAVA_FEED_FRAMES } from '../src/systems/FurnaceArt';
import typographySvg from '../public/assets/chapter5/furnace-art/typography.svg?raw';
import { CHAPTER5_DASH_ART_SIZE, FRANKLIN_IMAGE_FX_POOL_SIZE } from '../src/systems/FurnaceArt';

class FakeTexture {
  frames=new Map<string,{x:number;y:number;width:number;height:number}>();
  has(key:string):boolean{return this.frames.has(key);}
  add(key:string,_source:number,x:number,y:number,width:number,height:number):void{this.frames.set(key,{x,y,width,height});}
}
class FakeTextures {
  textures=new Map<string,FakeTexture>();
  exists(key:string):boolean{return this.textures.has(key);}
  get(key:string):FakeTexture{return this.textures.get(key)!;}
  add(key:string):void{this.textures.set(key,new FakeTexture());}
}

describe('Chapter 5 authored frame presentation',()=>{
  it('registers the measured utility, climax, fixed-type and shallow lava frames within their images',()=>{
    const textures=new FakeTextures();textures.add('furnace-lava-basin');textures.add('furnace-lava-surface');textures.add('furnace-lava-spit');textures.add('furnace-lava-feed');textures.add('furnace-utility');textures.add('furnace-climax');textures.add('chapter5-typography');
    registerFurnaceFrames({textures} as any);
    expect(textures.get('furnace-lava-basin').frames.get('basin-lower')).toEqual({x:0,y:350,width:1983,height:360});
    expect(textures.get('furnace-lava-surface').frames.get('surface')).toEqual({x:0,y:48,width:2048,height:180});
    expect(textures.get('furnace-lava-spit').frames.get('spit-3')).toEqual({x:1629,y:0,width:543,height:724});
    expect(textures.get('furnace-lava-feed').frames.get('conduitMolten')).toEqual(FURNACE_LAVA_FEED_FRAMES.conduitMolten);
    expect(textures.get('furnace-utility').frames.get('dash')).toEqual({x:915,y:930,width:339,height:324});
    expect(textures.get('furnace-utility').frames.get('warning')).toEqual({x:0,y:650,width:355,height:260});
    expect(textures.get('furnace-climax').frames.get('panel')).toEqual({x:615,y:800,width:680,height:314});
    expect(textures.get('chapter5-typography').frames.get('story-2')).toEqual(FURNACE_TYPOGRAPHY['story-2']);
    expect(textures.get('chapter5-typography').frames.get('hp')).toEqual(FURNACE_TYPOGRAPHY.hp);
    expect(textures.get('chapter5-typography').frames.get('sleep-z')).toEqual(FURNACE_TYPOGRAPHY['sleep-z']);
    const maps=[['furnace-utility',1254,1254],['furnace-climax',1295,1214],['chapter5-typography',1020,1412]] as const;
    for(const[key,width,height]of maps)for(const frame of textures.get(key).frames.values())expect(frame.x+frame.width<=width&&frame.y+frame.height<=height).toBe(true);
    for(const frame of Object.values(FURNACE_LAVA_FEED_FRAMES))expect(frame.x+frame.width<=FURNACE_LAVA_FEED_ATLAS_SIZE.width&&frame.y+frame.height<=FURNACE_LAVA_FEED_ATLAS_SIZE.height).toBe(true);
  });

  it('matches the registered pump, 32px repeating conduit, and directional outlets to the real transparent atlas',()=>{
    const png=readFileSync('public/assets/chapter5/furnace-art/lava-feed.png','utf8');
    const pngDimension=(offset:number)=>[0,1,2,3].reduce((value,i)=>(value<<8)|png.charCodeAt(offset+i),0);
    expect(pngDimension(16)).toBe(FURNACE_LAVA_FEED_ATLAS_SIZE.width);expect(pngDimension(20)).toBe(FURNACE_LAVA_FEED_ATLAS_SIZE.height);
    const stationaryCaseWidth=(FURNACE_LAVA_FEED_FRAMES.conduitRailLeft.width+FURNACE_LAVA_FEED_FRAMES.conduitRailRight.width)*32/180;
    expect(stationaryCaseWidth).toBeLessThanOrEqual(24);expect(stationaryCaseWidth).toBeGreaterThanOrEqual(16);
    expect(FURNACE_LAVA_FEED_FRAMES.conduitMolten.height).toBe(180);
    const textures=new FakeTextures();textures.add('furnace-lava-feed');registerFurnaceFrames({textures} as any);
    for(const[name,frame]of Object.entries(FURNACE_LAVA_FEED_FRAMES))expect(textures.get('furnace-lava-feed').frames.get(name)).toEqual(frame);
  });

  it('keeps the static typography as text-only SVG images and preserves authored copy',()=>{
    expect(typographySvg).not.toContain('textLength');expect(typographySvg).toContain('font-weight="bold"');expect(typographySvg).toContain('fill="#ffe2ad"');expect(typographySvg).toContain('CHAPTER COMPLETE');
    const lines=[...typographySvg.matchAll(/<text[^>]*fill="#ffe2ad"[^>]*>(.*?)<\/text>/g)].map(m=>m[1]).join(' ');
    for(const room of FURNACE_ROOMS)if(room.story)expect(lines).toContain(room.story);
    expect(lines).toContain('Checkpoint · Half a heart restored.');expect(lines).toContain('Franklin Fox — one of Duckoman’s best friends. A control chip is forcing him to fight.');
    expect(FURNACE_TYPOGRAPHY['story-2'].height/2).toBeGreaterThan(30);expect(FURNACE_TYPOGRAPHY.menu.width).toBeLessThan(130);
    expect(typographySvg).not.toMatch(/<(?:rect|circle|path|line|polygon)\b/i);
  });

  it('resolves every Franklin FX frame to an existing named atlas crop',()=>{
    const textures=new FakeTextures();textures.add('furnace-utility');textures.add('furnace-climax');registerFurnaceFrames({textures} as any);
    const source=franklinSource;
    for(const match of source.matchAll(/this\.fx\([^,]+,'([^']+)'/g)){const frame=match[1] as Parameters<typeof furnaceFxTexture>[0];expect(textures.get(furnaceFxTexture(frame)).has(frame)).toBe(true);}
    expect(furnaceFxTexture('chip-burst')).toBe('furnace-climax');expect(furnaceFxTexture('chip-target')).toBe('furnace-climax');
    expect(source).toContain('this.imageFx.forEach(image=>image.destroy())');
  });
  it('uses a deployment-relative extracted panel only within Chapter 5 DOM classes',()=>{
    const css=readFileSync('src/styles.css','utf8');expect(css).not.toContain("url('/assets/chapter5");expect(css).toContain('.chapter5-image-controls kbd,.chapter5-image-controls .game-menu-control');expect(css).toContain('var(--chapter5-panel) center / 100% 100%');
  });

  it('bounds the dash artwork footprint and caps Franklin visual effects to a cleanable pool',()=>{
    expect(CHAPTER5_DASH_ART_SIZE.width).toBeLessThanOrEqual(126);expect(CHAPTER5_DASH_ART_SIZE.height).toBeLessThanOrEqual(88);
    expect(FRANKLIN_IMAGE_FX_POOL_SIZE).toBe(16);
  });
});
