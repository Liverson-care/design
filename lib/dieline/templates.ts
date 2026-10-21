import type { Pt, Segment } from "@/lib/types";
import type { RawDieline } from "./analyze";

export interface TemplateSpec {
  id: string;
  label: string;
  description: string;
  kind: "tuck" | "sleeve";
  length: number; // largeur de la face avant
  depth: number; // profondeur (côtés)
  height: number; // hauteur de la face avant
}

export const TEMPLATES: TemplateSpec[] = [
  { id: "etui-nuggets", label: "Étui nuggets", description: "Étui à pattes rentrantes 160 × 55 × 200 mm", kind: "tuck", length: 160, depth: 55, height: 200 },
  { id: "etui-pizza", label: "Étui pizza surgelée", description: "Étui plat 270 × 40 × 270 mm", kind: "tuck", length: 270, depth: 40, height: 270 },
  { id: "etui-quiche", label: "Étui quiche", description: "Étui 220 × 50 × 220 mm", kind: "tuck", length: 220, depth: 50, height: 220 },
  { id: "fourreau-plat", label: "Fourreau plat cuisiné", description: "Fourreau pour barquette 190 × 50 × 140 mm", kind: "sleeve", length: 190, depth: 50, height: 140 },
  { id: "etui-glace", label: "Étui bâtonnets glacés", description: "Étui 140 × 45 × 190 mm", kind: "tuck", length: 140, depth: 45, height: 190 },
];

const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({ a: { x: ax, y: ay }, b: { x: bx, y: by } });

/** Génère un tracé de découpe paramétrique (étui à pattes rentrantes inversées ou fourreau). */
export function buildTemplate(spec: TemplateSpec): RawDieline {
  const L = spec.length, W = spec.depth, H = spec.height;
  const glue = 15;
  const tuck = spec.kind === "tuck" ? 15 : 0;
  const dust = spec.kind === "tuck" ? Math.min(W * 0.8, L / 2) : 0;
  const lid = spec.kind === "tuck" ? W : 0;

  const yLidTop = tuck;
  const yRowTop = tuck + lid;
  const yRowBot = yRowTop + H;
  const yLidBot = yRowBot + lid;
  const yEnd = yLidBot + tuck;
  const xG = glue, xS1 = xG + L, xF = xS1 + W, xS2 = xF + L, xE = xS2 + W;

  const P: Pt[] = [];
  const add = (x: number, y: number) => P.push({ x, y });
  const folds: Segment[] = [];

  add(0, yRowTop + 6);
  add(xG, yRowTop);
  if (spec.kind === "tuck") {
    // Couvercle supérieur + languette, solidaires du dos
    add(xG, yLidTop);
    add(xG + 3, yLidTop); add(xG + 3, 5); add(xG + 8, 0); add(xS1 - 8, 0); add(xS1 - 3, 5); add(xS1 - 3, yLidTop);
    add(xS1, yLidTop);
    add(xS1, yRowTop);
    // Rabat anti-poussière côté 1
    add(xS1 + 1.5, yRowTop); add(xS1 + 1.5, yRowTop - dust); add(xF - W * 0.35, yRowTop - dust); add(xF - 1.5, yRowTop - dust * 0.4); add(xF - 1.5, yRowTop);
    add(xF, yRowTop);
    add(xS2, yRowTop);
    // Rabat anti-poussière côté 2
    add(xS2 + 1.5, yRowTop); add(xS2 + 1.5, yRowTop - dust * 0.4); add(xS2 + W * 0.35, yRowTop - dust); add(xE - 1.5, yRowTop - dust); add(xE - 1.5, yRowTop);
    add(xE, yRowTop);
    add(xE, yRowBot);
    add(xE - 1.5, yRowBot); add(xE - 1.5, yRowBot + dust); add(xS2 + W * 0.35, yRowBot + dust); add(xS2 + 1.5, yRowBot + dust * 0.4); add(xS2 + 1.5, yRowBot);
    add(xS2, yRowBot);
    // Couvercle inférieur, solidaire de la face avant (pattes inversées)
    add(xS2, yLidBot); add(xS2 - 3, yLidBot); add(xS2 - 3, yEnd - 5); add(xS2 - 8, yEnd); add(xF + 8, yEnd); add(xF + 3, yEnd - 5); add(xF + 3, yLidBot);
    add(xF, yLidBot);
    add(xF, yRowBot);
    add(xF - 1.5, yRowBot); add(xF - 1.5, yRowBot + dust * 0.4); add(xF - W * 0.35, yRowBot + dust); add(xS1 + 1.5, yRowBot + dust); add(xS1 + 1.5, yRowBot);
    add(xS1, yRowBot);

    folds.push(
      seg(xG, yRowTop, xS1, yRowTop), seg(xG + 3, yLidTop, xS1 - 3, yLidTop),
      seg(xS1 + 1.5, yRowTop, xF - 1.5, yRowTop), seg(xS2 + 1.5, yRowTop, xE - 1.5, yRowTop),
      seg(xS1 + 1.5, yRowBot, xF - 1.5, yRowBot), seg(xS2 + 1.5, yRowBot, xE - 1.5, yRowBot),
      seg(xF, yRowBot, xS2, yRowBot), seg(xF + 3, yLidBot, xS2 - 3, yLidBot),
    );
  } else {
    add(xE, yRowTop);
    add(xE, yRowBot);
  }
  add(xG, yRowBot);
  add(0, yRowBot - 6);
  add(0, yRowTop + 6);

  folds.push(seg(xG, yRowTop, xG, yRowBot), seg(xS1, yRowTop, xS1, yRowBot), seg(xF, yRowTop, xF, yRowBot), seg(xS2, yRowTop, xS2, yRowBot));

  return { name: spec.label, source: "template", cutPaths: [P], foldLines: folds };
}

/** Export SVG respectant les conventions d'atelier (découpe rouge continue, pli vert pointillé). */
export function rawToSvg(raw: RawDieline): string {
  const pts = [...raw.cutPaths.flat(), ...raw.foldLines.flatMap((s) => [s.a, s.b])];
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  const f = (n: number) => +n.toFixed(2);
  const cut = raw.cutPaths.map((p) => `M${p.map((q) => `${f(q.x)} ${f(q.y)}`).join(" L")}Z`).join(" ");
  const folds = raw.foldLines.map((s) => `<line x1="${f(s.a.x)}" y1="${f(s.a.y)}" x2="${f(s.b.x)}" y2="${f(s.b.y)}"/>`).join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${f(maxX)}mm" height="${f(maxY)}mm" viewBox="0 0 ${f(maxX)} ${f(maxY)}">
  <title>${raw.name} — tracé de découpe</title>
  <g id="Decoupe" fill="none" stroke="#e5262b" stroke-width="0.25">
    <path d="${cut}"/>
  </g>
  <g id="Rainage" fill="none" stroke="#14a44d" stroke-width="0.25" stroke-dasharray="3 2">
    ${folds}
  </g>
</svg>
`;
}
