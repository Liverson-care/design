import type { Brief, Positioning } from "@/lib/types";
import { categoryDef, sectorDef } from "@/lib/sectors";

const POSITIONING_CLAIM: Record<Positioning, string> = {
  premium: "Sélection premium",
  familial: "Format familial",
  discount: "Petit prix, grand résultat",
  bio: "Issu de l'agriculture biologique",
  terroir: "Recette de nos terroirs",
  sante: "Formule équilibrée",
};

export function categoryLabel(key: string): string {
  return categoryDef(key).label;
}

export function denomination(brief: Brief): string {
  const base = categoryDef(brief.category).denomination;
  return sectorDef(brief.sector).storage && brief.storage === "surgele" ? `${base} — produit surgelé` : base;
}

export function benefitFor(brief: Brief, variant: number): string {
  if (brief.benefit.trim()) return brief.benefit.trim();
  const list = categoryDef(brief.category).benefits;
  return list[variant % list.length];
}

export function claimFor(brief: Brief): string {
  return POSITIONING_CLAIM[brief.positioning];
}

export function storageMention(brief: Brief): string {
  const sector = sectorDef(brief.sector);
  if (sector.key === "medicament") return "À conserver à une température ne dépassant pas 25 °C, dans l'emballage d'origine.";
  if (sector.key === "complement") return "À conserver à l'abri de la chaleur, de la lumière et de l'humidité.";
  if (!sector.food) return "À conserver à l'abri de la chaleur et de la lumière.";
  switch (sector.storage ? brief.storage : "ambiant") {
    case "surgele":
      return "À conserver au congélateur à -18 °C. Ne jamais recongeler un produit décongelé.";
    case "frais":
      return "À conserver entre 0 °C et +4 °C. À consommer rapidement après ouverture.";
    default:
      return "À conserver dans un endroit sec, à l'abri de la chaleur.";
  }
}

export function usageIcons(brief: Brief): string[] {
  return categoryDef(brief.category).usage ?? [];
}

export function originLabel(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("france")) return "Fabriqué en France";
  if (c.includes("belg")) return "Fabriqué en Belgique";
  if (c.includes("suisse")) return "Fabriqué en Suisse";
  return `Commercialisé en ${country}`;
}
