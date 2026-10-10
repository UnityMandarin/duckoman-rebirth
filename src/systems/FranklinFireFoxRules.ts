/** Deterministic timing and shared encounter geometry for Franklin's rescue fight. */
export const FRANKLIN_RULES = {
  hp: 32,
  hitCooldownMs: 400,
  hitReward: 10,
  introMs: 10800,
  overdriveMs: 1200,
  resistanceAfterCycles: 2,
  resistanceMs: 1200,
  pounceTellMs: 800,
  overdrivePounceTellMs: 650,
  pounceMs: 650,
  pounceSpeed: 520,
  overdriveSpeed: 580,
  wallBounceSpeed: 850,
  fireballWarningMs: 700,
  fireballSpacingMs: 300,
  fireballSpeed: 220,
  tailTellMs: 900,
  overdriveTailTellMs: 750,
  waveSpeed: 340,
  waveHeight: 28,
  waveWidth: 60,
  pillarWarningMs: 1000,
  overdrivePillarWarningMs: 850,
  pillarWidth: 44,
  pillarHeight: 140,
  pillarActiveMs: 600,
  collapseMs: 2200,
  crashCueMs: 1000,
  crashSpeed: 600,
  crashPauseMs: 1200,
  finalChip: { width: 22, height: 18 },
} as const;

/** Visible asset and gameplay dimensions, independent of camera zoom. */
export const FRANKLIN_VISUAL = {
  sourceWidth: 1095,
  sourceHeight: 838,
  referenceWidth: 66,
  referenceHeight: 66 * 838 / 1095,
  sourceDisplayWidth: 144,
  sourceDisplayHeight: 110,
  scale: 66 / 144,
  bodyWidth: 46,
  bodyHeight: 40,
  chipOffsetX: -9.6 * (66 / 144),
  chipOffsetY: -77 * (66 / 144),
  chipPlateWidth: 12,
  chipPlateHeight: 14,
} as const;

export type FranklinPhase =
  | 'intro' | 'overdrive' | 'pounce-cue' | 'pounce' | 'wallbounce-cue' | 'wallbounce'
  | 'barrage-cue' | 'barrage' | 'tail-cue' | 'tail' | 'pillars-cue'
  | 'pillars' | 'resistance' | 'collapse' | 'final-cue' | 'final-charge'
  | 'crash' | 'safe-chip' | 'rescued';
export type FranklinAttack = 'pounce' | 'barrage' | 'tail' | 'pillars';

export interface FranklinController {
  hp: number;
  phase: FranklinPhase;
  elapsed: number;
  phase2: boolean;
  cycles: number;
  attackIndex: number;
  direction: number;
  aimX: number;
  aimY: number;
  hazards: number[];
  projectileIndex: number;
  crashes: number;
  damagedDuringCharge: boolean;
  cleanCrashes: number;
  wallBounceFollowup: boolean;
  lastAttack: FranklinAttack;
  rescued: boolean;
}

export const FRANKLIN_CYCLE: readonly FranklinAttack[] = ['pounce', 'barrage', 'tail', 'pillars'];
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function createFranklinController(): FranklinController {
  return {
    hp: FRANKLIN_RULES.hp, phase: 'intro', elapsed: 0, phase2: false,
    cycles: 0, attackIndex: 0, direction: 1, aimX: 1000, aimY: 360,
    hazards: [], projectileIndex: 0, crashes: 0, damagedDuringCharge: false,
    cleanCrashes: 0, wallBounceFollowup: false, lastAttack: 'pounce', rescued: false,
  };
}

const finalePhases: readonly FranklinPhase[] = ['collapse', 'final-cue', 'final-charge', 'crash', 'safe-chip', 'rescued'];
export function damageFranklin(controller: FranklinController, amount: number): FranklinController {
  if (controller.phase === 'intro' || finalePhases.includes(controller.phase)) return { ...controller };
  const hp = Math.max(6, controller.hp - Math.max(0, Math.floor(amount)));
  const phase2 = controller.phase2 || hp <= 16;
  return {
    ...controller,
    hp,
    phase2,
    ...(hp <= 6 ? { phase: 'collapse' as const, elapsed: 0, hazards: [] }
      : !controller.phase2 && phase2 ? { phase: 'overdrive' as const, elapsed: 0, hazards: [] } : {}),
  };
}

export function franklinDamageAmount(attack: 'dash' | 'stomp' | 'throw' | 'ultimate'): number {
  return attack === 'ultimate' ? 2 : 1;
}

export function franklinCanAct(input: { hidden?: boolean; dead?: boolean; paused?: boolean }): boolean {
  return !input.hidden && !input.dead && !input.paused;
}

export function resumeFranklinWarning(controller: FranklinController): FranklinController {
  if (['rescued', 'safe-chip', 'collapse', 'crash'].includes(controller.phase)) return { ...controller };
  const restarted: Partial<Record<FranklinPhase, FranklinPhase>> = {
    pounce: 'pounce-cue', wallbounce: 'wallbounce-cue', barrage: 'barrage-cue',
    tail: 'tail-cue', pillars: 'pillars-cue', 'final-charge': 'final-cue',
  };
  return {
    ...controller,
    phase: restarted[controller.phase] ?? controller.phase,
    elapsed: 0,
    hazards: [],
    projectileIndex: 0,
  };
}

/** Chip anchor scales with the fox's visible size: left of its center and above its feet. */
export function franklinChipBounds(x: number, flipped = false, feetY = 360) {
  const centerX = x + (flipped ? -FRANKLIN_VISUAL.chipOffsetX : FRANKLIN_VISUAL.chipOffsetX);
  const centerY = feetY + FRANKLIN_VISUAL.chipOffsetY;
  return {
    left: centerX - FRANKLIN_RULES.finalChip.width / 2,
    right: centerX + FRANKLIN_RULES.finalChip.width / 2,
    top: centerY - FRANKLIN_RULES.finalChip.height / 2,
    bottom: centerY + FRANKLIN_RULES.finalChip.height / 2,
  };
}

/** Visible chip charge; failed crashes do not reduce it, the final stomp sets it to zero. */
export function franklinChipHealth(controller: FranklinController): number {
  if (controller.phase === 'rescued' || controller.rescued) return 0;
  if (controller.phase === 'collapse' || controller.phase === 'final-cue'
    || controller.phase === 'final-charge' || controller.phase === 'crash'
    || controller.phase === 'safe-chip') {
    return controller.cleanCrashes >= 3 ? 1 : Math.max(1, 6 - controller.cleanCrashes * 2);
  }
  return controller.hp;
}

export function franklinTailWaveBounds(controller: FranklinController) {
  const centerX = clamp(
    controller.aimX + controller.direction * controller.elapsed * FRANKLIN_RULES.waveSpeed / 1000,
    100,
    1900,
  );
  return {
    left: centerX - FRANKLIN_RULES.waveWidth / 2,
    right: centerX + FRANKLIN_RULES.waveWidth / 2,
    top: 360 - FRANKLIN_RULES.waveHeight,
    bottom: 360,
  };
}

function pillarMarkers(center: number, phase2: boolean): number[] {
  const offsets = phase2 ? [-360, -120, 120, 360] : [-300, 0, 300];
  return offsets.map(offset => center + offset);
}

export function tickFranklin(
  controller: FranklinController,
  deltaMs: number,
  input: { playerX: number; playerY: number; bossX: number; hidden?: boolean; dead?: boolean; paused?: boolean },
): FranklinController {
  if (!franklinCanAct(input) || controller.phase === 'rescued' || controller.phase === 'safe-chip') return { ...controller };
  const delta = Math.min(50, Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0));
  if (!delta) return { ...controller };
  const next: FranklinController = { ...controller, elapsed: controller.elapsed + delta, hazards: [...controller.hazards] };
  const enter = (phase: FranklinPhase): void => {
    next.phase = phase;
    next.elapsed = 0;
    if (phase === 'pillars-cue') {
      next.aimX = clamp(input.playerX, 600, 1300);
      next.hazards = pillarMarkers(next.aimX, next.phase2);
    }
  };

  switch (next.phase) {
    case 'intro':
      if (next.elapsed >= FRANKLIN_RULES.introMs) enter('pounce-cue');
      break;
    case 'overdrive':
      if (next.elapsed >= FRANKLIN_RULES.overdriveMs) enter('pounce-cue');
      break;
    case 'pounce-cue':
      if (next.elapsed >= (next.phase2 ? FRANKLIN_RULES.overdrivePounceTellMs : FRANKLIN_RULES.pounceTellMs)) enter('pounce');
      break;
    case 'pounce':
      if (next.elapsed >= FRANKLIN_RULES.pounceMs) {
        next.attackIndex += 1;
        if (next.phase2 && next.wallBounceFollowup) {
          next.wallBounceFollowup = false;
          enter('barrage-cue');
        } else if (next.phase2) {
          next.wallBounceFollowup = true;
          enter('wallbounce-cue');
        } else {
          enter('barrage-cue');
        }
      }
      break;
    case 'wallbounce-cue':
      if (next.elapsed >= 650) enter('wallbounce');
      break;
    case 'wallbounce':
      if ((next.direction < 0 && input.bossX <= 155)
        || (next.direction > 0 && input.bossX >= 1845)
        || next.elapsed >= 2200) {
        next.direction *= -1;
        enter('pounce-cue');
      }
      break;
    case 'barrage-cue':
      if (next.elapsed >= FRANKLIN_RULES.fireballWarningMs) enter('barrage');
      break;
    case 'barrage': {
      next.projectileIndex = Math.floor(next.elapsed / FRANKLIN_RULES.fireballSpacingMs);
      const count = next.phase2 ? 4 : 3;
      if (next.projectileIndex >= count) {
        next.attackIndex += 1;
        enter(next.phase2 ? 'pillars-cue' : 'tail-cue');
      }
      break;
    }
    case 'tail-cue':
      if (next.elapsed >= (next.phase2 ? FRANKLIN_RULES.overdriveTailTellMs : FRANKLIN_RULES.tailTellMs)) enter('tail');
      break;
    case 'tail': {
      const distanceToWall = next.direction > 0 ? 1900 - next.aimX : next.aimX - 100;
      if (next.elapsed >= distanceToWall / FRANKLIN_RULES.waveSpeed * 1000) {
        next.attackIndex += 1;
        if (next.phase2) {
          next.cycles += 1;
          if (next.cycles >= FRANKLIN_RULES.resistanceAfterCycles) {
            next.cycles = 0;
            enter('resistance');
          } else enter('pounce-cue');
        } else enter('pillars-cue');
      }
      break;
    }
    case 'pillars-cue':
      if (next.elapsed === delta && next.hazards.length === 0) {
        next.aimX = clamp(input.playerX, 600, 1300);
        next.hazards = pillarMarkers(next.aimX, next.phase2);
      }
      if (next.elapsed >= (next.phase2 ? FRANKLIN_RULES.overdrivePillarWarningMs : FRANKLIN_RULES.pillarWarningMs)) enter('pillars');
      break;
    case 'pillars':
      if (next.elapsed >= FRANKLIN_RULES.pillarActiveMs) {
        next.hazards = [];
        if (next.phase2) enter('tail-cue');
        else {
          next.cycles += 1;
          if (next.cycles >= FRANKLIN_RULES.resistanceAfterCycles) {
            next.cycles = 0;
            enter('resistance');
          } else enter('pounce-cue');
        }
      }
      break;
    case 'resistance':
      if (next.elapsed >= FRANKLIN_RULES.resistanceMs) enter('pounce-cue');
      break;
    case 'collapse':
      if (next.elapsed >= FRANKLIN_RULES.collapseMs) {
        next.crashes = 0;
        next.cleanCrashes = 0;
        enter('final-cue');
      }
      break;
    case 'final-cue':
      if (next.elapsed >= FRANKLIN_RULES.crashCueMs) {
        next.damagedDuringCharge = false;
        enter('final-charge');
      }
      break;
    case 'final-charge':
      break;
    case 'crash':
      if (next.elapsed >= FRANKLIN_RULES.crashPauseMs) {
        if (next.cleanCrashes >= 3) enter('safe-chip');
        else enter('final-cue');
      }
      break;
    case 'safe-chip':
    case 'rescued':
      break;
  }
  return next;
}

export function franklinCrash(controller: FranklinController, clean: boolean): FranklinController {
  if (controller.phase !== 'final-charge') return { ...controller };
  const cleanCrashes = controller.cleanCrashes + (clean ? 1 : 0);
  return {
    ...controller,
    phase: 'crash',
    elapsed: 0,
    crashes: controller.crashes + 1,
    cleanCrashes,
    damagedDuringCharge: !clean,
    hazards: [],
  };
}

export function franklinAcceptedChargeDamage(controller: FranklinController): FranklinController {
  return controller.phase === 'final-charge' ? { ...controller, damagedDuringCharge: true } : { ...controller };
}

export function franklinPillarSafeGaps(markers: readonly number[], arenaLeft = 100, arenaRight = 1900) {
  const gaps: Array<{ left: number; right: number }> = [];
  let cursor = arenaLeft;
  for (const marker of [...markers].sort((a, b) => a - b)) {
    const edge = marker - FRANKLIN_RULES.pillarWidth / 2;
    if (edge - cursor >= 100) gaps.push({ left: cursor, right: edge });
    cursor = marker + FRANKLIN_RULES.pillarWidth / 2;
  }
  if (arenaRight - cursor >= 100) gaps.push({ left: cursor, right: arenaRight });
  return gaps;
}
