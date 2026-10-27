"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateNicknameAction, updatePasswordAction } from "@/actions/account";
import { initialActionState } from "@/lib/action-result";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ActionFeedback, Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";

export function NicknameForm({ nickname }: { nickname: string }) {
  const [state, action] = useActionState(updateNicknameAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <Field label="Surnom" name="nickname" defaultValue={nickname} required maxLength={20} error={state.fieldErrors?.nickname} />
      <ActionFeedback state={state} />
      <SubmitButton variant="outline">Enregistrer</SubmitButton>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(updatePasswordAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      {hasPassword && (
        <Field label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" error={e.currentPassword} />
      )}
      <Field label="Nouveau mot de passe" name="newPassword" type="password" autoComplete="new-password" minLength={8} required error={e.newPassword} />
      <Field label="Confirmation" name="confirmPassword" type="password" autoComplete="new-password" required error={e.confirmPassword} />
      <ActionFeedback state={state} />
      <SubmitButton variant="outline">{hasPassword ? "Changer le mot de passe" : "Définir un mot de passe"}</SubmitButton>
    </form>
  );
}

/** Ajout / remplacement / suppression de la photo de profil (Vercel Blob). */
export function AvatarUploader({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "DELETE", file?: File) {
    setBusy(true);
    setError(null);
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.append("file", file);
      }
      const res = await fetch("/api/avatar", { method, body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Échec de l'envoi.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <PlayerAvatar nickname={nickname} avatarUrl={avatarUrl} size={96} />
      <div className="space-y-2 text-center sm:text-left">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && send("POST", e.target.files[0])}
        />
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Envoi…" : avatarUrl ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {avatarUrl && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => send("DELETE")}>
              Supprimer
            </Button>
          )}
        </div>
        <p className="text-xs text-white/40">JPEG, PNG ou WebP · 2 Mo maximum. Sans photo, ta carte affiche tes initiales.</p>
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </div>
  );
}
