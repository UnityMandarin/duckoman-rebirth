import type {LateChapterKey} from './lateChapters';

export interface LateAtmospherePlan {
 scale:number;parallaxX:number;parallaxY:number;tileWidth:number;tileHeight:number;top:number;minX:number;maxX:number;tileXs:number[];viewportHeight:number;
}

/** One unbroken native-proportion image band covers every camera position in a late chapter. */
export function lateAtmospherePlan(key:LateChapterKey,minCameraY:number,maxCameraY:number,nativeWidth:number,nativeHeight:number,viewportHeight=400):LateAtmospherePlan {
 const parallaxX=.22,parallaxY=key==='stormworks'?.18:.10,defaultScale=key==='stormworks'?1:1.6;
 const requiredHeight=(parallaxY*Math.max(0,maxCameraY-minCameraY-viewportHeight)+viewportHeight+256)/nativeHeight;
 const scale=nativeWidth===1536&&nativeHeight===1024?defaultScale:Math.max(defaultScale,requiredHeight),tileWidth=nativeWidth*scale,tileHeight=nativeHeight*scale,top=minCameraY*parallaxY-128;
 const minX=-640,maxX=(17280-640)*parallaxX+1280,tileXs:number[]=[];
 for(let x=minX;x<maxX;x+=tileWidth)tileXs.push(x);
 return {scale,parallaxX,parallaxY,tileWidth,tileHeight,top,minX,maxX,tileXs,viewportHeight};
}
