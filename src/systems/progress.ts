import {chapterSections,SECTION_WIDTH} from '../data/chapters';
import {CASTLE_CHECKPOINT} from './checkpointPolicy';
import {SKILL_ROUTES,isSkillRouteId,type SkillRouteId} from '../data/skillRoutes';
export const PROGRESS_KEY='duckoman.progress.v1';
export const CHAPTERS=['gate-1','jail','outside','crimson','rescue'] as const;
export type CampaignScene=typeof CHAPTERS[number];
export interface ChapterProgress {checkpoint:number;charge:number;opened:number[];secrets:number[];discoveries:number[];bossDefeated:boolean;finished:boolean;}
export interface TrialRecord {bestMs?:number;hitless:boolean;clears:number;}
export interface CampaignProgress {version:4;unlocked:CampaignScene[];completed:CampaignScene[];currentScene:CampaignScene;ended:boolean;chapters:Record<CampaignScene,ChapterProgress>;trials:{outside:TrialRecord;crimson:TrialRecord};routes:Record<SkillRouteId,TrialRecord>;}
export function canPersistCampaign(state:{devPreview?:boolean;infiniteHealth?:boolean;runEligible?:boolean}):boolean {return !state.devPreview&&!state.infiniteHealth&&state.runEligible!==false;}
export function canPracticeBoss(p:CampaignProgress,boss:'outside'|'crimson'):boolean {const checkpoint=(boss==='outside'?22:10)*SECTION_WIDTH+80;return p.completed.includes(boss)||p.unlocked.includes(boss)&&p.chapters[boss].checkpoint>=checkpoint;}
export function canPracticeRoute(p:CampaignProgress,id:unknown):boolean {const route=SKILL_ROUTES.find(candidate=>candidate.id===id);return !!route&&p.unlocked.includes(route.chapter as CampaignScene);}
const emptyChapter=():ChapterProgress=>({checkpoint:0,charge:0,opened:[],secrets:[],discoveries:[],bossDefeated:false,finished:false});
const emptyTrial=():TrialRecord=>({hitless:false,clears:0});
const emptyRoutes=():Record<SkillRouteId,TrialRecord>=>Object.fromEntries(SKILL_ROUTES.map(route=>[route.id,emptyTrial()])) as Record<SkillRouteId,TrialRecord>;
export const SAVE_CHECKPOINTS:Record<CampaignScene,number[]>={
 'gate-1':[0,CASTLE_CHECKPOINT.x],jail:[0,...[3,6,9].map(i=>i*SECTION_WIDTH+80)],
 outside:[0,...[3,6,9,12,15,18,21,22].map(i=>i*SECTION_WIDTH+80)],crimson:[0,...[3,6,9,10].map(i=>i*SECTION_WIDTH+80)],rescue:[0,180,540]
};
const VALID_GATES:Record<CampaignScene,number[]>={'gate-1':[0,1,2],jail:[0,4,8,12],outside:[99],crimson:[99],rescue:[0]};
const secretIds=(scene:CampaignScene)=>scene==='gate-1'?[0,1,2]:scene==='rescue'?[]:chapterSections(scene).flatMap((section,i)=>section.secret?[i]:[]);
export function freshProgress():CampaignProgress{return {version:4,unlocked:['gate-1'],completed:[],currentScene:'gate-1',ended:false,chapters:{'gate-1':emptyChapter(),jail:emptyChapter(),outside:emptyChapter(),crimson:emptyChapter(),rescue:emptyChapter()},trials:{outside:emptyTrial(),crimson:emptyTrial()},routes:emptyRoutes()};}
const isScene=(v:unknown):v is CampaignScene=>typeof v==='string'&&(CHAPTERS as readonly string[]).includes(v);
function ids(v:unknown,max:number):number[]{if(!Array.isArray(v))return [];return [...new Set(v.filter((n):n is number=>Number.isInteger(n)&&n>=0&&n<max))];}
export function validateProgress(v:unknown):CampaignProgress|null {
 if(!v||typeof v!=='object')return null;const x=v as Record<string,unknown>;if((x.version!==1&&x.version!==2&&x.version!==3&&x.version!==4)||!x.chapters||typeof x.chapters!=='object')return null;
 const version=x.version as number, rawCurrent=x.currentScene;
 if(version===4?!isScene(rawCurrent):rawCurrent!=='rescue'&&!isScene(rawCurrent))return null;
 const chapters=freshProgress().chapters,raw=x.chapters as Record<string,unknown>;
 for(const key of CHAPTERS){if(key==='rescue'&&version<4)continue;const c=raw[key];if(!c||typeof c!=='object')return null;const r=c as Record<string,unknown>;
  const checkpoint=r.checkpoint,charge=r.charge;if(typeof checkpoint!=='number'||!Number.isFinite(checkpoint)||!SAVE_CHECKPOINTS[key].includes(checkpoint)||typeof charge!=='number'||!Number.isFinite(charge)||charge<0||charge>100||!Array.isArray(r.opened)||!Array.isArray(r.secrets)||typeof r.bossDefeated!=='boolean'||typeof r.finished!=='boolean')return null;
  if(key==='rescue'&&(!Array.isArray(r.discoveries)||r.opened.some(id=>id!==0)||r.secrets.length>0||r.discoveries.length>0))return null;
  const opened=ids(r.opened,128).filter(id=>VALID_GATES[key].includes(id)),secrets=ids(r.secrets,128).filter(id=>secretIds(key).includes(id));let bossDefeated=r.bossDefeated;
  if((key==='outside'||key==='crimson')&&opened.includes(99))bossDefeated=true;
  if((key==='outside'||key==='crimson')&&bossDefeated&&!opened.includes(99))opened.push(99);
  const discoveries=ids(x.version===1?secrets:r.discoveries,128).filter(id=>secretIds(key).includes(id));
  chapters[key]={checkpoint,charge,opened,secrets,discoveries:[...new Set([...discoveries,...secrets])],bossDefeated,finished:r.finished===true};
 }
 const validList=(v:unknown):CampaignScene[]=>Array.isArray(v)?[...new Set(v.filter(isScene))]:[];
 if(!Array.isArray(x.unlocked)||!Array.isArray(x.completed))return null;
 const validLegacyList=(v:unknown):CampaignScene[]=>version<4&&Array.isArray(v)?[...new Set(v.filter((item):item is CampaignScene=>item!=='rescue'&&isScene(item)))]:validList(v);
 if(!Array.isArray(x.unlocked)||!Array.isArray(x.completed))return null;
 const requested=validLegacyList(x.unlocked),requestedCompleted=validLegacyList(x.completed);let unlocked:CampaignScene[]=['gate-1'];for(let i=1;i<CHAPTERS.length;i++){if((requested.includes(CHAPTERS[i])||requestedCompleted.includes(CHAPTERS[i-1]))&&unlocked.includes(CHAPTERS[i-1]))unlocked.push(CHAPTERS[i]);else break;}
 if(version<4&&requestedCompleted.includes('crimson')&&unlocked.includes('crimson')&&!unlocked.includes('rescue'))unlocked.push('rescue');
 const completed=requestedCompleted.filter(scene=>unlocked.includes(scene));for(const key of CHAPTERS)chapters[key].finished=completed.includes(key);
 let currentScene:CampaignScene=rawCurrent==='rescue'&&version<4?unlocked[unlocked.length-1]:rawCurrent as CampaignScene;if(!unlocked.includes(currentScene))currentScene=unlocked[unlocked.length-1];
 const trial=(v:unknown):TrialRecord=>{const r=v&&typeof v==='object'?v as Record<string,unknown>:{};return {...(typeof r.bestMs==='number'&&Number.isFinite(r.bestMs)&&r.bestMs>0?{bestMs:r.bestMs}:{}),hitless:r.hitless===true,clears:typeof r.clears==='number'&&Number.isInteger(r.clears)&&r.clears>=0?r.clears:0};};
 const rawTrials=version>=2&&x.trials&&typeof x.trials==='object'?x.trials as Record<string,unknown>:{},rawRoutes=version>=3&&x.routes&&typeof x.routes==='object'?x.routes as Record<string,unknown>:{},routes=emptyRoutes();
 for(const id of Object.keys(rawRoutes))if(isSkillRouteId(id))routes[id]=trial(rawRoutes[id]);
 return {version:4,unlocked,completed,currentScene,ended:version<4&&requestedCompleted.includes('crimson')?false:x.ended===true,chapters,trials:{outside:trial(rawTrials.outside),crimson:trial(rawTrials.crimson)},routes};
}
let memory:CampaignProgress=freshProgress();
function defaultStorage():Pick<Storage,'getItem'|'setItem'>|null {try{return globalThis.localStorage;}catch{return null;}}
export function hasStoredProgress(storage?:Pick<Storage,'getItem'>|null):boolean {try{return !!(storage===undefined?defaultStorage():storage)?.getItem(PROGRESS_KEY);}catch{return false;}}
export function loadProgress(storage?:Pick<Storage,'getItem'>|null):CampaignProgress {
 try {const raw=(storage===undefined?defaultStorage():storage)?.getItem(PROGRESS_KEY);if(raw){const valid=validateProgress(JSON.parse(raw));if(valid){memory=valid;return structuredClone(valid);}}}catch{/* Storage can be disabled; in-memory campaign remains playable. */}
 return structuredClone(memory);
}
export function saveProgress(p:CampaignProgress,storage?:Pick<Storage,'setItem'>|null):CampaignProgress {
 const valid=validateProgress(p)??freshProgress();memory=structuredClone(valid);try{(storage===undefined?defaultStorage():storage)?.setItem(PROGRESS_KEY,JSON.stringify(valid));}catch{/* Keep in-memory progress when storage is unavailable. */}return structuredClone(valid);
}
export function chapterBase(scene:CampaignScene):number{return 0;}
export function resetChapter(p:CampaignProgress,scene:CampaignScene):CampaignProgress {const next=structuredClone(p);next.chapters[scene]={...emptyChapter(),discoveries:next.chapters[scene].discoveries,finished:false};next.currentScene=scene;next.ended=false;return next;}
export function releaseRescue(p:CampaignProgress):CampaignProgress {if(!p.unlocked.includes('rescue')||p.chapters.rescue.opened.includes(0)||p.chapters.rescue.bossDefeated)return structuredClone(p);const next=updateChapter(p,'rescue',{checkpoint:540,charge:0,opened:[0],secrets:[],discoveries:[],bossDefeated:false});next.currentScene='rescue';next.ended=false;return next;}
export function clearRescue(p:CampaignProgress):CampaignProgress {if(!p.unlocked.includes('rescue')||!p.chapters.rescue.opened.includes(0))return structuredClone(p);const next=updateChapter(p,'rescue',{checkpoint:540,charge:0,opened:[0],bossDefeated:true});next.currentScene='rescue';next.ended=false;return next;}
export function completeRescue(p:CampaignProgress):CampaignProgress {if(!p.unlocked.includes('rescue')||!p.chapters.rescue.bossDefeated)return structuredClone(p);let next=unlockAfter('rescue',p);next.currentScene='rescue';next.ended=true;return next;}
export function replayRescue(p:CampaignProgress):CampaignProgress {if(!p.unlocked.includes('rescue'))return structuredClone(p);const next=resetChapter(p,'rescue');next.currentScene='rescue';next.ended=false;return next;}
export function updateChapter(p:CampaignProgress,scene:CampaignScene,patch:Partial<ChapterProgress>):CampaignProgress {
 const next=structuredClone(p);next.currentScene=scene;const prior=next.chapters[scene],secrets=[...new Set(patch.secrets??prior.secrets)];next.chapters[scene]={...prior,...patch,opened:[...new Set(patch.opened??prior.opened)],secrets,discoveries:[...new Set([...prior.discoveries,...secrets,...(patch.discoveries??[])])]};return next;
}
export function recordTrialVictory(p:CampaignProgress,boss:'outside'|'crimson',elapsedMs:number,hits:number,eligible:boolean):CampaignProgress {if(!eligible||!Number.isFinite(elapsedMs)||elapsedMs<=0||!Number.isInteger(hits)||hits<0)return structuredClone(p);const next=structuredClone(p),r=next.trials[boss];r.clears++;if(r.bestMs===undefined||elapsedMs<r.bestMs)r.bestMs=elapsedMs;if(hits===0)r.hitless=true;return next;}
export function recordTrialOutcome(p:CampaignProgress,boss:'outside'|'crimson',outcome:{victory:boolean;aborted?:boolean;elapsedMs:number;hits:number;eligible:boolean}):CampaignProgress {if(!outcome.victory||outcome.aborted)return structuredClone(p);return recordTrialVictory(p,boss,outcome.elapsedMs,outcome.hits,outcome.eligible);}
export function recordRouteOutcome(p:CampaignProgress,id:unknown,outcome:{victory:boolean;aborted?:boolean;elapsedMs:number;hits:number;eligible:boolean}):CampaignProgress {
 if(!isSkillRouteId(id)||!outcome.victory||outcome.aborted||!outcome.eligible||!Number.isFinite(outcome.elapsedMs)||outcome.elapsedMs<=0||!Number.isInteger(outcome.hits)||outcome.hits<0)return structuredClone(p);
 const next=structuredClone(p),record=next.routes[id];record.clears++;if(record.bestMs===undefined||outcome.elapsedMs<record.bestMs)record.bestMs=outcome.elapsedMs;if(outcome.hits===0)record.hitless=true;return next;
}
export function sceneDataFromProgress(p:CampaignProgress,scene:CampaignScene):Omit<ChapterProgress,'checkpoint'|'charge'|'discoveries'> & {checkpoint:number|undefined;ultimateCharge:number} {
 const chapter=p.chapters[scene];return {checkpoint:chapter.checkpoint||undefined,ultimateCharge:chapter.charge,opened:[...chapter.opened],secrets:[...chapter.secrets],bossDefeated:chapter.bossDefeated,finished:chapter.finished};
}
export function unlockAfter(scene:CampaignScene,p:CampaignProgress):CampaignProgress {
 const next=structuredClone(p),order=[...CHAPTERS],i=order.indexOf(scene);next.chapters[scene].finished=true;if(!next.completed.includes(scene))next.completed.push(scene);
 if(i>=0&&i+1<order.length&&!next.unlocked.includes(order[i+1]))next.unlocked.push(order[i+1]);return next;
}
