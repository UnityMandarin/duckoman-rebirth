export interface Ledge {x:number;top:number;width:number;}
export const ARENA_LEDGES:Ledge[]=[
  {x:9620,top:360,width:1190}, {x:9170,top:268,width:180},
  {x:9430,top:188,width:180}, {x:9690,top:108,width:180},
  {x:9950,top:188,width:180}, {x:10130,top:268,width:160},
  {x:9660,top:288,width:180}
];
export function support(x:number,bottom:number):number {
  let best=0,distance=Infinity;
  ARENA_LEDGES.forEach((p,i)=>{const d=Math.abs(p.top-bottom);if(Math.abs(p.x-x)<p.width/2+25&&d<distance){best=i;distance=d;}});
  return best;
}
export function connected(a:Ledge,b:Ledge):boolean {
  const rise=a.top-b.top,gap=Math.max(0,Math.abs(a.x-b.x)-(a.width+b.width)/2);
  return rise<=150&&gap<=120;
}
export function nextLedge(from:number,to:number):number {
  const queue:number[][]=[[from]],seen=new Set([from]);
  while(queue.length) {
    const path=queue.shift()!,last=path[path.length-1];
    if(last===to)return path[1]??from;
    for(let i=0;i<ARENA_LEDGES.length;i++)if(!seen.has(i)&&connected(ARENA_LEDGES[last],ARENA_LEDGES[i])) {seen.add(i);queue.push([...path,i]);}
  }
  return from;
}
