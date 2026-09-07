export interface ContactBounds { left: number; right: number; top: number; bottom: number; previousBottom: number; velocityY: number; }

export function isStomp(player: ContactBounds, enemy: Pick<ContactBounds, 'left' | 'right' | 'top'>, tolerance: number): boolean {
  const overlapsHorizontally = player.right > enemy.left && player.left < enemy.right;
  return player.velocityY > 0 && overlapsHorizontally && player.previousBottom <= enemy.top + tolerance;
}
