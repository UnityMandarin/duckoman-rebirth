import { afterEach, describe, expect, it, vi } from 'vitest';
import { addMenuControl } from '../src/systems/MenuControl';

class FakeButton {
  type = '';
  hidden = false;
  className = '';
  textContent = '';
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<(event: { stopPropagation: () => void }) => void>>();
  removed = false;
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(name: string, listener: (event: { stopPropagation: () => void }) => void): void {
    const set = this.listeners.get(name) ?? new Set(); set.add(listener); this.listeners.set(name, set);
  }
  removeEventListener(name: string, listener: (event: { stopPropagation: () => void }) => void): void { this.listeners.get(name)?.delete(listener); }
  remove(): void { this.removed = true; }
  click(): boolean {
    let stopped = false;
    for (const listener of this.listeners.get('click') ?? []) listener({ stopPropagation: () => { stopped = true; } });
    return stopped;
  }
}

class FakeEvents {
  listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  on(name: string, listener: (...args: unknown[]) => void): this { const set = this.listeners.get(name) ?? new Set(); set.add(listener); this.listeners.set(name, set); return this; }
  once(name: string, listener: (...args: unknown[]) => void): this {
    const wrapped = (...args: unknown[]): void => { this.off(name, wrapped); listener(...args); };
    return this.on(name, wrapped);
  }
  off(name: string, listener: (...args: unknown[]) => void): this { this.listeners.get(name)?.delete(listener); return this; }
  emit(name: string): void { for (const listener of [...(this.listeners.get(name) ?? [])]) listener(); }
}

const buttons: FakeButton[] = [];
const parent = { appendChild(button: FakeButton) { buttons.push(button); return button; } };
afterEach(() => { buttons.length = 0; vi.unstubAllGlobals(); });

describe('native menu control', () => {
  it('creates one accessible control, invokes its callback, and stops click bubbling', () => {
    vi.stubGlobal('document', { getElementById: () => parent, createElement: () => new FakeButton() });
    const events = new FakeEvents(); const open = vi.fn();
    const scene = { events, sys: { game: { canvas: { focus: vi.fn() } } } } as never;
    addMenuControl(scene, open); addMenuControl(scene, vi.fn());
    expect(buttons).toHaveLength(1);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].attributes.get('aria-label')).toBe('Open game menu');
    expect(buttons[0].className).toBe('game-menu-control');
    expect(buttons[0].click()).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('hides during pause and sleep, reveals and refocuses the canvas on resume and wake', () => {
    vi.stubGlobal('document', { getElementById: () => parent, createElement: () => new FakeButton() });
    const events = new FakeEvents(); const focus = vi.fn();
    addMenuControl({ events, input: { keyboard: { resetKeys: vi.fn() } }, sys: { game: { canvas: { focus } } } } as never, vi.fn());
    const button = buttons[0];
    events.emit('pause'); expect(button.hidden).toBe(true);
    events.emit('resume'); expect(button.hidden).toBe(false);
    events.emit('sleep'); expect(button.hidden).toBe(true);
    events.emit('wake'); expect(button.hidden).toBe(false);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('removes the button and listeners on scene shutdown or destroy', () => {
    vi.stubGlobal('document', { getElementById: () => parent, createElement: () => new FakeButton() });
    const events = new FakeEvents(); const scene = { events, sys: { game: { canvas: {} } } } as never;
    addMenuControl(scene, vi.fn()); const button = buttons[0];
    events.emit('shutdown');
    expect(button.removed).toBe(true);
    expect(events.listeners.get('pause')?.size ?? 0).toBe(0);
    events.emit('destroy');
    expect(buttons).toHaveLength(1);
  });
});
