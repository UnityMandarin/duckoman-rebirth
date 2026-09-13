export type DepthMaterial = 'stone' | 'metal' | 'earth';

export interface DepthSurfaceGeometry {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  enabled: boolean;
  material: DepthMaterial;
}

export interface DepthActorGeometry {
  left: number;
  right: number;
  top: number;
  bottom: number;
  grounded: boolean;
}

export function surfaceTop(surface: Pick<DepthSurfaceGeometry, 'y' | 'height'>): number {
  return surface.y - surface.height / 2;
}

/** Returns the actual supporting surface, including moving and temporarily disabled platforms. */
export function findGroundedSurface(
  actor: DepthActorGeometry,
  surfaces: readonly DepthSurfaceGeometry[],
  tolerance = 9
): DepthSurfaceGeometry | undefined {
  if (!actor.grounded) return undefined;
  return surfaces
    .filter((surface) => surface.enabled && actor.right > surface.x - surface.width / 2 && actor.left < surface.x + surface.width / 2)
    .filter((surface) => Math.abs(actor.bottom - surfaceTop(surface)) <= tolerance)
    .sort((a, b) => surfaceTop(a) - surfaceTop(b))[0];
}

/** Returns the nearest enabled surface below an actor for a contact shadow. */
export function findSurfaceBelow(
  actor: Pick<DepthActorGeometry, 'left' | 'right' | 'bottom'>,
  surfaces: readonly DepthSurfaceGeometry[],
  tolerance = 9
): DepthSurfaceGeometry | undefined {
  return surfaces
    .filter((surface) => surface.enabled && actor.right > surface.x - surface.width / 2 && actor.left < surface.x + surface.width / 2)
    .filter((surface) => surfaceTop(surface) >= actor.bottom - tolerance)
    .sort((a, b) => surfaceTop(a) - surfaceTop(b))[0];
}

export function isInPresentationWindow(x: number, center: number, viewportWidth = 640, padding = 120): boolean {
  return Math.abs(x - center) <= viewportWidth / 2 + padding;
}

export function reactionIntensity(horizontalSpeed: number, landing: boolean): number {
  const speed = Math.min(1, Math.abs(horizontalSpeed) / 300);
  return Math.min(1, (landing ? 0.7 : 0.35) + speed * (landing ? 0.3 : 0.25));
}

export function materialColor(material: DepthMaterial): number {
  return material === 'metal' ? 0xd9b86e : material === 'earth' ? 0x9db77f : 0x9fb8c2;
}
