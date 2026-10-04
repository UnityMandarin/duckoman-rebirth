export const CRAB_RULES={hp:20,pillarCount:4,warningMs:1000,fallMs:220,pillarImpactMs:240,restMs:850,phaseTwoRestMs:650,clawWindupMs:850,clawSwingMs:350,clawRecoveryMs:950,chargeCueMs:900,chargeRecoveryMs:1150,phaseTwoCueMinMs:1000,chargeSpeed:250,chargeDistance:210,phaseTwoChargeDistance:250,pillarRecoveryMs:900,burrowDownMs:400,undergroundMs:700,emergeCueMs:1100,emergeActiveMs:260,emergeRecoveryMs:1200,emergeClearance:100,emergePlayerDistance:180} as const;
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
export type CrabPhase='rest'|'claw-windup'|'claw-swing'|'claw-recovery'|'charge-cue'|'charge'|'charge-recovery'|'pillar-warning'|'pillar-fall'|'pillar-impact'|'pillar-recovery'|'burrow-down'|'underground'|'emerge-cue'|'emerge-active'|'emerge-recovery';
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
 if(phase==='pillar-recovery')return 'burrow-down';
 if(phase==='burrow-down')return 'underground';
 if(phase==='underground')return 'emerge-cue';
 if(phase==='emerge-cue')return 'emerge-active';
 if(phase==='emerge-active')return 'emerge-recovery';
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
  case 'burrow-down':return CRAB_RULES.burrowDownMs;
  case 'underground':return CRAB_RULES.undergroundMs;
  case 'emerge-cue':return CRAB_RULES.emergeCueMs;
  case 'emerge-active':return CRAB_RULES.emergeActiveMs;
  case 'emerge-recovery':return CRAB_RULES.emergeRecoveryMs;
 }
}
export function crabChargeDistance(phaseTwo:boolean):number{return phaseTwo?CRAB_RULES.phaseTwoChargeDistance:CRAB_RULES.chargeDistance;}
export function crabChargeDuration(distance:number):number{return distance/CRAB_RULES.chargeSpeed*1000+50;}
export function clampBurrowDestination(target:number,left:number,right:number,clearance=CRAB_RULES.emergeClearance):number{return PhaserClamp(target,left+clearance,right-clearance);}
export function snapshotBurrowTarget(target:number,left:number,right:number):number{return clampBurrowDestination(target,left,right);}
/** Pick a safe emergence side once; the returned X stays fixed for the entire cue. */
export function resolveEmergeDestination(snapshotX:number,playerX:number,left:number,right:number,minDistance=CRAB_RULES.emergePlayerDistance,clearance=CRAB_RULES.emergeClearance):number{
 const x=clampBurrowDestination(snapshotX,left,right,clearance);if(Math.abs(x-playerX)>=minDistance)return x;
 const away=playerX<=x?1:-1,candidate=PhaserClamp(playerX+away*minDistance,left+clearance,right-clearance);
 if(Math.abs(candidate-playerX)>=minDistance)return candidate;
 const other=PhaserClamp(playerX-away*minDistance,left+clearance,right-clearance);
 return Math.abs(other-playerX)>Math.abs(candidate-playerX)?other:candidate;
}
export function canCrabDashDamage(alive:boolean,engaged:boolean,phase:CrabPhase):boolean{return alive&&engaged&&!['burrow-down','underground','emerge-cue'].includes(phase);}
export function crabPillarActiveAt(phase:CrabPhase,pillarVisible:boolean):boolean{return phase==='pillar-impact'&&pillarVisible;}
export function crabBurrowImmune(phase:CrabPhase):boolean{return phase==='burrow-down'||phase==='underground'||phase==='emerge-cue';}
export function crabBurrowContactActive(phase:CrabPhase):boolean{return phase==='emerge-active';}
export function crabActiveZone(x:number):{left:number;right:number;top:number;bottom:number}{return {left:x-60,right:x+60,top:240,bottom:360};}
/** Return the visible upper edge of the emerging shell's overlap with its danger lane. */
export function crabEmergenceTop(imageY:number,alpha:number):number|null{const top=Math.max(240,imageY-159);return alpha<.9||top>=360?null:top;}
/** Resume a fresh tell after an interruption to an attack's active or warning phase. */
export function crabResumePhase(phase:CrabPhase):CrabPhase{
 if(phase==='claw-swing'||phase==='claw-windup')return 'claw-windup';
 if(phase==='charge'||phase==='charge-cue')return 'charge-cue';
 if(phase==='pillar-warning'||phase==='pillar-fall'||phase==='pillar-impact')return 'pillar-warning';
 if(phase==='emerge-cue'||phase==='emerge-active')return 'emerge-cue';
 return phase;
}
/** Actor-local simulation advances only while every owning game state is live. */
export function crabCanAct(alive:boolean,engaged:boolean,hidden:boolean,playerActive:boolean,sceneActive:boolean,paused:boolean):boolean{return alive&&engaged&&playerActive&&sceneActive&&!paused&&!hidden;}
function PhaserClamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value));}
