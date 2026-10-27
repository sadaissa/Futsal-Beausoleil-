import "server-only";
import { prisma } from "./prisma";
import { worstRating } from "./results/rating";

// Requêtes de lecture partagées entre les pages. Aucune ne renvoie de donnée
// permettant de relier un votant à ses choix.

export async function getTeamOfTheWeek(sessionId?: string) {
  const session = await prisma.gameSession.findFirst({
    where: { status: "PUBLISHED", ...(sessionId ? { id: sessionId } : {}) },
    orderBy: { date: "desc" },
    include: {
      results: {
        orderBy: { rank: "asc" },
        include: { player: { select: { nickname: true, avatarUrl: true } } },
      },
      _count: { select: { receipts: true, participants: true } },
    },
  });
  if (!session) return null;
  const voters = session._count.receipts;
  const team = session.results.filter((r) => r.totwRank !== null).sort((a, b) => a.totwRank! - b.totwRank!);
  const worst = session.results.find((r) => r.isWorst) ?? null;
  return {
    session,
    voters,
    participants: session._count.participants,
    team: team.map((r) => ({
      key: r.id,
      nickname: r.player.nickname ?? "Joueur",
      avatarUrl: r.player.avatarUrl,
      rating: r.rating,
      votes: r.topVotes,
      firstPlaces: r.firstPlaces,
      rank: r.totwRank!,
    })),
    worst: worst && {
      key: worst.id,
      nickname: worst.player.nickname ?? "Joueur",
      avatarUrl: worst.player.avatarUrl,
      rating: worstRating(worst.worstVotes, voters),
      votes: worst.worstVotes,
    },
    ranking: session.results,
  };
}

export async function getPublishedSessionsList(take = 20) {
  return prisma.gameSession.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "desc" },
    take,
    select: { id: true, title: true, date: true },
  });
}

export async function getPlayerStats(userId: string) {
  const [participations, inTeam, firsts, worsts, won, owed] = await Promise.all([
    prisma.sessionParticipant.count({ where: { userId } }),
    prisma.sessionResult.count({ where: { playerId: userId, totwRank: { not: null } } }),
    prisma.sessionResult.count({ where: { playerId: userId, totwRank: 1 } }),
    prisma.sessionResult.count({ where: { playerId: userId, isWorst: true } }),
    prisma.monthlyReward.findMany({ where: { winnerId: userId }, orderBy: { month: "desc" }, include: { loser: { select: { nickname: true } } } }),
    prisma.monthlyReward.findMany({ where: { loserId: userId }, orderBy: { month: "desc" }, include: { winner: { select: { nickname: true } } } }),
  ]);
  return { participations, inTeam, firsts, worsts, won, owed };
}
