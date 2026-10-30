import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { getPlayerStats } from "@/lib/queries";
import { formatMonth, shiftMonthKey } from "@/lib/dates";
import { getCurrentHonors, honorOf } from "@/lib/honors";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { AvatarUploader, NicknameForm, PasswordForm } from "@/components/account/AccountForms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  const [stats, dbUser, honors] = await Promise.all([
    getPlayerStats(user.id),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true, accounts: { select: { provider: true } }, createdAt: true },
    }),
    getCurrentHonors(),
  ]);
  const honor = honorOf(user.id, honors);
  const rewards = [
    ...stats.won.map((r) => ({ month: r.month, text: "⭐ Joueur du mois", tone: "gold" as const })),
    ...stats.owed.map((r) => ({
      month: r.month,
      text: `🦺 Dossard du plus nul, porté en ${formatMonth(shiftMonthKey(r.month, 1)).split(" ")[0]}`,
      tone: "red" as const,
    })),
  ].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-6">
      <PageHeader title="Mon compte" subtitle={user.email} />

      {honor === "dossard" && (
        <div className="rounded-2xl border border-boulet/50 bg-boulet/15 p-4 text-center font-semibold text-red-200">
          🦺 Ce mois-ci, tu portes le dossard « Joueur le plus nul du mois » à chaque match. Courage !
        </div>
      )}
      {honor === "mvp" && (
        <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-center font-semibold text-gold-light">
          ⭐ Tu es le Joueur du mois ! Profite de ton titre.
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Participations" value={stats.participations} />
        <StatTile label="Fois dans le Top 5" value={stats.inTeam} accent />
        <StatTile label="Fois 1er" value={stats.firsts} accent />
        <StatTile label="Fois dernier" value={stats.worsts} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-5">
          <h2 className="heading text-2xl">Profil</h2>
          <AvatarUploader nickname={user.nickname} avatarUrl={user.avatarUrl} />
          <NicknameForm nickname={user.nickname} />
        </section>

        <section className="panel space-y-4">
          <h2 className="heading text-2xl">Distinctions</h2>
          {rewards.length === 0 ? (
            <p className="text-white/50">Aucune distinction pour l’instant. Joue au moins 3 lundis dans le mois pour être éligible.</p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => (
                <li key={`${r.month}-${r.tone}`} className="flex items-center justify-between gap-3 rounded-xl bg-ink-900 p-3">
                  <div>
                    <div className="text-xs uppercase text-white/40">{formatMonth(r.month)}</div>
                    <div className="font-semibold">{r.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel space-y-4">
          <h2 className="heading text-2xl">Sécurité</h2>
          <p className="text-sm text-white/60">
            Connexion : {dbUser.accounts.some((a) => a.provider === "google") ? "Google" : null}
            {dbUser.accounts.some((a) => a.provider === "google") && dbUser.passwordHash ? " + " : null}
            {dbUser.passwordHash ? "e-mail et mot de passe" : null}
          </p>
          <PasswordForm hasPassword={Boolean(dbUser.passwordHash)} />
        </section>
      </div>
    </div>
  );
}
