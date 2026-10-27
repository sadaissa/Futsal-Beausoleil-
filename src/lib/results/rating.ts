/**
 * Note FUT d'un joueur de la Team of the Week (60 → 99).
 * Elle reflète la part des votants qui l'ont placé dans leur Top 5,
 * avec un bonus pour les premières places.
 */
export function topRating(topVotes: number, firstPlaces: number, voters: number): number {
  if (voters <= 0) return 60;
  const share = Math.min(1, topVotes / voters);
  const firstShare = Math.min(1, firstPlaces / voters);
  return Math.min(99, Math.round(60 + 30 * share + 9 * firstShare));
}

/** Note du "Boulet de la semaine" (30 → 59) : plus il a de votes, plus elle est basse. */
export function worstRating(worstVotes: number, voters: number): number {
  if (voters <= 0) return 59;
  const share = Math.min(1, worstVotes / voters);
  return Math.max(30, Math.round(59 - 29 * share));
}

/** Note des autres joueurs de la soirée (45 → 75), pour le classement complet. */
export function baseRating(topVotes: number, voters: number): number {
  if (voters <= 0) return 50;
  return Math.round(45 + 30 * Math.min(1, topVotes / voters));
}
