import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import type { Usage } from "@/lib/types";
import { authOptions } from "./auth";
import { prisma } from "./db";

export const FREE_QUOTA = Number(process.env.FREE_DESIGN_QUOTA ?? 5);
const COOKIE = "packai_usage";
const SECRET = process.env.NEXTAUTH_SECRET ?? "packai-dev-secret-a-remplacer";

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function readCookie(raw: string | undefined): number {
  if (!raw) return 0;
  const [value, sig] = raw.split(".");
  if (!value || !sig) return 0;
  const expected = sign(value);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return FREE_QUOTA; // cookie falsifié
  return Math.max(0, parseInt(value, 10) || 0);
}

export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

/**
 * Compteur de designs gratuits : en base pour un utilisateur connecté,
 * sinon dans un cookie signé (HMAC) pour les visiteurs.
 */
export async function getUsage(): Promise<Usage & { userId: string | null }> {
  const userId = prisma ? await currentUserId() : null;
  if (prisma && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return { used: user.designsUsed, limit: FREE_QUOTA, plan: user.plan, userId };
  }
  const jar = await cookies();
  return { used: readCookie(jar.get(COOKIE)?.value), limit: FREE_QUOTA, plan: "FREE", userId: null };
}

export async function consume(count: number, usedAi: boolean): Promise<Usage> {
  const usage = await getUsage();
  if (prisma && usage.userId) {
    const [user] = await prisma.$transaction([
      prisma.user.update({ where: { id: usage.userId }, data: { designsUsed: { increment: count } } }),
      prisma.generation.create({ data: { userId: usage.userId, count, usedAi } }),
    ]);
    return { used: user.designsUsed, limit: FREE_QUOTA, plan: user.plan };
  }
  const used = usage.used + count;
  const jar = await cookies();
  jar.set(COOKIE, `${used}.${sign(String(used))}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { used, limit: FREE_QUOTA, plan: "FREE" };
}
