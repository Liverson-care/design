import type { Brief, DesignScene, ImageElement, TextElement } from "@/lib/types";
import { bestTextOn, contrastRatio, hashString, hexToRgb } from "@/lib/color";
import { LIBRARY, matchIngredient } from "@/lib/library";
import { CATEGORY_LABELS } from "./copy";
import { fitText } from "./text-fit";

const FLAVORS: Record<Brief["category"], string[]> = {
  quiche: ["Saumon", "Épinards", "Fromage", "Thon", "Lorraine", "Champignons"],
  pizza: ["Margherita", "4 Fromages", "Jambon Champignons", "Thon", "Légumes grillés"],
  poisson: ["Saumon", "Thon", "Cabillaud citron", "Colin basilic"],
  nuggets: ["Poulet nature", "Poulet épicé", "Fromage", "Légumes"],
  "plat-cuisine": ["Lasagnes bœuf", "Lasagnes saumon épinards", "Gratin légumes", "Lasagnes 3 fromages"],
  glace: ["Vanille", "Fraise", "Chocolat", "Citron"],
  fromage: ["Nature", "Ail & fines herbes", "Olives", "Basilic"],
  boulangerie: ["Nature", "Fromage", "Olives", "Céréales"],
  legumes: ["Épinards", "Tomates", "Champignons", "Méditerranéenne"],
  viande: ["Bœuf", "Poulet", "Champignons", "Basilic"],
  aperitif: ["Olives", "Tomates séchées", "Fromage", "Basilic"],
};

/** Propose des déclinaisons à partir du nom du produit validé (« Quiche Lorraine » → « Quiche Saumon »…). */
export function suggestRangeNames(brief: Brief): string[] {
  const first = brief.productName.trim().split(/\s+/)[0] || CATEGORY_LABELS[brief.category];
  return FLAVORS[brief.category]
    .map((f) => `${first} ${f}`)
    .filter((n) => n.toLowerCase() !== brief.productName.trim().toLowerCase())
    .slice(0, 4);
}

const FALLBACK_CODES = ["#e0362c", "#2f7d32", "#f2b705", "#0b5fa5", "#8e44ad", "#f08a5d", "#00a19a", "#9e2a2b", "#5d6b2f"];

function distance(a: string, b: string): number {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

/** Code couleur de variante : celui de l'ingrédient, sauf s'il se confond avec une variante existante. */
function flavorColor(name: string, used: string[]): string {
  const preferred = matchIngredient(name)?.color ?? LIBRARY[hashString(name) % LIBRARY.length].color;
  const candidates = [preferred, ...FALLBACK_CODES];
  return candidates.find((c) => used.every((u) => distance(c, u) > 70)) ?? preferred;
}

/**
 * Crée les déclinaisons d'une gamme à partir d'un design validé.
 * Identité conservée : grille, typographies, logo, couleur de marque, mentions.
 * Ce qui change : nom du produit, garnitures photo, code couleur de la variante (accent).
 */
export function buildRange(base: DesignScene, names: string[]): DesignScene[] {
  const rangeId = base.rangeId ?? `rg_${hashString(base.id + names.join()).toString(36)}`;
  const baseNames = base.elements.filter((e): e is TextElement => e.kind === "text" && e.role === "productName");

  // Taille commune du nom : la plus petite qui convient à toutes les variantes, plafonnée par le design d'origine.
  const common = new Map<string, number>();
  for (const el of baseNames) {
    const rotated = Math.abs(el.rotation) > 1;
    const lines = rotated ? 1 : 2;
    const sizes = names.map((n) => fitText(n, el.fontFamily, el.w, el.fontSize * lines * (el.lineHeight ?? 1.02) + 0.5, { maxLines: lines, uppercase: el.uppercase, max: el.fontSize, lineHeight: el.lineHeight, weight: el.fontWeight }).fontSize);
    common.set(el.id, Math.min(el.fontSize, ...sizes));
  }

  const all: DesignScene[] = [{ ...base, rangeId, variantLabel: base.variantLabel ?? "Référence" }];
  const used = [base.palette.accent, base.palette.primary];
  names.forEach((name, idx) => {
    const accent = flavorColor(name, used);
    used.push(accent);
    const ingredient = matchIngredient(name);
    const scene: DesignScene = structuredClone(base);
    scene.id = `${base.id}_v${idx + 1}`;
    scene.name = name;
    scene.variantLabel = name;
    scene.rangeId = rangeId;
    scene.createdAt = Date.now();
    scene.palette = { ...scene.palette, accent };

    let garnishIdx = 0;
    for (const el of scene.elements) {
      if ("fill" in el && el.fill === base.palette.accent && el.kind !== "text") el.fill = accent;
      if (el.kind === "text" && el.role === "productName") {
        const size = common.get(el.id) ?? el.fontSize;
        const rotated = Math.abs(el.rotation) > 1;
        const fit = fitText(name, el.fontFamily, el.w, size * 2.1, { maxLines: rotated ? 1 : 2, uppercase: el.uppercase, max: size, lineHeight: el.lineHeight, weight: el.fontWeight });
        el.text = fit.lines.join("\n");
        el.fontSize = size;
        el.h = fit.lines.length * size * (el.lineHeight ?? 1.02) + 0.5;
      }
      if (el.kind === "image" && el.name.startsWith("Garniture") && ingredient) {
        const img = el as ImageElement;
        const alt = garnishIdx++ === 0 ? ingredient : matchIngredient(name, [ingredient.id]) ?? ingredient;
        img.src = alt.src;
        img.libraryId = alt.id;
        img.name = `Garniture · ${alt.name}`;
      }
    }
    // Les textes posés sur une forme de couleur accent gardent un contraste suffisant.
    scene.elements.forEach((el, i) => {
      if (el.kind !== "text" || el.role !== "benefit") return;
      const under = scene.elements.slice(0, i).reverse().find((e) => e.kind !== "text" && "fill" in e && e.fill === accent);
      if (under && contrastRatio(el.fill, accent) < 4.5) el.fill = bestTextOn(accent);
    });
    all.push(scene);
  });
  return all;
}
