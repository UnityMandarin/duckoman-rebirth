import {TrialClock,TrialEligibility} from './trialRules';

export type RouteAttemptState='waiting'|'running'|'missed'|'complete'|'failed';
export interface RouteAttemptTick {localX:number;intent:boolean;active:boolean;visible:boolean;alive:boolean;assisted:boolean;}
export interface RouteVictory {victory:true;elapsedMs:number;hits:number;eligible:boolean;}

/** Pure three-ring route run state. Presentation and persistence stay with the caller. */
export class RouteAttempt {
 private clock=new TrialClock();
 private readonly eligibility:TrialEligibility;
 private currentState:RouteAttemptState='waiting';
 private ring=0;
 private hitCount=0;
 private victoryIssued=false;
 constructor(initiallyEligible=true){this.eligibility=new TrialEligibility(initiallyEligible);}
 get state():RouteAttemptState{return this.currentState;}
 get nextRing():number{return this.ring;}
 get hits():number{return this.hitCount;}
 get elapsedMs():number{return this.clock.elapsedMs;}
 get eligible():boolean{return this.eligibility.eligible;}
 invalidate():void {this.eligibility.invalidate();}
 tick(deltaMs:number,frame:RouteAttemptTick):RouteAttemptState {
  if(frame.assisted)this.eligibility.invalidate();
  if(this.currentState==='complete'||this.currentState==='failed')return this.currentState;
  if(!frame.active||!frame.visible)this.clock.markGap();
  if(!frame.alive){this.currentState='failed';this.clock.finish();return this.currentState;}
  if(frame.localX<0){this.reset();return this.currentState;}
  if(frame.localX>=1440){
   if((this.currentState==='waiting'||this.currentState==='running')&&this.ring<3)this.currentState='missed';
   else if(this.currentState==='running')this.clock.tick(deltaMs,{active:frame.active,visible:frame.visible,alive:frame.alive,finished:false});
   return this.currentState;
  }
  if(this.currentState==='missed')return this.currentState;
  if(this.currentState==='waiting'&&frame.intent&&frame.localX>=100&&frame.active&&frame.visible)this.currentState='running';
  if(this.currentState==='running')this.clock.tick(deltaMs,{active:frame.active,visible:frame.visible,alive:frame.alive,finished:false});
  return this.currentState;
 }
 collectRing(index:number):boolean {if(this.currentState!=='running'||index!==this.ring||index<0||index>2)return false;this.ring++;return true;}
 damage():void {if(this.currentState==='running')this.hitCount++;}
 finish(localX:number):RouteVictory|undefined {
  if(this.currentState!=='running'||this.ring!==3||!Number.isFinite(localX)||localX<1370||this.victoryIssued)return undefined;
  this.victoryIssued=true;this.currentState='complete';
  return {victory:true,elapsedMs:this.clock.finish(),hits:this.hitCount,eligible:this.eligibility.eligible};
 }
 abort():void {if(this.currentState==='complete'||this.currentState==='failed')return;this.currentState='failed';this.clock.finish();}
 markGap():void {this.clock.markGap();}
 reset():void {this.currentState='waiting';this.ring=0;this.hitCount=0;this.victoryIssued=false;this.clock=new TrialClock();}
}
