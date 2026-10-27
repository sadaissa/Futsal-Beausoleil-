import "server-only";
import { prisma } from "../prisma";
import { computeSessionResults } from "./compute";
import { isDueForPublication } from "../voting/window";

/**
 * Clôture le vote, calcule et publie la Team of the Week d'une session.
 * Idempotent : une session déjà publiée n'est jamais recalculée.
 */
export async function publishSession(sessionId: string): Promise<{ published: boolean; reason?: string }> {
  return prisma.$transaction(
    async (tx) => {
      const session = await tx.gameSession.findUnique({ where: { id: sessionId } });
      if (!session) return { published: false, reason: "Session introuvable." };
      if (session.status === "PUBLISHED") return { published: false, reason: "Déjà publiée." };

      const [participants, tallies, voters] = await Promise.all([
        tx.sessionParticipant.findMany({ where: { sessionId }, select: { userId: true } }),
        tx.voteTally.findMany({ where: { sessionId } }),
        tx.voteReceipt.count({ where: { sessionId } }),
      ]);

      // Participations cumulées jusqu'à cette session incluse (critère de départage).
      const playerIds = [...new Set([...participants.map((p) => p.userId), ...tallies.map((t) => t.playerId)])];
      const counts = await tx.sessionParticipant.groupBy({
        by: ["userId"],
        where: { userId: { in: playerIds }, session: { date: { lte: session.date } } },
        _count: { _all: true },
      });
      const participationsOf = new Map(counts.map((c) => [c.userId, c._count._all]));
      const tallyOf = new Map(tallies.map((t) => [t.playerId, t]));

      const { results, draws } = computeSessionResults(
        playerIds.map((playerId) => {
          const t = tallyOf.get(playerId);
          return {
            playerId,
            top1: t?.top1 ?? 0,
            top2: t?.top2 ?? 0,
            top3: t?.top3 ?? 0,
            top4: t?.top4 ?? 0,
            top5: t?.top5 ?? 0,
            worst: t?.worst ?? 0,
            participations: participationsOf.get(playerId) ?? 0,
          };
        }),
        voters,
      );

      await tx.sessionResult.deleteMany({ where: { sessionId } });
      await tx.sessionResult.createMany({ data: results.map((r) => ({ ...r, sessionId })) });
      if (draws.length) {
        await tx.tieBreakDraw.createMany({ data: draws.map((d) => ({ ...d, sessionId })) });
      }
      const now = new Date();
      await tx.gameSession.update({
        where: { id: sessionId },
        data: { status: "PUBLISHED", closedAt: session.closedAt ?? now, publishedAt: now },
      });
      return { published: true };
    },
    { timeout: 20_000 },
  );
}

/**
 * Publie toutes les sessions dont le vote est terminé (appelé par le cron du mardi
 * matin, et en filet de sécurité à l'affichage de la Team of the Week).
 */
export async function publishDueSessions(now = new Date()): Promise<string[]> {
  const candidates = await prisma.gameSession.findMany({
    where: { status: { in: ["SCHEDULED", "CLOSED"] } },
    select: { id: true, status: true, voteOpensAt: true, voteClosesAt: true },
  });
  const published: string[] = [];
  for (const s of candidates.filter((c) => isDueForPublication(c, now))) {
    const res = await publishSession(s.id);
    if (res.published) published.push(s.id);
  }
  return published;
}
