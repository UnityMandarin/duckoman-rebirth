import Phaser from 'phaser';
import type { Circle, Rect } from './contactRules';

export type HitboxKind = 'hurtbox' | 'attack' | 'danger' | 'target' | 'interact' | 'solid';
type Shape = Rect | Circle;
type Tag = { kind: HitboxKind; shapes?: () => Shape[] };

const STYLE: Record<HitboxKind, { color: number; label: string }> = {
  hurtbox: { color: 0x3dff7a, label: 'Duckoman hurtbox' },
  attack: { color: 0xffd23d, label: 'Duckoman attack' },
  danger: { color: 0xff3b3b, label: 'Hurts Duckoman' },
  target: { color: 0x4aa8ff, label: 'Dash / hit target' },
  interact: { color: 0xd070ff, label: 'Pickup / trigger' },
  solid: { color: 0x9aa4b2, label: 'Solid terrain' }
};
const STORAGE_KEY = 'duckoman-debug-hitboxes';
const DEBUG_KEY = 'duckoman-debug';
const DEBUG_SEQUENCE = ['1', '2', '3'];
const DEBUG_SEQUENCE_GAP_MS = 600;

const load = (key: string): boolean => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const save = (key: string, on: boolean): void => { try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* storage blocked */ } };

let debugMode = load(DEBUG_KEY);
let hitboxesOn = load(STORAGE_KEY);
let enabled = debugMode && hitboxesOn;
const tags = new WeakMap<Phaser.GameObjects.GameObject, Tag>();
const frameShapes = new WeakMap<Phaser.Scene, { kind: HitboxKind; shape: Shape }[]>();

export function hitboxDebugEnabled(): boolean { return enabled; }

/** Colors a physics body by role. `shapes` replaces the body outline, e.g. for multi-part hurtboxes. */
export function tagBody(object: Phaser.GameObjects.GameObject, kind: HitboxKind, shapes?: () => Shape[]): void {
  tags.set(object, { kind, shapes });
}

/** Shows a hand-tested zone (not a physics body) for the current frame. */
export function showHitbox(scene: Phaser.Scene, kind: HitboxKind, shape: Shape): void {
  if (!enabled) return;
  let list = frameShapes.get(scene);
  if (!list) frameShapes.set(scene, list = []);
  list.push({ kind, shape });
}

export function installHitboxDebug(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(1000);
  const draw = (): void => {
    g.clear();
    const queued = frameShapes.get(scene) ?? [];
    frameShapes.delete(scene);
    if (!enabled) return;
    const view = scene.cameras.main.worldView;
    const visible = (r: Rect): boolean => r.right > view.x - 50 && r.left < view.right + 50 && r.bottom > view.y - 50 && r.top < view.bottom + 50;
    const paint = (kind: HitboxKind, shape: Shape): void => {
      const { color } = STYLE[kind];
      g.fillStyle(color, kind === 'solid' ? 0.08 : 0.2).lineStyle(1.5, color, 0.95);
      if ('radius' in shape) {
        g.fillCircle(shape.x, shape.y, shape.radius).strokeCircle(shape.x, shape.y, shape.radius);
        return;
      }
      const r = { left: shape.left, right: shape.right, top: Math.max(shape.top, view.y - 50), bottom: Math.min(shape.bottom, view.bottom + 50) };
      if (!visible(r)) return;
      g.fillRect(r.left, r.top, r.right - r.left, r.bottom - r.top).strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    };
    const world = scene.physics.world;
    for (const body of [...world.staticBodies, ...world.bodies] as (Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody)[]) {
      if (!body.enable) continue;
      const tag = tags.get(body.gameObject);
      const kind = tag?.kind ?? (body.physicsType === Phaser.Physics.Arcade.STATIC_BODY ? 'solid' : 'interact');
      if (tag?.shapes) { for (const shape of tag.shapes()) paint(kind, shape); continue; }
      paint(kind, body.isCircle
        ? { x: body.center.x, y: body.center.y, radius: body.halfWidth }
        : { left: body.left, right: body.right, top: body.top, bottom: body.bottom });
    }
    for (const { kind, shape } of queued) paint(kind, shape);
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, draw);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.PRE_RENDER, draw));
}

/**
 * Debug panel (hitbox toggle and color legend), hidden until 1, 2, 3 is tapped quickly in order.
 * Each key must be released before the next is pressed, since holding 1+2+3 together is the god-mode chord.
 */
export function installHitboxDebugToggle(): () => void {
  const panel = document.createElement('div');
  panel.className = 'hitbox-debug';
  const button = document.createElement('button');
  const legend = document.createElement('ul');
  for (const { color, label } of Object.values(STYLE)) {
    const item = document.createElement('li');
    item.style.setProperty('--swatch', `#${color.toString(16).padStart(6, '0')}`);
    item.textContent = label;
    legend.append(item);
  }
  const render = (): void => {
    enabled = debugMode && hitboxesOn;
    panel.hidden = !debugMode;
    button.textContent = hitboxesOn ? 'Hitboxes: on' : 'Hitboxes: off';
    button.setAttribute('aria-pressed', String(hitboxesOn));
    legend.hidden = !hitboxesOn;
  };
  button.onclick = () => {
    hitboxesOn = !hitboxesOn;
    save(STORAGE_KEY, hitboxesOn);
    render();
    document.querySelector<HTMLCanvasElement>('#game canvas')?.focus();
  };

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
    debugMode = !debugMode;
    save(DEBUG_KEY, debugMode);
    render();
  };
  const onKeyUp = (event: KeyboardEvent): void => { held.delete(event.key); };
  const onBlur = (): void => { held.clear(); progress = 0; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  panel.append(button, legend);
  document.body.append(panel);
  render();
  return () => {
    panel.remove();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
