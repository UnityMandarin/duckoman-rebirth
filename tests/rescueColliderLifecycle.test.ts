import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const enemyInstances: Array<{ defeated: boolean; sprite: object; defeat: () => void }> = [];
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown', POST_UPDATE: 'postupdate' } }, Core: { Events: { BLUR: 'blur' } }, Math: { Clamp: (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)) } } }));
vi.mock('../src/entities/BasicEnemy', () => ({ BasicEnemy: class {
  defeated = false; sprite = {}; private onDefeated?: () => void;
  constructor(...args: unknown[]) { this.onDefeated = args[7] as (() => void) | undefined; enemyInstances.push(this); }
  defeat(): void { if (this.defeated) return; this.defeated = true; this.onDefeated?.(); }
} }));
vi.mock('../src/systems/enemyPatrolBounds', () => ({ enemyPatrolBounds: () => undefined }));
import { RescueScene } from '../src/scenes/RescueScene';

const require = createRequire(import.meta.url);
const PhaserCollider = require(join(process.cwd(), 'node_modules/phaser/src/physics/arcade/Collider.js')) as new (...args: any[]) => { world: unknown; active: boolean; destroy: () => void };

describe('RescueScene collider lifecycle', () => {
  it('destroys each real Phaser collider once across defeat callback and pruning', () => {
    enemyInstances.length = 0;
    const removals: object[] = [];
    const world = { removeCollider(collider: object) { if ((collider as { world: unknown }).world !== world) throw new Error('collider already detached'); removals.push(collider); } };
    const target = Object.create(RescueScene.prototype) as any;
    Object.assign(target, {
      player: { sprite: {} }, cake: { sprite: {} }, terrain: {}, seal: {}, platforms: [], enemies: [],
      physics: { add: { collider: (a: unknown, b: unknown) => new PhaserCollider(world, false, a, b), overlap: (a: unknown, b: unknown) => new PhaserCollider(world, true, a, b) } }
    });
    const spawn = Reflect.get(RescueScene.prototype, 'spawnEnemy');
    spawn.call(target, { x: 100, feetY: 200, kind: 'guard', patrolHalfWidth: 60 });
    spawn.call(target, { x: 200, feetY: 200, kind: 'guard', patrolHalfWidth: 60 });
    const runtime = target.enemies[0]; const defeatedColliders = [...runtime.colliders];
    const liveRuntime = target.enemies[1]; const liveColliders = [...liveRuntime.colliders];
    enemyInstances[0].defeat();
    Reflect.get(RescueScene.prototype, 'pruneEnemies').call(target);
    expect(removals).toEqual(defeatedColliders);
    expect(target.enemies).toEqual([liveRuntime]);
    expect(liveRuntime.colliders).toEqual(liveColliders);
    expect(liveColliders.every(collider => collider.active && collider.world === world)).toBe(true);
    expect(() => Reflect.get(RescueScene.prototype, 'releaseEnemyColliders').call(target, runtime)).not.toThrow();
    expect(removals).toHaveLength(4);
  });

  it('clears live and already defeated sentries without destroying a collider twice', () => {
    enemyInstances.length = 0;
    const removals: object[] = [];
    const world = { removeCollider(collider: object) { if ((collider as { world: unknown }).world !== world) throw new Error('collider already detached'); removals.push(collider); } };
    const target = Object.create(RescueScene.prototype) as any;
    Object.assign(target, { player: { sprite: {} }, cake: { sprite: {} }, terrain: {}, seal: {}, platforms: [], enemies: [], pendingGraphics: [], pendingPortals: [], pendingGeometry: [], waves: {} });
    target.physics = { add: { collider: (a: unknown, b: unknown) => new PhaserCollider(world, false, a, b), overlap: (a: unknown, b: unknown) => new PhaserCollider(world, true, a, b) } };
    const spawn = Reflect.get(RescueScene.prototype, 'spawnEnemy');
    spawn.call(target, { x: 100, feetY: 200, kind: 'guard', patrolHalfWidth: 60 });
    spawn.call(target, { x: 200, feetY: 200, kind: 'guard', patrolHalfWidth: 60 });
    const colliders = target.enemies.flatMap((runtime: { colliders: object[] }) => runtime.colliders);
    enemyInstances[0].defeat();
    Reflect.get(RescueScene.prototype, 'clearSentries').call(target);
    expect(removals).toEqual(colliders);
    expect(target.enemies).toHaveLength(0);
    expect(removals).toHaveLength(8);
  });
});
