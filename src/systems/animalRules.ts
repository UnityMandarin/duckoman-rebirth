export interface AnimalSurface {
  readonly room: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly enabled: boolean;
}

export interface BoarState { phase: 'pause' | 'charge'; elapsedMs: number; direction: -1 | 1; }
export interface BoarStep { state: BoarState; velocityX: number; tell: boolean; }

export function createBoarState(direction: -1 | 1 = -1): BoarState { return { phase: 'pause', elapsedMs: 0, direction }; }
export function resetBoarPause(state: BoarState): BoarState { return { phase: 'pause', elapsedMs: 0, direction: state.direction }; }

export function stepBoar(state: BoarState, input: { deltaMs: number; x: number; left: number; right: number; blockedLeft?: boolean; blockedRight?: boolean; }): BoarStep {
  const delta = Math.max(0, Math.min(50, input.deltaMs));
  if (input.deltaMs > 200) return { state: resetBoarPause(state), velocityX: 0, tell: false };
  if (state.phase === 'pause') {
    const elapsedMs = state.elapsedMs + delta;
    if (elapsedMs < 1000) return { state: { ...state, elapsedMs }, velocityX: 0, tell: elapsedMs >= 750 };
    return { state: { phase: 'charge', elapsedMs: 0, direction: state.direction }, velocityX: state.direction * 260, tell: false };
  }
  const elapsedMs = state.elapsedMs + delta;
  const reachedBound = state.direction < 0 ? input.x <= input.left : input.x >= input.right;
  const hitWall = state.direction < 0 ? !!input.blockedLeft : !!input.blockedRight;
  if (reachedBound || hitWall || elapsedMs >= 700) {
    return { state: { phase: 'pause', elapsedMs: 0, direction: state.direction === -1 ? 1 : -1 }, velocityX: 0, tell: false };
  }
  return { state: { ...state, elapsedMs }, velocityX: state.direction * 260, tell: false };
}

export function isHareNear(player: { active: boolean; x: number; feet: number }, hare: { x: number; feet: number }): boolean {
  return player.active && Math.abs(player.x - hare.x) <= 320 && Math.abs(player.feet - hare.feet) <= 220;
}

export function canHareJump(near: boolean, grounded: boolean, nowMs: number, nextHopAtMs: number): boolean {
  return near && grounded && nowMs >= nextHopAtMs;
}

export function safeHareBounds(surface: AnimalSurface, roomLeft: number, roomRight: number, halfBodyWidth: number): { left: number; right: number } | undefined {
  if (!surface.enabled) return undefined;
  const inset = halfBodyWidth + 12;
  const left = Math.max(roomLeft, surface.left + inset);
  const right = Math.min(roomRight, surface.right - inset);
  return right >= left ? { left, right } : undefined;
}

export function harePassiveBounds(patrol: { left: number; right: number } | undefined, support: { left: number; right: number }): { left: number; right: number } {
  if (!patrol) return support;
  const left = Math.max(patrol.left, support.left), right = Math.min(patrol.right, support.right);
  return right >= left ? { left, right } : support;
}

export function findHareSupport(surfaces: readonly AnimalSurface[], room: number, x: number, feet: number, halfBodyWidth: number): AnimalSurface | undefined {
  return surfaces.find(surface => surface.enabled && surface.room === room && x + halfBodyWidth > surface.left && x - halfBodyWidth < surface.right && Math.abs(surface.top - feet) <= 10);
}

export interface HareClimbTarget { x: number; surface: AnimalSurface; rise: number; }
export function selectHareClimbTarget(input: { surfaces: readonly AnimalSurface[]; room: number; x: number; feet: number; playerX: number; halfBodyWidth: number; roomLeft: number; roomRight: number; }): HareClimbTarget | undefined {
  const side = Math.sign(input.playerX - input.x);
  if (!side) return undefined;
  const candidates: HareClimbTarget[] = [];
  for (const surface of input.surfaces) {
    if (!surface.enabled || surface.room !== input.room) continue;
    const rise = input.feet - surface.top;
    if (rise < 12 || rise > 105) continue;
    const overlapsCurrentBody = input.x + input.halfBodyWidth > surface.left && input.x - input.halfBodyWidth < surface.right;
    if (overlapsCurrentBody) continue;
    const bounds = safeHareBounds(surface, input.roomLeft, input.roomRight, input.halfBodyWidth);
    if (!bounds) continue;
    const targetX = Math.max(bounds.left, Math.min(bounds.right, input.x));
    const dx = targetX - input.x;
    if (Math.sign(dx) !== side || Math.abs(dx) > 190) continue;
    candidates.push({ x: targetX, surface, rise });
  }
  candidates.sort((a, b) => Math.abs(input.playerX - a.x) - Math.abs(input.playerX - b.x));
  return candidates[0];
}

export function hareLandingTimeSeconds(rise: number): number {
  const discriminant = Math.max(0, 600 * 600 - 2 * 1471.5 * rise);
  return (600 + Math.sqrt(discriminant)) / 1471.5;
}
