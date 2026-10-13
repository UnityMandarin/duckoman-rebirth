import { describe, expect, it } from 'vitest';
import { createEnvironmentPlan } from '../src/data/worldEnvironment';
import { CONNECTOR_CORE_CENTERS, CONNECTOR_VARIANTS, SCENIC_NATIVE_SIZE, SCENIC_SCROLL, SCENIC_ZONES, scenicTiles } from '../src/data/scenicZones';
import { addScenicEnvironment } from '../src/systems/ScenicEnvironment';
import { addWorldEnvironment } from '../src/systems/WorldEnvironment';

function render(kind:'castle'|'jail'|'outside'|'crimson',bounds?:readonly [number,number]){
  const images:{x:number;y:number;key:string;frame:string;scale?:number;scroll?:number[];depth?:number;name?:string}[]=[];
  const frames=new Map<string,Set<string>>();
  const frameOrigins=new Map<string,number[]>();
  const texture=(key:string)=>({
    getSourceImage:()=>({width:1536,height:1024}),
    has:(name:string)=>frames.get(key)?.has(name)??false,
    add:(name:string,_sourceIndex:number,x:number,y:number,width:number,height:number)=>{const set=frames.get(key)??new Set<string>();set.add(name);frames.set(key,set);frameOrigins.set(`${key}:${name}`,[x,y,width,height]);},
  });
  const scene={textures:{get:texture},add:{image:(x:number,y:number,key:string,frame='__BASE')=>{
    const item={x,y,key,frame} as (typeof images)[number];images.push(item);
    const obj:any={setOrigin:()=>obj,setScale:(scale:number)=>{item.scale=scale;return obj;},setScrollFactor:(...scroll:number[])=>{item.scroll=scroll;return obj;},setDepth:(depth:number)=>{item.depth=depth;return obj;},setName:(name:string)=>{item.name=name;return obj;}};return obj;
  }}};
  addScenicEnvironment(scene as any,createEnvironmentPlan(kind),bounds);
  return {images,frames,frameOrigins};
}

describe('scenic environment renderer',()=>{
  it('uses full base images plus preview-specific terminal crops with a fixed global parallax',()=>{
    const full=render('outside').images.filter(i=>i.name==='world-environment-far');
    const preview=render('outside',[13*1440,14*1440]).images.filter(i=>i.name==='world-environment-far');
    expect(full.length).toBeGreaterThan(10);
    expect(full.every(i=>i.scale===1.2&&i.scroll?.[0]===.8&&i.scroll[1]===1)).toBe(true);
    expect(full.some(i=>i.frame==='__BASE')).toBe(true);
    const cropped=preview.filter(i=>i.frame!=='__BASE');
    expect(cropped.length).toBeGreaterThan(0);
    expect(cropped.every(i=>i.frame.startsWith('scenic-tile-'))).toBe(true);
    expect(preview.length).toBeLessThan(full.length/3);
    expect(preview.every(i=>i.y===createEnvironmentPlan('outside').top-128)).toBe(true);
  });


  it('keeps full-chapter scenery and collision-rooted structures below the object cap',()=>{
    for(const kind of ['castle','jail','outside','crimson'] as const){
      let count=0;
      const texture={getSourceImage:()=>({width:1536,height:1024}),has:()=>false,get:()=>({height:240}),add:()=>{}};
      const scene:any={textures:{get:()=>texture},add:{image:()=>{count++;const obj:any={setOrigin:()=>obj,setScale:()=>obj,setScrollFactor:()=>obj,setDepth:()=>obj,setTint:()=>obj,setFlipX:()=>obj,setAlpha:()=>obj,setName:()=>obj};return obj;}}};
      addWorldEnvironment(scene,kind);
      expect(count,kind).toBeLessThan(300);
    }
  });

  it('uses each full native atlas cell and aligns its measured core on transitions and repeat joins',()=>{
    for(const kind of ['castle','jail','outside','crimson'] as const){
      const {images,frames,frameOrigins}=render(kind),key=`world-v3-${kind}-connectors`;
      const plan=createEnvironmentPlan(kind),count=CONNECTOR_VARIANTS[kind],cellWidth=SCENIC_NATIVE_SIZE.width/count;
      expect(CONNECTOR_CORE_CENTERS[kind]).toHaveLength(count);
      const connectors=images.filter(i=>i.name==='world-environment-connector');
      expect(connectors.length).toBeGreaterThan(SCENIC_ZONES[kind].length-1);
      expect([...frames.get(key)!].sort()).toEqual(Array.from({length:count},(_,i)=>`connector-${i}`));
      CONNECTOR_CORE_CENTERS[kind].forEach((coreCenter,variant)=>{
        const cellCenter=(variant+.5)*cellWidth;
        expect(frameOrigins.get(`${key}:connector-${variant}`)).toEqual([variant*cellWidth,0,cellWidth,1024]);
        const frameImages=connectors.filter(i=>i.frame===`connector-${variant}`);
        expect(frameImages.length).toBeGreaterThan(0);
        expect(frameImages.every(i=>i.scale===createEnvironmentPlan(kind).farScale&&i.scroll?.[0]===.8&&i.scroll[1]===1)).toBe(true);
        expect(frameImages.every(image=>image.name==='world-environment-connector')).toBe(true);
        // The full atlas cell is centered on the boundary by its measured opaque core.
        expect(frameImages.map(image=>image.x+coreCenter-cellCenter).every(Number.isFinite)).toBe(true);
      });
      const expectedSeams=SCENIC_ZONES[kind].flatMap(zone=>[
        ...(zone.start>0?[zone.start*SCENIC_SCROLL]:[]),
        ...scenicTiles(plan,zone,SCENIC_NATIVE_SIZE.width).filter(tile=>tile.repeatJoin).map(tile=>tile.x),
      ]).sort((a,b)=>a-b);
      const actualSeams=connectors.map(image=>{
        const variant=Number(image.frame.split('-')[1]);
        return image.x+CONNECTOR_CORE_CENTERS[kind][variant]!-(variant+.5)*cellWidth;
      }).sort((a,b)=>a-b);
      expect(actualSeams).toHaveLength(expectedSeams.length);
      expectedSeams.forEach((seam,index)=>expect(actualSeams[index]).toBeCloseTo(seam));
    }
  });
});
