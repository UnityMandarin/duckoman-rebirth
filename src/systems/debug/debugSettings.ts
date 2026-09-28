/** Persistent debug switches. Game code reads these through `debugToggle`, which is always false outside debug mode. */
export const DEBUG_TOGGLES = {
  hitboxes: { label: 'Hitboxes' },
  infiniteUltimate: { label: 'Infinite ultimate' },
  infiniteJumps: { label: 'Infinite jumps' },
  infiniteDashes: { label: 'Infinite dashes' }
} as const;
export type DebugToggle = keyof typeof DEBUG_TOGGLES;

const MODE_KEY = 'duckoman-debug';
const toggleKey = (toggle: DebugToggle): string => `${MODE_KEY}-${toggle}`;
export const load = (key: string): boolean => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
export const save = (key: string, on: boolean): void => { try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* storage blocked */ } };

let mode = load(MODE_KEY);
const values = Object.fromEntries(
  (Object.keys(DEBUG_TOGGLES) as DebugToggle[]).map(toggle => [toggle, load(toggleKey(toggle))])
) as Record<DebugToggle, boolean>;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach(listener => listener());

export function debugModeOn(): boolean { return mode; }
export function setDebugMode(on: boolean): void { mode = on; save(MODE_KEY, on); notify(); }

/** Whether a switch is active right now (requires debug mode). */
export function debugToggle(toggle: DebugToggle): boolean { return mode && values[toggle]; }
/** The stored switch value, regardless of debug mode. */
export function debugToggleSetting(toggle: DebugToggle): boolean { return values[toggle]; }
export function setDebugToggle(toggle: DebugToggle, on: boolean): void { values[toggle] = on; save(toggleKey(toggle), on); notify(); }

export function onDebugChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
