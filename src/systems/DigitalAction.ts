export interface DigitalActionSnapshot {
  down: boolean;
  pressed: boolean;
  released: boolean;
}

export class DigitalAction {
  private wasDown = false;

  read(down: boolean): DigitalActionSnapshot {
    const snapshot = {
      down,
      pressed: down && !this.wasDown,
      released: !down && this.wasDown
    };
    this.wasDown = down;
    return snapshot;
  }
}
