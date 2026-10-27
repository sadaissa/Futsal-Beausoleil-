"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/guards";
import { resyncProof } from "@/lib/token-resync";
import type { ActionState } from "@/lib/action-result";
import { fieldErrors, nicknameFormSchema, nicknameKey, passwordFormSchema } from "@/lib/validations";

export async function updateNicknameAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
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
  revalidatePath("/", "layout");
  return { ok: true, message: "Surnom mis à jour." };
}

/**
 * Définit ou change le mot de passe (un compte Google peut aussi en définir un).
 * Sert aussi au changement obligatoire après une réinitialisation par l'ADMIN.
 */
export async function updatePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // getCurrentUser (et non requireUser) : cette action doit rester accessible
  // à un joueur qui doit changer son mot de passe temporaire.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = passwordFormSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true, mustChangePassword: true },
  });
  if (dbUser.passwordHash) {
    const ok = await bcrypt.compare(parsed.data.currentPassword ?? "", dbUser.passwordHash);
    if (!ok) return { fieldErrors: { currentPassword: "Mot de passe actuel incorrect." } };
    if (dbUser.mustChangePassword && (await bcrypt.compare(parsed.data.newPassword, dbUser.passwordHash))) {
      return { fieldErrors: { newPassword: "Choisis un mot de passe différent du mot de passe temporaire." } };
    }
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
    select: { tokenVersion: true },
  });
  // Les autres appareils sont déconnectés ; le jeton de cet appareil est resynchronisé.
  await unstable_update({ resync: resyncProof(user.id, updated.tokenVersion) } as never);
  if (dbUser.mustChangePassword) redirect(user.nickname ? "/account" : "/onboarding");
  return { ok: true, message: "Mot de passe enregistré. Tes autres appareils ont été déconnectés." };
}
