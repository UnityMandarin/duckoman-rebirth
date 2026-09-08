import type Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { InputSnapshot } from './InputController';
let replayAt:number|undefined;
let previousReplay=-1;
export function replayInput(now:number):InputSnapshot|undefined {
  if(replayAt===undefined)return;
  const elapsed=now-replayAt,t=elapsed%1400;
  const crossed=(mark:number)=>Math.floor((elapsed-mark)/1400)>Math.floor((previousReplay-mark)/1400);
  const input:InputSnapshot={horizontal:1,down:(t>=180&&t<230)||(t>=300&&t<350),downPressed:crossed(180)||crossed(300),jumpPressed:crossed(0)||crossed(600),jumpReleased:false,dashPressed:crossed(650),sprintPressed:false,anyResetInput:false};
  previousReplay=elapsed;return input;
}
// Local inspection only. Never exposed on the deployed site.
export function installLocalQA(scene:Phaser.Scene,player:Player,probeVictory:()=>void):void {
  if(location.hostname!=='127.0.0.1'||!new URLSearchParams(location.search).has('qa'))return;
  const panel=document.createElement('div');panel.style.cssText='position:fixed;bottom:0;left:0;z-index:100;color:white;background:#111b;padding:4px;font:12px monospace';
  replayAt=undefined;
  const replay=document.createElement('button');replay.textContent='Traversal replay';replay.onclick=()=>{previousReplay=-1;replayAt=replayAt===undefined?scene.time.now:undefined;};panel.append(replay);
  let soak=false;const soakButton=document.createElement('button');soakButton.textContent='Damage-free soak';soakButton.onclick=()=>{soak=!soak;};panel.append(soakButton);
  let anchored=false;const probe=document.createElement('button');probe.textContent='High ledge probe';probe.onclick=()=>{anchored=!anchored;soak=anchored;replayAt=undefined;};panel.append(probe);
  const victory=document.createElement('button');victory.textContent='Final-hit probe';victory.onclick=()=>{anchored=false;replayAt=undefined;probeVictory();};panel.append(victory);
  const death=document.createElement('button');death.textContent='Death/reset probe';death.onclick=()=>{anchored=false;replayAt=undefined;soak=false;player.takeDamage(player.sprite.x+1,3);};panel.append(death);
  for(const [name,x,y] of [['Start',80,332.5],['Gallery',2800,230],['Tower',4200,-220],['Foundry',5600,40],['Approach',8550,110],['Boss',9200,210]] as const) {
    const button=document.createElement('button');button.textContent=name;
    button.onclick=()=>{anchored=false;replayAt=undefined;player.body.reset(x,y);player.body.setVelocity(0,0);};panel.append(button);
  }
  const status=document.createElement('span');panel.append(status);document.body.append(panel);
  const update=()=>{if(soak&&player.active)player.health=3;if(anchored&&player.active)player.body.reset(9690,80.5);status.textContent=` x=${player.sprite.x.toFixed(0)} y=${player.sprite.y.toFixed(0)} hp=${player.health} bodies=${scene.physics.world.bodies.size} fps=${scene.game.loop.actualFps.toFixed(0)}`;};
  scene.events.on('postupdate',update);scene.events.once('shutdown',()=>{panel.remove();scene.events.off('postupdate',update);});
}
