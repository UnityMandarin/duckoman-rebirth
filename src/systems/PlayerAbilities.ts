export interface PlayerAbilityConfig {
  dashCooldown: number;
}

export class PlayerAbilities {
  private dashUntil = 0;
  private nextDashAt = 0;
  private boostUntil = 0;
  private airDashUsed = false;
  slamming = false;
  sprinting = false;
  /** Skips the cooldown and the one-air-dash limit. */
  unlimitedDashes = false;

  constructor(private readonly config: PlayerAbilityConfig) {}

  setSprint(heldAndMoving: boolean): void {
    this.sprinting = heldAndMoving;
  }

  get airDashSpent(): boolean { return this.airDashUsed && !this.unlimitedDashes; }

  land(): void {
    this.airDashUsed = false;
  }

  tryStartDash(now: number, duration: number, grounded: boolean): boolean {
    if (!this.unlimitedDashes) {
      if (now < this.nextDashAt) return false;
      if (!grounded) {
        if (this.airDashUsed) return false;
        this.airDashUsed = true;
      }
      this.nextDashAt = now + this.config.dashCooldown;
    }
    this.dashUntil = now + duration;
    this.slamming = false;
    return true;
  }

  dashCharge(now: number): number {
    if (this.unlimitedDashes) return 1;
    return Math.min(1, Math.max(0, 1 - (this.nextDashAt - now) / this.config.dashCooldown));
  }

  isDashing(now: number): boolean { return now < this.dashUntil; }
  endDash(): void { this.dashUntil = 0; }
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
