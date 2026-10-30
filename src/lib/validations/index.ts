import { z } from "zod";

// =============================================================================
// Schémas Zod : toutes les entrées utilisateur passent par ces validations.
// =============================================================================

export const emailSchema = z
  .string({ required_error: "E-mail requis" })
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide")
  .max(254);

export const passwordSchema = z
  .string({ required_error: "Mot de passe requis" })
  .min(8, "8 caractères minimum")
  .max(128, "128 caractères maximum");

export const nicknameSchema = z
  .string({ required_error: "Surnom requis" })
  .trim()
  .min(2, "2 caractères minimum")
  .max(20, "20 caractères maximum")
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u, "Lettres, chiffres, espaces, . _ ' - uniquement");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    nickname: nicknameSchema,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const nicknameFormSchema = z.object({ nickname: nicknameSchema });

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const adminSetupSchema = z.object({ secret: z.string().min(1, "Clé requise").max(256) });

const cuid = z.string().min(1).max(64).regex(/^[a-z0-9]+$/i, "Identifiant invalide");

/** Vote : exactement 5 joueurs classés (distincts) + 1 joueur le plus nul hors du Top 5. */
export const voteSchema = z
  .object({
    sessionId: cuid,
    top: z.array(cuid).length(5, "Choisis exactement 5 joueurs"),
    worst: cuid,
  })
  .refine((v) => new Set(v.top).size === 5, { message: "Un joueur ne peut apparaître qu'une fois dans le Top 5", path: ["top"] })
  .refine((v) => !v.top.includes(v.worst), { message: "Le plus nul ne peut pas être dans ton Top 5", path: ["worst"] });

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)");
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const localDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date et heure invalides");

export const voteSettingsSchema = z.object({ voteStartTime: timeSchema, voteEndTime: timeSchema });

export const createSessionSchema = z.object({
  date: dateKeySchema,
  title: z.string().trim().max(80).optional(),
});

export const updateSessionSchema = z
  .object({
    sessionId: cuid,
    title: z.string().trim().min(2).max(80),
    voteOpensAt: localDateTimeSchema,
    voteClosesAt: localDateTimeSchema,
  })
  .refine((d) => d.voteClosesAt > d.voteOpensAt, { message: "La fermeture doit suivre l'ouverture", path: ["voteClosesAt"] });

export const guestSchema = z.object({
  name: nicknameSchema,
  sessionId: cuid.optional(),
});

export const participantsSchema = z.object({
  sessionId: cuid,
  userIds: z.array(cuid).max(60),
});

export const idSchema = cuid;

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide");

export const captureEventSchema = z.object({
  path: z.string().max(200),
  trigger: z.enum(["PrintScreen", "Cmd+Shift+3", "Cmd+Shift+4", "Cmd+Shift+5", "Win+Shift+S", "Ctrl+P", "Copie"]),
});

/** Transforme une erreur Zod en dictionnaire champ → message. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Normalise un surnom pour l'unicité : minuscules, sans accents ni espaces multiples. */
export function nicknameKey(nickname: string): string {
  return nickname
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
