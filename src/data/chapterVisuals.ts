export type IdentityChapter='jail'|'outside'|'crimson'|'rescue';
export type IdentityFrame='cap-a'|'cap-b'|'cap-c'|'foundation'|'belt'|'carrier'|'cracked'|'shutter'|'door-frame'|'door-leaf'|'sign'|'rest'|'chain'|'spikes'|'press'|'latch';
export type CapFrame='cap-a'|'cap-b'|'cap-c';
export type PlatformFrame=CapFrame|'belt'|'carrier'|'cracked'|'shutter';
export type DoorMode={kind:'lift';duration:number;distance:number}|{kind:'fold';duration:number}|{kind:'lift-fade';duration:number;distance:number}|{kind:'dissolve';duration:number};

type SurfaceRow={floor:readonly CapFrame[];steps:readonly PlatformFrame[]};
const decodeRow=(floor:string,steps:string):SurfaceRow=>({floor:[...floor].map(cap) as CapFrame[],steps:[...steps].map(surface)});
function cap(code:string):CapFrame{return code==='A'?'cap-a':code==='B'?'cap-b':'cap-c';}
function surface(code:string):PlatformFrame{return code==='A'||code==='B'||code==='C'?cap(code):code==='R'?'cracked':code==='S'?'shutter':code==='T'?'belt':'carrier';}
// These arrays are the authored table in docs/CHAPTER_IDENTITY_SPEC.md, in room and step order.
export const CHAPTER_SURFACES:Readonly<Record<Exclude<IdentityChapter,'rescue'>,readonly SurfaceRow[]>>={
 jail:[decodeRow('A','AABAB'),decodeRow('A','BBABCC'),decodeRow('B','BBCBC'),decodeRow('C','CACCA'),decodeRow('C','CCACCB'),decodeRow('B','BRRBC'),decodeRow('C','CCC'),decodeRow('B','CSBBA'),decodeRow('A','AABAB'),decodeRow('A','ACABA'),decodeRow('B','BABBA'),decodeRow('A','ABAA')],
 outside:[decodeRow('A','AAA'),decodeRow('AC','AACCA'),decodeRow('AA','ARRAA'),decodeRow('A','ATTT'),decodeRow('CAC','CACACC'),decodeRow('AA','ARRBA'),decodeRow('C','CBC'),decodeRow('A','ABBAA'),decodeRow('CC','CCCBC'),decodeRow('CC','CSSCC'),decodeRow('C','CCAC'),decodeRow('C','CCC'),decodeRow('ACA','ABABA'),decodeRow('BB','BMMB'),decodeRow('AA','ASSSA'),decodeRow('C','CMACC'),decodeRow('CC','CACACC'),decodeRow('C','CCC'),decodeRow('BB','BMMB'),decodeRow('AC','AMCACA'),decodeRow('AA','ATTTA'),decodeRow('CC','CSSCC'),decodeRow('C','CC'),decodeRow('A','AA')],
 crimson:[decodeRow('C','CCA'),decodeRow('B','BTTTB'),decodeRow('A','ABCCA'),decodeRow('A','ATRTAB'),decodeRow('C','CTTB'),decodeRow('B','BMMB'),decodeRow('A','ATTTA'),decodeRow('B','BMCBC'),decodeRow('C','CTTTTA'),decodeRow('C','CCC'),decodeRow('A','AA'),decodeRow('C','CC')]
};
export const RESCUE_SURFACES:SurfaceRow={floor:['cap-a'],steps:['cap-a','cap-b','cap-c']};

export interface IdentitySignPlacement{room:number;x:number;bottomY?:number;width?:number;text:string;}
export const CHAPTER_SIGNS:Readonly<Record<IdentityChapter,readonly IdentitySignPlacement[]>>={
 jail:[
  {room:0,x:92,bottomY:1620,text:'J: CELL LATCH / STAIRS EAST'},
  {room:1,x:375,text:'SERVICE SHAFT / CLIMB TO GALLERY'},
  {room:2,x:375,text:'COUNTERWEIGHTS / WAIT FOR RED LINE'},
  {room:3,x:410,text:'LOWER GALLERY / REST / SAVE'},
  {room:4,x:385,text:'EVIDENCE STAIRS / FLOOR 2 ABOVE'},
  {room:5,x:380,text:'CHAINWORKS / CRACKED = FALLING'},
  {room:6,x:495,text:'FLOOR 2 / REST / SAVE'},
  {room:7,x:380,text:'OBSERVATION WALK / EAST: SLUICE DOWN'},
  {room:8,x:175,bottomY:424,text:'SPIRAL DRAIN / FOLLOW THE LEDGES'},
  {room:9,x:180,bottomY:792,text:'CATACOMB LANDING / REST / SAVE'},
  {room:10,x:170,bottomY:1152,text:'DRAINAGE LOCK / WAIT, THEN DESCEND'},
  {room:11,x:395,text:'EASTERN SLUICE / J: LAST LATCH'}
 ],
 outside:[
  {room:0,x:490,text:'FALLEN KINGDOM / FRANKLIN: EAST'},
  {room:1,x:360,text:'ASH GARDENS / BROKEN ROAD AHEAD'},
  {room:2,x:180,bottomY:274,text:'PROCESSION BRIDGE / CRACKS BREAK'},
  {room:3,x:180,bottomY:286,text:'MARKET MILL / REST / SAVE'},
  {room:4,x:365,text:'BELL ORCHARD / UPPER CROSSING'},
  {room:5,x:165,bottomY:274,text:'ROYAL CAUSEWAY / LAND BEFORE DASH'},
  {room:6,x:650,text:'EMBER FARM / REST / SAVE'},
  {room:7,x:180,bottomY:294,text:'FIRST WIND / K HOLDS COURSE'},
  {room:8,x:375,text:'WILDWOOD / FOLLOW GOLD THREAD'},
  {room:9,x:200,bottomY:284,text:'HOLLOW GROVE / REST / SAVE'},
  {room:10,x:395,text:'BRAMBLE ARENA / RED = FALLING STONE'},
  {room:11,x:485,text:'MOONWELL / QUIET CLEARING'},
  {room:12,x:805,text:'RAVEN ROAD / REST / SAVE'},
  {room:13,x:180,bottomY:274,text:'SPLIT RIVER / RIDE, THEN LEAP'},
  {room:14,x:165,bottomY:274,text:'STONEWATER / FADING = NO FLOOR'},
  {room:15,x:695,text:'PILGRIM LIFT / STEP OFF AT TOP'},
  {room:16,x:385,text:'THORN RIDGE / CLIMB THEN CROSS'},
  {room:17,x:605,text:'ANCIENT ROOTS / LOOK ABOVE'},
  {room:18,x:165,bottomY:280,text:'LONG CROSSING / REST / SAVE'},
  {room:19,x:294,bottomY:284,width:156,text:'BORDER LIFT / FRANKLIN: EAST'},
  {room:20,x:175,bottomY:289,text:'ANTLER MILL / ARROWS MOVE FLOOR'},
  {room:21,x:380,text:'FOX LANTERNS / FOLLOW THE BRIDGE'},
  {room:22,x:100,text:'BROKEN REGENT / WAIT FOR HEAD DROP'},
  {room:23,x:145,text:'FOX BORDER GATE / EASTERN ROAD'}
 ],
 crimson:[
  {room:0,x:180,bottomY:294,text:'SCARLET BORDER / KING CAPTURED'},
  {room:1,x:180,bottomY:294,text:'OCCUPATION ROAD / ARMORED: 2 HITS'},
  {room:2,x:650,text:'SILENT FOUNDRY / AGAINST THE WIND'},
  {room:3,x:370,text:'BLOODWATER / CRACKED LEDGE FALLS'},
  {room:4,x:650,text:'SIEGE PARADE / WATCH RED LINES'},
  {room:5,x:680,text:'BELLWORKS / RIDE THE CARRIAGE'},
  {room:6,x:345,text:'REFUGE OF ASH / REST / SAVE'},
  {room:7,x:645,text:'IRON PROCESSION / RIDE THE LIFT'},
  {room:8,x:605,text:'CROWNWORKS / CONTROL THE BELTS'},
  {room:9,x:260,bottomY:294,text:'CAPTIVE KING GATE / REST / SAVE'},
  {room:10,x:145,text:'CRIMSON CLAW / K OR U: SHELL'},
  {room:11,x:145,text:'UNDER THE THRONE / FRANKLIN BELOW'}
 ],
 rescue:[{room:0,x:435,bottomY:360,text:'HOLLOW PRISON / U BREAKS CHAINS'},{room:0,x:720,bottomY:360,text:'RUNE SEAL / SAVE FRANKLIN'},{room:0,x:1750,bottomY:360,text:'EASTERN PASSAGE / DEFEAT THE WARDEN'}]
};

export const CHAPTER_DOORS:Readonly<Record<IdentityChapter,DoorMode>>={jail:{kind:'lift',duration:650,distance:560},outside:{kind:'fold',duration:700},crimson:{kind:'lift-fade',duration:700,distance:560},rescue:{kind:'dissolve',duration:520}};
export const CHAPTER_SPIKES_FLIP_Y:Readonly<Record<IdentityChapter,boolean>>={jail:true,outside:false,crimson:false,rescue:false};
