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
 * Banque d'éléments graphiques (fonds transparents) : alimentaire, épicerie, boissons, beauté, santé, animalerie, entretien.
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
  { id: "pates", name: "Pâtes", group: "Épicerie", src: "/assets/food/pates.svg", color: "#e2a03a", keywords: ["pâte", "pate", "spaghetti", "penne", "fusilli", "coquillette"] },
  { id: "cafe", name: "Grains de café", group: "Épicerie", src: "/assets/food/cafe.svg", color: "#6f4e37", keywords: ["café", "cafe", "arabica", "expresso"] },
  { id: "biscuit", name: "Biscuits", group: "Épicerie", src: "/assets/food/biscuit.svg", color: "#c58940", keywords: ["biscuit", "sablé", "gâteau", "cookie", "caramel"] },
  { id: "goutte", name: "Goutte d'eau", group: "Boissons", src: "/assets/food/goutte.svg", color: "#1e88e5", keywords: ["eau", "gazeuse", "plate", "hydrat"] },
  { id: "menthe", name: "Menthe", group: "Boissons", src: "/assets/food/menthe.svg", color: "#2e9e6a", keywords: ["menthe", "fraîcheur", "fraicheur", "mojito"] },
  { id: "creme", name: "Pot de crème", group: "Beauté & santé", src: "/assets/food/creme.svg", color: "#c7a17a", keywords: ["crème", "creme", "soin", "peau", "karité", "change"] },
  { id: "flacon", name: "Flacon pompe", group: "Beauté & santé", src: "/assets/food/flacon.svg", color: "#8fb9a8", keywords: ["flacon", "lait", "shampooing", "gel", "douche"] },
  { id: "lavande", name: "Lavande", group: "Beauté & santé", src: "/assets/food/lavande.svg", color: "#8e7cc3", keywords: ["lavande", "fleur", "relax", "sommeil", "coton"] },
  { id: "gelules", name: "Gélules & comprimés", group: "Beauté & santé", src: "/assets/food/gelules.svg", color: "#e85d04", keywords: ["gélule", "gelule", "comprimé", "vitamine", "mg", "magnésium", "zinc"] },
  { id: "croquettes", name: "Croquettes", group: "Animalerie", src: "/assets/food/croquettes.svg", color: "#b5651d", keywords: ["croquette", "chien", "chat", "chiot", "chaton"] },
  { id: "bulles", name: "Bulles & mousse", group: "Entretien", src: "/assets/food/bulles.svg", color: "#3a86ff", keywords: ["lessive", "vaisselle", "nettoyant", "mousse", "savon", "propre"] },
];

export const LIBRARY_GROUPS = ["Saumon", "Nuggets", "Pizza", "Légumes", "Olives", "Fromage", "Basilic", "Citron", "Glace", "Viande", "Pain", "Plats", "Épicerie", "Boissons", "Beauté & santé", "Animalerie", "Entretien"];

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
