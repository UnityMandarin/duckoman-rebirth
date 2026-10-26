import Phaser from 'phaser';

export const ADVENTURE_NPC_ATLAS = 'adventure-npcs';
export const ADVENTURE_NPC_KEYS = ['nella', 'pippit', 'tamsin', 'bramble', 'orrin', 'rune'] as const;
// Tight alpha bounds measured from the generated atlas (alpha > 8), relative to each 512 px cell.
const NPC_ALPHA_BOUNDS: ReadonlyArray<readonly [number, number, number, number]> = [
  [158, 20, 287, 492],
  [85, 34, 349, 478],
  [65, 7, 351, 505],
  [115, 0, 373, 500],
  [102, 0, 347, 494],
  [109, 0, 341, 490]
];

/** Call from a scene's preload hook before registering the individual NPC frames. */
export function preloadAdventureAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ADVENTURE_NPC_ATLAS)) {
    scene.load.spritesheet(ADVENTURE_NPC_ATLAS, 'assets/adventure/npc-atlas.png', {
      frameWidth: 512,
      frameHeight: 512
    });
  }
}

/** Give scenes stable texture keys for NPC placement; each character occupies one row-major cell. */
export function registerAdventureFrames(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ADVENTURE_NPC_ATLAS)) return;
  const atlas = scene.textures.get(ADVENTURE_NPC_ATLAS);
  ADVENTURE_NPC_KEYS.forEach((key, index) => {
    if (atlas.has(key)) return;
    const [left, top, width, height] = NPC_ALPHA_BOUNDS[index];
    const cellX=(index%3)*512, cellY=Math.floor(index/3)*512;
    atlas.add(key, 0, cellX+left, cellY+top, width, height);
  });
}
