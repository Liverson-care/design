"use client";
import type { Pt, Segment } from "@/lib/types";
import type { RawDieline } from "./analyze";
import { classifyStroke, parseCssColor } from "./classify";
import { apply, type Mat } from "./geometry";
import { parseSvgPath } from "./svg-path";

const UNIT_MM: Record<string, number> = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, "": 25.4 / 96 };

function lengthToMm(v: string | null): number | null {
  if (!v) return null;
  const m = v.trim().match(/^([\d.]+)\s*([a-z%]*)$/i);
  if (!m || m[2] === "%") return null;
  return parseFloat(m[1]) * (UNIT_MM[m[2].toLowerCase()] ?? UNIT_MM.px);
}

/** Lit un gabarit SVG dans le navigateur et classe chaque tracé en découpe / pli. */
export async function parseSvgDieline(text: string, name: string): Promise<RawDieline> {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement as unknown as SVGSVGElement;
  if (root.nodeName.toLowerCase() !== "svg") throw new Error("Fichier SVG invalide.");

  const vb = (root.getAttribute("viewBox") ?? "").split(/[ ,]+/).map(Number);
  const widthMm = lengthToMm(root.getAttribute("width"));
  const vbW = vb.length === 4 ? vb[2] : null;
  // Échelle : unités utilisateur → mm
  const scale = widthMm && vbW ? widthMm / vbW : UNIT_MM.px;

  // Le SVG est monté hors écran pour bénéficier des styles calculés et des matrices de transformation.
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden;";
  const svg = document.importNode(root, true) as SVGSVGElement;
  if (vb.length === 4) {
    svg.setAttribute("width", String(vb[2]));
    svg.setAttribute("height", String(vb[3]));
  }
  host.appendChild(svg);
  document.body.appendChild(host);

  const cutPaths: Pt[][] = [];
  const foldLines: Segment[] = [];
  const warnings: string[] = [];
  try {
    const shapes = svg.querySelectorAll<SVGGraphicsElement>("path, line, polyline, polygon, rect");
    shapes.forEach((el) => {
      const style = getComputedStyle(el);
      const names: string[] = [];
      for (let n: Element | null = el; n && n !== svg; n = n.parentElement) {
        for (const attr of ["id", "class", "inkscape:label", "data-name"]) {
          const v = n.getAttribute(attr);
          if (v) names.push(v);
        }
      }
      const stroke = style.stroke;
      const kind = classifyStroke({
        color: parseCssColor(stroke),
        dashed: !!style.strokeDasharray && style.strokeDasharray !== "none",
        names,
        hasStroke: !!stroke && stroke !== "none",
      });
      if (kind === "ignore") return;

      const ctm = el.getCTM();
      const vbOffset: Mat = vb.length === 4 ? [1, 0, 0, 1, -vb[0], -vb[1]] : [1, 0, 0, 1, 0, 0];
      const m: Mat = ctm ? [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f] : [1, 0, 0, 1, 0, 0];
      const toMm = (p: Pt): Pt => {
        const q = apply(m, p);
        // getCTM inclut déjà la translation du viewBox ; on la neutralise si absente
        const r = ctm ? q : apply(vbOffset, q);
        return { x: r.x * scale, y: r.y * scale };
      };

      for (const sub of shapePaths(el)) {
        const pts = sub.map(toMm);
        if (kind === "cut") cutPaths.push(pts);
        else for (let i = 1; i < pts.length; i++) foldLines.push({ a: pts[i - 1], b: pts[i] });
      }
    });
  } finally {
    host.remove();
  }
  if (!widthMm) warnings.push("Unité absente dans le SVG : dimensions converties en supposant 96 px/pouce.");
  return { name, source: "svg", cutPaths, foldLines, warnings, originalPreview: svgToDataUrl(text) };
}

function shapePaths(el: SVGGraphicsElement): Pt[][] {
  const n = (a: string) => parseFloat(el.getAttribute(a) ?? "0");
  switch (el.tagName.toLowerCase()) {
    case "path":
      return parseSvgPath(el.getAttribute("d") ?? "");
    case "line":
      return [[{ x: n("x1"), y: n("y1") }, { x: n("x2"), y: n("y2") }]];
    case "rect": {
      const x = n("x"), y = n("y"), w = n("width"), h = n("height");
      return [[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]];
    }
    case "polyline":
    case "polygon": {
      const nums = (el.getAttribute("points") ?? "").trim().split(/[ ,]+/).map(Number);
      const pts: Pt[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
      if (el.tagName.toLowerCase() === "polygon" && pts.length) pts.push(pts[0]);
      return [pts];
    }
  }
  return [];
}

function svgToDataUrl(text: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
}
