export interface ContactBounds { left: number; right: number; top: number; bottom: number; previousBottom: number; velocityY: number; }
export interface Rect { left: number; right: number; top: number; bottom: number; }
export interface Circle { x: number; y: number; radius: number; }

export function circleIntersectsRect(circle: Circle, rect: Rect): boolean {
  const dx = circle.x - Math.max(rect.left, Math.min(circle.x, rect.right));
  const dy = circle.y - Math.max(rect.top, Math.min(circle.y, rect.bottom));
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function enemyContact(dashing:boolean,pointed:boolean,stomping:boolean):'dash'|'stomp'|'damage' {
  if(dashing)return 'dash';
  return stomping&&!pointed?'stomp':'damage';
}

export function isStomp(player: ContactBounds, enemy: Pick<ContactBounds, 'left' | 'right' | 'top'>, tolerance: number): boolean {
  const overlapsHorizontally = player.right > enemy.left && player.left < enemy.right;
  return player.velocityY > 0 && overlapsHorizontally && player.previousBottom <= enemy.top + tolerance;
}
