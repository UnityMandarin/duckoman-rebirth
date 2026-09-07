export class JumpAssist {
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private lastPressedAt = Number.NEGATIVE_INFINITY;

  recordGrounded(now: number): void { this.lastGroundedAt = now; }
  recordPress(now: number): void { this.lastPressedAt = now; }

  canJump(now: number, coyoteTime: number): boolean {
    return now - this.lastGroundedAt <= coyoteTime;
  }

  consumeBufferedPress(now: number, bufferTime: number): boolean {
    if (now - this.lastPressedAt > bufferTime) return false;
    this.lastPressedAt = Number.NEGATIVE_INFINITY;
    return true;
  }
}
