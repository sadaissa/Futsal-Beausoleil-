"use client";

import { useActionState } from "react";
import { adminSetupAction, loginAction, onboardingAction, registerAction } from "@/actions/auth";
import { initialActionState } from "@/lib/action-result";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/sessions"} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" required error={e.email} />
      <Field
        label="Surnom"
        name="nickname"
        required
        maxLength={20}
        error={e.nickname}
        hint="Unique, affiché sur ta carte FUT (2 à 20 caractères)."
      />
      <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" required minLength={8} error={e.password} />
      <Field
        label="Confirmation"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={e.confirmPassword}
      />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="w-full" pendingLabel="Création…">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}

export function OnboardingForm() {
  const [state, action] = useActionState(onboardingAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Surnom" name="nickname" required maxLength={20} error={state.fieldErrors?.nickname} autoFocus />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="w-full">Valider mon surnom</SubmitButton>
    </form>
  );
}

export function AdminSetupForm() {
  const [state, action] = useActionState(adminSetupAction, initialActionState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Clé d'administration" name="secret" type="password" autoComplete="off" required />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="w-full" pendingLabel="Vérification…">
        Devenir ADMIN
      </SubmitButton>
    </form>
  );
}
