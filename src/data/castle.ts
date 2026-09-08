import type { RoomRectangle } from './gate1Room';

// Heights remain in the original coordinate system: the old floor is y=360.
export const CASTLE = { width: 10240, top: -520, bottom: 400, bossStart: 8980 } as const;
export const CASTLE_PLATFORMS: RoomRectangle[] = [
  {x:6400,y:380,width:7680,height:40},
  // Royal gallery: three connected elevations and a low return passage.
  {x:2730,y:285,width:180,height:24}, {x:2940,y:195,width:170,height:24},
  {x:3150,y:105,width:190,height:24}, {x:3380,y:15,width:180,height:24},
  {x:3540,y:230,width:520,height:24}, {x:3210,y:325,width:300,height:24},
  {x:3680,y:-75,width:300,height:24}, {x:3880,y:105,width:160,height:24},
  // Bell tower: switchbacks up a shaft, with a lower escape route.
  {x:4100,y:285,width:160,height:24}, {x:4280,y:195,width:160,height:24},
  {x:4100,y:105,width:160,height:24}, {x:4280,y:15,width:160,height:24},
  {x:4100,y:-75,width:160,height:24}, {x:4280,y:-165,width:160,height:24},
  {x:4500,y:-255,width:300,height:24}, {x:4500,y:210,width:300,height:24},
  {x:4710,y:115,width:130,height:24}, {x:4890,y:15,width:150,height:24},
  // Foundry galleries connect over the machinery and below its bridges.
  {x:5160,y:270,width:220,height:24}, {x:5420,y:180,width:180,height:24},
  {x:5620,y:90,width:180,height:24}, {x:5810,y:0,width:150,height:24},
  {x:6040,y:-90,width:260,height:24}, {x:5900,y:270,width:300,height:24},
  {x:6290,y:200,width:180,height:24}, {x:6500,y:110,width:180,height:24},
  // Broken audience hall: wide landings, changing directions, optional roof.
  {x:6750,y:280,width:180,height:24}, {x:6950,y:190,width:160,height:24},
  {x:6770,y:100,width:160,height:24}, {x:6970,y:10,width:160,height:24},
  {x:7200,y:-80,width:230,height:24}, {x:7440,y:-170,width:180,height:24},
  {x:7320,y:270,width:400,height:24}, {x:7670,y:175,width:180,height:24},
  {x:7900,y:85,width:200,height:24}, {x:8130,y:-5,width:180,height:24},
  {x:8370,y:270,width:230,height:24}, {x:8580,y:180,width:150,height:24},
  {x:8790,y:90,width:210,height:24},
  // Arena has three offset tiers; each rise is within an ordinary robot jump.
  {x:9170,y:280,width:180,height:24}, {x:9430,y:200,width:180,height:24},
  {x:9690,y:120,width:180,height:24}, {x:9950,y:200,width:180,height:24},
  {x:10130,y:280,width:160,height:24}, {x:9660,y:300,width:180,height:24}
  ,{x:3810,y:275,width:40,height:170}
  ,{x:3700,y:305,width:130,height:24}
  ,{x:5030,y:265,width:42,height:190}
  ,{x:4850,y:295,width:150,height:24}
  ,{x:6460,y:280,width:36,height:160}
  ,{x:6350,y:300,width:130,height:24}
  ,{x:8040,y:275,width:40,height:170}
  ,{x:7900,y:300,width:160,height:24}
];
export const CASTLE_ENEMIES = [
  {x:3000,y:330,left:2860,right:3130,pointed:false},
  {x:3590,y:185,left:3350,right:3750,pointed:false},
  {x:4540,y:170,left:4390,right:4610,pointed:true},
  {x:5400,y:330,left:5320,right:5520,pointed:true},
  {x:5940,y:225,left:5790,right:6010,pointed:false},
  {x:6500,y:65,left:6450,right:6550,pointed:true},
  {x:7230,y:330,left:7080,right:7390,pointed:true},
  {x:7330,y:225,left:7170,right:7470,pointed:false},
  {x:7900,y:40,left:7835,right:7965,pointed:true},
  {x:8490,y:330,left:8280,right:8700,pointed:false}
];
export const STORY = [
  {x:2670,text:'These banners… my crest. This was my kingdom.'},
  {x:3900,text:'I was gone too long. Who let these machines into my home?'},
  {x:5100,text:'They have turned the old foundry against us.'},
  {x:6680,text:'My throne is broken. But someone is still giving orders.'},
  {x:8140,text:'Royal seals on machine orders… who is using my name?'},
  {x:8960,text:'That winged sentinel guards the answer.'}
];
