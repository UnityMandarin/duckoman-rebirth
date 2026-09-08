import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './config/gameConfig';
let game = new Phaser.Game(gameConfig);
const entry=document.createElement('section');
entry.className='entry';
entry.innerHTML=`<video playsinline preload="auto" aria-label="Duckoman introduction"></video><div class="entry-actions"><h1>Duckoman Rebirth</h1><button type="button">Start game</button></div><button class="skip" type="button" hidden>Skip intro</button>`;
document.body.append(entry);
const video=entry.querySelector('video')!;
video.src=`${import.meta.env.BASE_URL}media/intro.mp4`;
const start=entry.querySelector('button')!;
const skip=entry.querySelector<HTMLButtonElement>('.skip')!;
let ended=false;
const reveal=()=>{
  ended=true;
  const scene=game.scene.getScene('gate-1');
  if(!scene || !scene.sys.isPaused()) return;
  document.documentElement.dataset.entered='true';
  game.scene.resume('gate-1');
  entry.classList.add('finished');
  video.pause();
  game.canvas.tabIndex=0; game.canvas.focus();
  window.setTimeout(()=>entry.remove(),600);
};
window.addEventListener('duckoman-ready',()=>{ if(ended) window.setTimeout(reveal,0); });
start.addEventListener('click',async()=>{
  start.disabled=true;
  try {
    await video.play();
    entry.classList.add('playing'); skip.hidden=false;
    document.documentElement.requestFullscreen?.().catch(()=>{});
  } catch {
    start.disabled=false; start.textContent='Play intro'; skip.hidden=false;
  }
});
skip.addEventListener('click',reveal);
video.addEventListener('ended',reveal);
video.addEventListener('error',()=>{skip.hidden=false;skip.textContent='Enter game';});
if (import.meta.hot) { import.meta.hot.dispose(() => game.destroy(true)); import.meta.hot.accept(() => { game = new Phaser.Game(gameConfig); }); }
