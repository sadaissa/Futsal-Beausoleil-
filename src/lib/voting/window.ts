import type { SessionStatus } from "@prisma/client";

type SessionLike = { status: SessionStatus; voteOpensAt: Date; voteClosesAt: Date };

/**
 * Le vote est ouvert si :
 * - l'ADMIN l'a ouvert manuellement (OPEN), ou
 * - la session est planifiée (SCHEDULED) et l'instant courant est dans la fenêtre prévue.
 */
export function isVotingOpen(session: SessionLike, now = new Date()): boolean {
  if (session.status === "OPEN") return true;
  if (session.status !== "SCHEDULED") return false;
  return now >= session.voteOpensAt && now < session.voteClosesAt;
}

/** Les résultats ne sont visibles qu'une fois le vote terminé. */
export function isVotingFinished(session: SessionLike, now = new Date()): boolean {
  if (session.status === "CLOSED" || session.status === "PUBLISHED") return true;
  return session.status === "SCHEDULED" && now >= session.voteClosesAt;
}

/** La session doit-elle être clôturée et publiée automatiquement ? */
export function isDueForPublication(session: SessionLike, now = new Date()): boolean {
  return session.status === "CLOSED" || (session.status === "SCHEDULED" && now >= session.voteClosesAt);
}

export type VotePhase = "upcoming" | "open" | "closed" | "published";

export function votePhase(session: SessionLike, now = new Date()): VotePhase {
  if (session.status === "PUBLISHED") return "published";
  if (isVotingOpen(session, now)) return "open";
  if (isVotingFinished(session, now)) return "closed";
  return "upcoming";
}
