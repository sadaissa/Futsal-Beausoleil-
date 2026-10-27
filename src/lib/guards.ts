import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "./prisma";

// Contrôles d'accès côté serveur, utilisés dans chaque page et chaque Server Action.

export type CurrentUser = {
  id: string;
  email: string;
  role: "ADMIN" | "PLAYER";
  nickname: string | null;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, role: true, nickname: true, avatarUrl: true, disabled: true },
  });
  if (!user || user.disabled) return null;
  return { id: user.id, email: user.email, role: user.role, nickname: user.nickname, avatarUrl: user.avatarUrl };
}

/** Utilisateur connecté avec surnom ; sinon redirection vers /login ou /onboarding. */
export async function requireUser(): Promise<CurrentUser & { nickname: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.nickname) redirect("/onboarding");
  return user as CurrentUser & { nickname: string };
}

/** Réservé à l'ADMIN : vérifié en base, jamais d'après le seul jeton. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Variante pour les Server Actions : lève une erreur au lieu de rediriger. */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Accès refusé");
  return user;
}

/**
 * Protection CSRF des routes API : l'en-tête Origin doit correspondre à l'hôte.
 * (Les Server Actions bénéficient déjà de cette vérification nativement dans Next.js.)
 */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function auditLog(actorId: string, action: string, target?: string, meta?: object) {
  await prisma.adminAuditLog.create({ data: { actorId, action, target, meta: meta ?? undefined } });
}
