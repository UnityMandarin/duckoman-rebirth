import {debugModeOn} from './debug/debugSettings';
import { HollowWarden } from '../entities/HollowWarden';
import type { Player } from '../entities/Player';
import type Phaser from 'phaser';

/** Warden is preserved for a later level. No current campaign, practice or debug route calls this entry point; Chapter 5 uses Franklin. */
export function spawnPreservedWarden(
  scene: Phaser.Scene,
  player: Player,
  onDefeated: () => void,
  x = 790,
  revealMs = 2000,
): HollowWarden {
  if(!debugModeOn())throw new Error('Hollow Warden preview requires debug mode');
  const warden = new HollowWarden(scene, player, onDefeated, x, revealMs);
  warden.hear(player.body.center.x);
  return warden;
}
