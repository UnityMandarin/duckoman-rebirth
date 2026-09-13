import { describe, expect, it } from 'vitest';
import { findGroundedSurface, findSurfaceBelow, isInPresentationWindow, materialColor, reactionIntensity, surfaceTop } from '../src/systems/chapterDepthMath';

describe('chapter depth presentation geometry', () => {
  it('selects the enabled surface actually supporting the actor', () => {
    const surfaces = [
      { id: 1, x: 100, y: 350, width: 220, height: 32, enabled: true, material: 'stone' as const },
      { id: 2, x: 100, y: 250, width: 220, height: 32, enabled: false, material: 'metal' as const },
      { id: 3, x: 100, y: 349, width: 220, height: 32, enabled: true, material: 'earth' as const }
    ];
    const actor = { left: 80, right: 120, top: 260, bottom: 334, grounded: true };
    expect(findGroundedSurface(actor, surfaces)?.id).toBe(3);
    expect(surfaceTop(surfaces[0])).toBe(334);
    expect(findGroundedSurface({ ...actor, left: 180, right: 220, bottom: 234 }, surfaces)?.id).toBeUndefined();
    expect(findGroundedSurface({ ...actor, bottom: 333 }, surfaces)?.id).toBe(3);
    expect(findGroundedSurface({ ...actor, bottom: 254 }, [{ ...surfaces[0], y: 270 }])?.id).toBe(1);
    expect(findGroundedSurface({ ...actor, grounded: false }, surfaces)).toBeUndefined();
    expect(findSurfaceBelow({ left: 80, right: 120, bottom: 260 }, surfaces)?.id).toBe(3);
  });

  it('culls depth art outside the camera presentation window', () => {
    expect(isInPresentationWindow(400, 640)).toBe(true);
    expect(isInPresentationWindow(1100, 640)).toBe(false);
    expect(isInPresentationWindow(1100, 640, 640, 500)).toBe(true);
  });

  it('bounds contact intensity and keeps materials visually distinct', () => {
    expect(reactionIntensity(9999, true)).toBe(1);
    expect(reactionIntensity(0, false)).toBeGreaterThan(0);
    expect(materialColor('metal')).not.toBe(materialColor('earth'));
  });
});
