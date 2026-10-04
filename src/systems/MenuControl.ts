import type Phaser from 'phaser';

type Listener = (...args: unknown[]) => void;
type Control = { button: HTMLButtonElement; cleanup: () => void };
const controls = new WeakMap<Phaser.Scene, Control>();
const SCENE_EVENTS = { PAUSE: 'pause', SLEEP: 'sleep', RESUME: 'resume', WAKE: 'wake', SHUTDOWN: 'shutdown', DESTROY: 'destroy' } as const;

/** Clear stale held keys after the scene resumes from an overlay or hidden tab. */
export function resetKeys(scene: Phaser.Scene): void { scene.input?.keyboard?.resetKeys(); }

/** Adds an accessible native menu button that stays independent of the scaled game camera. */
export function addMenuControl(scene: Phaser.Scene, onOpen: () => void): void {
  if (controls.has(scene) || typeof document === 'undefined') return;
  const parent = document.getElementById('game');
  if (!parent) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Open game menu');
  button.className = 'game-menu-control';
  button.textContent = 'MENU';

  const stopPropagation = (event: Event): void => event.stopPropagation();
  button.addEventListener('pointerdown', stopPropagation);
  button.addEventListener('pointerup', stopPropagation);
  button.addEventListener('click', stopPropagation);
  button.addEventListener('click', onOpen);

  const hide = (): void => { button.hidden = true; };
  const reveal = (): void => {
    button.hidden = false;
    resetKeys(scene);
    const canvas = scene.sys.game.canvas;
    canvas?.focus({ preventScroll: true });
  };
  const events = scene.events;
  const bindings: Array<[string, Listener]> = [
    [SCENE_EVENTS.PAUSE, hide],
    [SCENE_EVENTS.SLEEP, hide],
    [SCENE_EVENTS.RESUME, reveal],
    [SCENE_EVENTS.WAKE, reveal],
  ];
  bindings.forEach(([event, listener]) => events.on(event, listener));

  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    bindings.forEach(([event, listener]) => events.off(event, listener));
    events.off(SCENE_EVENTS.SHUTDOWN, cleanup);
    events.off(SCENE_EVENTS.DESTROY, cleanup);
    button.removeEventListener('pointerdown', stopPropagation);
    button.removeEventListener('pointerup', stopPropagation);
    button.removeEventListener('click', stopPropagation);
    button.removeEventListener('click', onOpen);
    button.remove();
    controls.delete(scene);
  };
  events.once(SCENE_EVENTS.SHUTDOWN, cleanup);
  events.once(SCENE_EVENTS.DESTROY, cleanup);
  parent.appendChild(button);
  controls.set(scene, { button, cleanup });
}
