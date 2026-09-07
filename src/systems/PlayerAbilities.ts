export interface PlayerAbilityConfig {
  dashCooldown: number;
  maxStamina: number;
  dashStaminaCost: number;
  staminaRegenAmount: number;
  staminaRegenInterval: number;
}

export class PlayerAbilities {
  private dashUntil = 0;
  private nextDashAt = 0;
  private boostUntil = 0;
  private lastStaminaChangeAt = 0;
  stamina: number;
  slamming = false;

  constructor(private readonly config: PlayerAbilityConfig) {
    this.stamina = config.maxStamina;
  }

  update(now: number): void {
    const ticks = Math.floor((now - this.lastStaminaChangeAt) / this.config.staminaRegenInterval);
    if (ticks <= 0) return;
    this.stamina = Math.min(this.config.maxStamina, this.stamina + ticks * this.config.staminaRegenAmount);
    this.lastStaminaChangeAt += ticks * this.config.staminaRegenInterval;
  }

  tryStartDash(now: number, duration: number): boolean {
    this.update(now);
    if (now < this.nextDashAt || this.stamina < this.config.dashStaminaCost) return false;
    this.dashUntil = now + duration;
    this.nextDashAt = now + this.config.dashCooldown;
    this.stamina -= this.config.dashStaminaCost;
    this.lastStaminaChangeAt = now;
    this.slamming = false;
    return true;
  }

  isDashing(now: number): boolean { return now < this.dashUntil; }
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
