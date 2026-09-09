import type { RoomRectangle } from './gate1Room';

// One readable route. The only optional layer sits behind breakable walls.
export const CASTLE = { width: 11520, top: -800, bottom: 400, bossStart: 8960 } as const;
const PLATFORM_LAYOUT: RoomRectangle[] = [
  {x:5760,y:380,width:6400,height:40},
  // Royal gallery: single rising route.
  {x:2730,y:300,width:150,height:24},{x:2930,y:235,width:130,height:24},
  {x:3120,y:155,width:130,height:24},{x:3315,y:65,width:135,height:24},
  {x:3520,y:-25,width:145,height:24},{x:3735,y:70,width:140,height:24},
  {x:3935,y:165,width:135,height:24},{x:4130,y:255,width:150,height:24},
  // Bell tower: one-way switchback, no parallel route.
  {x:4350,y:285,width:140,height:24},{x:4540,y:195,width:125,height:24},
  {x:4350,y:105,width:125,height:24},{x:4540,y:15,width:125,height:24},
  {x:4350,y:-75,width:125,height:24},{x:4540,y:-165,width:125,height:24},
  {x:4750,y:-255,width:150,height:24},{x:4950,y:-165,width:130,height:24},
  {x:5145,y:-75,width:130,height:24},{x:5335,y:15,width:130,height:24},
  {x:5530,y:105,width:130,height:24},{x:5725,y:195,width:135,height:24},
  // Foundry: low mandatory tunnel; rocks make the route unmistakable.
  {x:5940,y:285,width:145,height:24},{x:6150,y:220,width:130,height:24},
  {x:6360,y:145,width:125,height:24},{x:6570,y:70,width:125,height:24},
  {x:6780,y:145,width:125,height:24},{x:6990,y:220,width:130,height:24},
  {x:7200,y:285,width:145,height:24},
  // Audience hall: harder single chain.
  {x:7420,y:265,width:130,height:24},{x:7615,y:175,width:120,height:24},
  {x:7810,y:75,width:115,height:24},{x:8015,y:-35,width:115,height:24},
  {x:8220,y:-145,width:120,height:24},{x:8425,y:-45,width:120,height:24},
  {x:8630,y:65,width:120,height:24},{x:8825,y:175,width:130,height:24},
  {x:9010,y:285,width:170,height:24},
  // Breakable-wall-only optional dead ends.
  {x:3460,y:-190,width:190,height:24},{x:6470,y:-120,width:180,height:24},
  {x:8070,y:-300,width:170,height:24},
  // Double-width, double-height boss arena.
  {x:10240,y:380,width:2560,height:40},
  {x:9220,y:280,width:180,height:24},{x:9480,y:170,width:170,height:24},
  {x:9740,y:70,width:165,height:24},{x:10000,y:-30,width:165,height:24},
  {x:10260,y:-130,width:165,height:24},{x:10520,y:-30,width:165,height:24},
  {x:10780,y:70,width:165,height:24},{x:11040,y:170,width:170,height:24},
  {x:9620,y:280,width:160,height:24},{x:9900,y:180,width:160,height:24},
  {x:10700,y:180,width:160,height:24},{x:11000,y:280,width:160,height:24},
  {x:11300,y:280,width:180,height:24},{x:10360,y:285,width:220,height:24}
];

// Keep one low corridor before the arena, with occasional overhead landings.
export const CASTLE_PLATFORMS = PLATFORM_LAYOUT.filter(p =>
  p.height===40 || p.x>=8960 || (p.y>=195 && p.width>=130)
);
// A raised 320px gap: sprint + full jump + extended dash; floor catches misses.
CASTLE_PLATFORMS.push({x:4790,y:230,width:220,height:24},{x:5330,y:230,width:220,height:24});
CASTLE_PLATFORMS.push({x:4610,y:300,width:140,height:24});

export type CastleEnemySpawn={x:number;y:number;left:number;right:number;pointed:boolean;jumper:boolean};
export const CASTLE_ENEMIES:CastleEnemySpawn[]=[
  {x:3000,y:190,left:2870,right:3180,pointed:false,jumper:true},
  {x:3680,y:20,left:3520,right:3820,pointed:true,jumper:false},
  {x:4460,y:50,left:4300,right:4620,pointed:false,jumper:true},
  {x:5220,y:-120,left:5080,right:5380,pointed:true,jumper:false},
  {x:6100,y:165,left:5950,right:6250,pointed:false,jumper:true},
  {x:6820,y:95,left:6690,right:6960,pointed:true,jumper:false},
  {x:7540,y:125,left:7410,right:7700,pointed:false,jumper:true},
  {x:8150,y:-195,left:8000,right:8320,pointed:true,jumper:false},
  {x:8720,y:15,left:8580,right:8860,pointed:false,jumper:true}
];

export const STORY=[
  {x:2670,text:'These banners… my crest. This was my kingdom.'},
  {x:4300,text:'The machines left only one road through my own halls.'},
  {x:5900,text:'They have turned the old foundry against us.'},
  {x:7380,text:'Dead ends. Traps. Someone expected my return.'},
  {x:8900,text:'That winged sentinel guards the answer.'}
];
