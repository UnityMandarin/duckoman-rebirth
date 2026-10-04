import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume' } }, Core: { Events: { BLUR: 'blur' } } } }));
import { HollowWarden } from '../src/entities/HollowWarden';
import { createWardenController } from '../src/systems/HollowWardenRules';

function graphics() {
  const g: any = { clear: vi.fn(() => g), fillStyle: vi.fn(() => g), fillRect: vi.fn(() => g), strokeRect: vi.fn(() => g), lineStyle: vi.fn(() => g), lineBetween: vi.fn(() => g), fillRoundedRect: vi.fn(() => g), strokeRoundedRect: vi.fn(() => g) };
  return g;
}
function visual() {
  return { visible: false, x: 0, y: 0, width: 0, height: 0, rotation: 0, alpha: 1,
    setVisible: vi.fn(function(this: any, v: boolean) { this.visible = v; return this; }),
    setPosition: vi.fn(function(this: any, x: number, y: number) { this.x = x; this.y = y; return this; }),
    setDisplaySize: vi.fn(function(this: any, w: number, h: number) { this.width = w; this.height = h; return this; }),
    setAlpha: vi.fn(function(this: any, v: number) { this.alpha = v; return this; }),
    setRotation: vi.fn(function(this: any, v: number) { this.rotation = v; return this; }),
  };
}
function fixture(phase: string, x = 790) {
  const target = Object.create(HollowWarden.prototype) as any;
  Object.assign(target, { controller: { ...createWardenController(), phase, lockedDirection: 1, lockedAimX: 1100, lockedAimY: 240, lockedPortalX: 1640, elapsedMs: 50 }, image: { x }, warning: graphics(), ribs: graphics(), portalRings: [visual(), visual(), visual()], slashImages: [visual(), visual()], warningGeometrySignature: '', ribGeometrySignature: '' });
  return target;
}
const draw = (target: any): void => Reflect.get(HollowWarden.prototype, 'drawWarnings').call(target);

describe('HollowWarden warning graphics cache', () => {
  it('draws unchanged claw geometry once and redraws when cue becomes active', () => {
    const w = fixture('claw-cue'); draw(w); draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(1);
    w.controller.phase = 'claw-active'; draw(w); draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(2);
  });

  it('caches unchanged sonic geometry and redraws when its phase changes', () => {
    const w = fixture('sonic-cue'); draw(w); draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(1);
    w.controller.phase = 'sonic-active'; draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(2);
  });

  it('does not redraw empty listen geometry as the boss moves', () => {
    const w = fixture('listen'); draw(w); w.image.x += 20; draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(1);
    expect(w.ribs.clear).toHaveBeenCalledTimes(1);
  });

  it('redraws vulnerable ribs when the boss moves during recovery', () => {
    const w = fixture('claw-recovery'); draw(w); w.image.x += 20; draw(w);
    expect(w.warning.clear).toHaveBeenCalledTimes(1);
    expect(w.ribs.clear).toHaveBeenCalledTimes(2);
  });

  it('updates portal and slash transforms on every frame', () => {
    const portal = fixture('portal-cue'); draw(portal); portal.controller.elapsedMs = 220; draw(portal);
    expect(portal.portalRings[0].setPosition).toHaveBeenCalledTimes(2);
    expect(portal.portalRings[0].setDisplaySize).toHaveBeenCalledTimes(2);
    const sonic = fixture('sonic-cue'); draw(sonic); sonic.controller.lockedAimY = 400; draw(sonic);
    expect(sonic.slashImages[0].setPosition).toHaveBeenCalledTimes(2);
    expect(sonic.slashImages[0].setRotation).toHaveBeenCalledTimes(2);
  });
});
