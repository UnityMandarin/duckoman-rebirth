import {setDebugMode} from '../src/systems/debug/debugSettings';
import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume' } }, Math: { Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)) } } }));
import { spawnPreservedWarden } from '../src/systems/spawnPreservedWarden';
import { createFranklinController } from '../src/systems/FranklinFireFoxRules';

function visual(x = 0, y = 0): any {
  const object: any = { x, y, visible: true, destroyed: false };
  for (const method of ['setOrigin', 'setDisplaySize', 'setDepth', 'setScrollFactor', 'setCrop', 'setAlpha', 'setRotation', 'setFlipX', 'setText', 'setColor', 'clear', 'fillStyle', 'lineStyle', 'fillCircle', 'fillRect', 'strokeRect', 'fillRoundedRect', 'strokeRoundedRect', 'lineBetween']) {
    object[method] = vi.fn(() => object);
  }
  object.setVisible = vi.fn((visible: boolean) => { object.visible = visible; return object; });
  object.setPosition = vi.fn((nextX: number, nextY: number) => { object.x = nextX; object.y = nextY; return object; });
  object.destroy = vi.fn(() => { object.destroyed = true; });
  return object;
}

describe('future Warden entry point', () => {
  it('constructs and updates the actual preserved Warden independently of Franklin', () => {
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    try {
      const scene: any = {
        add: { image: visual, text: visual, graphics: () => visual() },
        time: { now: 0 }, events: { on: vi.fn(), once: vi.fn(), off: vi.fn() },
        physics: { world: { isPaused: false } }, sys: { isActive: () => true },
      };
      const player: any = { active: true, body: { center: { x: 432, y: 340 }, width: 46, height: 40 } };
      const defeated = vi.fn();
      setDebugMode(true);
      const warden = spawnPreservedWarden(scene, player, defeated);
      const franklin = createFranklinController();
      expect(warden.image.x).toBe(790);
      expect(warden.hp).toBe(32);
      scene.time.now = 2100;
      warden.update(50);
      expect(warden.image.setFlipX).toHaveBeenCalled();
      expect(warden.controller).not.toBe(franklin);
      expect(defeated).not.toHaveBeenCalled();
      franklin.hp = 16;
      expect(warden.hp).toBe(32);
      warden.shutdown();
      expect(warden.image.destroy).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});
