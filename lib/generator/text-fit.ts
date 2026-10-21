import { FONTS } from "./styles";

/**
 * Estime la plus grande taille de police (mm) permettant à un texte de tenir dans une boîte
 * sans déformation : on ne joue que sur la taille et le retour à la ligne, jamais sur l'échelle.
 */
export function fitText(
  text: string,
  font: string,
  boxW: number,
  boxH: number,
  opts: { maxLines?: number; uppercase?: boolean; lineHeight?: number; max?: number; letterSpacing?: number; weight?: number } = {},
): { fontSize: number; lines: string[] } {
  const maxLines = opts.maxLines ?? 2;
  const lh = opts.lineHeight ?? 1.05;
  // Les graisses fortes sont plus larges : +6 % par palier de 100 au-delà de 500.
  const weightK = 1 + Math.max(0, (opts.weight ?? 400) - 500) / 1600;
  const cw = (FONTS[font]?.charWidth ?? 0.6) * (opts.uppercase ? 1.12 : 1) * weightK;
  const words = (opts.uppercase ? text.toUpperCase() : text).split(/\s+/).filter(Boolean);
  let best = { fontSize: 2, lines: [text] };
  for (let size = Math.min(opts.max ?? 200, boxH); size >= 1.5; size -= 0.5) {
    const charW = size * cw + (opts.letterSpacing ?? 0);
    const maxChars = Math.max(1, Math.floor(boxW / charW));
    const lines: string[] = [];
    let cur = "";
    let ok = true;
    for (const w of words) {
      if (w.length > maxChars) { ok = false; break; }
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= maxChars) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (ok && lines.length <= maxLines && lines.length * size * lh <= boxH) return { fontSize: size, lines };
    best = { fontSize: size, lines };
  }
  return best;
}
