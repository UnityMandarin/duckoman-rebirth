import { describe, it, expect } from 'vitest';
import { AirTuck } from '../src/systems/AirTuck';
import { pillarPhase } from '../src/systems/PillarTiming';
import { GATE_1_ROOM } from '../src/data/gate1Room';
import { TUNING } from '../src/config/tuning';
describe('expanded level rules',()=>{
  it('tucks on the first air press, slams only on the second, and resets on landing',()=>{
    const tuck=new AirTuck();
    expect(tuck.update(false,true)).toBe(false);
    expect(tuck.update(false,false)).toBe(false);
    expect(tuck.update(false,true)).toBe(true);
    tuck.update(true,false);
    expect(tuck.update(false,true)).toBe(false);
  });
  it('warns before falling and becomes an obstacle only after impact',()=>{
    expect(pillarPhase(1499,1500,650)).toBe('warning');
    expect(pillarPhase(1500,1500,650)).toBe('falling');
    expect(pillarPhase(2150,1500,650)).toBe('landed');
  });
  it('adds exactly three enemies with safe patrol margins in the new half',()=>{
    expect(GATE_1_ROOM.extraEnemies).toHaveLength(3);
    for(const e of GATE_1_ROOM.extraEnemies) {
      expect(e.left).toBeGreaterThan(1280);
      expect(e.x).toBeGreaterThan(e.left);
      expect(e.x).toBeLessThan(e.right);
    }
  });
  it('places the fallen pillar between normal and boosted jump heights',()=>{
    const normal=TUNING.player.jumpVelocity**2/(2*TUNING.player.gravity);
    const boosted=TUNING.player.boostedJumpVelocity**2/(2*TUNING.player.gravity);
    expect(GATE_1_ROOM.pillar.height).toBeGreaterThan(normal);
    expect(GATE_1_ROOM.pillar.height+10).toBeLessThan(boosted);
  });
});
