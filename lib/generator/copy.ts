import type { Brief, Category, Positioning } from "@/lib/types";

export const CATEGORY_LABELS: Record<Category, string> = {
  pizza: "Pizza",
  poisson: "Poisson",
  nuggets: "Nuggets",
  quiche: "Quiche & tarte salée",
  "plat-cuisine": "Plat cuisiné",
  glace: "Glace",
  fromage: "Fromage",
  boulangerie: "Boulangerie",
  legumes: "Légumes",
  viande: "Viande",
  aperitif: "Apéritif",
};

const DENOMINATION: Record<Category, string> = {
  pizza: "Pizza cuite au feu de bois",
  poisson: "Filets de poisson",
  nuggets: "Nuggets de poulet panés",
  quiche: "Quiche pâte brisée",
  "plat-cuisine": "Plat cuisiné",
  glace: "Crème glacée",
  fromage: "Fromage au lait pasteurisé",
  boulangerie: "Pain précuit",
  legumes: "Poêlée de légumes",
  viande: "Préparation de viande",
  aperitif: "Assortiment apéritif",
};

const BENEFITS: Record<Category, string[]> = {
  pizza: ["Pâte fine & croustillante", "Généreusement garnie", "Cuite au feu de bois"],
  poisson: ["100 % filet", "Pêche responsable", "Riche en oméga 3"],
  nuggets: ["Ultra croustillants", "100 % filet de poulet", "Prêts en 12 min"],
  quiche: ["Pâte pur beurre", "Recette généreuse", "Œufs de plein air"],
  "plat-cuisine": ["Recette mijotée", "Prêt en 5 min", "Sans conservateur"],
  glace: ["Onctueuse", "Lait entier", "Vraie gousse de vanille"],
  fromage: ["Affiné avec soin", "Lait de nos régions", "Fondant & doux"],
  boulangerie: ["Pétri lentement", "Croûte dorée", "Levain naturel"],
  legumes: ["Cueillis à maturité", "Prêts à poêler", "Riches en fibres"],
  viande: ["Viande française", "Tendre & savoureuse", "Élevage local"],
  aperitif: ["À partager", "Recette méditerranéenne", "Croquant"],
};

const POSITIONING_CLAIM: Record<Positioning, string> = {
  premium: "Sélection premium",
  familial: "Format familial",
  discount: "Petit prix, grand goût",
  bio: "Issu de l'agriculture biologique",
  terroir: "Recette de nos terroirs",
  sante: "Nutri-équilibre",
};

export function denomination(brief: Brief): string {
  const base = DENOMINATION[brief.category];
  return brief.storage === "surgele" ? `${base} — produit surgelé` : base;
}

export function benefitFor(brief: Brief, variant: number): string {
  if (brief.benefit.trim()) return brief.benefit.trim();
  const list = BENEFITS[brief.category];
  return list[variant % list.length];
}

export function claimFor(brief: Brief): string {
  return POSITIONING_CLAIM[brief.positioning];
}

export function storageMention(brief: Brief): string {
  switch (brief.storage) {
    case "surgele":
      return "À conserver au congélateur à -18 °C. Ne jamais recongeler un produit décongelé.";
    case "frais":
      return "À conserver entre 0 °C et +4 °C. À consommer rapidement après ouverture.";
    default:
      return "À conserver dans un endroit sec, à l'abri de la chaleur.";
  }
}

export function cookingIcons(category: Category): string[] {
  switch (category) {
    case "pizza":
    case "quiche":
      return ["four", "micro-ondes"];
    case "nuggets":
    case "poisson":
      return ["four", "poele"];
    case "plat-cuisine":
      return ["micro-ondes", "four"];
    case "glace":
      return ["flocon"];
    case "legumes":
    case "viande":
      return ["poele", "four"];
    default:
      return ["horloge"];
  }
}

export function originLabel(country: string): string {
  const c = country.toLowerCase();
  if (c.includes("france")) return "Fabriqué en France";
  if (c.includes("belg")) return "Fabriqué en Belgique";
  if (c.includes("suisse")) return "Fabriqué en Suisse";
  return `Commercialisé en ${country}`;
}

export const NUTRITION_ROWS = [
  ["Énergie", "— kJ / — kcal"],
  ["Matières grasses", "— g"],
  ["dont acides gras saturés", "— g"],
  ["Glucides", "— g"],
  ["dont sucres", "— g"],
  ["Protéines", "— g"],
  ["Sel", "— g"],
];
