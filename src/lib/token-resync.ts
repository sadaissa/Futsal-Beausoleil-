import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Preuve signée permettant au serveur (et à lui seul) de resynchroniser la version
 * du jeton JWT de l'appareil courant après une révocation volontaire des sessions
 * (ex. changement de mot de passe). Un client ne peut pas la forger sans AUTH_SECRET.
 */
export function resyncProof(uid: string, version: number): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`resync:${uid}:${version}`).digest("hex");
}

export function isValidResyncProof(uid: string, version: number, proof: unknown): boolean {
  if (typeof proof !== "string") return false;
  const expected = Buffer.from(resyncProof(uid, version));
  const given = Buffer.from(proof);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
