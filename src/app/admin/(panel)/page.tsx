import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getVoteSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/dates";
import { votePhase } from "@/lib/voting/window";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { PhaseBadge } from "@/components/ui/Badge";
import { SettingsForm } from "@/components/admin/AdminForms";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const [players, sessions, settings, current, captures, logs, pendingRewards] = await Promise.all([
    prisma.user.count({ where: { nickname: { not: null }, isGuest: false } }),
    prisma.gameSession.count(),
    getVoteSettings(),
    prisma.gameSession.findFirst({
      where: { status: { not: "PUBLISHED" } },
      orderBy: { date: "desc" },
      include: {
        _count: { select: { receipts: true, participants: { where: { user: { isGuest: false } } } } },
      },
    }),
    prisma.screenshotEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { nickname: true } } },
    }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.monthlyReward.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Tu ne vois que des résultats agrégés : jamais le détail des votes." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Joueurs" value={players} />
        <StatTile label="Sessions" value={sessions} />
        <StatTile label="Votants (session en cours)" value={current ? `${current._count.receipts}/${current._count.participants}` : "—"} accent />
        <StatTile label="Boissons en attente" value={pendingRewards} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3">
          <h2 className="heading text-2xl">Session en cours</h2>
          {current ? (
            <Link href={`/admin/sessions/${current.id}`} className="flex items-center justify-between rounded-xl bg-ink-900 p-4 hover:ring-1 hover:ring-gold/40">
              <div>
                <div className="heading text-xl">{current.title}</div>
                <div className="text-sm text-white/50">Fermeture : {formatDateTime(current.voteClosesAt)}</div>
              </div>
              <PhaseBadge phase={votePhase(current)} />
            </Link>
          ) : (
            <p className="text-white/50">
              Aucune session active. <Link href="/admin/sessions" className="text-gold">Créer la session de lundi →</Link>
            </p>
          )}
        </section>

        <section className="panel space-y-3">
          <h2 className="heading text-2xl">Horaires du vote</h2>
          <SettingsForm {...settings} />
        </section>

        <section className="panel">
          <h2 className="heading mb-3 text-2xl">Tentatives de capture</h2>
          {captures.length === 0 ? (
            <p className="text-white/50">Aucune tentative détectée.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {captures.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 rounded-lg bg-ink-900 px-3 py-2">
                  <span className="truncate">
                    <strong>{c.user.nickname ?? "?"}</strong> · {c.trigger} · <span className="text-white/40">{c.path}</span>
                  </span>
                  <span className="shrink-0 text-white/40">{formatDateTime(c.createdAt, "dd/MM HH:mm")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="heading mb-3 text-2xl">Journal ADMIN</h2>
          <ul className="space-y-1.5 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 rounded-lg bg-ink-900 px-3 py-2">
                <span className="font-mono text-xs text-white/70">{l.action}</span>
                <span className="text-white/40">{formatDateTime(l.createdAt, "dd/MM HH:mm")}</span>
              </li>
            ))}
            {logs.length === 0 && <li className="text-white/50">Aucune action.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
