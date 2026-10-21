"use client";
import type { DesignScene } from "@/lib/types";

const images = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image introuvable : ${src.slice(0, 60)}`));
      img.src = src;
    });
    images.set(src, p);
    p.catch(() => images.delete(src));
  }
  return p;
}

const loadedFonts = new Set<string>();

/** Attend le chargement des polices de la scène avant de dessiner (sinon Konva mesure avec la police de repli). */
export async function ensureFonts(scene: DesignScene): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const wanted = new Set<string>();
  for (const el of scene.elements) {
    if (el.kind === "text") wanted.add(`${el.italic ? "italic " : ""}${el.fontWeight} 20px "${el.fontFamily}"`);
  }
  await Promise.all(
    [...wanted].filter((f) => !loadedFonts.has(f)).map((f) =>
      document.fonts.load(f).then(() => loadedFonts.add(f)).catch(() => undefined),
    ),
  );
}

export async function preloadScene(scene: DesignScene): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all([
    ensureFonts(scene),
    ...scene.elements.map(async (el) => {
      if (el.kind !== "image") return;
      try { map.set(el.src, await loadImage(el.src)); } catch { /* image manquante : ignorée */ }
    }),
  ]);
  return map;
}
