export function pillarPhase(elapsed: number, warningMs: number, fallMs: number): 'warning' | 'falling' | 'landed' {
  return elapsed < warningMs ? 'warning' : elapsed < warningMs + fallMs ? 'falling' : 'landed';
}
