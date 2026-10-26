import { describe, expect, it, vi } from 'vitest';
import { CosmeticTrailPool, cosmeticDelta, resolvePlayerCosmeticPose, type TrailImage } from '../src/systems/cosmeticPose';

function spyImage() {
  const image = {
    visible: false,
    scaleX: 1,
    scaleY: 1,
    setPosition: vi.fn(function(this: any) { return this; }),
    setDisplaySize: vi.fn(function(this: any, width: number, height: number) { this.scaleX = width / 264; this.scaleY = height / 216; return this; }),
    setFlipX: vi.fn(function(this: any) { return this; }),
    setRotation: vi.fn(function(this: any) { return this; }),
    setScale: vi.fn(function(this: any, x: number, y = x) { this.scaleX = x; this.scaleY = y; return this; }),
    setAlpha: vi.fn(function(this: any) { return this; }),
    setVisible: vi.fn(function(this: any, value: boolean) { this.visible = value; return this; }),
    destroy: vi.fn()
  };
  return image as unknown as TrailImage & typeof image;
}

describe('player cosmetic pose priority', () => {
  it('resolves the full priority order when lower-priority conditions overlap', () => {
    const flags = { dead: false, hurt: false, ultimate: false, dash: false, crouch: false, air: false, moving: false };
    expect(resolvePlayerCosmeticPose(flags)).toBe('idle');
    expect(resolvePlayerCosmeticPose({ ...flags, moving: true })).toBe('moving');
    expect(resolvePlayerCosmeticPose({ ...flags, air: true, moving: true })).toBe('air');
    expect(resolvePlayerCosmeticPose({ ...flags, crouch: true, air: true, moving: true })).toBe('crouch');
    expect(resolvePlayerCosmeticPose({ ...flags, dash: true, crouch: true, air: true, moving: true })).toBe('dash');
    expect(resolvePlayerCosmeticPose({ ...flags, ultimate: true, dash: true })).toBe('ultimate');
    expect(resolvePlayerCosmeticPose({ ...flags, hurt: true, ultimate: true })).toBe('hurt');
    expect(resolvePlayerCosmeticPose({ ...flags, dead: true, hurt: true })).toBe('dead');
  });

  it('caps active cosmetic delta and discards paused or hidden time', () => {
    expect(cosmeticDelta(1000, true)).toBe(50);
    expect(cosmeticDelta(-8, true)).toBe(0);
    expect(cosmeticDelta(1000, false)).toBe(0);
  });
});

describe('fixed cosmetic trail pool', () => {
  it('reuses six images across twenty dash cycles and destroys each exactly once', () => {
    const factory = vi.fn(spyImage);
    const pool = new CosmeticTrailPool(factory);
    expect(factory).toHaveBeenCalledTimes(6);
    const imageRefs = [...pool.images];
    const pose = { x: 12, y: 24, width: 66, height: 60, flipX: false, rotation: 0 };
    for (let dash = 0; dash < 20; dash++) {
      for (let frame = 0; frame < 5; frame++) {
        pool.emit(0, pose);
        pool.update(0, true, 16);
      }
      pool.update(0, false, 16);
    }
    expect(factory).toHaveBeenCalledTimes(6);
    expect(pool.images).toEqual(imageRefs);
    pool.destroy();
    pool.destroy();
    expect(imageRefs.map(image => image.destroy.mock.calls.length)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(() => { pool.emit(0, pose); pool.update(0, true, 16); }).not.toThrow();
  });

  it('does not age effects during pause and does not catch up beyond a capped frame', () => {
    const image = spyImage();
    const pool = new CosmeticTrailPool(() => image, 1);
    pool.emit(0, { x: 0, y: 0, width: 66, height: 60, flipX: false, rotation: 0 });
    expect(image.scaleX).toBeCloseTo(.25);
    expect(image.scaleY).toBeCloseTo(60 / 216);
    expect(image.scaleX * 264).toBeCloseTo(66);
    expect(image.scaleY * 216).toBeCloseTo(60);
    pool.update(0, true, 5000, false);
    expect(image.setScale).toHaveBeenLastCalledWith(.25, 60 / 216);
    pool.update(0, true, 5000, true);
    expect(image.setScale).toHaveBeenLastCalledWith(.25 * (1 + 50 / 880), (60 / 216) * (1 + 50 / 880));
    expect(image.scaleX * 264).toBeCloseTo(66 * (1 + 50 / 880));
    expect(image.scaleY * 216).toBeCloseTo(60 * (1 + 50 / 880));
    pool.emit(0, { x: 0, y: 0, width: 70, height: 54, flipX: false, rotation: 0 });
    expect(image.scaleX).toBeCloseTo(70 / 264);
    expect(image.scaleY).toBeCloseTo(54 / 216);
    expect(image.scaleX * 264).toBeCloseTo(70);
    expect(image.scaleY * 216).toBeCloseTo(54);
    pool.update(0, true, 50);
    expect(image.scaleX * 264).toBeCloseTo(70 * (1 + 50 / 880));
    expect(image.scaleY * 216).toBeCloseTo(54 * (1 + 50 / 880));
    pool.update(0, false, 16);
    expect(image.setVisible).toHaveBeenLastCalledWith(false);
  });
});
