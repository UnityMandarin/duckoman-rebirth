import Phaser from 'phaser';
import { FURNACE_BOSS_CHECKPOINT, FURNACE_ROOMS, FURNACE_ROOM_WIDTH } from '../data/furnace';
import type { Player } from '../entities/Player';
import type {PredictHazard} from './descentPrediction';

export const FURNACE_LAVA_POOL_WIDTH = 480;
export const FURNACE_LAVA_APRON_WIDTH = 192;
export const FURNACE_LAVA_WORLD_BOTTOM = 700;
export const FURNACE_LAVA_PLATFORM_CLEARANCE = 96;
export const FURNACE_LAVA_MAX_DELTA = 50;
export const FURNACE_LAVA_BLOB_POOL_SIZE = 12;
export const FURNACE_LAVA_WARNING_POOL_SIZE = 2;
export const FURNACE_LAVA_REFUGE_MARGIN = 64;
export const FURNACE_LAVA_PLAYER_EXCLUSION = 80;
export const FURNACE_LAVA_FEED_MIN_RISE = 24;
export const FURNACE_LAVA_BLOB_CORE = Object.freeze({ width: 12, height: 14 });

export interface FurnaceLavaRefuge { left: number; right: number; }
export interface FurnaceLavaRegion { left: number; right: number; surfaceY: number; phase: number; refugetops: readonly FurnaceLavaRefuge[]; }
export interface FurnaceLavaSupport { left: number; right: number; top: number; refuge?: boolean; lift?: boolean; }
export interface FurnaceLavaBody { left: number; right: number; top: number; bottom: number; }
export interface FurnaceLavaMotion { x: number; y: number; vx: number; vy: number; ageMs: number; surfaceY: number; ttlMs: number; }
export interface FurnaceLavaDivider { x: number; top: number; bottom: number; height: number; }
export interface FurnaceLavaFeedLayout {
  x: number; highSide: 'left' | 'right'; upperSurfaceY: number; lowerSurfaceY: number;
  pumpY: number; outletX: number; outletY: number; conduitY: number; conduitHeight: number;
}

function writePredictionHazard(out:PredictHazard[],index:number,id:string,left:number,right:number,top:number,bottom:number,kind:PredictHazard['kind']):number {
  let hazard=out[index];if(!hazard){hazard={id:'',left:0,right:0,top:0,bottom:0,active:false,kind};out[index]=hazard;}
  hazard.id=id;hazard.left=left;hazard.right=right;hazard.top=top;hazard.bottom=bottom;hazard.kind=kind;hazard.active=true;return index+1;
}

/** Authored geometry is converted once into contiguous, fixed world-space basins. */
export function buildFurnaceLavaRegions(rooms = FURNACE_ROOMS): FurnaceLavaRegion[] {
  const supports: FurnaceLavaSupport[] = [];
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri], base = ri * FURNACE_ROOM_WIDTH;
    supports.push({ left: base + 96 - 96, right: base + 96 + 96, top: room.entryTop, refuge: true });
    supports.push({ left: base + 1396 - 44, right: base + 1396 + 44, top: room.exitTop, refuge: true });
    room.steps.forEach((step, si) => {
      const robotIsland = room.robots.some(robot => robot.step === si);
      supports.push({ left: base + step.x - step.width / 2, right: base + step.x + step.width / 2, top: step.top, lift: room.machines.some(machine => machine.step === si && machine.type === 'lift'), refuge: !step.circuit || robotIsland });
    });
  }
  const regions: FurnaceLavaRegion[] = [];
  for (let i = 0; i < rooms.length * 3; i++) {
    const left = i * FURNACE_LAVA_POOL_WIDTH, right = left + FURNACE_LAVA_POOL_WIDTH;
    regions.push(makeRegion(left, right, supports));
  }
  const apronLeft = FURNACE_BOSS_CHECKPOINT, apronRight = apronLeft + FURNACE_LAVA_APRON_WIDTH;
  supports.push({ left: apronLeft, right: apronRight, top: 360, refuge: true });
  regions.push(makeRegion(apronLeft, apronRight, supports));
  return regions;
}

/** Scenic walls retain each unequal basin to the world floor without adding collision. */
export function buildFurnaceLavaDividers(regions: readonly FurnaceLavaRegion[]): FurnaceLavaDivider[] {
  return regions.slice(0, -1).flatMap((region, index) => {
    const next = regions[index + 1];
    if (region.surfaceY === next.surfaceY) return [];
    const top = Math.min(region.surfaceY, next.surfaceY);
    return [{ x: region.right, top, bottom: FURNACE_LAVA_WORLD_BOTTOM, height: FURNACE_LAVA_WORLD_BOTTOM - top }];
  });
}

/** Fixed pumps explain every authored level change with enough room for a conduit segment. */
export function buildFurnaceLavaFeeds(regions: readonly FurnaceLavaRegion[]): FurnaceLavaFeedLayout[] {
  return regions.slice(0, -1).flatMap((region, index) => {
    const next = regions[index + 1];
    if (region.surfaceY === next.surfaceY || Math.abs(region.surfaceY - next.surfaceY) < FURNACE_LAVA_FEED_MIN_RISE) return [];
    const highSide = region.surfaceY < next.surfaceY ? 'left' : 'right';
    const upperSurfaceY = Math.min(region.surfaceY, next.surfaceY), lowerSurfaceY = Math.max(region.surfaceY, next.surfaceY);
    const x = region.right, pumpY = lowerSurfaceY + 22, outletY = upperSurfaceY + 12;
    const conduitHeight = lowerSurfaceY - upperSurfaceY - 23;
    return [{ x, highSide, upperSurfaceY, lowerSurfaceY, pumpY,
      outletX: x + (highSide === 'left' ? -9 : 9), outletY,
      conduitY: (upperSurfaceY + 24 + lowerSurfaceY + 1) / 2, conduitHeight }];
  });
}

function makeRegion(left: number, right: number, supports: readonly FurnaceLavaSupport[]): FurnaceLavaRegion {
  const overlapping = supports.filter(s => s.left < right && s.right > left);
  const highestTop = overlapping.reduce((max, s) => Math.max(max, s.top + (s.lift ? 65 : 0)), Number.NEGATIVE_INFINITY);
  return {
    left, right,
    surfaceY: highestTop + FURNACE_LAVA_PLATFORM_CLEARANCE,
    phase: (left / FURNACE_LAVA_POOL_WIDTH * 1.731) % (Math.PI * 2),
      refugetops: supports.filter(s => s.refuge && s.left - FURNACE_LAVA_REFUGE_MARGIN < right && s.right + FURNACE_LAVA_REFUGE_MARGIN > left)
      .map(s => ({ left: Math.max(left, s.left - FURNACE_LAVA_REFUGE_MARGIN), right: Math.min(right, s.right + FURNACE_LAVA_REFUGE_MARGIN) })).sort((a,b)=>a.left-b.left),
  };
}

export function bodyTouchesFurnaceLava(body: FurnaceLavaBody, regions: readonly FurnaceLavaRegion[]): boolean {
  return regions.some(region => body.left < region.right && body.right > region.left && body.bottom >= region.surfaceY);
}

export function furnaceLavaSurfaceAt(x: number, regions: readonly FurnaceLavaRegion[]): number | undefined {
  const region = regions.find((candidate, index) => x >= candidate.left && (x < candidate.right || index === regions.length - 1 && x <= candidate.right));
  return region?.surfaceY;
}

export function furnaceLavaMotionTouchesSurface(motion: FurnaceLavaMotion, regions: readonly FurnaceLavaRegion[]): boolean {
  const surfaceY = furnaceLavaSurfaceAt(motion.x, regions) ?? motion.surfaceY;
  return motion.y + FURNACE_LAVA_BLOB_CORE.height / 2 >= surfaceY;
}

export function furnaceLavaEligibleIntervals(region: FurnaceLavaRegion, playerX: number): Array<{ left: number; right: number }> {
  const exclusions = [
    ...region.refugetops,
    { left: playerX - FURNACE_LAVA_PLAYER_EXCLUSION, right: playerX + FURNACE_LAVA_PLAYER_EXCLUSION },
  ].sort((a, b) => a.left - b.left);
  const intervals: Array<{ left: number; right: number }> = [];
  let x = region.left;
  for (const exclusion of exclusions) {
    if (exclusion.right <= x || exclusion.left >= region.right) continue;
    const edge = Math.max(region.left, Math.min(region.right, exclusion.left));
    if (edge > x) intervals.push({ left: x, right: edge });
    x = Math.max(x, Math.min(region.right, exclusion.right));
  }
  if (x < region.right) intervals.push({ left: x, right: region.right });
  return intervals.filter(interval => interval.right - interval.left >= 24);
}

export function furnaceLavaPointInIntervals(intervals: readonly { left: number; right: number }[], random: () => number): number | undefined {
  const total = intervals.reduce((sum, interval) => sum + interval.right - interval.left, 0);
  if (total <= 0) return undefined;
  let choice = Math.max(0, Math.min(.999999999, random())) * total;
  for (const interval of intervals) {
    const width = interval.right - interval.left;
    if (choice < width) return interval.left + choice;
    choice -= width;
  }
  return intervals[intervals.length - 1].right;
}

/** Expands the target by the image-core half-size, then tests the full travel segment. */
export function furnaceLavaSweptContact(x0: number, y0: number, x1: number, y1: number, body: FurnaceLavaBody): boolean {
  const halfW = FURNACE_LAVA_BLOB_CORE.width / 2, halfH = FURNACE_LAVA_BLOB_CORE.height / 2;
  const left = body.left - halfW, right = body.right + halfW, top = body.top - halfH, bottom = body.bottom + halfH;
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, x0 - left) && clip(dx, right - x0) && clip(-dy, y0 - top) && clip(dy, bottom - y0) && t0 <= t1;
}

/** Deterministic constant-gravity step used by production and trajectory checks. */
export function advanceFurnaceLavaMotion(motion: FurnaceLavaMotion, deltaMs: number): void {
  const dt = Math.max(0, Math.min(FURNACE_LAVA_MAX_DELTA, Number.isFinite(deltaMs) ? deltaMs : 0)) / 1000;
  motion.ageMs += dt * 1000;
  motion.x += motion.vx * dt;
  motion.y += motion.vy * dt + 300 * dt * dt;
  motion.vy += 600 * dt;
}

export function furnaceLavaNextDelay(random: () => number): number {
  return 3500 + Math.max(0, Math.min(.999999, random())) * 4000;
}

export function makeFurnaceLavaMotion(x: number, surfaceY: number, random: () => number): FurnaceLavaMotion {
  const height = 110 + Math.max(0, Math.min(.999999, random())) * 70;
  return { x, y: surfaceY - 8, vx: Math.max(0, Math.min(.999999, random())) * 70 - 35, vy: -Math.sqrt(1200 * height), ageMs: 0, surfaceY, ttlMs: 5000 };
}

interface PoolArt { region: FurnaceLavaRegion; deep: Phaser.GameObjects.TileSprite; surface: Phaser.GameObjects.TileSprite; glow: Phaser.GameObjects.Image; flow: number; shimmer: number; }
interface FeedArt { layout: FurnaceLavaFeedLayout; casingLeft: Phaser.GameObjects.TileSprite; casingRight: Phaser.GameObjects.TileSprite; molten: Phaser.GameObjects.TileSprite; pump: Phaser.GameObjects.Image; gear: Phaser.GameObjects.Image; outlet: Phaser.GameObjects.Image; }
interface Blob { image: Phaser.GameObjects.Image; motion: FurnaceLavaMotion; active: boolean; previousX: number; previousY: number; justLaunched: boolean; }
interface Warning { image: Phaser.GameObjects.Image; region?: FurnaceLavaRegion; x: number; remainingMs: number; }

export class FurnaceLava {
  readonly regions: FurnaceLavaRegion[];
  private readonly pools: PoolArt[] = [];
  private readonly dividers: Phaser.GameObjects.TileSprite[] = [];
  private readonly feeds: FeedArt[] = [];
  private readonly blobs: Blob[] = [];
  private readonly warnings: Warning[] = [];
  private readonly random: () => number;
  private waitMs = 0;
  private clockMs = 0;
  private eruptionRegion?: FurnaceLavaRegion;
  private eruptionX = 0;
  private eruptionCount = 0;
  private eruptionMs = 0;
  private destroyed = false;
  private suspended = false;
  private readonly shutdown = (): void => this.destroy();

  constructor(private readonly scene: Phaser.Scene, private readonly player: Player, random: () => number = Math.random) {
    this.random = random;
    this.regions = buildFurnaceLavaRegions();
    this.regions.forEach((region, i) => {
      const width = region.right - region.left, height = Math.max(1, FURNACE_LAVA_WORLD_BOTTOM - region.surfaceY);
      const deep = scene.add.tileSprite((region.left + region.right) / 2, region.surfaceY + height / 2, width, height, 'furnace-lava-basin')
        .setOrigin(.5).setDepth(-16).setAlpha(.56).setTileScale(.5, .5);
      const surface = scene.add.tileSprite((region.left + region.right) / 2, region.surfaceY + 24, width, 48, 'furnace-lava-surface', 'surface')
        .setOrigin(.5).setDepth(-15).setTileScale(48 / 180, 48 / 180).setAlpha(.98);
      const glow = scene.add.image((region.left + region.right) / 2, region.surfaceY, 'furnace-lava-glow')
        .setOrigin(.5, 1).setDisplaySize(width, 160).setTint(0xff7138).setBlendMode(Phaser.BlendModes.ADD).setDepth(9.1).setAlpha(.16);
      const phase = i * 17.3, flow = [.32, -.21, .48][i % 3];
      deep.tilePositionX = -phase * .65; surface.tilePositionX = phase;
      this.pools.push({ region, deep, surface, glow, flow, shimmer: i * 1.37 });
    });
    for (const divider of buildFurnaceLavaDividers(this.regions)) {
      this.dividers.push(scene.add.tileSprite(divider.x, divider.top + divider.height / 2, 32, divider.height, 'identity-crimson', 'foundation')
        .setOrigin(.5).setTileScale(.5, .5).setDepth(-14));
    }
    for (const layout of buildFurnaceLavaFeeds(this.regions)) {
      const casingLeft = scene.add.tileSprite(layout.x - 5.6, layout.conduitY, 11, layout.conduitHeight, 'furnace-lava-feed', 'conduitRailLeft')
        .setOrigin(.5).setTileScale(32 / 180, 32 / 180).setDepth(-13);
      const casingRight = scene.add.tileSprite(layout.x + 5.6, layout.conduitY, 11, layout.conduitHeight, 'furnace-lava-feed', 'conduitRailRight')
        .setOrigin(.5).setTileScale(32 / 180, 32 / 180).setDepth(-13);
      const molten = scene.add.tileSprite(layout.x, layout.conduitY, 10, layout.conduitHeight, 'furnace-lava-feed', 'conduitMolten')
        .setOrigin(.5).setTileScale(32 / 180, 32 / 180).setDepth(-13.1);
      const pump = scene.add.image(layout.x, layout.pumpY, 'furnace-lava-feed', 'pump')
        .setOrigin(.5).setDisplaySize(42, 42).setDepth(-12);
      const gear = scene.add.image(layout.x - 10, layout.pumpY + 4, 'furnace-utility', 'gear')
        .setOrigin(.5).setDisplaySize(9, 9).setDepth(-11.9);
      const outlet = scene.add.image(layout.outletX, layout.outletY, 'furnace-lava-feed', layout.highSide === 'left' ? 'outletLeft' : 'outletRight')
        .setOrigin(.5).setDisplaySize(32, 24).setDepth(-12);
      this.feeds.push({ layout, casingLeft, casingRight, molten, pump, gear, outlet });
    }
    for (let i = 0; i < FURNACE_LAVA_BLOB_POOL_SIZE; i++) {
      const image = scene.add.image(-1000, -1000, 'furnace-lava-spit', `spit-${i % 4}`).setOrigin(.5).setDisplaySize(24, 28).setDepth(9.5).setVisible(false);
      this.blobs.push({ image, motion: { x: 0, y: 0, vx: 0, vy: 0, ageMs: 0, surfaceY: 0, ttlMs: 5000 }, active: false, previousX: 0, previousY: 0, justLaunched: false });
    }
    for (let i = 0; i < FURNACE_LAVA_WARNING_POOL_SIZE; i++) {
      const image = scene.add.image(-1000, -1000, 'furnace-lava-spit', `spit-${(i + 1) % 4}`).setOrigin(.5, 1).setDisplaySize(40, 38).setDepth(9.4).setVisible(false);
      this.warnings.push({ image, x: 0, remainingMs: 0 });
    }
    this.waitMs = this.nextDelay();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
  }

  /** Returns true when the actual player body has crossed a visible pool surface. */
  /** Nonmutating traversal forecast of lethal basin spans, active eruption tells, and moving blob paths. */
  fillPredictionHazards(out:PredictHazard[],startIndex=0,left=-Infinity,right=Infinity):number {
    let count=startIndex;
    for(const region of this.regions){if(region.right<=left||region.left>=right)continue;let x=region.left;for(const refuge of region.refugetops){const a=Math.max(region.left,refuge.left),b=Math.min(region.right,refuge.right);if(a>x)count=writePredictionHazard(out,count,'lava',x,a,region.surfaceY,region.surfaceY,'pit');x=Math.max(x,b);}if(x<region.right)count=writePredictionHazard(out,count,'lava',x,region.right,region.surfaceY,region.surfaceY,'pit');}
    for(const warning of this.warnings)if(warning.remainingMs>0&&warning.region&&warning.x+24>left&&warning.x-24<right)count=writePredictionHazard(out,count,'eruption-warning',warning.x-24,warning.x+24,warning.region.surfaceY-38,warning.region.surfaceY,'press');
    for(const blob of this.blobs){if(!blob.active)continue;const m=blob.motion,dt=Math.min(.35,Math.max(0,(m.ttlMs-m.ageMs)/1000)),x1=m.x+m.vx*dt,y1=m.y+m.vy*dt+300*dt*dt;if(Math.max(m.x,x1)+12>left&&Math.min(m.x,x1)-12<right)count=writePredictionHazard(out,count,'lava-blob',Math.min(m.x,x1)-8,Math.max(m.x,x1)+8,Math.min(m.y,y1)-8,Math.max(m.y,y1)+8,'spike');}
    for(let i=count;i<out.length;i++)out[i]!.active=false;return count;
  }
  /** Returns true when the actual player body has crossed a visible pool surface. */
  update(deltaMs: number): boolean {
    if (this.destroyed) return false;
    if (this.suspended) { this.suspended = false; return bodyTouchesFurnaceLava(this.player.body, this.regions); }
    const delta = Math.max(0, Math.min(FURNACE_LAVA_MAX_DELTA, Number.isFinite(deltaMs) ? deltaMs : 0));
    this.clockMs += delta;
    for (const pool of this.pools) {
      pool.deep.tilePositionX += delta * pool.flow * .035;
      pool.surface.tilePositionX += delta * pool.flow * .09;
      pool.surface.setAlpha(.94 + Math.sin(this.clockMs * .002 + pool.shimmer) * .035);
      pool.glow.setAlpha(.14 + Math.sin(this.clockMs * .0024 + pool.shimmer) * .025);
    }
    for (const feed of this.feeds) {
      // Only the molten window scrolls; its generated iron/brass casing stays locked in place.
      // Positive tilePositionY moves the sampled liquid texture upward in Phaser's TileSprite.
      feed.molten.tilePositionY += delta * .04;
      feed.gear.setRotation(this.clockMs * .0012);
    }
    for (const warning of this.warnings) if (warning.remainingMs > 0) {
      warning.remainingMs -= delta;
      warning.image.setAlpha(.68 + Math.sin(this.clockMs * .025) * .27);
      if (warning.remainingMs <= 0) { warning.remainingMs = 0; warning.region = undefined; warning.image.setVisible(false); }
    }
    if (this.eruptionRegion) {
      this.eruptionMs -= delta;
      if (this.eruptionMs <= 0) { this.launchEruption(); this.eruptionRegion = undefined; this.waitMs = this.nextDelay(); }
    } else {
      this.waitMs -= delta;
      if (this.waitMs <= 0) this.beginEruption();
    }
    for (const blob of this.blobs) {
      if (!blob.active) continue;
      if (blob.justLaunched) { blob.justLaunched = false; continue; }
      const motion = blob.motion;
      blob.previousX = motion.x; blob.previousY = motion.y;
      advanceFurnaceLavaMotion(motion, delta);
      blob.image.setPosition(motion.x, motion.y).setRotation(Math.sin(motion.ageMs * .01) * .13);
      if (furnaceLavaSweptContact(blob.previousX, blob.previousY, motion.x, motion.y, this.player.body)) {
        this.player.takeDamage(motion.x, .5);
        this.retire(blob);
      } else if (furnaceLavaMotionTouchesSurface(motion, this.regions) || motion.ageMs >= motion.ttlMs) this.retire(blob);
    }
    return bodyTouchesFurnaceLava(this.player.body, this.regions);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown);
    for (const pool of this.pools) { pool.deep.destroy(); pool.surface.destroy(); pool.glow.destroy(); }
    for (const divider of this.dividers) divider.destroy();
    for (const feed of this.feeds) { feed.casingLeft.destroy(); feed.casingRight.destroy(); feed.molten.destroy(); feed.pump.destroy(); feed.gear.destroy(); feed.outlet.destroy(); }
    for (const blob of this.blobs) blob.image.destroy();
    for (const warning of this.warnings) warning.image.destroy();
    this.blobs.length = 0; this.warnings.length = 0; this.pools.length = 0; this.dividers.length = 0; this.feeds.length = 0;
  }

  suspend(): void { this.suspended = true; }

  private beginEruption(): void {
    const body = this.player.body;
    const nearby = this.regions.filter(region => {
      const verticalGap = region.surfaceY - body.bottom;
      return Math.abs((region.left + region.right) / 2 - body.center.x) < 850 && verticalGap >= -50 && verticalGap <= 210 && furnaceLavaEligibleIntervals(region, body.center.x).length > 0;
    });
    if (!nearby.length) { this.waitMs = Math.min(1000, this.nextDelay()); return; }
    const region = nearby[Math.floor(this.sample() * nearby.length)];
    const intervals = furnaceLavaEligibleIntervals(region, body.center.x);
    const x = furnaceLavaPointInIntervals(intervals, this.random);
    if (x === undefined) { this.waitMs = this.nextDelay(); return; }
    const warning = this.warnings.find(slot => slot.remainingMs <= 0);
    if (!warning) { this.waitMs = 300; return; }
    warning.region = region; warning.x = x; warning.remainingMs = 700;
    warning.image.setPosition(x, region.surfaceY - 5).setAlpha(.9).setVisible(true);
    this.eruptionRegion = region; this.eruptionX = x;
    this.eruptionCount = 1 + Math.floor(this.sample() * 3);
    this.eruptionMs = 700;
  }

  private launchEruption(): void {
    const region = this.eruptionRegion;
    if (!region) return;
    let launched = 0;
    const free = this.blobs.filter(blob => !blob.active);
    const count = Math.min(this.eruptionCount, free.length);
    const eligible = furnaceLavaEligibleIntervals(region, this.player.body.center.x);
    if (!eligible.some(interval => this.eruptionX >= interval.left && this.eruptionX < interval.right)) {
      const warning = this.warnings.find(slot => slot.region === region && slot.remainingMs > 0);
      if (warning) { warning.region = undefined; warning.remainingMs = 0; warning.image.setVisible(false); }
      this.waitMs = this.nextDelay();
      return;
    }
    for (let i = 0; i < count; i++) {
      const blob = free[i];
      Object.assign(blob.motion, makeFurnaceLavaMotion(this.eruptionX, region.surfaceY, this.random));
      blob.previousX = this.eruptionX; blob.previousY = region.surfaceY - 8; blob.active = true; blob.justLaunched = true;
      blob.image.setPosition(this.eruptionX, region.surfaceY - 8).setRotation((this.sample() - .5) * .5).setVisible(true);
      launched++;
    }
    const warning = this.warnings.find(slot => slot.region === region && slot.remainingMs > 0);
    if (warning) { warning.region = undefined; warning.remainingMs = 0; warning.image.setVisible(false); }
    if (!launched) this.waitMs = 800;
  }

  private retire(blob: Blob): void {
    blob.active = false;
    blob.image.setVisible(false).setPosition(-1000, -1000);
  }

  private sample(): number { return Math.max(0, Math.min(.999999, this.random())); }

  private nextDelay(): number { return furnaceLavaNextDelay(this.random); }
}
