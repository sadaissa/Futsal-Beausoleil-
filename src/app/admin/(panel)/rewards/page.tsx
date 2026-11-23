import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMonth, previousMonthKey } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ComputeMonthForm } from "@/components/admin/AdminForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { setMonthPublishedAction } from "@/actions/admin";
import type { TeamOfMonthEntry } from "@/lib/rewards/monthly";

export const metadata: Metadata = { title: "Admin · Distinctions" };

export default async function AdminRewardsPage() {
  const rewards = await prisma.monthlyReward.findMany({
    orderBy: { month: "desc" },
    include: { winner: { select: { nickname: true } }, loser: { select: { nickname: true } } },
  });
  const teamIds = [...new Set(rewards.flatMap((r) => (r.team as TeamOfMonthEntry[]).map((t) => t.playerId)))];
  const names = new Map(
    (await prisma.user.findMany({ where: { id: { in: teamIds } }, select: { id: true, nickname: true } })).map((u) => [
      u.id,
      u.nickname ?? "?",
    ]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distinctions du mois"
        subtitle="Joueur du mois, dossard du plus nul et équipe du mois : calcul automatique le 1er de chaque mois, en brouillon. Rien n'est visible des joueurs tant que tu n'as pas appuyé sur « Publier ». Tu peux aussi relancer le calcul (ex. après une session publiée en retard)."
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
                {(r.team as TeamOfMonthEntry[]).length > 0 && (
                  <div className="text-sm text-white/70">
                    🏆 Équipe du mois :{" "}
                    {(r.team as TeamOfMonthEntry[]).map((t) => `${names.get(t.playerId) ?? "?"} (${t.appearances}×)`).join(", ")}
                  </div>
                )}
                <div className="text-xs text-white/40">
                  {details.countedSessions ?? 0}/{details.sessions ?? 0} session(s) retenue(s) · {details.eligiblePlayers ?? 0} joueur(s) éligible(s)
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {r.publishedAt ? (
                  <Badge tone="green">Publiée le {formatDateTime(r.publishedAt, "dd/MM 'à' HH'h'mm")}</Badge>
                ) : (
                  <Badge tone="gold">Brouillon · non visible</Badge>
                )}
                {r.status === "NO_REWARD" && <Badge>Aucune distinction</Badge>}
                <form action={setMonthPublishedAction}>
                  <input type="hidden" name="rewardId" value={r.id} />
                  <input type="hidden" name="publish" value={r.publishedAt ? "0" : "1"} />
                  {r.publishedAt ? (
                    <ConfirmButton variant="ghost" confirm={`Retirer la publication de ${formatMonth(r.month)} ? Les joueurs ne la verront plus.`}>
                      Retirer la publication
                    </ConfirmButton>
                  ) : (
                    <ConfirmButton
                      confirm={`Publier les distinctions de ${formatMonth(r.month)} ? Joueur du mois, dossard et équipe du mois seront visibles de tous.`}
                    >
                      🏆 Publier
                    </ConfirmButton>
                  )}
                </form>
              </div>
            </li>
          );
        })}
        {rewards.length === 0 && <li className="panel text-white/50">Aucun mois calculé.</li>}
      </ul>
    </div>
  );
}
