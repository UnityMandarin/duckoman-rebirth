import type Phaser from 'phaser';
import {addScenicEnvironment} from './ScenicEnvironment';
import { createEnvironmentPlan, environmentWindow, pierFitsBank, type EnvironmentKind, type EnvironmentMachine, type Interval } from '../data/worldEnvironment';

const KIT = 'world-v2-structures';
const FRAMES = ['pier', 'guide', 'tree', 'ruin'] as const;
/** Background-only, fixed-scale art. Scene shutdown owns all instances; no update callback or physics. */
export function addWorldEnvironment(scene: Phaser.Scene, kind: EnvironmentKind, bounds?: Interval): void {
  const plan = createEnvironmentPlan(kind), rooms = environmentWindow(plan, bounds);
  const texture = scene.textures.get(KIT);
  const source = texture.getSourceImage();
  FRAMES.forEach((name, i) => {
    if (!texture.has(name)) texture.add(name, 0, i * source.width / 4, 0, source.width / 4, source.height);
  });
  addScenicEnvironment(scene,plan,bounds);

  const structure = (x: number, top: number, frame: typeof FRAMES[number], scale: number, alpha: number, flip = false) =>
    scene.add.image(x, top, KIT, frame).setOrigin(.5, 0).setScale(scale).setAlpha(alpha)
      .setTint(kind === 'crimson' ? 0x89737c : 0xffffff)
      .setFlipX(flip).setScrollFactor(1, 1).setDepth(-23).setName('world-environment-structure');

  const machineSupport = (m: EnvironmentMachine) => {
    if (m.type === 'presses') {
      // Matches ChapterTraps' exact step top and 480px press stroke; tall guide is behind it.
      structure(m.x, m.y - 16 - 650, 'guide', .64, .52);
    } else if (m.type === 'lift') {
      structure(m.x, m.travelY[0] - 180, 'guide', .38, .5);
    } else if (m.type === 'ferry') {
      // End stops at the actual +/-65 travel extrema, with hanging ropes and no false deck.
      structure(m.travelX[0], m.y - 340, 'guide', .34, .44);
      structure(m.travelX[1], m.y - 340, 'guide', .34, .44, true);
    } else if (m.type === 'conveyor') {
      structure(m.x, m.y + 16, 'guide', .24, .38);
    } else if (m.type === 'shutters' || m.type === 'crumble') {
      structure(m.x, m.y - 300, 'guide', .3, .35);
    }
    if (kind !== 'castle' && scene.textures.get(`identity-${kind}`).has('chain') && (m.type === 'presses' || m.type === 'lift')) {
      // Existing measured chain art ties the mechanism to its support; isotropic scale.
      const chain = scene.textures.get(`identity-${kind}`).get('chain');
      const s = 120 / chain.height;
      scene.add.image(m.x, m.y - (m.type === 'presses' ? 500 : 180), `identity-${kind}`, 'chain')
        .setOrigin(.5, 0).setScale(s).setAlpha(.5).setScrollFactor(1, 1).setDepth(-22).setName('world-environment-chain');
    }
  };

  for (const room of rooms) {
    const forest = kind === 'outside';
    // Piers/roots use ONE world grid. The local floor determines bank validity, not texture phase.
    for (let x = Math.ceil((room.start + 100) / plan.gridWidth) * plan.gridWidth; x < room.end - 100; x += plan.gridWidth) {
      const scale = forest ? .48 : .52, footprint = source.width / 4 * scale;
      if (!pierFitsBank(room, x, footprint)) continue;
      if (forest) {
        // Ruined city gradually acquires trees; rooms12 onward remain woodland and river mills.
        const frame = room.index < 4 ? 'ruin' : room.index < 8 && (Math.round(x / 480) % 2 === 0) ? 'ruin' : 'tree';
        // Root the native silhouette in this actual bank; foreground terrain hides its lower roots.
        // This applies to registered landmarks, never to the distant field's global texture phase.
        const canopyTop = room.floor - source.height * scale;
        structure(x, canopyTop, frame, scale, room.index < 8 ? .48 : .55, Math.round(x / 480) % 2 === 1);
        if (room.index >= 19 && Math.round(x / 480) % 3 === 0) structure(x + 48, room.floor - source.height * .5, 'ruin', .5, .4);
      } else {
        // Full shaft coverage on a global vertical grid; no bottom anchor at a room transition.
        for (let y = plan.top - 40; y < plan.bottom; y += 480) structure(x, y, 'pier', scale, kind === 'crimson' ? .35 : .4);
      }
    }
    // Real steps supply recessed hanging columns. No decorative horizontal cap/foundation is added.
    for (const step of room.steps) {
      if (room.machines.some(m => m.step === step.step) || forest && room.index < 8) continue;
      if (forest) {
        if (pierFitsBank(room, step.x, 150)) structure(step.x, step.y - 400, 'tree', .4, .3);
      } else structure(step.x, step.y - 460, kind === 'castle' && room.index === 3 ? 'guide' : 'pier', .45, .27);
    }
    room.machines.forEach(machineSupport);
    if (kind === 'castle' && room.index === 5) {
      // The surviving boss ledges define the center bay, with the same royal stone module.
      for (const x of [room.start + 120, room.end - 160]) {
        for (let y = plan.top - 40; y < plan.bottom; y += 480) structure(x, y, 'pier', .52, .38);
      }
    }
  }
}
