import {chapterPlatforms} from '../src/data/chapters';
import {floorVisual,platformVisual} from '../src/systems/ChapterVisuals';
import {RESCUE_SURFACES} from '../src/data/chapterVisuals';
import framesRaw from '../public/assets/identity/frames.json?raw';
import {describe,expect,it} from 'vitest';
import {planTerrainAxis} from '../src/systems/chapterTerrainPieces';

describe('finished terrain piece plans',()=>{
 it('keeps full units unchanged and closes quarter, half, and three-quarter tails exactly',()=>{
  for(const fraction of [.25,.5,.75]){
   const pieces=planTerrainAxis(3+fraction,1);
   expect(pieces[0]).toEqual({kind:'full',width:3,units:3});
   expect(pieces.at(-1)).toEqual({kind:'partial',width:fraction});
   expect(pieces.reduce((sum,piece)=>sum+piece.width,0)).toBeCloseTo(3+fraction);
  }
 });
 it('splits thin tails by borrowing the last full unit instead of making slivers',()=>{
  for(const tail of [1.35,2.58,4.30]){
   const pieces=planTerrainAxis(300+tail,100),last=pieces.slice(-2);
   expect(last).toHaveLength(2);expect(last.every(piece=>piece.kind==='partial')).toBe(true);
   expect(last.every(piece=>piece.width<=75&&piece.width>=50)).toBe(true);
   expect(pieces.reduce((sum,piece)=>sum+piece.width,0)).toBeCloseTo(300+tail);
  }
 });
 it('covers every authored chapter surface remainder from atlas measurements',()=>{
  const metadata=JSON.parse(framesRaw) as Record<string,{frames:Record<string,[number,number,number,number]>}>;
  let measuredRemainders=0,thinRemainders=0;
  for(const chapter of ['jail','outside','crimson'] as const){const floorIntervals=new Map<number,number>();for(const platform of chapterPlatforms(chapter)){const room=platform.room??Math.floor(platform.x/1440);if(platform.role==='ledge'){const frame=platformVisual(chapter,room,platform.step??0),height=frame==='shutter'?32:48,native=metadata[chapter]!.frames[frame]!,unit=native[2]*height/native[3],segments=planTerrainAxis(platform.width,unit);expect(segments.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(platform.width,7);const remainder=platform.width-Math.floor(platform.width/unit+1e-9)*unit;if(remainder>unit*1e-9){measuredRemainders++;if(remainder<unit*.25)thinRemainders++;}}else{const index=floorIntervals.get(room)??0;floorIntervals.set(room,index+1);const frame=floorVisual(chapter,room,index),nativeCap=metadata[chapter]!.frames[frame]!,capUnit=nativeCap[2]*Math.min(48,platform.height)/nativeCap[3],capPieces=planTerrainAxis(platform.width,capUnit),nativeFoundation=metadata[chapter]!.frames.foundation!,foundationScale=128/nativeFoundation[3],xPieces=planTerrainAxis(platform.width,nativeFoundation[2]*foundationScale),yPieces=planTerrainAxis(platform.height,128);expect(capPieces.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(platform.width,7);expect(xPieces.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(platform.width,7);expect(yPieces.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(platform.height,7);}}}
  expect(measuredRemainders).toBeGreaterThan(0);expect(thinRemainders).toBeGreaterThan(0);
  const rescue=metadata.rescue!,foundation=rescue.frames.foundation!,foundationScale=128/foundation[3],floorWidth=2000,floorHeight=240;
  const cap=rescue.frames[RESCUE_SURFACES.floor[0]!]!,capUnit=cap[2]*48/cap[3],capPieces=planTerrainAxis(floorWidth,capUnit),foundationX=planTerrainAxis(floorWidth,foundation[2]*foundationScale),foundationY=planTerrainAxis(floorHeight,128);
  expect(capPieces.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(floorWidth,7);expect(foundationX.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(floorWidth,7);expect(foundationY.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(floorHeight,7);
  const rescueWidths=[180,200,200];
  rescueWidths.forEach((width,step)=>{const frame=RESCUE_SURFACES.steps[step]!,native=rescue.frames[frame]!,unit=native[2]*48/native[3],segments=planTerrainAxis(width,unit);expect(segments.reduce((sum,segment)=>sum+segment.width,0)).toBeCloseTo(width,7);});
 });
 it('returns an exact 2D foundation partition including a partial bottom row',()=>{
  const columns=planTerrainAxis(5.4,1),rows=planTerrainAxis(2.6,1);
  const cells=columns.flatMap(column=>rows.map(row=>({width:column.width,height:row.width})));
  expect(cells.reduce((sum,cell)=>sum+cell.width*cell.height,0)).toBeCloseTo(5.4*2.6);
  expect(rows.slice(-1)[0]?.width).toBeCloseTo(.6);
  expect(columns[0]).toEqual({kind:'full',width:5,units:5});
 });
});
