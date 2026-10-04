import type Phaser from 'phaser';

/** Sleeps rendering while the tab is hidden and resumes Phaser's loop when it returns. */
export function installVisibilityLifecycle(game: Phaser.Game): () => void {
  let disposed = false;
  const sync = (): void => {
    if (disposed || !game.loop.started) return;
    if (document.hidden) game.loop.sleep();
    else {
      game.loop.resetDelta();
      game.loop.wake();
    }
  };
  const onVisibilityChange = (): void => sync();
  const onReady = (): void => { queueMicrotask(sync); };
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (game.loop.started) sync();
  else game.events.once('ready', onReady);
  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    game.events.off('ready', onReady);
  };
}
