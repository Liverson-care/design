import type { Brief, DesignElement, DesignScene, Dieline, LegalKey, Panel, TextElement } from "@/lib/types";

export { backgroundUnder, elementCenter };
import { contrastRatio, hexToRgb } from "@/lib/color";
import { backgroundUnder, elementCenter } from "@/lib/scene-geometry";
import { minNetWeightHeight } from "@/lib/generator/generate";
import { legalLabel, sectorDef } from "@/lib/sectors";

export type CheckStatus = "ok" | "warn" | "fail";

export interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  advice?: string;
  elementIds?: string[];
}

export interface GmsReport {
  score: number;
  items: CheckItem[];
}

/** Rapport hauteur de capitale / corps et hauteur d'œil / corps (moyennes typographiques) */
const CAP_RATIO = 0.72;
const X_RATIO = 0.5;
export const SHELF_DISTANCE_MM = 2000;
/** Règle d'usage en signalétique : 1 mm de hauteur de capitale pour 250 mm de distance de lecture. */
export const LEGIBILITY_FACTOR = 250;

export function readingDistance(dieline: Dieline): number {
  const front = dieline.panels.find((p) => p.role === "front");
  return front && Math.max(front.w, front.h) < 120 ? 1000 : SHELF_DISTANCE_MM;
}


function panelOf(el: DesignElement, dieline: Dieline): Panel | undefined {
  if (el.panelId) return dieline.panels.find((p) => p.id === el.panelId);
  const c = elementCenter(el);
  return dieline.panels.find((p) => c.x >= p.x && c.x <= p.x + p.w && c.y >= p.y && c.y <= p.y + p.h);
}

const status = (ok: boolean, warn: boolean): CheckStatus => (ok ? "ok" : warn ? "warn" : "fail");
const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export function checkDesign(scene: DesignScene, dieline: Dieline, brief: Brief): GmsReport {
  const items: CheckItem[] = [];
  const front = dieline.panels.find((p) => p.role === "front");
  const onFront = (el: DesignElement) => !front || panelOf(el, dieline)?.id === front.id;
  const texts = scene.elements.filter((e): e is TextElement => e.kind === "text");
  const frontTexts = texts.filter(onFront);

  // 1. Lisibilité à 2 m
  const names = frontTexts.filter((t) => t.role === "productName");
  const name = names.sort((a, b) => b.fontSize - a.fontSize)[0];
  // Distance de lecture : 2 m pour un étui ou un sachet en rayon, 1 m pour un petit format (pot, flacon, tube)
  const distance = readingDistance(dieline);
  const required = distance / LEGIBILITY_FACTOR;
  if (!name) {
    items.push({ id: "readability", label: `Lisibilité du nom produit à ${distance / 1000} m`, status: "fail", detail: "Aucun nom de produit sur la face avant.", advice: "Ajoutez le nom du produit sur la face avant." });
  } else {
    const cap = name.fontSize * CAP_RATIO;
    items.push({
      id: "readability",
      label: `Lisibilité du nom produit à ${distance / 1000} m`,
      status: status(cap >= required, cap >= required * 0.65),
      detail: `Hauteur de capitale ${fmt(cap)} mm (${fmt(name.fontSize / 0.3528)} pt) — minimum conseillé ${fmt(required)} mm pour une lecture à ${distance / 1000} m en rayon.`,
      advice: cap >= required ? undefined : "Agrandissez le nom du produit ou raccourcissez-le pour libérer de la place.",
      elementIds: [name.id],
    });
  }

  // 2. Hiérarchie du logo et ordre de lecture
  const logo = scene.elements.filter(onFront).find((e) => e.role === "logo");
  if (!logo || !front) {
    items.push({ id: "logo", label: "Hiérarchie du logo", status: "fail", detail: "Logo absent de la face avant.", advice: "La marque doit être identifiable en premier sur la face avant." });
  } else {
    const relTop = (logo.y - front.y) / front.h;
    const above = !name || logo.y <= name.y + 0.5;
    // Le poids net à sa hauteur légale minimale n'est pas compté : il ne peut pas être réduit.
    const legalWeight = (t: TextElement) => t.role === "weight" && t.fontSize * CAP_RATIO <= minNetWeightHeight(brief.netWeight) * 1.1;
    const competing = frontTexts.filter((t) => t.role !== "productName" && t.role !== "logo" && !legalWeight(t) && name && t.fontSize > name.fontSize);
    const ok = relTop <= 0.3 && above && !competing.length;
    items.push({
      id: "logo",
      label: "Hiérarchie du logo",
      status: status(ok, relTop <= 0.45 && !competing.length),
      detail: ok
        ? "Logo dans le tiers supérieur, au-dessus du nom produit ; aucun texte secondaire ne domine le nom."
        : competing.length
          ? `${competing.length} texte(s) secondaire(s) plus gros(s) que le nom du produit.`
          : "Le logo n'est pas dans le tiers supérieur ou passe sous le nom du produit.",
      advice: ok ? undefined : "Ordre de lecture GMS : logo → nom → photo → bénéfice → infos secondaires.",
      elementIds: [logo.id, ...competing.map((c) => c.id)],
    });
  }

  // 2 bis. Logo officiel imposé par le client
  if (brief.brandLogo && brief.logoMode !== "libre") {
    const official = scene.elements.filter((e) => e.kind === "image" && e.src === brief.brandLogo);
    const onFace = official.filter(onFront);
    const ar = brief.brandLogoAspect;
    const distorted = ar ? official.filter((e) => Math.abs(e.w / e.h - ar) > ar * 0.03) : [];
    items.push({
      id: "official-logo",
      label: "Logo officiel",
      status: !onFace.length ? "fail" : distorted.length ? "fail" : "ok",
      detail: !onFace.length
        ? "Le logo obligatoire est absent de la face avant."
        : distorted.length
          ? `${distorted.length} logo(s) déformé(s) : les proportions d'origine doivent être respectées.`
          : `Logo officiel présent sur ${official.length} zone(s), dont la face avant, dans ses proportions d'origine.`,
      advice: !onFace.length || distorted.length ? "Replacez le logo fourni sans le modifier." : undefined,
      elementIds: distorted.map((e) => e.id),
    });
  }

  // 3. Contraste des couleurs
  const contrastIssues: { el: TextElement; ratio: number; min: number }[] = [];
  let onPhoto = 0;
  for (const t of texts) {
    if (t.legalKey === "barcode") continue;
    const bg = backgroundUnder(scene, t);
    if (bg === "photo") { onPhoto++; continue; }
    if (!bg) continue;
    const large = t.fontSize * CAP_RATIO >= 4 || (t.fontWeight >= 700 && t.fontSize >= 4.9);
    const min = large ? 3 : 4.5;
    const ratio = contrastRatio(t.fill, bg);
    if (ratio < min) contrastIssues.push({ el: t, ratio, min });
  }
  const worst = contrastIssues.sort((a, b) => a.ratio - b.ratio)[0];
  items.push({
    id: "contrast",
    label: "Contraste des couleurs",
    status: contrastIssues.length ? (worst.ratio >= worst.min * 0.75 ? "warn" : "fail") : onPhoto ? "warn" : "ok",
    detail: contrastIssues.length
      ? `${contrastIssues.length} texte(s) sous le seuil WCAG AA — le plus faible : « ${worst.el.name} » ${fmt(worst.ratio)}:1 (min. ${worst.min}:1).`
      : onPhoto
        ? `Contrastes conformes ; ${onPhoto} texte(s) posé(s) directement sur une photo, à vérifier visuellement.`
        : "Tous les textes respectent le contraste WCAG AA (4,5:1, 3:1 pour les grands titres).",
    advice: contrastIssues.length ? "Foncez/éclaircissez le texte ou ajoutez un bandeau uni derrière." : undefined,
    elementIds: contrastIssues.map((c) => c.el.id),
  });

  // 4. Mentions réglementaires du secteur et emplacement
  const sector = sectorDef(brief.sector);
  const LABEL = (k: LegalKey) => legalLabel(sector, k);
  const legal = scene.elements.filter((e) => e.legalKey);
  const has = (k: LegalKey) => legal.some((e) => e.legalKey === k);
  const missing = sector.required.filter((k) => !has(k));
  // Info-tri Triman : obligatoire en France pour tout emballage ménager (loi AGEC)
  if (brief.country.toLowerCase().includes("france") && !has("recycling")) missing.push("recycling");
  const fieldIssues: string[] = [];
  for (const k of sector.front) {
    const els = legal.filter((e) => e.legalKey === k);
    if (els.length && front && !els.some(onFront)) fieldIssues.push(`${LABEL(k)} hors du champ visuel principal`);
  }
  const glue = dieline.panels.filter((p) => p.role === "glue").map((p) => p.id);
  const onGlue = legal.filter((e) => glue.includes(panelOf(e, dieline)?.id ?? ""));
  if (onGlue.length) fieldIssues.push("mention placée sur la patte de collage (non visible)");

  const weightEl = texts.find((t) => t.legalKey === "netWeight" && onFront(t));
  const minW = minNetWeightHeight(brief.netWeight);
  if (weightEl && weightEl.fontSize * CAP_RATIO < minW) fieldIssues.push(`poids net trop petit (${fmt(weightEl.fontSize * CAP_RATIO)} mm < ${minW} mm)`);

  const largest = Math.max(...dieline.panels.map((p) => p.w * p.h)) / 100;
  const minX = largest < 80 ? 0.9 : 1.2;
  const small = texts.filter((t) => t.legalKey && t.legalKey !== "barcode" && t.legalKey !== "braille" && t.fontSize * X_RATIO < minX - 1e-6);
  if (small.length) fieldIssues.push(`${small.length} mention(s) sous ${fmt(minX)} mm de hauteur d'œil`);

  items.push({
    id: "legal",
    label: "Mentions réglementaires",
    status: missing.length > 2 ? "fail" : missing.length || fieldIssues.length ? "warn" : "ok",
    detail: missing.length || fieldIssues.length
      ? [missing.length ? `Manquant : ${missing.map(LABEL).join(", ")}.` : "", fieldIssues.length ? `À corriger : ${fieldIssues.join(" ; ")}.` : ""].filter(Boolean).join(" ")
      : `${sector.front.map(LABEL).join(", ")} dans le champ visuel principal ; ${sector.required.filter((k) => !sector.front.includes(k)).map(LABEL).join(", ").toLowerCase()} présents.`,
    advice: missing.length || fieldIssues.length
      ? `${small.length && dieline.packType === "etiquette" ? "Surface insuffisante pour toutes les mentions : prévoyez une contre-étiquette ou une notice. " : ""}Référence : ${sector.regulation} ; loi AGEC pour l'info-tri.`
      : undefined,
    elementIds: [...small.map((s) => s.id), ...onGlue.map((e) => e.id)],
  });

  // 5. Grille et zones techniques
  const outside = scene.elements.filter((e) => {
    if (e.kind !== "text" || !e.panelId) return false;
    const p = dieline.panels.find((q) => q.id === e.panelId);
    if (!p) return false;
    const c = elementCenter(e);
    const horizontal = Math.abs(e.rotation % 180) < 1;
    const hw = (horizontal ? e.w : e.h) / 2, hh = (horizontal ? e.h : e.w) / 2;
    const s = dieline.safeMarginMm - 0.5;
    // Une zone logique (étiquette, sachet) n'a ni pli ni découpe sur ses bords intérieurs.
    const edge = (atBorder: boolean) => !p.virtual || atBorder;
    return (edge(p.x < 0.5) && c.x - hw < p.x + s) || (edge(p.x + p.w > dieline.widthMm - 0.5) && c.x + hw > p.x + p.w - s)
      || (edge(p.y < 0.5) && c.y - hh < p.y + s) || (edge(p.y + p.h > dieline.heightMm - 0.5) && c.y + hh > p.y + p.h - s);
  });
  items.push({
    id: "grid",
    label: "Grille & marges de sécurité",
    status: status(!outside.length, outside.length <= 2),
    detail: outside.length
      ? `${outside.length} texte(s) à moins de ${dieline.safeMarginMm} mm d'un pli ou d'une découpe.`
      : `Tous les textes respectent la marge de sécurité de ${dieline.safeMarginMm} mm.`,
    advice: outside.length ? "Éloignez les textes des plis : ils risquent d'être coupés ou de casser au rainage." : undefined,
    elementIds: outside.map((e) => e.id),
  });

  // 6. Appétence : photo produit
  const photos = scene.elements.filter((e) => e.kind === "image" && e.role === "photo" && onFront(e));
  const area = front ? photos.reduce((s, p) => s + p.w * p.h, 0) / (front.w * front.h) : 0;
  items.push({
    id: "photo",
    label: sector.visualLabel,
    // Petit format (pot, flacon) : le nom et les mentions légales prennent proportionnellement plus de place.
    status: distance < SHELF_DISTANCE_MM ? status(area >= 0.1, area >= 0.05) : status(area >= 0.2, area >= 0.12),
    detail: photos.length ? `La photo produit occupe ${Math.round(area * 100)} % de la face avant.` : "Aucune photo produit sur la face avant.",
    advice: area >= (distance < SHELF_DISTANCE_MM ? 0.1 : 0.2) ? undefined : `En rayon, le visuel produit doit couvrir au moins ${distance < SHELF_DISTANCE_MM ? 10 : 20} % de la face pour déclencher l'achat.`,
  });

  const weights: Record<CheckStatus, number> = { ok: 1, warn: 0.6, fail: 0 };
  const score = Math.round((items.reduce((s, i) => s + weights[i.status], 0) / items.length) * 100);
  return { score, items };
}

function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}

/** Cohérence d'une gamme : même identité, variantes clairement différenciées */
export function checkRange(scenes: DesignScene[]): CheckItem[] {
  if (scenes.length < 2) return [];
  const [ref, ...rest] = scenes;
  const pos = (s: DesignScene, role: string) => s.elements.find((e) => e.role === role);
  const items: CheckItem[] = [];

  const sameFonts = rest.every((s) => s.fonts.heading === ref.fonts.heading && s.fonts.body === ref.fonts.body);
  items.push({ id: "range-fonts", label: "Typographies communes", status: sameFonts ? "ok" : "fail", detail: sameFonts ? `${ref.fonts.heading} / ${ref.fonts.body} sur toute la gamme.` : "Les typographies diffèrent entre les variantes." });

  const logoRef = pos(ref, "logo");
  const logoOk = rest.every((s) => {
    const l = pos(s, "logo");
    return l && logoRef && Math.abs(l.x - logoRef.x) < 1 && Math.abs(l.y - logoRef.y) < 1;
  });
  items.push({ id: "range-logo", label: "Bloc marque au même endroit", status: logoOk ? "ok" : "fail", detail: logoOk ? "Le logo occupe exactement la même position sur chaque variante." : "Le logo se déplace d'une variante à l'autre." });

  const nameSizes = scenes.map((s) => (pos(s, "productName") as TextElement | undefined)?.fontSize ?? 0);
  const spread = Math.max(...nameSizes) / Math.max(0.1, Math.min(...nameSizes));
  items.push({ id: "range-name", label: "Taille du nom harmonisée", status: status(spread <= 1.05, spread <= 1.25), detail: spread <= 1.05 ? "Même corps de nom produit sur toute la gamme." : `Écart de corps de ${Math.round((spread - 1) * 100)} % entre variantes.` });

  const accents = scenes.map((s) => s.palette.accent);
  let minDist = Infinity;
  for (let i = 0; i < accents.length; i++) for (let j = i + 1; j < accents.length; j++) minDist = Math.min(minDist, colorDistance(accents[i], accents[j]));
  items.push({ id: "range-codes", label: "Codes couleur par variante", status: status(minDist > 60, minDist > 30), detail: minDist > 60 ? "Chaque variante possède un code couleur distinct, repérable en rayon." : "Certaines variantes ont des codes couleur trop proches." });

  const sameLayout = rest.every((s) => s.layout === ref.layout && s.palette.primary === ref.palette.primary);
  items.push({ id: "range-grid", label: "Grille et couleur de marque", status: sameLayout ? "ok" : "warn", detail: sameLayout ? "Même grille et même couleur de marque : la gamme forme un bloc en rayon." : "La grille ou la couleur de marque varie." });
  return items;
}
