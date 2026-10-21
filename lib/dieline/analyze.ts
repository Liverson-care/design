import type { Dieline, DielineSource, Panel, PanelRole, Pt, Segment } from "@/lib/types";
import { bbox, chainSegments, isClosed, pathToSegments, pointInPolygon, polygonArea, round } from "./geometry";

export interface RawDieline {
  name: string;
  source: DielineSource;
  cutPaths: Pt[][];
  foldLines: Segment[];
  originalPreview?: string;
  warnings?: string[];
  bleedMm?: number;
}

const AXIS_TOL = 0.35; // mm
const CLUSTER_TOL = 0.6; // mm

/**
 * Détecte automatiquement dimensions, zones imprimables (panneaux), plis et découpes.
 * La géométrie d'origine est conservée à l'identique (simple translation à l'origine).
 */
export function analyzeDieline(raw: RawDieline): Dieline {
  const warnings = [...(raw.warnings ?? [])];
  const allPts = [...raw.cutPaths.flat(), ...raw.foldLines.flatMap((s) => [s.a, s.b])];
  if (allPts.length < 3) throw new Error("Aucun tracé vectoriel exploitable n'a été trouvé dans ce fichier.");

  const b = bbox(raw.cutPaths.length ? raw.cutPaths.flat() : allPts);
  const shift = (p: Pt): Pt => ({ x: round(p.x - b.minX, 3), y: round(p.y - b.minY, 3) });
  const cutPaths = raw.cutPaths.map((p) => p.map(shift));
  const foldLines = raw.foldLines.map((s) => ({ a: shift(s.a), b: shift(s.b) }));
  const widthMm = b.maxX - b.minX;
  const heightMm = b.maxY - b.minY;

  const outline = findOutline(cutPaths);
  if (!outline) {
    warnings.push("Contour de découpe non fermé : la surface imprimable a été estimée par le rectangle englobant.");
  }
  const poly = outline ?? [
    { x: 0, y: 0 }, { x: widthMm, y: 0 }, { x: widthMm, y: heightMm }, { x: 0, y: heightMm },
  ];

  const panels = detectPanels(poly, cutPaths, foldLines, widthMm, heightMm);
  assignRoles(panels);
  if (!foldLines.length) warnings.push("Aucune ligne de pli détectée : le gabarit est traité comme une étiquette à plat.");
  if (!panels.some((p) => p.role === "front")) warnings.push("Face avant non identifiée : vérifiez l'attribution des panneaux.");

  return {
    id: `dl_${Math.random().toString(36).slice(2, 10)}`,
    name: raw.name,
    source: raw.source,
    widthMm: round(widthMm, 1),
    heightMm: round(heightMm, 1),
    cutPaths,
    foldLines,
    panels,
    bleedMm: raw.bleedMm ?? 3,
    safeMarginMm: 3,
    box: boxDimensions(panels),
    originalPreview: raw.originalPreview,
    warnings,
  };
}

export function findOutline(cutPaths: Pt[][]): Pt[] | null {
  let closed = cutPaths.filter((p) => isClosed(p));
  if (!closed.length) {
    closed = chainSegments(cutPaths.flatMap(pathToSegments)).filter((p) => isClosed(p, 1));
  }
  if (!closed.length) return null;
  return closed.reduce((best, p) => (polygonArea(p) > polygonArea(best) ? p : best));
}

function cluster(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (!out.length || v - out[out.length - 1] > CLUSTER_TOL) out.push(v);
  }
  return out;
}

type Axis = { pos: number; from: number; to: number };

function axisSegments(segs: Segment[]): { vertical: Axis[]; horizontal: Axis[] } {
  const vertical: Axis[] = [];
  const horizontal: Axis[] = [];
  for (const s of segs) {
    const dx = Math.abs(s.a.x - s.b.x), dy = Math.abs(s.a.y - s.b.y);
    if (dx < AXIS_TOL && dy > 1) vertical.push({ pos: (s.a.x + s.b.x) / 2, from: Math.min(s.a.y, s.b.y), to: Math.max(s.a.y, s.b.y) });
    else if (dy < AXIS_TOL && dx > 1) horizontal.push({ pos: (s.a.y + s.b.y) / 2, from: Math.min(s.a.x, s.b.x), to: Math.max(s.a.x, s.b.x) });
  }
  return { vertical, horizontal };
}

function coverage(list: Axis[], pos: number, from: number, to: number): number {
  let covered = 0;
  for (const s of list) {
    if (Math.abs(s.pos - pos) > CLUSTER_TOL) continue;
    covered += Math.max(0, Math.min(to, s.to) - Math.max(from, s.from));
  }
  return covered / (to - from);
}

export function detectPanels(poly: Pt[], cutPaths: Pt[][], folds: Segment[], W: number, H: number): Panel[] {
  const cutSegs = cutPaths.flatMap(pathToSegments);
  const sep = axisSegments([...folds, ...cutSegs]);
  const xs = cluster([0, W, ...sep.vertical.map((s) => s.pos)]);
  const ys = cluster([0, H, ...sep.horizontal.map((s) => s.pos)]);
  const nx = xs.length - 1, ny = ys.length - 1;

  const inside: boolean[] = new Array(nx * ny).fill(false);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const c = { x: (xs[i] + xs[i + 1]) / 2, y: (ys[j] + ys[j + 1]) / 2 };
      inside[j * nx + i] = xs[i + 1] - xs[i] > 0.2 && ys[j + 1] - ys[j] > 0.2 && pointInPolygon(c, poly);
    }

  const parent = inside.map((_, k) => k);
  const find = (k: number): number => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!inside[k]) continue;
      if (i + 1 < nx && inside[k + 1] && coverage(sep.vertical, xs[i + 1], ys[j], ys[j + 1]) < 0.5) union(k, k + 1);
      if (j + 1 < ny && inside[k + nx] && coverage(sep.horizontal, ys[j + 1], xs[i], xs[i + 1]) < 0.5) union(k, k + nx);
    }

  const regions = new Map<number, { minX: number; minY: number; maxX: number; maxY: number; area: number }>();
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (!inside[k]) continue;
      const r = find(k);
      const cur = regions.get(r) ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, area: 0 };
      cur.minX = Math.min(cur.minX, xs[i]);
      cur.maxX = Math.max(cur.maxX, xs[i + 1]);
      cur.minY = Math.min(cur.minY, ys[j]);
      cur.maxY = Math.max(cur.maxY, ys[j + 1]);
      cur.area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      regions.set(r, cur);
    }

  const total = polygonArea(poly);
  return [...regions.values()]
    .filter((r) => r.area > total * 0.004)
    .sort((a, b) => a.minY - b.minY || a.minX - b.minX)
    .map((r, idx) => ({
      id: `p${idx + 1}`,
      role: "flap" as PanelRole,
      x: round(r.minX, 2),
      y: round(r.minY, 2),
      w: round(r.maxX - r.minX, 2),
      h: round(r.maxY - r.minY, 2),
    }));
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/** Attribue un rôle (face avant, dos, côtés, dessus, dessous, rabats, patte de collage). */
export function assignRoles(panels: Panel[]): void {
  if (!panels.length) return;
  const biggest = panels.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b));
  if (panels.length === 1) { biggest.role = "front"; return; }

  let row = panels
    .filter((p) => near(p.y, biggest.y, 2) && near(p.h, biggest.h, 2))
    .sort((a, b) => a.x - b.x);

  // Patte de collage : extrémité étroite de la rangée principale
  const isGlueCandidate = (p: Panel) => p.w < Math.min(30, biggest.w * 0.35);
  if (row.length >= 5) {
    const glue = row[0].w <= row[row.length - 1].w ? row[0] : row[row.length - 1];
    glue.role = "glue";
    row = row.filter((p) => p !== glue);
  } else if (row.length >= 2) {
    const ends = [row[0], row[row.length - 1]].filter(isGlueCandidate);
    if (ends.length === 1 && !(row.length === 4 && near(row[0].w, row[2].w, 2) && near(row[1].w, row[3].w, 2))) {
      ends[0].role = "glue";
      row = row.filter((p) => p !== ends[0]);
    }
  }

  const attached = (panel: Panel, side: "above" | "below") =>
    panels.filter(
      (p) =>
        p !== panel &&
        p.x >= panel.x - 2 &&
        p.x + p.w <= panel.x + panel.w + 2 &&
        (side === "above" ? near(p.y + p.h, panel.y, 1) : near(p.y, panel.y + panel.h, 1)),
    );

  let front: Panel = biggest;
  let back: Panel | undefined;
  let left: Panel | undefined;
  let right: Panel | undefined;

  if (row.length === 4) {
    const pairA = [row[0], row[2]], pairB = [row[1], row[3]];
    const large = pairA[0].w + pairA[1].w >= pairB[0].w + pairB[1].w ? pairA : pairB;
    const small = large === pairA ? pairB : pairA;
    // Le couvercle (rabat de fermeture) est solidaire du dos : la face sans couvercle au-dessus est la face avant.
    const lidAbove = large.map((p) => attached(p, "above").some((a) => near(a.w, p.w, p.w * 0.12)));
    const fi = lidAbove[0] && !lidAbove[1] ? 1 : lidAbove[1] && !lidAbove[0] ? 0 : 1;
    front = large[fi];
    back = large[1 - fi];
    const idx = row.indexOf(front);
    left = row[(idx + 3) % 4];
    right = row[(idx + 1) % 4];
    if (!small.includes(left) || !small.includes(right)) { left = small[0]; right = small[1]; }
  } else if (row.length >= 2) {
    const sorted = [...row].sort((a, b) => b.w - a.w);
    front = sorted[0];
    back = sorted[1] && near(sorted[1].w, front.w, front.w * 0.1) ? sorted[1] : undefined;
  }

  front.role = "front";
  if (back) back.role = "back";
  if (left) left.role = "left";
  if (right) right.role = "right";

  const depth = left?.w ?? right?.w;
  const lidCandidates = (side: "above" | "below") =>
    [front, back]
      .filter(Boolean)
      .flatMap((p) => attached(p!, side))
      .filter((a) => near(a.w, front.w, front.w * 0.12))
      .sort((a, b) => (depth ? Math.abs(a.h - depth) - Math.abs(b.h - depth) : b.h - a.h));
  const top = lidCandidates("above")[0];
  const bottom = lidCandidates("below")[0];
  if (top && top.role === "flap") top.role = "top";
  if (bottom && bottom.role === "flap") bottom.role = "bottom";
}

export function boxDimensions(panels: Panel[]): Dieline["box"] {
  const front = panels.find((p) => p.role === "front") ?? panels[0];
  const side = panels.find((p) => p.role === "left" || p.role === "right");
  const lid = panels.find((p) => p.role === "top" || p.role === "bottom");
  const depth = side?.w ?? lid?.h ?? Math.max(2, Math.min(front?.w ?? 100, front?.h ?? 100) * 0.06);
  return { lengthMm: round(front?.w ?? 100, 1), heightMm: round(front?.h ?? 100, 1), depthMm: round(depth, 1) };
}

export const ROLE_LABELS: Record<PanelRole, string> = {
  front: "Face avant",
  back: "Dos",
  left: "Côté gauche",
  right: "Côté droit",
  top: "Dessus",
  bottom: "Dessous",
  flap: "Rabat",
  glue: "Patte de collage",
};

/** Surface imprimable utile (hors patte de collage), en cm² */
export function printableAreaCm2(d: Dieline): number {
  return round(d.panels.filter((p) => p.role !== "glue").reduce((s, p) => s + p.w * p.h, 0) / 100, 0);
}

export function cutLengthMm(d: Dieline): number {
  return round(d.cutPaths.reduce((s, p) => s + p.slice(1).reduce((l, q, i) => l + Math.hypot(q.x - p[i].x, q.y - p[i].y), 0), 0), 0);
}
