import { DRAW_ALGORITHM, drawOrder, newSeed, type DrawRecord, type SeedProvider } from "./draw";
import { baseRating, topRating, worstRating } from "./rating";

// =============================================================================
// Calcul de la Team of the Week — fonction pure (sans base de données), testée.
// =============================================================================

export const TEAM_SIZE = 5;

export type PlayerTally = {
  playerId: string;
  top1: number;
  top2: number;
  top3: number;
  top4: number;
  top5: number;
  worst: number;
  /** Participations cumulées du joueur (critère de départage n°3). */
  participations: number;
};

export type ComputedResult = {
  playerId: string;
  topVotes: number;
  firstPlaces: number;
  secondPlaces: number;
  worstVotes: number;
  participations: number;
  rank: number;
  totwRank: number | null;
  isWorst: boolean;
  rating: number;
};

export type ComputeOutput = { results: ComputedResult[]; draws: DrawRecord[] };

const topVotesOf = (t: PlayerTally) => t.top1 + t.top2 + t.top3 + t.top4 + t.top5;

/** Clé de départage du Top 5 : votes, puis 1res places, 2es places, participations. */
const topKey = (t: PlayerTally) => [topVotesOf(t), t.top1, t.top2, t.participations];

function compareKeysDesc(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
}

/**
 * Calcule le classement de la soirée.
 * - Top 5 : nombre d'apparitions dans les Top 5 ; égalités départagées par le nombre
 *   de 1res places, de 2es places, de participations, puis par tirage au sort traçable.
 * - Plus nul : le plus de votes "plus nul" ; égalité départagée par tirage au sort traçable.
 */
export function computeSessionResults(
  tallies: PlayerTally[],
  voters: number,
  seed: SeedProvider = newSeed,
): ComputeOutput {
  const draws: DrawRecord[] = [];

  // 1. Tri par critères (ordre stable sur l'id pour les joueurs hors Top 5).
  const sorted = [...tallies].sort(
    (a, b) => compareKeysDesc(topKey(a), topKey(b)) || a.playerId.localeCompare(b.playerId),
  );

  // 2. Tirage au sort pour chaque groupe d'égalité parfaite qui touche le Top 5.
  const ordered: PlayerTally[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && compareKeysDesc(topKey(sorted[i]), topKey(sorted[j])) === 0) j++;
    const group = sorted.slice(i, j);
    if (group.length > 1 && i < TEAM_SIZE && topVotesOf(group[0]) > 0) {
      const s = seed();
      const candidates = group.map((g) => g.playerId);
      const result = drawOrder(candidates, s);
      draws.push({ context: "TOP", candidates, seed: s, algorithm: DRAW_ALGORITHM, result });
      ordered.push(...result.map((id) => group.find((g) => g.playerId === id)!));
    } else {
      ordered.push(...group);
    }
    i = j;
  }

  // 3. Joueur le plus nul.
  let worstId: string | null = null;
  const maxWorst = Math.max(0, ...tallies.map((t) => t.worst));
  if (maxWorst > 0) {
    const candidates = tallies
      .filter((t) => t.worst === maxWorst)
      .map((t) => t.playerId)
      .sort();
    if (candidates.length === 1) {
      worstId = candidates[0];
    } else {
      const s = seed();
      const result = drawOrder(candidates, s);
      draws.push({ context: "WORST", candidates, seed: s, algorithm: DRAW_ALGORITHM, result });
      worstId = result[0];
    }
  }

  // 4. Construction des résultats.
  const results = ordered.map((t, index): ComputedResult => {
    const topVotes = topVotesOf(t);
    const inTeam = index < TEAM_SIZE && topVotes > 0;
    const isWorst = t.playerId === worstId;
    return {
      playerId: t.playerId,
      topVotes,
      firstPlaces: t.top1,
      secondPlaces: t.top2,
      worstVotes: t.worst,
      participations: t.participations,
      rank: index + 1,
      totwRank: inTeam ? index + 1 : null,
      isWorst,
      rating: inTeam
        ? topRating(topVotes, t.top1, voters)
        : isWorst
          ? worstRating(t.worst, voters)
          : baseRating(topVotes, voters),
    };
  });

  return { results, draws };
}
