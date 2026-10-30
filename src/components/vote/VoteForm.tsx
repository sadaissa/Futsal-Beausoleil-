"use client";

import { useActionState, useState } from "react";
import { voteAction } from "@/actions/vote";
import { initialActionState } from "@/lib/action-result";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export type VoteCandidate = {
  participantId: string;
  nickname: string;
  avatarUrl: string | null;
  isMe: boolean;
  isGuest: boolean;
};

/**
 * Interface de vote mobile : on touche les joueurs dans l'ordre (1er → 5e),
 * puis on choisit le joueur le plus nul. Les choix restent en mémoire locale
 * le temps de la saisie et ne sont jamais stockés côté client.
 */
export function VoteForm({ sessionId, candidates }: { sessionId: string; candidates: VoteCandidate[] }) {
  const [state, formAction] = useActionState(voteAction, initialActionState);
  const [top, setTop] = useState<string[]>([]);
  const [worst, setWorst] = useState<string | null>(null);
  const step = top.length < 5 ? "top" : "worst";

  const toggleTop = (id: string) => {
    if (top.includes(id)) setTop(top.filter((t) => t !== id));
    else if (top.length < 5) {
      setTop([...top, id]);
      if (worst === id) setWorst(null);
    }
  };

  const nickname = (id: string) => candidates.find((c) => c.participantId === id)?.nickname ?? "?";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="sessionId" value={sessionId} />
      {top.map((id, i) => (
        <input key={id} type="hidden" name={`top${i + 1}`} value={id} />
      ))}
      {worst && <input type="hidden" name="worst" value={worst} />}

      {/* Récapitulatif du Top 5 */}
      <div className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="heading text-2xl">Ton Top 5</h2>
          <span className="text-sm text-white/50">{top.length}/5</span>
        </div>
        <ol className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className={`flex aspect-[3/4] flex-col items-center justify-center rounded-xl border text-center ${
                top[i] ? "border-gold/60 bg-gold/10" : "border-dashed border-white/15"
              }`}
            >
              <span className="heading text-xl text-gold">{i + 1}</span>
              <span className="w-full truncate px-1 text-[11px] font-semibold">{top[i] ? nickname(top[i]) : "—"}</span>
            </li>
          ))}
        </ol>
        {worst && (
          <p className="mt-3 text-sm">
            Le plus nul : <strong className="text-red-300">{nickname(worst)}</strong>
          </p>
        )}
      </div>

      <Alert tone={step === "top" ? "warning" : "error"}>
        {step === "top"
          ? `Touche les joueurs dans l'ordre : choisis ton n°${top.length + 1}. Touche à nouveau un joueur pour le retirer.`
          : "Choisis maintenant le joueur le plus nul de la soirée."}
      </Alert>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {candidates.map((c) => {
          const rank = top.indexOf(c.participantId);
          const isWorst = worst === c.participantId;
          return (
            <li key={c.participantId}>
              <button
                type="button"
                onClick={() => (step === "top" || rank >= 0 ? toggleTop(c.participantId) : setWorst(isWorst ? null : c.participantId))}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[.98] ${
                  rank >= 0
                    ? "border-gold/70 bg-gold/15"
                    : isWorst
                      ? "border-boulet bg-boulet/20"
                      : "border-white/10 bg-ink-800 hover:border-white/30"
                }`}
              >
                <PlayerAvatar nickname={c.nickname} avatarUrl={c.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.nickname}</span>
                  {c.isMe && <span className="text-xs text-white/40">toi</span>}
                  {c.isGuest && <span className="text-xs text-white/40">invité</span>}
                </span>
                {rank >= 0 && <span className="heading text-2xl text-gold">{rank + 1}</span>}
                {isWorst && <span className="text-xs font-black uppercase text-red-300">Nul</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {step === "worst" && (
        <button type="button" onClick={() => setTop(top.slice(0, 4))} className="text-sm text-white/50 underline">
          Modifier mon Top 5
        </button>
      )}

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="sticky bottom-3 z-10">
        <SubmitButton className="w-full py-4 text-base" disabled={top.length !== 5 || !worst} pendingLabel="Envoi du vote…">
          Valider mon vote (définitif)
        </SubmitButton>
      </div>
    </form>
  );
}
