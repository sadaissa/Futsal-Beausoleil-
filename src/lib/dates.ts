import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";

/** Fuseau horaire de référence de l'application (le foot se joue à Beausoleil). */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Paris";

/** Une date de session est stockée en `@db.Date` : on la manipule en "YYYY-MM-DD". */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Vrai si la date "YYYY-MM-DD" tombe un lundi. */
export function isMonday(key: string): boolean {
  return fromDateKey(key).getUTCDay() === 1;
}

/** Ajoute des jours à une date "YYYY-MM-DD". */
export function addDaysToKey(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKey(d);
}

/** Mois "YYYY-MM" d'une date de session. */
export function monthKeyOf(date: Date): string {
  return toDateKey(date).slice(0, 7);
}

/** Mois précédent "YYYY-MM" par rapport à `now`, dans le fuseau de l'application. */
export function previousMonthKey(now = new Date()): string {
  const [y, m] = formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM").split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Bornes d'un mois "YYYY-MM" sous forme de dates `@db.Date` [début, fin[. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: fromDateKey(`${month}-01`), end: fromDateKey(`${next}-01`) };
}

/**
 * Calcule les instants d'ouverture / fermeture du vote pour un lundi donné.
 * Si l'heure de fin est inférieure ou égale à l'heure de début (ex. 20:00 → 08:00),
 * la fermeture a lieu le lendemain (mardi matin).
 */
export function computeVoteWindow(
  dateKey: string,
  startTime: string,
  endTime: string,
  timeZone = APP_TIMEZONE,
): { opensAt: Date; closesAt: Date } {
  const opensAt = fromZonedTime(`${dateKey}T${startTime}:00`, timeZone);
  const endKey = endTime <= startTime ? addDaysToKey(dateKey, 1) : dateKey;
  const closesAt = fromZonedTime(`${endKey}T${endTime}:00`, timeZone);
  return { opensAt, closesAt };
}

/** Titre par défaut d'une session : "Lundi 27 octobre 2026". */
export function defaultSessionTitle(dateKey: string): string {
  const label = formatInTimeZone(fromDateKey(dateKey), "UTC", "EEEE d MMMM yyyy", { locale: fr });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Format lisible d'un instant dans le fuseau de l'application. */
export function formatDateTime(date: Date, pattern = "EEEE d MMMM 'à' HH'h'mm"): string {
  return formatInTimeZone(date, APP_TIMEZONE, pattern, { locale: fr });
}

/** Libellé d'un mois "YYYY-MM" : "octobre 2026". */
export function formatMonth(month: string): string {
  return formatInTimeZone(fromDateKey(`${month}-01`), "UTC", "MMMM yyyy", { locale: fr });
}

/** Format "YYYY-MM-DDTHH:mm" dans le fuseau de l'application (pour <input type="datetime-local">). */
export function toLocalInput(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalInput(value: string): Date {
  return fromZonedTime(`${value}:00`, APP_TIMEZONE);
}

/** Décale un mois "YYYY-MM" de `delta` mois. */
export function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Mois courant "YYYY-MM" dans le fuseau de l'application. */
export function currentMonthKey(now = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM");
}

/** "d'octobre 2026", "de novembre 2026" (élision devant une voyelle). */
export function ofMonth(month: string, withYear = true): string {
  const label = withYear ? formatMonth(month) : formatMonth(month).split(" ")[0];
  return /^[aeiouyâéèêîôûh]/i.test(label) ? `d'${label}` : `de ${label}`;
}
