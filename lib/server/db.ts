import { PrismaClient } from "@prisma/client";

export const hasDatabase = !!process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient | null = hasDatabase
  ? (globalForPrisma.prisma ??= new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] }))
  : null;
