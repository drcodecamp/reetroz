import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  globalForPrisma.prisma ??= new PrismaClient();
  return globalForPrisma.prisma;
}
