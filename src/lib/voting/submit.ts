import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isVotingOpen } from "./window";

export type SubmitVoteInput = {
  sessionId: string;
  voterId: string;
  /** Ids de participants (SessionParticipant.id), du 1er au 5e. */
  topParticipantIds: string[];
  worstParticipantId: string;
};

export class VoteError extends Error {}

const RANK_FIELDS = ["top1", "top2", "top3", "top4", "top5"] as const;

/**
 * Enregistre un vote de façon anonyme, dans une seule transaction :
 * 1. vérifications serveur (vote ouvert, votant participant, choix valides) ;
 * 2. création du reçu "a voté" (contrainte unique = pas de double vote) ;
 * 3. incrément des compteurs agrégés. Aucun bulletin n'est conservé.
 */
export async function submitVote(input: SubmitVoteInput): Promise<void> {
  // Les conflits de sérialisation (votes simultanés) sont rejoués quelques fois.
  for (let attempt = 1; ; attempt++) {
    try {
      return await submitVoteOnce(input);
    } catch (e) {
      const conflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!conflict || attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 50 * attempt + Math.random() * 100));
    }
  }
}

async function submitVoteOnce(input: SubmitVoteInput): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          select: { id: true, status: true, voteOpensAt: true, voteClosesAt: true },
        });
        if (!session) throw new VoteError("Session introuvable.");
        if (!isVotingOpen(session)) throw new VoteError("Le vote n'est pas ouvert pour cette session.");

        const participants = await tx.sessionParticipant.findMany({
          where: { sessionId: session.id },
          select: { id: true, userId: true },
        });
        if (!participants.some((p) => p.userId === input.voterId)) {
          throw new VoteError("Tu n'as pas participé à cette session : tu ne peux pas voter.");
        }

        const byParticipantId = new Map(participants.map((p) => [p.id, p.userId]));
        const topUserIds = input.topParticipantIds.map((id) => byParticipantId.get(id));
        const worstUserId = byParticipantId.get(input.worstParticipantId);
        if (topUserIds.some((id) => !id) || !worstUserId) {
          throw new VoteError("Tu ne peux voter que pour des joueurs ayant participé à la session.");
        }

        // Le reçu échoue (P2002) si le joueur a déjà voté.
        await tx.voteReceipt.create({ data: { sessionId: session.id, userId: input.voterId } });

        const increments: { playerId: string; field: (typeof RANK_FIELDS)[number] | "worst" }[] = [
          ...topUserIds.map((playerId, i) => ({ playerId: playerId!, field: RANK_FIELDS[i] })),
          { playerId: worstUserId, field: "worst" as const },
        ];
        // Ordre de traitement trié par joueur : rien ne trahit l'ordre de saisie.
        increments.sort((a, b) => a.playerId.localeCompare(b.playerId));
        for (const { playerId, field } of increments) {
          await tx.voteTally.upsert({
            where: { sessionId_playerId: { sessionId: session.id, playerId } },
            create: { sessionId: session.id, playerId, [field]: 1 },
            update: { [field]: { increment: 1 } },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 15_000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new VoteError("Tu as déjà voté pour cette session.");
    }
    throw e;
  }
}
