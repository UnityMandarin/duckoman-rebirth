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
 jail:[],
 outside:[{room:0,x:490,text:'FALLEN KINGDOM / FRANKLIN: EAST'},{room:23,x:145,text:'FOX BORDER GATE / EASTERN ROAD'}],
 crimson:[{room:0,x:180,bottomY:294,text:'SCARLET BORDER / KING CAPTURED'},{room:11,x:145,text:'UNDER THE THRONE / FRANKLIN BELOW'}],
 rescue:[{room:0,x:720,bottomY:360,text:'RUNE SEAL / SAVE FRANKLIN'},{room:0,x:1750,bottomY:360,text:'EASTERN PASSAGE / FREE FRANKLIN'}]
};

export const CHAPTER_DOORS:Readonly<Record<IdentityChapter,DoorMode>>={jail:{kind:'lift',duration:650,distance:560},outside:{kind:'fold',duration:700},crimson:{kind:'lift-fade',duration:700,distance:560},rescue:{kind:'dissolve',duration:520}};
export const CHAPTER_SPIKES_FLIP_Y:Readonly<Record<IdentityChapter,boolean>>={jail:true,outside:false,crimson:false,rescue:false};
