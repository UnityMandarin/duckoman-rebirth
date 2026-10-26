import {describe,it,expect} from 'vitest';
import {freshProgress,validateProgress,updateChapter,unlockAfter,completeLateChapter,canPersistCampaign,CHAPTERS} from '../src/systems/progress';

describe('adventure progression review',()=>{
 it('migrates schemas 1 through 6 to schema 7 without losing prior chapter, route, or trial state',()=>{
  for(let version=1;version<=6;version++){
   const source=structuredClone(freshProgress()) as unknown as Record<string,any>;
   source.version=version;
   source.unlocked=['gate-1','jail','outside','crimson'];
   source.completed=['gate-1','jail'];
   source.currentScene='outside';
   source.chapters['gate-1']={checkpoint:5725,charge:19,opened:[1],secrets:[0],discoveries:[0],bossDefeated:false,finished:true};
   source.chapters.jail={checkpoint:8720,charge:44,opened:[4],secrets:[3],discoveries:[3],bossDefeated:false,finished:true};
   source.chapters.outside={checkpoint:22*1440+80,charge:63,opened:[99],secrets:[4],discoveries:[4],bossDefeated:true,finished:false};
   source.trials={outside:{bestMs:4321,hitless:true,clears:5},crimson:{bestMs:9876,hitless:false,clears:2}};
   if(version<4){source.unlocked=source.unlocked.filter((x:string)=>x!=='rescue');source.completed=source.completed.filter((x:string)=>x!=='rescue');}
   if(version<6){delete source.chapters.stormworks;delete source.chapters['crown-edge'];}
   if(version===1)delete source.trials;
   const result=validateProgress(source);
   expect(result?.version).toBe(7);
   expect(result?.chapters['gate-1']).toMatchObject({checkpoint:5725,charge:19,opened:[1],discoveries:[0]});
   expect(result?.chapters.jail).toMatchObject({checkpoint:8720,charge:44,opened:[4],discoveries:[3]});
   expect(result?.chapters.outside).toMatchObject({checkpoint:22*1440+80,charge:63,bossDefeated:true,opened:[99],discoveries:[4]});
   expect(result?.trials.outside).toEqual(version===1?{hitless:false,clears:0}:{bestMs:4321,hitless:true,clears:5});
   expect(result?.unlocked.slice(0,4)).toEqual(['gate-1','jail','outside','crimson']);
  }
 });

 it('accepts absent new story fields and filters/deduplicates tampered flags and people',()=>{
  const old=structuredClone(freshProgress()) as unknown as Record<string,any>;
  old.version=6;delete old.storyFlags;delete old.knownPeople;
  old.storyFlags=['jail-pippit-met','jail-pippit-met','not-a-story-flag',17];
  old.knownPeople=['pippit','pippit','unknown',17];
  const result=validateProgress(old)!;
  expect(result.storyFlags).toEqual(['jail-pippit-met']);
  expect(result.knownPeople).toEqual(['pippit']);
  const absent=structuredClone(freshProgress()) as unknown as Record<string,any>;
  delete absent.storyFlags;delete absent.knownPeople;
  expect(validateProgress(absent)).toMatchObject({version:7,storyFlags:[],knownPeople:[]});
 });

 it('keeps independent story and chapter writes and bounds forward unlocks at Crown Edge',()=>{
  let p=freshProgress();
  for(const scene of CHAPTERS.slice(0,6))p=unlockAfter(scene,p);
  p.storyFlags=['jail-pippit-met'];p.knownPeople=['pippit'];
  const chapterUpdate=updateChapter(p,'stormworks',{checkpoint:80,charge:55});
  expect(chapterUpdate.storyFlags).toEqual(['jail-pippit-met']);
  expect(chapterUpdate.knownPeople).toEqual(['pippit']);
  const storyUpdate=structuredClone(chapterUpdate);storyUpdate.storyFlags.push('stormworks-signal');
  expect(updateChapter(storyUpdate,'stormworks',{charge:56}).storyFlags).toEqual(['jail-pippit-met','stormworks-signal']);
  const done=completeLateChapter(chapterUpdate,'crown-edge',72);
  expect(done.ended).toBe(false);
  expect(done.unlocked).toEqual([...CHAPTERS]);
  expect(done.completed).toContain('crown-edge');
  expect(done.unlocked).not.toContain('chapter-8');
 });

 it('makes preview, infinite-health, and ineligible states nonpersistent',()=>{
  expect(canPersistCampaign({})).toBe(true);
  expect(canPersistCampaign({devPreview:true})).toBe(false);
  expect(canPersistCampaign({infiniteHealth:true})).toBe(false);
  expect(canPersistCampaign({runEligible:false})).toBe(false);
 });
});
