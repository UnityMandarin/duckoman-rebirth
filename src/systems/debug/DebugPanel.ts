import type Phaser from 'phaser';
import { debugModeOn, load, onDebugChange, save, setDebugMode } from './debugSettings';
import { DEBUG_SECTIONS } from './sections';

const DEBUG_SEQUENCE = ['1', '2', '3'];
const DEBUG_SEQUENCE_GAP_MS = 600;
/** The panel opens while the pointer is within this many pixels of it, and closes once it moves further away. */
const HOVER_REACH_PX = 40;

/** A dropdown that starts closed and remembers whether it was left open. */
function collapsible(title: string, id: string): HTMLDetailsElement {
  const key = `duckoman-debug-open-${id}`;
  const details = document.createElement('details');
  details.open = load(key);
  details.ontoggle = () => save(key, details.open);
  const summary = document.createElement('summary');
  summary.textContent = title;
  details.append(summary);
  return details;
}

/**
 * Debug panel, hidden until 1, 2, 3 is tapped quickly in order. Once shown, it expands while the pointer is near it.
 * Each key must be released before the next is pressed, since holding 1+2+3 together is the god-mode chord.
 */
export function installDebugPanel(game: Phaser.Game): () => void {
  const panel = document.createElement('details');
  const heading = document.createElement('summary');
  heading.textContent = 'Debug';
  const off = document.createElement('button');
  off.className = 'debug-off';
  off.title = 'Turn off debug mode (tap 1 2 3 to bring it back)';
  off.setAttribute('aria-label', 'Turn off debug mode');
  off.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  off.onclick = event => {
    // Inside <summary>, so keep the click from also toggling the panel.
    event.preventDefault();
    event.stopPropagation();
    setDebugMode(false);
    game.canvas.focus();
  };
  heading.append(off);
  panel.append(heading);
  panel.classList.add('debug-panel');
  panel.querySelector('summary')!.title = 'Tap 1 2 3 to hide';
  const content = document.createElement('div');
  content.className = 'debug-content';
  panel.append(content);

  const sections = DEBUG_SECTIONS.map(create => create(game));
  for (const { title, body } of sections) {
    const details = collapsible(title, title);
    details.append(body);
    content.append(details);
  }
  // Keep keyboard input going to the game after using a panel control.
  panel.addEventListener('change', () => game.canvas.focus());
  panel.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('summary, button')) game.canvas.focus();
  });

  const render = (): void => {
    panel.hidden = !debugModeOn();
    for (const section of sections) section.refresh?.();
  };
  const removeListener = onDebugChange(render);

  const held = new Set<string>();
  let progress = 0;
  let lastPress = 0;
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    const digit = DEBUG_SEQUENCE.includes(event.key);
    const chorded = digit && DEBUG_SEQUENCE.some(key => key !== event.key && held.has(key));
    if (digit) held.add(event.key);
    if (event.timeStamp - lastPress > DEBUG_SEQUENCE_GAP_MS) progress = 0;
    lastPress = event.timeStamp;
    if (chorded || event.key !== DEBUG_SEQUENCE[progress]) {
      progress = event.key === DEBUG_SEQUENCE[0] && !chorded ? 1 : 0;
      return;
    }
    if (++progress < DEBUG_SEQUENCE.length) return;
    progress = 0;
    setDebugMode(!debugModeOn());
  };
  const onKeyUp = (event: KeyboardEvent): void => { held.delete(event.key); };
  const onBlur = (): void => { held.clear(); progress = 0; };
  const onPointerMove = (event: PointerEvent): void => {
    if (panel.hidden) return;
    const r = panel.getBoundingClientRect();
    const dx = Math.max(r.left - event.clientX, 0, event.clientX - r.right);
    const dy = Math.max(r.top - event.clientY, 0, event.clientY - r.bottom);
    const near = Math.hypot(dx, dy) <= HOVER_REACH_PX;
    if (panel.open !== near) panel.open = near;
  };
  const onPointerLeavePage = (event: PointerEvent): void => { if (!event.relatedTarget) panel.open = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerout', onPointerLeavePage);

  document.body.append(panel);
  render();
  return () => {
    panel.remove();
    removeListener();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerout', onPointerLeavePage);
  };
}
