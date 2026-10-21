import { NextResponse } from "next/server";
import type { Brief, Dieline } from "@/lib/types";
import { generateDesigns, variantPlan } from "@/lib/generator/generate";
import { checkDesign } from "@/lib/gms/check";
import { aiEnabled, generateProductPhoto } from "@/lib/server/ai";
import { consume, getUsage } from "@/lib/server/usage";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  dieline: Dieline;
  brief: Brief;
  count?: number;
  useAi?: boolean;
}

/**
 * POST /api/generate — crée jusqu'à 5 propositions appliquées sur le gabarit.
 * Le gabarit (dimensions, plis, découpes) est utilisé en lecture seule.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { dieline, brief } = body;
  if (!dieline?.panels?.length || !brief?.productName) {
    return NextResponse.json({ error: "Gabarit ou questionnaire incomplet." }, { status: 400 });
  }

  const usage = await getUsage();
  const remaining = usage.plan === "PRO" ? Infinity : usage.limit - usage.used;
  if (remaining <= 0) {
    return NextResponse.json({ error: "Vous avez utilisé vos 5 designs gratuits. Passez à PackAI Pro pour continuer.", usage, locked: true }, { status: 402 });
  }
  const count = Math.max(1, Math.min(5, body.count ?? 5, remaining));

  const useAi = body.useAi !== false && aiEnabled();
  const heroImages = useAi
    ? await Promise.all(Array.from({ length: count }, (_, i) => generateProductPhoto(brief, variantPlan(brief, i).styleKey, i).catch(() => undefined)))
    : undefined;

  const designs = generateDesigns(dieline, brief, count, { heroImages });
  const reports = Object.fromEntries(designs.map((d) => [d.id, checkDesign(d, dieline, brief)]));
  const newUsage = await consume(designs.length, !!heroImages?.some(Boolean));

  return NextResponse.json({ designs, reports, usage: newUsage, ai: { enabled: aiEnabled(), used: !!heroImages?.some(Boolean) } });
}
