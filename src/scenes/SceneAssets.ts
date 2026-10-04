import type Phaser from 'phaser';
import { LETTER_TEXTURE } from '../entities/CreatorLetter';

export type SceneAssetProfile = 'menu' | 'gate-1' | 'jail' | 'outside' | 'crimson' | 'rescue' | 'castle-secret';
export interface SceneAssetEntry {
  readonly key: string;
  readonly path: string;
  readonly type?: 'image' | 'spritesheet';
  readonly frameWidth?: number;
  readonly frameHeight?: number;
}

const entry = (key: string, path: string): SceneAssetEntry => Object.freeze({ key, path, type: 'image' });
const spritesheet = (key: string, path: string, frameWidth: number, frameHeight: number): SceneAssetEntry =>
  Object.freeze({ key, path, type: 'spritesheet', frameWidth, frameHeight });
const menu: readonly SceneAssetEntry[] = [
  entry('menu-ruined-kingdom', 'assets/menu/cards/ruined-kingdom.webp'),
  entry('menu-jail-gallery', 'assets/menu/cards/jail-gallery.webp'),
  entry('menu-wildwood', 'assets/menu/cards/wildwood.webp'),
  entry('menu-crimson-crab', 'assets/menu/cards/crimson-crab.webp'),
  entry('menu-cistern', 'assets/menu/cards/cistern.webp'),
  entry('chained-lock', 'assets/menu/chained-lock.png'),
];
const gate1: readonly SceneAssetEntry[] = [
  entry('castle-background', 'assets/gate3/royal-hall.png'),
  entry('ironwing-button', 'assets/gate3/ironwing-button.png'),
  entry('ironwing-bomb', 'assets/gate3/ironwing-bomb.png'),
  entry('ironwing-eye', 'assets/gate3/ironwing-eye.png'),
  entry('duckoman', 'assets/gate3/duckoman.png'),
  entry('robot-health', 'assets/tutorial/robot-health.png'),
  entry('dash-arrows-wind', 'assets/tutorial/dash-arrows-wind.png'),
  entry('robot', 'assets/gate3/robot.png'),
  entry('cake', 'assets/gate3/cake.png'),
  entry('masonry', 'assets/gate3/masonry.png'),
  entry('spike-robot', 'assets/gate3/spike-robot.png'),
  entry('jumper-robot', 'assets/gate3/jumper-robot.png'),
  entry('spike-platform', 'assets/gate3/spike-platform.png'),
  entry('lock-kit', 'assets/gate3/lock-kit.png'),
  entry('rock-pillar-kit', 'assets/gate3/rock-pillar-kit.png'),
  entry('rest-lantern', 'assets/chapters/rest-lantern.png'),
  entry('prison-atlas', 'assets/depth/prison-atlas.png'),
  entry('royal-scroll', 'assets/depth/royal-scroll.png'),
  entry('royal-archive', 'assets/depth/royal-archive.png'),
  entry('ultimate-sword-frame', 'assets/hud/ultimate-sword-frame.png'),
  entry('ultimate-sword-fill', 'assets/hud/ultimate-sword-fill.png'),
  entry('cracked-stone-wall', 'assets/environment/cracked-stone-wall.png'),
  entry('quality-chapter-hud', 'assets/quality/chapter-hud.png'),
  entry('bronze-wing', 'assets/gate3/bronze-wing.png'),
];
const journeyCommon: readonly SceneAssetEntry[] = [
  entry('duckoman', 'assets/gate3/duckoman.png'),
  entry('cake', 'assets/gate3/cake.png'),
  entry('robot-health', 'assets/tutorial/robot-health.png'),
  entry('robot', 'assets/gate3/robot.png'),
  entry('spike-robot', 'assets/gate3/spike-robot.png'),
  entry('jumper-robot', 'assets/gate3/jumper-robot.png'),
  entry('ultimate-sword-frame', 'assets/hud/ultimate-sword-frame.png'),
  entry('ultimate-sword-fill', 'assets/hud/ultimate-sword-fill.png'),
  entry('cracked-stone-wall', 'assets/environment/cracked-stone-wall.png'),
  entry('sealed-dispatch', 'assets/chapters/sealed-dispatch.png'),
  entry('quality-concept-props', 'assets/quality/concept-props.png'),
  entry('quality-chapter-hud', 'assets/quality/chapter-hud.png'),
  entry('bronze-wing', 'assets/gate3/bronze-wing.png'),
];
const chapterCommon: readonly SceneAssetEntry[] = [
  entry('thorn-boar', 'assets/chapters/thorn-boar.png'),
  entry('gloom-hare', 'assets/chapters/gloom-hare.png'),
];
const withCommon = (...items: SceneAssetEntry[]): readonly SceneAssetEntry[] => [...journeyCommon, ...items];
const profiles: Readonly<Record<SceneAssetProfile, readonly SceneAssetEntry[]>> = Object.freeze({
  menu,
  'gate-1': gate1,
  jail: withCommon(
    entry('identity-jail', 'assets/identity/jail.png'),
    entry('quality-jail-deep-cells', 'assets/quality/jail-deep-cells.png'),
    entry('quality-jail-upper-gallery', 'assets/quality/jail-upper-gallery.png'),
    entry('quality-jail-sluice', 'assets/quality/jail-sluice.png'),
    entry('quality-jail-gallery', 'assets/chapters/jail-gallery.png'),
    entry('quality-cistern', 'assets/chapters/cistern.png'),
  ),
  outside: withCommon(
    entry('identity-outside', 'assets/identity/outside.png'), ...chapterCommon,
    entry('antler-regent', 'assets/chapters/antler-regent.png'),
    entry('quality-ruined-kingdom', 'assets/chapters/ruined-kingdom.png'),
    entry('quality-wildwood', 'assets/chapters/wildwood.png'),
    entry('quality-deepwood', 'assets/chapters/deepwood.png'),
    entry('quality-outside-wind-ruins', 'assets/quality/outside-wind-ruins.png'),
    entry('quality-outside-fox-river', 'assets/quality/outside-fox-river.png'),
  ),
  crimson: withCommon(
    entry('identity-crimson', 'assets/identity/crimson.png'), ...chapterCommon,
    entry('crimson-crab', 'assets/chapters/crimson-crab.png'),
    entry('quality-ruined-kingdom', 'assets/chapters/ruined-kingdom.png'),
    entry('quality-crimson-vault', 'assets/quality/crimson-vault.png'),
    entry('rock-pillar-kit', 'assets/gate3/rock-pillar-kit.png'),
  ),
  rescue: [
    ...journeyCommon.filter(({ key }) => key !== 'cracked-stone-wall' && key !== 'sealed-dispatch'),
    entry('identity-rescue', 'assets/identity/rescue.png'),
    entry('franklin-asleep', 'assets/chapter5/franklin-asleep.png'),
    entry('hollow-warden', 'assets/chapter5/hollow-warden.png'),
    entry('quality-rescue-prison', 'assets/quality/hollow-prison.png'),
    entry('quality-concept-props', 'assets/quality/concept-props.png'),
    entry('bronze-wing', 'assets/gate3/bronze-wing.png'),
  ],
  'castle-secret': [
    entry('duckoman', 'assets/gate3/duckoman.png'),
    entry('masonry', 'assets/gate3/masonry.png'),
    entry(LETTER_TEXTURE, `assets/chapters/${LETTER_TEXTURE}.png`),
    entry('ultimate-sword-frame', 'assets/hud/ultimate-sword-frame.png'),
    entry('ultimate-sword-fill', 'assets/hud/ultimate-sword-fill.png'),
    entry('quality-chapter-hud', 'assets/quality/chapter-hud.png'),
    entry('bronze-wing', 'assets/gate3/bronze-wing.png'),
    entry('rustwing-lair', 'assets/gate3/rustwing-lair.png'),
    entry('rustwing-fireball', 'assets/gate3/rustwing-fireball.png'),
    spritesheet('rustwing', 'assets/gate3/rustwing-walk.png', 768, 768),
  ],
});

interface Lease { keys: Set<string>; cleanup: () => void; released: boolean; }
interface TextureLease { refs: number; owned: boolean; }
const sceneLeases = new WeakMap<Phaser.Scene, Lease>();
const textureLeases = new WeakMap<Phaser.Textures.TextureManager, Map<string, TextureLease>>();

/** A copy of the explicit texture catalogue for inspection and profile tests. */
export function sceneAssetEntries(profile: SceneAssetProfile): readonly SceneAssetEntry[] {
  return profiles[profile].map(({ key, path, type, frameWidth, frameHeight }) => ({ key, path, type, frameWidth, frameHeight }));
}

/** Acquire one profile for this scene lifecycle and enqueue only absent textures. */
export function preloadSceneAssets(scene: Phaser.Scene, profile: SceneAssetProfile): void {
  if (sceneLeases.has(scene)) return;
  const keys = new Set<string>();
  const load = scene.load;
  const textures = scene.textures;
  let managedTextures = textureLeases.get(textures);
  if (!managedTextures) { managedTextures = new Map(); textureLeases.set(textures, managedTextures); }
  const requested = new Set<string>();

  for (const asset of profiles[profile]) {
    if (keys.has(asset.key)) continue;
    keys.add(asset.key);
    const lease = managedTextures.get(asset.key) ?? { refs: 0, owned: false };
    lease.refs++;
    managedTextures.set(asset.key, lease);
    if (textures.exists(asset.key)) continue;
    if (Array.from(load.list).some((file) => file.key === asset.key) || Array.from(load.queue).some((file) => file.key === asset.key)) continue;
    requested.add(asset.key);
    const url = `${import.meta.env.BASE_URL}${asset.path}`;
    if (asset.type === 'spritesheet') {
      load.spritesheet(asset.key, url, { frameWidth: asset.frameWidth!, frameHeight: asset.frameHeight! });
    } else load.image(asset.key, url);
  }

  const onFileComplete = (key: string): void => {
    if (!requested.has(key)) return;
    if (textures.exists(key)) {
      const lease = managedTextures.get(key);
      if (lease) lease.owned = true;
    }
    requested.delete(key);
  };
  const onLoadError = (file: { key?: string }): void => { if (file.key) requested.delete(file.key); };
  load.on('filecomplete', onFileComplete);
  load.on('loaderror', onLoadError);

  let leaseRecord: Lease;
  const release = (): void => {
    if (leaseRecord.released) return;
    leaseRecord.released = true;
    load.off('filecomplete', onFileComplete);
    load.off('loaderror', onLoadError);
    scene.events.off('shutdown', release);
    scene.events.off('destroy', release);
    for (const key of keys) {
      const current = managedTextures.get(key);
      if (!current) continue;
      current.refs = Math.max(0, current.refs - 1);
      if (current.refs !== 0) continue;
      if (current.owned && textures.exists(key)) textures.remove(key);
      managedTextures.delete(key);
    }
    sceneLeases.delete(scene);
  };
  leaseRecord = { keys, cleanup: release, released: false };
  sceneLeases.set(scene, leaseRecord);
  scene.events.once('shutdown', release);
  scene.events.once('destroy', release);
}

/** Register shared concept-prop crops only after their texture has loaded. */
export function registerSharedPropFrames(scene: Phaser.Scene): void {
  const key = 'quality-concept-props';
  if (!scene.textures.exists(key)) return;
  const texture = scene.textures.get(key);
  const frames: ReadonlyArray<readonly [string, number, number, number, number]> = [
    ['crown-ring', 18, 625, 290, 304],
    ['wind-streak', 320, 662, 300, 232],
    ['impact-dust', 22, 925, 288, 320],
    ['rescue-dust', 22, 925, 288, 320],
    ['sword-arc', 640, 925, 292, 329],
    ['rescue-sonic-slash', 640, 925, 292, 329],
    ['rescue-violet-portal', 318, 925, 304, 305],
  ];
  for (const [name, x, y, width, height] of frames) {
    if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
  }
}
