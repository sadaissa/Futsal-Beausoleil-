import { createHash, randomBytes } from "node:crypto";

/**
 * Tirage au sort traçable.
 * Chaque candidat reçoit le score SHA-256("<graine>:<id>") ; l'ordre croissant des
 * scores donne le résultat. Avec la graine enregistrée, n'importe qui peut rejouer
 * le tirage et vérifier qu'il n'a pas été truqué.
 */
export const DRAW_ALGORITHM = "Tri croissant de sha256(graine + ':' + idJoueur)";

export type DrawRecord = {
  context: string;
  candidates: string[];
  seed: string;
  algorithm: string;
  result: string[];
};

export function newSeed(): string {
  return randomBytes(16).toString("hex");
}

export function drawOrder(candidates: string[], seed: string): string[] {
  const score = (id: string) => createHash("sha256").update(`${seed}:${id}`).digest("hex");
  return [...candidates].sort((a, b) => (score(a) < score(b) ? -1 : score(a) > score(b) ? 1 : 0));
}

/** Fournisseur de graines : injectable pour rendre les tests déterministes. */
export type SeedProvider = () => string;
