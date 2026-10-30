"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertAdmin, auditLog } from "@/lib/guards";
import type { ActionState } from "@/lib/action-result";
import { computeVoteWindow, defaultSessionTitle, fromLocalInput, isMonday } from "@/lib/dates";
import { getVoteSettings, saveVoteSettings } from "@/lib/settings";
import { publishSession } from "@/lib/results/publish";
import { computeAndSaveMonth } from "@/lib/rewards/compute-month";
import { generateTempPassword } from "@/lib/temp-password";
import {
  createSessionSchema,
  fieldErrors,
  guestSchema,
  idSchema,
  monthSchema,
  participantsSchema,
  nicknameKey,
  updateSessionSchema,
  voteSettingsSchema,
} from "@/lib/validations";

// =============================================================================
// Server Actions ADMIN. Chaque action revérifie le rôle en base (assertAdmin).
// Aucune de ces actions ne lit ni n'expose de données de vote individuelles.
// =============================================================================

function revalidateSessions(sessionId?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/sessions");
  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/team-of-the-week");
}

// ----------------------------------------------------------------------------- Réglages

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = voteSettingsSchema.safeParse({
    voteStartTime: formData.get("voteStartTime"),
    voteEndTime: formData.get("voteEndTime"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await saveVoteSettings(parsed.data);
  await auditLog(admin.id, "SETTINGS_UPDATE", undefined, parsed.data);
  revalidatePath("/admin");
  return { ok: true, message: "Horaires enregistrés (appliqués aux nouvelles sessions)." };
}

// ----------------------------------------------------------------------------- Sessions

export async function createSessionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = createSessionSchema.safeParse({
    date: formData.get("date"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!isMonday(parsed.data.date)) return { fieldErrors: { date: "La date doit être un lundi." } };

  const settings = await getVoteSettings();
  const { opensAt, closesAt } = computeVoteWindow(parsed.data.date, settings.voteStartTime, settings.voteEndTime);
  let id: string;
  try {
    const created = await prisma.gameSession.create({
      data: {
        date: new Date(`${parsed.data.date}T00:00:00.000Z`),
        title: parsed.data.title || defaultSessionTitle(parsed.data.date),
        voteOpensAt: opensAt,
        voteClosesAt: closesAt,
      },
    });
    id = created.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { date: "Une session existe déjà pour ce lundi." } };
    }
    throw e;
  }
  await auditLog(admin.id, "SESSION_CREATE", id);
  revalidateSessions();
  redirect(`/admin/sessions/${id}`);
}

export async function updateSessionAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = updateSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    title: formData.get("title"),
    voteOpensAt: formData.get("voteOpensAt"),
    voteClosesAt: formData.get("voteClosesAt"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const session = await prisma.gameSession.findUnique({ where: { id: parsed.data.sessionId } });
  if (!session) return { error: "Session introuvable." };
  if (session.status === "PUBLISHED") return { error: "Une session publiée ne peut plus être modifiée." };
  await prisma.gameSession.update({
    where: { id: session.id },
    data: {
      title: parsed.data.title,
      voteOpensAt: fromLocalInput(parsed.data.voteOpensAt),
      voteClosesAt: fromLocalInput(parsed.data.voteClosesAt),
    },
  });
  await auditLog(admin.id, "SESSION_UPDATE", session.id);
  revalidateSessions(session.id);
  return { ok: true, message: "Session mise à jour." };
}

export async function setParticipantsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = participantsSchema.safeParse({
    sessionId: formData.get("sessionId"),
    userIds: formData.getAll("userIds"),
  });
  if (!parsed.success) return { error: "Sélection invalide." };
  const { sessionId, userIds } = parsed.data;

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (!session) return { error: "Session introuvable." };
  if (session.status === "PUBLISHED") return { error: "Une session publiée ne peut plus être modifiée." };

  const receipts = await prisma.voteReceipt.count({ where: { sessionId } });
  const current = await prisma.sessionParticipant.findMany({ where: { sessionId }, select: { userId: true } });
  const wanted = new Set(userIds);
  const toRemove = current.filter((p) => !wanted.has(p.userId)).map((p) => p.userId);
  // Retirer un joueur après le début des votes fausserait le scrutin : on l'interdit.
  if (receipts > 0 && toRemove.length > 0) {
    return { error: "Des votes ont déjà été enregistrés : impossible de retirer un participant." };
  }
  const valid = await prisma.user.findMany({
    where: { id: { in: userIds }, disabled: false, nickname: { not: null } },
    select: { id: true },
  });
  const existing = new Set(current.map((p) => p.userId));
  await prisma.$transaction([
    prisma.sessionParticipant.deleteMany({ where: { sessionId, userId: { in: toRemove } } }),
    prisma.sessionParticipant.createMany({
      data: valid.filter((u) => !existing.has(u.id)).map((u) => ({ sessionId, userId: u.id })),
      skipDuplicates: true,
    }),
  ]);
  await auditLog(admin.id, "SESSION_PARTICIPANTS", sessionId, { count: valid.length });
  revalidateSessions(sessionId);
  return { ok: true, message: `${valid.length} participant(s) enregistré(s).` };
}

export async function openVoteAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("sessionId"));
  await prisma.gameSession.updateMany({
    where: { id, status: { in: ["SCHEDULED", "CLOSED"] } },
    data: { status: "OPEN", closedAt: null },
  });
  await auditLog(admin.id, "VOTE_OPEN", id);
  revalidateSessions(id);
}

export async function closeVoteAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("sessionId"));
  await prisma.gameSession.updateMany({
    where: { id, status: { in: ["SCHEDULED", "OPEN"] } },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  await auditLog(admin.id, "VOTE_CLOSE", id);
  revalidateSessions(id);
}

/** Clôture la session : ferme le vote, calcule et publie la Team of the Week. */
export async function publishSessionAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("sessionId"));
  const res = await publishSession(id);
  if (res.published) await auditLog(admin.id, "SESSION_PUBLISH", id);
  revalidateSessions(id);
  revalidatePath("/monthly");
}

export async function deleteSessionAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("sessionId"));
  const session = await prisma.gameSession.findUnique({ where: { id }, select: { status: true } });
  // Une session publiée fait partie de l'historique : elle n'est pas supprimable.
  if (!session || session.status === "PUBLISHED") return;
  await prisma.gameSession.delete({ where: { id } });
  await auditLog(admin.id, "SESSION_DELETE", id);
  revalidateSessions();
  redirect("/admin/sessions");
}

/**
 * Ajoute un joueur invité (ponctuel, sans compte) et, si une session est indiquée,
 * le coche directement comme participant. L'invité est conservé dans la liste
 * pour les sessions suivantes ; il ne peut ni se connecter ni voter.
 */
export async function addGuestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = guestSchema.safeParse({
    name: formData.get("name"),
    sessionId: formData.get("sessionId") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, sessionId } = parsed.data;

  if (sessionId) {
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId }, select: { status: true } });
    if (!session) return { error: "Session introuvable." };
    if (session.status === "PUBLISHED") return { error: "Une session publiée ne peut plus être modifiée." };
  }

  let guestId: string;
  try {
    const guest = await prisma.user.create({
      data: {
        // Adresse fictive en .invalid (domaine réservé) : aucune connexion ni e-mail possible.
        email: `invite-${randomBytes(8).toString("hex")}@invite.invalid`,
        nickname: name,
        nicknameKey: nicknameKey(name),
        isGuest: true,
      },
    });
    guestId = guest.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { name: "Ce nom est déjà utilisé par un joueur ou un invité. Coche-le dans la liste, ou ajoute une précision (ex. « Karim B. »)." } };
    }
    throw e;
  }
  if (sessionId) {
    await prisma.sessionParticipant.create({ data: { sessionId, userId: guestId } });
  }
  await auditLog(admin.id, "GUEST_CREATE", guestId, { sessionId });
  revalidateSessions(sessionId);
  revalidatePath("/admin/players");
  return { ok: true, message: sessionId ? `${name} ajouté comme invité à la session.` : `${name} ajouté à la liste des invités.` };
}

/** Supprime un invité qui n'a jamais participé (une faute de frappe, par exemple). */
export async function deleteGuestAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("userId"));
  const guest = await prisma.user.findUnique({
    where: { id },
    select: { isGuest: true, _count: { select: { participations: true } } },
  });
  // Un invité qui a joué fait partie de l'historique (votes, résultats) : on le garde.
  if (!guest?.isGuest || guest._count.participations > 0) return;
  await prisma.user.delete({ where: { id } });
  await auditLog(admin.id, "GUEST_DELETE", id);
  revalidatePath("/admin/players");
}

// ----------------------------------------------------------------------------- Joueurs

export async function togglePlayerDisabledAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("userId"));
  if (id === admin.id) return; // l'ADMIN ne peut pas se bloquer lui-même
  const user = await prisma.user.findUnique({ where: { id }, select: { disabled: true, role: true } });
  if (!user || user.role === "ADMIN") return;
  await prisma.user.update({
    where: { id },
    data: { disabled: !user.disabled, tokenVersion: { increment: 1 } },
  });
  await auditLog(admin.id, user.disabled ? "PLAYER_UNBLOCK" : "PLAYER_BLOCK", id);
  revalidatePath("/admin/players");
}

export async function resetPlayerAvatarAction(formData: FormData): Promise<void> {
  const admin = await assertAdmin();
  const id = idSchema.parse(formData.get("userId"));
  const user = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  if (!user?.avatarUrl) return;
  const { deleteAvatarBlob } = await import("@/lib/blob");
  await deleteAvatarBlob(user.avatarUrl);
  await prisma.user.update({ where: { id }, data: { avatarUrl: null } });
  await auditLog(admin.id, "PLAYER_AVATAR_RESET", id);
  revalidatePath("/admin/players");
}

/**
 * Réinitialise le mot de passe d'un joueur (mot de passe oublié, sans envoi d'e-mail).
 * Le mot de passe temporaire est affiché une seule fois à l'ADMIN, qui le transmet au joueur ;
 * le joueur est déconnecté partout et devra le changer à sa prochaine connexion.
 */
export async function resetPlayerPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = idSchema.safeParse(formData.get("userId"));
  if (!parsed.success) return { error: "Joueur invalide." };
  const user = await prisma.user.findUnique({ where: { id: parsed.data }, select: { role: true, isGuest: true } });
  // Le compte ADMIN et les invités (sans compte) ne peuvent pas être réinitialisés.
  if (!user || user.role === "ADMIN" || user.isGuest) return { error: "Réinitialisation impossible pour ce compte." };

  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: parsed.data },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 12),
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    },
  });
  await auditLog(admin.id, "PLAYER_PASSWORD_RESET", parsed.data); // jamais le mot de passe lui-même
  return { ok: true, secret: tempPassword };
}

// ----------------------------------------------------------------------------- Récompenses

export async function computeMonthAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const parsed = monthSchema.safeParse(formData.get("month"));
  if (!parsed.success) return { fieldErrors: { month: "Mois invalide." } };
  const reward = await computeAndSaveMonth(parsed.data);
  await auditLog(admin.id, "REWARD_COMPUTE", parsed.data);
  revalidatePath("/admin/rewards");
  revalidatePath("/monthly");
  return {
    ok: true,
    message: reward.status === "NO_REWARD" ? "Calcul fait : pas de distinction ce mois-ci." : "Distinctions calculées.",
  };
}
