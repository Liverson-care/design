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
