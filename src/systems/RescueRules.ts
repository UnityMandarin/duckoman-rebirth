export const RESCUE_RULES={franklinX:540,releaseRangeX:160,releaseRangeY:90,chargePerHit:10,maxCharge:100,maxEnemies:3,arrivalCueMs:700,minPlayerDistance:140,waveDelayMs:900,firstCheckpoint:180,releasedCheckpoint:540} as const;
export type RescueStage='chained'|'released'|'cleared';
export interface RescueProgressRecord {checkpoint:number;charge:number;opened:number[];bossDefeated:boolean;}
export interface RescueEntryInput {devPreview:boolean;retry?:boolean;bossPreview?:boolean;checkpoint?:number;charge?:number;opened?:readonly number[];bossDefeated?:boolean;saved:RescueProgressRecord;}
export function rescueEntryRecord(input:RescueEntryInput):RescueProgressRecord {
 if(input.retry)return {checkpoint:input.checkpoint===RESCUE_RULES.releasedCheckpoint?RESCUE_RULES.releasedCheckpoint:RESCUE_RULES.firstCheckpoint,charge:input.checkpoint===RESCUE_RULES.releasedCheckpoint?0:Math.max(0,Math.min(RESCUE_RULES.maxCharge,Number.isFinite(input.charge)?input.charge!:0)),opened:input.checkpoint===RESCUE_RULES.releasedCheckpoint?[0]:[],bossDefeated:input.checkpoint===RESCUE_RULES.releasedCheckpoint&&!!input.bossDefeated};
 if(input.devPreview)return input.bossPreview?{checkpoint:RESCUE_RULES.releasedCheckpoint,charge:0,opened:[0],bossDefeated:false}:{checkpoint:RESCUE_RULES.firstCheckpoint,charge:0,opened:[],bossDefeated:false};
 return {...input.saved,opened:[...input.saved.opened]};
}
export function rescueRetryRecord(stage:RescueStage,charge:number):RescueProgressRecord {return stage==='chained'?{checkpoint:RESCUE_RULES.firstCheckpoint,charge:Math.max(0,Math.min(RESCUE_RULES.maxCharge,Number.isFinite(charge)?charge:0)),opened:[],bossDefeated:false}:{checkpoint:RESCUE_RULES.releasedCheckpoint,charge:0,opened:[0],bossDefeated:stage==='cleared'};}
export function rescueStage(progress:{opened:readonly number[];bossDefeated:boolean}):RescueStage{return progress.bossDefeated?'cleared':progress.opened.includes(0)?'released':'chained';}
export function rescueEntryCharge(stage:RescueStage,checkpoint:number,savedCharge:number):number{return stage==='chained'&&checkpoint===RESCUE_RULES.firstCheckpoint?Math.max(0,Math.min(RESCUE_RULES.maxCharge,Number.isFinite(savedCharge)?savedCharge:0)):0;}
export function rescueEntryCheckpoint(stage:RescueStage):number{return stage==='chained'?RESCUE_RULES.firstCheckpoint:RESCUE_RULES.releasedCheckpoint;}
export function canReleaseFranklin(input:{stage:RescueStage;attack:'ultimate'|'dash'|'stomp'|'throw';charge:number;playerX:number;playerY:number;franklinX?:number;franklinY?:number}):boolean {
 return input.stage==='chained'&&input.attack==='ultimate'&&input.charge>=RESCUE_RULES.maxCharge&&Math.abs(input.playerX-(input.franklinX??RESCUE_RULES.franklinX))<=RESCUE_RULES.releaseRangeX&&Math.abs(input.playerY-(input.franklinY??360))<=RESCUE_RULES.releaseRangeY;
}
export function awardSentryCharge(charge:number,stage:RescueStage,acceptedHit:boolean):number{return stage==='chained'&&acceptedHit?Math.min(RESCUE_RULES.maxCharge,Math.max(0,charge)+RESCUE_RULES.chargePerHit):Math.max(0,Math.min(RESCUE_RULES.maxCharge,charge));}
export interface UltimateReleaseAuthorization {armed:boolean;consumed:boolean;}
export const newReleaseAuthorization=():UltimateReleaseAuthorization=>({armed:false,consumed:false});
export function authorizeFranklinUltimate(auth:UltimateReleaseAuthorization,acceptedRealU:boolean,chargeBefore:number):UltimateReleaseAuthorization{return acceptedRealU&&chargeBefore>=RESCUE_RULES.maxCharge?{armed:true,consumed:false}:{...auth};}
export function consumeFranklinUltimate(auth:UltimateReleaseAuthorization,input:Omit<Parameters<typeof canReleaseFranklin>[0],'attack'|'charge'>&{attack?:'ultimate';charge?:number}):{authorization:UltimateReleaseAuthorization;released:boolean}{if(!auth.armed||auth.consumed)return {authorization:{...auth},released:false};const released=canReleaseFranklin({...input,attack:'ultimate',charge:RESCUE_RULES.maxCharge});return {authorization:{armed:false,consumed:true},released};}
export function rescueWaveCanSpawn(stage:RescueStage,charge:number,liveAndPending:number):boolean{return stage==='chained'&&charge<RESCUE_RULES.maxCharge&&liveAndPending<RESCUE_RULES.maxEnemies;}
export function safeRescueSpawn(proposedX:number,playerX:number,fallbacks:readonly number[]=[160,1070],minDistance=RESCUE_RULES.minPlayerDistance):number|undefined {
 if(Math.abs(proposedX-playerX)>=minDistance)return proposedX;
 return [...fallbacks].sort((a,b)=>Math.abs(b-playerX)-Math.abs(a-playerX)||a-b).find(x=>Math.abs(x-playerX)>=minDistance);
}
export function clampRescueDelta(deltaMs:number,active=true):number{return active&&Number.isFinite(deltaMs)&&deltaMs>0?Math.min(50,deltaMs):0;}

export type SentryKind='normal'|'jumper'|'pointed';
export interface RescueSpawn {x:number;feetY:number;kind:SentryKind;patrolHalfWidth:number;}
export const RESCUE_WAVES:readonly (readonly RescueSpawn[])[]=[
 [{x:780,feetY:360,kind:'normal',patrolHalfWidth:90},{x:1010,feetY:360,kind:'normal',patrolHalfWidth:50}],
 [{x:240,feetY:260,kind:'normal',patrolHalfWidth:40},{x:760,feetY:360,kind:'jumper',patrolHalfWidth:60},{x:1000,feetY:360,kind:'pointed',patrolHalfWidth:50}],
 [{x:180,feetY:360,kind:'normal',patrolHalfWidth:50},{x:660,feetY:360,kind:'pointed',patrolHalfWidth:50},{x:950,feetY:260,kind:'normal',patrolHalfWidth:40}],
 [{x:380,feetY:360,kind:'jumper',patrolHalfWidth:50},{x:880,feetY:360,kind:'normal',patrolHalfWidth:90}]
];
export interface PendingRescueSpawn extends RescueSpawn {cueRemainingMs:number;}
export interface RescueWaveController {waveIndex:number;waitMs:number;remaining:RescueSpawn[];pending:PendingRescueSpawn[];spawnedThisWave:number;}
export function createRescueWaveController():RescueWaveController{return {waveIndex:0,waitMs:0,remaining:[],pending:[],spawnedThisWave:0};}
export interface RescueWaveTick {controller:RescueWaveController;activated:RescueSpawn[];waveCompleted:boolean;}
export function tickRescueWaves(c:RescueWaveController,input:{deltaMs:number;stage:RescueStage;charge:number;playerX:number;liveEnemies:number}):RescueWaveTick {
 const n:RescueWaveController={...c,remaining:c.remaining.map(x=>({...x})),pending:c.pending.map(x=>({...x}))},activated:RescueSpawn[]=[],dt=clampRescueDelta(input.deltaMs,input.stage==='chained'),limit=Math.max(0,Math.min(RESCUE_RULES.maxEnemies,Math.floor(input.liveEnemies)))+n.pending.length;
 if(!dt||input.stage!=='chained')return {controller:n,activated,waveCompleted:false};
 n.waitMs=Math.max(0,n.waitMs-dt);
 if(input.charge<RESCUE_RULES.maxCharge)for(let i=0;i<n.pending.length;i++){
  const p=n.pending[i],point=safeRescueSpawn(p.x,input.playerX);
  if(point===undefined){p.cueRemainingMs=RESCUE_RULES.arrivalCueMs;continue;}
  if(point!==p.x){p.x=point;p.feetY=360;p.cueRemainingMs=RESCUE_RULES.arrivalCueMs;continue;}
  p.cueRemainingMs=Math.max(0,p.cueRemainingMs-dt);
  if(p.cueRemainingMs===0&&Math.abs(p.x-input.playerX)>=RESCUE_RULES.minPlayerDistance){activated.push({...p});n.pending.splice(i--,1);}
 }
 if(n.waitMs===0){if(!n.remaining.length&&n.spawnedThisWave===0&&input.liveEnemies===0&&!n.pending.length)n.remaining=RESCUE_WAVES[n.waveIndex].map(x=>({...x}));
  while(input.charge<RESCUE_RULES.maxCharge&&n.remaining.length&&Math.max(0,Math.floor(input.liveEnemies))+n.pending.length+activated.length<RESCUE_RULES.maxEnemies){const spec=n.remaining.shift()!,x=safeRescueSpawn(spec.x,input.playerX);if(x===undefined){n.remaining.unshift(spec);break;}n.pending.push({...spec,x,feetY:x===spec.x?spec.feetY:360,cueRemainingMs:RESCUE_RULES.arrivalCueMs});n.spawnedThisWave++;}
 }
 const waveCompleted=activated.length===0&&n.spawnedThisWave>0&&input.liveEnemies===0&&n.pending.length===0&&n.remaining.length===0;
 if(waveCompleted){n.waveIndex=(n.waveIndex+1)%RESCUE_WAVES.length;n.spawnedThisWave=0;n.waitMs=RESCUE_RULES.waveDelayMs;}
 return {controller:n,activated,waveCompleted};
}
