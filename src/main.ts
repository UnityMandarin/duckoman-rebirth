import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';

const game = new Phaser.Game(gameConfig);
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
