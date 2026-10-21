import type { LabelMode, PackType } from "@/lib/types";

export interface PackTypeDef {
  key: PackType;
  label: string;
  hint: string;
  examples: string;
  /** Dimensions proposées pour générer un gabarit standard (mm) */
  defaults: { length: number; height: number; depth?: number };
  fields: ("length" | "height" | "depth")[];
  labelModes?: { key: LabelMode; label: string; hint: string }[];
}

export const PACK_TYPES: PackTypeDef[] = [
  {
    key: "etiquette",
    label: "Étiquette",
    hint: "Pot, bocal, bouteille, flacon, barquette",
    examples: "Confiture, sauce, jus, crème, sirop",
    defaults: { length: 220, height: 70 },
    fields: ["length", "height"],
    labelModes: [
      { key: "enveloppante", label: "Enveloppante", hint: "Fait le tour du contenant : face au centre, mentions à l'arrière" },
      { key: "face", label: "Face simple", hint: "Une seule étiquette portant visuel et mentions" },
    ],
  },
  {
    key: "etui",
    label: "Étui 4 faces",
    hint: "Boîte pliante avec rabats",
    examples: "Surgelé, céréales, biscuits, médicament, cosmétique",
    defaults: { length: 160, height: 200, depth: 55 },
    fields: ["length", "height", "depth"],
  },
  {
    key: "fourreau",
    label: "Fourreau",
    hint: "Bande qui enveloppe une barquette ou un pot",
    examples: "Plat cuisiné, yaourts, fromage",
    defaults: { length: 190, height: 140, depth: 50 },
    fields: ["length", "height", "depth"],
  },
  {
    key: "sachet",
    label: "Sachet / doypack",
    hint: "Recto et verso côte à côte",
    examples: "Café, biscuits, croquettes, lessive",
    defaults: { length: 160, height: 230 },
    fields: ["length", "height"],
  },
  {
    key: "autre",
    label: "Autre forme",
    hint: "Plateau, boîte pizza, forme spéciale",
    examples: "Détection automatique des faces",
    defaults: { length: 160, height: 200, depth: 55 },
    fields: [],
  },
];

export function packTypeDef(key: PackType): PackTypeDef {
  return PACK_TYPES.find((p) => p.key === key) ?? PACK_TYPES[1];
}
