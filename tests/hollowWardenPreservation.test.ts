import {beginUltimateFreeze} from '../src/systems/ultimateFreeze';
import {setDebugMode} from '../src/systems/debug/debugSettings';
import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {
  Scenes: { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume' } },
  Core: { Events: { BLUR: 'blur' } },
  Math: { Clamp: (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n)) },
} }));
import { HollowWarden } from '../src/entities/HollowWarden';

class Display {
  x = 0; y = 0; alpha = 1; visible = true; destroyed = false; text = '';
  setOrigin() { return this; } setDisplaySize() { return this; } setDepth() { return this; }
  setScrollFactor() { return this; } setCrop() { return this; } setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setVisible(v: boolean) { this.visible = v; return this; } setAlpha(v: number) { this.alpha = v; return this; }
  setRotation() { return this; } setFlipX() { return this; } setTint() { return this; } setText(text: string) { this.text = text; return this; }
  setColor() { return this; } clear() { return this; } fillStyle() { return this; } fillRect() { return this; }
  lineStyle() { return this; } lineBetween() { return this; } strokeRect() { return this; } fillRoundedRect() { return this; }
  strokeRoundedRect() { return this; } fillCircle() { return this; } strokeCircle() { return this; }
  destroy() { this.destroyed = true; }
}
class Events {
  listeners = new Map<string, Set<(...args: any[]) => void>>();
  on(key: string, fn: (...args: any[]) => void) { const set = this.listeners.get(key) ?? new Set(); set.add(fn); this.listeners.set(key, set); return this; }
  once(key: string, fn: (...args: any[]) => void) { const wrapper = (...args: any[]) => { this.off(key, wrapper); fn(...args); }; return this.on(key, wrapper); }
  off(key: string, fn: (...args: any[]) => void) { this.listeners.get(key)?.delete(fn); return this; }
}

describe('preserved Hollow Warden runtime', () => {
  it('still constructs and updates with the original reveal/constructor contract', () => {
    vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const events = new Events();
    const scene: any = {
      add: { image: (x: number, y: number) => { const d = new Display(); d.x = x; d.y = y; return d; }, graphics: () => new Display(), text: (x: number, y: number, text: string) => { const d = new Display(); d.x = x; d.y = y; d.text = text; return d; } },
      events, time: { now: 0 }, sys: { isActive: () => true }, physics: { world: {isPaused:false,pause(){this.isPaused=true;},resume(){this.isPaused=false;}} },
    };
    const player: any = { active: true, body: { center: { x: 432, y: 300 }, left: 422, right: 442, top: 280, bottom: 320 }, isDashing: false, usingUltimate: false };
    setDebugMode(true);
    const warden = new HollowWarden(scene, player, vi.fn(), 790, 2000);
    expect(warden.image.x).toBe(790);
    expect(warden.phase).toBe('introduction');
    warden.hear(432);
    expect((warden as any).noisePulses[0].started).toBe(0);
    expect(() => warden.update(16)).not.toThrow();
    player.usingUltimate=true;const tryHit=vi.fn(()=>true),strike={player,tryHit};
    for(const fn of events.listeners.get('ultimate-strike')??[])fn(strike);expect(tryHit).not.toHaveBeenCalled();
    warden.controller.phase='claw-active';beginUltimateFreeze(scene,player);warden.update(50);expect(scene.physics.world.isPaused).toBe(true);expect((warden as any).lifecycleGap).toBe(false);for(const fn of events.listeners.get('ultimate-strike')??[])fn(strike);expect(warden.hp).toBe(24);expect(tryHit).toHaveBeenCalledWith(warden,expect.objectContaining({top:120,bottom:360}));
    for(const fn of events.listeners.get('ultimate-strike')??[])fn(strike);expect(tryHit).toHaveBeenCalledTimes(1);
    scene.time.now=1000;setDebugMode(false);for(const fn of events.listeners.get('ultimate-strike')??[])fn(strike);expect(tryHit).toHaveBeenCalledTimes(1);expect(warden.hp).toBe(24);
    setDebugMode(true);warden.controller.phase='sonic-cue';for(const fn of events.listeners.get('ultimate-strike')??[])fn(strike);expect(warden.hp).toBe(16);
    warden.shutdown();
  });
});
