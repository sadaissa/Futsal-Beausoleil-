import type { SessionStatus } from "@prisma/client";
import type { ReactNode } from "react";
import type { VotePhase } from "@/lib/voting/window";

const tones = {
  gold: "bg-gold/15 text-gold-light ring-gold/40",
  green: "bg-pitch/20 text-green-300 ring-pitch-light/40",
  red: "bg-boulet/20 text-red-300 ring-boulet/40",
  gray: "bg-white/5 text-white/60 ring-white/15",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

const phaseLabels: Record<VotePhase, [string, keyof typeof tones]> = {
  upcoming: ["À venir", "gray"],
  open: ["Vote en cours", "green"],
  closed: ["Vote terminé", "gold"],
  published: ["Publiée", "gold"],
};

export function PhaseBadge({ phase }: { phase: VotePhase }) {
  const [label, tone] = phaseLabels[phase];
  return (
    <Badge tone={tone}>
      {phase === "open" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />}
      {label}
    </Badge>
  );
}

export const statusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Planifiée (ouverture auto)",
  OPEN: "Vote ouvert (manuel)",
  CLOSED: "Vote fermé",
  PUBLISHED: "Publiée",
};

/** Badge des joueurs invités (ponctuels, sans compte). */
export function GuestBadge() {
  return <Badge tone="gray">Invité</Badge>;
}

/** Distinction du mois : « Joueur du mois » ou porteur du dossard du plus nul. */
export function HonorBadge({ honor }: { honor: "mvp" | "dossard" | null | undefined }) {
  if (honor === "mvp") return <Badge tone="gold">⭐ Joueur du mois</Badge>;
  if (honor === "dossard") return <Badge tone="red">🦺 Dossard</Badge>;
  return null;
}
