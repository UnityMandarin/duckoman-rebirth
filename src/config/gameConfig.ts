import Phaser from 'phaser';
import { Gate1Scene } from '../scenes/Gate1Scene';
import { JailScene, OutsideScene, CrimsonScene, RegentPracticeScene, CrabPracticeScene, JailRoutePracticeScene, OutsideRoutePracticeScene, CrimsonRoutePracticeScene } from '../scenes/JailScene';
import { TUNING } from './tuning';
import { canvasSize } from '../systems/renderScale';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { JournalScene } from '../scenes/JournalScene';
import { RouteSelectScene } from '../scenes/RouteSelectScene';
import { RescueScene } from '../scenes/RescueScene';
const { width, height } = canvasSize();
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, parent: 'game', width, height, backgroundColor: '#20242b',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: TUNING.simulation.physicsFps, fixedStep: true, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width, height }, scene: [BootScene,MenuScene,JournalScene,RouteSelectScene,Gate1Scene,JailScene,OutsideScene,CrimsonScene,RescueScene,RegentPracticeScene,CrabPracticeScene,JailRoutePracticeScene,OutsideRoutePracticeScene,CrimsonRoutePracticeScene]
};
