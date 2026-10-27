import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/guards";
import { AdminSetupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Initialisation ADMIN" };
export const dynamic = "force-dynamic";

/** Écran utilisable une seule fois : tant qu'aucun ADMIN n'existe. */
export default async function AdminSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin/setup");
  if (user.role === "ADMIN") redirect("/admin");
  const adminExists = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;

  return (
    <div className="mx-auto max-w-md">
      <div className="panel space-y-5">
        <h1 className="heading text-center text-4xl text-gold-gradient">Initialisation ADMIN</h1>
        {adminExists ? (
          <p className="text-center text-white/60">Un ADMIN existe déjà. Cette page est désactivée.</p>
        ) : (
          <>
            <p className="text-sm text-white/60">
              Saisis la clé <code className="text-gold-light">ADMIN_SETUP_SECRET</code> pour devenir l’administrateur de
              l’application. Cette opération n’est possible qu’une seule fois.
            </p>
            <AdminSetupForm />
          </>
        )}
      </div>
    </div>
  );
}
