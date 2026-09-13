import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ChapterKind, Ledge } from '../data/chapters';
import { ChapterScenery } from './ChapterScenery';
import {
  findGroundedSurface,
  findSurfaceBelow,
  isInPresentationWindow,
  materialColor,
  reactionIntensity,
  surfaceTop,
  type DepthMaterial,
  type DepthSurfaceGeometry
} from './chapterDepthMath';

/** Presentation-only depth layers and contact feedback for the long-form chapters. */
export class ChapterDepth {
  private readonly farSilhouette: Phaser.GameObjects.Graphics;
  private readonly midground: Phaser.GameObjects.Graphics;
  private readonly foreground: Phaser.GameObjects.Graphics;
  private readonly platformDetails: Phaser.GameObjects.Graphics;
  private readonly reaction: Phaser.GameObjects.Graphics;
  private surfaces: readonly ChapterDepthSurface[] = [];
  private shadow?: Phaser.GameObjects.Ellipse;
  private player?: Player;
  private initialized = false;
  private wasGrounded = false;
  private nextFootstepAt = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly kind: ChapterKind, private readonly width: number) {
    new ChapterScenery(scene, kind, width);
    this.farSilhouette = scene.add.graphics().setDepth(-18).setScrollFactor(0.16, 1);
    this.midground = scene.add.graphics().setDepth(-7).setScrollFactor(0.66, 1);
    this.foreground = scene.add.graphics().setDepth(1);
    this.platformDetails = scene.add.graphics().setDepth(3);
    this.reaction = scene.add.graphics().setDepth(5);
    this.drawMidground();
    this.drawFarFallback();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.tweens.killTweensOf(this.reaction));
  }

  setSurfaces(surfaces: readonly ChapterDepthSurface[]): void { this.surfaces = surfaces; }
  setPlayer(player: Player): void { this.player = player; }
  setShadow(shadow: Phaser.GameObjects.Ellipse): void { this.shadow = shadow; }

  update(): void {
    if (!this.player) return;
    this.drawPlatformDetails();
    this.drawForeground();
    this.updateShadow();
    this.updateContactReaction();
  }

  private geometry(surface: ChapterDepthSurface, id: number): DepthSurfaceGeometry {
    const body = surface.shape.body as Phaser.Physics.Arcade.StaticBody;
    return {
      id, x: body.center.x, y: body.center.y, width: body.width, height: body.height,
      enabled: body.enable, material: this.materialFor(surface.ledge)
    };
  }

  private materialFor(ledge: Ledge): DepthMaterial {
    if (this.kind === 'outside') return ledge.y < 330 ? 'stone' : 'earth';
    return 'stone';
  }

  private nearby(): DepthSurfaceGeometry[] {
    const center = this.player?.sprite.x ?? 0;
    return this.surfaces.map((surface, id) => this.geometry(surface, id))
      .filter((surface) => isInPresentationWindow(surface.x, center, 640, 150 + surface.width / 2));
  }

  private drawPlatformDetails(): void {
    this.platformDetails.clear();
    for (const surface of this.nearby()) {
      const source = this.surfaces[surface.id];
      const alpha = source.art ? (source.art.visible ? Phaser.Math.Clamp(source.art.alpha, 0, 1) : 0) : 1;
      if (alpha <= 0.02) continue;
      const left = surface.x - surface.width / 2;
      const right = surface.x + surface.width / 2;
      const top = surfaceTop(surface);
      const color = materialColor(surface.material);
      this.platformDetails.lineStyle(2, color, 0.62 * alpha).lineBetween(left + 5, top + 1, right - 5, top + 1);
      this.platformDetails.lineStyle(1, 0x071119, 0.75 * alpha).lineBetween(left + 12, top + surface.height - 4, right - 12, top + surface.height - 4);
      this.platformDetails.lineStyle(1, color, 0.34 * alpha).lineBetween(left + 10, top + 5, right - 10, top + 5);
    }
  }

  private updateShadow(): void {
    if (!this.shadow || !this.player) return;
    const body = this.player.body;
    const floor = findSurfaceBelow({left: body.left, right: body.right, bottom: body.bottom}, this.surfaces.map((surface, id) => this.geometry(surface, id)));
    if (!floor) { this.shadow.setVisible(false); return; }
    const distance = Math.max(0, surfaceTop(floor) - body.bottom);
    this.shadow.setVisible(true).setPosition(this.player.sprite.x, surfaceTop(floor) + 2)
      .setScale(Math.max(.35, 1 - distance / 350), 1)
      .setAlpha(Math.max(.08, .32 - distance / 900));
  }

  private drawForeground(): void {
    this.foreground.clear();
    for (const surface of this.nearby()) {
      if (surface.height >= 60) continue;
      const top = surfaceTop(surface), left = surface.x - surface.width / 2, right = surface.x + surface.width / 2;
      const end = Math.min(359, top + 70);
      if (end <= top + 8) continue;
      this.foreground.lineStyle(2, this.kind === 'jail' ? 0x25353b : 0x1e3026, 0.52)
        .lineBetween(left + 4, top + 7, left + 4, end)
        .lineBetween(right - 4, top + 7, right - 4, end);
    }
  }

  private updateContactReaction(): void {
    const body = this.player!.body;
    const current = this.surfaces.map((surface, id) => this.geometry(surface, id));
    const support = findGroundedSurface({left: body.left, right: body.right, top: body.top, bottom: body.bottom, grounded: this.player!.grounded}, current);
    const grounded = !!support;
    const now = this.scene.time.now;
    if (!this.initialized) {
      this.initialized = true;
      this.wasGrounded = grounded;
      this.nextFootstepAt = now + 280;
      return;
    }
    const speed = body.velocity.x;
    const landed = grounded && !this.wasGrounded;
    const walking = grounded && Math.abs(speed) > 55 && now >= this.nextFootstepAt;
    if (support && (landed || walking)) {
      this.showReaction(support, speed, landed);
      this.nextFootstepAt = now + (landed ? 260 : 320);
    }
    if (!grounded) this.nextFootstepAt = Math.min(this.nextFootstepAt, now + 80);
    this.wasGrounded = grounded;
  }

  private showReaction(surface: DepthSurfaceGeometry, speed: number, landing: boolean): void {
    const intensity = reactionIntensity(speed, landing);
    const width = (landing ? 18 : 12) + intensity * (landing ? 18 : 12);
    const color = materialColor(surface.material);
    const x = Phaser.Math.Clamp(this.player!.sprite.x, surface.x - surface.width / 2 + 10, surface.x + surface.width / 2 - 10);
    this.scene.tweens.killTweensOf(this.reaction);
    this.reaction.clear().setPosition(x, surfaceTop(surface) + 2).setScale(0.78).setAlpha(0.85);
    this.reaction.lineStyle(landing ? 2 : 1, color, 0.8)
      .lineBetween(-width, 0, -width * 0.35, 0)
      .lineBetween(width * 0.35, 0, width, 0);
    if (landing) this.reaction.lineBetween(-width * 0.7, -2, -width * 0.45, -6).lineBetween(width * 0.45, -6, width * 0.7, -2);
    this.scene.tweens.add({targets: this.reaction, alpha: 0, scaleX: 1.08, scaleY: 0.65, duration: landing ? 180 : 120, ease: 'Quad.Out'});
  }

  private drawFarFallback(): void {
    if (this.kind === 'jail' && this.scene.textures.exists('jail-distance')) {
      const texture = this.scene.textures.get('jail-distance');
      const source = texture.getSourceImage() as { width: number; height: number };
      const height = 1800 * source.height / source.width;
      for (let x = 0; x < this.width; x += 1800) {
        this.scene.add.image(x, 360 - height * 0.8, 'jail-distance').setOrigin(0).setDisplaySize(1802, height)
          .setDepth(-25).setAlpha(0.86).setScrollFactor(0.16, 1);
      }
      return;
    }
    const g = this.farSilhouette;
    g.fillStyle(this.kind === 'jail' ? 0x142536 : 0x162b28, 0.36);
    for (let x = 0; x < this.width; x += 720) {
      if (this.kind === 'jail') {
        g.fillRect(x + 80, 138, 90, 222).fillRect(x + 105, 100, 40, 40);
        g.fillTriangle(x + 100, 100, x + 125, 65, x + 150, 100);
        g.lineStyle(3, 0x33485a, 0.4).lineBetween(x + 100, 192, x + 150, 192);
      } else {
        g.fillEllipse(x + 110, 210, 150, 230).fillRect(x + 95, 220, 30, 140);
        g.fillEllipse(x + 300, 230, 180, 200).fillRect(x + 285, 245, 34, 115);
      }
    }
  }

  private drawMidground(): void {
    const g = this.midground;
    g.fillStyle(this.kind === 'jail' ? 0x0b1721 : 0x15251e, 0.46);
    for (let x = 0; x < this.width; x += 1440) {
      if (this.kind === 'jail') {
        g.fillRect(x + 92, 248, 22, 112).fillRect(x + 1328, 214, 26, 146);
        g.lineStyle(2, 0x50606a, 0.32).lineBetween(x + 95, 248, x + 180, 188).lineBetween(x + 1340, 214, x + 1270, 165);
      } else {
        g.fillRect(x + 118, 280, 26, 80).fillRect(x + 1290, 258, 32, 102);
        g.fillEllipse(x + 126, 246, 110, 95).fillEllipse(x + 1304, 228, 135, 120);
      }
    }
  }
}

export interface ChapterDepthSurface {
  shape: Phaser.GameObjects.Rectangle;
  art?: Phaser.GameObjects.Image;
  ledge: Ledge;
}
