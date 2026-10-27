import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/guards";
import { PasswordForm } from "@/components/account/AccountForms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };
export const dynamic = "force-dynamic";

/** Changement obligatoire après une réinitialisation du mot de passe par l'ADMIN. */
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/account");
  return (
    <div className="mx-auto max-w-md">
      <div className="panel space-y-5">
        <div className="text-center">
          <h1 className="heading text-4xl text-gold-gradient">Nouveau mot de passe</h1>
          <p className="text-white/60">
            Ton mot de passe a été réinitialisé. Saisis le mot de passe temporaire reçu, puis choisis ton nouveau mot de
            passe.
          </p>
        </div>
        <PasswordForm hasPassword />
      </div>
    </div>
  );
}
