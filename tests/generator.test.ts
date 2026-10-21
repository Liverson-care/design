import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDieline } from "../lib/dieline/analyze";
import { TEMPLATES, buildTemplate } from "../lib/dieline/templates";
import { generateDesigns } from "../lib/generator/generate";
import { buildRange, suggestRangeNames } from "../lib/generator/range";
import { checkDesign, checkRange } from "../lib/gms/check";
import type { Brief } from "../lib/types";

const brief: Brief = {
  sector: "alimentaire",
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

const REFS = ["aucune", "picard", "findus", "marie", "fleury-michon", "carrefour"] as const;
for (const spec of TEMPLATES.filter((t) => t.kind === "tuck" || t.kind === "sleeve")) for (const gmsReference of REFS) {
  test(`5 designs distincts et conformes — ${spec.label} · ${gmsReference}`, () => {
    const dieline = analyzeDieline(buildTemplate(spec));
    const before = JSON.stringify({ c: dieline.cutPaths, f: dieline.foldLines, p: dieline.panels });
    const designs = generateDesigns(dieline, { ...brief, gmsReference }, 5);
    assert.equal(designs.length, 5);
    assert.equal(JSON.stringify({ c: dieline.cutPaths, f: dieline.foldLines, p: dieline.panels }), before, "gabarit inchangé");
    assert.equal(new Set(designs.map((d) => d.layout)).size, 5, "5 dispositions");
    assert.ok(new Set(designs.map((d) => d.palette.primary + d.palette.background)).size >= 4, "palettes variées");
    assert.ok(new Set(designs.map((d) => d.fonts.heading)).size >= 2, "typographies variées");
    for (const d of designs) {
      const report = checkDesign(d, dieline, { ...brief, gmsReference });
      const fails = report.items.filter((i) => i.status === "fail");
      assert.deepEqual(fails.map((f) => `${f.label}: ${f.detail}`), [], `${d.layout}`);
      assert.ok(report.score >= 70, `score ${report.score} (${d.layout})`);
    }
  });
}

import { SECTORS } from "../lib/sectors";

for (const sector of SECTORS) {
  test(`secteur ${sector.label} : mentions obligatoires présentes sur étui, étiquette et sachet`, () => {
    for (const id of ["etui-nuggets", "etiquette-bocal", "sachet-cafe"]) {
      const dieline = analyzeDieline(buildTemplate(TEMPLATES.find((t) => t.id === id)!));
      const c = sector.categories[0];
      const b: Brief = { ...brief, sector: sector.key, category: c.key, productName: c.label, storage: sector.defaultStorage as Brief["storage"], netWeight: "250 g" };
      for (const d of generateDesigns(dieline, b, 5)) {
        const legal = checkDesign(d, dieline, b).items.find((i) => i.id === "legal")!;
        assert.ok(!/Manquant/.test(legal.detail), `${id} · ${d.layout} : ${legal.detail}`);
        const fails = checkDesign(d, dieline, b).items.filter((i) => i.status === "fail");
        assert.deepEqual(fails.map((f) => f.label), [], `${id} · ${d.layout}`);
      }
    }
  });
}

test("packshot importé : utilisé comme visuel principal sans déformation", () => {
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const shot = "data:image/png;base64,AAAA";
  const [d] = generateDesigns(dieline, { ...brief, colors: [], packshot: shot, packshotAspect: 0.5, packshotColors: ["#123456", "#abcdef"] }, 1);
  const img = d.elements.find((e) => e.kind === "image" && e.src === shot)!;
  assert.ok(img, "packshot présent");
  assert.ok(Math.abs(img.w / img.h - 0.5) < 0.01, "proportions conservées");
  assert.equal(d.palette.primary, "#123456", "palette tirée du packshot");
});

test("médicament : braille et DCI", () => {
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const b: Brief = { ...brief, sector: "medicament", category: "antalgique", productName: "Algidol", netWeight: "16 comprimés" };
  const [d] = generateDesigns(dieline, b, 1);
  assert.ok(d.elements.some((e) => e.legalKey === "braille" && e.kind === "text" && /⠁⠇⠛⠊⠙⠕⠇/.test(e.text)));
  assert.ok(d.elements.some((e) => e.legalKey === "dci" && e.panelId === dieline.panels.find((p) => p.role === "front")!.id));
});

test("charte graphique : couleurs et polices imposées sur les 5 propositions", () => {
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const charter = { enabled: true, primary: "#004b87", secondary: "#e6eef6", accent: "#ffb81c", background: "#ffffff", headingFont: "Ma Police", bodyFont: "Inter", customFonts: [{ family: "Ma Police", src: "data:font/ttf;base64,AAAA" }] };
  const designs = generateDesigns(dieline, { ...brief, charter }, 5);
  for (const d of designs) {
    assert.equal(d.palette.primary, "#004b87");
    assert.equal(d.palette.accent, "#ffb81c");
    assert.equal(d.fonts.heading, "Ma Police");
    assert.deepEqual(d.fontFaces?.map((f) => f.family), ["Ma Police"]);
    const name = d.elements.find((e) => e.kind === "text" && e.role === "productName");
    assert.ok(name && name.kind === "text" && name.fontFamily === "Ma Police");
  }
  assert.equal(new Set(designs.map((d) => d.layout)).size, 5, "la mise en page varie toujours");
});

test("inspirations sombres : propositions sur fond sombre", async () => {
  const { luminance } = await import("../lib/color");
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const b: Brief = { ...brief, colors: [], style: "minimaliste", inspirationProfile: { colors: ["#c9a227", "#1d2d50"], lightness: 0.2, saturation: 0.4, useColors: true } };
  for (const d of generateDesigns(dieline, b, 3)) {
    assert.ok(luminance(d.palette.background) < 0.2, `fond ${d.palette.background}`);
    assert.ok([d.palette.primary, d.palette.accent].some((c) => ["#c9a227", "#1d2d50"].includes(c)), "palette issue des inspirations");
  }
});

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

test("logo obligatoire : présent partout, non déformé, contrôlé ; facultatif : alterné", () => {
  const dieline = analyzeDieline(buildTemplate(TEMPLATES[0]));
  const logo = "data:image/png;base64,LOGO";
  const b: Brief = { ...brief, brandLogo: logo, brandLogoAspect: 3, logoMode: "obligatoire" };
  for (const d of generateDesigns(dieline, b, 5)) {
    const logos = d.elements.filter((e) => e.kind === "image" && e.src === logo);
    assert.ok(logos.length >= 3, "face, dos, côté…");
    assert.ok(logos.every((e) => e.mandatory && Math.abs(e.w / e.h - 3) < 0.01), "proportions d'origine");
    const item = checkDesign(d, dieline, b).items.find((i) => i.id === "official-logo")!;
    assert.equal(item.status, "ok", item.detail);
  }
  const libre = generateDesigns(dieline, { ...b, logoMode: "libre" }, 2);
  assert.ok(libre[0].elements.some((e) => e.kind === "image" && e.src === logo));
  assert.ok(!libre[1].elements.some((e) => e.kind === "image" && e.src === logo), "logotype typographique sur la 2e proposition");
});
