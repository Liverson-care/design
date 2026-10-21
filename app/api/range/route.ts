import { NextResponse } from "next/server";
import type { Brief, DesignScene, Dieline } from "@/lib/types";
import { buildRange } from "@/lib/generator/range";
import { checkDesign, checkRange } from "@/lib/gms/check";

export const runtime = "nodejs";

/** POST /api/range — décline un design validé en gamme complète (même identité visuelle). */
export async function POST(req: Request) {
  const { base, names, dieline, brief } = (await req.json()) as { base: DesignScene; names: string[]; dieline: Dieline; brief: Brief };
  const clean = (names ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 8);
  if (!base?.elements || !clean.length) return NextResponse.json({ error: "Design de référence ou déclinaisons manquants." }, { status: 400 });
  const range = buildRange(base, clean);
  return NextResponse.json({
    range,
    reports: Object.fromEntries(range.map((d) => [d.id, checkDesign(d, dieline, { ...brief, productName: d.variantLabel ?? brief.productName })])),
    consistency: checkRange(range),
  });
}
