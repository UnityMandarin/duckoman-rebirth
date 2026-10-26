export type PlayerCosmeticPose = 'dead' | 'hurt' | 'ultimate' | 'dash' | 'crouch' | 'air' | 'moving' | 'idle';

/** Pure presentation priority. These flags never feed collision or movement code. */
export function resolvePlayerCosmeticPose(state: {
  dead: boolean;
  hurt: boolean;
  ultimate: boolean;
  dash: boolean;
  crouch: boolean;
  air: boolean;
  moving: boolean;
}): PlayerCosmeticPose {
  if (state.dead) return 'dead';
  if (state.hurt) return 'hurt';
  if (state.ultimate) return 'ultimate';
  if (state.dash) return 'dash';
  if (state.crouch) return 'crouch';
  if (state.air) return 'air';
  if (state.moving) return 'moving';
  return 'idle';
}

/** Delta accumulator that drops paused/hidden time and caps a delayed frame. */
export function cosmeticDelta(deltaMs: number, enabled: boolean): number {
  return enabled ? Math.max(0, Math.min(50, deltaMs)) : 0;
}

export interface TrailImage {
  visible: boolean;
  scaleX: number;
  scaleY: number;
  setPosition(x: number, y: number): this;
  setDisplaySize(width: number, height: number): this;
  setFlipX(value: boolean): this;
  setRotation(value: number): this;
  setScale(x: number, y?: number): this;
  setAlpha(value: number): this;
  setVisible(value: boolean): this;
  destroy(): void;
}

/** Fixed image pool; dash frames only mutate existing display objects. */
export class CosmeticTrailPool<T extends TrailImage> {
  readonly images: T[];
  private readonly ages: number[];
  private readonly poseScaleX: number[];
  private readonly poseScaleY: number[];
  private cursor = 0;
  private destroyed = false;

  constructor(factory: () => T, readonly size = 6) {
    this.images = Array.from({ length: size }, factory);
    this.ages = Array(size).fill(Number.POSITIVE_INFINITY);
    this.poseScaleX = Array(size).fill(1);
    this.poseScaleY = Array(size).fill(1);
  }

  emit(now: number, pose: { x: number; y: number; width: number; height: number; flipX: boolean; rotation: number }): void {
    if (this.destroyed || this.images.length === 0) return;
    const index = this.cursor++ % this.images.length;
    this.ages[index] = 0;
    const image = this.images[index].setPosition(pose.x, pose.y).setDisplaySize(pose.width, pose.height);
    this.poseScaleX[index] = image.scaleX;
    this.poseScaleY[index] = image.scaleY;
    image.setFlipX(pose.flipX).setRotation(pose.rotation).setAlpha(.48).setVisible(true);
  }

  update(_now: number, dashing: boolean, deltaMs: number, enabled = true): void {
    if (this.destroyed) return;
    const dt = cosmeticDelta(deltaMs, enabled);
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      if (!image.visible) continue;
      const age = this.ages[i] += dt;
      const growth = 1 + Math.min(220, age) / 880;
      image.setAlpha(Math.max(0, .48 * (1 - age / 220))).setScale(this.poseScaleX[i] * growth, this.poseScaleY[i] * growth);
      if (age >= 220 || !dashing) image.setVisible(false);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const image of this.images) image.destroy();
    this.images.length = 0;
  }
}
