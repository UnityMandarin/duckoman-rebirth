import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scene: class {}, GameObjects: { Container: class {} }, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));
vi.mock('../src/systems/progress', () => ({
  loadProgress: () => ({ ended: true, currentScene: 'gate-1', unlocked: ['gate-1'], completed: [], chapters: {} }),
  hasProgress: () => true,
}));
import { MenuScene } from '../src/scenes/MenuScene';

describe('MenuScene paused campaign action', () => {
  it('keeps resume as the primary action when a campaign chapter is paused, even after an ending', () => {
    const target = Object.create(MenuScene.prototype) as any;
    const resumeAction = vi.fn();
    Object.assign(target, {
      pausedScene: 'rescue',
      scene: { isPaused: vi.fn((key: string) => key === 'rescue') },
      resumeAction,
      openChapter: vi.fn(),
    });
    const progress = { ended: true, currentScene: 'gate-1', unlocked: ['gate-1'], completed: [], chapters: {} };
    expect(Reflect.get(MenuScene.prototype, 'primaryActionLabel').call(target, progress)).toBe('RESUME JOURNEY');
    Reflect.get(MenuScene.prototype, 'runPrimaryAction').call(target);
    expect(resumeAction).toHaveBeenCalledOnce();
    expect(target.openChapter).not.toHaveBeenCalled();
  });
});
