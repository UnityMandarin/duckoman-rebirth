import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Math: { Clamp: (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v)) } } }));
import { Player } from '../src/entities/Player';
import { CosmeticTrailPool } from '../src/systems/cosmeticPose';

function makeImage() {
  const image: any = {
    x: 0, y: 0, scaleX: 1, scaleY: 1, displayWidth: 264, displayHeight: 216, rotation: 0, visible: true,
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
    setDisplaySize(width: number, height: number) { this.scaleX = width / 264; this.scaleY = height / 216; this.displayWidth = Math.abs(this.scaleX * 264); this.displayHeight = Math.abs(this.scaleY * 216); return this; },
    setFlipX() { return this; }, setRotation(v: number) { this.rotation = v; return this; }, setScale(x: number, y = x) { this.scaleX = x; this.scaleY = y; this.displayWidth = Math.abs(x * 264); this.displayHeight = Math.abs(y * 216); return this; },
    setTint: vi.fn(function(this: any) { return this; }), clearTint: vi.fn(function(this: any) { return this; }),
    setAlpha() { return this; }, setVisible(v: boolean) { this.visible = v; return this; }, destroy: vi.fn()
  };
  return image;
}

function playerFixture() {
  const visual = makeImage();
  const scene: any = {
    time: { now: 1000, paused: false }, sys: { isActive: () => true, settings: { key: 'test' } },
    game: { loop: { delta: 16 } }
  };
  const p: any = Object.create(Player.prototype);
  Object.assign(p, {
    sprite: { scene, x: 100, y: 200 }, visual,
    body: { center: { x: 100, y: 200 }, blocked: { down: true }, touching: { down: false }, velocity: { x: 0, y: 0 } },
    dashHitboxZone: { setPosition: vi.fn(), body: { enable: false } },
    abilities: { isDashing: () => false, sprinting: false }, lifeState: 'ACTIVE', facing: 1,
    ultimateUntil: 0, hurtUntil: 0, crouching: false,
    wasGrounded: true, landedAt: 0, blinkAt: 99999, blinkUntil: 0, cosmeticTime: 1000,
    lastSweatAt: 0, lastGhostAt: -1000,
    ghosts: new CosmeticTrailPool(() => makeImage()),
    drawDashEffect: vi.fn()
  });
  return p;
}

describe('Player.syncVisual cosmetic priority', () => {
  it('keeps pose sizing in rendered pixels with a non-square native texture', () => {
    const p = playerFixture();
    (p as any).syncVisual();
    expect(p.visual.displayWidth).toBeCloseTo(66);
    const poseHeight = 60 + Math.sin(p.cosmeticTime * 0.0033) * 1.15;
    expect(p.visual.displayHeight).toBeCloseTo(poseHeight);
    p.blinkAt = 0;
    p.cosmeticTime = 1000;
    (p as any).syncVisual();
    expect(p.visual.displayWidth).toBeCloseTo(66);
    const blinkPoseHeight = 60 + Math.sin(p.cosmeticTime * 0.0033) * 1.15;
    expect(p.visual.displayHeight).toBeCloseTo(blinkPoseHeight * 0.82);
  });

  it('uses the resolved pose for presentation while leaving body dimensions untouched', () => {
    const p = playerFixture();
    p.body.velocity.x = 180;
    p.crouching = true;
    p.lifeState = 'HURT';
    p.ultimateUntil = 2000;
    p.hurtUntil = 2000;
    const bodySize = { width: 40, height: 60 };
    p.body.width = bodySize.width; p.body.height = bodySize.height;
    (p as any).syncVisual();
    expect(p.visual.setTint).toHaveBeenCalled();
    expect(p.visual.rotation).toBeCloseTo(-0.13);
    expect(p.body.width).toBe(bodySize.width);
    expect(p.body.height).toBe(bodySize.height);
    expect(p.drawDashEffect).toHaveBeenCalled();
  });

  it('holds an active ultimate pose and does not advance its cosmetic clock', () => {
    const p = playerFixture();
    p.ultimateUntil = 2000;
    p.visual.setDisplaySize(77, 55);
    const previous = [p.visual.displayWidth, p.visual.displayHeight];
    (p as any).syncVisual();
    expect([p.visual.displayWidth, p.visual.displayHeight]).toEqual(previous);
    expect(p.cosmeticTime).toBe(1000);
    expect(p.drawDashEffect).not.toHaveBeenCalled();
  });
});
