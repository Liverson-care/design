"use client";
import type { Dieline, LabelMode, PackType } from "@/lib/types";
import { analyzeDieline } from "./analyze";

export const ACCEPTED = ".pdf,.ai,.svg,application/pdf,image/svg+xml,application/postscript,application/illustrator";

export async function importDielineFile(file: File, opts: { packType: PackType; labelMode?: LabelMode }): Promise<Dieline> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, "");
  if (ext === "svg" || file.type === "image/svg+xml") {
    const { parseSvgDieline } = await import("./parse-svg");
    return analyzeDieline(await parseSvgDieline(await file.text(), name), opts);
  }
  if (ext === "pdf" || ext === "ai") {
    const { parsePdfDieline } = await import("./parse-pdf");
    return analyzeDieline(await parsePdfDieline(await file.arrayBuffer(), name, ext), opts);
  }
  throw new Error("Format non pris en charge. Importez un fichier PDF, AI ou SVG.");
}
