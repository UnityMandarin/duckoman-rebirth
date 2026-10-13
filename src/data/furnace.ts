/** Chapter 5 traversal. Platform coordinates are room-local, Y is the visible top. */
export const FURNACE_ROOM_WIDTH=1440;
export const FURNACE_BOSS_CHECKPOINT=11*FURNACE_ROOM_WIDTH;
export const FURNACE_TOTAL_LENGTH=FURNACE_BOSS_CHECKPOINT+2000;
export const FURNACE_CHECKPOINTS=[0,80,...[2,4,6,8,10].map(i=>i*FURNACE_ROOM_WIDTH+80),FURNACE_BOSS_CHECKPOINT];
export type FurnaceCircuit=1|2|3;
export interface FurnacePlatform {x:number;top:number;width:number;circuit?:FurnaceCircuit;}
export interface FurnaceMachine {step:number;type:'conveyor'|'lift'|'presses';direction?:-1|1;strength?:number;}
export interface FurnaceRobot {step:number;type:'guard'|'jumper'|'pointed';}
export interface FurnaceRoom {name:string;entryTop:number;exitTop:number;steps:readonly FurnacePlatform[];machines:readonly FurnaceMachine[];robots:readonly FurnaceRobot[];story?:string;}
const p=(x:number,top:number,width=160,circuit?:FurnaceCircuit):FurnacePlatform=>({x,top,width,...(circuit?{circuit}:{})});
// Permanent wide islands separate short numbered heat chains. No floor beneath the route.
export const FURNACE_ROOMS:readonly FurnaceRoom[]=[
 {name:'Furnace Intake',entryTop:360,exitTop:360,steps:[p(300,296,160,1),p(520,240,160,2),p(760,192,240),p(1000,240,160,3),p(1200,296,160,1),p(1360,320,160)],machines:[],robots:[{step:2,type:'guard'}]},
 {name:'Boiler Stair',entryTop:360,exitTop:80,steps:[p(300,296,160,1),p(520,232,160,2),p(200,168,224),p(560,104,160,3),p(800,40,160,1),p(1120,16,240),p(1350,48,160)],machines:[],robots:[]},
 {name:'Tread Assembly',entryTop:80,exitTop:80,steps:[p(300,16,160,1),p(540,-32,160,2),p(780,-80,240),p(1020,-32,160,3),p(1220,16,160,1),p(1360,48,160)],machines:[{step:0,type:'conveyor',direction:1,strength:70},{step:1,type:'conveyor',direction:-1,strength:70},{step:3,type:'conveyor',direction:1,strength:100}],robots:[]},
 {name:'Piston Shaft',entryTop:80,exitTop:-220,steps:[p(300,16,160,1),p(520,-32,160),p(200,-80,224),p(600,-144,176,2),p(800,-208,160,3),p(1120,-272,240),p(1350,-252,160)],machines:[{step:1,type:'lift'},{step:3,type:'presses'}],robots:[]},
 {name:'Ignition Gallery',entryTop:-220,exitTop:-220,steps:[p(272,-284,160,1),p(632,-332,160,2),p(900,-380,200),p(1100,-332,128,3),p(1256,-284,96,1),p(1370,-252,160)],machines:[],robots:[]},
 {name:'Robot Foundry',entryTop:-220,exitTop:80,steps:[p(300,-284,160,1),p(540,-220,160,2),p(780,-156,240),p(1020,-92,160,3),p(1220,-28,160,1),p(1360,48,160)],machines:[],robots:[{step:2,type:'guard'},{step:5,type:'jumper'}]},
 {name:'Exhaust Spine',entryTop:80,exitTop:-220,steps:[p(300,16,160,1),p(520,-32,160),p(760,-80,240),p(1000,-144,160,2),p(1200,-208,160,3),p(1360,-252,160)],machines:[{step:1,type:'lift'}],robots:[]},
 {name:'Smelting Channel',entryTop:-220,exitTop:-220,steps:[p(272,-284,160,1),p(632,-332,160,2),p(900,-380,200),p(1100,-332,128,3),p(1256,-284,96,1),p(1370,-252,160)],machines:[],robots:[]},
 {name:'Armor Works',entryTop:-220,exitTop:80,steps:[p(300,-284,160,1),p(540,-220,160,2),p(780,-156,240),p(1020,-92,160,3),p(1220,-28,160,1),p(1360,48,160)],machines:[{step:0,type:'conveyor',direction:-1,strength:90},{step:3,type:'conveyor',direction:1,strength:110}],robots:[{step:2,type:'pointed'},{step:5,type:'guard'}]},
 {name:'Furnace Heart',entryTop:80,exitTop:360,steps:[p(272,16,160,1),p(632,64,160,2),p(900,128,200),p(1100,192,128,3),p(1256,256,96,1),p(1370,328,160)],machines:[{step:3,type:'presses'}],robots:[]},
 {name:'Control Approach',entryTop:360,exitTop:360,steps:[p(300,296,160,1),p(540,248,160),p(780,200,240),p(1020,248,160,2),p(1220,296,160,3),p(1360,328,160)],machines:[{step:1,type:'lift'},{step:3,type:'conveyor',direction:1,strength:70}],robots:[{step:2,type:'guard'}],story:'Franklin Fox is ahead. The chip is controlling him. Break its hold; bring your friend home.'}
];
