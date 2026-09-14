export const CRAB_RULES={hp:20,pillarCount:4,pillarInterval:3000,warningMs:700,fallMs:220,clearMs:1500} as const;
export function crabDamage(attack:'dash'|'ultimate'|'stomp'|'throw'):number{return attack==='dash'?1:attack==='ultimate'?4:0;}
/** Snapshot the target at warning time. Spacing always leaves a walkable escape lane. */
export function pillarTargets(target:number,left:number,right:number):number[]{
 const center=Math.max(left+350,Math.min(right-350,target));
 return [-300,-100,100,300].map(offset=>center+offset);
}
