import { afterEach, describe, expect, it, vi } from 'vitest';
import { installVisibilityLifecycle } from '../src/systems/visibilityLifecycle';

class Events {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  on(name: string, fn: (...args: unknown[]) => void): this { const set = this.listeners.get(name) ?? new Set(); set.add(fn); this.listeners.set(name, set); return this; }
  once(name: string, fn: (...args: unknown[]) => void): this { return this.on(name, fn); }
  off(name: string, fn: (...args: unknown[]) => void): this { this.listeners.get(name)?.delete(fn); return this; }
  emit(name: string): void { const listeners = [...(this.listeners.get(name) ?? [])]; this.listeners.get(name)?.clear(); listeners.forEach(fn => fn()); }
}

let visibility = new Set<() => void>();
let hidden = false;
function installDocument(): void {
  visibility = new Set(); hidden = false;
  vi.stubGlobal('document', {
    get hidden() { return hidden; },
    addEventListener: (name: string, fn: () => void) => { if (name === 'visibilitychange') visibility.add(fn); },
    removeEventListener: (name: string, fn: () => void) => { if (name === 'visibilitychange') visibility.delete(fn); },
  });
}
function changed(isHidden: boolean): void { hidden = isHidden; [...visibility].forEach(fn => fn()); }
function fixture(started = false) {
  const calls: string[] = [], events = new Events();
  const loop = { started, sleep: vi.fn(() => calls.push('sleep')), resetDelta: vi.fn(() => calls.push('resetDelta')), wake: vi.fn(() => calls.push('wake')) };
  return { game: { loop, events } as never, loop, events, calls };
}
afterEach(() => { vi.unstubAllGlobals(); visibility.clear(); });

describe('visibility lifecycle', () => {
  it('does not wake before the loop has started and syncs in a microtask after READY', async () => {
    installDocument();
    const f = fixture(false), remove = installVisibilityLifecycle(f.game);
    expect(f.calls).toEqual([]);
    f.events.emit('ready');
    f.loop.started = true;
    expect(f.calls).toEqual([]);
    await Promise.resolve();
    expect(f.calls).toEqual(['resetDelta', 'wake']);
    remove();
  });

  it('sleeps when hidden and resets delta before waking when visible', () => {
    installDocument();
    const f = fixture(true), remove = installVisibilityLifecycle(f.game);
    expect(f.calls).toEqual(['resetDelta', 'wake']);
    f.calls.length = 0;
    changed(true);
    expect(f.calls).toEqual(['sleep']);
    f.calls.length = 0;
    changed(false);
    expect(f.calls).toEqual(['resetDelta', 'wake']);
    remove();
  });

  it('cleanup prevents a queued READY sync and ignores later visibility changes', async () => {
    installDocument();
    const f = fixture(false), remove = installVisibilityLifecycle(f.game);
    f.events.emit('ready');
    remove();
    f.loop.started = true;
    await Promise.resolve();
    changed(true); changed(false);
    expect(f.calls).toEqual([]);
    expect(visibility.size).toBe(0);
  });
});
