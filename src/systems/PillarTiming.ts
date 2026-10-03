export function pillarPhase(elapsed: number, warningMs: number, fallMs: number): 'warning' | 'falling' | 'landed' {
  return elapsed < warningMs ? 'warning' : elapsed < warningMs + fallMs ? 'falling' : 'landed';
}

/** Column starts at or above the visible view so it always reaches the top of the screen. */
export function pillarSkyTop(viewTop: number, pillarHeight: number): number {
  return Math.min(-pillarHeight - 10, viewTop);
}
