import type { LineKind } from "@/lib/types";

/**
 * Classe un tracé du gabarit selon les conventions d'impression d'emballage :
 *  - nom de calque / d'objet explicite (découpe, pli, rainage, cut, crease, fold…)
 *  - trait pointillé  → pli / rainage
 *  - couleurs vert / bleu / cyan → pli ; rouge / magenta / noir → découpe
 */
export interface StrokeInfo {
  color: [number, number, number] | null; // RVB 0-255
  dashed: boolean;
  names: string[];
  hasStroke: boolean;
}

const CUT_NAMES = /(d[ée]coupe|coupe|cut|knife|cutting|contour|die)/i;
const FOLD_NAMES = /(pli|rainage|rainur|fold|crease|score|perf)/i;
const IGNORE_NAMES = /(fond.?perdu|bleed|s[ée]curit|safe|cote|dimension|texte|text|artwork|visuel|guide|rep[eè]re)/i;

export function classifyStroke(info: StrokeInfo): LineKind {
  if (!info.hasStroke) return "ignore";
  for (const n of info.names) {
    if (FOLD_NAMES.test(n)) return "fold";
    if (CUT_NAMES.test(n)) return "cut";
    if (IGNORE_NAMES.test(n)) return "ignore";
  }
  if (info.dashed) return "fold";
  if (info.color) {
    const [h, s, l] = rgbToHsl(...info.color);
    if (s > 0.25 && l > 0.15 && l < 0.85) {
      if (h >= 75 && h <= 260) return "fold";
      return "cut";
    }
    // gris clair : souvent un repère ou un fond perdu
    if (s <= 0.25 && l > 0.7) return "ignore";
  }
  return "cut";
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function parseCssColor(value: string | null | undefined): [number, number, number] | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "none" || v === "transparent") return null;
  const named: Record<string, [number, number, number]> = {
    black: [0, 0, 0], red: [255, 0, 0], green: [0, 128, 0], lime: [0, 255, 0], blue: [0, 0, 255],
    cyan: [0, 255, 255], magenta: [255, 0, 255], fuchsia: [255, 0, 255], white: [255, 255, 255],
    gray: [128, 128, 128], grey: [128, 128, 128], orange: [255, 165, 0],
  };
  if (named[v]) return named[v];
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as [number, number, number];
  m = v.match(/^#([0-9a-f]{6})/);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as [number, number, number];
  m = v.match(/^rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[ ,]+/).map((p) => (p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
    return [parts[0], parts[1], parts[2]];
  }
  return [0, 0, 0];
}
