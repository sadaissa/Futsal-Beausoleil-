import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { monthRange } from "../dates";
import { computeMonthlyReward } from "./monthly";

/**
 * Calcule (ou recalcule) la récompense d'un mois "YYYY-MM" à partir des sessions publiées.
 * Une récompense déjà marquée "offerte" n'est jamais écrasée.
 */
export async function computeAndSaveMonth(month: string) {
  const existing = await prisma.monthlyReward.findUnique({ where: { month } });
  if (existing?.status === "GIVEN") return existing;

  const { start, end } = monthRange(month);
  const sessions = await prisma.gameSession.findMany({
    where: { status: "PUBLISHED", date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      participants: { where: { user: { isGuest: false } }, select: { userId: true } },
      results: { where: { OR: [{ totwRank: 1 }, { isWorst: true }] }, select: { playerId: true, totwRank: true, isWorst: true } },
    },
  });

  const outcome = computeMonthlyReward(
    sessions.map((s) => ({
      sessionId: s.id,
      participantIds: s.participants.map((p) => p.userId),
      firstId: s.results.find((r) => r.totwRank === 1)?.playerId ?? null,
      worstId: s.results.find((r) => r.isWorst)?.playerId ?? null,
    })),
  );

  const data = {
    winnerId: outcome.winnerId,
    loserId: outcome.loserId,
    winnerCount: outcome.winnerId ? outcome.winnerCount : null,
    loserCount: outcome.loserId ? outcome.loserCount : null,
    status: outcome.winnerId && outcome.loserId ? ("PENDING" as const) : ("NO_REWARD" as const),
    details: {
      sessions: sessions.length,
      countedSessions: outcome.countedSessionIds.length,
      eligiblePlayers: outcome.eligibleIds.length,
      reason: outcome.reason,
    } satisfies Prisma.InputJsonObject,
    computedAt: new Date(),
    givenAt: null,
  };

  return prisma.$transaction(async (tx) => {
    await tx.tieBreakDraw.deleteMany({ where: { month } });
    if (outcome.draws.length) {
      await tx.tieBreakDraw.createMany({ data: outcome.draws.map((d) => ({ ...d, month })) });
    }
    return tx.monthlyReward.upsert({ where: { month }, create: { month, ...data }, update: data });
  });
}
