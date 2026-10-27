import type { ReactNode } from "react";

const tones = {
  info: "border-white/15 bg-white/5 text-white/80",
  success: "border-pitch-light/40 bg-pitch/15 text-green-200",
  error: "border-red-500/40 bg-red-500/10 text-red-200",
  warning: "border-gold/40 bg-gold/10 text-gold-light",
};

export function Alert({ tone = "info", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** Affiche le résultat d'une Server Action (message de succès ou erreur). */
export function ActionFeedback({ state }: { state: { error?: string; message?: string } }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
