// Génère les gabarits d'exemple (SVG + PDF) dans /public/mockups
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATES, buildTemplate, rawToSvg } from "../lib/dieline/templates";
import type { RawDieline } from "../lib/dieline/analyze";

const out = join(process.cwd(), "public", "mockups");
mkdirSync(out, { recursive: true });

/** PDF minimal (une page, traits vectoriels) pour tester l'import PDF / AI. */
function rawToPdf(raw: RawDieline): string {
  const pts = [...raw.cutPaths.flat(), ...raw.foldLines.flatMap((s) => [s.a, s.b])];
  const k = 72 / 25.4;
  const W = Math.max(...pts.map((p) => p.x)) * k;
  const H = Math.max(...pts.map((p) => p.y)) * k;
  const X = (x: number) => (x * k).toFixed(2);
  const Y = (y: number) => (H - y * k).toFixed(2);
  let s = "0.7 w\n0.898 0.149 0.169 RG\n[] 0 d\n";
  for (const p of raw.cutPaths) s += `${X(p[0].x)} ${Y(p[0].y)} m\n${p.slice(1).map((q) => `${X(q.x)} ${Y(q.y)} l`).join("\n")}\nh S\n`;
  s += "0.078 0.643 0.302 RG\n[8.5 5.7] 0 d\n";
  for (const f of raw.foldLines) s += `${X(f.a.x)} ${Y(f.a.y)} m ${X(f.b.x)} ${Y(f.b.y)} l S\n`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Contents 4 0 R >>`,
    `<< /Length ${s.length} >>\nstream\n${s}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

for (const spec of TEMPLATES) {
  const raw = buildTemplate(spec);
  writeFileSync(join(out, `${spec.id}.svg`), rawToSvg(raw));
  writeFileSync(join(out, `${spec.id}.pdf`), rawToPdf(raw), "latin1");
  console.log(`✓ ${spec.id}`);
}
