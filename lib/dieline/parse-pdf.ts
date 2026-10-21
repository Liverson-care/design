"use client";
import type { Pt, Segment } from "@/lib/types";
import type { RawDieline } from "./analyze";
import { classifyStroke } from "./classify";
import { apply, multiply, type Mat } from "./geometry";

const PT_TO_MM = 25.4 / 72;

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;

async function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      return lib;
    });
  }
  return pdfjsPromise;
}

interface GState {
  ctm: Mat;
  stroke: [number, number, number] | null;
  dashed: boolean;
}

/**
 * Lit un gabarit PDF ou Illustrator (.ai enregistré avec compatibilité PDF) avec PDF.js :
 * on rejoue la liste d'opérateurs de la page pour récupérer les tracés vectoriels,
 * leur couleur de contour, leurs pointillés et le nom de leur calque.
 */
export async function parsePdfDieline(data: ArrayBuffer, name: string, source: "pdf" | "ai"): Promise<RawDieline> {
  const head = new TextDecoder().decode(new Uint8Array(data.slice(0, 1024)));
  if (!head.includes("%PDF")) {
    throw new Error(
      source === "ai"
        ? "Ce fichier .ai n'est pas compatible PDF. Dans Illustrator, enregistrez-le avec l'option « Créer un fichier compatible PDF »."
        : "Fichier PDF invalide.",
    );
  }
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList();
  const oc = await doc.getOptionalContentConfig().catch(() => null);
  const OPS = pdfjs.OPS;

  const cutPaths: Pt[][] = [];
  const foldLines: Segment[] = [];
  const warnings: string[] = [];

  const base: Mat = viewport.transform as Mat; // retourne l'axe Y et place l'origine en haut à gauche
  let state: GState = { ctm: [1, 0, 0, 1, 0, 0], stroke: [0, 0, 0], dashed: false };
  const stack: GState[] = [];
  const layerStack: string[] = [];
  let current: Pt[][] = [];

  const toMm = (x: number, y: number): Pt => {
    const p = apply(multiply(base, state.ctm), { x, y });
    return { x: p.x * PT_TO_MM, y: p.y * PT_TO_MM };
  };

  const commit = (stroked: boolean) => {
    if (stroked && current.length) {
      const kind = classifyStroke({ color: state.stroke, dashed: state.dashed, names: [...layerStack], hasStroke: true });
      for (const sub of current) {
        if (sub.length < 2) continue;
        if (kind === "cut") cutPaths.push(sub);
        else if (kind === "fold") for (let i = 1; i < sub.length; i++) foldLines.push({ a: sub[i - 1], b: sub[i] });
      }
    }
    current = [];
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    switch (fn) {
      case OPS.save:
        stack.push({ ...state });
        break;
      case OPS.restore:
        state = stack.pop() ?? state;
        break;
      case OPS.transform:
        state = { ...state, ctm: multiply(state.ctm, args as Mat) };
        break;
      case OPS.setStrokeRGBColor:
        state = { ...state, stroke: [args[0], args[1], args[2]] };
        break;
      case OPS.setStrokeGray:
        state = { ...state, stroke: [args[0] * 255, args[0] * 255, args[0] * 255] };
        break;
      case OPS.setDash:
        state = { ...state, dashed: Array.isArray(args[0]) && args[0].length > 0 };
        break;
      case OPS.beginMarkedContentProps: {
        let label = String(args[0] ?? "");
        const props = args[1] as { type?: string; id?: string } | null;
        if (props?.type === "OCG" && props.id && oc) {
          const group = oc.getGroup(props.id) as { name?: string } | null;
          if (group?.name) label = group.name;
        }
        layerStack.push(label);
        break;
      }
      case OPS.beginMarkedContent:
        layerStack.push(String(args[0] ?? ""));
        break;
      case OPS.endMarkedContent:
        layerStack.pop();
        break;
      case OPS.constructPath: {
        const [subOps, coords] = args as [number[], number[]];
        let c = 0;
        let sub: Pt[] = [];
        let last = { x: 0, y: 0 };
        const start = () => { if (sub.length > 1) current.push(sub); };
        for (const op of subOps) {
          if (op === OPS.moveTo) {
            start();
            last = { x: coords[c++], y: coords[c++] };
            sub = [toMm(last.x, last.y)];
          } else if (op === OPS.lineTo) {
            last = { x: coords[c++], y: coords[c++] };
            sub.push(toMm(last.x, last.y));
          } else if (op === OPS.curveTo || op === OPS.curveTo2 || op === OPS.curveTo3) {
            let c1: Pt, c2: Pt, e: Pt;
            if (op === OPS.curveTo) {
              c1 = { x: coords[c++], y: coords[c++] };
              c2 = { x: coords[c++], y: coords[c++] };
              e = { x: coords[c++], y: coords[c++] };
            } else if (op === OPS.curveTo2) {
              c1 = last;
              c2 = { x: coords[c++], y: coords[c++] };
              e = { x: coords[c++], y: coords[c++] };
            } else {
              c1 = { x: coords[c++], y: coords[c++] };
              e = { x: coords[c++], y: coords[c++] };
              c2 = e;
            }
            for (let k = 1; k <= 10; k++) {
              const t = k / 10, mt = 1 - t;
              sub.push(toMm(
                mt ** 3 * last.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * e.x,
                mt ** 3 * last.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * e.y,
              ));
            }
            last = e;
          } else if (op === OPS.rectangle) {
            start();
            const x = coords[c++], y = coords[c++], w = coords[c++], h = coords[c++];
            sub = [toMm(x, y), toMm(x + w, y), toMm(x + w, y + h), toMm(x, y + h), toMm(x, y)];
            last = { x, y };
          } else if (op === OPS.closePath) {
            if (sub.length) sub.push(sub[0]);
          }
        }
        start();
        sub = [];
        break;
      }
      case OPS.stroke:
      case OPS.closeStroke:
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
      case OPS.closeEOFillStroke:
        commit(true);
        break;
      case OPS.fill:
      case OPS.eoFill:
      case OPS.endPath:
        commit(false);
        break;
    }
  }

  // Aperçu « avant » : rendu raster de la page d'origine
  let originalPreview: string | undefined;
  try {
    const scale = Math.min(3, 1600 / viewport.width);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    originalPreview = canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    warnings.push("Aperçu du fichier d'origine indisponible.");
  }

  if (doc.numPages > 1) warnings.push(`Le document contient ${doc.numPages} pages : seule la première a été analysée.`);
  return { name, source, cutPaths, foldLines, warnings, originalPreview };
}
