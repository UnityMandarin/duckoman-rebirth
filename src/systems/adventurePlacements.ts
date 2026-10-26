import type {CampaignScene} from './progress';
import {SECTION_WIDTH,type ChapterKind} from '../data/chapters';
import {GATE_1_ROOM} from '../data/gate1Room';
import {JAIL_ROOMS,OUTSIDE_ROOMS,qualityPlatforms} from '../data/qualityRooms';
import {encounterFor} from '../data/chapterChallenges';
import {LATE_ROOMS} from '../data/lateChapters';

export function safeQualitySupport(kind:ChapterKind,room:number,step:number,blocked:number[]=[],offset=0):{x:number;top:number}{
 const support=qualityPlatforms(kind).find(p=>p.room===room&&p.role==='ledge'&&p.step===step);if(!support)throw new Error(`Missing authored ${kind} support ${room}:${step}`);
 const data=(kind==='jail'?JAIL_ROOMS:OUTSIDE_ROOMS)[room],s=data?.steps[step];if(!data||!s||data.moving.some(m=>m.step===step)||data.spikes.some(h=>h.support===step)||data.enemies.some(h=>h.support===step&&Math.abs(h.x-s[0])<=h.patrol+50))throw new Error(`Hazardous adventure support ${kind}:${room}:${step}`);
 const x=support.x+offset,top=support.y-support.height/2;if(x<support.x-support.width/2+28||x>support.x+support.width/2-28||blocked.some(h=>Math.abs(x-h)<115))throw new Error(`Unsafe adventure placement on ${kind} support ${room}:${step}`);return{x,top};
}
function safeCastleSupport(index:number):{x:number;top:number}{const p=GATE_1_ROOM.platforms[index];if(!p||p.width<100)throw new Error(`Missing gate support ${index}`);return{x:p.x,top:p.y-p.height/2};}
export function safeCrimsonSupport(room:number,step:number,offset:number,blocked:number[]=[]):{x:number;top:number}{
 const e=encounterFor('crimson',room),s=e?.steps[step];if(!s)throw new Error(`Missing authored crimson support ${room}:${step}`);const x=room*SECTION_WIDTH+s[0]+offset;
 if(e!.moving?.some(m=>m.step===step)||e!.spikes.some(h=>typeof h==='number'?false:h.support===step)||e!.enemies.some(h=>h.support===step&&Math.abs(h.x-s[0])<=h.patrol+50)||Math.abs(offset)>s[2]/2-35||blocked.some(h=>Math.abs(x-h)<115))throw new Error(`Unsafe crimson placement ${room}:${step}`);return{x,top:s[1]-16};
}
export function safeLateSupport(chapter:'stormworks'|'crown-edge',room:number,step:number,offset:number,blocked:number[]=[]):{x:number;top:number}{
 const r=LATE_ROOMS[chapter][room],s=step<0?{x:96,top:r.entryTop,width:192}:r.steps[step];if(!s)throw new Error(`Missing late support ${chapter} ${room}:${step}`);const x=room*SECTION_WIDTH+s.x+offset;
 if(Math.abs(offset)>s.width/2-35||blocked.some(h=>Math.abs(x-h)<115)||r.robots.some(bot=>bot.step===step)||r.machines.some(machine=>machine.step===step))throw new Error(`Unsafe late placement ${chapter} ${room}:${step}`);return{x,top:s.top};
}

type Point={x:number;top:number};
export type AdventurePlacementPlan={people:Point[];devices:Record<string,{lever:Point;relay:Point}>};
/** Resolve every NPC and lever/relay to real, hazard-checked authored supports. */
export function resolveAdventurePlacementPlan(chapter:CampaignScene):AdventurePlacementPlan{
 const quality=(kind:ChapterKind,room:number,step:number,leverOffset:number,relayOffset:number)=>({lever:safeQualitySupport(kind,room,step,[],leverOffset),relay:safeQualitySupport(kind,room,step,[],relayOffset)});
 const crimson=(room:number,step:number)=>({lever:safeCrimsonSupport(room,step,0),relay:safeCrimsonSupport(room,step,65)});
 const late=(key:'stormworks'|'crown-edge',leverStep:number,relayStep:number,offset:number)=>({lever:safeLateSupport(key,0,leverStep,0),relay:safeLateSupport(key,0,relayStep,offset)});
 const plans:Record<CampaignScene,()=>AdventurePlacementPlan>={
  'gate-1':()=>({people:[safeCastleSupport(1)],devices:{}}),
  jail:()=>({people:[safeQualitySupport('jail',0,0,[],0),safeQualitySupport('jail',1,0,[],0)],devices:{'jail-captive-route':quality('jail',0,2,0,65)}}),
  outside:()=>({people:[safeQualitySupport('outside',4,4,[],0)],devices:{'outside-water-restored':quality('outside',4,1,0,-72)}}),
  crimson:()=>({people:[safeCrimsonSupport(0,2,0),safeCrimsonSupport(1,4,0)],devices:{'crimson-freight-bypass':crimson(1,0)}}),
  rescue:()=>({people:[],devices:{}}),
  stormworks:()=>({people:[safeLateSupport('stormworks',0,8,0)],devices:{'stormworks-signal':late('stormworks',2,3,-55)}}),
  'crown-edge':()=>({people:[safeLateSupport('crown-edge',0,-1,0),safeLateSupport('crown-edge',0,5,0)],devices:{'crown-edge-beacon-a':late('crown-edge',2,2,-15),'crown-edge-beacon-b':late('crown-edge',4,4,-15)}})
 };
 return plans[chapter]();
}
export function resolveAdventurePlacements(chapter:CampaignScene):Point[]{return resolveAdventurePlacementPlan(chapter).people;}
