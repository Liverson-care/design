import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/db";

export async function POST(req: Request) {
  if (!prisma) return NextResponse.json({ error: "Base de données non configurée (DATABASE_URL)." }, { status: 503 });
  const { email, password, name, company } = (await req.json()) as Record<string, string>;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8) {
    return NextResponse.json({ error: "E-mail valide et mot de passe de 8 caractères minimum requis." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  await prisma.user.create({ data: { email: email.toLowerCase(), name, company, passwordHash: await bcrypt.hash(password, 10) } });
  return NextResponse.json({ ok: true });
}
