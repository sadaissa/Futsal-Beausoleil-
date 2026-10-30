import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMonth, previousMonthKey } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ComputeMonthForm } from "@/components/admin/AdminForms";

export const metadata: Metadata = { title: "Admin · Distinctions" };

export default async function AdminRewardsPage() {
  const rewards = await prisma.monthlyReward.findMany({
    orderBy: { month: "desc" },
    include: { winner: { select: { nickname: true } }, loser: { select: { nickname: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distinctions du mois"
        subtitle="Joueur du mois et dossard du plus nul : calcul automatique le 1er de chaque mois. Tu peux aussi lancer ou relancer le calcul manuellement (ex. après une session publiée en retard)."
      />
      <section className="panel">
        <ComputeMonthForm defaultMonth={previousMonthKey()} />
      </section>
      <ul className="space-y-2">
        {rewards.map((r) => {
          const details = r.details as { sessions?: number; countedSessions?: number; eligiblePlayers?: number; reason?: string | null };
          return (
            <li key={r.id} className="panel flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-white/40">{formatMonth(r.month)}</div>
                {r.winner && r.loser ? (
                  <div className="space-y-0.5 font-semibold">
                    <div>
                      ⭐ Joueur du mois : <span className="text-gold-light">{r.winner.nickname}</span> ({r.winnerCount}× 1er)
                    </div>
                    <div>
                      🦺 Dossard le mois suivant : <span className="text-red-300">{r.loser.nickname}</span> ({r.loserCount}× dernier)
                    </div>
                  </div>
                ) : (
                  <div className="text-white/60">Pas de distinction · {details.reason}</div>
                )}
                <div className="text-xs text-white/40">
                  {details.countedSessions ?? 0}/{details.sessions ?? 0} session(s) retenue(s) · {details.eligiblePlayers ?? 0} joueur(s) éligible(s)
                </div>
              </div>
              {r.status === "NO_REWARD" && <Badge>Aucune</Badge>}
            </li>
          );
        })}
        {rewards.length === 0 && <li className="panel text-white/50">Aucun mois calculé.</li>}
      </ul>
    </div>
  );
}
