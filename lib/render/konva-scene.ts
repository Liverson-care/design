"use client";
import Konva from "konva";
import type { DesignElement, DesignScene, Dieline, Pt } from "@/lib/types";
import { findOutline } from "@/lib/dieline/analyze";
import { preloadScene } from "./assets";

export interface BuildOptions {
  px: number; // pixels par mm
  showTech?: boolean;
  showPanels?: boolean;
  interactive?: boolean;
  /** Affiche le gabarit nu (aperçu « avant ») */
  bare?: boolean;
  highlight?: string[];
}

function outlinePx(dieline: Dieline, px: number): Pt[] | null {
  const o = findOutline(dieline.cutPaths);
  return o ? o.map((p) => ({ x: p.x * px, y: p.y * px })) : null;
}

function clipPolygon(points: Pt[]) {
  return (ctx: Konva.Context) => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
}

/** Crée le nœud Konva d'un élément (taille en mm convertie en pixels). */
export function createNode(el: DesignElement, px: number, images: Map<string, HTMLImageElement>, interactive: boolean): Konva.Shape | null {
  const common = {
    id: el.id,
    name: "design-element",
    rotation: el.rotation,
    opacity: el.opacity ?? 1,
    listening: interactive && !el.locked,
    draggable: interactive && !el.locked,
  };
  switch (el.kind) {
    case "rect":
      return new Konva.Rect({
        ...common, x: el.x * px, y: el.y * px, width: el.w * px, height: el.h * px,
        fill: el.fill === "transparent" ? undefined : el.fill,
        stroke: el.stroke, strokeWidth: (el.strokeWidth ?? 0) * px, cornerRadius: (el.radius ?? 0) * px,
        strokeScaleEnabled: false,
      });
    case "ellipse":
      return new Konva.Ellipse({
        ...common, x: (el.x + el.w / 2) * px, y: (el.y + el.h / 2) * px, radiusX: (el.w / 2) * px, radiusY: (el.h / 2) * px,
        fill: el.fill === "transparent" ? undefined : el.fill, stroke: el.stroke, strokeWidth: (el.strokeWidth ?? 0) * px,
      });
    case "path":
      return new Konva.Path({
        ...common, x: el.x * px, y: el.y * px, data: el.data,
        scaleX: (el.w * px) / el.viewBox, scaleY: (el.h * px) / el.viewBox,
        fill: el.fill === "transparent" ? undefined : el.fill, stroke: el.stroke, strokeWidth: el.strokeWidth ?? 0,
        lineCap: "round", lineJoin: "round",
      });
    case "image": {
      const img = images.get(el.src);
      if (!img) return new Konva.Rect({ ...common, x: el.x * px, y: el.y * px, width: el.w * px, height: el.h * px, fill: "#00000010" });
      return new Konva.Image({ ...common, image: img, x: el.x * px, y: el.y * px, width: el.w * px, height: el.h * px });
    }
    case "text": {
      const text = el.uppercase ? el.text.toUpperCase() : el.text;
      const node = new Konva.Text({
        ...common, x: el.x * px, y: el.y * px, width: el.w * px, text,
        fontFamily: `"${el.fontFamily}", sans-serif`, fontSize: el.fontSize * px,
        fontStyle: `${el.italic ? "italic " : ""}${el.fontWeight}`, fill: el.fill, align: el.align,
        lineHeight: el.lineHeight ?? 1.1, letterSpacing: (el.letterSpacing ?? 0) * px,
        wrap: el.wrap ? "word" : "none",
      });
      // Ajustement automatique : la taille diminue si le texte déborde, sans jamais étirer les lettres.
      // (Konva tronque silencieusement les lignes trop longues en mode wrap « none » : on mesure sans largeur imposée.)
      if (!el.wrap) {
        const probe = new Konva.Text({ text, fontFamily: node.fontFamily(), fontSize: node.fontSize(), fontStyle: node.fontStyle(), letterSpacing: node.letterSpacing() });
        const natural = probe.getTextWidth();
        probe.destroy();
        const target = el.w * px;
        if (natural > target) {
          const k = (target / natural) * 0.995;
          node.fontSize(node.fontSize() * k);
          node.letterSpacing(node.letterSpacing() * k);
        }
        const expected = text.split("\n").map((l) => l.trim()).join("\n");
        let guard = 0;
        while (node.textArr.map((l) => l.text.trim()).join("\n") !== expected && guard++ < 25) {
          node.fontSize(node.fontSize() * 0.97);
          node.letterSpacing(node.letterSpacing() * 0.97);
        }
      } else {
        let guard = 0;
        while (node.height() > el.h * px * 1.08 && guard++ < 20) node.fontSize(node.fontSize() * 0.95);
      }
      return node;
    }
  }
}

/** Couche artistique : éléments détourés selon le contour de découpe, et regroupés par panneau. */
export function buildArtLayer(scene: DesignScene, dieline: Dieline, images: Map<string, HTMLImageElement>, opts: BuildOptions): Konva.Layer {
  const { px } = opts;
  const layer = new Konva.Layer({ name: "art" });
  const outline = outlinePx(dieline, px);
  const root = new Konva.Group(outline ? { clipFunc: clipPolygon(outline) } : {});
  layer.add(root);
  if (opts.bare) {
    root.add(new Konva.Rect({ x: 0, y: 0, width: dieline.widthMm * px, height: dieline.heightMm * px, fill: "#ffffff" }));
    return layer;
  }
  let container: Konva.Group = root;
  let currentPanel: string | undefined = "__none";
  for (const el of scene.elements) {
    if (el.panelId !== currentPanel) {
      currentPanel = el.panelId;
      const panel = dieline.panels.find((p) => p.id === el.panelId);
      container = panel
        ? new Konva.Group({ name: `panel-${panel.id}`, clip: { x: panel.x * px, y: panel.y * px, width: panel.w * px, height: panel.h * px } })
        : new Konva.Group();
      root.add(container);
    }
    const node = createNode(el, px, images, !!opts.interactive);
    if (!node) continue;
    if (opts.highlight?.includes(el.id)) {
      node.shadowColor("#ff2d55");
      node.shadowBlur(12);
      node.shadowOpacity(1);
    }
    container.add(node);
  }
  return layer;
}

/** Couche technique verrouillée : découpes (rouge), plis (pointillés verts), marges de sécurité. */
export function buildTechLayer(dieline: Dieline, opts: BuildOptions): Konva.Layer {
  const { px } = opts;
  const layer = new Konva.Layer({ name: "tech", listening: false });
  if (opts.showPanels) {
    for (const p of dieline.panels) {
      if (p.role === "glue") {
        layer.add(new Konva.Rect({ x: p.x * px, y: p.y * px, width: p.w * px, height: p.h * px, fill: "rgba(120,120,140,.18)" }));
      }
      const s = dieline.safeMarginMm;
      if (p.w > 2 * s && p.h > 2 * s) {
        layer.add(new Konva.Rect({ x: (p.x + s) * px, y: (p.y + s) * px, width: (p.w - 2 * s) * px, height: (p.h - 2 * s) * px, stroke: "rgba(104,71,255,.45)", strokeWidth: 1, dash: [4, 4] }));
      }
    }
  }
  for (const path of dieline.cutPaths) {
    layer.add(new Konva.Line({ points: path.flatMap((p) => [p.x * px, p.y * px]), stroke: "#e5262b", strokeWidth: Math.max(1, px * 0.3), lineJoin: "round" }));
  }
  for (const f of dieline.foldLines) {
    layer.add(new Konva.Line({ points: [f.a.x * px, f.a.y * px, f.b.x * px, f.b.y * px], stroke: "#14a44d", strokeWidth: Math.max(1, px * 0.25), dash: [px * 2.5, px * 1.5] }));
  }
  return layer;
}

export interface RenderOptions extends BuildOptions {
  watermark?: boolean;
  background?: string;
  maxWidthPx?: number;
}

/** Rend une scène dans un canvas hors écran (vignettes, exports, textures 3D). */
export async function renderSceneToCanvas(scene: DesignScene, dieline: Dieline, opts: RenderOptions): Promise<HTMLCanvasElement> {
  let px = opts.px;
  if (opts.maxWidthPx) px = Math.min(px, opts.maxWidthPx / dieline.widthMm);
  const images = await preloadScene(scene);
  const W = Math.ceil(dieline.widthMm * px), H = Math.ceil(dieline.heightMm * px);
  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width: W, height: H });
  try {
    if (opts.background) {
      const bg = new Konva.Layer({ listening: false });
      bg.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: opts.background }));
      stage.add(bg);
    }
    stage.add(buildArtLayer(scene, dieline, images, { ...opts, px, interactive: false }));
    if (opts.showTech) stage.add(buildTechLayer(dieline, { ...opts, px }));
    const canvas = stage.toCanvas({ pixelRatio: 1 });
    if (opts.watermark) drawWatermark(canvas);
    return canvas;
  } finally {
    stage.destroy();
  }
}

export function drawWatermark(canvas: HTMLCanvasElement, label = "PackAI Designer · version gratuite") {
  const ctx = canvas.getContext("2d")!;
  const size = Math.max(14, canvas.width / 38);
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#1b1b1f";
  ctx.font = `600 ${size}px Inter, sans-serif`;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 7);
  const stepX = size * 18, stepY = size * 5;
  const R = Math.hypot(canvas.width, canvas.height);
  for (let y = -R; y < R; y += stepY) {
    for (let x = -R + ((y / stepY) % 2) * (stepX / 2); x < R; x += stepX) ctx.fillText(label, x, y);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#ffffff";
  const bh = size * 1.8;
  ctx.fillRect(0, canvas.height - bh, canvas.width, bh);
  ctx.fillStyle = "#3b3b4c";
  ctx.font = `500 ${size * 0.7}px Inter, sans-serif`;
  ctx.fillText("Maquette basse définition — export HD, PDF CMJN et AI vectoriel disponibles avec PackAI Pro", size * 0.6, canvas.height - bh / 2 + size * 0.25);
  ctx.restore();
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export impossible"))), type, quality));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "design";
}
