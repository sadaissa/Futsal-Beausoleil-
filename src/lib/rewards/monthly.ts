import { DRAW_ALGORITHM, drawOrder, newSeed, type DrawRecord, type SeedProvider } from "../results/draw";

// =============================================================================
// Récompense mensuelle — fonction pure, testée.
// =============================================================================

export const MIN_PARTICIPATIONS = 3; // sessions minimum dans le mois pour être éligible
export const MIN_ELIGIBLE_PER_SESSION = 3; // joueurs éligibles minimum pour qu'une session compte

export type MonthSession = {
  sessionId: string;
  participantIds: string[];
  /** Joueur classé 1er de la Team of the Week. */
  firstId: string | null;
  /** Boulet de la semaine. */
  worstId: string | null;
};

export type MonthlyOutcome = {
  winnerId: string | null;
  loserId: string | null;
  winnerCount: number;
  loserCount: number;
  eligibleIds: string[];
  countedSessionIds: string[];
  participations: Record<string, number>;
  firsts: Record<string, number>;
  worsts: Record<string, number>;
  reason: string | null;
  draws: DrawRecord[];
};

/** Choisit le joueur au compteur le plus élevé ; égalité : participations, puis tirage. */
function pickTop(
  counts: Record<string, number>,
  participations: Record<string, number>,
  exclude: string | null,
  context: string,
  seed: SeedProvider,
  draws: DrawRecord[],
): { id: string | null; count: number } {
  const entries = Object.entries(counts).filter(([id, c]) => c > 0 && id !== exclude);
  if (entries.length === 0) return { id: null, count: 0 };
  const max = Math.max(...entries.map(([, c]) => c));
  let tied = entries.filter(([, c]) => c === max).map(([id]) => id);
  const maxPart = Math.max(...tied.map((id) => participations[id] ?? 0));
  tied = tied.filter((id) => (participations[id] ?? 0) === maxPart).sort();
  if (tied.length === 1) return { id: tied[0], count: max };
  const s = seed();
  const result = drawOrder(tied, s);
  draws.push({ context, candidates: tied, seed: s, algorithm: DRAW_ALGORITHM, result });
  return { id: result[0], count: max };
}

export function computeMonthlyReward(sessions: MonthSession[], seed: SeedProvider = newSeed): MonthlyOutcome {
  const draws: DrawRecord[] = [];

  // 1. Participations du mois et joueurs éligibles (≥ 3 sessions).
  const participations: Record<string, number> = {};
  for (const s of sessions) for (const id of s.participantIds) participations[id] = (participations[id] ?? 0) + 1;
  const eligible = new Set(Object.keys(participations).filter((id) => participations[id] >= MIN_PARTICIPATIONS));

  // 2. Sessions retenues : au moins 3 participants éligibles.
  const counted = sessions.filter(
    (s) => s.participantIds.filter((id) => eligible.has(id)).length >= MIN_ELIGIBLE_PER_SESSION,
  );

  // 3. Comptage des 1res places et des places de "plus nul" des joueurs éligibles.
  const firsts: Record<string, number> = {};
  const worsts: Record<string, number> = {};
  for (const s of counted) {
    if (s.firstId && eligible.has(s.firstId)) firsts[s.firstId] = (firsts[s.firstId] ?? 0) + 1;
    if (s.worstId && eligible.has(s.worstId)) worsts[s.worstId] = (worsts[s.worstId] ?? 0) + 1;
  }

  const base = {
    eligibleIds: [...eligible].sort(),
    countedSessionIds: counted.map((s) => s.sessionId),
    participations,
    firsts,
    worsts,
    draws,
  };

  if (counted.length === 0) {
    return { ...base, winnerId: null, loserId: null, winnerCount: 0, loserCount: 0, reason: "Aucune session ne compte au moins 3 joueurs éligibles." };
  }

  const winner = pickTop(firsts, participations, null, "MONTHLY_BEST", seed, draws);
  // Le gagnant ne peut pas s'offrir une boisson à lui-même : on l'exclut des perdants.
  const loser = pickTop(worsts, participations, winner.id, "MONTHLY_WORST", seed, draws);

  const reason = !winner.id
    ? "Aucun joueur éligible n'a fini premier ce mois-ci."
    : !loser.id
      ? "Aucun joueur éligible n'a fini dernier ce mois-ci."
      : null;

  return {
    ...base,
    winnerId: reason ? null : winner.id,
    loserId: reason ? null : loser.id,
    winnerCount: winner.count,
    loserCount: loser.count,
    reason,
  };
}
