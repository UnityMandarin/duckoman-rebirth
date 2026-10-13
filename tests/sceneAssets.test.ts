import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
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
  it('loads only the selected chapter scenic zones and connectors in Journey/Castle profiles', () => {
    const counts = { 'gate-1': 3, jail: 3, outside: 7, crimson: 3 } as const;
    for (const [profile, count] of Object.entries(counts) as [keyof typeof counts, number][]) {
      const scenic = sceneAssetEntries(profile).filter(a=>a.key.startsWith('world-v3-'));
      expect(scenic.filter(a=>a.key.endsWith('-connectors'))).toHaveLength(1);
      expect(scenic).toHaveLength(count + 1);
      expect(scenic.every(a=>a.path.startsWith('assets/world-v3/'))).toBe(true);
      expect(sceneAssetEntries(profile).some(a=>a.key==='world-v2-structures')).toBe(true);
    }
    for (const profile of ['furnace','rescue','castle-secret'] as const) {
      expect(sceneAssetEntries(profile).some(a=>a.key.startsWith('world-v3-')||a.key==='world-v2-structures')).toBe(false);
    }
    expect(sceneAssetEntries('outside').some(a=>a.key==='regent-arena')).toBe(false);
  });

  it('keeps scenic atlases at native size and within the active chapter source budget', () => {
    for (const profile of ['gate-1','jail','outside','crimson'] as const) {
      const scenic=sceneAssetEntries(profile).filter(a=>a.key.startsWith('world-v3-'));
      const bytes=scenic.reduce((sum,a)=>sum+statSync(join(process.cwd(),'public',a.path)).size,0);
      const decodedRGBA=scenic.length*1536*1024*4;
      expect(bytes).toBeLessThanOrEqual(60*1024*1024);
      expect(decodedRGBA).toBeLessThanOrEqual(60*1024*1024);
      for(const asset of scenic){
        const png=readFileSync(join(process.cwd(),'public',asset.path));
        expect(png.toString('hex',0,8)).toBe('89504e470d0a1a0a');
        expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([1536,1024]);
      }
    }
  });

  it('keeps menu art separate from gameplay, with every catalogue path present', () => {
    const menu = sceneAssetEntries('menu'), gameplayProfiles: SceneAssetProfile[] = ['gate-1', 'jail', 'outside', 'crimson', 'furnace', 'rescue', 'castle-secret'];
    const gameplay = gameplayProfiles.flatMap(profile => sceneAssetEntries(profile));
    const menuKeys = new Set(menu.map(entry => entry.key));
    expect(menu.some(entry => entry.key === 'menu-ruined-kingdom')).toBe(true);
    expect(gameplay.some(entry => entry.key === 'menu-ruined-kingdom')).toBe(false);
    expect(sceneAssetEntries('crimson').some(entry=>entry.key.startsWith('furnace-'))).toBe(false);
    expect(sceneAssetEntries('furnace').filter(entry=>entry.key.startsWith('furnace-')).map(entry=>entry.key)).toEqual(['furnace-backdrop','furnace-lava-basin','furnace-lava-glow','furnace-lava-surface','furnace-lava-spit','furnace-lava-feed','furnace-utility','furnace-climax']);
    expect(sceneAssetEntries('rescue').some(entry=>entry.key==='furnace-lava-basin'||entry.key==='furnace-lava-glow')).toBe(false);
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
