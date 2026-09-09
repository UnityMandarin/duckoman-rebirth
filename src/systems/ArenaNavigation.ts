import {CASTLE_PLATFORMS} from '../data/castle';
export interface Ledge {x:number;top:number;width:number;}
export const ARENA_LEDGES:Ledge[]=CASTLE_PLATFORMS.filter(p=>p.x>=8960)
  .sort((a,b)=>b.height-a.height).map(p=>({x:p.x,top:p.y-p.height/2,width:p.width}));
export function support(x:number,bottom:number):number {
  let best=0,distance=Infinity;
  ARENA_LEDGES.forEach((p,i)=>{const d=Math.abs(p.top-bottom);if(Math.abs(p.x-x)<p.width/2+25&&d<distance){best=i;distance=d;}});
  return best;
}
export function connected(a:Ledge,b:Ledge):boolean {
  const rise=a.top-b.top,gap=Math.max(0,Math.abs(a.x-b.x)-(a.width+b.width)/2);
  return rise<=115&&gap<=120;
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
