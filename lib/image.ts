"use client";
import { rgbToHex } from "@/lib/color";
import { rgbToHsl } from "@/lib/dieline/classify";

/** Lit une image et la redimensionne (les logos et inspirations n'ont pas besoin d'être énormes). */
export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.onload = () => {
      const src = String(reader.result);
      if (file.type === "image/svg+xml") return resolve(src);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.88));
      };
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/** Extrait les couleurs dominantes (saturées) d'une image d'inspiration. */
export function dominantColors(src: string, count = 4): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 48, 48);
      const data = ctx.getImageData(0, 0, 48, 48).data;
      const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const [, s, l] = rgbToHsl(r, g, b);
        if (l > 0.94 || l < 0.06) continue;
        const k = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const bk = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
        const w = 1 + s * 2;
        bk.n += w; bk.r += r * w; bk.g += g * w; bk.b += b * w;
        buckets.set(k, bk);
      }
      resolve([...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count).map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n)));
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

export interface Packshot {
  src: string;
  aspect: number;
  colors: string[];
  removedBackground: boolean;
}

/**
 * Prépare un packshot : redimensionnement, détourage automatique d'un fond uni (studio blanc ou couleur)
 * par propagation depuis les bords, recadrage sur le produit, puis extraction des couleurs dominantes.
 * Un PNG déjà transparent est conservé tel quel.
 */
export async function preparePackshot(file: File, removeBackground = true): Promise<Packshot> {
  const src = await fileToDataUrl(file, 1600);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible")); i.src = src; });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const W = c.width, H = c.height;
  const data = ctx.getImageData(0, 0, W, H);
  const px = data.data;
  const alphaAlready = (() => { for (let i = 3; i < px.length; i += 4 * 97) if (px[i] < 250) return true; return false; })();
  let removed = false;
  if (removeBackground && !alphaAlready) {
    // Couleur de fond = médiane des pixels de bordure ; on n'agit que si la bordure est homogène.
    const border: number[][] = [];
    for (let x = 0; x < W; x += 4) { border.push(rgbAt(px, W, x, 0), rgbAt(px, W, x, H - 1)); }
    for (let y = 0; y < H; y += 4) { border.push(rgbAt(px, W, 0, y), rgbAt(px, W, W - 1, y)); }
    const med = [0, 1, 2].map((k) => border.map((b) => b[k]).sort((a, b) => a - b)[border.length >> 1]);
    const spread = border.filter((b) => dist3(b, med) > 40).length / border.length;
    if (spread < 0.25) {
      const tol = 38;
      // Parcours en largeur avec file typée : chaque pixel n'est visité qu'une fois (mémoire bornée).
      const queued = new Uint8Array(W * H);
      const queue = new Int32Array(W * H);
      let head = 0, tail = 0;
      const push = (i: number) => { if (!queued[i]) { queued[i] = 1; queue[tail++] = i; } };
      for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
      while (head < tail) {
        const i = queue[head++];
        const o = i * 4;
        const d = dist3([px[o], px[o + 1], px[o + 2]], med);
        if (d > tol) continue;
        // Bord adouci : alpha proportionnel à l'écart avec le fond
        px[o + 3] = d < tol * 0.55 ? 0 : Math.round(((d - tol * 0.55) / (tol * 0.45)) * 255);
        const x = i % W;
        if (x > 0) push(i - 1);
        if (x < W - 1) push(i + 1);
        if (i >= W) push(i - W);
        if (i < W * (H - 1)) push(i + W);
      }
      ctx.putImageData(data, 0, 0);
      removed = true;
    }
  }
  // Recadrage sur la zone opaque
  let minX = W, minY = H, maxX = 0, maxY = 0;
  const after = ctx.getImageData(0, 0, W, H).data;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (after[(y * W + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX <= minX || maxY <= minY) { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  const result = out.toDataURL("image/png");
  return { src: result, aspect: out.width / out.height, colors: await dominantColors(result, 3), removedBackground: removed };
}

function rgbAt(px: Uint8ClampedArray, W: number, x: number, y: number): number[] {
  const o = (y * W + x) * 4;
  return [px[o], px[o + 1], px[o + 2]];
}

function dist3(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Analyse un lot de designs d'inspiration : couleurs dominantes communes et ambiance (luminosité, saturation). */
export async function analyzeInspirations(srcs: string[]): Promise<{ colors: string[]; lightness: number; saturation: number }> {
  const stats = await Promise.all(srcs.map((src) => new Promise<{ l: number; s: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 40;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 40, 40);
      const d = ctx.getImageData(0, 0, 40, 40).data;
      let l = 0, sat = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const [, hs, hl] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        l += hl; sat += hs; n++;
      }
      resolve({ l: n ? l / n : 0.5, s: n ? sat / n : 0.3 });
    };
    img.onerror = () => resolve({ l: 0.5, s: 0.3 });
    img.src = src;
  })));
  const colors = (await Promise.all(srcs.map((s) => dominantColors(s, 3)))).flat();
  // Couleurs récurrentes en tête, puis dédoublonnage approximatif
  const uniq: string[] = [];
  for (const c of colors) if (!uniq.some((u) => colorGap(u, c) < 40)) uniq.push(c);
  const n = Math.max(1, stats.length);
  return { colors: uniq.slice(0, 4), lightness: stats.reduce((a, b) => a + b.l, 0) / n, saturation: stats.reduce((a, b) => a + b.s, 0) / n };
}

function colorGap(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
