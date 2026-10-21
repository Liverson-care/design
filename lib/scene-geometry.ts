import type { DesignElement, DesignScene } from "@/lib/types";
import { parseSvgPath } from "@/lib/dieline/svg-path";
import { pointInPolygon } from "@/lib/dieline/geometry";

export function elementCenter(el: DesignElement): { x: number; y: number } {
  const a = (el.rotation * Math.PI) / 180;
  const cx = el.w / 2, cy = el.h / 2;
  return { x: el.x + cx * Math.cos(a) - cy * Math.sin(a), y: el.y + cx * Math.sin(a) + cy * Math.cos(a) };
}

function covers(el: DesignElement, pt: { x: number; y: number }): boolean {
  if (el.kind === "text") return false;
  if (el.kind === "rect" && el.fill === "transparent") return false;
  if (el.kind === "path" && el.fill === "transparent") return false;
  if (el.opacity !== undefined && el.opacity < 0.5) return false;
  if (el.rotation) {
    const c = elementCenter(el);
    return Math.abs(pt.x - c.x) < el.w / 2 && Math.abs(pt.y - c.y) < el.h / 2;
  }
  if (pt.x < el.x || pt.x > el.x + el.w || pt.y < el.y || pt.y > el.y + el.h) return false;
  if (el.kind === "ellipse") {
    const rx = el.w / 2, ry = el.h / 2;
    return ((pt.x - el.x - rx) / rx) ** 2 + ((pt.y - el.y - ry) / ry) ** 2 <= 1;
  }
  if (el.kind === "path") {
    const local = { x: ((pt.x - el.x) / el.w) * el.viewBox, y: ((pt.y - el.y) / el.h) * el.viewBox };
    return parseSvgPath(el.data, 6).some((poly) => poly.length > 2 && pointInPolygon(local, poly));
  }
  return true;
}

/** Couleur (ou photo) située sous le centre d'un texte */
export function backgroundUnder(scene: Pick<DesignScene, "elements">, text: DesignElement): string | "photo" | null {
  const idx = scene.elements.indexOf(text);
  const pt = elementCenter(text);
  for (let i = idx - 1; i >= 0; i--) {
    const el = scene.elements[i];
    if (!covers(el, pt)) continue;
    if (el.kind === "image") return "photo";
    if ("fill" in el && el.fill !== "transparent") return el.fill;
  }
  return null;
}

