"use client";
import { useEffect, useState } from "react";
import type { DesignScene, Dieline } from "@/lib/types";
import { renderSceneToCanvas, type RenderOptions } from "@/lib/render/konva-scene";

const cache = new WeakMap<object, Map<string, string>>();
const EMPTY_SCENE: DesignScene = { id: "bare", name: "", style: "minimaliste", layout: "", palette: { name: "", background: "#fff", surface: "#fff", primary: "#000", secondary: "#000", accent: "#000", text: "#000", onPrimary: "#fff" }, fonts: { heading: "Inter", headingWeight: 700, body: "Inter", bodyWeight: 400 }, elements: [], createdAt: 0 };

export async function sceneDataUrl(scene: DesignScene | null, dieline: Dieline, opts: RenderOptions & { type?: string }): Promise<string> {
  const key = JSON.stringify({ ...opts, d: dieline.id });
  const owner = scene ?? dieline;
  let m = cache.get(owner);
  if (!m) { m = new Map(); cache.set(owner, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const canvas = await renderSceneToCanvas(scene ?? EMPTY_SCENE, dieline, opts);
  const url = canvas.toDataURL(opts.type ?? "image/png");
  m.set(key, url);
  return url;
}

/** Image rendue d'un design (ou du gabarit nu) appliqué sur le tracé de découpe. */
export function DesignImage({ scene, dieline, px = 2.5, showTech = false, showPanels = false, bare = false, highlight, className = "", alt }: {
  scene: DesignScene | null;
  dieline: Dieline;
  px?: number;
  showTech?: boolean;
  showPanels?: boolean;
  bare?: boolean;
  highlight?: string[];
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const hl = highlight?.join(",");
  useEffect(() => {
    let alive = true;
    sceneDataUrl(scene, dieline, { px, showTech, showPanels, bare: bare || !scene, highlight: hl ? hl.split(",") : undefined, maxWidthPx: 2600 })
      .then((u) => alive && setSrc(u))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [scene, dieline, px, showTech, showPanels, bare, hl]);
  if (!src) return <div className={`skeleton ${className}`} style={{ aspectRatio: `${dieline.widthMm} / ${dieline.heightMm}` }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? scene?.name ?? "Gabarit"} className={`block h-auto w-full ${className}`} draggable={false} />;
}
