import Phaser from 'phaser';
import { DigitalAction } from './DigitalAction';

export interface InputSnapshot {
  throwPressed?: boolean;
  horizontal: -1 | 0 | 1;
  down: boolean;
  downPressed: boolean;
  dashPressed: boolean;
  sprintPressed: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  anyResetInput: boolean;
}

export class InputController {
  private readonly left: Phaser.Input.Keyboard.Key[];
  private readonly right: Phaser.Input.Keyboard.Key[];
  private readonly jump: Phaser.Input.Keyboard.Key[];
  private readonly down: Phaser.Input.Keyboard.Key[];
  private readonly dash: Phaser.Input.Keyboard.Key[];
  private readonly sprint: Phaser.Input.Keyboard.Key[];
  private readonly reset: Phaser.Input.Keyboard.Key[];
  private readonly jumpAction = new DigitalAction();
  private readonly downAction = new DigitalAction();
  private readonly dashAction = new DigitalAction();
  private readonly sprintAction = new DigitalAction();
  private resetQueued=false;
  private readonly weapon:Phaser.Input.Keyboard.Key;
  private readonly weaponAction=new DigitalAction();

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is required for Gate 1.');
    this.left = [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)];
    this.right = [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)];
    const space = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    const l = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.jump = [space, l];
    this.weapon=keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.down = [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)];
    this.dash = [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)];
    this.sprint = [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)];
    this.reset = [...this.left, ...this.right, keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W), keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP), ...this.down, ...this.dash, ...this.sprint, ...this.jump];
    const queueReset=()=>{this.resetQueued=true;};
    this.reset.forEach(key=>key.on('down',queueReset));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.reset.forEach(key=>key.off('down',queueReset)));
  }

  read(): InputSnapshot {
    const leftDown = this.left.some((key) => key.isDown);
    const rightDown = this.right.some((key) => key.isDown);
    const jump = this.jumpAction.read(this.jump.some((key) => key.isDown));
    const down = this.downAction.read(this.down.some((key) => key.isDown));
    const dash = this.dashAction.read(this.dash.some((key) => key.isDown));
    const sprint = this.sprintAction.read(this.sprint.some((key) => key.isDown));
    const horizontal = leftDown === rightDown ? 0 : leftDown ? -1 : 1;
    const queuedReset=this.resetQueued;this.resetQueued=false;
    return {
      throwPressed:this.weaponAction.read(this.weapon.isDown).pressed,
      horizontal,
      down: down.down,
      downPressed: down.pressed,
      dashPressed: dash.pressed,
      sprintPressed: sprint.pressed,
      jumpPressed: jump.pressed,
      jumpReleased: jump.released,
      anyResetInput: queuedReset || this.reset.some((key) => Phaser.Input.Keyboard.JustDown(key))
    };
  }
}
