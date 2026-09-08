export class AirTuck {
  private pressedInAir = false;
  update(grounded: boolean, pressed: boolean): boolean {
    if (grounded) { this.pressedInAir = false; return false; }
    if (!pressed) return false;
    if (this.pressedInAir) { this.pressedInAir = false; return true; }
    this.pressedInAir = true;
    return false;
  }
}
