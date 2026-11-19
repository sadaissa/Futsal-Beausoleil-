import { DRAW_ALGORITHM, drawOrder, newSeed, type DrawRecord, type SeedProvider } from "../results/draw";

// =============================================================================
// Distinctions du mois — fonction pure, testée.
//   - Joueur du mois : le plus souvent 1er de la Team of the Week.
//   - Dossard du plus nul : le plus souvent Boulet de la semaine.
//   - Équipe du mois : les 5 joueurs le plus souvent dans la Team of the Week.
// =============================================================================

export const MIN_PARTICIPATIONS = 3; // sessions minimum dans le mois pour être éligible
export const MIN_ELIGIBLE_PER_SESSION = 3; // joueurs éligibles minimum pour qu'une session compte
export const TEAM_OF_MONTH_SIZE = 5;

export type MonthSession = {
  sessionId: string;
  participantIds: string[];
  /** Joueur classé 1er de la Team of the Week. */
  firstId: string | null;
  /** Boulet de la semaine. */
  worstId: string | null;
  /** Joueurs de la Team of the Week, avec leurs votes Top 5 et leurs 1res places. */
  totw?: { playerId: string; topVotes: number; firstPlaces: number }[];
  /** Votes « plus nul » reçus par joueur, Boulet ou non. */
  worstVotes?: Record<string, number>;
};

export type TeamOfMonthEntry = {
  playerId: string;
  rank: number;
  /** Nombre de fois dans la Team of the Week. */
  appearances: number;
  /** Votes Top 5 reçus lors de ces sessions. */
  topVotes: number;
  firstPlaces: number;
};

export type MonthlyOutcome = {
  winnerId: string | null;
  loserId: string | null;
  winnerCount: number;
  loserCount: number;
  team: TeamOfMonthEntry[];
  eligibleIds: string[];
  countedSessionIds: string[];
  participations: Record<string, number>;
  firsts: Record<string, number>;
  worsts: Record<string, number>;
  worstVotes: Record<string, number>;
  reason: string | null;
  draws: DrawRecord[];
};

const inc = (map: Record<string, number>, id: string, by = 1) => {
  map[id] = (map[id] ?? 0) + by;
};

/** Compare des clés de départage, de la plus importante à la moins importante (ordre décroissant). */
function compareDesc(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
}

/**
 * Choisit le joueur au compteur le plus élevé. Égalité : critères `tiebreakers` dans l'ordre
 * (valeur la plus haute gagnante), puis tirage au sort traçable.
 */
function pickTop(
  counts: Record<string, number>,
  tiebreakers: Record<string, number>[],
  exclude: string | null,
  context: string,
  seed: SeedProvider,
  draws: DrawRecord[],
): { id: string | null; count: number } {
  const entries = Object.entries(counts).filter(([id, c]) => c > 0 && id !== exclude);
  if (entries.length === 0) return { id: null, count: 0 };
  const key = (id: string) => [counts[id], ...tiebreakers.map((t) => t[id] ?? 0)];
  const ids = entries.map(([id]) => id).sort((a, b) => compareDesc(key(a), key(b)) || a.localeCompare(b));
  const tied = ids.filter((id) => compareDesc(key(id), key(ids[0])) === 0);
  const count = counts[ids[0]];
  if (tied.length === 1) return { id: tied[0], count };
  const s = seed();
  const result = drawOrder(tied, s);
  draws.push({ context, candidates: tied, seed: s, algorithm: DRAW_ALGORITHM, result });
  return { id: result[0], count };
}

/**
 * Équipe du mois : présences dans la Team of the Week, puis votes Top 5 cumulés,
 * puis 1res places, puis participations, puis tirage au sort pour une égalité parfaite
 * qui touche les 5 places.
 */
function pickTeam(
  appearances: Record<string, number>,
  topVotes: Record<string, number>,
  firsts: Record<string, number>,
  participations: Record<string, number>,
  seed: SeedProvider,
  draws: DrawRecord[],
): TeamOfMonthEntry[] {
  const key = (id: string) => [appearances[id], topVotes[id] ?? 0, firsts[id] ?? 0, participations[id] ?? 0];
  const sorted = Object.keys(appearances)
    .filter((id) => appearances[id] > 0)
    .sort((a, b) => compareDesc(key(a), key(b)) || a.localeCompare(b));

  const ordered: string[] = [];
  let i = 0;
  while (i < sorted.length && ordered.length < TEAM_OF_MONTH_SIZE) {
    let j = i + 1;
    while (j < sorted.length && compareDesc(key(sorted[i]), key(sorted[j])) === 0) j++;
    const group = sorted.slice(i, j);
    if (group.length > 1 && ordered.length + group.length > TEAM_OF_MONTH_SIZE) {
      // Égalité parfaite à cheval sur la dernière place : tirage au sort.
      const s = seed();
      const result = drawOrder(group, s);
      draws.push({ context: "MONTHLY_TEAM", candidates: group, seed: s, algorithm: DRAW_ALGORITHM, result });
      ordered.push(...result);
    } else {
      ordered.push(...group);
    }
    i = j;
  }

  return ordered.slice(0, TEAM_OF_MONTH_SIZE).map((playerId, index) => ({
    playerId,
    rank: index + 1,
    appearances: appearances[playerId],
    topVotes: topVotes[playerId] ?? 0,
    firstPlaces: firsts[playerId] ?? 0,
  }));
}

export function computeMonthlyReward(sessions: MonthSession[], seed: SeedProvider = newSeed): MonthlyOutcome {
  const draws: DrawRecord[] = [];

  // 1. Participations du mois et joueurs éligibles (≥ 3 sessions).
  const participations: Record<string, number> = {};
  for (const s of sessions) for (const id of s.participantIds) inc(participations, id);
  const eligible = new Set(Object.keys(participations).filter((id) => participations[id] >= MIN_PARTICIPATIONS));

  // 2. Sessions retenues : au moins 3 participants éligibles.
  const counted = sessions.filter(
    (s) => s.participantIds.filter((id) => eligible.has(id)).length >= MIN_ELIGIBLE_PER_SESSION,
  );

  // 3. Compteurs des joueurs éligibles sur les sessions retenues.
  const firsts: Record<string, number> = {}; // fois 1er de la Team of the Week
  const worsts: Record<string, number> = {}; // fois Boulet de la semaine
  const worstVotes: Record<string, number> = {}; // votes « plus nul » reçus, Boulet ou non
  const appearances: Record<string, number> = {}; // fois dans la Team of the Week
  const teamTopVotes: Record<string, number> = {};
  const teamFirstPlaces: Record<string, number> = {};
  for (const s of counted) {
    if (s.firstId && eligible.has(s.firstId)) inc(firsts, s.firstId);
    if (s.worstId && eligible.has(s.worstId)) inc(worsts, s.worstId);
    for (const [id, votes] of Object.entries(s.worstVotes ?? {})) if (eligible.has(id)) inc(worstVotes, id, votes);
    for (const t of s.totw ?? []) {
      if (!eligible.has(t.playerId)) continue;
      inc(appearances, t.playerId);
      inc(teamTopVotes, t.playerId, t.topVotes);
      inc(teamFirstPlaces, t.playerId, t.firstPlaces);
    }
  }

  const base = {
    eligibleIds: [...eligible].sort(),
    countedSessionIds: counted.map((s) => s.sessionId),
    participations,
    firsts,
    worsts,
    worstVotes,
    draws,
  };

  if (counted.length === 0) {
    return {
      ...base,
      winnerId: null,
      loserId: null,
      winnerCount: 0,
      loserCount: 0,
      team: [],
      reason: "Aucune session ne compte au moins 3 joueurs éligibles.",
    };
  }

  // Joueur du mois — égalité : participations, puis tirage.
  const winner = pickTop(firsts, [participations], null, "MONTHLY_BEST", seed, draws);
  // Dossard — égalité : total des votes « plus nul » du mois (même les semaines où il n'était
  // pas Boulet), puis participations, puis tirage. Le Joueur du mois en est exclu.
  const loser = pickTop(worsts, [worstVotes, participations], winner.id, "MONTHLY_WORST", seed, draws);
  const team = pickTeam(appearances, teamTopVotes, teamFirstPlaces, participations, seed, draws);

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
    team,
    reason,
  };
}
