import { NextResponse } from "next/server";
import { aiEnabled, photorealPackshot } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/render — photographie photoréaliste de l'emballage final à partir du rendu 3D fidèle */
export async function POST(req: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ error: "Le rendu photo IA nécessite une clé OPENAI_API_KEY. Le rendu 3D reste disponible." }, { status: 503 });
  }
  const { image, backdrop, finish, substrate } = (await req.json()) as Record<string, string>;
  if (!image?.startsWith("data:image/")) return NextResponse.json({ error: "Image du rendu manquante." }, { status: 400 });
  const photo = await photorealPackshot(image, backdrop, finish, substrate);
  if (!photo) return NextResponse.json({ error: "La génération de la photo a échoué. Réessayez dans un instant." }, { status: 502 });
  return NextResponse.json({ photo });
}
