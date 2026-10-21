import type { Category, FontPair, Palette, StyleKey } from "@/lib/types";

export type DecorKind = "waves" | "dots" | "leaves" | "stripes" | "arc" | "confetti" | "frame" | "rays" | "none";

export interface StyleDef {
  key: StyleKey;
  label: string;
  description: string;
  palettes: Omit<Palette, "name" | "onPrimary">[];
  fonts: FontPair[];
  decor: DecorKind[];
  uppercaseName: boolean;
  radius: number;
  preview: [string, string, string];
}

const P = (background: string, surface: string, primary: string, secondary: string, accent: string, text: string) => ({ background, surface, primary, secondary, accent, text });

export const STYLES: StyleDef[] = [
  {
    key: "premium",
    label: "Premium",
    description: "Fonds profonds, dorures, typographie serif élégante",
    palettes: [P("#14213d", "#1d2d50", "#c9a227", "#f4ecd8", "#e5c76b", "#f8f4ea"), P("#2b1d14", "#3b291c", "#d4a24c", "#f3e6cf", "#b8862f", "#fbf6ec"), P("#0f3b2e", "#174c3c", "#d6b25e", "#eef3ea", "#a98b3e", "#f6f7f1")],
    fonts: [
      { heading: "Playfair Display", headingWeight: 700, body: "Montserrat", bodyWeight: 500 },
      { heading: "Cormorant Garamond", headingWeight: 700, body: "Inter", bodyWeight: 500 },
      { heading: "DM Serif Display", headingWeight: 400, body: "Josefin Sans", bodyWeight: 600 },
    ],
    decor: ["frame", "arc", "rays"],
    uppercaseName: false,
    radius: 2,
    preview: ["#14213d", "#c9a227", "#f8f4ea"],
  },
  {
    key: "minimaliste",
    label: "Minimaliste",
    description: "Beaucoup de blanc, une couleur signature, grille stricte",
    palettes: [P("#ffffff", "#f4f4f2", "#1f1f1f", "#e9e7e1", "#ff5a36", "#1f1f1f"), P("#f6f3ee", "#ffffff", "#2d4a3e", "#e3ddd3", "#c86b3c", "#1e1e1e"), P("#ffffff", "#eef2f6", "#0e4c92", "#dfe7f1", "#f2a541", "#14213d")],
    fonts: [
      { heading: "Inter", headingWeight: 800, body: "Inter", bodyWeight: 500 },
      { heading: "Josefin Sans", headingWeight: 700, body: "Inter", bodyWeight: 400 },
      { heading: "Work Sans", headingWeight: 700, body: "Work Sans", bodyWeight: 400 },
    ],
    decor: ["none", "stripes", "dots"],
    uppercaseName: true,
    radius: 0,
    preview: ["#ffffff", "#1f1f1f", "#ff5a36"],
  },
  {
    key: "gourmet",
    label: "Gourmet",
    description: "Tons chauds, matières, typographie généreuse",
    palettes: [P("#3d1f14", "#5a2e1c", "#e8a23a", "#f6e3c5", "#c2512f", "#fff7ea"), P("#f3e3c8", "#fff6e6", "#7a2e1d", "#e8cfa5", "#c8812e", "#3a1d12"), P("#5b1a18", "#7a2522", "#f2c14e", "#f8e7cf", "#e07a3f", "#fff8ef")],
    fonts: [
      { heading: "Fraunces", headingWeight: 800, body: "Montserrat", bodyWeight: 500 },
      { heading: "Playfair Display", headingWeight: 900, body: "Lora", bodyWeight: 500 },
      { heading: "DM Serif Display", headingWeight: 400, body: "Montserrat", bodyWeight: 500 },
    ],
    decor: ["arc", "waves", "rays"],
    uppercaseName: false,
    radius: 4,
    preview: ["#3d1f14", "#e8a23a", "#fff7ea"],
  },
  {
    key: "scandinave",
    label: "Scandinave",
    description: "Pastels doux, formes organiques, sans-serif arrondie",
    palettes: [P("#eef3f1", "#ffffff", "#2f5d62", "#d8e6e1", "#e9a68b", "#1f3a3d"), P("#f4efe8", "#ffffff", "#5c7a99", "#e4dcd0", "#d9a441", "#2b3440"), P("#f1f4f8", "#ffffff", "#7a9e7e", "#dbe5dc", "#e07a5f", "#24312a")],
    fonts: [
      { heading: "Josefin Sans", headingWeight: 700, body: "Nunito", bodyWeight: 600 },
      { heading: "Nunito", headingWeight: 800, body: "Nunito", bodyWeight: 500 },
      { heading: "Work Sans", headingWeight: 600, body: "Nunito", bodyWeight: 500 },
    ],
    decor: ["waves", "dots", "leaves"],
    uppercaseName: true,
    radius: 10,
    preview: ["#eef3f1", "#2f5d62", "#e9a68b"],
  },
  {
    key: "moderne-gms",
    label: "Moderne GMS",
    description: "Contrastes forts, bandeau couleur, lisible à 2 m en rayon",
    palettes: [P("#ffffff", "#f2f5f9", "#0057b8", "#e6eef9", "#ffcd00", "#0b1f3a"), P("#fff8e6", "#ffffff", "#d62828", "#fde2c2", "#fcbf49", "#1d1d1d"), P("#ffffff", "#f1f8f1", "#00843d", "#e3f2e6", "#f9a825", "#10301d")],
    fonts: [
      { heading: "Montserrat", headingWeight: 900, body: "Montserrat", bodyWeight: 600 },
      { heading: "Poppins", headingWeight: 800, body: "Poppins", bodyWeight: 500 },
      { heading: "Oswald", headingWeight: 700, body: "Inter", bodyWeight: 600 },
    ],
    decor: ["stripes", "rays", "arc"],
    uppercaseName: true,
    radius: 6,
    preview: ["#0057b8", "#ffcd00", "#ffffff"],
  },
  {
    key: "bio",
    label: "Bio",
    description: "Kraft, verts naturels, pictos feuilles",
    palettes: [P("#efe4cf", "#f8f1e3", "#3f6b35", "#dcc9a3", "#9bbf4c", "#2a3a1f"), P("#f5f1e6", "#ffffff", "#5a7d2a", "#e5dcc5", "#d9a03f", "#26331c"), P("#e8eddf", "#f8faf3", "#2e5e3e", "#cfd9bf", "#c97b3d", "#1e2e22")],
    fonts: [
      { heading: "Fraunces", headingWeight: 700, body: "Nunito", bodyWeight: 600 },
      { heading: "Lora", headingWeight: 700, body: "Work Sans", bodyWeight: 500 },
      { heading: "Josefin Sans", headingWeight: 700, body: "Nunito", bodyWeight: 500 },
    ],
    decor: ["leaves", "waves", "dots"],
    uppercaseName: false,
    radius: 8,
    preview: ["#efe4cf", "#3f6b35", "#9bbf4c"],
  },
  {
    key: "luxe",
    label: "Luxe",
    description: "Noir profond, or, capitales espacées",
    palettes: [P("#0b0b0c", "#18181b", "#cfae6b", "#f2eee6", "#8c7448", "#f5f1e8"), P("#1a1423", "#261d33", "#d9b77e", "#efe6d8", "#a1855b", "#f7f2ea"), P("#101820", "#1b2733", "#c5a46d", "#e9e4dc", "#7f6a46", "#f3efe7")],
    fonts: [
      { heading: "Cinzel", headingWeight: 700, body: "Josefin Sans", bodyWeight: 400 },
      { heading: "Cormorant Garamond", headingWeight: 600, body: "Montserrat", bodyWeight: 400 },
      { heading: "Playfair Display", headingWeight: 600, body: "Josefin Sans", bodyWeight: 400 },
    ],
    decor: ["frame", "rays", "none"],
    uppercaseName: true,
    radius: 0,
    preview: ["#0b0b0c", "#cfae6b", "#f5f1e8"],
  },
  {
    key: "enfant",
    label: "Enfant",
    description: "Couleurs vives, formes rondes, typographie ludique",
    palettes: [P("#ffd23f", "#fff3c4", "#ee4266", "#3bceac", "#540d6e", "#2b1240"), P("#5bc0eb", "#e3f6fd", "#fde74c", "#9bc53d", "#e55934", "#10324a"), P("#ff8c42", "#ffe8d6", "#2ec4b6", "#ffbf69", "#cb48b7", "#2d1e2f")],
    fonts: [
      { heading: "Baloo 2", headingWeight: 800, body: "Nunito", bodyWeight: 700 },
      { heading: "Nunito", headingWeight: 900, body: "Nunito", bodyWeight: 700 },
      { heading: "Poppins", headingWeight: 800, body: "Nunito", bodyWeight: 700 },
    ],
    decor: ["confetti", "dots", "waves"],
    uppercaseName: true,
    radius: 14,
    preview: ["#ffd23f", "#ee4266", "#3bceac"],
  },
];

export function styleDef(key: StyleKey): StyleDef {
  return STYLES.find((s) => s.key === key) ?? STYLES[4];
}

export const CATEGORY_COLORS: Record<Category, string> = {
  pizza: "#c8102e",
  poisson: "#0b5fa5",
  nuggets: "#f29f05",
  quiche: "#d9a21b",
  "plat-cuisine": "#8c3b1f",
  glace: "#e85d9e",
  fromage: "#f2b705",
  boulangerie: "#b9783f",
  legumes: "#3c9d3c",
  viande: "#8b1e1e",
  aperitif: "#6b8e23",
};

/** Polices chargées depuis Google Fonts et largeur moyenne d'un caractère (en em) */
export const FONTS: Record<string, { weights: number[]; charWidth: number }> = {
  "Playfair Display": { weights: [400, 600, 700, 900], charWidth: 0.56 },
  "Cormorant Garamond": { weights: [500, 600, 700], charWidth: 0.5 },
  "DM Serif Display": { weights: [400], charWidth: 0.54 },
  Fraunces: { weights: [400, 700, 800], charWidth: 0.6 },
  Montserrat: { weights: [400, 500, 600, 700, 900], charWidth: 0.66 },
  Poppins: { weights: [500, 700, 800], charWidth: 0.64 },
  Inter: { weights: [400, 500, 600, 700, 800], charWidth: 0.6 },
  "Work Sans": { weights: [400, 500, 600, 700], charWidth: 0.6 },
  Oswald: { weights: [500, 700], charWidth: 0.46 },
  Nunito: { weights: [500, 600, 700, 800, 900], charWidth: 0.6 },
  "Baloo 2": { weights: [600, 700, 800], charWidth: 0.6 },
  Lora: { weights: [500, 700], charWidth: 0.57 },
  "Josefin Sans": { weights: [400, 600, 700], charWidth: 0.6 },
  Cinzel: { weights: [400, 700], charWidth: 0.74 },
};

export function googleFontsHref(): string {
  const families = Object.entries(FONTS)
    .map(([name, f]) => `family=${name.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
