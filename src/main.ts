import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';

const game = new Phaser.Game(gameConfig);
if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
// Opt-in local browser test bridge; never present in production builds.
if(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa'))Object.assign(window,{duckomanQA:game});
