import type Phaser from 'phaser';
import { debugModeOn, load, onDebugChange, save, setDebugMode } from './debugSettings';
import { DEBUG_SECTIONS } from './sections';

const DEBUG_SEQUENCE = ['1', '2', '3'];
const DEBUG_SEQUENCE_GAP_MS = 600;

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
 * Debug panel, hidden until 1, 2, 3 is tapped quickly in order.
 * Each key must be released before the next is pressed, since holding 1+2+3 together is the god-mode chord.
 */
export function installDebugPanel(game: Phaser.Game): () => void {
  const panel = collapsible('Debug', 'panel');
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
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  document.body.append(panel);
  render();
  return () => {
    panel.remove();
    removeListener();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
