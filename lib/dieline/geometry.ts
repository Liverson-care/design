import type { Pt, Segment } from "@/lib/types";

export type Mat = [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** Composition m1 × m2 (convention PDF / SVG : [a b c d e f]) */
export function multiply(m1: Mat, m2: Mat): Mat {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function apply(m: Mat, p: Pt): Pt {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] };
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function bbox(points: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function polygonArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  }
  return Math.abs(a / 2);
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isClosed(path: Pt[], tol = 0.5): boolean {
  return path.length > 2 && dist(path[0], path[path.length - 1]) <= tol;
}

export function pathToSegments(path: Pt[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < path.length; i++) segs.push({ a: path[i - 1], b: path[i] });
  return segs;
}

export function pathLength(path: Pt[]): number {
  let l = 0;
  for (let i = 1; i < path.length; i++) l += dist(path[i - 1], path[i]);
  return l;
}

/**
 * Reconstitue des contours fermés à partir de segments épars
 * (les fichiers de découpe sont souvent exportés trait par trait).
 */
export function chainSegments(segments: Segment[], tol = 0.6): Pt[][] {
  const remaining = segments.slice();
  const chains: Pt[][] = [];
  while (remaining.length) {
    const first = remaining.pop()!;
    const chain: Pt[] = [first.a, first.b];
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const s = remaining[i];
        const head = chain[0];
        const tail = chain[chain.length - 1];
        if (dist(tail, s.a) <= tol) chain.push(s.b);
        else if (dist(tail, s.b) <= tol) chain.push(s.a);
        else if (dist(head, s.b) <= tol) chain.unshift(s.a);
        else if (dist(head, s.a) <= tol) chain.unshift(s.b);
        else continue;
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains;
}

export function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
