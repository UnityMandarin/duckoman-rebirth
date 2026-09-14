import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ChapterKind, Ledge } from '../data/chapters';
import { ChapterScenery } from './ChapterScenery';
import { findSurfaceBelow, surfaceTop, type DepthSurfaceGeometry } from './chapterDepthMath';

/** Keeps live contact shadowing beside the painted chapter composition. */
export class ChapterDepth {
  private readonly scenery: ChapterScenery;
  private surfaces: readonly ChapterDepthSurface[] = [];
  private shadow?: Phaser.GameObjects.Ellipse;
  private player?: Player;

  constructor(private readonly scene: Phaser.Scene, private readonly kind: ChapterKind, private readonly width: number) {
    this.scenery = new ChapterScenery(scene, kind, width);
  }

  setSurfaces(surfaces: readonly ChapterDepthSurface[]): void { this.surfaces = surfaces; }
  setPlayer(player: Player): void {
    this.player = player;
    // The painted near plane is in front; the actor remains above gameplay art and below HUD.
    player.visual.setDepth(40);
  }
  setShadow(shadow: Phaser.GameObjects.Ellipse): void { this.shadow = shadow; }

  update(): void {
    if (!this.player) return;
    this.scenery.update(this.player);
    this.updateShadow();
  }

  private geometry(surface: ChapterDepthSurface, id: number): DepthSurfaceGeometry {
    const body = surface.shape.body as Phaser.Physics.Arcade.StaticBody;
    return { id, x: body.center.x, y: body.center.y, width: body.width, height: body.height, enabled: body.enable, material: 'stone' };
  }

  private updateShadow(): void {
    if (!this.shadow || !this.player) return;
    const body = this.player.body;
    const surfaces = this.surfaces.map((surface, id) => this.geometry(surface, id));
    const floor = findSurfaceBelow({ left: body.left, right: body.right, bottom: body.bottom }, surfaces);
    if (!floor) { this.shadow.setVisible(false); return; }
    const distance = Math.max(0, surfaceTop(floor) - body.bottom);
    this.shadow.setVisible(true).setPosition(this.player.sprite.x, surfaceTop(floor) + 2)
      .setScale(Math.max(.35, 1 - distance / 350), 1)
      .setAlpha(Math.max(.08, .32 - distance / 900));
  }
}

export interface ChapterDepthSurface {
  shape: Phaser.GameObjects.Rectangle;
  art?: Phaser.GameObjects.Image;
  ledge: Ledge;
}
