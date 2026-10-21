import type { Brief } from "@/lib/types";

/**
 * Référentiel par secteur : catégories, visuels de la bibliothèque, mentions obligatoires
 * et textes par défaut. Le générateur et le contrôle réglementaire s'appuient uniquement sur ce fichier.
 */
export type Sector = "alimentaire" | "epicerie" | "boissons" | "cosmetique" | "hygiene" | "medicament" | "complement" | "animalerie" | "entretien";

export interface CategoryDef {
  key: string;
  label: string;
  hero: string; // identifiant bibliothèque
  garnish: string[];
  color: string;
  denomination: string;
  benefits: string[];
  /** Déclinaisons de gamme suggérées */
  variants: string[];
  usage?: string[]; // pictos de mode d'emploi
}

export interface LegalBlock {
  key: string;
  label: string;
  text: (b: Brief) => string;
  bold?: boolean;
}

export interface SectorDef {
  key: Sector;
  label: string;
  description: string;
  regulation: string;
  categories: CategoryDef[];
  /** Mentions devant figurer dans le champ visuel principal */
  front: string[];
  /** Mentions obligatoires (clés) */
  required: string[];
  blocks: LegalBlock[];
  table?: { title: string; rows: [string, string][]; key: string; label: string };
  storage: boolean; // question surgelé / frais / ambiant
  food: boolean;
  defaultStorage: string;
  visualLabel: string;
  weightLabel: string;
}

const brand = (b: Brief) => b.brandName || "Votre marque";

const FOOD_BLOCKS: LegalBlock[] = [
  { key: "ingredients", label: "Liste des ingrédients", text: () => "Ingrédients : liste à compléter par ordre pondéral décroissant. Les allergènes sont à mettre en évidence (gras)." },
  { key: "allergens", label: "Allergènes", text: () => "Allergènes : à compléter. Peut contenir des traces de : à compléter.", bold: true },
];

const NUTRITION: SectorDef["table"] = {
  title: "Valeurs nutritionnelles moyennes pour 100 g",
  key: "nutrition",
  label: "Tableau nutritionnel",
  rows: [["Énergie", "— kJ / — kcal"], ["Matières grasses", "— g"], ["dont acides gras saturés", "— g"], ["Glucides", "— g"], ["dont sucres", "— g"], ["Protéines", "— g"], ["Sel", "— g"]],
};

const FOOD_REQUIRED = ["denomination", "netWeight", "ingredients", "allergens", "nutrition", "storage", "bestBefore", "address", "barcode"];

const cat = (key: string, label: string, hero: string, garnish: string[], color: string, denomination: string, benefits: string[], variants: string[], usage?: string[]): CategoryDef =>
  ({ key, label, hero, garnish, color, denomination, benefits, variants, usage });

export const SECTORS: SectorDef[] = [
  {
    key: "alimentaire",
    label: "Produits frais & surgelés",
    description: "Traiteur, plats cuisinés, surgelés, crèmerie",
    regulation: "Règlement (UE) n° 1169/2011 (INCO)",
    food: true, storage: true, defaultStorage: "surgele", visualLabel: "Photo appétissante", weightLabel: "Poids net",
    front: ["denomination", "netWeight"], required: FOOD_REQUIRED, blocks: FOOD_BLOCKS, table: NUTRITION,
    categories: [
      cat("pizza", "Pizza", "pizza", ["basilic", "tomate", "olives", "fromage"], "#c8102e", "Pizza cuite au feu de bois", ["Pâte fine & croustillante", "Généreusement garnie", "Cuite au feu de bois"], ["Margherita", "4 Fromages", "Jambon Champignons", "Thon", "Légumes grillés"], ["four", "micro-ondes"]),
      cat("poisson", "Poisson", "saumon", ["citron", "basilic", "legumes"], "#0b5fa5", "Filets de poisson", ["100 % filet", "Pêche responsable", "Riche en oméga 3"], ["Saumon", "Thon", "Cabillaud citron", "Colin basilic"], ["four", "poele"]),
      cat("nuggets", "Nuggets & panés", "nuggets", ["citron", "legumes", "tomate"], "#f29f05", "Nuggets de poulet panés", ["Ultra croustillants", "100 % filet de poulet", "Prêts en 12 min"], ["Poulet nature", "Poulet épicé", "Fromage", "Légumes"], ["four", "poele"]),
      cat("quiche", "Quiche & tarte salée", "quiche", ["fromage", "epinards", "tomate", "basilic"], "#d9a21b", "Quiche pâte brisée", ["Pâte pur beurre", "Recette généreuse", "Œufs de plein air"], ["Saumon", "Épinards", "Fromage", "Thon", "Lorraine", "Champignons"], ["four", "micro-ondes"]),
      cat("plat-cuisine", "Plat cuisiné", "lasagnes", ["basilic", "tomate", "fromage"], "#8c3b1f", "Plat cuisiné", ["Recette mijotée", "Prêt en 5 min", "Sans conservateur"], ["Lasagnes bœuf", "Lasagnes saumon épinards", "Gratin légumes", "Lasagnes 3 fromages"], ["micro-ondes", "four"]),
      cat("glace", "Glace & dessert glacé", "glace", ["citron", "glace"], "#e85d9e", "Crème glacée", ["Onctueuse", "Lait entier", "Vraie gousse de vanille"], ["Vanille", "Fraise", "Chocolat", "Citron"], ["flocon"]),
      cat("fromage", "Fromage & crèmerie", "fromage", ["pain", "olives", "basilic"], "#f2b705", "Fromage au lait pasteurisé", ["Affiné avec soin", "Lait de nos régions", "Fondant & doux"], ["Nature", "Ail & fines herbes", "Olives", "Basilic"]),
      cat("viande", "Viande & charcuterie", "viande", ["legumes", "champignon", "basilic"], "#8b1e1e", "Préparation de viande", ["Viande française", "Tendre & savoureuse", "Élevage local"], ["Bœuf", "Poulet", "Champignons", "Basilic"], ["poele", "four"]),
      cat("legumes", "Légumes", "legumes", ["basilic", "tomate", "champignon"], "#3c9d3c", "Poêlée de légumes", ["Cueillis à maturité", "Prêts à poêler", "Riches en fibres"], ["Épinards", "Tomates", "Champignons", "Méditerranéenne"], ["poele", "micro-ondes"]),
    ],
  },
  {
    key: "epicerie",
    label: "Épicerie",
    description: "Épicerie salée et sucrée, boulangerie, apéritif",
    regulation: "Règlement (UE) n° 1169/2011 (INCO)",
    food: true, storage: false, defaultStorage: "ambiant", visualLabel: "Photo appétissante", weightLabel: "Poids net",
    front: ["denomination", "netWeight"], required: FOOD_REQUIRED, blocks: FOOD_BLOCKS, table: NUTRITION,
    categories: [
      cat("pates", "Pâtes, riz & céréales", "pates", ["basilic", "tomate", "fromage"], "#e2a03a", "Pâtes alimentaires de qualité supérieure", ["Blé dur 100 % français", "Cuisson 9 min", "Tient bien à la cuisson"], ["Spaghetti", "Penne", "Fusilli", "Coquillettes"], ["horloge"]),
      cat("cafe", "Café & thé", "cafe", ["biscuit"], "#6f4e37", "Café torréfié moulu", ["Torréfaction lente", "100 % arabica", "Intensité 8"], ["Classique", "Intense", "Décaféiné", "Bio"]),
      cat("biscuits", "Biscuits & gâteaux", "biscuit", ["cafe", "citron"], "#c58940", "Biscuits sablés", ["Pur beurre", "Recette traditionnelle", "Sans huile de palme"], ["Nature", "Chocolat", "Citron", "Caramel"]),
      cat("boulangerie", "Boulangerie & viennoiserie", "pain", ["fromage", "olives"], "#b9783f", "Pain précuit", ["Pétri lentement", "Croûte dorée", "Levain naturel"], ["Nature", "Céréales", "Complet", "Olives"], ["four"]),
      cat("sauces", "Sauces & condiments", "tomate", ["basilic", "olives"], "#c0392b", "Sauce tomate cuisinée", ["Tomates gorgées de soleil", "Mijotée lentement", "Sans sucres ajoutés"], ["Basilic", "Arrabbiata", "Olives", "Légumes"]),
      cat("aperitif", "Apéritif", "olives", ["citron", "basilic", "fromage"], "#6b8e23", "Assortiment apéritif", ["À partager", "Recette méditerranéenne", "Croquant"], ["Olives", "Tomates séchées", "Fromage", "Basilic"]),
    ],
  },
  {
    key: "boissons",
    label: "Boissons",
    description: "Jus, eaux, sodas, boissons végétales",
    regulation: "Règlement (UE) n° 1169/2011 (INCO)",
    food: true, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel appétissant", weightLabel: "Volume net",
    front: ["denomination", "netWeight"], required: FOOD_REQUIRED, blocks: FOOD_BLOCKS,
    table: { ...NUTRITION, title: "Valeurs nutritionnelles moyennes pour 100 ml" },
    categories: [
      cat("jus", "Jus & nectars", "citron", ["tomate", "lavande"], "#f2a900", "Pur jus de fruits", ["Pressé sans sucres ajoutés", "Riche en vitamine C", "Fruits du verger"], ["Orange", "Pomme", "Multifruits", "Citron"]),
      cat("eau", "Eaux", "goutte", ["citron", "menthe"], "#1e88e5", "Eau minérale naturelle", ["Faiblement minéralisée", "Source protégée", "Bouteille 100 % recyclée"], ["Plate", "Gazeuse", "Citron", "Menthe"]),
      cat("soda", "Sodas & boissons rafraîchissantes", "goutte", ["citron", "menthe"], "#e53935", "Boisson rafraîchissante aux extraits naturels", ["Zéro sucre", "Pétillant", "Arômes naturels"], ["Cola", "Citron", "Agrumes", "Menthe"]),
    ],
  },
  {
    key: "cosmetique",
    label: "Cosmétique",
    description: "Soin visage et corps, capillaire, maquillage",
    regulation: "Règlement (CE) n° 1223/2009 (cosmétiques)",
    food: false, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Contenance",
    front: ["denomination", "netWeight"],
    required: ["denomination", "function", "netWeight", "inci", "precautions", "pao", "lot", "responsible", "barcode"],
    blocks: [
      { key: "function", label: "Fonction du produit", text: () => "Soin hydratant quotidien. Appliquer matin et soir sur peau propre." },
      { key: "inci", label: "Liste des ingrédients (INCI)", text: () => "Ingredients : AQUA, GLYCERIN, … (liste INCI à compléter par ordre décroissant)." },
      { key: "precautions", label: "Précautions d'emploi", text: () => "Usage externe. Éviter le contour des yeux. En cas de contact, rincer abondamment.", bold: true },
      { key: "lot", label: "Numéro de lot", text: () => "Lot : voir sous le produit." },
      { key: "responsible", label: "Personne responsable (UE)", text: (b) => `${brand(b)} — adresse de la personne responsable dans l'UE à compléter.` },
    ],
    categories: [
      cat("soin-visage", "Soin visage", "creme", ["lavande", "goutte"], "#c7a17a", "Crème hydratante visage", ["Hydratation 24 h", "97 % d'ingrédients d'origine naturelle", "Testé dermatologiquement"], ["Peaux sèches", "Peaux normales", "Peaux sensibles", "Anti-âge"]),
      cat("corps", "Soin du corps", "flacon", ["lavande", "citron"], "#8fb9a8", "Lait hydratant corps", ["Pénètre rapidement", "Parfum délicat", "Formule vegan"], ["Amande douce", "Karité", "Fleur d'oranger", "Coco"]),
      cat("capillaire", "Capillaire", "flacon", ["menthe", "lavande"], "#6c5b7b", "Shampooing doux", ["Sans sulfates", "Cheveux brillants", "Usage fréquent"], ["Cheveux secs", "Cheveux gras", "Cheveux colorés", "Antipelliculaire"]),
    ],
  },
  {
    key: "hygiene",
    label: "Hygiène",
    description: "Gel douche, savon, dentifrice, bébé",
    regulation: "Règlement (CE) n° 1223/2009 (cosmétiques)",
    food: false, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Contenance",
    front: ["denomination", "netWeight"],
    required: ["denomination", "function", "netWeight", "inci", "precautions", "pao", "lot", "responsible", "barcode"],
    blocks: [
      { key: "function", label: "Fonction du produit", text: () => "Nettoie en douceur. Faire mousser sur peau mouillée puis rincer." },
      { key: "inci", label: "Liste des ingrédients (INCI)", text: () => "Ingredients : AQUA, SODIUM COCO-SULFATE, … (liste INCI à compléter)." },
      { key: "precautions", label: "Précautions d'emploi", text: () => "Éviter le contact avec les yeux. Tenir hors de portée des enfants.", bold: true },
      { key: "lot", label: "Numéro de lot", text: () => "Lot : voir sous le produit." },
      { key: "responsible", label: "Personne responsable (UE)", text: (b) => `${brand(b)} — adresse de la personne responsable dans l'UE à compléter.` },
    ],
    categories: [
      cat("douche", "Gel douche & savon", "flacon", ["bulles", "lavande"], "#4fb3bf", "Gel douche surgras", ["pH neutre pour la peau", "Mousse onctueuse", "Biodégradable"], ["Fleur de coton", "Agrumes", "Lavande", "Menthe"]),
      cat("dentaire", "Hygiène dentaire", "menthe", ["goutte"], "#00a19a", "Dentifrice au fluor", ["Protection caries", "Haleine fraîche", "Émail renforcé"], ["Menthe fraîche", "Blancheur", "Gencives sensibles", "Junior"]),
      cat("bebe", "Bébé", "creme", ["goutte", "lavande"], "#9fc5e8", "Crème de change", ["Dès la naissance", "Sans parfum", "Formule hypoallergénique"], ["Crème de change", "Lingettes", "Lait de toilette", "Liniment"]),
    ],
  },
  {
    key: "medicament",
    label: "Médicament (OTC)",
    description: "Médicaments sans ordonnance vendus en officine",
    regulation: "Code de la santé publique, art. R.5121-138 · directive 2001/83/CE",
    food: false, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Contenance",
    front: ["denomination", "dci", "netWeight"],
    required: ["denomination", "dci", "netWeight", "route", "excipients", "childWarning", "storage", "lot", "amm", "holder", "braille", "barcode"],
    blocks: [
      { key: "route", label: "Voie et mode d'administration", text: () => "Voie orale. Lire attentivement la notice avant utilisation." },
      { key: "excipients", label: "Excipients à effet notoire", text: () => "Excipients à effet notoire : à compléter (voir notice)." },
      { key: "childWarning", label: "Mise en garde enfants", text: () => "Tenir hors de la vue et de la portée des enfants.", bold: true },
      { key: "lot", label: "Lot & date de péremption", text: () => "Lot : — · EXP : —/—" },
      { key: "amm", label: "Numéro d'AMM", text: () => "AMM n° 34009 — — — (à compléter) · Médicament autorisé n°." },
      { key: "holder", label: "Titulaire de l'AMM", text: (b) => `Titulaire / exploitant : ${brand(b)} — adresse à compléter.` },
    ],
    categories: [
      cat("antalgique", "Douleur & fièvre", "gelules", ["goutte"], "#d62839", "Paracétamol 500 mg, comprimé", ["Douleurs et fièvre", "Dès 15 ans (à confirmer)", "Comprimés sécables"], ["500 mg", "1000 mg", "Effervescent", "Enfant"]),
      cat("orl", "Rhume & ORL", "gelules", ["menthe", "citron"], "#0077b6", "Pastilles pour la gorge", ["Apaise la gorge", "Goût miel citron", "Sans sucre"], ["Miel citron", "Menthe", "Fruits rouges", "Sans sucre"]),
      cat("digestion", "Digestion", "gelules", ["menthe"], "#2a9d8f", "Comprimés à croquer", ["Brûlures d'estomac", "Action rapide", "Goût menthe"], ["Menthe", "Fruits", "Sans sucre", "Format voyage"]),
    ],
  },
  {
    key: "complement",
    label: "Compléments alimentaires",
    description: "Vitamines, minéraux, plantes",
    regulation: "Directive 2002/46/CE · décret n° 2006-352",
    food: true, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Poids net",
    front: ["denomination", "netWeight"],
    required: ["denomination", "netWeight", "ingredients", "allergens", "nutrition", "dailyDose", "supplementWarnings", "storage", "bestBefore", "address", "barcode"],
    blocks: [
      ...FOOD_BLOCKS,
      { key: "dailyDose", label: "Dose journalière recommandée", text: () => "Conseil d'utilisation : 1 gélule par jour avec un verre d'eau. Ne pas dépasser la dose journalière recommandée." },
      { key: "supplementWarnings", label: "Avertissements obligatoires", text: () => "Tenir hors de portée des jeunes enfants. Ne se substitue pas à une alimentation variée, équilibrée et à un mode de vie sain.", bold: true },
    ],
    table: { title: "Teneurs pour 1 gélule (% VNR)", key: "nutrition", label: "Tableau des nutriments", rows: [["Vitamine C", "— mg (— %)"], ["Vitamine D", "— µg (— %)"], ["Magnésium", "— mg (— %)"], ["Zinc", "— mg (— %)"]] },
    categories: [
      cat("vitamines", "Vitamines & minéraux", "gelules", ["citron", "goutte"], "#f4a300", "Complément alimentaire à base de vitamines", ["Réduit la fatigue", "Défenses naturelles", "Cure de 30 jours"], ["Vitamine C", "Vitamine D", "Magnésium", "Multivitamines"]),
      cat("sommeil", "Sommeil & stress", "gelules", ["lavande"], "#5e60ce", "Complément alimentaire à base de plantes", ["Endormissement facilité", "Sans accoutumance", "Mélatonine & plantes"], ["Sommeil", "Stress", "Relaxation", "Nuit complète"]),
      cat("articulations", "Articulations & forme", "gelules", ["menthe"], "#2a9d8f", "Complément alimentaire", ["Mobilité au quotidien", "Collagène marin", "Cure de 1 mois"], ["Articulations", "Énergie", "Minceur", "Beauté"]),
    ],
  },
  {
    key: "animalerie",
    label: "Animalerie",
    description: "Aliments chiens, chats, rongeurs",
    regulation: "Règlement (CE) n° 767/2009",
    food: false, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Poids net",
    front: ["denomination", "netWeight"],
    required: ["denomination", "netWeight", "species", "composition", "analytical", "feedingGuide", "bestBefore", "address", "barcode"],
    blocks: [
      { key: "species", label: "Espèce et stade de vie", text: () => "Aliment complet pour chiens adultes." },
      { key: "composition", label: "Composition", text: () => "Composition : à compléter (par ordre pondéral décroissant). Additifs : à compléter." },
      { key: "feedingGuide", label: "Mode d'emploi", text: () => "Mode d'emploi : voir tableau de rationnement. Laisser de l'eau fraîche à disposition." },
    ],
    table: { title: "Constituants analytiques", key: "analytical", label: "Constituants analytiques", rows: [["Protéines brutes", "— %"], ["Matières grasses brutes", "— %"], ["Cellulose brute", "— %"], ["Cendres brutes", "— %"], ["Humidité", "— %"]] },
    categories: [
      cat("chien", "Chien", "croquettes", ["viande", "legumes"], "#b5651d", "Aliment complet pour chiens", ["Riche en poulet", "Digestion facile", "Pelage brillant"], ["Adulte", "Chiot", "Senior", "Light"]),
      cat("chat", "Chat", "croquettes", ["saumon", "thon"], "#7b5ea7", "Aliment complet pour chats", ["Riche en saumon", "Santé urinaire", "Sans céréales"], ["Saumon", "Poulet", "Stérilisé", "Chaton"]),
    ],
  },
  {
    key: "entretien",
    label: "Entretien de la maison",
    description: "Lessive, vaisselle, nettoyants",
    regulation: "Règlement (CE) n° 1272/2008 (CLP) · règlement (CE) n° 648/2004",
    food: false, storage: false, defaultStorage: "ambiant", visualLabel: "Visuel produit", weightLabel: "Contenance",
    front: ["denomination", "netWeight", "clp"],
    required: ["denomination", "netWeight", "clp", "hazard", "composition", "ufi", "usage", "address", "barcode"],
    blocks: [
      { key: "hazard", label: "Mentions de danger et conseils de prudence", text: () => "ATTENTION. Provoque une sévère irritation des yeux. Tenir hors de portée des enfants. EN CAS DE CONTACT AVEC LES YEUX : rincer avec précaution à l'eau.", bold: true },
      { key: "composition", label: "Composition (règlement détergents)", text: () => "Contient : 5-15 % agents de surface anioniques, <5 % agents de surface non ioniques, parfum. (à compléter)" },
      { key: "ufi", label: "Code UFI", text: () => "UFI : XXXX-XXXX-XXXX-XXXX" },
      { key: "usage", label: "Mode d'emploi & dosage", text: () => "Dosage : 1 bouchon pour 5 L d'eau. Ne pas mélanger avec d'autres produits." },
    ],
    categories: [
      cat("lessive", "Lessive", "bulles", ["lavande", "goutte"], "#3a86ff", "Lessive liquide", ["Efficace dès 20 °C", "Fraîcheur longue durée", "Formule concentrée"], ["Fraîcheur", "Couleurs", "Peaux sensibles", "Lavande"]),
      cat("vaisselle", "Vaisselle", "bulles", ["citron", "goutte"], "#06d6a0", "Liquide vaisselle", ["Dégraissant puissant", "Doux pour les mains", "Écolabel"], ["Citron", "Menthe", "Aloe vera", "Concentré"]),
      cat("multi-usage", "Nettoyant multi-usage", "bulles", ["citron", "lavande"], "#ef476f", "Nettoyant ménager multi-usage", ["Sans rinçage", "Fait briller", "Origine végétale"], ["Citron", "Lavande", "Vinaigre blanc", "Pin"]),
    ],
  },
];

export const LEGAL_COMMON: Record<string, string> = {
  denomination: "Dénomination",
  netWeight: "Quantité nette",
  storage: "Conditions de conservation",
  bestBefore: "DDM / DLC et n° de lot",
  address: "Nom et adresse de l'exploitant",
  barcode: "Code-barres EAN",
  recycling: "Info-tri (Triman)",
  origin: "Origine",
  dci: "Substance active (DCI) et dosage",
  pao: "Période après ouverture (PAO)",
  braille: "Nom en braille",
  clp: "Pictogrammes de danger CLP",
};

export function sectorDef(key: Sector | undefined): SectorDef {
  return SECTORS.find((s) => s.key === key) ?? SECTORS[0];
}

export function allCategories(): CategoryDef[] {
  return SECTORS.flatMap((s) => s.categories);
}

export function categoryDef(key: string): CategoryDef {
  return allCategories().find((c) => c.key === key) ?? SECTORS[0].categories[0];
}

export function sectorOfCategory(key: string): SectorDef {
  return SECTORS.find((s) => s.categories.some((c) => c.key === key)) ?? SECTORS[0];
}

export function legalLabel(sector: SectorDef, key: string): string {
  if (sector.table?.key === key) return sector.table.label;
  return sector.blocks.find((b) => b.key === key)?.label ?? LEGAL_COMMON[key] ?? key;
}

/** Transcription braille (grade 1, lettres et chiffres) pour la zone de gaufrage des médicaments */
export function toBraille(text: string): string {
  const map = "⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵";
  const digits = "⠚⠁⠃⠉⠙⠑⠋⠛⠓⠊";
  let out = "";
  let inNumber = false;
  for (const ch of text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) {
    if (ch >= "a" && ch <= "z") { out += map[ch.charCodeAt(0) - 97]; inNumber = false; }
    else if (ch >= "0" && ch <= "9") { out += (inNumber ? "" : "⠼") + digits[+ch]; inNumber = true; }
    else if (ch === " ") { out += "⠀"; inNumber = false; }
  }
  return out;
}
