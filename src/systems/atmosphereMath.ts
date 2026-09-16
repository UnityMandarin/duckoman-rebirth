/** Equivalent damping at 30, 60 and 120 Hz; capped only for tab-resume stalls. */
export function damp(current:number,target:number,rate:number,deltaMs:number):number {
 return current+(target-current)*(1-Math.exp(-rate*Math.max(0,Math.min(deltaMs,100))/1000));
}
export function particleOpacity(age:number,lifetime:number,maximum:number):number {
 return Math.max(0,Math.min(1,age/650,(lifetime-age)/1100))*maximum;
}
export function projectedX(worldX:number,scrollX:number,factor:number):number{return worldX-scrollX*factor;}
export function particleInView(x:number,y:number,width:number,height:number):boolean {
 return x>=-140&&x<=width+140&&y>=-160&&y<=height+100;
}
