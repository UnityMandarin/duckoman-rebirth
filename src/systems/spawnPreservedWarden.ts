import {debugModeOn} from './debug/debugSettings';
import { HollowWarden } from '../entities/HollowWarden';
import type { Player } from '../entities/Player';
import type Phaser from 'phaser';

/** Warden is preserved for a later level; currently only the guarded debug encounter uses this entry point. */
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
