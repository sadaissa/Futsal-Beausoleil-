import { randomInt } from "node:crypto";

// Alphabet sans caractères ambigus (0/O, 1/l/I) : facile à dicter ou recopier.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Mot de passe temporaire lisible, ex. "k7Qm-x4Rt-9wPa" (12 caractères aléatoires). */
export function generateTempPassword(): string {
  const groups = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}
