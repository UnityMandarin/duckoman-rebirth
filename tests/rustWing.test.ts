import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import {
  RUSTWING_RULES, RUSTWING_CYCLE, RustHealth, advanceRustPhase, fireballVelocities, lungeTarget,
  lurchTarget, nextRustAttack, RUST_STEP, RUSTWING_MOLTEN_CYCLE, eruptionLandingX, eruptionVelocities, rustDamage, rustPhaseDuration, rustStepFrame, rustwingFacing,
  leapAt, magmaGlobLaunch, magmaPoolHalfWidth, pickRustAttack, rustDeathAt, rustIntroAt, rustSlashAngle, rustWingPivot, rustWingPose, rustWingRaise, rustWingSweepHits, rustSwipeOutline, foldedWing, slashWing, wingHitPolygons, wingTouches, stalkStep, swipeTarget
} from '../src/systems/rustWingMath';

describe('RustWing prototype', () => {
  it('is a weaker IronWing that still dies to separated hits and ultimates', () => {
    expect(RUSTWING_RULES.hp).toBe(10);
    expect(RUSTWING_RULES.moltenHp).toBe(12);
    expect(rustDamage('dash')).toBe(1);
    expect(rustDamage('stomp')).toBe(1);
    expect(rustDamage('ultimate')).toBe(4);
    const h = new RustHealth();
    expect(h.touch(0, true, false)).toBe(false);
    for (let i = 0; i < RUSTWING_RULES.hp; i++) {
      expect(h.touch(i * 1000, true, true)).toBe(true);
      expect(h.touch(i * 1000 + 900, true, true)).toBe(false);
      h.touch(i * 1000 + 950, false, false);
    }
    expect(h.hp).toBe(0);
  });

  it('lurches twice toward a facing then lunges to the far wall', () => {
    expect(RUSTWING_RULES.lurchCount).toBe(2);
    let phase: ReturnType<typeof advanceRustPhase>['phase'] = 'rest';
    let lurches = 0;
    const steps: string[] = [];
    ({ phase, lurchesDone: lurches } = advanceRustPhase(phase, lurches, 'lurch'));
    while (phase !== 'rest') {
      steps.push(phase);
      ({ phase, lurchesDone: lurches } = advanceRustPhase(phase, lurches, 'lurch'));
    }
    expect(steps).toEqual(['lurchWindup', 'lurch', 'lurchWindup', 'lurch', 'lungeWindup', 'lunge']);
    expect(lurchTarget(400, -1)).toBe(400 - RUSTWING_RULES.lurchDistance);
    expect(lungeTarget(-1)).toBe(RUSTWING_RULES.left);
    expect(lungeTarget(1)).toBe(RUSTWING_RULES.right);
    const { left, right, bodyHalfW } = RUSTWING_RULES;
    expect(left - bodyHalfW).toBeLessThan(TUNING.player.bodyWidth);
    expect(TUNING.simulation.width - (right + bodyHalfW)).toBeLessThan(TUNING.player.bodyWidth);
  });

  it('can leap across the lunge distance instead of dashing it, high enough to run under', () => {
    expect(RUSTWING_RULES.leapChance).toBe(0.5);
    expect(advanceRustPhase('lurch', RUSTWING_RULES.lurchCount - 1, 'lurch', true).phase).toBe('leapWindup');
    expect(advanceRustPhase('lurch', RUSTWING_RULES.lurchCount - 1, 'lurch', false).phase).toBe('lungeWindup');
    expect(advanceRustPhase('lurch', 0, 'lurch', true).phase).toBe('lurchWindup');
    expect(advanceRustPhase('leapWindup', 0, 'lurch').phase).toBe('leap');
    expect(advanceRustPhase('leap', 0, 'lurch').phase).toBe('rest');
    expect(rustPhaseDuration('leapWindup')).toBeGreaterThanOrEqual(600);
    expect(leapAt(500, 100, 0)).toEqual({ x: 500, height: 0 });
    expect(leapAt(500, 100, 1)).toEqual({ x: 100, height: 0 });
    expect(leapAt(500, 100, .5)).toEqual({ x: 300, height: RUSTWING_RULES.leapHeight });
    expect(RUSTWING_RULES.leapHeight).toBeGreaterThan(TUNING.player.bodyHeight * 3);
  });

  it('walks to the duck, telegraphs, then slashes', () => {
    expect(advanceRustPhase('rest', 0, 'swipe').phase).toBe('stalk');
    expect(advanceRustPhase('stalk', 0, 'swipe').phase).toBe('swipeWindup');
    expect(advanceRustPhase('swipeWindup', 0, 'swipe').phase).toBe('swipe');
    expect(advanceRustPhase('swipe', 0, 'swipe').phase).toBe('rest');
    expect(rustPhaseDuration('swipeWindup')).toBeGreaterThan(rustPhaseDuration('swipe'));
    expect(rustPhaseDuration('swipeWindup')).toBeGreaterThanOrEqual(600);
    const walk = stalkStep(400, 100, 100);
    expect(walk.x).toBeLessThan(400);
    expect(walk.arrived).toBe(false);
    expect(stalkStep(400, 400 - RUSTWING_RULES.slashRange + 1, 16)).toEqual({ x: 400, arrived: true });
    expect(stalkStep(400, 100, 60_000).x).toBe(100 + RUSTWING_RULES.slashRange);
    expect(swipeTarget(300, -1)).toBe(300 - RUSTWING_RULES.swipeStep);
  });

  it('slashes a nearby duck instead of the cycle attack, but not twice in a row', () => {
    expect(pickRustAttack(0, 1, 100, 'lurch')).toEqual({ attack: 'swipe', advancesCycle: false });
    expect(pickRustAttack(0, 1, -100, 'swipe')).toEqual({ attack: 'lurch', advancesCycle: true });
    expect(pickRustAttack(1, 1, RUSTWING_RULES.slashTrigger + 1, 'lurch')).toEqual({ attack: 'fire', advancesCycle: true });
  });

  it('sweeps the wing in an arc from overhead to low in front, and the arc is the hitbox', () => {
    const r = RUSTWING_RULES;
    expect(rustWingPose('swipeWindup', r.swipeWindupMs)).toEqual({ angle: r.wingWindupAngle, length: r.swipeReach });
    expect(rustSlashAngle(0)).toBe(r.wingWindupAngle);
    expect(rustSlashAngle(r.swipeMs)).toBe(r.wingSlashAngle);
    expect(rustWingPose('rest', 0)).toBeNull();
    expect(rustWingPose('rest', 0, r.wingRecoverMs)).toBeNull();
    expect(rustWingPose('rest', 0, 0)?.angle).toBe(r.wingSlashAngle);
    const pivot = rustWingPivot(300, 304, 1);
    const ahead = { left: 420, right: 440, top: 300, bottom: 340 }, behind = { left: 160, right: 180, top: 300, bottom: 340 };
    expect(rustWingSweepHits(ahead, pivot, 1, r.wingWindupAngle, r.wingSlashAngle)).toBe(true);
    expect(rustWingSweepHits(behind, pivot, 1, r.wingWindupAngle, r.wingSlashAngle)).toBe(false);
    expect(rustWingSweepHits(ahead, pivot, 1, r.wingWindupAngle, -100)).toBe(false);
    const leftmost = Math.min(...wingHitPolygons(slashWing(pivot, -1, 0, r.swipeReach)).flat().map(p => p.x));
    expect(leftmost).toBeCloseTo(pivot.x - r.swipeReach, 0);
    expect(wingHitPolygons(slashWing(pivot, 1, r.wingSlashAngle, r.swipeReach)).flat().every(p => p.y < r.floorTop)).toBe(true);
  });

  it('previews the slash area including the forward step', () => {
    const r = RUSTWING_RULES, pivot = rustWingPivot(300, 304, 1), shift = swipeTarget(300, 1) - 300;
    const outline = rustSwipeOutline(pivot, 1, shift, r.swipeReach);
    expect(outline[0]).toEqual(pivot);
    expect(outline.at(-1)).toEqual({ x: pivot.x + shift, y: pivot.y });
    const end = outline.at(-2)!, a = r.wingSlashAngle * Math.PI / 180;
    expect(end.x).toBeCloseTo(pivot.x + shift + Math.cos(a) * r.swipeReach);
    const reachX = Math.max(...outline.map(p => p.x));
    expect(reachX).toBeGreaterThan(pivot.x + r.swipeReach + shift * .5);
    rustSwipeOutline(pivot, -1, -shift, r.swipeReach).forEach((p, i) => expect(p.x - pivot.x).toBeCloseTo(pivot.x - outline[i].x));
  });

  it('squats with wings raised before the leap, then flaps down at takeoff', () => {
    const r = RUSTWING_RULES;
    expect(rustWingRaise('lurch', 100)).toBe(0);
    expect(rustWingRaise('leapWindup', 0)).toBe(0);
    expect(rustWingRaise('leapWindup', r.leapWindupMs)).toBe(1);
    expect(rustWingRaise('leap', 0)).toBe(1);
    expect(rustWingRaise('leap', r.leapFlapMs)).toBeLessThan(0);
    expect(rustWingRaise('leap', r.leapFlapMs * 3)).toBe(0);
    const mount = { x: 300, y: 250 };
    const top = (raise: number) => Math.min(...foldedWing(mount, 1, false, 0, raise).vanes.flatMap(v => v.points.map(p => p.y)));
    expect(top(1)).toBeLessThan(top(0) - 20);
  });

  it('hurts with the polygon shape of each wing, not a box around it', () => {
    const wing = wingHitPolygons(foldedWing({ x: 300, y: 250 }, 1, false, 0));
    const tipVane = foldedWing({ x: 300, y: 250 }, 1, false, 0).vanes[2].points[1];
    expect(wingTouches(wing, { left: tipVane.x - 4, right: tipVane.x + 4, top: tipVane.y - 4, bottom: tipVane.y + 4 })).toBe(true);
    // Just under the top vane's tip, past the end of the next vane, is empty space inside the wing's bounding box.
    expect(wingTouches(wing, { left: 387, right: 389, top: 212, bottom: 216 })).toBe(false);
    expect(wingTouches(wing, { left: 0, right: 40, top: 0, bottom: 40 })).toBe(false);
  });

  it('spits smaller unaimed fireballs that ignore the player', () => {
    expect(RUSTWING_RULES.fireballRadius).toBeLessThan(55);
    expect(RUSTWING_RULES.fireballCount).toBe(3);
    const left = fireballVelocities(-1);
    const right = fireballVelocities(1);
    expect(left).toHaveLength(3);
    expect(left.map(v => v.vx)).not.toEqual(right.map(v => v.vx));
    expect(left.every((v, i) => v.vy === right[i].vy)).toBe(true);
    expect(left.every(v => v.vx < 0)).toBe(true);
    expect(fireballVelocities(-1)).toEqual(fireballVelocities(-1));
  });

  it('alternates a lowered spread whose top two shots split the first spread', () => {
    const [high, low] = RUSTWING_RULES.fireballPatterns;
    expect(low[0]).toBeGreaterThan(high[0]);
    expect(low[0]).toBeLessThan(high[1]);
    expect(low[1]).toBeGreaterThan(high[1]);
    expect(low[1]).toBeLessThan(high[2]);
    expect(low[2]).toBeGreaterThan(high[2]);
    expect(fireballVelocities(1, 1)).not.toEqual(fireballVelocities(1, 0));
    expect(fireballVelocities(1, 2)).toEqual(fireballVelocities(1, 0));
    expect(RUSTWING_RULES.fireballSpeed * RUSTWING_RULES.fireballLifeMs / 1000).toBeGreaterThan(TUNING.simulation.width);
  });

  it('cycles lurch, fire, then melee swipe', () => {
    expect(RUSTWING_CYCLE).toEqual(['lurch', 'fire', 'swipe']);
    expect([0, 1, 2, 3].map(c => nextRustAttack(c))).toEqual(['lurch', 'fire', 'swipe', 'lurch']);
    expect(rustwingFacing(500, 200)).toBe(-1);
  });

  it('steps alternating feet while lurching and lunging, and stands otherwise', () => {
    expect(rustStepFrame('lurch', 0, 0)).toBe(RUST_STEP.near);
    expect(rustStepFrame('lurch', 0, 1)).toBe(RUST_STEP.far);
    expect(rustStepFrame('lurch', RUSTWING_RULES.lurchMs * .9, 0)).toBe(RUST_STEP.stand);
    const ms = RUST_STEP.lungeFrameMs;
    expect([0, 1, 2, 3, 4].map(i => rustStepFrame('lunge', i * ms + 1, 0)))
      .toEqual([RUST_STEP.near, RUST_STEP.stand, RUST_STEP.far, RUST_STEP.stand, RUST_STEP.near]);
    expect(rustStepFrame('stalk', 1, 0)).toBe(RUST_STEP.near);
    for (const phase of ['rest', 'lurchWindup', 'swipe', 'fireWindup'] as const) expect(rustStepFrame(phase, 50, 0)).toBe(RUST_STEP.stand);
  });

  it('refills a second molten bar when the first empties', () => {
    const h = new RustHealth();
    h.damage(RUSTWING_RULES.hp);
    expect(h.hp).toBe(0);
    h.revive();
    expect(h.form).toBe(2);
    expect(h.hp).toBe(RUSTWING_RULES.moltenHp);
    expect(h.max).toBe(RUSTWING_RULES.moltenHp);
    expect(h.touch(5000, true, true)).toBe(true);
    expect(RUSTWING_RULES.transformMs).toBeGreaterThanOrEqual(2000);
  });

  it('erupts from the dome between every other molten attack', () => {
    expect(RUSTWING_MOLTEN_CYCLE.map((_, i) => nextRustAttack(i, 2))).toEqual(['erupt', 'lurch', 'erupt', 'swipe', 'fire']);
    expect(nextRustAttack(0)).toBe('lurch');
    expect(advanceRustPhase('rest', 0, 'erupt').phase).toBe('eruptWindup');
    expect(advanceRustPhase('eruptWindup', 0, 'erupt').phase).toBe('erupt');
    expect(advanceRustPhase('erupt', 0, 'erupt').phase).toBe('rest');
    expect(rustPhaseDuration('eruptWindup')).toBeGreaterThanOrEqual(600);
  });

  it('launches dome fireballs straight up in fixed alternating volleys that land where marked', () => {
    const a = eruptionVelocities(0, -1), b = eruptionVelocities(1, -1);
    expect(a.every(v => v.vy < 0)).toBe(true);
    expect(a.map(v => v.vx)).not.toEqual(b.map(v => v.vx));
    expect(eruptionVelocities(2, -1)).toEqual(a);
    expect(eruptionVelocities(0, 1).map(v => v.vx)).toEqual(a.map(v => -v.vx));
    const y0 = RUSTWING_RULES.floorTop - RUSTWING_RULES.eruptLaunchHeight, g = RUSTWING_RULES.eruptGravity;
    for (const { vx, vy } of a) {
      let x = 320, y = y0, v = vy;
      const dt = 1 / 600;
      while (y <= RUSTWING_RULES.floorTop - 4) { v += g * dt; x += vx * dt; y += v * dt; }
      expect(Math.abs(x - eruptionLandingX(320, y0, vx, vy))).toBeLessThan(2);
    }
  });

  it('lobs magma globs on random arcs that land where telegraphed, inside the room', () => {
    const r = RUSTWING_RULES, y0 = r.floorTop - r.eruptLaunchHeight;
    for (const [x, rise, spread] of [[320, 0, 0], [320, 1, 1], [r.left, .5, 0], [r.right, .3, 1], [200, .7, .2]]) {
      const glob = magmaGlobLaunch(x, y0, rise, spread);
      expect(glob.vy).toBeLessThan(0);
      expect(glob.landX - r.magmaPoolHalfW).toBeGreaterThanOrEqual(0);
      expect(glob.landX + r.magmaPoolHalfW).toBeLessThanOrEqual(r.roomWidth);
      expect(Math.abs(eruptionLandingX(x, y0, glob.vx, glob.vy) - glob.landX)).toBeLessThan(.01);
    }
    expect(magmaGlobLaunch(320, y0, 0, 0).landX).toBeLessThan(320);
    expect(magmaGlobLaunch(320, y0, 0, 1).landX).toBeGreaterThan(320);
  });

  it('intro brightens in steps to half light, flashes awake, then pauses before the fight', () => {
    const r = RUSTWING_RULES, wake = r.introDarkSteps.length * r.introStepMs;
    expect(rustIntroAt(0)).toEqual({ darkness: .9, flash: 0, awake: false, fighting: false });
    const held = [0, 1, 2, 3, 4].map(i => rustIntroAt(i * r.introStepMs + r.introStepFadeMs).darkness);
    expect(held.map(d => +d.toFixed(2))).toEqual([.9, .8, .7, .6, .5]);
    expect(rustIntroAt(wake - 1).awake).toBe(false);
    const flash = rustIntroAt(wake);
    expect(flash.awake && !flash.fighting && flash.flash === 1).toBe(true);
    expect(rustIntroAt(wake + r.introLightMs).darkness).toBe(0);
    expect(rustIntroAt(wake + r.introPauseMs - 1).fighting).toBe(false);
    expect(rustIntroAt(wake + r.introPauseMs)).toEqual({ darkness: 0, flash: 0, awake: true, fighting: true });
  });

  it('dies by staggering toward his fall, toppling onto his side, lying there, then bursting', () => {
    const r = RUSTWING_RULES, fall = r.deathStumbleMs, down = fall + r.deathFallMs, burst = down + r.deathDownMs;
    for (const dir of [-1, 1] as const) {
      expect(rustDeathAt(0, dir).stage).toBe('stumble');
      expect(Math.abs(rustDeathAt(0, dir).shift)).toBe(0);
      let last = 0;
      for (let t = 0; t < fall; t += 50) {
        const pose = rustDeathAt(t, dir);
        expect(pose.shift * dir).toBeGreaterThanOrEqual(last - 1e-9);
        last = pose.shift * dir;
      }
      const before = rustDeathAt(fall - 1, dir), after = rustDeathAt(fall, dir);
      expect(Math.abs(before.tilt - after.tilt)).toBeLessThan(1);
      expect(Math.abs(before.shift - after.shift)).toBeLessThan(1);
      expect(rustDeathAt(fall + r.deathFallMs / 2, dir).stage).toBe('fall');
      expect(rustDeathAt(down, dir)).toMatchObject({ stage: 'down', tilt: r.deathFallAngle * dir, shift: r.deathStaggerSteps * r.deathStaggerStep * dir });
      expect(rustDeathAt(burst, dir).stage).toBe('burst');
    }
  });

  it('magma pools shrink away over three seconds', () => {
    expect(RUSTWING_RULES.magmaPoolMs).toBe(3000);
    expect(magmaPoolHalfWidth(0)).toBe(RUSTWING_RULES.magmaPoolHalfW);
    expect(magmaPoolHalfWidth(1500)).toBeLessThan(RUSTWING_RULES.magmaPoolHalfW);
    expect(magmaPoolHalfWidth(2500)).toBeLessThan(magmaPoolHalfWidth(1500));
    expect(magmaPoolHalfWidth(3000)).toBe(0);
  });
});
