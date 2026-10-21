import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDieline } from "../lib/dieline/analyze";
import { TEMPLATES, buildTemplate } from "../lib/dieline/templates";
import { parseSvgPath } from "../lib/dieline/svg-path";
import { classifyStroke } from "../lib/dieline/classify";

for (const spec of TEMPLATES) {
  test(`détection des panneaux — ${spec.label}`, () => {
    const d = analyzeDieline(buildTemplate(spec));
    const role = (r: string) => d.panels.filter((p) => p.role === r);
    assert.equal(role("front").length, 1, "une face avant");
    assert.equal(role("back").length, 1, "un dos");
    assert.equal(role("left").length, 1);
    assert.equal(role("right").length, 1);
    assert.equal(role("glue").length, 1);
    const front = role("front")[0];
    assert.ok(Math.abs(front.w - spec.length) < 0.5, `largeur face ${front.w}`);
    assert.ok(Math.abs(front.h - spec.height) < 0.5, `hauteur face ${front.h}`);
    assert.equal(d.box.depthMm, spec.depth);
    if (spec.kind === "tuck") {
      assert.equal(role("top").length, 1, "dessus");
      assert.equal(role("bottom").length, 1, "dessous");
      assert.ok(Math.abs(role("top")[0].h - spec.depth) < 0.5);
    }
  });
}

test("analyse des chemins SVG (lignes, courbes, arcs, relatif)", () => {
  const [p] = parseSvgPath("M0 0 h10 v10 H0 z");
  assert.deepEqual(p.at(-1), { x: 0, y: 0 });
  assert.equal(p.length, 5);
  const [arc] = parseSvgPath("M0 0 A10 10 0 0 1 20 0");
  assert.ok(Math.abs(arc.at(-1)!.x - 20) < 1e-6);
  assert.ok(arc.some((q) => q.y < -9), "l'arc passe par le sommet");
  const [c] = parseSvgPath("m5 5 c0 10 10 10 10 0");
  assert.ok(Math.abs(c.at(-1)!.x - 15) < 1e-6);
});

test("classification des traits", () => {
  assert.equal(classifyStroke({ color: [229, 38, 43], dashed: false, names: [], hasStroke: true }), "cut");
  assert.equal(classifyStroke({ color: [20, 164, 77], dashed: false, names: [], hasStroke: true }), "fold");
  assert.equal(classifyStroke({ color: [0, 0, 0], dashed: true, names: [], hasStroke: true }), "fold");
  assert.equal(classifyStroke({ color: [0, 0, 0], dashed: false, names: ["Rainage"], hasStroke: true }), "fold");
  assert.equal(classifyStroke({ color: [0, 0, 0], dashed: false, names: ["Fond perdu"], hasStroke: true }), "ignore");
});
