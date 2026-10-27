"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
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

/** Définit ou change le mot de passe (un compte Google peut aussi en définir un). */
export async function updatePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordFormSchema.safeParse({
    currentPassword: formData.get("currentPassword") || undefined,
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (dbUser.passwordHash) {
    const ok = await bcrypt.compare(parsed.data.currentPassword ?? "", dbUser.passwordHash);
    if (!ok) return { fieldErrors: { currentPassword: "Mot de passe actuel incorrect." } };
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  // Les autres appareils sont déconnectés ; le jeton de cet appareil est resynchronisé.
  await unstable_update({ resync: resyncProof(user.id, updated.tokenVersion) } as never);
  return { ok: true, message: "Mot de passe enregistré. Tes autres appareils ont été déconnectés." };
}
