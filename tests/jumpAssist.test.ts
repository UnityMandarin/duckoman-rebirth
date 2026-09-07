import { describe, expect, it } from 'vitest';
import { JumpAssist } from '../src/systems/JumpAssist';

describe('JumpAssist', () => {
  it('allows a coyote jump only inside the configured window', () => {
    const assist = new JumpAssist();
    assist.recordGrounded(1000);
    expect(assist.canJump(1100, 100)).toBe(true);
    expect(assist.canJump(1101, 100)).toBe(false);
  });

  it('consumes a buffered press only once', () => {
    const assist = new JumpAssist();
    assist.recordPress(1000);
    expect(assist.consumeBufferedPress(1120, 120)).toBe(true);
    expect(assist.consumeBufferedPress(1120, 120)).toBe(false);
  });

  it('does not retain coyote eligibility after a jump consumes it', () => {
    const assist = new JumpAssist();
    assist.recordGrounded(1000);
    assist.consumeGrounded();
    expect(assist.canJump(1050, 100)).toBe(false);
  });
});
