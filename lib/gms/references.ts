import type { GmsReference, StyleKey } from "@/lib/types";

/**
 * Codes visuels génériques observés en rayon pour quelques références du marché français.
 * Seules des conventions (structure, hiérarchie, familles de couleurs, ton) sont appliquées :
 * aucun logo, illustration, typographie propriétaire ou élément protégé n'est repris.
 */
export interface ReferenceCodes {
  key: GmsReference;
  label: string;
  segment: string;
  codes: string[];
  /** Préférences appliquées au générateur */
  prefer: {
    layouts: string[];
    styles?: StyleKey[];
    lightBackground?: boolean;
    categoryBand?: boolean;
    logoPosition: "top-center" | "top-left";
    photoScale: number;
  };
}

export const GMS_REFERENCES: ReferenceCodes[] = [
  {
    key: "aucune",
    label: "Aucune référence",
    segment: "Générique",
    codes: ["Bonnes pratiques GMS standard"],
    prefer: { layouts: [], logoPosition: "top-center", photoScale: 1 },
  },
  {
    key: "picard",
    label: "Codes « surgelé premium » (type Picard)",
    segment: "Surgelés spécialisés",
    codes: [
      "Fond clair et uni, beaucoup d'air autour du produit",
      "Photo produit très grande, cadrée serrée et détourée",
      "Bandeau ou code couleur par famille de produits",
      "Typographie sobre, nom produit en bas de face",
    ],
    prefer: { layouts: ["plein-cadre", "hero-bas"], styles: ["minimaliste", "premium"], lightBackground: true, categoryBand: true, logoPosition: "top-left", photoScale: 1.2 },
  },
  {
    key: "findus",
    label: "Codes « marque nationale surgelés » (type Findus)",
    segment: "Surgelés grandes marques",
    codes: [
      "Photo appétissante mise en situation dans l'assiette",
      "Logo centré en haut, très visible",
      "Bandeau de couleur forte portant le nom produit",
      "Pictos de réassurance (pêche durable, sans colorant)",
    ],
    prefer: { layouts: ["bandeau", "hero-bas"], styles: ["moderne-gms"], categoryBand: true, logoPosition: "top-center", photoScale: 1.1 },
  },
  {
    key: "marie",
    label: "Codes « tradition & recettes » (type Marie)",
    segment: "Plats cuisinés, tartes, quiches",
    codes: [
      "Univers chaleureux et maison (tons crème, rouges profonds)",
      "Typographie serif ou manuscrite pour le nom de recette",
      "Cartouche de marque et assiette mise en scène",
      "Mise en avant du savoir-faire (« recette », « pâte pur beurre »)",
    ],
    prefer: { layouts: ["cadre", "hero-bas"], styles: ["gourmet", "premium"], logoPosition: "top-center", photoScale: 1 },
  },
  {
    key: "fleury-michon",
    label: "Codes « frais & nutrition » (type Fleury Michon)",
    segment: "Traiteur frais, charcuterie",
    codes: [
      "Fond blanc dominant, impression de fraîcheur",
      "Logo en haut à gauche, bloc couleur de marque",
      "Bénéfices nutritionnels et engagements très visibles",
      "Fenêtre ou photo du produit nette et lumineuse",
    ],
    prefer: { layouts: ["diagonale", "bandeau"], styles: ["minimaliste", "moderne-gms"], lightBackground: true, logoPosition: "top-left", photoScale: 1 },
  },
  {
    key: "carrefour",
    label: "Codes « marque de distributeur » (type Carrefour)",
    segment: "MDD grande distribution",
    codes: [
      "Charte de gamme stricte : bandeau de segment toujours au même endroit",
      "Nom produit très gros, lisible de loin",
      "Photo produit centrée, fond simple",
      "Mentions et pictos alignés sur une grille commune à toute la gamme",
    ],
    prefer: { layouts: ["bandeau", "diagonale"], styles: ["moderne-gms"], categoryBand: true, logoPosition: "top-left", photoScale: 1 },
  },
];

export function referenceCodes(key: GmsReference): ReferenceCodes {
  return GMS_REFERENCES.find((r) => r.key === key) ?? GMS_REFERENCES[0];
}
