import type Phaser from 'phaser';
import type {Player} from '../entities/Player';

interface Freeze {player:Player;}
const freezes=new WeakMap<Phaser.Scene,Freeze>();
export function hasUltimateFreeze(scene:Phaser.Scene,player:Player):boolean {return freezes.get(scene)?.player===player;}
/** Ownership belongs only to the physical pause created by this player's sword animation. */
export function ownsUltimateFreeze(scene:Phaser.Scene,player?:Player):boolean {
 const freeze=freezes.get(scene);
 return !!freeze&&(!player||freeze.player===player)&&freeze.player.active&&freeze.player.usingUltimate&&document.visibilityState==='visible'&&scene.sys.isActive();
}
export function canUltimateDamage(scene:Phaser.Scene,player:Player):boolean {
 return player.active&&player.usingUltimate&&document.visibilityState==='visible'&&scene.sys.isActive()&&(!scene.physics.world.isPaused||ownsUltimateFreeze(scene,player));
}
/** Scene overlays suspend eligibility, retaining our world pause until expiry; external world pauses revoke it. */
export function beginUltimateFreeze(scene:Phaser.Scene,player:Player):()=>void {
 const world=scene.physics.world;
 if(world.isPaused)return ()=>{};
 const freeze:Freeze={player};let ended=false;
 const detach=()=>{world.off?.('pause',revoke);world.off?.('resume',revoke);scene.events.off('shutdown',revoke);};
 const revoke=()=>{if(ended)return;ended=true;if(freezes.get(scene)===freeze)freezes.delete(scene);detach();};
 world.pause();freezes.set(scene,freeze);
 world.on?.('pause',revoke);world.on?.('resume',revoke);scene.events.on('shutdown',revoke);
 return ()=>{if(ended)return;const owned=freezes.get(scene)===freeze;revoke();if(owned&&player.active)world.resume();};
}
