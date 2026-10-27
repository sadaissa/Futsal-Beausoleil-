import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/guards";
import { LoginForm } from "@/components/auth/AuthForms";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Connexion" };

const errors: Record<string, string> = {
  OAuthAccountNotLinked: "Ce compte Google ne peut pas être associé. Connecte-toi avec ton e-mail.",
  AccessDenied: "Accès refusé : ce compte est bloqué.",
  Configuration: "Erreur de configuration de l'authentification.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const safe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : undefined;
  // Déjà connecté (session valide en base) : inutile de se reconnecter.
  if (await getCurrentUser()) redirect(safe ?? "/sessions");
  return (
    <div className="mx-auto max-w-md">
      <div className="panel space-y-6">
        <div className="text-center">
          <h1 className="heading text-4xl text-gold-gradient">Connexion</h1>
          <p className="text-white/60">Retrouve ta session du lundi.</p>
        </div>
        {error && <Alert tone="error">{errors[error] ?? "Connexion impossible, réessaie."}</Alert>}
        {googleEnabled && (
          <>
            <GoogleButton callbackUrl={safe} />
            <div className="flex items-center gap-3 text-xs uppercase text-white/30">
              <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}
        <LoginForm callbackUrl={safe} />
        <p className="text-center text-sm text-white/60">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-gold hover:underline">
            Inscription
          </Link>
        </p>
      </div>
    </div>
  );
}
