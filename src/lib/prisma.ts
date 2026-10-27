import { PrismaClient } from "@prisma/client";

// Client Prisma unique : en développement, le rechargement à chaud recréerait
// sinon une connexion à chaque modification de fichier.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
