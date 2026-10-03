import type { Attack } from './attack';
import { polygonIntersectsRect, type Point, type Rect } from './contactRules';

export const RUSTWING_CYCLE = ['lurch', 'fire', 'swipe'] as const;
/** Second form: the dome erupts between every other attack. No mouth fireballs. */
export const RUSTWING_MOLTEN_CYCLE = ['erupt', 'lurch', 'erupt', 'swipe'] as const;
export type RustAttack = (typeof RUSTWING_CYCLE)[number] | (typeof RUSTWING_MOLTEN_CYCLE)[number];
export type RustForm = 1 | 2;
export type RustPhase =
  | 'rest'
  | 'lurchWindup' | 'lurch'
  | 'lungeWindup' | 'lunge'
  | 'leapWindup' | 'leap'
  | 'stalk' | 'swipeWindup' | 'swipe'
  | 'fireWindup' | 'fire'
  | 'eruptWindup' | 'erupt';

export const RUSTWING_RULES = {
  hp: 10,
  moltenHp: 12,
  /** Invulnerable while transforming into the second form; the new bar fills over this time. */
  transformMs: 2400,
  hitLock: 650,
  contactDamage: 0.5,
  /** Multiplier on Duckoman's usual hit shove. The charge throws him much harder than a touch. */
  knockback: { contact: 1, swipe: 1, fireball: 1, magma: 1 },
  fireballDamage: 0.5,
  fireballRadius: 18,
  fireballSpeed: 150,
  fireballCount: 3,
  /**
   * Elevation from horizontal, in radians. Negative is up. Independent of the player. Fire attacks alternate
   * patterns; the second is rotated down half a gap so its top two shots split the first pattern's gaps.
   */
  fireballPatterns: [[-0.62, -0.22, 0.16], [-0.42, -0.03, 0.36]] as const,
  /** Long enough to cross the whole room; floor and room edges still put them out sooner. */
  fireballLifeMs: 6000,
  lurchCount: 2,
  lurchDistance: 64,
  lurchWindupMs: 520,
  lurchMs: 420,
  lungeWindupMs: 780,
  lungeMs: 1400,
  /** How far the dash box sticks past the body's top and front. Back and bottom stay on the body. */
  chargeLead: 16,
  /** Used only when the duck is behind him on the third dash: chance the third move is a jump. */
  leapChance: 0.5,
  leapWindupMs: 780,
  /** The jump always lasts this long. A nearer wall ends it early. */
  leapMs: 1000,
  /** Horizontal speed of the leap, as a fraction of the floor dash. */
  leapSpeed: 0.75,
  /** Takeoff downstroke: wings slam from fully raised to below level, then settle over twice this. */
  leapFlapMs: 140,
  /** Apex height of the leap's feet; the duck can run underneath for most of it. */
  leapHeight: 170,
  /** Duck within this horizontal distance at rest: walk over and slash instead of the next cycle attack. */
  slashTrigger: 240,
  /** Stalking stops once the duck is this close, or after stalkMaxMs. */
  slashRange: 120,
  stalkSpeed: 130,
  stalkMaxMs: 1600,
  swipeWindupMs: 620,
  swipeMs: 400,
  /** The slash glides forward this far while the wing sweeps. */
  swipeStep: 70,
  /** Wing length from the shoulder pivot at full slash size, and the folded length it grows from. */
  swipeReach: 150,
  wingRestLength: 70,
  wingHitRadius: 16,
  /** Wing angles in screen degrees for a right-facing boss (0 = straight ahead, negative = up). */
  wingRestAngle: -20,
  /** Raised start of the sweep. The arc is about two thirds of the old overhead swing and still finishes at wingSlashAngle. */
  wingWindupAngle: -91,
  /** End of the slash: low in front, but still above a crouching duck. */
  wingSlashAngle: 17,
  wingRecoverMs: 280,
  restMs: 900,
  fireWindupMs: 640,
  fireMs: 160,
  eruptWindupMs: 820,
  eruptMs: 260,
  eruptRadius: 14,
  eruptLaunchSpeed: 470,
  eruptGravity: 720,
  /** Horizontal launch speeds per volley, forward-positive; volleys alternate so the safe gaps move. */
  eruptVolleys: [[-150, -60, 30, 120, 210], [-200, -105, -15, 75, 165]] as const,
  /** Dome shots that become magma globs once this much of the current bar is gone. */
  magmaVolley: [{ lost: 0.25, count: 1 }, { lost: 0.5, count: 3 }, { lost: 0.75, count: 5 }] as const,
  /** Launch point: top of the dome, above the body's feet line. */
  eruptLaunchHeight: 116,
  /** Molten form lobs a magma glob from the dome on its own clock, regardless of the current attack. */
  magmaGlobMs: 2000,
  magmaGlobRadius: 9,
  /** Upward launch speed range; the landing spot is random within magmaGlobReach either side of him. */
  magmaGlobLaunch: [360, 480] as const,
  magmaGlobReach: 260,
  /** Landed globs leave a pool that shrinks away over magmaPoolMs. */
  magmaPoolMs: 3000,
  magmaPoolHalfW: 26,
  magmaDamage: 0.5,
  roomWidth: 640,
  /**
   * Intro: the lair (and RustWing with it) starts this dark and brightens one step per introStepMs. On the last
   * step his eyes flash, the room snaps to full light over introLightMs, then a beat before the fight starts.
   */
  introDarkSteps: [0.9, 0.8, 0.7, 0.6, 0.5] as const,
  introStepMs: 600,
  introStepFadeMs: 180,
  introLightMs: 120,
  introFlashMs: 360,
  introPauseMs: 1000,
  /** Death: stagger with explosions bursting off him, topple onto his side, lie sparking, then blow apart. */
  deathStumbleMs: 2400,
  deathStaggerSteps: 4,
  deathStaggerStep: 16,
  deathFallMs: 520,
  deathFallAngle: 86,
  deathDownMs: 800,
  deathPopMs: 170,
  /** Body stops 4px off each wall of the 640px room, too tight for the duck to hide behind him. */
  left: 54,
  right: 586,
  floorTop: 360,
  bodyHalfW: 50,
  bodyHalfH: 56
} as const;

export function rustPhaseDuration(phase: RustPhase): number {
  const r = RUSTWING_RULES;
  if (phase === 'rest') return r.restMs;
  if (phase === 'lurchWindup') return r.lurchWindupMs;
  if (phase === 'lurch') return r.lurchMs;
  if (phase === 'lungeWindup') return r.lungeWindupMs;
  if (phase === 'lunge') return r.lungeMs;
  if (phase === 'leapWindup') return r.leapWindupMs;
  if (phase === 'leap') return r.leapMs;
  if (phase === 'stalk') return r.stalkMaxMs;
  if (phase === 'swipeWindup') return r.swipeWindupMs;
  if (phase === 'swipe') return r.swipeMs;
  if (phase === 'fireWindup') return r.fireWindupMs;
  if (phase === 'eruptWindup') return r.eruptWindupMs;
  if (phase === 'erupt') return r.eruptMs;
  return r.fireMs;
}

/** Phase 1 only: the facing map edge is inside half his full forward dash, so a spit cannot be dodged. */
export function rustFireBlocked(x: number, facing: number, form: RustForm): boolean {
  if (form !== 1) return false;
  const ahead = facing < 0 ? x : RUSTWING_RULES.roomWidth - x;
  return ahead <= (RUSTWING_RULES.right - RUSTWING_RULES.left) * 0.5;
}

export function nextRustAttack(cycle: number, form: RustForm = 1): RustAttack {
  const order: readonly RustAttack[] = form === 2 ? RUSTWING_MOLTEN_CYCLE : RUSTWING_CYCLE;
  return order[((cycle % order.length) + order.length) % order.length];
}

/**
 * A nearby duck gets slashed instead of the cycle's next attack, but never twice in a row, and the
 * interrupted cycle attack still comes next.
 */
export function pickRustAttack(cycle: number, form: RustForm, duckDistance: number, previous: RustAttack): { attack: RustAttack; advancesCycle: boolean } {
  if (Math.abs(duckDistance) <= RUSTWING_RULES.slashTrigger && previous !== 'swipe') return { attack: 'swipe', advancesCycle: false };
  return { attack: nextRustAttack(cycle, form), advancesCycle: true };
}

/** `leap` picks which lunge follows the last lurch. */
export function advanceRustPhase(phase: RustPhase, lurchesDone: number, attack: RustAttack, leap = false): { phase: RustPhase; lurchesDone: number } {
  if (phase === 'rest') {
    if (attack === 'lurch') return { phase: 'lurchWindup', lurchesDone: 0 };
    if (attack === 'fire') return { phase: 'fireWindup', lurchesDone: 0 };
    if (attack === 'erupt') return { phase: 'eruptWindup', lurchesDone: 0 };
    return { phase: 'stalk', lurchesDone: 0 };
  }
  if (phase === 'stalk') return { phase: 'swipeWindup', lurchesDone: 0 };
  if (phase === 'lurchWindup') return { phase: 'lurch', lurchesDone };
  if (phase === 'lurch') {
    if (lurchesDone + 1 < RUSTWING_RULES.lurchCount) return { phase: 'lurchWindup', lurchesDone: lurchesDone + 1 };
    return { phase: leap ? 'leapWindup' : 'lungeWindup', lurchesDone: 0 };
  }
  if (phase === 'lungeWindup') return { phase: 'lunge', lurchesDone: 0 };
  if (phase === 'leapWindup') return { phase: 'leap', lurchesDone: 0 };
  if (phase === 'swipeWindup') return { phase: 'swipe', lurchesDone: 0 };
  if (phase === 'fireWindup') return { phase: 'fire', lurchesDone: 0 };
  if (phase === 'eruptWindup') return { phase: 'erupt', lurchesDone: 0 };
  return { phase: 'rest', lurchesDone: 0 };
}

export function rustwingFacing(bossX: number, playerX: number): -1 | 1 {
  return playerX < bossX ? -1 : 1;
}

export function clampRustX(x: number): number {
  return Math.max(RUSTWING_RULES.left, Math.min(RUSTWING_RULES.right, x));
}

export function lurchTarget(x: number, facing: number): number {
  return clampRustX(x + facing * RUSTWING_RULES.lurchDistance);
}

/** Floor charge runs to the wall he is facing. */
export function lungeTarget(facing: number): number {
  return facing > 0 ? RUSTWING_RULES.right : RUSTWING_RULES.left;
}

/** Where the jump lands: 75% dash speed for the fixed jump time, or the facing wall if that is closer. */
export function leapTravelTarget(x: number, facing: number): number {
  const dist = rustDashSpeed('leap') * RUSTWING_RULES.leapMs / 1000;
  return clampRustX(x + facing * dist);
}

/**
 * Third move, decided on that frame. In front and above his head: jump. In front and below: floor charge.
 * Behind him: `roll` (0..1) against leapChance.
 */
export function rustThirdMove(bossX: number, bossY: number, facing: number, duckX: number, duckY: number, roll: number): 'leap' | 'lunge' {
  if ((duckX - bossX) * facing < 0) return roll < RUSTWING_RULES.leapChance ? 'leap' : 'lunge';
  const headY = bossY - RUSTWING_RULES.bodyHalfH;
  return duckY < headY ? 'leap' : 'lunge';
}

/** Leap position at progress `t` (0..1): straight across horizontally, a parabola up and back down. */
export function leapAt(fromX: number, toX: number, t: number): { x: number; height: number } {
  const c = Math.min(1, Math.max(0, t));
  return { x: clampRustX(fromX + (toX - fromX) * c), height: RUSTWING_RULES.leapHeight * 4 * c * (1 - c) };
}

/** Horizontal speed for a dash, so a full-length one still lasts its phase time and a short one finishes early. */
export function rustDashSpeed(phase: 'lurch' | 'lunge' | 'leap'): number {
  const r = RUSTWING_RULES;
  if (phase === 'lurch') return r.lurchDistance / r.lurchMs * 1000;
  const dash = (r.right - r.left) / r.lungeMs * 1000;
  return phase === 'leap' ? dash * r.leapSpeed : dash;
}

/** Step toward `toX`. Stops on arrival or when the room wall clamps the move. */
export function rustDashStep(x: number, toX: number, speed: number, dtMs: number): { x: number; stopped: boolean } {
  const dir = Math.sign(toX - x);
  if (dir === 0) return { x, stopped: true };
  const next = x + dir * speed * Math.min(Math.max(dtMs, 0), 50) / 1000;
  const arrived = dir > 0 ? next >= toX : next <= toX;
  const unclamped = arrived ? toX : next;
  const clamped = clampRustX(unclamped);
  return { x: clamped, stopped: arrived || clamped !== unclamped };
}

/** Height of the leap arc at horizontal position `x`, from `fromX` toward `toX`. */
export function leapHeightAt(fromX: number, toX: number, x: number): number {
  const span = toX - fromX;
  if (span === 0) return 0;
  const c = Math.min(1, Math.max(0, (x - fromX) / span));
  return RUSTWING_RULES.leapHeight * 4 * c * (1 - c);
}

/** Dash hurt box: the body, plus a little past the top and the facing side. */
export function rustChargeRect(x: number, y: number, facing: number): Rect {
  const body = rustBody(x, y), lead = RUSTWING_RULES.chargeLead;
  return {
    left: facing < 0 ? body.left - lead : body.left,
    right: facing > 0 ? body.right + lead : body.right,
    top: body.top - lead,
    bottom: body.bottom
  };
}

export function rustBody(x: number, y: number): Rect {
  const { bodyHalfW, bodyHalfH } = RUSTWING_RULES;
  return { left: x - bodyHalfW, right: x + bodyHalfW, top: y - bodyHalfH, bottom: y + bodyHalfH };
}

/** Stalk ends early once the duck is within slash range. */
export function stalkStep(x: number, duckX: number, dtMs: number): { x: number; arrived: boolean } {
  const gap = duckX - x;
  if (Math.abs(gap) <= RUSTWING_RULES.slashRange) return { x, arrived: true };
  const next = clampRustX(x + Math.sign(gap) * Math.min(Math.abs(gap) - RUSTWING_RULES.slashRange, RUSTWING_RULES.stalkSpeed * dtMs / 1000));
  return { x: next, arrived: next === x || Math.abs(duckX - next) <= RUSTWING_RULES.slashRange };
}

export function swipeTarget(x: number, facing: number): number {
  return clampRustX(x + facing * RUSTWING_RULES.swipeStep);
}

/** Front wing's shoulder joint, which the slash arcs around. */
export function rustWingPivot(x: number, y: number, facing: number): { x: number; y: number } {
  return { x: x + facing * 24, y: y - 28 };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Front-wing slash pose: unfolds and rears back over the windup, whips through the arc early in the swipe,
 * then folds back during recovery. Null when the wing is in its normal resting rig.
 */
export function rustWingPose(phase: RustPhase, elapsedMs: number, recoveringMs?: number): { angle: number; length: number } | null {
  const r = RUSTWING_RULES;
  if (phase === 'swipeWindup') {
    const t = easeOut(Math.min(1, elapsedMs / (r.swipeWindupMs * .6)));
    return { angle: r.wingRestAngle + (r.wingWindupAngle - r.wingRestAngle) * t, length: r.wingRestLength + (r.swipeReach - r.wingRestLength) * t };
  }
  if (phase === 'swipe') return { angle: rustSlashAngle(elapsedMs), length: r.swipeReach };
  if (phase === 'rest' && recoveringMs !== undefined && recoveringMs < r.wingRecoverMs) {
    const t = easeOut(recoveringMs / r.wingRecoverMs);
    return { angle: r.wingSlashAngle + (r.wingRestAngle - r.wingSlashAngle) * t, length: r.swipeReach + (r.wingRestLength - r.swipeReach) * t };
  }
  return null;
}

/** The sweep finishes in the first 60% of the swipe and holds at the bottom of the arc. */
export function rustSlashAngle(elapsedMs: number): number {
  const r = RUSTWING_RULES, t = easeOut(Math.min(1, Math.max(0, elapsedMs) / (r.swipeMs * .6)));
  return r.wingWindupAngle + (r.wingSlashAngle - r.wingWindupAngle) * t;
}

/**
 * Folded-wing lift for the leap: 1 is fully raised (prepping the flap), negative is the takeoff downstroke.
 */
export function rustWingRaise(phase: RustPhase, elapsedMs: number): number {
  const r = RUSTWING_RULES;
  if (phase === 'leapWindup') return easeOut(Math.min(1, Math.max(0, elapsedMs) / (r.leapWindupMs * .7)));
  if (phase !== 'leap') return 0;
  const t = Math.max(0, elapsedMs) / r.leapFlapMs;
  if (t < 1) return 1 - 1.8 * easeOut(t);
  return t >= 3 ? 0 : -.8 * (1 - (t - 1) / 2);
}

export interface WingVane { points: Point[]; rib: [Point, Point]; hole?: Point }
export interface WingShape { arm: [Point, Point]; armWidth: number; joint: Point; vanes: WingVane[]; teeth: Point[][] }

/** One of the two small rig wings on his back. `side` is screen direction; the rear (broken) wing is snapped short. */
export function foldedWing(mount: Point, side: -1 | 1, broken: boolean, lift: number, raise = 0): WingShape {
  const root = mount.x + side * 28, hinge = mount.x + side * 53;
  const tip = mount.x + side * ((broken ? 78 : 93) - raise * 16);
  const hy = mount.y - 13 + lift * .5 - raise * 6;
  const vanes: WingVane[] = [];
  for (let i = 2; i >= 0; i--) {
    const sy = hy - 13 + i * 10, ty = mount.y - 50 + i * 20 + lift - raise * (40 - i * 6);
    const gap = broken && i === 0 ? 14 : 7, base = hinge - side * i * 2;
    vanes.push({
      points: [{ x: base, y: sy }, { x: tip - side * i * 7, y: ty }, { x: tip - side * (i * 7 + gap), y: ty + 13 }, { x: base, y: sy + 10 }],
      rib: [{ x: base, y: sy + 4 }, { x: tip - side * (i * 7 + gap + 2), y: ty + 7 }],
      hole: (i + (broken ? 1 : 0)) % 2 === 0 ? { x: hinge + (tip - hinge) * .6 - side * i * 5, y: sy + (ty - sy) * .6 + 6 } : undefined
    });
  }
  return { arm: [{ x: root, y: mount.y - 8 }, { x: hinge, y: hy - 6 }], armWidth: 8, joint: { x: hinge, y: hy }, vanes, teeth: [] };
}

/**
 * The intact wing unfolded to slash size, rotated around the shoulder. Vanes fan out on the trailing side
 * so the leading vane is the serrated cutting edge.
 */
export function slashWing(pivot: Point, facing: number, angle: number, length: number): WingShape & { edge: [Point, Point] } {
  const a = angle * Math.PI / 180;
  const ux = facing * Math.cos(a), uy = Math.sin(a), lx = -facing * Math.sin(a), ly = Math.cos(a);
  const P = (along: number, off: number): Point => ({ x: pivot.x + ux * along + lx * off, y: pivot.y + uy * along + ly * off });
  const L = length, elbow = L * .36;
  const vanes: WingVane[] = [];
  for (let i = 3; i >= 0; i--) {
    const tip = L * (1 - i * .09), spread = -i * L * .14;
    vanes.push({
      points: [P(elbow, 4 - i * 6), P(tip, spread + 4), P(tip - L * .2, spread - 14), P(elbow, -10 - i * 6)],
      rib: [P(elbow + 4, -3 - i * 6), P(tip - L * .14, spread - 5)],
      hole: i % 2 === 0 ? P(elbow + (tip - elbow) * .55, -3 - i * 6 + (spread - 5 + 3 + i * 6) * .55) : undefined
    });
  }
  const teeth = Array.from({ length: 5 }, (_, k) => {
    const s = elbow + 10 + (L - 24 - elbow) * k / 4;
    return [P(s - 7, 4), P(s, 13 - (k % 2) * 3), P(s + 5, 4)];
  });
  return { arm: [P(0, 0), P(elbow, 0)], armWidth: 11, joint: P(elbow, 0), vanes, teeth, edge: [P(elbow, 4), P(L, 4)] };
}

/** Every painted part of a wing as a polygon: vanes, teeth, and the arm strut as a thick quad. */
export function wingHitPolygons(wing: WingShape): Point[][] {
  const [a, b] = wing.arm, len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len * wing.armWidth / 2, ny = (b.x - a.x) / len * wing.armWidth / 2;
  const arm = [{ x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny }, { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny }];
  return [arm, ...wing.vanes.map(v => v.points), ...wing.teeth];
}

export function wingTouches(polygons: readonly Point[][], rect: Rect): boolean {
  return polygons.some(points => polygonIntersectsRect(points, rect));
}

/**
 * Outline of everything the slash will cut, including the forward glide: the pivot shifts by `shift` in step
 * with the arc (both share the same easing), so each rim point is taken from where the shoulder will be then.
 * Returns the start pivot, the rim from windup to slash angle, then the end pivot.
 */
export function rustSwipeOutline(pivot: Point, facing: number, shift: number, radius: number, steps = 24): Point[] {
  const r = RUSTWING_RULES;
  const rim = Array.from({ length: steps + 1 }, (_, i) => {
    const e = i / steps, a = (r.wingWindupAngle + (r.wingSlashAngle - r.wingWindupAngle) * e) * Math.PI / 180;
    return { x: pivot.x + shift * e + facing * Math.cos(a) * radius, y: pivot.y + Math.sin(a) * radius };
  });
  return [pivot, ...rim, { x: pivot.x + shift, y: pivot.y }];
}

/** The painted slash: a crescent this many degrees behind the tip, this thick at the head, just past the wing's reach. */
export const SLASH_TRAIL = { arc: 130, thick: 78, outerPad: 8 } as const;

/** Crescent matching the slash trail. Empty when the arc has closed. */
export function rustSlashCrescent(pivot: Point, facing: number, head: number, thick: number = SLASH_TRAIL.thick, arc: number = SLASH_TRAIL.arc, steps = 24): Point[] {
  const outer = RUSTWING_RULES.swipeReach + SLASH_TRAIL.outerPad;
  const tail = Math.max(RUSTWING_RULES.wingWindupAngle, head - arc);
  if (head - tail < 1) return [];
  const at = (deg: number, radius: number): Point => {
    const a = deg * Math.PI / 180;
    return { x: pivot.x + facing * Math.cos(a) * radius, y: pivot.y + Math.sin(a) * radius };
  };
  const outerEdge = Array.from({ length: steps + 1 }, (_, i) => at(tail + (head - tail) * i / steps, outer));
  const innerEdge = Array.from({ length: steps + 1 }, (_, i) => {
    const t = (steps - i) / steps;
    return at(tail + (head - tail) * t, outer - thick * t ** 1.4);
  });
  return [...outerEdge, ...innerEdge];
}

export function rustSlashCrescentHits(rect: Rect, pivot: Point, facing: number, head: number): boolean {
  const crescent = rustSlashCrescent(pivot, facing, head);
  return crescent.length > 0 && polygonIntersectsRect(crescent, rect);
}

/**
 * Thick band over every angle the slash has already reached, from the windup through `head`.
 * `pivot` is the shoulder where the swing started; `shift` is how far it has glided forward since, in step with the arc.
 */
export function rustSlashArc(pivot: Point, facing: number, head: number, shift = 0, steps = 24): Point[] {
  const outer = RUSTWING_RULES.swipeReach + SLASH_TRAIL.outerPad;
  const inner = outer - SLASH_TRAIL.thick;
  const tail = RUSTWING_RULES.wingWindupAngle;
  if (head - tail < 1) return [];
  const at = (e: number, radius: number): Point => {
    const a = (tail + (head - tail) * e) * Math.PI / 180;
    return { x: pivot.x + shift * e + facing * Math.cos(a) * radius, y: pivot.y + Math.sin(a) * radius };
  };
  const outerEdge = Array.from({ length: steps + 1 }, (_, i) => at(i / steps, outer));
  const innerEdge = Array.from({ length: steps + 1 }, (_, i) => at((steps - i) / steps, inner));
  return [...outerEdge, ...innerEdge];
}

export function rustSlashArcHits(rect: Rect, pivot: Point, facing: number, head: number, shift = 0): boolean {
  const arc = rustSlashArc(pivot, facing, head, shift);
  return arc.length > 0 && polygonIntersectsRect(arc, rect);
}

/** Mouth-shot speed. The first form fires them twice as fast as the second. */
export function rustFireballSpeed(form: RustForm): number {
  return RUSTWING_RULES.fireballSpeed * (form === 1 ? 2 : 1);
}

/** Fixed muzzle spray for the `volley`th fire attack; never tracks the player. */
export function fireballVelocities(facing: number, volley = 0, speed: number = RUSTWING_RULES.fireballSpeed): { vx: number; vy: number }[] {
  const patterns = RUSTWING_RULES.fireballPatterns;
  return patterns[((volley % patterns.length) + patterns.length) % patterns.length].map(angle => ({
    vx: facing * Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  }));
}

/** Walk-sheet frames: 0 stand, 1 near foot stepping, 2 far foot stepping. */
export const RUST_STEP = { stand: 0, near: 1, far: 2, lungeFrameMs: 110 } as const;

/** Each lurch is one stomp alternating feet; the lunge runs a near/stand/far/stand cycle. */
export function rustStepFrame(phase: RustPhase, elapsedMs: number, lurchesDone: number): number {
  if (phase === 'lurch') {
    if (elapsedMs >= RUSTWING_RULES.lurchMs * .55) return RUST_STEP.stand;
    return lurchesDone % 2 ? RUST_STEP.far : RUST_STEP.near;
  }
  if (phase === 'lunge' || phase === 'stalk') {
    const cycle = [RUST_STEP.near, RUST_STEP.stand, RUST_STEP.far, RUST_STEP.stand];
    return cycle[Math.floor(Math.max(0, elapsedMs) / RUST_STEP.lungeFrameMs) % cycle.length];
  }
  return RUST_STEP.stand;
}

/** How many shots in a dome volley are magma, from how much of the current health bar is gone. */
export function magmaVolleyCount(hp: number, max: number): number {
  const lost = max <= 0 ? 0 : (max - hp) / max;
  let count = 0;
  for (const step of RUSTWING_RULES.magmaVolley) if (lost >= step.lost) count = step.count;
  return count;
}

/** `count` distinct indexes in `0..total-1`. Each roll is 0..1 and picks among the indexes still left. */
export function magmaVolleySlots(total: number, count: number, rolls: readonly number[]): number[] {
  const bag = Array.from({ length: Math.max(0, total) }, (_, i) => i);
  const picked: number[] = [];
  const n = Math.max(0, Math.min(bag.length, count));
  for (let i = 0; i < n; i++) {
    const at = Math.min(bag.length - 1, Math.floor((rolls[i] ?? 0) * bag.length));
    picked.push(bag.splice(at, 1)[0]);
  }
  return picked;
}

/** Straight-up dome volley; fixed per volley index, never aimed at the player. */
export function eruptionVelocities(volley: number, facing: number): { vx: number; vy: number }[] {
  const volleys = RUSTWING_RULES.eruptVolleys;
  const set = volleys[((volley % volleys.length) + volleys.length) % volleys.length];
  return set.map(vx => ({ vx: facing * vx, vy: -RUSTWING_RULES.eruptLaunchSpeed }));
}

/** Where a dome fireball launched from (x, y) comes down on the floor. */
export function eruptionLandingX(x: number, y: number, vx: number, vy: number): number {
  const g = RUSTWING_RULES.eruptGravity, drop = RUSTWING_RULES.floorTop - 4 - y;
  const t = (-vy + Math.sqrt(vy * vy + 2 * g * drop)) / g;
  return x + vx * t;
}

/** Random dome lob from (x, y); `rise` and `spread` are 0..1 rolls. Always lands with its whole pool inside the room. */
export function magmaGlobLaunch(x: number, y: number, rise: number, spread: number): { vx: number; vy: number; landX: number } {
  const r = RUSTWING_RULES, [lo, hi] = r.magmaGlobLaunch;
  const vy = -(lo + (hi - lo) * rise);
  const landX = Math.max(r.magmaPoolHalfW, Math.min(r.roomWidth - r.magmaPoolHalfW, x + (spread * 2 - 1) * r.magmaGlobReach));
  const g = r.eruptGravity, drop = r.floorTop - 4 - y;
  const t = (-vy + Math.sqrt(vy * vy + 2 * g * drop)) / g;
  return { vx: (landX - x) / t, vy, landX };
}

/** Pool half-width `ageMs` after landing; zero once it has cooled. */
export function magmaPoolHalfWidth(ageMs: number): number {
  const t = Math.min(1, Math.max(0, ageMs) / RUSTWING_RULES.magmaPoolMs);
  return RUSTWING_RULES.magmaPoolHalfW * (1 - t * t);
}

/**
 * Intro state `ms` after it begins. `darkness` is the black overlay's alpha; `awake` means he can be hit and can
 * hurt; `fighting` means the healthbar is up and attacks begin.
 */
export function rustIntroAt(ms: number): { darkness: number; flash: number; awake: boolean; fighting: boolean } {
  const r = RUSTWING_RULES, steps = r.introDarkSteps, wake = steps.length * r.introStepMs, t = Math.max(0, ms);
  if (t < wake) {
    const i = Math.floor(t / r.introStepMs), from = steps[Math.max(0, i - 1)];
    const fade = Math.min(1, (t - i * r.introStepMs) / r.introStepFadeMs);
    return { darkness: from + (steps[i] - from) * fade, flash: 0, awake: false, fighting: false };
  }
  const since = t - wake;
  return {
    darkness: steps[steps.length - 1] * Math.max(0, 1 - since / r.introLightMs),
    flash: Math.max(0, 1 - since / r.introFlashMs),
    awake: true,
    fighting: since >= r.introPauseMs
  };
}

export type RustDeathStage = 'stumble' | 'fall' | 'down' | 'burst';

/**
 * Death pose `ms` in. `shift` is how far he has staggered toward `fallDir` and `tilt` is his lean in screen
 * degrees (positive tips the top toward +x); both scale with `fallDir` (-1 or 1).
 */
export function rustDeathAt(ms: number, fallDir: -1 | 1): { stage: RustDeathStage; shift: number; tilt: number; frame: number } {
  const r = RUSTWING_RULES, t = Math.max(0, ms), stepMs = r.deathStumbleMs / r.deathStaggerSteps;
  const staggered = r.deathStaggerSteps * r.deathStaggerStep * fallDir;
  if (t < r.deathStumbleMs) {
    const step = Math.floor(t / stepMs), within = (t - step * stepMs) / stepMs;
    const lurch = Math.min(1, within / .45);
    const shift = (step + 1 - (1 - lurch) ** 2) * r.deathStaggerStep * fallDir;
    // Sways harder each step: forward-and-back wobble around a growing lean toward the fall.
    const sway = Math.sin(within * Math.PI * 2) * (4 + step * 3), lean = ((step + within) / r.deathStaggerSteps) * 12;
    const frame = within < .5 ? (step % 2 ? RUST_STEP.far : RUST_STEP.near) : RUST_STEP.stand;
    return { stage: 'stumble', shift, tilt: (lean + sway) * fallDir, frame };
  }
  const lean = 12 * fallDir;
  const fallT = (t - r.deathStumbleMs) / r.deathFallMs;
  if (fallT < 1) return { stage: 'fall', shift: staggered, tilt: lean + (r.deathFallAngle * fallDir - lean) * fallT * fallT, frame: RUST_STEP.stand };
  const down = t - r.deathStumbleMs - r.deathFallMs;
  return { stage: down < r.deathDownMs ? 'down' : 'burst', shift: staggered, tilt: r.deathFallAngle * fallDir, frame: RUST_STEP.stand };
}

/** One of Rustwing's hits. `velocity` is added to the knockback; the charge passes his own speed. */
export function rustHit(kind: keyof typeof RUSTWING_RULES.knockback, velocity?: { x: number; y: number }): Attack {
  const rules = RUSTWING_RULES;
  const damage = kind === 'fireball' ? rules.fireballDamage : kind === 'magma' ? rules.magmaDamage : rules.contactDamage;
  return { damage, knockback: rules.knockback[kind], velocity };
}

export function rustDamage(attack: 'dash' | 'stomp' | 'ultimate'): number {
  return attack === 'ultimate' ? 4 : 1;
}

export class RustHealth {
  hp: number = RUSTWING_RULES.hp;
  form: RustForm = 1;
  get max(): number { return this.form === 2 ? RUSTWING_RULES.moltenHp : RUSTWING_RULES.hp; }
  /** First bar emptied: refill for the second form. */
  revive(): void {
    this.form = 2;
    this.hp = RUSTWING_RULES.moltenHp;
    this.contact = false;
  }
  private until = 0;
  private contact = false;
  damage(amount: number): void { this.hp = Math.max(0, this.hp - amount); }
  touch(now: number, overlapping: boolean, attack: boolean): boolean {
    if (!overlapping) { this.contact = false; return false; }
    if (this.contact || !attack || now < this.until || this.hp <= 0) return false;
    this.contact = true;
    this.until = now + RUSTWING_RULES.hitLock;
    this.damage(1);
    return true;
  }
}
