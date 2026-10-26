import Phaser from 'phaser';
import { Gate1Scene } from '../scenes/Gate1Scene';
import { CastleSecretScene } from '../scenes/CastleSecretScene';
import { JailScene, OutsideScene, CrimsonScene, RegentPracticeScene, CrabPracticeScene } from '../scenes/JailScene';
import { TUNING } from './tuning';
import { canvasSize } from '../systems/renderScale';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { JournalScene } from '../scenes/JournalScene';
import { BossTrialsScene } from '../scenes/BossTrialsScene';
import { FurnaceScene } from '../scenes/FurnaceScene';
import { RescueScene } from '../scenes/RescueScene';
import {LateChapterScene} from '../scenes/LateChapterScene';
const { width, height } = canvasSize();
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, parent: 'game', width, height, backgroundColor: '#20242b',
  fps: { target: 60 }, antialias: true, powerPreference: 'low-power',
  loader: { maxParallelDownloads: 2 },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fps: TUNING.simulation.physicsFps, fixedStep: true, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width, height }, scene: [BootScene,MenuScene,JournalScene,BossTrialsScene,Gate1Scene,CastleSecretScene,JailScene,OutsideScene,CrimsonScene,FurnaceScene,RescueScene,new LateChapterScene('stormworks'),new LateChapterScene('crown-edge'),RegentPracticeScene,CrabPracticeScene]
};
