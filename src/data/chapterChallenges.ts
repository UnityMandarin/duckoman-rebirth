import type {ChapterKind} from './chapters';
import {roomFor,JAIL_ROOMS,OUTSIDE_ROOMS} from './qualityRooms';

// Timing and guard pressure change; authored route geometry is shared by campaign and drills.
export const CHAPTER_DIFFICULTY={jail:1.2,outside:1.44,crimson:1.728} as const;
export type Challenge='presses'|'crumble'|'ambush'|'ascent'|'relay'|'crossfire'|'ferry'|'lift'|'gust'|'conveyor'|'shutters'|'rest'|'descent';
export type RouteFormat='gallery'|'split'|'bridge'|'switchback'|'arena'|'descent'|'sprint'|'tower'|'sanctuary';
export type Pacing='learn'|'test'|'calm';
type Step=readonly [number,number,number];
export interface EnemyPlacement {x:number;y:number;type:'guard'|'pointed'|'jumper'|'boar'|'hare';patrol:number;support?:'floor'|number;}
export type SpikePlacement=number|{x:number;support:'floor'|number};
export interface Encounter {type:Challenge;format:RouteFormat;pacing:Pacing;steps:readonly Step[];spikes:readonly SpikePlacement[];enemies:readonly EnemyPlacement[];wind?:{direction:-1|1;strength:number};conveyor?:{direction:-1|1;strength:number};moving?:readonly {step:number;type:'ferry'|'lift'|'shutters'|'crumble'|'presses'|'conveyor';direction?:-1|1;strength?:number}[];}
export interface SurfaceEffect {platformIndex:number;type:'ferry'|'lift'|'conveyor'|'shutters';direction:-1|1;strength:number;}
const e=(type:Challenge,format:RouteFormat,pacing:Pacing,steps:readonly Step[],spikes:readonly number[],enemies:readonly EnemyPlacement[],extra:Pick<Encounter,'wind'|'conveyor'>={}):Encounter=>({type,format,pacing,steps,spikes,enemies,...extra});
const g=(x:number,y:number,patrol=80,support?:'floor'|number):EnemyPlacement=>({x,y,type:'guard',patrol,support});
const p=(x:number,y:number,patrol=70,support?:'floor'|number):EnemyPlacement=>({x,y,type:'pointed',patrol,support});
const j=(x:number,y:number,patrol=90,support?:'floor'|number):EnemyPlacement=>({x,y,type:'jumper',patrol,support});
const b=(x:number,y:number,patrol=90,support?:'floor'|number):EnemyPlacement=>({x,y,type:'boar',patrol,support});
const h=(x:number,y:number,patrol=90,support?:'floor'|number):EnemyPlacement=>({x,y,type:'hare',patrol,support});
const formatFor:Record<Challenge,RouteFormat>={presses:'split',crumble:'bridge',ambush:'arena',ascent:'switchback',relay:'sprint',crossfire:'arena',ferry:'bridge',lift:'tower',gust:'bridge',conveyor:'sprint',shutters:'split',rest:'sanctuary',descent:'descent'};
const roomEncounters=(rooms:typeof JAIL_ROOMS):Encounter[]=>rooms.map(room=>({type:room.challenge as Challenge,format:formatFor[room.challenge as Challenge],pacing:room.pacing,steps:room.steps,spikes:room.spikes,enemies:room.enemies.map(enemy=>({x:enemy.x,y:0,type:enemy.type,patrol:enemy.patrol,support:enemy.support})),wind:room.wind,conveyor:room.conveyor,moving:room.moving}));
export const JAIL_ENCOUNTERS:Encounter[]=roomEncounters(JAIL_ROOMS);
export const OUTSIDE_ENCOUNTERS:Encounter[]=roomEncounters(OUTSIDE_ROOMS);

export const CRIMSON_ENCOUNTERS:Encounter[]=[
 e('rest', 'gallery', 'calm', [[180,310,240],[590,250,420],[1120,300,360]] as const, [], [], {}),
 {...e('conveyor', 'sprint', 'test', [[180,310,200],[455,280,250],[780,280,340],[1130,280,250],[1310,310,160]] as const, [355,439,1026,1110], [b(780,335,90,'floor'),p(1130,239,80,3)], {conveyor:{direction:1,strength:90}}),moving:[1,2,3].map(step=>({step,type:'conveyor' as const,direction:1 as const,strength:90}))},
 {...e('gust', 'split', 'test', [[185,310,210],[455,280,220],[705,190,260],[1045,270,250],[1295,310,190]] as const, [340,424,1026,1110], [h(705,149,80,2),p(1045,335,80,3)], {wind:{direction:-1,strength:100}}),moving:[]},
 {...e('relay', 'switchback', 'test', [[190,310,190],[445,230,200],[270,140,160],[710,120,300],[1025,240,220],[1290,300,180]] as const, [390,474,996,1080], [p(445,189,60,1),h(1290,335,60,'floor')], {wind:{direction:1,strength:80},conveyor:{direction:1,strength:80}}),moving:[{step:1,type:'conveyor' as const,direction:1 as const,strength:80},{step:2,type:'crumble' as const},{step:3,type:'conveyor' as const,direction:1 as const,strength:80}]},
 {...e('crossfire', 'arena', 'test', [[170,310,200],[450,250,230],[780,205,460],[1230,300,240]] as const, [355,439,1046,1130], [p(450,209,70,1),b(780,164,90,2),h(1300,335,60,'floor')], {wind:{direction:1,strength:105},conveyor:{direction:-1,strength:85}}),moving:[{step:1,type:'conveyor' as const,direction:-1 as const,strength:85},{step:2,type:'conveyor' as const,direction:-1 as const,strength:85},{step:3,type:'presses' as const}]},
 {...e('ferry', 'bridge', 'test', [[175,300,210],[485,240,220],[925,235,260],[1285,300,190]] as const, [700,784], [b(485,335,80,'floor'),h(1285,194,60,3)], {wind:{direction:-1,strength:90}}),moving:[{step:1,type:'ferry' as const},{step:2,type:'ferry' as const}]},
 {...e('conveyor', 'descent', 'test', [[170,310,180],[455,220,220],[760,160,300],[1065,245,230],[1290,310,190]] as const, [350,434,1016,1100], [h(455,179,70,1),p(760,119,90,2),b(1290,335,60,'floor')], {wind:{direction:-1,strength:95},conveyor:{direction:-1,strength:105}}),moving:[1,2,3].map(step=>({step,type:'conveyor' as const,direction:-1 as const,strength:105}))},
 {...e('lift', 'tower', 'test', [[190,310,220],[450,260,220],[735,160,290],[1040,250,210],[1285,305,190]] as const, [380,464,996,1080], [p(190,219,60,0),h(735,119,90,2),b(1285,335,60,'floor')], {wind:{direction:1,strength:110}}),moving:[{step:1,type:'lift' as const}]},
 {...e('gust', 'sprint', 'test', [[180,310,190],[430,270,180],[695,205,230],[960,245,210],[1220,280,220],[1335,315,140]] as const, [335,419,1060,1144], [h(695,164,80,2),p(1335,335,40,'floor')], {wind:{direction:1,strength:100},conveyor:{direction:1,strength:90}}),moving:[1,2,3,4].map(step=>({step,type:'conveyor' as const,direction:1 as const,strength:90}))},
 {...e('rest', 'sanctuary', 'calm', [[260,310,340],[720,265,500],[1220,310,240]] as const, [], [p(1220,335,70,'floor')], {wind:{direction:1,strength:85}}),moving:[]}
];
export function encounterFor(kind:ChapterKind,index:number):Encounter|undefined{
 const authored=(kind==='jail'?JAIL_ENCOUNTERS:kind==='outside'?OUTSIDE_ENCOUNTERS:undefined)?.[index];if(authored)return authored;
 if(kind==='crimson'){const old=CRIMSON_ENCOUNTERS[index];if(old)return {...old,spikes:old.spikes.map(spike=>typeof spike==='number'?{x:spike,support:'floor' as const}:spike)};}
 return undefined;
}
export function encounterSurfaceEffects(encounter:Encounter):SurfaceEffect[]{
 const effects:SurfaceEffect[]=[];
 for(const entry of encounter.moving??[])if(entry.type==='ferry'||entry.type==='lift'||entry.type==='shutters'||entry.type==='conveyor')effects.push({platformIndex:entry.step,type:entry.type,direction:entry.direction??1,strength:entry.strength??0});
 if(encounter.conveyor&&!encounter.moving?.some(entry=>entry.type==='conveyor'))for(let platformIndex=1;platformIndex<encounter.steps.length-1;platformIndex++)effects.push({platformIndex,type:'conveyor',direction:encounter.conveyor.direction,strength:encounter.conveyor.strength});
 return effects;
}
export function advanceWindDrift(drift:number,direction:-1|1,strength:number,deltaSeconds:number,active:boolean,limit=85):number{if(!active)return 0;return Math.max(-limit,Math.min(limit,drift+direction*strength*Math.max(0,deltaSeconds)));}
export function addWindDrift(baseVelocity:number,drift:number,active:boolean):number{return baseVelocity+(active?drift:0);}
export function canReceiveWind(inWind:boolean,grounded:boolean,dashing:boolean,usingUltimate:boolean):boolean{return inWind&&!grounded&&!dashing&&!usingUltimate;}
