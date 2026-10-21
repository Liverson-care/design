import type { Category } from "@/lib/types";

export interface LibraryItem {
  id: string;
  name: string;
  group: string;
  src: string;
  /** Couleur dominante, utilisée comme accent pour les déclinaisons de gamme */
  color: string;
  keywords: string[];
}

/**
 * Banque d'éléments graphiques alimentaires (fonds transparents).
 * Les visuels fournis sont des illustrations détaillées ; lorsqu'une clé OpenAI est configurée,
 * chaque élément peut être remplacé par une photographie culinaire générée (bouton « Version photo IA »).
 */
export const LIBRARY: LibraryItem[] = [
  { id: "saumon", name: "Pavé de saumon", group: "Saumon", src: "/assets/food/saumon.svg", color: "#f08a5d", keywords: ["saumon", "poisson", "salmon"] },
  { id: "thon", name: "Thon", group: "Saumon", src: "/assets/food/thon.svg", color: "#b5485d", keywords: ["thon", "tuna"] },
  { id: "nuggets", name: "Nuggets dorés", group: "Nuggets", src: "/assets/food/nuggets.svg", color: "#e7a33e", keywords: ["nugget", "pané", "croquette"] },
  { id: "poulet", name: "Cuisse de poulet", group: "Nuggets", src: "/assets/food/poulet.svg", color: "#c97b2f", keywords: ["poulet", "volaille", "chicken"] },
  { id: "pizza", name: "Pizza", group: "Pizza", src: "/assets/food/pizza.svg", color: "#d1452f", keywords: ["pizza", "margherita"] },
  { id: "legumes", name: "Légumes du potager", group: "Légumes", src: "/assets/food/legumes.svg", color: "#4c9a2a", keywords: ["légume", "legume", "brocoli", "carotte", "potager"] },
  { id: "tomate", name: "Tomates", group: "Légumes", src: "/assets/food/tomate.svg", color: "#e0362c", keywords: ["tomate", "tomato"] },
  { id: "epinards", name: "Épinards", group: "Légumes", src: "/assets/food/epinards.svg", color: "#2f7d32", keywords: ["épinard", "epinard", "spinach", "poireau"] },
  { id: "champignon", name: "Champignons", group: "Légumes", src: "/assets/food/champignon.svg", color: "#a47551", keywords: ["champignon", "cèpe", "mushroom"] },
  { id: "olives", name: "Olives", group: "Olives", src: "/assets/food/olives.svg", color: "#5d6b2f", keywords: ["olive", "tapenade", "apéritif"] },
  { id: "fromage", name: "Fromage", group: "Fromage", src: "/assets/food/fromage.svg", color: "#f2c14e", keywords: ["fromage", "emmental", "comté", "chèvre", "chevre", "cheese", "lorraine"] },
  { id: "basilic", name: "Basilic", group: "Basilic", src: "/assets/food/basilic.svg", color: "#3a8f3a", keywords: ["basilic", "pesto", "herbe"] },
  { id: "citron", name: "Citron", group: "Citron", src: "/assets/food/citron.svg", color: "#f5d50a", keywords: ["citron", "lemon", "agrume"] },
  { id: "glace", name: "Glace", group: "Glace", src: "/assets/food/glace.svg", color: "#f4a6c0", keywords: ["glace", "sorbet", "vanille", "fraise", "chocolat"] },
  { id: "viande", name: "Pièce de bœuf", group: "Viande", src: "/assets/food/viande.svg", color: "#9e2a2b", keywords: ["viande", "boeuf", "bœuf", "steak", "jambon", "lardon"] },
  { id: "pain", name: "Pain de campagne", group: "Pain", src: "/assets/food/pain.svg", color: "#c58940", keywords: ["pain", "baguette", "brioche", "viennoiserie"] },
  { id: "quiche", name: "Quiche", group: "Plats", src: "/assets/food/quiche.svg", color: "#e2b04a", keywords: ["quiche", "tarte"] },
  { id: "lasagnes", name: "Lasagnes", group: "Plats", src: "/assets/food/lasagnes.svg", color: "#c2512f", keywords: ["lasagne", "gratin", "plat"] },
];

export const LIBRARY_GROUPS = ["Saumon", "Nuggets", "Pizza", "Légumes", "Olives", "Fromage", "Basilic", "Citron", "Glace", "Viande", "Pain", "Plats"];

export const HERO_BY_CATEGORY: Record<Category, string> = {
  pizza: "pizza",
  poisson: "saumon",
  nuggets: "nuggets",
  quiche: "quiche",
  "plat-cuisine": "lasagnes",
  glace: "glace",
  fromage: "fromage",
  boulangerie: "pain",
  legumes: "legumes",
  viande: "viande",
  aperitif: "olives",
};

/** Garnitures d'accompagnement suggérées autour de la photo principale */
export const GARNISH_BY_CATEGORY: Record<Category, string[]> = {
  pizza: ["basilic", "tomate", "olives", "fromage"],
  poisson: ["citron", "basilic", "legumes"],
  nuggets: ["citron", "legumes", "tomate"],
  quiche: ["fromage", "epinards", "tomate", "basilic"],
  "plat-cuisine": ["basilic", "tomate", "fromage"],
  glace: ["citron", "glace"],
  fromage: ["pain", "olives", "basilic"],
  boulangerie: ["fromage", "olives"],
  legumes: ["basilic", "tomate", "champignon"],
  viande: ["legumes", "champignon", "basilic"],
  aperitif: ["citron", "basilic", "fromage"],
};

export function libraryItem(id: string): LibraryItem | undefined {
  return LIBRARY.find((i) => i.id === id);
}

/** Trouve l'ingrédient le plus pertinent pour un libellé (« Quiche Saumon » → saumon). */
export function matchIngredient(label: string, exclude: string[] = []): LibraryItem | undefined {
  const l = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let best: LibraryItem | undefined;
  let bestLen = 0;
  for (const item of LIBRARY) {
    if (exclude.includes(item.id)) continue;
    for (const k of item.keywords) {
      const kk = k.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (l.includes(kk) && kk.length > bestLen) { best = item; bestLen = kk.length; }
    }
  }
  return best;
}
