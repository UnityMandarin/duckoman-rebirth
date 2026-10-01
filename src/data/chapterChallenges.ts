import type {ChapterKind} from './chapters';

// Timing and guard pressure change; authored route geometry is shared by campaign and drills.
export const CHAPTER_DIFFICULTY={jail:1.2,outside:1.5,crimson:1.65} as const;
export type Challenge='presses'|'crumble'|'ambush'|'ascent'|'relay'|'crossfire'|'ferry'|'lift'|'gust'|'conveyor'|'shutters'|'rest';
export type RouteFormat='gallery'|'split'|'bridge'|'switchback'|'arena'|'descent'|'sprint'|'tower'|'sanctuary';
export type Pacing='learn'|'test'|'calm';
type Step=readonly [number,number,number];
export interface EnemyPlacement {x:number;y:number;type:'guard'|'pointed'|'jumper'|'boar'|'hare';patrol:number;}
export interface Encounter {type:Challenge;format:RouteFormat;pacing:Pacing;steps:readonly Step[];spikes:readonly number[];enemies:readonly EnemyPlacement[];wind?:{direction:-1|1;strength:number};conveyor?:{direction:-1|1;strength:number};}
export interface SurfaceEffect {platformIndex:number;type:'ferry'|'lift'|'conveyor'|'shutters';direction:-1|1;strength:number;}
const e=(type:Challenge,format:RouteFormat,pacing:Pacing,steps:readonly Step[],spikes:readonly number[],enemies:readonly EnemyPlacement[],extra:Pick<Encounter,'wind'|'conveyor'>={}):Encounter=>({type,format,pacing,steps,spikes,enemies,...extra});
const g=(x:number,y:number,patrol=80):EnemyPlacement=>({x,y,type:'guard',patrol});
const p=(x:number,y:number,patrol=70):EnemyPlacement=>({x,y,type:'pointed',patrol});
const j=(x:number,y:number,patrol=90):EnemyPlacement=>({x,y,type:'jumper',patrol});
const b=(x:number,y:number,patrol=90):EnemyPlacement=>({x,y,type:'boar',patrol});
const h=(x:number,y:number,patrol=90):EnemyPlacement=>({x,y,type:'hare',patrol});
export const JAIL_ENCOUNTERS:Encounter[]=[
 e('ascent', 'gallery', 'learn', [[210,280,150],[430,190,170],[680,100,180],[940,200,140],[1170,280,150]] as const, [760,844], [g(430, 149, 80), p(680, 59, 70)], {}),
 e('presses', 'split', 'test', [[160,300,180],[430,300,220],[690,210,140],[990,300,240],[1270,300,160]] as const, [380,464,882,966], [g(990, 335, 80), j(1270, 259, 60)], {}),
 e('crumble', 'bridge', 'test', [[100,315,180],[360,260,160],[650,220,230],[990,250,180],[1300,310,180]] as const, [330,414,1002,1086], [p(650, 179, 70), g(990, 209, 70)], {}),
 e('ferry', 'bridge', 'learn', [[210,280,200],[520,235,180],[880,235,180],[1230,280,200]] as const, [340,424,1036,1120], [g(1230, 239, 70)], {}),
 e('ambush', 'arena', 'test', [[260,300,240],[730,245,680],[1255,300,200]] as const, [520,604], [p(600, 204, 70), g(970, 335, 70), j(1255, 259, 60)], {}),
 e('ascent', 'switchback', 'test', [[190,300,170],[425,210,180],[250,120,150],[585,95,230],[885,185,210],[1235,270,230]] as const, [360,444,916,1000], [p(585, 54, 70), g(1235, 335, 80)], {}),
 e('rest', 'sanctuary', 'calm', [[320,300,360],[890,270,480],[1295,310,170]] as const, [], [], {}),
 e('relay', 'sprint', 'test', [[175,310,190],[465,265,210],[800,245,360],[1195,310,210]] as const, [360,444,1000,1084], [j(465, 224, 70), p(1195, 335, 60)], {}),
 e('shutters', 'split', 'test', [[180,300,170],[440,240,180],[730,180,200],[1020,225,220],[1300,310,170]] as const, [410,494], [p(730, 139, 70), g(1300, 269, 60)], {}),
 e('crossfire', 'descent', 'test', [[170,290,180],[425,200,170],[720,140,260],[1015,235,240],[1310,310,170]] as const, [360,444,1036,1120], [p(720, 99, 80), g(1310, 335, 60)], {}),
 e('lift', 'tower', 'learn', [[180,300,200],[470,265,210],[700,185,280],[995,240,200],[1290,310,200]] as const, [370,454], [g(700, 144, 80), j(1290, 269, 60)], {}),
 e('rest', 'sanctuary', 'calm', [[190,300,300],[690,275,420],[1195,300,300]] as const, [], [g(1195, 335, 70)], {})
];

export const OUTSIDE_ENCOUNTERS:Encounter[]=[
 e('rest', 'gallery', 'calm', [[240,310,300],[705,255,420],[1205,310,300]] as const, [], [], {}),
 e('ambush', 'split', 'test', [[175,310,180],[430,260,220],[685,190,220],[1015,290,360],[1305,305,180]] as const, [610,694], [h(430, 219, 70), b(1015, 335, 90)], {}),
 e('crumble', 'sprint', 'test', [[170,310,200],[460,275,140],[760,275,260],[1110,275,180],[1310,310,160]] as const, [340,424,980,1064], [h(460, 234, 60), b(1110, 335, 70)], {}),
 e('conveyor', 'sprint', 'learn', [[180,300,210],[460,300,250],[790,300,250],[1120,300,200]] as const, [], [b(1120, 335, 60)], {"conveyor":{"direction":1,"strength":70}}),
 e('ascent', 'switchback', 'test', [[180,305,170],[430,225,160],[260,125,140],[600,110,260],[965,195,220],[1285,310,180]] as const, [800,884], [p(600, 69, 80), b(965, 154, 80)], {}),
 e('relay', 'descent', 'test', [[160,310,190],[400,240,170],[690,175,310],[1015,240,250],[1295,310,190]] as const, [340,424,1056,1140], [b(690, 335, 90), p(1015, 199, 70)], {}),
 e('rest', 'sanctuary', 'calm', [[300,310,430],[830,270,520],[1285,300,210]] as const, [], [], {}),
 e('gust', 'bridge', 'learn', [[180,310,220],[470,295,240],[760,265,260],[1080,295,240],[1300,310,180]] as const, [], [p(1080, 254, 70), h(1300, 335, 60)], {"wind":{"direction":1,"strength":80}}),
 e('ascent', 'tower', 'test', [[200,300,210],[485,215,185],[735,115,260],[1080,220,210],[1295,305,180]] as const, [390,474], [b(735, 74, 90), h(1295, 264, 60)], {}),
 e('crumble', 'split', 'test', [[180,310,200],[455,275,180],[660,180,260],[990,275,240],[1290,310,190]] as const, [370,454,1016,1100], [h(660, 139, 80), b(990, 335, 80)], {}),
 e('crossfire', 'arena', 'test', [[190,305,250],[520,245,220],[820,165,400],[1250,300,210]] as const, [390,474], [p(520, 204, 70), h(820, 124, 90), b(1250, 335, 70)], {}),
 e('rest', 'sanctuary', 'calm', [[190,305,260],[590,230,420],[1130,305,400]] as const, [], [], {}),
 e('gust', 'descent', 'test', [[180,310,190],[445,275,190],[710,225,260],[1020,270,255],[1290,310,180]] as const, [340,424,1006,1090], [b(710, 335, 80), h(1020, 229, 80)], {"wind":{"direction":1,"strength":115}}),
 e('ferry', 'bridge', 'test', [[160,300,200],[450,235,190],[860,210,220],[1215,280,180]] as const, [640,724], [b(450, 194, 70), h(860, 169, 80)], {"wind":{"direction":1,"strength":85}}),
 e('shutters', 'split', 'test', [[175,310,180],[400,260,170],[625,200,170],[865,240,200],[1130,275,210],[1325,310,160]] as const, [440,524,1066,1150], [p(625, 159, 60), h(1130, 335, 70)], {}),
 e('lift', 'tower', 'test', [[185,305,200],[475,280,210],[760,190,250],[1040,275,190],[1300,305,180]] as const, [360,444,996,1080], [b(475, 239, 70), p(760, 149, 80), h(1040, 234, 70)], {"wind":{"direction":-1,"strength":90}}),
 e('crossfire', 'switchback', 'test', [[180,310,180],[440,225,180],[280,135,160],[690,110,260],[1000,240,220],[1295,310,190]] as const, [360,444,1016,1100], [h(440, 184, 60), p(690, 69, 80), b(1000, 335, 70)], {}),
 e('rest', 'sanctuary', 'calm', [[285,300,410],[765,250,440],[1240,300,320]] as const, [], [], {}),
 e('ferry', 'bridge', 'test', [[170,305,170],[450,225,220],[850,245,220],[1235,300,220]] as const, [650,734], [h(450, 184, 70), b(850, 335, 70)], {"wind":{"direction":1,"strength":90}}),
 e('lift', 'switchback', 'test', [[180,305,190],[470,275,190],[300,190,180],[735,160,280],[1055,270,210],[1285,305,210]] as const, [390,474], [b(470, 234, 60), h(735, 119, 80), p(1055, 229, 60)], {"wind":{"direction":-1,"strength":85}}),
 e('conveyor', 'arena', 'test', [[170,310,180],[445,270,220],[770,270,350],[1115,290,220],[1305,315,150]] as const, [320,404,1016,1100], [p(445, 229, 70), b(770, 335, 90), h(1115, 249, 70)], {"conveyor":{"direction":1,"strength":100}}),
 e('shutters', 'descent', 'test', [[180,300,200],[470,220,210],[765,135,270],[1070,240,220],[1300,310,170]] as const, [390,474,910,994], [h(470, 179, 70), p(765, 94, 80), b(1070, 335, 70)], {})
];

export const CRIMSON_ENCOUNTERS:Encounter[]=[
 e('rest', 'gallery', 'calm', [[180,310,240],[590,250,420],[1120,300,360]] as const, [], [], {}),
 e('conveyor', 'sprint', 'test', [[180,310,200],[455,280,250],[780,280,340],[1130,280,250],[1310,310,160]] as const, [355,439,1026,1110], [b(780, 335, 90), p(1130, 239, 80)], {"conveyor":{"direction":1,"strength":90}}),
 e('gust', 'split', 'test', [[185,310,210],[455,280,220],[705,190,260],[1045,270,250],[1295,310,190]] as const, [340,424,1026,1110], [h(705, 149, 80), p(1045, 335, 80)], {"wind":{"direction":-1,"strength":100}}),
 e('relay', 'switchback', 'test', [[190,310,190],[445,230,200],[270,140,160],[710,120,300],[1025,240,220],[1290,300,180]] as const, [390,474,996,1080], [p(445, 189, 60), h(1025, 335, 70)], {"wind":{"direction":1,"strength":80},"conveyor":{"direction":1,"strength":80}}),
 e('crossfire', 'arena', 'test', [[170,310,200],[450,250,230],[780,205,460],[1230,300,240]] as const, [355,439,1046,1130], [p(450, 209, 70), b(780, 164, 90), h(1230, 335, 80)], {"wind":{"direction":1,"strength":105},"conveyor":{"direction":-1,"strength":85}}),
 e('ferry', 'bridge', 'test', [[175,300,210],[485,240,220],[925,235,260],[1285,300,190]] as const, [700,784], [b(485, 335, 80), h(925, 194, 80)], {"wind":{"direction":-1,"strength":90}}),
 e('conveyor', 'descent', 'test', [[170,310,180],[455,220,220],[760,160,300],[1065,245,230],[1290,310,190]] as const, [350,434,1016,1100], [h(455, 179, 70), p(760, 119, 90), b(1065, 335, 80)], {"wind":{"direction":-1,"strength":95},"conveyor":{"direction":-1,"strength":105}}),
 e('lift', 'tower', 'test', [[190,310,220],[450,260,220],[735,160,290],[1040,250,210],[1285,305,190]] as const, [380,464,996,1080], [p(450, 219, 70), h(735, 119, 90), b(1040, 335, 80)], {"wind":{"direction":1,"strength":110}}),
 e('gust', 'sprint', 'test', [[180,310,190],[430,270,180],[695,205,230],[960,245,210],[1220,280,220],[1335,315,140]] as const, [335,419,1060,1144], [h(695, 164, 80), p(960, 335, 70)], {"wind":{"direction":1,"strength":100},"conveyor":{"direction":1,"strength":90}}),
 e('rest', 'sanctuary', 'calm', [[260,310,340],[720,265,500],[1220,310,240]] as const, [], [p(1220, 335, 70)], {"wind":{"direction":1,"strength":85}})
];
export function encounterFor(kind:ChapterKind,index:number):Encounter|undefined{return (kind==='jail'?JAIL_ENCOUNTERS:kind==='outside'?OUTSIDE_ENCOUNTERS:CRIMSON_ENCOUNTERS)[index];}
export function encounterSurfaceEffects(encounter:Encounter):SurfaceEffect[]{
 const effects:SurfaceEffect[]=[],platformIndexes=Array.from({length:Math.max(0,encounter.steps.length-2)},(_,i)=>i+1);
 if(encounter.type==='ferry'||encounter.type==='lift'||encounter.type==='shutters')for(const platformIndex of platformIndexes)effects.push({platformIndex,type:encounter.type,direction:1,strength:0});
 if(encounter.conveyor)for(const platformIndex of platformIndexes)effects.push({platformIndex,type:'conveyor',...encounter.conveyor});
 return effects;
}
export function advanceWindDrift(drift:number,direction:-1|1,strength:number,deltaSeconds:number,active:boolean,limit=85):number{if(!active)return 0;return Math.max(-limit,Math.min(limit,drift+direction*strength*Math.max(0,deltaSeconds)));}
export function addWindDrift(baseVelocity:number,drift:number,active:boolean):number{return baseVelocity+(active?drift:0);}
export function canReceiveWind(inWind:boolean,grounded:boolean,dashing:boolean,usingUltimate:boolean):boolean{return inWind&&!grounded&&!dashing&&!usingUltimate;}
