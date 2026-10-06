export interface TerrainSegment {kind:'full'|'partial';width:number;units?:number;}

/** Plan an exact strip using normal units and edge-preserving finished pieces. */
export function planTerrainAxis(length:number,unit:number):TerrainSegment[]{
 if(!(length>0)||!(unit>0))return [];
 const units=Math.floor(length/unit+1e-9),remainder=Math.max(0,length-units*unit),segments:TerrainSegment[]=[];
 if(remainder<=unit*1e-9){if(units)segments.push({kind:'full',width:units*unit,units});return segments;}
 if(remainder<unit*.25&&units>0){
  if(units>1)segments.push({kind:'full',width:(units-1)*unit,units:units-1});
  segments.push({kind:'partial',width:unit*.5},{kind:'partial',width:unit*.5+remainder});
 }else{
  if(units)segments.push({kind:'full',width:units*unit,units});
  segments.push({kind:'partial',width:remainder});
 }
 return segments;
}
