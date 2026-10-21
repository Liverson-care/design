import { NextResponse } from "next/server";
import { aiEnabled, generateLibraryPhoto } from "@/lib/server/ai";
import { libraryItem } from "@/lib/library";

export const maxDuration = 60;

/** POST /api/library — version photoréaliste IA d'un élément de la bibliothèque */
export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "Ajoutez OPENAI_API_KEY pour générer des photos IA." }, { status: 503 });
  const { id } = (await req.json()) as { id: string };
  const item = libraryItem(id);
  if (!item) return NextResponse.json({ error: "Élément inconnu." }, { status: 404 });
  const src = await generateLibraryPhoto(item.name);
  if (!src) return NextResponse.json({ error: "La génération a échoué." }, { status: 502 });
  return NextResponse.json({ src });
}
