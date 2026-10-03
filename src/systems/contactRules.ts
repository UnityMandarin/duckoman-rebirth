export interface ContactBounds { left: number; right: number; top: number; bottom: number; previousBottom: number; velocityY: number; }
export interface Rect { left: number; right: number; top: number; bottom: number; }
export interface Circle { x: number; y: number; radius: number; }
export interface Point { x: number; y: number; }
export interface Polygon { points: Point[]; }

function pointInPolygon(p: Point, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
}

/** Works for any simple polygon, convex or not. */
export function polygonIntersectsRect(points: readonly Point[], rect: Rect): boolean {
  if (points.some(p => p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom)) return true;
  const corners = [{ x: rect.left, y: rect.top }, { x: rect.right, y: rect.top }, { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }];
  if (corners.some(c => pointInPolygon(c, points))) return true;
  return points.some((a, i) => {
    const b = points[(i + 1) % points.length];
    return corners.some((c, k) => segmentsCross(a, b, c, corners[(k + 1) % 4]));
  });
}

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
