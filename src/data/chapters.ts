import {CASTLE} from './castle';

export type ChapterKind='jail'|'outside';
export interface Ledge {x:number;y:number;width:number;height:number;}
export interface ChapterSection {name:string;route:'gallery'|'stairs'|'gap'|'gauntlet';story?:string;secret?:string;}
export const CHAPTER_WIDTH={jail:CASTLE.width*1.5,outside:CASTLE.width*3} as const;
export const SECTION_WIDTH=1440;
export const JAIL_SECTIONS:ChapterSection[]=[
 {name:'The Royal Cell',route:'stairs',story:'My own prison. My own crest on the bars. Who gave the order?'},
 {name:'Service Passage',route:'gallery',secret:'The cell locks were replaced before the attack.'},
 {name:'Laundry Galleries',route:'stairs',story:'The upper galleries reconnect with the drains. Either way leads east.'},
 {name:'Silent Cistern',route:'gap',secret:'A scratched message: “Do not trust the iron birds.”'},
 {name:'Guard Quarters',route:'gauntlet',story:'Empty beds. Warm lamps. They left in a hurry.'},
 {name:'Evidence Vault',route:'gallery',secret:'A royal dispatch: Franklin Fox offered sanctuary. The reply was never sent.'},
 {name:'Broken Aqueduct',route:'gap'},
 {name:'Chainworks',route:'stairs',story:'These machines are guarding an empty kingdom.'},
 {name:'Old Catacombs',route:'gallery',secret:'The old escape route was built by the first royal masons.'},
 {name:'Drainage Locks',route:'gauntlet'},
 {name:'Last Watch',route:'stairs',story:'Outside air. One last lock.'},
 {name:'The Eastern Sluice',route:'gallery',story:'The gate wheel is ahead. I am getting out.'}
];
export const OUTSIDE_SECTIONS:ChapterSection[]=[
 {name:'The Fallen Kingdom',route:'stairs',story:'My kingdom… all of it. Franklin Fox must know what happened.'},
 {name:'Ash Gardens',route:'gallery',secret:'A gardener sheltered three families here. Their tracks lead east.'},
 {name:'Broken Procession',route:'gap'},
 {name:'Old Market Road',route:'gauntlet',story:'Not a voice. Only things that used to hide in the woods.'},
 {name:'The Bell Orchard',route:'stairs',secret:'A fox seal: “The border remains open to refugees.”'},
 {name:'Royal Causeway',route:'gap'},
 {name:'Ember Farm',route:'gallery',story:'The road to Franklin runs through the Wildwood.'},
 {name:'East Watch Ruins',route:'gauntlet'},
 {name:'The First Trees',route:'stairs',secret:'Someone tied gold thread to the safe trail.'},
 {name:'Hollow Grove',route:'gallery'},
 {name:'Bramble Crossing',route:'gap',story:'Those animals are wearing the same corruption as IronWing.'},
 {name:'Moonwell',route:'stairs',secret:'The forest guardian has been driven from its clearing.'},
 {name:'Raven Road',route:'gauntlet'},
 {name:'The Split River',route:'gallery',secret:'A ferry ledger lists survivors bound for Franklin Fox’s eastern gate.'},
 {name:'Stonewater',route:'gap',secret:'A torn map marks a quiet way beneath the ridge.'},
 {name:'Pilgrim Steps',route:'stairs',story:'Fox lanterns. I am on the right road.'},
 {name:'Thorn Ridge',route:'gauntlet'},
 {name:'Ancient Roots',route:'gallery',secret:'The regent once protected this road. Something broke its oath.'},
 {name:'The Long Crossing',route:'gap'},
 {name:'Border Stones',route:'stairs',story:'Franklin’s towers. So close.'},
 {name:'The Antler Gate',route:'gauntlet',secret:'The guardian lowers its head before every charge. Wait. Then leap.'},
 {name:'A Quiet Approach',route:'gallery',story:'Something enormous is waiting between me and the border.'},
 {name:'The Broken Regent',route:'stairs'},
 {name:'Franklin’s Road',route:'gallery',story:'Fox lanterns beyond the gate. That is where I will find answers.'}
];

/** Two readable paths at most; every upper route returns to the continuous lower road. */
export function chapterPlatforms(kind:ChapterKind):Ledge[]{
 const sections=kind==='jail'?JAIL_SECTIONS:OUTSIDE_SECTIONS;
 const result:Ledge[]=[];
 for(let i=0;i<sections.length;i++){
   const x=i*SECTION_WIDTH;
   result.push({x:x+720,y:390,width:1440,height:60});
   // Keep final outdoor arena open, with modest perimeter refuges.
   if(kind==='outside'&&i>=22){
     result.push({x:x+320,y:270,width:180,height:32},{x:x+1100,y:270,width:180,height:32});continue;
   }
   const route=sections[i].route;
   const pattern:readonly [number,number,number][]=route==='gallery'
     ?[[220,280,180],[460,195,180],[760,195,300],[1080,280,180]]
     :route==='stairs'?[[210,280,150],[430,190,170],[680,100,180],[930,190,170],[1170,280,160]]
     :route==='gap'?[[220,280,180],[490,195,240],[990,195,240],[1220,280,160]]
     :[[240,275,160],[520,235,200],[850,275,180],[1140,235,200]];
   for(const [dx,y,width]of pattern)result.push({x:x+dx,y,width,height:32});
 }
 return result;
}

export const CHAPTER_ART=['jail-gallery','cistern','ruined-kingdom','deepwood','wildwood','thorn-boar','gloom-hare','antler-regent','road-platform','rest-lantern','sealed-dispatch'] as const;
