import "server-only";
import { prisma } from "./prisma";
import { currentMonthKey, monthKeyOf, shiftMonthKey } from "./dates";

/**
 * Distinctions affichées pendant un mois donné : elles viennent de la récompense
 * du mois PRÉCÉDENT. Le plus souvent 1er est « Joueur du mois » ; le plus souvent
 * dernier porte le dossard « Joueur le plus nul du mois » pendant tout ce mois.
 */
export type Honors = { mvpId: string | null; dossardId: string | null; rewardedMonth: string };
export type Honor = "mvp" | "dossard" | null;

export async function getHonorsDuring(month: string): Promise<Honors> {
  const rewardedMonth = shiftMonthKey(month, -1);
  const reward = await prisma.monthlyReward.findUnique({
    where: { month: rewardedMonth },
    select: { winnerId: true, loserId: true, status: true },
  });
  const active = reward && reward.status !== "NO_REWARD";
  return {
    mvpId: active ? reward.winnerId : null,
    dossardId: active ? reward.loserId : null,
    rewardedMonth,
  };
}

/** Distinctions en cours aujourd'hui. */
export function getCurrentHonors(): Promise<Honors> {
  return getHonorsDuring(currentMonthKey());
}

/** Distinctions en vigueur à la date d'une session. */
export function getHonorsForSession(date: Date): Promise<Honors> {
  return getHonorsDuring(monthKeyOf(date));
}

export function honorOf(userId: string, honors: Honors): Honor {
  if (userId === honors.dossardId) return "dossard";
  if (userId === honors.mvpId) return "mvp";
  return null;
}
