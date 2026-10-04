export const QUALITY_TRAP_WARNING_MS=650;
export const QUALITY_TRAP_IDLE_MS=900;
export const QUALITY_TRAP_DELTA_CAP_MS=50;
export const QUALITY_PRESS_HALF_HEIGHT=112.5;

export type TrapPressPhase='idle'|'warn'|'fall'|'impact'|'return';
export type TrapCrumblePhase='idle'|'warn'|'drop'|'broken';
export type TrapSpecialPhase='ferry'|'lift'|'shutters'|'conveyor';

/** Convert a frame delta to a stable actor-local simulation step. */
export function qualityTrapDeltaMs(deltaMs:number,active:boolean):number{
 if(!active||!Number.isFinite(deltaMs)||deltaMs<=0)return 0;
 return Math.min(QUALITY_TRAP_DELTA_CAP_MS,deltaMs);
}
export function advanceQualityTrapClock(clockMs:number,deltaMs:number,active:boolean):number{return clockMs+qualityTrapDeltaMs(deltaMs,active);}
export function trapIdleCadenceMs(pressureFactor:number):number{return QUALITY_TRAP_IDLE_MS/Math.max(1,pressureFactor);}
export function trapSectionBuildCount(sectionCount:number):number{return Math.max(0,Math.floor(sectionCount));}
/** Keep boss arenas outside the normal trap encounter domain instead of pinning to its last room. */
export function activeTrapEncounterIndex(rawSection:number,normalSectionCount:number):number|undefined{
 const index=Math.floor(rawSection),count=trapSectionBuildCount(normalSectionCount);
 return Number.isFinite(rawSection)&&index>=0&&index<count?index:undefined;
}
export function trapRoomTransition(wasActive:boolean,isActive:boolean):'enter'|'exit'|'hold'{return !wasActive&&isActive?'enter':wasActive&&!isActive?'exit':'hold';}
export function trapDustScale(baseScale:number,multiplier:number):number{return baseScale*Math.max(0,multiplier);}
export function pressImpactCenterY(groundY:number):number{return groundY-QUALITY_PRESS_HALF_HEIGHT;}
/** An interrupted press always returns to idle so its next damage has a complete tell. */
export function pressPhaseAfterGap(_phase:TrapPressPhase):TrapPressPhase{return 'idle';}
export function pressStartsWarning(phase:TrapPressPhase,clockMs:number,deadlineMs:number):boolean{return phase==='idle'&&clockMs>=deadlineMs;}
export function pressCanFall(phase:TrapPressPhase,clockMs:number,deadlineMs:number):boolean{return phase==='warn'&&clockMs>=deadlineMs;}
export function shutterCanClose(playerOverlaps:boolean):boolean{return !playerOverlaps;}
/** Only the explicit authored phase decides which warning must be replayed after a gap. */
export function crumblePhaseAfterGap(phase:TrapCrumblePhase):TrapCrumblePhase{return phase==='warn'?'idle':phase;}
export function specialPhaseAfterGap(phase:TrapSpecialPhase,playerOverlaps:boolean):{phase:TrapSpecialPhase;solid:boolean}{return {phase,solid:shutterCanClose(playerOverlaps)};}
