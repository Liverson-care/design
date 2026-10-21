import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import type { Brief, DesignScene, Dieline } from "@/lib/types";
import { prisma } from "@/lib/server/db";
import { currentUserId } from "@/lib/server/usage";

async function guard() {
  if (!prisma) return { error: NextResponse.json({ error: "Base de données non configurée : vos projets sont conservés dans ce navigateur." }, { status: 503 }) };
  const userId = await currentUserId();
  if (!userId) return { error: NextResponse.json({ error: "Connectez-vous pour enregistrer vos projets." }, { status: 401 }) };
  return { userId, db: prisma };
}

export async function GET() {
  const g = await guard();
  if ("error" in g) return g.error;
  const projects = await g.db.project.findMany({
    where: { userId: g.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, _count: { select: { designs: true } } },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const { id, name, dieline, brief, designs } = (await req.json()) as { id?: string; name: string; dieline: Dieline; brief: Brief; designs: DesignScene[] };
  const json = (v: unknown) => v as Prisma.InputJsonValue;
  const data = { name: name || brief.productName || "Projet sans titre", dieline: json(dieline), brief: json(brief) };
  const project = id
    ? await g.db.project.update({ where: { id, userId: g.userId }, data })
    : await g.db.project.create({ data: { ...data, userId: g.userId } });
  await g.db.design.deleteMany({ where: { projectId: project.id } });
  if (designs?.length) {
    await g.db.design.createMany({
      data: designs.map((d) => ({ projectId: project.id, name: d.name, style: d.style, scene: json(d), rangeId: d.rangeId ?? null })),
    });
  }
  return NextResponse.json({ id: project.id });
}
