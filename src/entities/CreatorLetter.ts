import Phaser from 'phaser';
import type { Player } from './Player';
import { TUNING } from '../config/tuning';
import { showHitbox } from '../systems/DebugHitboxes';

const PAGE: { text: string; italic: boolean }[] = [
  { text: 'You find a charred page of a notebook. Notes are hastily jotted down in messy lines.', italic: false },
  { text: 'This iteration is... imperfect. Completely out of my control. Like it has a mind of its own.', italic: true },
  { text: 'Unacceptable. My only choice is to leave it to rust and rebuild it entirely. My next creations MUST OBEY', italic: true },
];
const LINE_MS = 3000, FADE_MS = 300;
export const LETTER_TEXTURE = 'sealed-dispatch';

/** RustWing's maker's note: the same sealed dispatch as the chapter secrets. Picking it up plays its lines in turn. */
export class CreatorLetter {
  private art?: Phaser.GameObjects.Image;
  private caption: Phaser.GameObjects.Text;
  private readFrom?: number;
  private y: number;
  constructor(private scene: Phaser.Scene, private x: number, floorTop: number) {
    this.y = floorTop - 49;
    this.art = scene.add.image(x, this.y, LETTER_TEXTURE).setDisplaySize(28, 24).setDepth(5).setAlpha(0);
    scene.tweens.add({ targets: this.art, alpha: 1, duration: 900, ease: 'Sine.easeOut' });
    this.caption = scene.add.text(TUNING.simulation.width / 2, 100, '', {
      fontFamily: 'Georgia', fontSize: '14px', color: '#ecd494', stroke: '#071019', strokeThickness: 4, align: 'center', wordWrap: { width: 520 }
    }).setOrigin(.5, 0).setScrollFactor(0).setDepth(52).setAlpha(0);
  }
  /** True while the page's lines are still showing. */
  get reading(): boolean { return this.readFrom !== undefined; }
  update(player: Player): void {
    const now = this.scene.time.now;
    if (this.art) {
      this.art.setAngle(Math.sin(now * .003) * 8);
      showHitbox(this.scene, 'interact', { x: this.x, y: this.y, radius: 40 });
      if (this.art.alpha >= 1 && player.active && Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, this.x, this.y) < 40) {
        this.art.destroy();
        this.art = undefined;
        this.readFrom = now;
      }
    }
    this.showLine(now);
  }
  private showLine(now: number): void {
    if (this.readFrom === undefined) return;
    const t = now - this.readFrom, index = Math.floor(t / LINE_MS);
    if (index >= PAGE.length) { this.readFrom = undefined; this.caption.setAlpha(0); return; }
    const line = PAGE[index], within = t - index * LINE_MS;
    this.caption.setText(line.text).setFontStyle(line.italic ? 'italic' : '')
      .setAlpha(Math.min(1, within / FADE_MS, (LINE_MS - within) / FADE_MS));
  }
}
