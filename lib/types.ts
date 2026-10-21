// Modèle de données partagé client / serveur. Toutes les coordonnées sont en millimètres.

export type Pt = { x: number; y: number };
export type Segment = { a: Pt; b: Pt };

export type LineKind = "cut" | "fold" | "ignore";

export type PanelRole = "front" | "back" | "left" | "right" | "top" | "bottom" | "flap" | "glue";

export interface Panel {
  id: string;
  role: PanelRole;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DielineSource = "pdf" | "ai" | "svg" | "template";

export interface Dieline {
  id: string;
  name: string;
  source: DielineSource;
  widthMm: number;
  heightMm: number;
  /** Tracés de découpe (polylignes, courbes aplaties). Jamais modifiés par la génération. */
  cutPaths: Pt[][];
  /** Lignes de pli / rainage. Jamais modifiées par la génération. */
  foldLines: Segment[];
  panels: Panel[];
  bleedMm: number;
  safeMarginMm: number;
  /** Dimensions du volume monté (L × H × P) utilisées pour la 3D */
  box: { lengthMm: number; heightMm: number; depthMm: number };
  /** Rendu du fichier d'origine (aperçu "avant") */
  originalPreview?: string;
  warnings: string[];
}

// ---------- Questionnaire ----------

export type Category =
  | "pizza"
  | "poisson"
  | "nuggets"
  | "quiche"
  | "plat-cuisine"
  | "glace"
  | "fromage"
  | "boulangerie"
  | "legumes"
  | "viande"
  | "aperitif";

export type Positioning = "premium" | "familial" | "discount" | "bio" | "terroir" | "sante";

export type StyleKey =
  | "premium"
  | "minimaliste"
  | "gourmet"
  | "scandinave"
  | "moderne-gms"
  | "bio"
  | "luxe"
  | "enfant";

export type Audience = "familles" | "enfants" | "jeunes-actifs" | "seniors" | "sportifs" | "gourmets";

export type GmsReference = "aucune" | "picard" | "findus" | "marie" | "fleury-michon" | "carrefour";

export interface Brief {
  brandName: string;
  brandLogo?: string; // data URL
  productName: string;
  category: Category;
  positioning: Positioning;
  colors: string[]; // hex
  style: StyleKey;
  audience: Audience;
  country: string;
  inspirations: string[]; // data URLs
  constraints: string;
  // Compléments utiles aux mentions
  netWeight: string;
  benefit: string;
  storage: "surgele" | "frais" | "ambiant";
  gmsReference: GmsReference;
}

// ---------- Scène de design ----------

export type ElementRole =
  | "background"
  | "decor"
  | "logo"
  | "productName"
  | "photo"
  | "benefit"
  | "secondary"
  | "weight"
  | "legal"
  | "icon";

interface BaseElement {
  id: string;
  name: string;
  role: ElementRole;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity?: number;
  /** Élément non sélectionnable dans l'éditeur (fonds techniques) */
  locked?: boolean;
  panelId?: string;
  /** Mention réglementaire portée par l'élément (contrôle GMS / INCO) */
  legalKey?: LegalKey;
}

export type LegalKey =
  | "denomination"
  | "netWeight"
  | "ingredients"
  | "allergens"
  | "nutrition"
  | "storage"
  | "bestBefore"
  | "address"
  | "origin"
  | "recycling"
  | "barcode";

export interface TextElement extends BaseElement {
  kind: "text";
  text: string;
  fontFamily: string;
  /** Taille de police en mm (1 pt = 0,3528 mm) */
  fontSize: number;
  fontWeight: number;
  italic?: boolean;
  fill: string;
  align: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  /** Retour à la ligne automatique (paragraphes) */
  wrap?: boolean;
}

export interface RectElement extends BaseElement {
  kind: "rect";
  fill: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface EllipseElement extends BaseElement {
  kind: "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ImageElement extends BaseElement {
  kind: "image";
  src: string;
  /** Identifiant d'un élément de la bibliothèque, si applicable */
  libraryId?: string;
}

export interface PathElement extends BaseElement {
  kind: "path";
  /** Données SVG dans un repère viewBox × viewBox */
  data: string;
  viewBox: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export type DesignElement = TextElement | RectElement | EllipseElement | ImageElement | PathElement;

export interface Palette {
  name: string;
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  onPrimary: string;
}

export interface FontPair {
  heading: string;
  headingWeight: number;
  body: string;
  bodyWeight: number;
}

export interface DesignScene {
  id: string;
  name: string;
  style: StyleKey;
  layout: string;
  palette: Palette;
  fonts: FontPair;
  elements: DesignElement[];
  /** Variante de gamme (ex. « Saumon ») */
  variantLabel?: string;
  rangeId?: string;
  createdAt: number;
  usedAi?: boolean;
}

export interface Usage {
  used: number;
  limit: number;
  plan: "FREE" | "PRO";
}
