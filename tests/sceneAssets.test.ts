import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
vi.mock('phaser', () => ({ default: { Scenes: { Events: {} }, Math: {} } }));
vi.mock('../src/systems/DebugHitboxes', () => ({ showHitbox: vi.fn() }));
import { registerCommonFrames } from '../src/scenes/CommonAssets';
import { preloadSceneAssets, registerSharedPropFrames, sceneAssetEntries, type SceneAssetProfile } from '../src/scenes/SceneAssets';

type Listener = (...args: any[]) => void;
class Events {
  listeners = new Map<string, Set<Listener>>();
  on(name: string, fn: Listener): this { const set = this.listeners.get(name) ?? new Set(); set.add(fn); this.listeners.set(name, set); return this; }
  once(name: string, fn: Listener): this { return this.on(name, fn); }
  off(name: string, fn: Listener): this { this.listeners.get(name)?.delete(fn); return this; }
  emit(name: string, ...args: any[]): void { const set = this.listeners.get(name); for (const fn of [...(set ?? [])]) fn(...args); if (name === 'shutdown' || name === 'destroy') set?.clear(); }
}
class Texture {
  frames = new Set<string>();
  has(name: string): boolean { return this.frames.has(name); }
  add(name: string): void { this.frames.add(name); }
}
class TextureManager {
  values = new Map<string, Texture>();
  exists(key: string): boolean { return this.values.has(key); }
  get(key: string): Texture { const value = this.values.get(key); if (!value) throw new Error(`missing texture ${key}`); return value; }
  add(key: string): void { this.values.set(key, new Texture()); }
  remove(key: string): void { this.values.delete(key); }
}
class Loader extends Events {
  list: { key: string }[] = [];
  queue: { key: string }[] = [];
  requested: { key: string; url: string; type: string; config?: unknown }[] = [];
  image(key: string, url: string): void { this.enqueue(key, url, 'image'); }
  spritesheet(key: string, url: string, config: unknown): void { this.enqueue(key, url, 'spritesheet', config); }
  fail(key: string): void { this.emit('loaderror', { key }); this.list = this.list.filter(file => file.key !== key); }
  complete(key: string, textures: TextureManager): void { textures.add(key); this.emit('filecomplete', key); this.list = this.list.filter(file => file.key !== key); }
  private enqueue(key: string, url: string, type: string, config?: unknown): void { this.requested.push({ key, url, type, config }); this.list.push({ key }); }
}
function scene(textures = new TextureManager()) {
  const events = new Events(), load = new Loader();
  return { events, load, textures, game: { loop: {} } } as any;
}
function shutdown(s: any): void { s.events.emit('shutdown'); }

describe('scene asset profiles and leases', () => {
  it('keeps menu art separate from gameplay, with every catalogue path present', () => {
    const menu = sceneAssetEntries('menu'), gameplayProfiles: SceneAssetProfile[] = ['gate-1', 'jail', 'outside', 'crimson', 'rescue', 'castle-secret'];
    const gameplay = gameplayProfiles.flatMap(profile => sceneAssetEntries(profile));
    const menuKeys = new Set(menu.map(entry => entry.key));
    expect(menu.some(entry => entry.key === 'menu-ruined-kingdom')).toBe(true);
    expect(gameplay.some(entry => entry.key === 'menu-ruined-kingdom')).toBe(false);
    expect(menu.filter(entry => entry.key.startsWith('menu-')).length).toBe(5);
    for (const item of [...menu, ...gameplay]) expect(existsSync(join(process.cwd(), 'public', item.path))).toBe(true);
  });

  it('does not enqueue duplicates when one scene reuses its profile', () => {
    const s = scene(); preloadSceneAssets(s, 'menu'); const first = s.load.requested.length;
    preloadSceneAssets(s, 'menu');
    expect(first).toBeGreaterThan(0); expect(s.load.requested).toHaveLength(first);
  });

  it('retains shared jail/rescue textures through the first shutdown and removes them at the final release', () => {
    const textures = new TextureManager(), jail = scene(textures), rescue = scene(textures);
    preloadSceneAssets(jail, 'jail'); jail.load.complete('quality-concept-props', textures); jail.load.complete('quality-chapter-hud', textures);
    preloadSceneAssets(rescue, 'rescue');
    expect(rescue.load.requested.some((file: { key: string }) => file.key === 'quality-concept-props')).toBe(false);
    shutdown(jail); expect(textures.exists('quality-concept-props')).toBe(true); expect(textures.exists('quality-chapter-hud')).toBe(true);
    shutdown(rescue); expect(textures.exists('quality-concept-props')).toBe(false); expect(textures.exists('quality-chapter-hud')).toBe(false);
  });

  it('keeps leases through pause/sleep and makes shutdown plus destroy idempotent', () => {
    const textures = new TextureManager(), a = scene(textures), b = scene(textures);
    preloadSceneAssets(a, 'menu');
    for (const f of [...a.load.requested]) a.load.complete(f.key, textures);
    preloadSceneAssets(b, 'menu');
    a.events.emit('pause'); a.events.emit('sleep');
    shutdown(a); expect(textures.exists('menu-cistern')).toBe(true);
    a.events.emit('destroy'); expect(textures.exists('menu-cistern')).toBe(true);
    shutdown(b); expect(textures.exists('menu-cistern')).toBe(false);
  });

  it('queues textures again after final release and keeps pre-existing unmanaged textures', () => {
    const textures = new TextureManager(); textures.add('menu-cistern');
    const a = scene(textures); preloadSceneAssets(a, 'menu'); shutdown(a);
    expect(textures.exists('menu-cistern')).toBe(true);
    const b = scene(textures); preloadSceneAssets(b, 'menu');
    expect(b.load.requested.some((file: { key: string }) => file.key === 'menu-cistern')).toBe(false);
    expect(b.load.requested.some((file: { key: string }) => file.key === 'menu-ruined-kingdom')).toBe(true);
    shutdown(b);
    const c = scene(textures); preloadSceneAssets(c, 'menu');
    expect(c.load.requested.some((file: { key: string }) => file.key === 'menu-ruined-kingdom')).toBe(true);
  });

  it('isolates leases by TextureManager and allows a retry after loader failure', () => {
    const a = scene(), b = scene(); preloadSceneAssets(a, 'rescue'); preloadSceneAssets(b, 'rescue');
    a.load.complete('quality-concept-props', a.textures); b.load.complete('quality-concept-props', b.textures);
    shutdown(a); expect(a.textures.exists('quality-concept-props')).toBe(false); expect(b.textures.exists('quality-concept-props')).toBe(true);
    shutdown(b); expect(b.textures.exists('quality-concept-props')).toBe(false);
    const failed = scene(); preloadSceneAssets(failed, 'rescue');
    failed.load.fail('quality-concept-props'); shutdown(failed);
    const retry = scene(failed.textures); preloadSceneAssets(retry, 'rescue');
    expect(retry.load.requested.some((file: { key: string }) => file.key === 'quality-concept-props')).toBe(true);
  });

  it('keeps 768x768 secret spritesheet metadata and safely skips missing frame textures', () => {
    const rustwing = sceneAssetEntries('castle-secret').find(entry => entry.key === 'rustwing');
    expect(rustwing).toMatchObject({ type: 'spritesheet', frameWidth: 768, frameHeight: 768 });
    const s = scene(), get = vi.spyOn(s.textures, 'get');
    registerCommonFrames(s); registerSharedPropFrames(s);
    expect(get).not.toHaveBeenCalled();
  });

  it('registers common and shared prop frames on present textures only', () => {
    const s = scene(); s.textures.add('quality-concept-props'); s.textures.add('masonry');
    registerCommonFrames(s); registerSharedPropFrames(s);
    expect(s.textures.get('quality-concept-props').has('rescue-violet-portal')).toBe(true);
    expect(s.textures.get('masonry').has('trimmed')).toBe(true);
  });
});
