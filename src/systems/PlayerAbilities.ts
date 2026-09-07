export class PlayerAbilities {
  private dashUntil = 0;
  private nextDashAt = 0;
  private boostUntil = 0;
  slamming = false;

  tryStartDash(now: number, duration: number, cooldown: number): boolean {
    if (now < this.nextDashAt) return false;
    this.dashUntil = now + duration;
    this.nextDashAt = now + cooldown;
    this.slamming = false;
    return true;
  }

  isDashing(now: number): boolean { return now < this.dashUntil; }
  dashCooldownRemaining(now: number): number { return Math.max(0, this.nextDashAt - now); }

  startSlam(): void {
    this.slamming = true;
    this.dashUntil = 0;
  }

  landSlam(now: number, boostWindow: number): boolean {
    if (!this.slamming) return false;
    this.slamming = false;
    this.boostUntil = now + boostWindow;
    return true;
  }

  consumeBoost(now: number): boolean {
    const ready = this.boostReady(now);
    this.boostUntil = 0;
    return ready;
  }

  boostReady(now: number): boolean { return this.boostUntil > 0 && now <= this.boostUntil; }

  cancelTransient(): void {
    this.dashUntil = 0;
    this.slamming = false;
    this.boostUntil = 0;
  }
}
