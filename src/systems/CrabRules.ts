export const CRAB_RULES={hp:20,pillarCount:4,warningMs:1000,fallMs:220,pillarImpactMs:240,restMs:850,phaseTwoRestMs:650,clawWindupMs:850,clawSwingMs:350,clawRecoveryMs:950,chargeCueMs:900,chargeRecoveryMs:1150,phaseTwoCueMinMs:650,chargeSpeed:250,chargeDistance:210,phaseTwoChargeDistance:250,pillarRecoveryMs:900} as const;
export function crabDamage(attack:'dash'|'ultimate'|'stomp'|'throw'):number{return attack==='dash'?1:attack==='ultimate'?4:0;}
/** Snapshot the target at warning time. Spacing always leaves a walkable escape lane. */
export function pillarTargets(target:number,left:number,right:number):number[]{
 const safeLeft=left+40,safeRight=right-40,center=Math.max(safeLeft+340,Math.min(safeRight-340,target));
 // Keep at least 218 px between 62 px pillars: >150 px clear escape lane.
 return [-327,-109,109,327].map(offset=>PhaserClamp(center+offset,safeLeft,safeRight));
}
export function crabPillarsNonOverlapping(xs:readonly number[],width=62,gap=150):boolean{
 const ordered=[...xs].sort((a,b)=>a-b);
 return ordered.every((x,i)=>i===0||x-ordered[i-1]>=width+gap);
}
export type CrabPhase='rest'|'claw-windup'|'claw-swing'|'claw-recovery'|'charge-cue'|'charge'|'charge-recovery'|'pillar-warning'|'pillar-fall'|'pillar-impact'|'pillar-recovery';
export function nextCrabPhase(phase:CrabPhase):CrabPhase{
 if(phase==='rest')return 'claw-windup';
 if(phase==='claw-windup')return 'claw-swing';
 if(phase==='claw-swing')return 'claw-recovery';
 if(phase==='claw-recovery')return 'charge-cue';
 if(phase==='charge-cue')return 'charge';
 if(phase==='charge')return 'charge-recovery';
 if(phase==='charge-recovery')return 'pillar-warning';
 if(phase==='pillar-warning')return 'pillar-fall';
 if(phase==='pillar-fall')return 'pillar-impact';
 if(phase==='pillar-impact')return 'pillar-recovery';
 return 'rest';
}
export function crabPhaseDuration(phase:CrabPhase,phaseTwo=false):number{
 switch(phase){
  case 'rest':return phaseTwo?CRAB_RULES.phaseTwoRestMs:CRAB_RULES.restMs;
  case 'claw-windup':return CRAB_RULES.clawWindupMs;
  case 'claw-swing':return CRAB_RULES.clawSwingMs;
  case 'claw-recovery':return CRAB_RULES.clawRecoveryMs;
  case 'charge-cue':return phaseTwo?Math.max(CRAB_RULES.phaseTwoCueMinMs,CRAB_RULES.chargeCueMs):CRAB_RULES.chargeCueMs;
  case 'charge':return crabChargeDuration(crabChargeDistance(phaseTwo));
  case 'charge-recovery':return CRAB_RULES.chargeRecoveryMs;
  case 'pillar-warning':return CRAB_RULES.warningMs;
  case 'pillar-fall':return CRAB_RULES.fallMs;
  case 'pillar-impact':return CRAB_RULES.pillarImpactMs;
  case 'pillar-recovery':return CRAB_RULES.pillarRecoveryMs;
 }
}
export function crabChargeDistance(phaseTwo:boolean):number{return phaseTwo?CRAB_RULES.phaseTwoChargeDistance:CRAB_RULES.chargeDistance;}
export function crabChargeDuration(distance:number):number{return distance/CRAB_RULES.chargeSpeed*1000+50;}
export function canCrabDashDamage(alive:boolean,engaged:boolean,_phase:CrabPhase):boolean{return alive&&engaged;}
export function crabPillarActiveAt(phase:CrabPhase,pillarVisible:boolean):boolean{return phase==='pillar-impact'&&pillarVisible;}
function PhaserClamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
