import Phaser from 'phaser';
import type { Circle, Polygon, Rect } from './contactRules';
import { debugToggle } from './debug/debugSettings';
import { platformLabels } from './debug/platformLabels';

export type HitboxKind = 'hurtbox' | 'attack' | 'danger' | 'target' | 'interact' | 'solid';
type Shape = Rect | Circle | Polygon;
type Rect2D = { x: number; y: number; width: number; height: number };
type Tag = { kind: HitboxKind; shapes?: () => Shape[] };

const STYLE: Record<HitboxKind, { color: number; label: string }> = {
  hurtbox: { color: 0x3dff7a, label: 'Duckoman hurtbox' },
  attack: { color: 0xffd23d, label: 'Duckoman attack' },
  danger: { color: 0xff3b3b, label: 'Hurts Duckoman' },
  target: { color: 0x4aa8ff, label: 'Dash / hit target' },
  interact: { color: 0xd070ff, label: 'Pickup / trigger' },
  solid: { color: 0x9aa4b2, label: 'Solid terrain' }
};
export const HITBOX_LEGEND = Object.values(STYLE);

const tags = new WeakMap<Phaser.GameObjects.GameObject, Tag>();
const frameShapes = new WeakMap<Phaser.Scene, { kind: HitboxKind; shape: Shape }[]>();

export function hitboxDebugEnabled(): boolean { return debugToggle('hitboxes'); }

/** Colors a physics body by role. `shapes` replaces the body outline, e.g. for multi-part hurtboxes. */
export function tagBody(object: Phaser.GameObjects.GameObject, kind: HitboxKind, shapes?: () => Shape[]): void {
  tags.set(object, { kind, shapes });
}

/** Shows a hand-tested zone (not a physics body) for the current frame. */
export function showHitbox(scene: Phaser.Scene, kind: HitboxKind, shape: Shape): void {
  if (!hitboxDebugEnabled()) return;
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
    if (!hitboxDebugEnabled()) return;
    const view = scene.cameras.main.worldView;
    const visible = (r: Rect): boolean => r.right > view.x - 50 && r.left < view.right + 50 && r.bottom > view.y - 50 && r.top < view.bottom + 50;
    const paint = (kind: HitboxKind, shape: Shape): void => {
      const { color } = STYLE[kind];
      g.fillStyle(color, kind === 'solid' ? 0.08 : 0.2).lineStyle(1.5, color, 0.95);
      if ('radius' in shape) {
        g.fillCircle(shape.x, shape.y, shape.radius).strokeCircle(shape.x, shape.y, shape.radius);
        return;
      }
      if ('points' in shape) {
        const points = shape.points.map(p => new Phaser.Math.Vector2(p.x, p.y));
        g.fillPoints(points, true).strokePoints(points, true);
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

/** Tags each platform with its A1/B2-style label while hitboxes are shown. */
export function installPlatformLabels(scene: Phaser.Scene, platforms: readonly Rect2D[]): void {
  const style = { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '11px', color: '#ffffff', backgroundColor: '#0d1520cc', padding: { x: 3, y: 1 } };
  const texts = platformLabels(platforms).map((label, i) => {
    const p = platforms[i];
    return scene.add.text(p.x, p.y - p.height / 2 - 2, label, style).setOrigin(0.5, 1).setDepth(1001).setVisible(false);
  });
  const sync = (): void => { const on = hitboxDebugEnabled(); for (const text of texts) text.setVisible(on); };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.PRE_RENDER, sync));
}
