/** Format de retour commun des Server Actions utilisées avec useActionState. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Donnée à afficher une seule fois (ex. mot de passe temporaire). */
  secret?: string;
};

export const initialActionState: ActionState = {};
