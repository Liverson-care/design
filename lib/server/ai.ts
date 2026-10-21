import type { Brief, StyleKey } from "@/lib/types";
import { categoryDef, sectorDef } from "@/lib/sectors";

export const aiEnabled = () => !!process.env.OPENAI_API_KEY;

const STYLE_PROMPT: Record<StyleKey, string> = {
  premium: "lumière douce et dorée, rendu haut de gamme",
  minimaliste: "lumière naturelle neutre, composition épurée",
  gourmet: "lumière chaude latérale, texture gourmande très appétissante",
  scandinave: "lumière nordique douce, tons pastel",
  "moderne-gms": "éclairage studio net et contrasté, couleurs vives",
  bio: "lumière naturelle, ingrédients frais du marché",
  luxe: "éclairage clair-obscur élégant",
  enfant: "couleurs joyeuses, présentation ludique",
  sante: "lumière blanche clinique, fond neutre, rendu net et rassurant",
};

/**
 * Génère une photographie culinaire détourée (fond transparent) via l'API OpenAI Images.
 * Le texte n'est jamais généré par l'IA : il est composé vectoriellement pour éviter les lettres déformées.
 */
export async function generateProductPhoto(brief: Brief, style: StyleKey, variant: number): Promise<string | undefined> {
  if (!aiEnabled()) return undefined;
  const angles = ["vue de trois-quarts", "vue de dessus", "gros plan serré", "vue légèrement plongeante", "présentation à l'assiette"];
  const prompt = [
    sectorDef(brief.sector).food
      ? `Photographie culinaire professionnelle, photoréaliste, de : ${brief.productName} (${categoryDef(brief.category).label}).`
      : `Photographie packshot professionnelle, photoréaliste, illustrant : ${brief.productName} (${categoryDef(brief.category).label}) — ingrédients ou matières évocatrices, sans flacon ni boîte de marque.`,
    `${angles[variant % angles.length]}, ${STYLE_PROMPT[style]}.`,
    "Produit seul, détouré sur fond transparent, sans aucun texte, sans logo, sans emballage, sans main.",
    "Qualité packshot pour emballage de grande distribution.",
  ].join(" ");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      size: "1024x1024",
      background: "transparent",
      output_format: "png",
      quality: "medium",
      n: 1,
    }),
  });
  if (!res.ok) {
    console.error("OpenAI Images :", res.status, await res.text().catch(() => ""));
    return undefined;
  }
  const json = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = json.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return item?.url;
}

export async function generateLibraryPhoto(name: string): Promise<string | undefined> {
  return generateProductPhoto(
    { sector: "alimentaire", brandName: "", productName: name, category: "plat-cuisine", positioning: "premium", colors: [], style: "gourmet", audience: "familles", country: "France", inspirations: [], constraints: "", netWeight: "", benefit: "", storage: "frais", gmsReference: "aucune" },
    "gourmet",
    0,
  );
}
