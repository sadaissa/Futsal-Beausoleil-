import Link from "next/link";
import type { Metadata } from "next";
import { googleEnabled } from "@/auth";
import { RegisterForm } from "@/components/auth/AuthForms";
import { GoogleButton } from "@/components/auth/GoogleButton";

export const metadata: Metadata = { title: "Inscription" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="panel space-y-6">
        <div className="text-center">
          <h1 className="heading text-4xl text-gold-gradient">Inscription</h1>
          <p className="text-white/60">Un compte par joueur, un surnom unique.</p>
        </div>
        {googleEnabled && (
          <>
            <GoogleButton label="S'inscrire avec Google" callbackUrl="/onboarding" />
            <div className="flex items-center gap-3 text-xs uppercase text-white/30">
              <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}
        <RegisterForm />
        <p className="text-center text-sm text-white/60">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-semibold text-gold hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
