import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDieline } from "../lib/dieline/analyze";
import { TEMPLATES, buildTemplate } from "../lib/dieline/templates";
import { generateDesigns } from "../lib/generator/generate";
import { buildRange, suggestRangeNames } from "../lib/generator/range";
import { checkDesign, checkRange } from "../lib/gms/check";
import type { Brief } from "../lib/types";

const brief: Brief = {
  brandName: "Maison Dorée",
  productName: "Quiche Lorraine",
  category: "quiche",
  positioning: "familial",
  colors: ["#7a2e1d", "#f2c14e"],
  style: "gourmet",
  audience: "familles",
  country: "France",
  inspirations: [],
  constraints: "",
  netWeight: "400 g",
  benefit: "",
  storage: "surgele",
  gmsReference: "aucune",
};

for (const spec of TEMPLATES) {
  test(`5 designs distincts et conformes — ${spec.label}`, () => {
    const dieline = analyzeDieline(buildTemplate(spec));
    const before = JSON.stringify({ c: dieline.cutPaths, f: dieline.foldLines, p: dieline.panels });
    const designs = generateDesigns(dieline, brief, 5);
    assert.equal(designs.length, 5);
    assert.equal(JSON.stringify({ c: dieline.cutPaths, f: dieline.foldLines, p: dieline.panels }), before, "gabarit inchangé");
    assert.equal(new Set(designs.map((d) => d.layout)).size, 5, "5 dispositions");
    assert.ok(new Set(designs.map((d) => d.palette.primary + d.palette.background)).size >= 4, "palettes variées");
    assert.ok(new Set(designs.map((d) => d.fonts.heading)).size >= 2, "typographies variées");
    for (const d of designs) {
      const report = checkDesign(d, dieline, brief);
      const fails = report.items.filter((i) => i.status === "fail");
      assert.deepEqual(fails.map((f) => `${f.label}: ${f.detail}`), [], `${d.layout}`);
      assert.ok(report.score >= 70, `score ${report.score} (${d.layout})`);
    }
  });
}

test("gamme complète cohérente", () => {
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[2]));
  const [base] = generateDesigns(dieline, brief, 1);
  const names = suggestRangeNames(brief);
  assert.deepEqual(names, ["Quiche Saumon", "Quiche Épinards", "Quiche Fromage", "Quiche Thon"]);
  const range = buildRange(base, names);
  assert.equal(range.length, 5);
  const items = checkRange(range);
  assert.ok(items.every((i) => i.status !== "fail"), JSON.stringify(items));
  assert.ok(range[1].elements.some((e) => e.kind === "image" && e.libraryId === "saumon"));
});

test("couvercle solidaire du dos pivoté, dessous solidaire de la face non pivoté", async () => {
  const { hingedOnBack } = await import("../lib/generator/generate");
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const top = dieline.panels.find((p) => p.role === "top")!;
  const bottom = dieline.panels.find((p) => p.role === "bottom")!;
  assert.equal(hingedOnBack(top, dieline), true);
  assert.equal(hingedOnBack(bottom, dieline), false);
  const [d] = generateDesigns(dieline, brief, 1);
  const name = d.elements.find((e) => e.panelId === top.id && e.role === "productName")!;
  assert.equal(name.rotation, 180);
  assert.ok(d.elements.filter((e) => e.panelId === bottom.id && e.kind === "text").every((e) => e.rotation === 0));
});
