export interface TrialTickState {active:boolean;visible:boolean;alive:boolean;finished:boolean;}

/** Delta-driven clock; gaps caused by blur, pause, or visibility changes skip one resumed frame. */
export class TrialClock {
 private elapsed=0;private skipNextDelta=false;private finished=false;
 markGap():void {this.skipNextDelta=true;}
 tick(deltaMs:number,state:TrialTickState):number {
  if(!Number.isFinite(deltaMs)||deltaMs<0||this.finished)return this.elapsed;
  if(!state.active||!state.visible||!state.alive||state.finished)return this.elapsed;
  if(this.skipNextDelta){this.skipNextDelta=false;return this.elapsed;}
  this.elapsed+=deltaMs;return this.elapsed;
 }
 finish():number {this.finished=true;return this.elapsed;}
 get elapsedMs():number{return this.elapsed;}
}

/** Trial eligibility is local to the trial and cannot be restored after an assist was used. */
export class TrialEligibility {
 private valid:boolean;
 constructor(initiallyEligible:boolean){this.valid=initiallyEligible;}
 invalidate():void {this.valid=false;}
 get eligible():boolean{return this.valid;}
}
