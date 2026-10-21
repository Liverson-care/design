import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { currentUserId } from "@/lib/server/usage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId }, include: { designs: { orderBy: { createdAt: "asc" } } } });
  if (!project) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  return NextResponse.json({ project: { ...project, designs: project.designs.map((d) => d.scene) } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { id } = await params;
  await prisma.project.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
