import { describe, expect, it } from 'vitest';
import { CHAPTER_WIDTH } from '../src/data/chapters';
import { createEnvironmentPlan } from '../src/data/worldEnvironment';
import { CONNECTOR_VARIANTS, SCENIC_CHAPTER_BUDGET_MIB, SCENIC_NATIVE_SIZE, SCENIC_SCROLL, SCENIC_ZONES, scenicTiles, scenicWindow } from '../src/data/scenicZones';

describe('V3 scenic journey', () => {
  it('defines sixteen distinct contiguous scenic zones at the authored world bounds', () => {
    const expected = { castle:[4300,7380,11520], jail:[5760,11520,17280], outside:[5760,11520,17280,21600,25920,31680,34560], crimson:[4320,12960,17280] } as const;
    expect(Object.values(SCENIC_ZONES).flat()).toHaveLength(16);
    for (const [kind, ends] of Object.entries(expected) as [keyof typeof expected, readonly number[]][]) {
      const zones=SCENIC_ZONES[kind], plan=createEnvironmentPlan(kind);
      expect(zones.map(z=>z.end)).toEqual(ends);
      expect(zones.at(-1)!.end).toBe(plan.width);
      zones.forEach((zone,i)=>{
        expect(zone.start).toBe(i?zones[i-1]!.end:0);
        expect(zone.name).toContain(kind==='castle'?'castle':kind);
        if(i) expect(zone.connector).toBeGreaterThanOrEqual(0);
      });
      if(kind!=='castle') expect(plan.width).toBe(CHAPTER_WIDTH[kind]);
    }
    expect(CONNECTOR_VARIANTS).toEqual({castle:2,jail:2,outside:3,crimson:2});
    expect(SCENIC_NATIVE_SIZE).toEqual({width:1536,height:1024});
    expect(SCENIC_CHAPTER_BUDGET_MIB).toBe(60);
  });

  it('projects the distant scenery at .8 horizontally and full speed vertically', () => {
    expect(SCENIC_SCROLL).toBe(.8);
    for(const kind of Object.keys(SCENIC_ZONES) as (keyof typeof SCENIC_ZONES)[]){
      const plan=createEnvironmentPlan(kind);
      expect(plan.farScroll).toEqual([SCENIC_SCROLL,1]);
      // One camera pixel of horizontal travel moves the field by .8px; foreground remains 1px.
      expect(1*plan.farScroll[0]).toBeCloseTo(.8);
    }
  });

  it('covers zone interiors and terminal camera edges with native, isotropic tiles',()=>{
    for(const kind of Object.keys(SCENIC_ZONES) as (keyof typeof SCENIC_ZONES)[]){
      const plan=createEnvironmentPlan(kind), zones=SCENIC_ZONES[kind];
      const all=zones.flatMap(zone=>scenicTiles(plan,zone,SCENIC_NATIVE_SIZE.width));
      expect(all.length).toBeGreaterThan(zones.length);
      expect(all[0]!.x).toBe(-640);
      const projectedEnd=all.at(-1)!.x+all.at(-1)!.sourceWidth*plan.farScale;
      expect(projectedEnd).toBeCloseTo(plan.width*SCENIC_SCROLL+640);
      for(const zone of zones){
        const tiles=scenicTiles(plan,zone,SCENIC_NATIVE_SIZE.width);
        expect(tiles[0]!.x).toBe(zone.start===0?-640:zone.start*SCENIC_SCROLL);
        for(let i=1;i<tiles.length;i++) expect(tiles[i]!.x).toBeCloseTo(tiles[i-1]!.x+tiles[i-1]!.sourceWidth*plan.farScale);
        expect(tiles.every(t=>t.sourceWidth<=SCENIC_NATIVE_SIZE.width+0.001&&t.sourceWidth>0), JSON.stringify({kind,zone,tiles})).toBe(true);
      }
      expect(plan.top-128+SCENIC_NATIVE_SIZE.height*plan.farScale).toBeGreaterThanOrEqual(plan.bottom);
    }
  });

  it('keeps original tile phase in preview windows and includes adjacent scenic context',()=>{
    const plan=createEnvironmentPlan('outside'), zone=SCENIC_ZONES.outside[3]!;
    const full=scenicTiles(plan,zone,SCENIC_NATIVE_SIZE.width), preview=scenicTiles(plan,zone,SCENIC_NATIVE_SIZE.width,[13*1440,14*1440]);
    expect(preview.length).toBeGreaterThan(0);
    for(const tile of preview) {
      const globalTileStart=zone.start*SCENIC_SCROLL+tile.index*SCENIC_NATIVE_SIZE.width*plan.farScale;
      expect(tile.x).toBeGreaterThanOrEqual(globalTileStart-0.001);
      expect(tile.x).toBeLessThan(globalTileStart+SCENIC_NATIVE_SIZE.width*plan.farScale);
    }
    expect(scenicWindow('outside',[13*1440,14*1440]).map(z=>z.name)).toEqual(['outside-woodland','outside-river','outside-ancient']);
    expect(scenicWindow('outside',[22*1440,CHAPTER_WIDTH.outside-400]).map(z=>z.name)).toEqual(['outside-border','outside-regent']);
  });
});
