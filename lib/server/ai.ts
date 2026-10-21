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
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const refs = [...(brief.productRefs ?? []).slice(0, 4), ...(brief.inspirations ?? []).slice(0, 2)];
  let res: Response;
  if (refs.length) {
    // Avec des photos de référence : endpoint « edits », qui accepte plusieurs images d'entrée.
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", [
      prompt,
      brief.productRefs?.length ? `Les ${Math.min(4, brief.productRefs.length)} premières images montrent le produit fini réel : reproduis fidèlement sa forme, sa couleur, sa texture et ses ingrédients.` : "",
      brief.inspirations?.length ? "Les dernières images sont des emballages que le client aime : inspire-toi uniquement de leur lumière et de leur ambiance, sans reprendre de texte ni de logo." : "",
    ].filter(Boolean).join(" "));
    form.append("size", "1024x1024");
    form.append("background", "transparent");
    form.append("output_format", "png");
    form.append("quality", "medium");
    refs.forEach((src, i) => { const blob = dataUrlToBlob(src); if (blob) form.append("image[]", blob, `ref-${i}.png`); });
    res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, prompt, size: "1024x1024", background: "transparent", output_format: "png", quality: "medium", n: 1 }),
    });
  }
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

function dataUrlToBlob(src: string): Blob | null {
  const m = src.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!m) return null;
  const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  return new Blob([bytes], { type: m[1] });
}

const SCENE_PROMPT: Record<string, string> = {
  "studio-clair": "posé sur un fond de studio blanc cassé, éclairage photo professionnel doux, ombre portée naturelle",
  "studio-sombre": "sur un fond de studio sombre, éclairage dramatique avec contre-jour, reflets subtils",
  "table-bois": "posé sur une table en bois dans une cuisine lumineuse, arrière-plan flou, lumière naturelle de fenêtre",
  rayon: "en rayon de supermarché sur une tablette métallique, plusieurs exemplaires alignés, éclairage de magasin",
};

/**
 * Transforme le rendu 3D fidèle de l'emballage en photographie produit photoréaliste.
 * Le prompt impose de conserver à l'identique l'impression (textes, logo, couleurs, proportions).
 */
export async function photorealPackshot(render: string, backdrop: string, finish: string, substrate: string): Promise<string | undefined> {
  if (!aiEnabled()) return undefined;
  const blob = dataUrlToBlob(render);
  if (!blob) return undefined;
  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
  form.append("prompt", [
    "Photographie produit professionnelle, photoréaliste, de l'emballage montré dans l'image : même forme, mêmes proportions, même cadrage.",
    `Conserve exactement l'impression : textes, logo, couleurs, photo et mise en page identiques, sans rien ajouter ni retirer. Matière : ${substrate}, finition ${finish}.`,
    `Mise en scène : ${SCENE_PROMPT[backdrop] ?? SCENE_PROMPT["studio-clair"]}.`,
    "Rendu de catalogue haut de gamme : micro-relief du carton, arêtes nettes, reflets réalistes du vernis, profondeur de champ légère.",
  ].join(" "));
  form.append("size", "1536x1024");
  form.append("quality", "high");
  form.append("input_fidelity", "high");
  form.append("image[]", blob, "rendu.png");
  const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
  if (!res.ok) {
    console.error("OpenAI rendu photo :", res.status, await res.text().catch(() => ""));
    return undefined;
  }
  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  return b64 ? `data:image/png;base64,${b64}` : undefined;
}
