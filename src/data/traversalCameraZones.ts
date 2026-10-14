export type TraversalChapter = 'gate-1' | 'jail' | 'outside' | 'crimson' | 'rescue';

export interface TraversalCameraZone {
  id: string;
  chapter: TraversalChapter;
  /** Full-strength core in world coordinates; vertical coordinates use player feet. */
  x: readonly [number, number];
  feetY: readonly [number, number];
  zoomRatio: number;
  offsetY: number;
}

/** Reviewed camera placements for the authored blind drops in the route audit. */
export const TRAVERSAL_CAMERA_ZONES: readonly TraversalCameraZone[] = [
  {id:'jail-observation-walk-descent',chapter:'jail',x:[11000,11500],feetY:[80,390],zoomRatio:.85,offsetY:-120},
  {id:'jail-spiral-drain-descent',chapter:'jail',x:[11900,12920],feetY:[390,900],zoomRatio:.85,offsetY:-120},
  {id:'jail-catacomb-landing-descent',chapter:'jail',x:[13300,14355],feetY:[740,1250],zoomRatio:.85,offsetY:-120},
  {id:'jail-drainage-lock-descent',chapter:'jail',x:[14725,15800],feetY:[1080,1740],zoomRatio:.85,offsetY:-120},
  {id:'outside-canopy-descent',chapter:'outside',x:[6335,6915],feetY:[20,250],zoomRatio:1,offsetY:-100},
  {id:'outside-waterfall-descent',chapter:'outside',x:[15050,15765],feetY:[60,330],zoomRatio:1,offsetY:-100},
  {id:'outside-ancient-canopy-descent',chapter:'outside',x:[23635,24215],feetY:[20,290],zoomRatio:1,offsetY:-100},
  {id:'crimson-foundry-descent',chapter:'crimson',x:[4880,5455],feetY:[40,290],zoomRatio:1,offsetY:-100},
  {id:'rescue-furnace-heart-crossing',chapter:'rescue',x:[13152,13672],feetY:[-40,130],zoomRatio:.85,offsetY:0},
] as const;

export const TRAVERSAL_CAMERA_FEATHER = {horizontal:200,vertical:100,responseMs:300,maxDeltaMs:50} as const;
/** Authored camera/world extents used to keep feathering from leaking past a chapter. */
export const TRAVERSAL_CAMERA_ROUTE_BOUNDS:Record<TraversalChapter,{x:readonly [number,number];feetY:readonly [number,number]}>= {
  'gate-1':{x:[0,12800],feetY:[-160,620]},
  jail:{x:[0,17280],feetY:[-160,1840]},
  outside:{x:[0,34560],feetY:[-160,620]},
  crimson:{x:[0,17280],feetY:[-160,460]},
  rescue:{x:[0,16032],feetY:[-700,700]},
};

function smoothstep01(value:number):number {
  const t=Math.max(0,Math.min(1,value));
  return t*t*(3-2*t);
}

function axisWeight(value:number,range:readonly [number,number],feather:number):number {
  if(value<range[0])return smoothstep01(1-(range[0]-value)/feather);
  if(value>range[1])return smoothstep01(1-(value-range[1])/feather);
  return 1;
}

export interface TraversalCameraZoneSample {zone:TraversalCameraZone|null;weight:number;zoomRatio:number;offsetY:number;}

/** Spatially samples a fixed shot. The strongest authored zone wins; ties retain data order. */
export function sampleTraversalCameraZone(chapter:TraversalChapter,x:number,feetY:number):TraversalCameraZoneSample {
  const bounds=TRAVERSAL_CAMERA_ROUTE_BOUNDS[chapter];
  if(x<bounds.x[0]||x>bounds.x[1]||feetY<bounds.feetY[0]||feetY>bounds.feetY[1])return {zone:null,weight:0,zoomRatio:1,offsetY:0};
  let selected:TraversalCameraZone|null=null,weight=0;
  for(const zone of TRAVERSAL_CAMERA_ZONES){
    if(zone.chapter!==chapter)continue;
    const influence=Math.min(axisWeight(x,zone.x,TRAVERSAL_CAMERA_FEATHER.horizontal),axisWeight(feetY,zone.feetY,TRAVERSAL_CAMERA_FEATHER.vertical));
    if(influence>weight){selected=zone;weight=influence;}
  }
  return {zone:selected,weight,zoomRatio:1+(selected?selected.zoomRatio-1:0)*weight,offsetY:(selected?.offsetY??0)*weight};
}
