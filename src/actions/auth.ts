"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { signIn, signOut, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, auditLog } from "@/lib/guards";
import type { ActionState } from "@/lib/action-result";
import {
  adminSetupSchema,
  fieldErrors,
  loginSchema,
  nicknameFormSchema,
  nicknameKey,
  registerSchema,
} from "@/lib/validations";

/** N'accepte que des chemins internes pour éviter les redirections ouvertes. */
function safeCallback(value: FormDataEntryValue | null, fallback = "/sessions"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "E-mail ou mot de passe incorrect." };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallback(formData.get("callbackUrl")) });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "E-mail ou mot de passe incorrect." };
    throw e; // redirection Next.js
  }
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeCallback(formData.get("callbackUrl")) });
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, nickname } = parsed.data;

  const key = nicknameKey(nickname);
  const [emailTaken, nickTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { nicknameKey: key }, select: { id: true } }),
  ]);
  if (emailTaken) return { fieldErrors: { email: "Un compte existe déjà avec cet e-mail. Connecte-toi." } };
  if (nickTaken) return { fieldErrors: { nickname: "Ce surnom est déjà pris." } };

  try {
    await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password, 12), nickname, nicknameKey: key },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Cet e-mail ou ce surnom est déjà utilisé." };
    }
    throw e;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/account" });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { error: "Compte créé, mais la connexion a échoué. Connecte-toi." };
    throw e;
  }
}

/** Choix du surnom après une première connexion Google. */
export async function onboardingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = nicknameFormSchema.safeParse({ nickname: formData.get("nickname") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { nickname: parsed.data.nickname, nicknameKey: nicknameKey(parsed.data.nickname) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { nickname: "Ce surnom est déjà pris." } };
    }
    throw e;
  }
  await unstable_update({});
  redirect("/account");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Initialisation de l'ADMIN : possible une seule fois, tant qu'aucun ADMIN n'existe,
 * avec la clé ADMIN_SETUP_SECRET. Ensuite, seul un accès direct à la base permet
 * de créer un autre ADMIN.
 */
export async function adminSetupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const expected = process.env.ADMIN_SETUP_SECRET;
  if (!expected || expected.length < 12) {
    return { error: "ADMIN_SETUP_SECRET n'est pas configurée (12 caractères minimum)." };
  }
  const parsed = adminSetupSchema.safeParse({ secret: formData.get("secret") });
  if (!parsed.success || !secretMatches(parsed.data.secret, expected)) {
    await new Promise((r) => setTimeout(r, 1000)); // ralentit les essais en force brute
    return { error: "Clé d'administration invalide." };
  }

  // Transaction sérialisable : deux demandes simultanées ne peuvent pas créer deux ADMIN.
  const promoted = await prisma.$transaction(
    async (tx) => {
      if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0) return false;
      await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (!promoted) return { error: "Un ADMIN existe déjà. Cette page est désactivée." };

  await auditLog(user.id, "ADMIN_SETUP");
  await unstable_update({});
  redirect("/admin");
}
