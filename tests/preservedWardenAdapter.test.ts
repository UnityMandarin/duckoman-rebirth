import {setDebugMode} from '../src/systems/debug/debugSettings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const construct = vi.hoisted(() => vi.fn());
vi.mock('../src/entities/HollowWarden', () => ({ HollowWarden: class {
  hear = vi.fn();
  constructor(...args: unknown[]) { construct(this, ...args); }
} }));
import { spawnPreservedWarden } from '../src/systems/spawnPreservedWarden';

describe('dormant preserved Warden adapter', () => {
  beforeEach(() => {construct.mockClear();setDebugMode(false);});
  it('denies off, permits on, then denies off before construction regardless of preview flags',()=>{
    const scene:any={devPreview:true,bossPreview:true},player:any={body:{center:{x:432}}};
    expect(()=>spawnPreservedWarden(scene,player,vi.fn())).toThrow('requires debug mode');expect(construct).not.toHaveBeenCalled();setDebugMode(true);spawnPreservedWarden(scene,player,vi.fn());expect(construct).toHaveBeenCalledOnce();setDebugMode(false);expect(()=>spawnPreservedWarden(scene,player,vi.fn())).toThrow('requires debug mode');expect(construct).toHaveBeenCalledOnce();
  });
  it('keeps the original constructor, reveal, hearing and camera contract available to later levels', () => {
    setDebugMode(true);
    const player = { body: { center: { x: 432 } } };
    const onDefeated = vi.fn();
    const camera = { startFollow: vi.fn(), stopFollow: vi.fn() };
    const scene = { cameras: { main: camera }, tweens: { add: vi.fn() } } as any;
    const instance = spawnPreservedWarden(scene, player as any, onDefeated);
    expect(construct).toHaveBeenCalledTimes(1);
    expect(construct.mock.calls[0].slice(1)).toEqual([scene, player, onDefeated, 790, 2000]);
    expect(instance.hear).toHaveBeenCalledWith(432);
    expect(camera.stopFollow).not.toHaveBeenCalled();
    expect(scene.tweens.add).not.toHaveBeenCalled();
  });
});
