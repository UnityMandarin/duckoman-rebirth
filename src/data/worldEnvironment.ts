import { chapterPlatforms, chapterSections, CHAPTER_WIDTH, SECTION_WIDTH, type ChapterKind, type Ledge } from './chapters';
import { encounterFor } from './chapterChallenges';
import { roomFor } from './qualityRooms';
import { CASTLE, CASTLE_PLATFORMS, CASTLE_SECRET, secretHoleSolids } from './castle';
import { GATE_1_ROOM } from './gate1Room';
import { SCENIC_SCROLL } from './scenicZones';

export type EnvironmentKind = ChapterKind | 'castle';
export type Interval = readonly [number, number];
export interface EnvironmentMachine {
  readonly type: 'presses' | 'lift' | 'ferry' | 'shutters' | 'crumble' | 'conveyor';
  readonly step: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly travelX: Interval;
  readonly travelY: Interval;
}
export interface EnvironmentRoom {
  readonly index: number;
  readonly name: string;
  readonly theme: string;
  readonly start: number;
  readonly end: number;
  readonly floor: number;
  readonly floorIntervals: readonly Interval[];
  readonly gaps: readonly Interval[];
  readonly steps: readonly Ledge[];
  readonly envelope: Interval;
  readonly machines: readonly EnvironmentMachine[];
  readonly leftAnchor: number;
  readonly rightAnchor: number;
}
export interface EnvironmentPlan {
  readonly kind: EnvironmentKind;
  readonly width: number;
  readonly top: number;
  readonly bottom: number;
  readonly gridOrigin: readonly [number, number];
  readonly gridWidth: number;
  readonly farScale: number;
  readonly farScroll: readonly [number, number];
  readonly rooms: readonly EnvironmentRoom[];
}

const THEMES: Record<EnvironmentKind, readonly string[]> = {
  castle: ['royal archive / secret service shaft', 'lower royal gallery', 'dash gallery / low overheads', 'royal foundry corridor', 'audience passage', 'Rust chamber'],
  jail: ['deep cells', 'service ascent', 'laundry counterweights', 'lower gallery ascent', 'high switchback gallery', 'chainworks', 'upper refuge', 'observation shutters / drop', 'spiral descent', 'lower drain landing', 'drainage counterweights', 'eastern sluice'],
  outside: ['fallen city', 'ash gardens', 'broken procession', 'market mill', 'exposed orchard ruins', 'broken causeway', 'farm refuge', 'wind orchard', 'first canopy climb', 'shuttergrove', 'bramble presses', 'moonwell clearing', 'woodland wind descent', 'river ferry', 'stonewater gorge', 'woodland mill lift', 'thorn switchback', 'ancient root refuge', 'long river crossing', 'border mill lift', 'overgrown counterflow mill', 'fox lantern grove', 'Regent grove', 'ruined court gate'],
  crimson: ['occupied border', 'conveyor avenue', 'windfoundry', 'switchback machinery', 'fighting foundry', 'horizontal carriage works', 'downhill conveyor works', 'lift shaft', 'crownworks', 'quiet palace gate', 'Crab vault', 'under-throne exit'],
};

/** Complement of actual floor intervals; a chapter name never manufactures a pit. */
export function environmentGaps(start: number, end: number, intervals: readonly Interval[]): Interval[] {
  const gaps: Interval[] = [];
  let at = start;
  for (const [a, b] of [...intervals].sort((a, b) => a[0] - b[0])) {
    if (a > at) gaps.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < end) gaps.push([at, end]);
  return gaps;
}

function machine(type: EnvironmentMachine['type'], step: number, surface: Ledge): EnvironmentMachine {
  return { type, step, x: surface.x, y: surface.y, width: surface.width,
    travelX: [surface.x - (type === 'ferry' ? 65 : 0), surface.x + (type === 'ferry' ? 65 : 0)],
    travelY: [surface.y - (type === 'lift' ? 65 : 0), surface.y + (type === 'lift' ? 65 : 0)] };
}

/** Read-only projection of the live authored data, in a single chapter coordinate system. */
export function createEnvironmentPlan(kind: EnvironmentKind): EnvironmentPlan {
  const castle = kind === 'castle';
  const width = castle ? CASTLE.width : CHAPTER_WIDTH[kind];
  const top = castle ? CASTLE.top : -160;
  const bottom = castle ? CASTLE_SECRET.hole.portalY : kind === 'jail' ? 1840 : kind === 'outside' ? 620 : 460;
  const surfaces: Ledge[] = castle ? secretHoleSolids([...GATE_1_ROOM.platforms, ...CASTLE_PLATFORMS]) : chapterPlatforms(kind);
  const castleBounds = [0, 2560, 4300, 5900, 7380, 8960, CASTLE.width];
  const bounds = castle ? castleBounds : Array.from({ length: chapterSections(kind).length + 1 }, (_, i) => i * SECTION_WIDTH);
  const rooms = bounds.slice(0, -1).map((start, index): EnvironmentRoom => {
    const end = bounds[index + 1]!;
    const authored = castle ? undefined : roomFor(kind, index);
    const floor = authored?.floor ?? 360;
    const localSurfaces = surfaces.filter(p => castle ? p.x + p.width / 2 > start && p.x - p.width / 2 < end : p.room === index);
    const floorIntervals: Interval[] = localSurfaces.filter(p => castle ? p.y - p.height / 2 === floor : p.role === 'floor')
      .map(p => [Math.max(start, p.x - p.width / 2), Math.min(end, p.x + p.width / 2)] as const).sort((a, b) => a[0] - b[0]);
    const steps = localSurfaces.filter(p => castle ? p.y - p.height / 2 !== floor : p.role === 'ledge');
    const encounter = castle ? undefined : encounterFor(kind, index);
    const machines = (encounter?.moving ?? []).flatMap(m => {
      const surface = steps.find(p => p.step === m.step);
      return surface ? [machine(m.type, m.step, surface)] : [];
    });
    return { index, start, end, name: castle ? THEMES.castle[index]! : authored?.name ?? chapterSections(kind)[index]!.name,
      theme: THEMES[kind][index]!, floor, floorIntervals, gaps: environmentGaps(start, end, floorIntervals), steps, machines,
      envelope: [Math.min(floor, ...steps.map(p => p.y - p.height / 2)), floor], leftAnchor: start, rightAnchor: end };
  });
  return { kind, width, top, bottom, gridOrigin: [0, top], gridWidth: 480,
    farScale: kind === 'jail' ? 2.25 : castle ? 1.6 : kind === 'outside' ? 1.2 : .75,
    farScroll: [SCENIC_SCROLL, 1], rooms };
}

/** A pier's complete footprint must fit an authored bank; never fill a gap. */
export function pierFitsBank(room: EnvironmentRoom, x: number, width: number): boolean {
  return room.floorIntervals.some(([a, b]) => x - width / 2 >= a && x + width / 2 <= b);
}

/** Preview/practice keeps neighbor context, while avoiding full-chapter scenery instances. */
export function environmentWindow(plan: EnvironmentPlan, bounds?: Interval): readonly EnvironmentRoom[] {
  if (!bounds) return plan.rooms;
  const first = plan.rooms.findIndex(r => r.end > bounds[0]);
  let last = plan.rooms.findIndex(r => r.start >= bounds[1]);
  if (last < 0) last = plan.rooms.length;
  return plan.rooms.slice(Math.max(0, first - 1), Math.min(plan.rooms.length, last + 1));
}
