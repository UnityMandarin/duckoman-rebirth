import { afterEach, describe, expect, it, vi } from 'vitest';
import { addMenuControl, requestPauseMenu } from '../src/systems/MenuControl';

class FakeButton {
  type = '';
  hidden = false;
  className = '';
  textContent = '';
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<(event: { stopPropagation: () => void }) => void>>();
  removed = false;
  disabled = false;
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
    const events = new FakeEvents(); const open = vi.fn(); const resetKeys = vi.fn();
    const scene = { events, input: { keyboard: { resetKeys } }, sys: { isActive: () => true, game: { canvas: { focus: vi.fn() } } } } as never;
    addMenuControl(scene, open); addMenuControl(scene, vi.fn());
    expect(buttons).toHaveLength(1);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].attributes.get('aria-label')).toBe('Open game menu');
    expect(buttons[0].className).toBe('game-menu-control');
    expect(buttons[0].click()).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(buttons[0].hidden).toBe(true); expect(buttons[0].disabled).toBe(true);
    buttons[0].click();
    expect(open).toHaveBeenCalledTimes(1);
    events.emit('resume');
    expect(buttons[0].hidden).toBe(false); expect(buttons[0].disabled).toBe(false);
    buttons[0].click();
    expect(open).toHaveBeenCalledTimes(2);
    expect(resetKeys).toHaveBeenCalledTimes(1);
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

  it('saves once and queues one pause/menu launch for the next post-update', () => {
    const events = new FakeEvents(); const resetKeys = vi.fn();
    const manager = { isActive: vi.fn((key: string) => key === 'rescue'), isPaused: vi.fn(() => false), pause: vi.fn(), launch: vi.fn() };
    const scene = { events, scene: manager, sys: { settings: { key: 'rescue' } }, input: { keyboard: { resetKeys } } } as never;
    const save = vi.fn();
    expect(requestPauseMenu(scene, save)).toBe(true);
    expect(requestPauseMenu(scene, save)).toBe(false);
    expect(save).toHaveBeenCalledTimes(1); expect(resetKeys).toHaveBeenCalledTimes(1);
    expect(manager.pause).not.toHaveBeenCalled();
    events.emit('postupdate');
    expect(manager.pause).toHaveBeenCalledWith('rescue');
    expect(manager.launch).toHaveBeenCalledWith('menu', { pausedScene: 'rescue' });
    events.emit('postupdate');
    expect(manager.launch).toHaveBeenCalledTimes(1);
  });

  it('releases a queued request when the parent resumes or shuts down', () => {
    for (const event of ['resume', 'wake', 'shutdown', 'destroy']) {
      const events = new FakeEvents(); const manager = { isActive: vi.fn((key: string) => key !== 'menu'), isPaused: vi.fn(() => false), pause: vi.fn(), launch: vi.fn() };
      const scene = { events, scene: manager, sys: { settings: { key: 'gate-1' } }, input: { keyboard: { resetKeys: vi.fn() } } } as never;
      expect(requestPauseMenu(scene, vi.fn())).toBe(true);
      events.emit(event);
      expect(requestPauseMenu(scene, vi.fn())).toBe(true);
      events.emit('postupdate');
      expect(manager.launch).toHaveBeenCalledTimes(1);
    }
  });

  it.each([
    ['parent inactive', false, false, false],
    ['menu active', true, true, false],
    ['menu paused', true, false, true],
  ])('does not request a menu when %s', (_label, parentActive, menuActive, menuPaused) => {
    const events = new FakeEvents(); const resetKeys = vi.fn();
    const manager = {
      isActive: vi.fn((key: string) => key === 'parent' ? parentActive : menuActive),
      isPaused: vi.fn((key: string) => key === 'menu' && menuPaused), pause: vi.fn(), launch: vi.fn(),
    };
    const scene = { events, scene: manager, sys: { settings: { key: 'parent' } }, input: { keyboard: { resetKeys } } } as never;
    const save = vi.fn();
    expect(requestPauseMenu(scene, save)).toBe(false);
    expect(save).not.toHaveBeenCalled(); expect(resetKeys).not.toHaveBeenCalled();
    expect(manager.pause).not.toHaveBeenCalled(); expect(manager.launch).not.toHaveBeenCalled();
  });

  it('rethrows a save error, releases listeners, and accepts a later valid request', () => {
    const events = new FakeEvents(); const resetKeys = vi.fn();
    const manager = { isActive: vi.fn((key: string) => key !== 'menu'), isPaused: vi.fn(() => false), pause: vi.fn(), launch: vi.fn() };
    const scene = { events, scene: manager, sys: { settings: { key: 'parent' } }, input: { keyboard: { resetKeys } } } as never;
    const error = new Error('save failed');
    expect(() => requestPauseMenu(scene, () => { throw error; })).toThrow(error);
    for (const event of ['postupdate', 'resume', 'wake', 'shutdown', 'destroy']) expect(events.listeners.get(event)?.size ?? 0).toBe(0);
    const save = vi.fn();
    expect(requestPauseMenu(scene, save)).toBe(true);
    expect(save).toHaveBeenCalledOnce(); expect(resetKeys).toHaveBeenCalledOnce();
    events.emit('postupdate');
    expect(manager.launch).toHaveBeenCalledOnce();
  });

  it('restores the native control when a menu request is rejected', () => {
    vi.stubGlobal('document', { getElementById: () => parent, createElement: () => new FakeButton() });
    const events = new FakeEvents(); const scene = { events, sys: { settings: { key: 'gate-1' }, isActive: () => true, game: { canvas: {} } } } as never;
    addMenuControl(scene, () => false); const button = buttons[0]; button.click();
    expect(button.hidden).toBe(false); expect(button.disabled).toBe(false);
  });
});
