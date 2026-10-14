import type {FurnaceCircuit} from '../data/furnace';
export const FURNACE_SLOT_MS=2400,FURNACE_CYCLE_MS=7200,FURNACE_WARNING_MS=1000,FURNACE_BURN_END_MS=2200,FURNACE_FLAME_HEIGHT=24;
export type FurnaceHeat='safe'|'warning'|'burn'|'cool';
export function furnaceHeatHazardBounds(left:number,right:number,top:number):{left:number;right:number;top:number;bottom:number}{return {left,right,top:top-FURNACE_FLAME_HEIGHT,bottom:top+2};}
/** One room-local clock. Suspended frames never contribute a catch-up delta. */
export class FurnaceRhythm {
 room=-1;elapsedMs=0;started=false;private gap=false;
 reset(room:number):void {this.room=room;this.elapsedMs=0;this.started=false;this.gap=false;}
 suspend():void {this.gap=true;}
 update(room:number,localX:number,deltaMs:number,live:boolean):void {
  if(room!==this.room)this.reset(room);
  if(!live){this.suspend();return;}
  // Once triggered, the safe apron is an observation refuge. Only a room change/retry resets the pattern.
  if(!this.started){if(localX>=192)this.started=true;return;}
  if(this.gap){this.gap=false;return;}
  if(Number.isFinite(deltaMs)&&deltaMs>0)this.elapsedMs=(this.elapsedMs+Math.min(50,deltaMs))%FURNACE_CYCLE_MS;
 }
 heat(circuit:FurnaceCircuit):FurnaceHeat {return this.started?furnaceHeatAt(this.elapsedMs,circuit):'safe';}
}
export function furnaceHeatAt(elapsedMs:number,circuit:FurnaceCircuit):FurnaceHeat {
 const phase=((elapsedMs%FURNACE_CYCLE_MS)+FURNACE_CYCLE_MS)%FURNACE_CYCLE_MS;
 if(Math.floor(phase/FURNACE_SLOT_MS)+1!==circuit)return 'safe';
 const slot=phase%FURNACE_SLOT_MS;return slot<FURNACE_WARNING_MS?'warning':slot<FURNACE_BURN_END_MS?'burn':'cool';
}
