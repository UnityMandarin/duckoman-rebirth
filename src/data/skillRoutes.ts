import type {ChapterKind} from './chapters';

export const SKILL_ROUTES=[
 {id:'jail-laundry',name:'Laundry Leap',chapter:'jail',section:2,stepIndexes:[1,2,3],goal:'Cracked ledges break'},
 {id:'jail-vault',name:'Vault Switchback',chapter:'jail',section:5,stepIndexes:[2,3,4],goal:'Climb, turn, cross'},
 {id:'jail-drain',name:'Drain Dash',chapter:'jail',section:9,stepIndexes:[1,2,3],goal:'Red lines mark falling stone'},
 {id:'outside-market',name:'Market Momentum',chapter:'outside',section:3,stepIndexes:[1,2,3],goal:'Arrows show the moving floor'},
 {id:'outside-wind',name:'Wind Lines',chapter:'outside',section:7,stepIndexes:[1,2,3],goal:'Wind bends jumps; dash holds course'},
 {id:'outside-stonewater',name:'Stonewater Beat',chapter:'outside',section:14,stepIndexes:[1,2,4],goal:'Fading ledges will vanish'},
 {id:'crimson-avenue',name:'Occupation Run',chapter:'crimson',section:1,stepIndexes:[1,2,3],goal:'Arrows show the moving floor'},
 {id:'crimson-parade',name:'Parade Counterflow',chapter:'crimson',section:4,stepIndexes:[1,2,3],goal:'Red lines mark falling stone'},
 {id:'crimson-crown',name:'Crown Circuit',chapter:'crimson',section:8,stepIndexes:[1,2,4],goal:'Wind bends jumps; dash holds course'}
] as const satisfies readonly {id:string;name:string;chapter:ChapterKind;section:number;stepIndexes:readonly [number,number,number];goal:string}[];

export type SkillRouteId=typeof SKILL_ROUTES[number]['id'];
export type SkillRoute=typeof SKILL_ROUTES[number];
const ROUTE_IDS=new Set<string>(SKILL_ROUTES.map(route=>route.id));
export function isSkillRouteId(value:unknown):value is SkillRouteId{return typeof value==='string'&&ROUTE_IDS.has(value);}
export function skillRoute(id:unknown):SkillRoute|undefined{return isSkillRouteId(id)?SKILL_ROUTES.find(route=>route.id===id):undefined;}
