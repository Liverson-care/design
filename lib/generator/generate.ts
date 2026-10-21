import type {
  Brief, DesignElement, DesignScene, Dieline, EllipseElement, FontPair, ImageElement, LegalKey,
  Palette, Panel, PathElement, RectElement, StyleKey, TextElement,
} from "@/lib/types";
import { bestTextOn, contrastRatio, darken, ensureContrast, hashString, lighten, mix } from "@/lib/color";
import { GARNISH_BY_CATEGORY, HERO_BY_CATEGORY, libraryItem, type LibraryItem } from "@/lib/library";
import { icon } from "@/lib/icons";
import { referenceCodes, type ReferenceCodes } from "@/lib/gms/references";
import { CATEGORY_COLORS, styleDef, type DecorKind, type StyleDef } from "./styles";
import { benefitFor, claimFor, cookingIcons, denomination, NUTRITION_ROWS, originLabel, storageMention } from "./copy";
import { fitText } from "./text-fit";
import { backgroundUnder } from "@/lib/scene-geometry";

export const LAYOUTS = ["hero-bas", "bandeau", "diagonale", "cadre", "plein-cadre"] as const;
export type LayoutKey = (typeof LAYOUTS)[number];

export const LAYOUT_LABELS: Record<LayoutKey, string> = {
  "hero-bas": "Photo héroïque",
  bandeau: "Bandeau couleur",
  diagonale: "Diagonale dynamique",
  cadre: "Cadre signature",
  "plein-cadre": "Plein cadre",
};

const STYLE_NEIGHBORS: Record<StyleKey, StyleKey[]> = {
  premium: ["luxe", "gourmet"],
  minimaliste: ["scandinave", "moderne-gms"],
  gourmet: ["premium", "bio"],
  scandinave: ["minimaliste", "bio"],
  "moderne-gms": ["minimaliste", "enfant"],
  bio: ["scandinave", "gourmet"],
  luxe: ["premium", "minimaliste"],
  enfant: ["moderne-gms", "scandinave"],
};

export interface GenerateOptions {
  /** Photo principale générée par IA pour chaque variante (data URL), si disponible */
  heroImages?: (string | undefined)[];
  /** Force une mise en page / un style (déclinaisons de gamme) */
  forceLayout?: LayoutKey;
  seed?: string;
}

/** Rendement pseudo-aléatoire déterministe */
function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDesigns(dieline: Dieline, brief: Brief, count = 5, opts: GenerateOptions = {}): DesignScene[] {
  return Array.from({ length: count }, (_, i) => generateDesign(dieline, brief, i, opts));
}

/** Choisit les paramètres qui varient d'une proposition à l'autre. */
export function variantPlan(brief: Brief, variant: number) {
  const ref = referenceCodes(brief.gmsReference);
  const styles: StyleKey[] = [brief.style, brief.style, brief.style, ...STYLE_NEIGHBORS[brief.style]];
  if (ref.prefer.styles?.length && !ref.prefer.styles.includes(brief.style)) styles[4] = ref.prefer.styles[0];
  const layouts: LayoutKey[] = [...(ref.prefer.layouts as LayoutKey[])];
  for (const l of LAYOUTS) if (!layouts.includes(l)) layouts.push(l);
  return {
    ref,
    styleKey: styles[variant % styles.length],
    layout: layouts[variant % layouts.length],
    paletteIndex: variant % 3,
    fontIndex: (variant + (variant >= 3 ? 1 : 0)) % 3,
  };
}

export function buildPalette(style: StyleDef, brief: Brief, index: number, variant: number, ref: ReferenceCodes): Palette {
  const base = { ...style.palettes[index % style.palettes.length] };
  const user = brief.colors.filter(Boolean);
  if (user.length) {
    base.primary = user[variant % user.length];
    base.accent = user.length > 1 ? user[(variant + 1) % user.length] : CATEGORY_COLORS[brief.category];
    if (contrastRatio(base.accent, base.primary) < 1.6) base.accent = mix(base.accent, bestTextOn(base.primary), 0.45);
  }
  if (ref.prefer.lightBackground && contrastRatio(base.background, "#ffffff") > 1.4) {
    base.background = "#ffffff";
    base.surface = lighten(base.primary, 0.92);
    base.text = darken(base.primary, 0.55);
  }
  if (/fond\s+(tr[eè]s\s+)?(blanc|clair)/i.test(brief.constraints)) {
    base.background = "#ffffff";
    base.surface = "#ffffff";
  }
  base.text = ensureContrast(base.text, base.background, 7);
  return { ...base, name: `${style.label} ${index + 1}`, onPrimary: bestTextOn(base.primary) };
}

class SceneBuilder {
  elements: DesignElement[] = [];
  private n = 0;
  id(prefix: string) { return `${prefix}_${++this.n}`; }
  add<T extends DesignElement>(el: Omit<T, "id" | "rotation"> & { rotation?: number }): T {
    const full = { rotation: 0, ...el, id: this.id(el.kind) } as T;
    this.elements.push(full);
    return full;
  }
  rect(p: Partial<RectElement> & Pick<RectElement, "x" | "y" | "w" | "h" | "fill">) {
    return this.add<RectElement>({ kind: "rect", name: "Forme", role: "decor", ...p });
  }
  ellipse(p: Partial<EllipseElement> & Pick<EllipseElement, "x" | "y" | "w" | "h" | "fill">) {
    return this.add<EllipseElement>({ kind: "ellipse", name: "Cercle", role: "decor", ...p });
  }
  path(p: Partial<PathElement> & Pick<PathElement, "x" | "y" | "w" | "h" | "data" | "fill">) {
    return this.add<PathElement>({ kind: "path", name: "Motif", role: "decor", viewBox: 100, ...p });
  }
  image(p: Partial<ImageElement> & Pick<ImageElement, "x" | "y" | "w" | "h" | "src">) {
    return this.add<ImageElement>({ kind: "image", name: "Image", role: "photo", ...p });
  }
  text(p: Partial<TextElement> & Pick<TextElement, "x" | "y" | "w" | "h" | "text" | "fontFamily" | "fontSize" | "fill">) {
    return this.add<TextElement>({ kind: "text", name: "Texte", role: "secondary", fontWeight: 400, align: "left", lineHeight: 1.1, ...p });
  }
}

interface Ctx {
  b: SceneBuilder;
  p: Panel;
  m: number;
  pal: Palette;
  fonts: FontPair;
  brief: Brief;
  style: StyleDef;
  hero: string;
  heroLib?: string;
  garnish: LibraryItem[];
  decor: DecorKind;
  ref: ReferenceCodes;
  variant: number;
  rand: () => number;
}

export function generateDesign(dieline: Dieline, brief: Brief, variant: number, opts: GenerateOptions = {}): DesignScene {
  const plan = variantPlan(brief, variant);
  const style = styleDef(plan.styleKey);
  const layout = opts.forceLayout ?? plan.layout;
  const pal = buildPalette(style, brief, plan.paletteIndex, variant, plan.ref);
  const fonts = style.fonts[plan.fontIndex % style.fonts.length];
  const rand = rng(hashString(`${opts.seed ?? ""}${brief.productName}|${variant}`));
  const b = new SceneBuilder();

  const heroId = HERO_BY_CATEGORY[brief.category];
  const aiHero = opts.heroImages?.[variant];
  const garnishPool = GARNISH_BY_CATEGORY[brief.category].map(libraryItem).filter(Boolean) as LibraryItem[];
  const garnish = [garnishPool[variant % garnishPool.length], garnishPool[(variant + 1) % garnishPool.length]].filter(
    (g, i, arr) => g && arr.indexOf(g) === i,
  );

  // Fond général, verrouillé : il ne déborde jamais du tracé de découpe (rendu détouré).
  b.rect({ x: 0, y: 0, w: dieline.widthMm, h: dieline.heightMm, fill: pal.background, role: "background", name: "Fond", locked: true });

  const front = dieline.panels.find((p) => p.role === "front") ?? dieline.panels[0];
  const ctxBase = {
    b, pal, fonts, brief, style, rand, variant, ref: plan.ref,
    hero: aiHero ?? libraryItem(heroId)!.src,
    heroLib: aiHero ? undefined : heroId,
    garnish,
    decor: style.decor[variant % style.decor.length],
  };

  for (const panel of dieline.panels) {
    const m = Math.max(3, Math.min(panel.w, panel.h) * 0.06);
    const ctx: Ctx = { ...ctxBase, p: panel, m };
    switch (panel.role) {
      case "front":
        FRONT_LAYOUTS[layout](ctx);
        break;
      case "back":
        backPanel(ctx);
        break;
      case "left":
      case "right":
        sidePanel(ctx, panel.role === "right");
        break;
      case "top":
      case "bottom": {
        const start = b.elements.length;
        if (panel.role === "top") topPanel(ctx);
        else bottomPanel(ctx, dieline);
        // Un rabat solidaire du dos se replie vers l'avant : son visuel est pivoté de 180° sur le plat
        // pour se lire à l'endroit une fois la boîte montée.
        if (hingedOnBack(panel, dieline)) rotatePanelContent(b.elements.slice(start), panel);
        break;
      }
      case "glue":
        b.rect({ x: panel.x, y: panel.y, w: panel.w, h: panel.h, fill: "#ffffff", role: "background", name: "Zone de collage (non imprimée)", locked: true, panelId: panel.id });
        break;
      default:
        b.rect({ x: panel.x, y: panel.y, w: panel.w, h: panel.h, fill: mix(pal.primary, pal.background, 0.15), role: "background", name: "Rabat", locked: true, panelId: panel.id });
    }
  }

  // Si aucune face n'a été identifiée, on traite le gabarit entier comme une étiquette.
  if (!front) {
    const p = { id: "all", role: "front" as const, x: 0, y: 0, w: dieline.widthMm, h: dieline.heightMm };
    FRONT_LAYOUTS[layout]({ ...ctxBase, p, m: Math.max(3, Math.min(p.w, p.h) * 0.06) });
  }

  enforceContrast(b.elements);

  return {
    id: `ds_${hashString(`${Date.now()}${Math.random()}${variant}`).toString(36)}`,
    name: `Proposition ${variant + 1}`,
    style: style.key,
    layout,
    palette: pal,
    fonts,
    elements: b.elements,
    createdAt: Date.now(),
    usedAi: !!aiHero,
  };
}

/** Filet de sécurité : chaque texte est foncé ou éclairci jusqu'au contraste WCAG AA avec son fond réel. */
function enforceContrast(elements: DesignElement[]) {
  for (const el of elements) {
    if (el.kind !== "text" || el.legalKey === "barcode") continue;
    const bg = backgroundUnder({ elements }, el);
    if (!bg || bg === "photo") continue;
    const large = el.fontSize * 0.72 >= 4 || (el.fontWeight >= 700 && el.fontSize >= 4.9);
    el.fill = ensureContrast(el.fill, bg, large ? 3.2 : 4.6);
  }
}

export function hingedOnBack(panel: Panel, dieline: Dieline): boolean {
  const back = dieline.panels.find((p) => p.role === "back");
  if (!back) return false;
  const overlapsX = panel.x < back.x + back.w - 1 && panel.x + panel.w > back.x + 1;
  if (!overlapsX) return false;
  return panel.role === "top" ? Math.abs(panel.y + panel.h - back.y) < 1.5 : Math.abs(panel.y - (back.y + back.h)) < 1.5;
}

function rotatePanelContent(elements: DesignElement[], panel: Panel) {
  const cx = panel.x + panel.w / 2, cy = panel.y + panel.h / 2;
  for (const el of elements) {
    if (el.role === "background") continue;
    if (el.kind === "ellipse") {
      el.x = 2 * cx - el.x - el.w;
      el.y = 2 * cy - el.y - el.h;
    } else {
      el.x = 2 * cx - el.x;
      el.y = 2 * cy - el.y;
      el.rotation = (el.rotation + 180) % 360;
    }
  }
}

// ---------------------------------------------------------------- éléments communs

function panelBg(ctx: Ctx, fill: string, name = "Fond de face") {
  const { p } = ctx;
  return ctx.b.rect({ x: p.x, y: p.y, w: p.w, h: p.h, fill, role: "background", name, locked: true, panelId: p.id });
}

function addLogo(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, align: "left" | "center" = "center", cartouche?: string) {
  const { b, brief, fonts, p } = ctx;
  if (brief.brandLogo) {
    const size = Math.min(w, h * 2.2);
    const lx = align === "center" ? x + (w - size) / 2 : x;
    return b.image({ x: lx, y, w: size, h, src: brief.brandLogo, role: "logo", name: "Logo", panelId: p.id });
  }
  const name = brief.brandName || "Votre marque";
  if (cartouche) {
    const fit = fitText(name, fonts.heading, w * 0.8, h * 0.62, { maxLines: 1, uppercase: true, weight: 800 });
    const tw = Math.min(w, fit.lines[0].length * fit.fontSize * 0.75 + h * 0.9);
    const cx = align === "center" ? x + (w - tw) / 2 : x;
    b.rect({ x: cx, y, w: tw, h, fill: cartouche, radius: h / 2, name: "Cartouche logo", role: "logo", panelId: p.id });
    return b.text({
      x: cx, y: y + (h - fit.fontSize) / 2, w: tw, h: fit.fontSize * 1.1, text: name.toUpperCase(), fontFamily: fonts.heading,
      fontSize: fit.fontSize, fontWeight: 800, fill: bestTextOn(cartouche), align: "center", role: "logo", name: "Logo (marque)", letterSpacing: fit.fontSize * 0.06, panelId: p.id,
    });
  }
  const fit = fitText(name, fonts.heading, w, h, { maxLines: 1, uppercase: true, letterSpacing: h * 0.05, weight: 800 });
  return b.text({
    x, y: y + (h - fit.fontSize) / 2, w, h: fit.fontSize * 1.1, text: name.toUpperCase(), fontFamily: fonts.heading, fontSize: fit.fontSize,
    fontWeight: 800, fill: color, align, role: "logo", name: "Logo (marque)", letterSpacing: fit.fontSize * 0.05, panelId: p.id,
  });
}

function addName(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, align: "left" | "center" = "center", maxLines = 2) {
  const { b, brief, fonts, style, p } = ctx;
  const upper = style.uppercaseName;
  const fit = fitText(brief.productName || "Nom du produit", fonts.heading, w, h, { maxLines, uppercase: upper, lineHeight: 1.02, weight: fonts.headingWeight });
  return b.text({
    x, y, w, h: fit.lines.length * fit.fontSize * 1.02 + 0.5, text: fit.lines.join("\n"), fontFamily: fonts.heading,
    fontSize: fit.fontSize, fontWeight: fonts.headingWeight, fill: color, align, uppercase: upper, lineHeight: 1.02,
    role: "productName", name: "Nom du produit", panelId: p.id,
  });
}

function addDenomination(ctx: Ctx, x: number, y: number, w: number, color: string, align: "left" | "center" = "center") {
  const { b, brief, fonts, p } = ctx;
  const size = Math.max(2.6, Math.min(4.2, p.h * 0.022));
  return b.text({
    x, y, w, h: size * 2.4, text: denomination(brief), fontFamily: fonts.body, fontSize: size, fontWeight: fonts.bodyWeight,
    fill: color, align, wrap: true, role: "secondary", name: "Dénomination légale", legalKey: "denomination", panelId: p.id,
  });
}

/** Hauteur minimale des chiffres du poids net (directive 76/211/CEE, reprise par INCO) */
export function minNetWeightHeight(netWeight: string): number {
  const m = netWeight.replace(",", ".").match(/([\d.]+)\s*(kg|g|l|cl|ml)?/i);
  if (!m) return 4;
  let g = parseFloat(m[1]);
  const unit = (m[2] ?? "g").toLowerCase();
  if (unit === "kg" || unit === "l") g *= 1000;
  if (unit === "cl") g *= 10;
  if (g <= 50) return 2;
  if (g <= 200) return 3;
  if (g <= 1000) return 4;
  return 6;
}

function addWeight(ctx: Ctx, x: number, y: number, w: number, color: string, align: "left" | "center" | "right" = "left") {
  const { b, brief, fonts, p } = ctx;
  // Hauteur de capitale ≈ 0,72 × corps : on garantit la hauteur légale avec une marge de 15 %.
  const size = Math.max((minNetWeightHeight(brief.netWeight) / 0.72) * 1.15, Math.min(7, p.h * 0.03));
  return b.text({
    x, y, w, h: size * 1.15, text: brief.netWeight || "400 g", fontFamily: fonts.body, fontSize: size, fontWeight: 800,
    fill: color, align, role: "weight", name: "Poids net", legalKey: "netWeight", panelId: p.id,
  });
}

function addPhoto(ctx: Ctx, x: number, y: number, w: number, h: number, withGarnish = true) {
  const { b, p, rand } = ctx;
  const size = Math.min(w, h);
  const px = x + (w - size) / 2, py = y + (h - size) / 2;
  if (withGarnish && ctx.garnish[0]) {
    const g = ctx.garnish[0];
    const gs = size * 0.34;
    b.image({ x: px - gs * 0.15, y: py + size - gs * 0.85, w: gs, h: gs, src: g.src, libraryId: g.id, name: `Garniture · ${g.name}`, rotation: -8 + rand() * 6, panelId: p.id });
  }
  const hero = b.image({ x: px, y: py, w: size, h: size, src: ctx.hero, libraryId: ctx.heroLib, name: "Photo produit", role: "photo", panelId: p.id });
  if (withGarnish && ctx.garnish[1]) {
    const g = ctx.garnish[1];
    const gs = size * 0.28;
    b.image({ x: px + size - gs * 0.8, y: py + size - gs * 0.9, w: gs, h: gs, src: g.src, libraryId: g.id, name: `Garniture · ${g.name}`, rotation: 6 + rand() * 6, panelId: p.id });
  }
  return hero;
}

function addBadge(ctx: Ctx, cx: number, cy: number, r: number, fill: string) {
  const { b, brief, fonts, p, variant } = ctx;
  const text = benefitFor(brief, variant);
  b.ellipse({ x: cx - r, y: cy - r, w: r * 2, h: r * 2, fill, role: "benefit", name: "Pastille bénéfice", panelId: p.id });
  const fit = fitText(text, fonts.heading, r * 1.3, r * 1.15, { maxLines: 3, uppercase: true, lineHeight: 1.05, weight: 800 });
  const th = fit.lines.length * fit.fontSize * 1.05;
  return b.text({
    x: cx - r * 0.66, y: cy - th / 2, w: r * 1.32, h: th, text: fit.lines.join("\n"), fontFamily: fonts.heading, fontSize: fit.fontSize,
    fontWeight: 800, fill: bestTextOn(fill), align: "center", uppercase: true, lineHeight: 1.05, role: "benefit", name: "Bénéfice principal", panelId: p.id,
  });
}

function addPill(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, text: string, role: TextElement["role"] = "benefit") {
  const { b, fonts, p } = ctx;
  const fit = fitText(text, fonts.body, w - h, h * 0.62, { maxLines: 1, uppercase: true, weight: 800 });
  const tw = Math.min(w, fit.lines[0].length * fit.fontSize * 0.68 + h * 1.2);
  const px = x + (w - tw) / 2;
  b.rect({ x: px, y, w: tw, h, fill, radius: h / 2, role, name: "Bandeau bénéfice", panelId: p.id });
  return b.text({
    x: px, y: y + (h - fit.fontSize) / 2, w: tw, h: fit.fontSize * 1.1, text: text.toUpperCase(), fontFamily: fonts.body,
    fontSize: fit.fontSize, fontWeight: 800, fill: bestTextOn(fill), align: "center", role, name: role === "benefit" ? "Bénéfice principal" : "Allégation", uppercase: true, panelId: p.id,
  });
}

function addIcon(ctx: Ctx, id: string, x: number, y: number, size: number, color: string, role: "icon" | "legal" = "icon", legalKey?: LegalKey) {
  const ic = icon(id);
  return ctx.b.path({
    x, y, w: size, h: size, data: ic.data, viewBox: 24, fill: "transparent", stroke: color, strokeWidth: 1.7,
    role, name: `Picto · ${ic.label}`, panelId: ctx.p.id, legalKey,
  });
}

function addClaims(ctx: Ctx, x: number, y: number, w: number, color: string, align: "left" | "right" = "right", maxH = Infinity) {
  const { brief, fonts, p, b } = ctx;
  const size = Math.max(2.6, Math.min(3.6, p.h * 0.017));
  const items: [string, string][] = [];
  if (brief.storage === "surgele") items.push(["flocon", "Surgelé"]);
  if (brief.country.toLowerCase().includes("france")) items.push(["france", "Fabriqué en France"]);
  else if (brief.positioning === "bio") items.push(["feuille", "Bio"]);
  else items.push(["etoile", claimFor(brief)]);
  const fits = Math.max(1, Math.floor((maxH + size * 0.5) / (size * 2.1)));
  items.slice(0, Math.min(2, fits)).forEach(([ic, label], i) => {
    const yy = y + i * size * 2.1;
    const iconSize = size * 1.6;
    const tx = align === "right" ? x : x + iconSize + 1.2;
    b.text({ x: tx, y: yy + (iconSize - size) / 2, w: w - iconSize - 1.2, h: size * 1.2, text: label, fontFamily: fonts.body, fontSize: size, fontWeight: 700, fill: color, align, role: "secondary", name: `Allégation · ${label}`, panelId: p.id, legalKey: ic === "france" ? "origin" : undefined });
    addIcon(ctx, ic, align === "right" ? x + w - iconSize : x, yy, iconSize, color);
  });
}

// ---------------------------------------------------------------- motifs décoratifs

function decorate(ctx: Ctx, area: { x: number; y: number; w: number; h: number }, color: string) {
  const { b, p, rand } = ctx;
  const base = { panelId: p.id, role: "decor" as const, locked: false };
  switch (ctx.decor) {
    case "waves":
      b.path({ ...base, x: area.x, y: area.y + area.h * 0.62, w: area.w, h: area.h * 0.38, data: "M0 30 C 18 10, 34 10, 50 28 S 82 48, 100 24 V100 H0 Z", fill: color, opacity: 0.9, name: "Vague" });
      break;
    case "arc":
      b.ellipse({ ...base, x: area.x - area.w * 0.25, y: area.y + area.h * 0.55, w: area.w * 1.5, h: area.h * 0.9, fill: color, opacity: 0.85, name: "Arc" });
      break;
    case "dots":
      for (let i = 0; i < 9; i++) {
        const r = Math.min(area.w, area.h) * (0.012 + rand() * 0.02);
        b.ellipse({ ...base, x: area.x + rand() * area.w, y: area.y + rand() * area.h * 0.35, w: r * 2, h: r * 2, fill: color, opacity: 0.55, name: "Pois" });
      }
      break;
    case "leaves":
      for (let i = 0; i < 4; i++) {
        const s = Math.min(area.w, area.h) * (0.12 + rand() * 0.08);
        b.path({ ...base, x: area.x + (i % 2 ? area.w - s * 0.8 : -s * 0.2), y: area.y + area.h * (0.25 + i * 0.16), w: s, h: s, rotation: i % 2 ? 20 : -25, data: "M50 4 C82 18 96 56 50 96 C4 56 18 18 50 4 Z", fill: color, opacity: 0.8, name: "Feuille" });
      }
      break;
    case "stripes":
      for (let i = 0; i < 4; i++) {
        b.rect({ ...base, x: area.x, y: area.y + area.h * 0.012 * i * 2.2, w: area.w, h: area.h * 0.012, fill: color, opacity: 0.9 - i * 0.18, name: "Liseré" });
      }
      break;
    case "rays": {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a1 = (i / 12) * Math.PI * 2, a2 = a1 + Math.PI / 24;
        return `M50 50 L${50 + 70 * Math.cos(a1)} ${50 + 70 * Math.sin(a1)} L${50 + 70 * Math.cos(a2)} ${50 + 70 * Math.sin(a2)} Z`;
      }).join(" ");
      b.path({ ...base, x: area.x, y: area.y + area.h * 0.3, w: area.w, h: area.w, data: rays, fill: color, opacity: 0.16, name: "Rayons" });
      break;
    }
    case "confetti":
      for (let i = 0; i < 14; i++) {
        const s = Math.min(area.w, area.h) * (0.02 + rand() * 0.025);
        const fills = [ctx.pal.accent, ctx.pal.secondary, ctx.pal.primary];
        b.rect({ ...base, x: area.x + rand() * area.w, y: area.y + rand() * area.h, w: s, h: s * 0.45, radius: s * 0.2, rotation: rand() * 180, fill: fills[i % 3], opacity: 0.85, name: "Confetti" });
      }
      break;
    case "frame":
      b.rect({ ...base, x: p.x + ctx.m * 0.6, y: p.y + ctx.m * 0.6, w: p.w - ctx.m * 1.2, h: p.h - ctx.m * 1.2, fill: "transparent", stroke: color, strokeWidth: 0.6, name: "Cadre" });
      break;
  }
}

// ---------------------------------------------------------------- mises en page de face avant
// Hiérarchie GMS : 1. logo  2. nom du produit  3. photo  4. bénéfice  5. informations secondaires

const FRONT_LAYOUTS: Record<LayoutKey, (ctx: Ctx) => void> = {
  "hero-bas"(ctx) {
    const { p, m, pal } = ctx;
    const surface = ctx.style.key === "premium" || ctx.style.key === "luxe" ? pal.background : pal.surface;
    panelBg(ctx, surface);
    decorate(ctx, { x: p.x, y: p.y + p.h * 0.35, w: p.w, h: p.h * 0.65 }, mix(pal.primary, surface, 0.25));
    const txt = ensureContrast(pal.primary, surface, 4.5);
    const left = ctx.ref.prefer.logoPosition === "top-left";
    addLogo(ctx, p.x + m, p.y + m, left ? p.w * 0.45 : p.w - 2 * m, p.h * 0.075, ensureContrast(pal.text, surface), left ? "left" : "center", left ? pal.primary : undefined);
    const name = addName(ctx, p.x + m, p.y + m + p.h * 0.11, p.w - 2 * m, p.h * 0.17, txt);
    addDenomination(ctx, p.x + m * 2, name.y + name.h + 1.5, p.w - 4 * m, ensureContrast(pal.text, surface));
    addPhoto(ctx, p.x + m, p.y + p.h * 0.38, p.w - 2 * m, p.h * 0.5 * ctx.ref.prefer.photoScale);
    const r = Math.min(p.w, p.h) * 0.12;
    addBadge(ctx, p.x + p.w - m - r, p.y + p.h * 0.42 + r * 0.4, r, pal.accent);
    const sw = p.h * 0.14;
    ctx.b.rect({ x: p.x, y: p.y + p.h - sw * 0.6, w: p.w, h: sw * 0.6, fill: pal.primary, role: "decor", name: "Bandeau bas", panelId: p.id });
    addWeight(ctx, p.x + m, p.y + p.h - sw * 0.6 + sw * 0.08, p.w * 0.4, pal.onPrimary);
    addClaims(ctx, p.x + p.w * 0.45, p.y + p.h - sw * 0.6 + sw * 0.06, p.w * 0.55 - m, pal.onPrimary, "right", sw * 0.6 - sw * 0.06 - ctx.m);
  },

  bandeau(ctx) {
    const { p, m, pal } = ctx;
    panelBg(ctx, pal.primary);
    decorate(ctx, { x: p.x, y: p.y, w: p.w, h: p.h * 0.6 }, mix(pal.primary, pal.onPrimary, 0.12));
    const left = ctx.ref.prefer.logoPosition === "top-left";
    addLogo(ctx, p.x + m, p.y + m, left ? p.w * 0.5 : p.w - 2 * m, p.h * 0.08, pal.primary, left ? "left" : "center", pal.surface);
    addPhoto(ctx, p.x + m, p.y + p.h * 0.13, p.w - 2 * m, p.h * 0.47 * ctx.ref.prefer.photoScale);
    const bandY = p.y + p.h * 0.6, bandH = p.h * 0.24;
    ctx.b.rect({ x: p.x, y: bandY, w: p.w, h: bandH, fill: pal.surface, role: "decor", name: "Bandeau nom produit", panelId: p.id });
    const pillH = p.h * 0.06;
    const name = addName(ctx, p.x + m, bandY + pillH * 0.5 + 1.5, p.w - 2 * m, bandH * 0.62 - pillH * 0.5, ensureContrast(pal.primary, pal.surface, 4.5));
    addDenomination(ctx, p.x + m, name.y + name.h + 1, p.w - 2 * m, ensureContrast(pal.text, pal.surface));
    addPill(ctx, p.x + m, bandY - pillH * 0.5, p.w - 2 * m, pillH, pal.accent, benefitFor(ctx.brief, ctx.variant));
    addWeight(ctx, p.x + m, p.y + p.h - m - p.h * 0.045, p.w * 0.4, pal.onPrimary);
    addClaims(ctx, p.x + p.w * 0.45, p.y + p.h - m - p.h * 0.055, p.w * 0.55 - m, pal.onPrimary);
  },

  diagonale(ctx) {
    const { p, m, pal, b } = ctx;
    panelBg(ctx, pal.surface);
    b.path({ x: p.x, y: p.y, w: p.w, h: p.h, data: "M0 0 H100 V36 L0 56 Z", fill: pal.primary, role: "decor", name: "Aplat diagonal", panelId: p.id });
    b.path({ x: p.x, y: p.y, w: p.w, h: p.h, data: "M0 56 L100 36 V39 L0 59 Z", fill: pal.accent, role: "decor", name: "Liseré diagonal", panelId: p.id });
    addLogo(ctx, p.x + m, p.y + m, p.w * 0.55, p.h * 0.07, pal.onPrimary, "left");
    const name = addName(ctx, p.x + m, p.y + p.h * 0.12, p.w - 2 * m, p.h * 0.17, pal.onPrimary, "left");
    addDenomination(ctx, p.x + m, name.y + name.h + 1, p.w * 0.5, pal.onPrimary, "left");
    addPhoto(ctx, p.x + p.w * 0.18, p.y + p.h * 0.38, p.w * 0.82 - m * 0.5, p.h * 0.5 * ctx.ref.prefer.photoScale);
    const r = Math.min(p.w, p.h) * 0.11;
    addBadge(ctx, p.x + m + r, p.y + p.h * 0.7, r, pal.accent);
    addWeight(ctx, p.x + m, p.y + p.h - m - p.h * 0.045, p.w * 0.4, ensureContrast(pal.text, pal.surface));
    addClaims(ctx, p.x + p.w * 0.45, p.y + p.h - m - p.h * 0.055, p.w * 0.55 - m, ensureContrast(pal.text, pal.surface));
  },

  cadre(ctx) {
    const { p, m, pal, b } = ctx;
    panelBg(ctx, pal.background);
    b.rect({ x: p.x + m * 0.6, y: p.y + m * 0.6, w: p.w - m * 1.2, h: p.h - m * 1.2, fill: "transparent", stroke: pal.primary, strokeWidth: 0.7, role: "decor", name: "Cadre", panelId: p.id });
    b.rect({ x: p.x + m * 0.9, y: p.y + m * 0.9, w: p.w - m * 1.8, h: p.h - m * 1.8, fill: "transparent", stroke: pal.primary, strokeWidth: 0.25, role: "decor", name: "Filet", panelId: p.id });
    addLogo(ctx, p.x + m * 1.5, p.y + m * 1.6, p.w - 3 * m, p.h * 0.06, ensureContrast(pal.primary, pal.background, 4.5), "center");
    b.rect({ x: p.x + p.w * 0.42, y: p.y + m * 1.6 + p.h * 0.075, w: p.w * 0.16, h: 0.5, fill: pal.primary, role: "decor", name: "Ornement", panelId: p.id });
    const name = addName(ctx, p.x + m * 1.5, p.y + p.h * 0.15, p.w - 3 * m, p.h * 0.17, ensureContrast(pal.text, pal.background, 4.5), "center", 3);
    addDenomination(ctx, p.x + m * 2, name.y + name.h + 1, p.w - 4 * m, ensureContrast(mix(pal.text, pal.primary, 0.3), pal.background));
    const plate = Math.min(p.w - 2.4 * m, p.h * 0.44);
    const plateY = p.y + p.h * 0.38;
    b.ellipse({ x: p.x + (p.w - plate) / 2, y: plateY, w: plate, h: plate, fill: pal.surface, stroke: pal.primary, strokeWidth: 0.4, role: "decor", name: "Assiette", panelId: p.id });
    decorate(ctx, { x: p.x, y: p.y + p.h * 0.3, w: p.w, h: p.h * 0.6 }, pal.primary);
    addPhoto(ctx, p.x + (p.w - plate) / 2 + plate * 0.02, plateY + plate * 0.02, plate * 0.96, plate * 0.96);
    const pillH = p.h * 0.055;
    addPill(ctx, p.x + m * 2, plateY + plate - pillH * 0.6, p.w - 4 * m, pillH, pal.primary, benefitFor(ctx.brief, ctx.variant));
    addWeight(ctx, p.x + m * 1.5, plateY + plate + pillH * 0.4 + 2, p.w - 3 * m, ensureContrast(pal.primary, pal.background, 4.5), "center");
  },

  "plein-cadre"(ctx) {
    const { p, m, pal, b } = ctx;
    panelBg(ctx, pal.surface);
    decorate(ctx, { x: p.x, y: p.y + p.h * 0.3, w: p.w, h: p.h * 0.7 }, mix(pal.accent, pal.surface, 0.5));
    addPhoto(ctx, p.x - p.w * 0.04, p.y + p.h * 0.27, p.w * 1.08, p.h * 0.66 * ctx.ref.prefer.photoScale);
    const bandH = p.h * 0.29;
    b.path({ x: p.x, y: p.y, w: p.w, h: bandH, data: "M0 0 H100 V86 C 70 100, 30 100, 0 86 Z", fill: pal.primary, role: "decor", name: "Bandeau haut", panelId: p.id });
    const left = ctx.ref.prefer.logoPosition === "top-left";
    addLogo(ctx, p.x + m, p.y + m * 0.8, left ? p.w * 0.5 : p.w - 2 * m, p.h * 0.065, pal.onPrimary, left ? "left" : "center");
    addName(ctx, p.x + m, p.y + m * 0.8 + p.h * 0.085, p.w - 2 * m, bandH * 0.45, pal.onPrimary);
    const r = Math.min(p.w, p.h) * 0.12;
    addBadge(ctx, p.x + p.w - m - r, p.y + p.h - m - r - p.h * 0.07, r, pal.accent);
    const wh = p.h * 0.09;
    b.rect({ x: p.x + m * 0.6, y: p.y + p.h - m * 0.6 - wh, w: p.w * 0.52, h: wh, fill: pal.surface, radius: ctx.style.radius, opacity: 0.94, role: "decor", name: "Cartouche mentions", panelId: p.id });
    addWeight(ctx, p.x + m, p.y + p.h - m * 0.6 - wh + 1, p.w * 0.45, ensureContrast(pal.text, pal.surface));
    addDenomination(ctx, p.x + m, p.y + p.h - m * 0.6 - wh * 0.45, p.w * 0.48, ensureContrast(pal.text, pal.surface), "left");
  },
};

// ---------------------------------------------------------------- autres faces

function backPanel(ctx: Ctx) {
  const { p, m, pal, fonts, brief, b } = ctx;
  const bg = pal.surface;
  panelBg(ctx, bg, "Fond du dos");
  const ink = ensureContrast(pal.text, bg, 7);
  const body = Math.max(2.5, Math.min(2.9, p.w * 0.014)); // hauteur d'œil ≥ 1,2 mm (INCO)
  let y = p.y + m;
  addLogo(ctx, p.x + m, y, p.w * 0.45, p.h * 0.05, ensureContrast(pal.primary, bg, 4.5), "left");
  y += p.h * 0.065;
  const title = fitText(brief.productName || "Nom du produit", fonts.heading, p.w - 2 * m, p.h * 0.05, { maxLines: 1, uppercase: ctx.style.uppercaseName, weight: fonts.headingWeight });
  b.text({ x: p.x + m, y, w: p.w - 2 * m, h: title.fontSize * 1.1, text: title.lines[0], fontFamily: fonts.heading, fontSize: title.fontSize, fontWeight: fonts.headingWeight, fill: ensureContrast(pal.primary, bg), uppercase: ctx.style.uppercaseName, role: "productName", name: "Nom du produit (dos)", panelId: p.id });
  y += title.fontSize * 1.3 + 2;
  b.text({ x: p.x + m, y, w: p.w - 2 * m, h: body * 6, wrap: true, text: `${denomination(brief)}.\nIngrédients : liste à compléter par ordre pondéral décroissant. Les allergènes sont à mettre en évidence (gras).`, fontFamily: fonts.body, fontSize: body, fill: ink, role: "legal", name: "Liste des ingrédients", legalKey: "ingredients", panelId: p.id, lineHeight: 1.25 });
  y += body * 6.5;
  b.text({ x: p.x + m, y, w: p.w - 2 * m, h: body * 2.6, wrap: true, text: "Allergènes : à compléter. Peut contenir des traces de : à compléter.", fontFamily: fonts.body, fontSize: body, fontWeight: 700, fill: ink, role: "legal", name: "Allergènes", legalKey: "allergens", panelId: p.id, lineHeight: 1.25 });
  y += body * 3.2;

  // Tableau nutritionnel
  const rowH = body * 1.75;
  const tw = Math.min(p.w - 2 * m, 95);
  b.rect({ x: p.x + m, y, w: tw, h: rowH * 1.3, fill: pal.primary, role: "legal", name: "Tableau nutritionnel · en-tête", legalKey: "nutrition", panelId: p.id });
  b.text({ x: p.x + m + 1.5, y: y + (rowH * 1.3 - body) / 2, w: tw - 3, h: body * 1.2, text: "Valeurs nutritionnelles moyennes pour 100 g", fontFamily: fonts.body, fontSize: body, fontWeight: 700, fill: pal.onPrimary, role: "legal", name: "Tableau nutritionnel · titre", legalKey: "nutrition", panelId: p.id });
  y += rowH * 1.3;
  NUTRITION_ROWS.forEach(([label, val], i) => {
    if (i % 2 === 0) b.rect({ x: p.x + m, y, w: tw, h: rowH, fill: mix(pal.primary, bg, 0.9), role: "legal", name: "Tableau nutritionnel · ligne", panelId: p.id, legalKey: "nutrition" });
    b.text({ x: p.x + m + 1.5 + (label.startsWith("dont") ? 3 : 0), y: y + (rowH - body) / 2, w: tw * 0.6, h: body * 1.2, text: label, fontFamily: fonts.body, fontSize: body, fill: ink, role: "legal", name: `Nutrition · ${label}`, panelId: p.id, legalKey: "nutrition" });
    b.text({ x: p.x + m + tw * 0.6, y: y + (rowH - body) / 2, w: tw * 0.4 - 1.5, h: body * 1.2, text: val, fontFamily: fonts.body, fontSize: body, fill: ink, align: "right", role: "legal", name: `Nutrition · ${label} (valeur)`, panelId: p.id, legalKey: "nutrition" });
    y += rowH;
  });
  y += 3;

  // Préparation
  const icons = cookingIcons(brief.category);
  const isz = Math.min(9, p.w * 0.07);
  icons.forEach((id, i) => {
    const x = p.x + m + i * (p.w - 2 * m) / icons.length;
    addIcon(ctx, id, x, y, isz, pal.primary);
    b.text({ x: x + isz + 1.5, y: y + isz * 0.15, w: (p.w - 2 * m) / icons.length - isz - 2, h: body * 2.6, wrap: true, text: id === "four" ? "Four préchauffé : 15 min à 200 °C" : id === "micro-ondes" ? "Micro-ondes : 4 min à 800 W" : id === "poele" ? "Poêle : 8 min à feu moyen" : id === "flocon" ? "Sortir 5 min avant dégustation" : "Prêt à déguster", fontFamily: fonts.body, fontSize: body, fill: ink, role: "secondary", name: "Mode de préparation", panelId: p.id });
  });
  y += isz + 4;
  b.text({ x: p.x + m, y, w: p.w - 2 * m, h: body * 2.6, wrap: true, text: storageMention(brief), fontFamily: fonts.body, fontSize: body, fontWeight: 600, fill: ink, role: "legal", name: "Conditions de conservation", legalKey: "storage", panelId: p.id, lineHeight: 1.25 });
  y += body * 3;
  b.text({ x: p.x + m, y, w: p.w * 0.6, h: body * 2.6, wrap: true, text: `${brief.brandName || "Votre marque"} — adresse de l'exploitant à compléter. ${originLabel(brief.country)}.`, fontFamily: fonts.body, fontSize: body, fill: ink, role: "legal", name: "Exploitant & origine", legalKey: "address", panelId: p.id, lineHeight: 1.25 });

  // Bas du dos : info-tri + code-barres
  const by = p.y + p.h - m - 16;
  if (brief.country.toLowerCase().includes("france")) {
    addIcon(ctx, "recyclage", p.x + m, by + 2, 10, ink, "legal", "recycling");
    b.text({ x: p.x + m + 12, y: by + 3, w: p.w * 0.4, h: body * 3, wrap: true, text: "Triman — Étui carton : à recycler. Consignes pouvant varier localement : www.triercestdonner.fr", fontFamily: fonts.body, fontSize: body, fill: ink, role: "legal", name: "Info-tri (Triman)", legalKey: "recycling", panelId: p.id });
  }
  barcode(ctx, p.x + p.w - m - 30, by, 30, 16);
}

function barcode(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const { b, p } = ctx;
  b.rect({ x, y, w, h, fill: "#ffffff", role: "legal", name: "Code-barres EAN-13 (zone blanche)", legalKey: "barcode", panelId: p.id, locked: false });
  const r = rng(hashString(ctx.brief.productName));
  let bx = x + 2;
  while (bx < x + w - 2.5) {
    const bw = 0.3 + Math.floor(r() * 3) * 0.33;
    b.rect({ x: bx, y: y + 1.5, w: bw, h: h - 4.5, fill: "#111111", role: "legal", name: "Code-barres · barre", legalKey: "barcode", panelId: p.id, locked: true });
    bx += bw + 0.33 + Math.floor(r() * 2) * 0.33;
  }
  b.text({ x, y: y + h - 2.8, w, h: 2.4, text: "3 760000 000000", fontFamily: "Inter", fontSize: 2, fill: "#111111", align: "center", role: "legal", name: "Code-barres · chiffres", legalKey: "barcode", panelId: p.id, locked: true });
}

function sidePanel(ctx: Ctx, isRight: boolean) {
  const { p, m, pal, fonts, brief, b } = ctx;
  panelBg(ctx, isRight ? pal.primary : mix(pal.primary, pal.background, 0.0), "Fond du côté");
  if (p.w < 18) return;
  const fg = pal.onPrimary;
  // Texte orienté verticalement (lecture de bas en haut) : jamais déformé, seulement pivoté.
  const len = p.h - 2 * m;
  const thick = p.w - 2 * m;
  const nameFit = fitText(brief.productName || "Nom du produit", fonts.heading, len * 0.62, thick * 0.55, { maxLines: 1, uppercase: ctx.style.uppercaseName, weight: fonts.headingWeight });
  const brandFit = fitText((brief.brandName || "Marque").toUpperCase(), fonts.heading, len * 0.3, thick * 0.35, { maxLines: 1, uppercase: true, weight: 800 });
  b.text({ x: p.x + (p.w - brandFit.fontSize) / 2, y: p.y + p.h - m, w: len * 0.32, h: brandFit.fontSize * 1.1, rotation: -90, text: (brief.brandName || "Marque").toUpperCase(), fontFamily: fonts.heading, fontSize: brandFit.fontSize, fontWeight: 800, fill: fg, role: "logo", name: "Logo (côté)", panelId: p.id, letterSpacing: brandFit.fontSize * 0.05 });
  b.text({ x: p.x + (p.w - nameFit.fontSize) / 2, y: p.y + p.h - m - len * 0.36, w: len * 0.64, h: nameFit.fontSize * 1.1, rotation: -90, text: nameFit.lines[0], fontFamily: fonts.heading, fontSize: nameFit.fontSize, fontWeight: fonts.headingWeight, fill: fg, uppercase: ctx.style.uppercaseName, role: "productName", name: "Nom du produit (côté)", panelId: p.id });
  if (isRight) {
    const s = Math.max(2.5, Math.min(2.8, p.w * 0.05));
    b.rect({ x: p.x + m * 0.5, y: p.y + m * 0.5, w: p.w - m, h: s * 6.5, fill: "#ffffff", radius: 1, role: "legal", name: "Zone de marquage (DDM / lot)", legalKey: "bestBefore", panelId: p.id });
    b.text({ x: p.x + m * 0.5 + 1, y: p.y + m * 0.5 + 1, w: p.w - m - 2, h: s * 6, wrap: true, text: "À consommer de préférence avant fin / N° de lot : voir ci-contre", fontFamily: fonts.body, fontSize: s, fill: "#1b1b1f", role: "legal", name: "DDM / lot", legalKey: "bestBefore", panelId: p.id });
  } else {
    addWeight(ctx, p.x + m, p.y + m, p.w - 2 * m, fg, "center");
  }
}

function topPanel(ctx: Ctx) {
  const { p, m, pal } = ctx;
  panelBg(ctx, pal.primary, "Fond du dessus");
  addLogo(ctx, p.x + m, p.y + m, p.w * 0.4, p.h * 0.28, pal.onPrimary, "left");
  addName(ctx, p.x + m, p.y + p.h * 0.45, p.w - 2 * m, p.h * 0.42, pal.onPrimary, "left");
}

function bottomPanel(ctx: Ctx, dieline: Dieline) {
  const { p, m, pal, fonts, brief, b } = ctx;
  panelBg(ctx, pal.surface, "Fond du dessous");
  const hasRightSide = dieline.panels.some((q) => q.role === "right" && q.w >= 18);
  const s = Math.max(2.5, Math.min(2.8, p.h * 0.06));
  if (!hasRightSide) {
    b.text({ x: p.x + m, y: p.y + m, w: p.w * 0.6, h: s * 3, wrap: true, text: "À consommer de préférence avant fin / N° de lot : voir ci-contre", fontFamily: fonts.body, fontSize: s, fill: ensureContrast(pal.text, pal.surface), role: "legal", name: "DDM / lot", legalKey: "bestBefore", panelId: p.id });
  }
  b.text({ x: p.x + m, y: p.y + p.h - m - s * 1.4, w: p.w - 2 * m, h: s * 1.2, text: `${brief.brandName || "Votre marque"} · ${claimFor(brief)}`, fontFamily: fonts.body, fontSize: s, fontWeight: 700, fill: ensureContrast(pal.primary, pal.surface), role: "secondary", name: "Signature", panelId: p.id });
}
