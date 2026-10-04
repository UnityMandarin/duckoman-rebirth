import { beforeEach, describe, expect, it, vi } from 'vitest';

const wardenConstruct = vi.fn();
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Core: { Events: { BLUR: 'blur' } }, Math: { Clamp: (v: number, min: number, max: number) => Math.min(max, Math.max(min, v)) } } }));
vi.mock('../src/entities/HollowWarden', () => ({ HollowWarden: class { hear = vi.fn(); constructor(...args: unknown[]) { wardenConstruct(this, ...args); } } }));
import { RescueScene } from '../src/scenes/RescueScene';

describe('RescueScene spawnWarden adapter', () => {
  beforeEach(() => wardenConstruct.mockClear());
  function fixture(stage: string) {
    const target = Object.create(RescueScene.prototype) as any;
    const player = { body: { center: { x: 432 } } };
    const camera = { startFollow: vi.fn(), stopFollow: vi.fn() };
    Object.assign(target, { stage, player, warden: undefined, cameras: { main: camera }, tweens: { add: vi.fn() } });
    return { target, player, camera };
  }

  it('spawns once at the authored location and reveal time, hears the player, and preserves camera follow', () => {
    const f = fixture('released');
    Reflect.get(RescueScene.prototype, 'spawnWarden').call(f.target);
    const instance = f.target.warden;
    expect(wardenConstruct).toHaveBeenCalledTimes(1);
    expect(wardenConstruct.mock.calls[0].slice(2)).toEqual([f.player, expect.any(Function), 790, 2000]);
    expect(instance.hear).toHaveBeenCalledWith(432);
    expect(f.camera.stopFollow).not.toHaveBeenCalled();
    expect(f.target.tweens.add).not.toHaveBeenCalled();
    Reflect.get(RescueScene.prototype, 'spawnWarden').call(f.target);
    expect(wardenConstruct).toHaveBeenCalledTimes(1);
  });

  it('does not spawn unless Franklin has been released', () => {
    const f = fixture('chained');
    Reflect.get(RescueScene.prototype, 'spawnWarden').call(f.target);
    expect(wardenConstruct).not.toHaveBeenCalled();
  });
});
