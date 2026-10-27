import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMonth, previousMonthKey } from "@/lib/dates";
import { setRewardStatusAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ComputeMonthForm } from "@/components/admin/AdminForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata: Metadata = { title: "Admin · Récompenses" };

export default async function AdminRewardsPage() {
  const rewards = await prisma.monthlyReward.findMany({
    orderBy: { month: "desc" },
    include: { winner: { select: { nickname: true } }, loser: { select: { nickname: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Récompenses mensuelles"
        subtitle="Calcul automatique le 1er de chaque mois. Tu peux aussi lancer ou relancer le calcul manuellement."
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
                  <div className="font-semibold">
                    <span className="text-red-300">{r.loser.nickname}</span> ({r.loserCount}× dernier) doit offrir une boisson à{" "}
                    <span className="text-gold-light">{r.winner.nickname}</span> ({r.winnerCount}× 1er)
                  </div>
                ) : (
                  <div className="text-white/60">Pas de récompense · {details.reason}</div>
                )}
                <div className="text-xs text-white/40">
                  {details.countedSessions ?? 0}/{details.sessions ?? 0} session(s) retenue(s) · {details.eligiblePlayers ?? 0} joueur(s) éligible(s)
                </div>
              </div>
              {r.status !== "NO_REWARD" ? (
                <form action={setRewardStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="rewardId" value={r.id} />
                  <input type="hidden" name="status" value={r.status === "GIVEN" ? "PENDING" : "GIVEN"} />
                  <Badge tone={r.status === "GIVEN" ? "green" : "gold"}>{r.status === "GIVEN" ? "Offerte" : "En attente"}</Badge>
                  <ConfirmButton
                    variant={r.status === "GIVEN" ? "ghost" : "pitch"}
                    confirm={r.status === "GIVEN" ? "Repasser en attente ?" : "Marquer la boisson comme offerte ?"}
                  >
                    {r.status === "GIVEN" ? "Remettre en attente" : "Marquer offerte"}
                  </ConfirmButton>
                </form>
              ) : (
                <Badge>Aucune</Badge>
              )}
            </li>
          );
        })}
        {rewards.length === 0 && <li className="panel text-white/50">Aucune récompense calculée.</li>}
      </ul>
    </div>
  );
}
