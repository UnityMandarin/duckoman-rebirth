export interface CameraQaLaunch {launchT:number;source:string|null;target:string|null;firstFitT:number|null;leadMs:number|null;}
export interface CameraQaSurface {id:string;left:number;right:number;top:number;enabled?:boolean;landing?:boolean;}
export interface CameraQaHazard {left:number;right:number;top:number;bottom:number;active?:boolean;kind?:string;}
export interface CameraQaProjection {x:number;y:number;width:number;height:number;logicalWidth:number;logicalHeight:number;}

/** Visible real landing surfaces under the current rendered camera, independent of rig target selection. */
export function visibleCameraQaSurfaceIds(view:CameraQaProjection,actor:{top:number|null;bottom:number|null},surfaces:readonly CameraQaSurface[],hazards:readonly CameraQaHazard[]=[]):string[]{
 if(view.width<=0||view.height<=0||typeof actor.top!=='number'||typeof actor.bottom!=='number'||actor.top<120||actor.bottom>370)return [];
 const sx=(x:number)=>(x-view.x)/view.width*view.logicalWidth,sy=(y:number)=>(y-view.y)/view.height*view.logicalHeight;
 const actorLeft=0,actorRight=view.logicalWidth;
 return surfaces.filter(surface=>{
  if(surface.enabled===false||surface.landing===false)return false;
  const left=Math.max(actorLeft,sx(surface.left)),right=Math.min(actorRight,sx(surface.right)),top=sy(surface.top),safeBottom=sy(surface.top+20);
  if(right-left<56||top<120||safeBottom>370)return false;
  return hazards.every(hazard=>{
   if(!hazard.active||hazard.kind!=='spike'||hazard.right<=surface.left||hazard.left>=surface.right)return true;
   // A floor spike below a raised landing cannot damage a body that lands on this surface.
   if(hazard.top>=surface.top+2||hazard.bottom<=surface.top-40)return true;
   const hazardLeft=sx(hazard.left),hazardRight=sx(hazard.right),hazardTop=sy(hazard.top),hazardBottom=sy(hazard.bottom);
   return hazardLeft>=0&&hazardRight<=view.logicalWidth&&hazardTop>=120&&hazardBottom<=370;
  });
 }).map(surface=>surface.id);
}

/** Tracks actual post-render visibility intervals for every candidate, independent of rig target selection. */
export class CameraQaTelemetry {
 private readonly firstFitByTarget=new Map<string,number>();
 private previousGrounded=false;
 private currentSource:string|null=null;
 reset(grounded=false):void{this.firstFitByTarget.clear();this.previousGrounded=grounded;this.currentSource=null;}
 sample(time:number,grounded:boolean,supportId:string|null,targetId:string|null,visibleSurfaceIds:readonly string[]):CameraQaLaunch|null {
  if(grounded&&supportId)this.currentSource=supportId;
  const visible=new Set(visibleSurfaceIds);for(const id of this.firstFitByTarget.keys())if(!visible.has(id))this.firstFitByTarget.delete(id);for(const id of visible)if(!this.firstFitByTarget.has(id))this.firstFitByTarget.set(id,time);
  let launch:CameraQaLaunch|null=null;
  if(this.previousGrounded&&!grounded){const recorded=targetId?this.firstFitByTarget.get(targetId)??null:null,firstFitT=recorded!==null&&time-recorded<=2500?recorded:null;launch={launchT:time,source:this.currentSource,target:targetId,firstFitT,leadMs:firstFitT===null?null:time-firstFitT};if(targetId)this.firstFitByTarget.delete(targetId);}
  this.previousGrounded=grounded;return launch;
 }
}
