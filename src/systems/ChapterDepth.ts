import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { ChapterKind, Ledge } from '../data/chapters';
import { Atmosphere } from './Atmosphere';
import { ChapterScenery } from './ChapterScenery';
import { findSurfaceBelow, surfaceTop, type DepthSurfaceGeometry } from './chapterDepthMath';
import {nearbySectionIndexes} from './performancePolicy';

/** Keeps live contact shadowing beside the painted chapter composition. */
export class ChapterDepth {
  private readonly scenery?: ChapterScenery;
  private readonly atmosphere?: Atmosphere;
  private readonly geometryBuckets=new Map<number,{surface:ChapterDepthSurface;geometry:DepthSurfaceGeometry}[]>();
  private shadow?: Phaser.GameObjects.Ellipse;
  private player?: Player;

  constructor(private readonly scene: Phaser.Scene, private readonly kind: ChapterKind | 'castle', private readonly width: number, decorate=true) {
    if(decorate)this.scenery = new ChapterScenery(scene, kind, width);
    if(kind==='castle')this.atmosphere=new Atmosphere(scene,kind);
  }

  setSurfaces(surfaces: readonly ChapterDepthSurface[]): void {this.geometryBuckets.clear();surfaces.forEach((surface,id)=>{const geometry=this.geometry(surface,id),section=Math.floor(geometry.x/1440),bucket=this.geometryBuckets.get(section)??[];bucket.push({surface,geometry});this.geometryBuckets.set(section,bucket);});}
  setPlayer(player: Player): void {
    this.player = player;
    // The painted near plane is in front; the actor remains above gameplay art and below HUD.
    player.visual.setDepth(40);
  }
  setShadow(shadow: Phaser.GameObjects.Ellipse): void { this.shadow = shadow; }

  update(): void {
    if (!this.player) return;
    this.scenery?.update(this.player);
    this.atmosphere?.update(this.player,this.scene.game.loop.delta);
    this.updateShadow();
  }

  private geometry(surface: ChapterDepthSurface, id: number): DepthSurfaceGeometry {
    const body = surface.shape.body as Phaser.Physics.Arcade.StaticBody;
    return { id, x: body.center.x, y: body.center.y, width: body.width, height: body.height, enabled: body.enable, material: 'stone' };
  }

  private updateShadow(): void {
    if (!this.shadow || !this.player) return;
    const body = this.player.body;
    const section=Math.floor(this.player.sprite.x/1440),surfaces:DepthSurfaceGeometry[]=[];
    for(const index of nearbySectionIndexes(section,Math.ceil(this.width/1440),1))for(const {surface,geometry} of this.geometryBuckets.get(index)??[]){const shape=surface.shape.body as Phaser.Physics.Arcade.StaticBody;geometry.x=shape.center.x;geometry.y=shape.center.y;geometry.width=shape.width;geometry.height=shape.height;geometry.enabled=shape.enable;surfaces.push(geometry);}
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
  art?: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  ledge: Ledge;
}
