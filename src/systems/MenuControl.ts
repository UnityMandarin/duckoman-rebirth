import type Phaser from 'phaser';

type Listener = (...args: unknown[]) => void;
type Control = { button: HTMLButtonElement; cleanup: () => void };
type PauseMenuHandler = () => boolean | void;
const controls = new WeakMap<Phaser.Scene, Control>();
const pendingMenuRequests = new WeakSet<Phaser.Scene>();
const SCENE_EVENTS = { PAUSE: 'pause', SLEEP: 'sleep', RESUME: 'resume', WAKE: 'wake', SHUTDOWN: 'shutdown', DESTROY: 'destroy' } as const;

/** Clear stale held keys after the scene resumes from an overlay or hidden tab. */
export function resetKeys(scene: Phaser.Scene): void { scene.input?.keyboard?.resetKeys(); }

/** Save once, then queue one pause/menu launch for the active parent scene's next post-update. */
export function requestPauseMenu(scene: Phaser.Scene, onSave: () => void, parentKey = scene.sys.settings.key): boolean {
  const manager = scene.scene;
  if (pendingMenuRequests.has(scene) || !manager.isActive(parentKey) || manager.isActive('menu') || manager.isPaused('menu')) return false;

  const events = scene.events;
  pendingMenuRequests.add(scene);
  let released = false;
  let release = (): void => {};
  const launch = (): void => {
    events.off('postupdate', launch);
    if (released) return;
    if (!manager.isActive(parentKey) || manager.isActive('menu') || manager.isPaused('menu')) {
      release();
      events.emit('pause-menu-rejected');
      return;
    }
    try {
      manager.pause(parentKey);
      manager.launch('menu', { pausedScene: parentKey });
    } catch (error) {
      release();
      throw error;
    }
  };
  release = (): void => {
    if (released) return;
    released = true;
    pendingMenuRequests.delete(scene);
    events.off('postupdate', launch);
    events.off(SCENE_EVENTS.RESUME, release);
    events.off(SCENE_EVENTS.WAKE, release);
    events.off(SCENE_EVENTS.SHUTDOWN, release);
    events.off(SCENE_EVENTS.DESTROY, release);
  };
  events.on(SCENE_EVENTS.RESUME, release);
  events.on(SCENE_EVENTS.WAKE, release);
  events.on(SCENE_EVENTS.SHUTDOWN, release);
  events.on(SCENE_EVENTS.DESTROY, release);
  try {
    onSave();
    resetKeys(scene);
  } catch (error) {
    release();
    throw error;
  }
  events.on('postupdate', launch);
  return true;
}

/** Adds an accessible native menu button that stays independent of the scaled game camera. */
export function addMenuControl(scene: Phaser.Scene, onOpen: PauseMenuHandler): void {
  if (controls.has(scene) || typeof document === 'undefined') return;
  const game = document.getElementById('game');
  const parent = game?.querySelector?.('.game-controls') ?? game;
  if (!parent) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Open game menu');
  button.className = 'game-menu-control';
  button.textContent = 'Esc · Menu';
  let openPending = false;

  const stopPropagation = (event: Event): void => event.stopPropagation();
  button.addEventListener('pointerdown', stopPropagation);
  button.addEventListener('pointerup', stopPropagation);
  button.addEventListener('click', stopPropagation);

  const hide = (): void => { button.hidden = true; button.disabled = true; };
  const parentActive = (): boolean => scene.scene?.isActive?.(scene.sys.settings.key) ?? scene.sys.isActive();
  const restore = (): void => { openPending = false; button.hidden = false; button.disabled = false; };
  const open = (): void => {
    if (openPending || button.hidden || button.disabled) return;
    openPending = true;
    hide();
    try {
      if (onOpen() === false) {
        if (parentActive()) restore();
        else openPending = false;
      }
    } catch (error) {
      if (parentActive()) restore();
      else openPending = false;
      throw error;
    }
  };
  const reveal = (): void => {
    restore();
    resetKeys(scene);
    const canvas = scene.sys.game.canvas;
    canvas?.focus({ preventScroll: true });
  };
  const rejected = (): void => { if (parentActive()) restore(); };
  const events = scene.events;
  const bindings: Array<[string, Listener]> = [
    [SCENE_EVENTS.PAUSE, hide],
    [SCENE_EVENTS.SLEEP, hide],
    [SCENE_EVENTS.RESUME, reveal],
    [SCENE_EVENTS.WAKE, reveal],
  ];
  bindings.forEach(([event, listener]) => events.on(event, listener));
  events.on('pause-menu-rejected', rejected);

  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    bindings.forEach(([event, listener]) => events.off(event, listener));
    events.off('pause-menu-rejected', rejected);
    events.off(SCENE_EVENTS.SHUTDOWN, cleanup);
    events.off(SCENE_EVENTS.DESTROY, cleanup);
    button.removeEventListener('pointerdown', stopPropagation);
    button.removeEventListener('pointerup', stopPropagation);
    button.removeEventListener('click', stopPropagation);
    button.removeEventListener('click', open);
    button.remove();
    controls.delete(scene);
  };
  events.on(SCENE_EVENTS.SHUTDOWN, cleanup);
  events.on(SCENE_EVENTS.DESTROY, cleanup);
  button.addEventListener('click', open);
  parent.appendChild(button);
  controls.set(scene, { button, cleanup });
}
