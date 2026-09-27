import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';
import { installHitboxDebugToggle } from './systems/DebugHitboxes';

const game = new Phaser.Game(gameConfig);
const removeHitboxToggle = installHitboxDebugToggle();
if (import.meta.hot) import.meta.hot.dispose(() => { game.destroy(true); removeHitboxToggle(); });
// Opt-in local browser test bridge; never present in production builds.
if(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa'))Object.assign(window,{duckomanQA:game});
