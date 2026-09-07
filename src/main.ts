import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';
let game = new Phaser.Game(gameConfig);
if (import.meta.hot) { import.meta.hot.dispose(() => game.destroy(true)); import.meta.hot.accept(() => { game = new Phaser.Game(gameConfig); }); }
