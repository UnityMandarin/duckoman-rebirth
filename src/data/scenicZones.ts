import type {EnvironmentKind, EnvironmentPlan, Interval} from './worldEnvironment';

export interface ScenicZone {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  /** Connector at this zone's entrance; first zone has no entrance cut. */
  readonly connector: number;
}
const zone = (name:string,start:number,end:number,connector:number):ScenicZone => ({name,start,end,connector});
export const SCENIC_ZONES:Readonly<Record<EnvironmentKind,readonly ScenicZone[]>>={
  castle:[zone('castle-archive',0,4300,0),zone('castle-foundry',4300,7380,0),zone('castle-audience',7380,11520,1)],
  jail:[zone('jail-cells',0,5760,0),zone('jail-gallery',5760,11520,0),zone('jail-drains',11520,17280,1)],
  outside:[zone('outside-city',0,5760,0),zone('outside-orchard',5760,11520,0),zone('outside-woodland',11520,17280,1),zone('outside-river',17280,21600,2),zone('outside-ancient',21600,25920,1),zone('outside-border',25920,31680,2),zone('outside-regent',31680,34560,1)],
  crimson:[zone('crimson-border',0,4320,0),zone('crimson-works',4320,12960,0),zone('crimson-vault',12960,17280,1)],
};
export const SCENIC_SCROLL = .8;
export const SCENIC_NATIVE_SIZE = Object.freeze({width:1536,height:1024});
export const SCENIC_CHAPTER_BUDGET_MIB = 60;
export const CONNECTOR_VARIANTS:Readonly<Record<EnvironmentKind,number>>={castle:2,jail:2,outside:3,crimson:2};
/** Native atlas X centers of the selected, fully opaque continuous vertical cores. */
export const CONNECTOR_CORE_CENTERS:Readonly<Record<EnvironmentKind,readonly number[]>>={
  castle:[384,1152],jail:[384,1152],outside:[256,768,1280],crimson:[384,1152],
};
/** Measured native full-height alpha>=240 spine widths; Crimson's are narrower. */
export const CONNECTOR_CORE_WIDTHS:Readonly<Record<EnvironmentKind,readonly number[]>>={
  castle:[48,48],jail:[48,48],outside:[48,48,48],crimson:[32,32],
};

export interface ScenicTile {
  readonly zone: ScenicZone;
  readonly index: number;
  readonly x: number;
  readonly sourceX: number;
  readonly sourceWidth: number;
  readonly repeatJoin: boolean;
}
/** One projected scene space; clipping creates native image frames, never stretched room pictures. */
export function scenicTiles(plan:EnvironmentPlan,zone:ScenicZone,sourceWidth:number,bounds?:Interval):ScenicTile[]{
  const phase=zone.start*SCENIC_SCROLL,tileWidth=sourceWidth*plan.farScale;
  const left=zone.start===0?-640:phase;
  const right=zone.end*SCENIC_SCROLL+(zone.end===plan.width?640:0);
  // Include camera viewport plus terminal padding. Preview keeps original tile indices/phase.
  const visibleLeft=bounds?bounds[0]*SCENIC_SCROLL-640:left;
  const visibleRight=bounds?bounds[1]*SCENIC_SCROLL+640:right;
  const first=Math.floor((Math.max(left,visibleLeft)-phase)/tileWidth);
  const last=Math.ceil((Math.min(right,visibleRight)-phase)/tileWidth);
  const tiles:ScenicTile[]=[];
  for(let index=first;index<last;index++){
    const nativeLeft=phase+index*tileWidth,start=Math.max(left,nativeLeft),end=Math.min(right,nativeLeft+tileWidth);
    if(end<=start)continue;
    tiles.push({zone,index,x:start,sourceX:(start-nativeLeft)/plan.farScale,sourceWidth:(end-start)/plan.farScale,
      repeatJoin:nativeLeft>left&&nativeLeft<right&&start===nativeLeft});
  }
  return tiles;
}

/** Neighbor zones remain available through the middle passage, without loading full-chapter objects. */
export function scenicWindow(kind:EnvironmentKind,bounds?:Interval):readonly ScenicZone[]{
  const zones=SCENIC_ZONES[kind];
  if(!bounds)return zones;
  const first=zones.findIndex(z=>z.end>bounds[0]);
  let last=zones.findIndex(z=>z.start>=bounds[1]);if(last<0)last=zones.length;
  return zones.slice(Math.max(0,first-1),Math.min(zones.length,last+1));
}
