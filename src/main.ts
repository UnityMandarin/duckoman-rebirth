import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';
import { installDebugPanel } from './systems/debug/DebugPanel';
import { installRenderScale } from './systems/renderScale';
import { installVisibilityLifecycle } from './systems/visibilityLifecycle';

const game = new Phaser.Game(gameConfig);
const removeDebugPanel = installDebugPanel(game);
const removeRenderScale = installRenderScale(game);
const removeVisibilityLifecycle = installVisibilityLifecycle(game);
if (import.meta.hot) import.meta.hot.dispose(() => { game.destroy(true); removeDebugPanel(); removeRenderScale(); removeVisibilityLifecycle(); });
// Opt-in local browser test bridge; never present in production builds.
if(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('qa'))Object.assign(window,{duckomanQA:game});
