import Phaser from 'phaser';
import { Gate1Scene } from '../scenes/Gate1Scene';
import { JailScene, OutsideScene } from '../scenes/JailScene';
import { TUNING } from './tuning';
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, parent: 'game', width: TUNING.simulation.width, height: TUNING.simulation.height, backgroundColor: '#20242b',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: TUNING.simulation.physicsFps, fixedStep: true, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: TUNING.simulation.width, height: TUNING.simulation.height }, scene: [Gate1Scene,JailScene,OutsideScene]
};
