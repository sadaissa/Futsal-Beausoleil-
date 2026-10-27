import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { getPlayerStats } from "@/lib/queries";
import { formatMonth } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { AvatarUploader, NicknameForm, PasswordForm } from "@/components/account/AccountForms";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();
  const [stats, dbUser] = await Promise.all([
    getPlayerStats(user.id),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true, accounts: { select: { provider: true } }, createdAt: true },
    }),
  ]);
  const rewards = [
    ...stats.won.map((r) => ({ month: r.month, text: `${r.loser?.nickname ?? "?"} te doit une boisson`, tone: "gold" as const, status: r.status })),
    ...stats.owed.map((r) => ({ month: r.month, text: `Tu dois offrir une boisson à ${r.winner?.nickname ?? "?"}`, tone: "red" as const, status: r.status })),
  ].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-6">
      <PageHeader title="Mon compte" subtitle={user.email} />

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
          <h2 className="heading text-2xl">Récompenses obtenues</h2>
          {rewards.length === 0 ? (
            <p className="text-white/50">Aucune récompense pour l’instant. Joue au moins 3 lundis dans le mois pour être éligible.</p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => (
                <li key={`${r.month}-${r.tone}`} className="flex items-center justify-between gap-3 rounded-xl bg-ink-900 p-3">
                  <div>
                    <div className="text-xs uppercase text-white/40">{formatMonth(r.month)}</div>
                    <div className="font-semibold">{r.text}</div>
                  </div>
                  <Badge tone={r.status === "GIVEN" ? "green" : r.tone}>{r.status === "GIVEN" ? "Offerte" : "En attente"}</Badge>
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
