/** Local fixture flag: qaDamage enables real damage; its default is damage ignored. */
export function qaInitialInfiniteHealth(qaPreview:boolean,qaDamage:boolean|undefined,infiniteHealth:boolean|undefined):boolean {
 return qaPreview?qaDamage!==true:!!infiniteHealth;
}

/** Latch fixture readiness once support contact and initial camera setup are both established. */
export class QaFixtureReadiness {
 private latched=false;
 reset():void {this.latched=false;}
 observe(sourceContact:boolean,cameraSetup:boolean):boolean {
  if(sourceContact&&cameraSetup)this.latched=true;
  return this.latched;
 }
}

/** Spawn on an authored support with a real approach runway, clamped inside narrow platforms. */
export function qaApproachSpawn(left:number,right:number,halfWidth:number,distance:number,direction:1|-1=1):number {
 const min=left+halfWidth,max=right-halfWidth;
 if(max<=min)return (left+right)/2;
 const edge=direction>0?max:min;
 return Math.max(min,Math.min(max,edge-direction*Math.max(0,distance)));
}

/** Keep local-only QA fixtures gated by the resolved preview state and host. */
export function qaFixtureEnabled(qa:boolean,devPreview:boolean,developmentBuild:boolean,hostname:string):boolean {
 return qa&&devPreview&&developmentBuild&&(hostname==='localhost'||hostname==='127.0.0.1');
}
