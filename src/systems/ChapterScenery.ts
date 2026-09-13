import Phaser from 'phaser';
import type { ChapterKind } from '../data/chapters';

type Plane = { factor: number; depth: number };

/** Static architectural planes that add depth without changing the playable space. */
export class ChapterScenery {
  private readonly planes: readonly Plane[] = [
    { factor: 0.30, depth: -16 }, // recessed arcades / distant ridges
    { factor: 0.46, depth: -13 }, // catwalks / branch boughs
    { factor: 0.72, depth: -9 },  // piers / tree trunks
    { factor: 0.88, depth: -4 },  // chains / hanging branches
    { factor: 1.12, depth: 12 }   // below-floor masonry / roots
  ];

  constructor(private readonly scene: Phaser.Scene, private readonly kind: ChapterKind, private readonly width: number) {
    for (const plane of this.planes) this.createPlane(plane);
  }

  private createPlane(plane: Plane): void {
    const extent = this.width * plane.factor + 640;
    const chunks = Math.ceil(extent / 1440);
    for (let i = 0; i < chunks; i++) {
      const g = this.scene.add.graphics().setPosition(i * 1440, 0).setDepth(plane.depth).setScrollFactor(plane.factor, 1);
      if (plane.depth === -16) this.drawRecess(g, 0);
      else if (plane.depth === -13) this.drawRails(g, 0);
      else if (plane.depth === -9) this.drawPiers(g, 0);
      else if (plane.depth === -4) this.drawHanging(g, 0);
      else this.drawFoundation(g, 0);
    }
  }

  private drawRecess(g: Phaser.GameObjects.Graphics, x: number): void {
    if (this.kind === 'jail') {
      g.fillStyle(0x101e2b, 0.48);
      for (let i = 0; i < 3; i++) {
        const left = x + 100 + i * 470;
        g.fillRect(left, 154, 94, 206);
        g.fillTriangle(left - 8, 154, left + 47, 82, left + 102, 154);
        g.lineStyle(2, 0x5e6470, 0.24).lineBetween(left + 9, 202, left + 85, 202);
      }
      g.lineStyle(3, 0x6d5a43, 0.18).lineBetween(x + 28, 360, x + 1410, 360);
    } else {
      g.fillStyle(0x172e2b, 0.5);
      g.fillTriangle(x + 0, 290, x + 260, 126, x + 570, 290);
      g.fillTriangle(x + 400, 290, x + 810, 96, x + 1120, 290);
      g.fillTriangle(x + 900, 290, x + 1200, 144, x + 1440, 290);
      g.lineStyle(2, 0x697258, 0.24).lineBetween(x + 8, 290, x + 1432, 290);
    }
  }

  private drawRails(g: Phaser.GameObjects.Graphics, x: number): void {
    if (this.kind === 'jail') {
      g.fillStyle(0x0a151d, 0.62);
      g.fillRect(x + 80, 218, 1280, 7);
      g.lineStyle(2, 0x8b7656, 0.36).lineBetween(x + 80, 218, x + 1360, 218);
      for (let post = x + 95; post < x + 1360; post += 128) {
        g.fillRect(post, 218, 7, 68);
        g.lineStyle(1, 0x56616b, 0.36).lineBetween(post + 7, 232, post + 7, 278);
      }
      g.fillRect(x + 230, 278, 350, 6).fillRect(x + 920, 278, 300, 6);
    } else {
      g.lineStyle(5, 0x263d2e, 0.68).lineBetween(x + 24, 166, x + 730, 214).lineBetween(x + 730, 214, x + 1410, 175);
      g.lineStyle(2, 0x7f7653, 0.42).lineBetween(x + 24, 162, x + 730, 210).lineBetween(x + 730, 210, x + 1410, 171);
      for (let post = x + 96; post < x + 1400; post += 180) g.fillRect(post, 174, 8, 58);
    }
  }

  private drawPiers(g: Phaser.GameObjects.Graphics, x: number): void {
    if (this.kind === 'jail') {
      g.fillStyle(0x111d28, 0.68);
      for (const left of [x + 160, x + 650, x + 1160]) {
        g.fillRect(left, 212, 72, 148);
        g.fillTriangle(left - 13, 212, left + 36, 164, left + 85, 212);
        g.fillRect(left - 12, 348, 96, 12);
        g.lineStyle(2, 0x9a794d, 0.3).lineBetween(left + 5, 216, left + 67, 216).lineBetween(left + 10, 350, left + 62, 350);
      }
      g.lineStyle(3, 0x57636d, 0.27).beginPath().arc(x + 430, 212, 234, Math.PI, Math.PI * 2, false).strokePath();
      g.lineStyle(3, 0x57636d, 0.27).beginPath().arc(x + 930, 212, 244, Math.PI, Math.PI * 2, false).strokePath();
    } else {
      for (const left of [x + 190, x + 840, x + 1240]) {
        g.fillStyle(0x1b3028, 0.68).fillRect(left, 234, 58, 126);
        g.fillEllipse(left + 28, 196, 150, 120).fillRect(left - 4, 214, 66, 20);
        g.lineStyle(2, 0x8b8058, 0.28).lineBetween(left + 5, 236, left + 52, 236);
      }
    }
  }

  private drawHanging(g: Phaser.GameObjects.Graphics, x: number): void {
    if (this.kind === 'jail') {
      g.lineStyle(3, 0x172029, 0.78).lineBetween(x + 240, 0, x + 240, 58);
      g.lineStyle(2, 0x6a573f, 0.5).lineBetween(x + 240, 56, x + 252, 78).lineBetween(x + 252, 78, x + 240, 98);
      g.strokeCircle(x + 240, 112, 14);
      g.lineStyle(2, 0x172029, 0.72).lineBetween(x + 1050, 28, x + 1040, 66).lineBetween(x + 1040, 66, x + 1052, 98);
      g.strokeCircle(x + 1052, 112, 13);
      g.lineStyle(2, 0x836b48, 0.34).lineBetween(x + 1065, 112, x + 1114, 112);
    } else {
      g.lineStyle(6, 0x253d2e, 0.72).lineBetween(x + 60, 114, x + 360, 140).lineBetween(x + 360, 140, x + 650, 110);
      g.lineStyle(3, 0x897d55, 0.3).lineBetween(x + 75, 111, x + 360, 136).lineBetween(x + 360, 136, x + 648, 106);
      g.lineStyle(4, 0x253d2e, 0.65).lineBetween(x + 1110, 58, x + 1320, 96);
      g.fillEllipse(x + 1280, 88, 170, 90);
    }
  }

  private drawFoundation(g: Phaser.GameObjects.Graphics, x: number): void {
    // This plane starts below the playable floor so it cannot mask hazards or actors.
    if (this.kind === 'jail') {
      g.fillStyle(0x0a1219, 0.9);
      for (let row = 0; row < 2; row++) {
        for (let block = 0; block < 8; block++) {
          const left = x + block * 180 - (row % 2) * 24;
          g.fillRect(left, 394 + row * 32, 172, 27);
          g.lineStyle(1, 0x785f42, 0.5).strokeRect(left + 2, 396 + row * 32, 168, 23);
        }
      }
      g.lineStyle(3, 0xa27a4d, 0.52).lineBetween(x, 392, x + 1440, 392);
    } else {
      g.fillStyle(0x10221d, 0.92);
      for (let root = 0; root < 5; root++) {
        const left = x + root * 315;
        g.fillTriangle(left, 430, left + 70, 394, left + 220, 430);
        g.fillRect(left + 48, 410, 168, 35);
        g.lineStyle(2, 0x82784e, 0.46).lineBetween(left + 54, 412, left + 208, 412);
      }
      g.lineStyle(3, 0x9e8251, 0.48).lineBetween(x, 392, x + 1440, 392);
    }
  }
}
