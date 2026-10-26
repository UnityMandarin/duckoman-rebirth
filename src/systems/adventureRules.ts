import {SECTION_WIDTH} from '../data/chapters';

export type WaterRouteMethod='valve'|'relay';
export function completeWaterRoute(flags:readonly string[],method:WaterRouteMethod):string[]{return [...new Set([...flags,'outside-water-restored',`outside-water-${method}`])];}
export function canOperatePump(playerX:number,playerY:number,done:boolean):boolean{return !done&&Math.abs(playerX-(4*SECTION_WIDTH+435))<64&&Math.abs(playerY-170)<85;}
export function relayCanActivate(isThrown:boolean,alreadyRestored:boolean):boolean{return isThrown&&!alreadyRestored;}
export interface ConversationEligibility {sceneActive:boolean;physicsPaused:boolean;playerActive:boolean;canAct:boolean;usingUltimate:boolean;dead:boolean;}
export function canOpenConversation(s:ConversationEligibility):boolean{return s.sceneActive&&!s.physicsPaused&&s.playerActive&&s.canAct&&!s.usingUltimate&&!s.dead;}
export function conversationEscapeConsumed(talking:boolean):boolean{return talking;}
/** Menu callbacks can fire before the Director advances its Escape key state. */
export function canOpenPauseMenu(talking:boolean):boolean{return !talking;}
/** Owns only the physics pause acquired by this conversation; never resumes someone else's pause. */
export class AdventurePauseLease {
 private owned=false;
 acquire(eligible:ConversationEligibility,pause:()=>void):boolean {if(this.owned||!canOpenConversation(eligible))return false;pause();this.owned=true;return true;}
 release(canResume:boolean,resume:()=>void):boolean {if(!this.owned)return false;this.owned=false;if(canResume)resume();return true;}
 get holdsPause():boolean{return this.owned;}
}
