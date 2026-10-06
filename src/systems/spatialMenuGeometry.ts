export function projectMenuBoard(anchorX:number,anchorY:number,scrollX:number,scrollY:number,qX:number,qY:number,settledX:number,settledY:number){return {x:(anchorX-scrollX)*qX,y:(anchorY-scrollY)*qY,scaleX:qX/settledX,scaleY:qY/settledY};}
export function pullbackTarget(x:number,y:number,qX:number,qY:number){return {scrollX:x-145/qX,scrollY:y-290/qY};}

export type SpatialMenuPhase='opening'|'ready'|'closing'|'closed';
export class SpatialMenuTransition {
 phase:SpatialMenuPhase;progress:number;
 constructor(alreadyReady=false){this.phase=alreadyReady?'ready':'opening';this.progress=alreadyReady?1:0;}
 get canAct():boolean{return this.phase==='ready';}
 get closing():boolean{return this.phase==='closing'||this.phase==='closed';}
 setProgress(value:number):void{this.progress=Math.max(0,Math.min(1,value));}
 markReady():void{if(this.phase==='opening')this.phase='ready';}
 beginClose():number|undefined{if(this.closing)return undefined;this.phase='closing';return Math.max(160,650*this.progress);}
 finishClose():boolean{if(this.phase!=='closing')return false;this.phase='closed';return true;}
}
export function cameraAtProgress(scrollX:number,scrollY:number,zoomX:number,zoomY:number,targetScrollX:number,targetScrollY:number,targetZoomX:number,targetZoomY:number,progress:number,scale:number){return {scrollX:scrollX+(targetScrollX-scrollX)*progress,scrollY:scrollY+(targetScrollY-scrollY)*progress,zoomX:(zoomX+(targetZoomX-zoomX)*progress)*scale,zoomY:(zoomY+(targetZoomY-zoomY)*progress)*scale};}
export function restoreCamera(snapshot:{scrollX:number;scrollY:number;zoomX:number;zoomY:number;lerpX:number;lerpY:number;useBounds:boolean;visibility:boolean[]},scale:number){return {scrollX:snapshot.scrollX,scrollY:snapshot.scrollY,zoomX:snapshot.zoomX*scale,zoomY:snapshot.zoomY*scale,lerpX:snapshot.lerpX,lerpY:snapshot.lerpY,useBounds:snapshot.useBounds,visibility:[...snapshot.visibility]};}

export function gateMenuControls(controls:Array<{dataset:{locked?:string};disabled:boolean}>,ready:boolean):void{for(const control of controls)control.disabled=!ready||control.dataset.locked==='true';}
export interface MenuLifecycleEvents {on(event:string,listener:()=>void):unknown;off(event:string,listener:()=>void):unknown;}
export function bindMenuVisibilityLifecycle(events:MenuLifecycleEvents,pause:()=>void,sleep:()=>void,resume:()=>void,wake:()=>void):()=>void{const handlers:[string,()=>void][]=[['pause',pause],['sleep',sleep],['resume',resume],['wake',wake]];for(const [event,listener] of handlers)events.on(event,listener);let cleaned=false;return()=>{if(cleaned)return;cleaned=true;for(const [event,listener] of handlers)events.off(event,listener);};}

export function spatialMenuLayout(clientWidth:number){const narrow=clientWidth<=480;return {narrow,finalY:25,width:340,height:266};}

export function menuPointer(clientX:number,clientY:number,rect:{left:number;top:number;width:number}){const scale=rect.width/640;return {x:(clientX-rect.left)/scale,y:(clientY-rect.top)/scale};}
export type MenuGaze={turn:number;tilt:number};
export function menuGazeTarget(dx:number,dy:number,previousTurn:number):MenuGaze{const turn=dx>24?0:dx< -24?180:previousTurn;const tilt=Math.max(-.22,Math.min(.12,Math.atan2(dy,Math.max(Math.abs(dx),24))*.14));return {turn,tilt:turn===180?-tilt:tilt};}
export function smoothMenuGaze(current:MenuGaze,target:MenuGaze,delta:number,out:MenuGaze={turn:0,tilt:0}):MenuGaze{const dt=Math.max(0,Math.min(50,delta));out.turn=current.turn+(target.turn-current.turn)*(1-Math.exp(-dt/55));out.tilt=current.tilt+(target.tilt-current.tilt)*(1-Math.exp(-dt/30));return out;}

/** Owns a single finite update subscription; idle and suspended poses cost no callbacks. */
export class DemandMenuUpdates {
 active=false;
 constructor(private readonly subscribe:()=>void,private readonly unsubscribe:()=>void){}
 wake():void{if(this.active)return;this.active=true;this.subscribe();}
 stop():void{if(!this.active)return;this.active=false;this.unsubscribe();}
}

export function menuDuckBacking(width:number,height:number){const finalHeight=width>0?190*height/width:174;return {width:Math.max(1,Math.ceil(Math.max(width,190)*2)),height:Math.max(1,Math.ceil(Math.max(height,finalHeight)*2))};}
export function menuDuckSize(width:number,height:number,qX:number,qY:number,progress:number,worldAnchored:boolean){if(!worldAnchored)return {width:190,height:174};const finalHeight=width>0?190*height/width:174;return {width:width*qX+(190-width*qX)*progress,height:height*qY+(finalHeight-height*qY)*progress};}
export function menuBoardAngles(progress:number){return {z:2+4*progress,y:-18-10*progress};}
/** Restores the captured visibility once, including an originally hidden duck. */
export class MenuDuckVisibility {
 readonly original:boolean;private restored=false;
 constructor(private readonly visual:{visible:boolean;setVisible(value:boolean):unknown},private readonly alive:()=>boolean){this.original=visual.visible;}
 conceal():void{if(!this.restored&&this.alive())this.visual.setVisible(false);}
 restore():void{if(this.restored)return;this.restored=true;if(this.alive())this.visual.setVisible(this.original);}
}

export const MENU_ZOOM_FACTOR=2.6;
export function menuTransitionPhases(progress:number){const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};return {zoomPhase:smooth(progress/.62),revealPhase:smooth((progress-.62)/.38)};}
