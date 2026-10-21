"use client";
import type { DesignScene, Dieline } from "@/lib/types";
import { canvasToBlob, downloadBlob, drawWatermark, renderSceneToCanvas, slug } from "@/lib/render/konva-scene";

/** Export gratuit : JPEG basse résolution (1 200 px max), avec filigrane léger. */
export async function exportFreeJpeg(scene: DesignScene, dieline: Dieline, brandName: string) {
  const canvas = await renderSceneToCanvas(scene, dieline, { px: 6, maxWidthPx: 1200, background: "#ffffff", showTech: true, watermark: true });
  downloadBlob(await canvasToBlob(canvas, "image/jpeg", 0.72), `${slug(brandName)}-${slug(scene.variantLabel ?? scene.name)}-a-plat.jpg`);
}

export async function exportMockup(snapshot: HTMLCanvasElement | null, scene: DesignScene, brandName: string) {
  if (!snapshot) return;
  const max = 1200;
  const k = Math.min(1, max / snapshot.width);
  const c = document.createElement("canvas");
  c.width = Math.round(snapshot.width * k);
  c.height = Math.round(snapshot.height * k);
  c.getContext("2d")!.drawImage(snapshot, 0, 0, c.width, c.height);
  drawWatermark(c);
  downloadBlob(await canvasToBlob(c, "image/jpeg", 0.75), `${slug(brandName)}-${slug(scene.variantLabel ?? scene.name)}-maquette-3d.jpg`);
}
