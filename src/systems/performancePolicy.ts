export type RenderQuality='smooth'|'sharp';
export const GRAPHICS_QUALITY_KEY='duckoman.graphics.v1';

export function parseRenderQuality(value:unknown):RenderQuality{return value==='sharp'?'sharp':'smooth';}

/** Render pixels per logical unit, preserving integer cover-fit and at least one pixel per unit. */
export function computeRenderScale(viewW:number,viewH:number,dpr:number,quality:RenderQuality):number {
 if(!Number.isFinite(viewW)||!Number.isFinite(viewH)||viewW<=0||viewH<=0)return 1;
 const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const cap=quality==='sharp'?2:1;
 return Math.max(1,Math.min(cap,Math.ceil(Math.min(viewW/640,viewH/400)*density)));
}

/** Stable chapter indices around the player's current section, clipped to valid chapter bounds. */
export function nearbySectionIndexes(section:number,sectionCount:number,radius=1):number[] {
 if(!Number.isFinite(section)||!Number.isFinite(sectionCount)||sectionCount<=0)return [];
 const count=Math.max(0,Math.floor(sectionCount)),center=Math.floor(section),reach=Math.max(0,Math.floor(radius));
 const start=Math.max(0,center-reach),end=Math.min(count-1,center+reach);
 const result:number[]=[];for(let i=start;i<=end;i++)result.push(i);return result;
}

/** Checks an object's projected bounds against a logical camera viewport plus a world-pixel margin. */
export function projectedInView(x:number,y:number,width:number,height:number,scrollX:number,scrollY:number,scrollFactorX:number,scrollFactorY:number,viewportW:number,viewportH:number,margin=120):boolean {
 const px=x-scrollX*scrollFactorX,py=y-scrollY*scrollFactorY;
 return px+width/2>=-margin&&px-width/2<=viewportW+margin&&py+height/2>=-margin&&py-height/2<=viewportH+margin;
}
