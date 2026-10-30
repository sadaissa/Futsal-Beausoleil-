"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  computeMonthAction,
  addGuestAction,
  createSessionAction,
  resetPlayerPasswordAction,
  saveSettingsAction,
  setParticipantsAction,
  updateSessionAction,
} from "@/actions/admin";
import { initialActionState } from "@/lib/action-result";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ActionFeedback } from "@/components/ui/Alert";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { ConfirmButton } from "./ConfirmButton";
import { GuestBadge } from "@/components/ui/Badge";

export function SettingsForm({ voteStartTime, voteEndTime }: { voteStartTime: string; voteEndTime: string }) {
  const [state, action] = useActionState(saveSettingsAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ouverture (lundi)" name="voteStartTime" type="time" defaultValue={voteStartTime} error={state.fieldErrors?.voteStartTime} />
        <Field label="Fermeture" name="voteEndTime" type="time" defaultValue={voteEndTime} error={state.fieldErrors?.voteEndTime} />
      </div>
      <p className="text-xs text-white/40">Si la fermeture est avant l’ouverture, elle a lieu le lendemain (mardi).</p>
      <ActionFeedback state={state} />
      <SubmitButton variant="outline">Enregistrer les horaires</SubmitButton>
    </form>
  );
}

export function CreateSessionForm({ defaultDate }: { defaultDate: string }) {
  const [state, action] = useActionState(createSessionAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <Field label="Date du lundi" name="date" type="date" defaultValue={defaultDate} required error={state.fieldErrors?.date} />
      <Field label="Titre (facultatif)" name="title" placeholder="Lundi 27 octobre 2026" maxLength={80} error={state.fieldErrors?.title} />
      <ActionFeedback state={state} />
      <SubmitButton>Créer la session</SubmitButton>
    </form>
  );
}

export function SessionEditForm(props: { sessionId: string; title: string; voteOpensAt: string; voteClosesAt: string; locked: boolean }) {
  const [state, action] = useActionState(updateSessionAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sessionId" value={props.sessionId} />
      <fieldset disabled={props.locked} className="space-y-3">
        <Field label="Titre" name="title" defaultValue={props.title} required maxLength={80} error={e.title} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ouverture du vote" name="voteOpensAt" type="datetime-local" defaultValue={props.voteOpensAt} required error={e.voteOpensAt} />
          <Field label="Fermeture du vote" name="voteClosesAt" type="datetime-local" defaultValue={props.voteClosesAt} required error={e.voteClosesAt} />
        </div>
        <ActionFeedback state={state} />
        <SubmitButton variant="outline">Enregistrer</SubmitButton>
      </fieldset>
    </form>
  );
}

type Player = { id: string; nickname: string; avatarUrl: string | null; isGuest: boolean };

/** Cases à cocher des participants d'une session, avec recherche. */
export function ParticipantsEditor({
  sessionId,
  players,
  selected,
  locked,
}: {
  sessionId: string;
  players: Player[];
  selected: string[];
  locked: boolean;
}) {
  const [state, action] = useActionState(setParticipantsAction, initialActionState);
  const [checked, setChecked] = useState(() => new Set(selected));
  // Resynchronise les cases quand la liste enregistrée change côté serveur (ex. invité ajouté).
  const selectedKey = [...selected].sort().join(",");
  useEffect(() => setChecked(new Set(selectedKey ? selectedKey.split(",") : [])), [selectedKey]);
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => players.filter((p) => p.nickname.toLowerCase().includes(query.toLowerCase())),
    [players, query],
  );

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      {[...checked].map((id) => (
        <input key={id} type="hidden" name="userIds" value={id} />
      ))}
      <div className="flex items-center gap-3">
        <input className="input" placeholder="Rechercher un joueur…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="shrink-0 text-sm text-white/60">{checked.size} coché(s)</span>
      </div>
      <ul className="grid max-h-[28rem] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {visible.map((p) => (
          <li key={p.id}>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 ${
                checked.has(p.id) ? "border-pitch-light/60 bg-pitch/15" : "border-white/10 bg-ink-900"
              }`}
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#1f9d57]"
                checked={checked.has(p.id)}
                disabled={locked}
                onChange={() => toggle(p.id)}
              />
              <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size={32} />
              <span className="truncate font-semibold">{p.nickname}</span>
              {p.isGuest && <GuestBadge />}
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-white/50">Aucun joueur.</li>}
      </ul>
      <ActionFeedback state={state} />
      {!locked && <SubmitButton variant="pitch">Enregistrer les participants</SubmitButton>}
    </form>
  );
}

export function ComputeMonthForm({ defaultMonth }: { defaultMonth: string }) {
  const [state, action] = useActionState(computeMonthAction, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="Mois" name="month" type="month" defaultValue={defaultMonth} required error={state.fieldErrors?.month} />
      </div>
      <SubmitButton>Calculer</SubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}

/** Réinitialisation du mot de passe d'un joueur : affiche le mot de passe temporaire une seule fois. */
export function ResetPasswordForm({ userId, nickname }: { userId: string; nickname: string }) {
  const [state, action] = useActionState(resetPlayerPasswordAction, initialActionState);
  const [copied, setCopied] = useState(false);

  if (state.secret) {
    return (
      <div className="w-full rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm sm:w-auto">
        <div className="text-white/70">Mot de passe temporaire de {nickname} :</div>
        <div className="mt-1 flex items-center gap-2">
          <code className="select-all rounded bg-ink-900 px-2 py-1 font-mono text-base text-gold-light">{state.secret}</code>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20"
            onClick={() => navigator.clipboard?.writeText(state.secret!).then(() => setCopied(true))}
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
        <div className="mt-1 text-xs text-white/50">
          Transmets-le au joueur (il ne sera plus affiché). Il devra le changer à sa prochaine connexion.
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <ConfirmButton
        variant="outline"
        confirm={`Réinitialiser le mot de passe de ${nickname} ? Il sera déconnecté et recevra un mot de passe temporaire.`}
      >
        Réinitialiser le mot de passe
      </ConfirmButton>
      {state.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

/**
 * Ajout d'un joueur invité (sans compte). Avec `sessionId`, il est aussi coché
 * comme participant de la session.
 */
export function AddGuestForm({ sessionId }: { sessionId?: string }) {
  const [state, action] = useActionState(addGuestAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      {sessionId && <input type="hidden" name="sessionId" value={sessionId} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field
            label="Ajouter un invité (sans compte)"
            name="name"
            placeholder="Ex. Karim"
            maxLength={20}
            required
            error={state.fieldErrors?.name}
            hint="Joueur ponctuel : on peut voter pour lui, il ne vote pas et n'a pas de récompense mensuelle."
          />
        </div>
        <SubmitButton variant="outline" className="sm:mt-6">
          Ajouter
        </SubmitButton>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
