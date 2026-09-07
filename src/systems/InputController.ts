import Phaser from 'phaser';

export interface InputSnapshot {
  horizontal: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpReleased: boolean;
  anyResetInput: boolean;
}

export class InputController {
  private readonly left: Phaser.Input.Keyboard.Key;
  private readonly right: Phaser.Input.Keyboard.Key;
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private readonly reset: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for Gate 1.');
    this.left = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.right = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const space = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const l = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.jump = [space, l];
    this.reset = [this.left, this.right, keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN), ...this.jump];
  }

  read(): InputSnapshot {
    const horizontal = this.left.isDown === this.right.isDown ? 0 : this.left.isDown ? -1 : 1;
    return {
      horizontal,
      jumpPressed: this.jump.some((key) => Phaser.Input.Keyboard.JustDown(key)),
      jumpReleased: this.jump.some((key) => Phaser.Input.Keyboard.JustUp(key)),
      anyResetInput: this.reset.some((key) => Phaser.Input.Keyboard.JustDown(key))
    };
  }
}
