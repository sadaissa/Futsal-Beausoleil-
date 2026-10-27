import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { formatMonth } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";

export const metadata: Metadata = { title: "Récompenses mensuelles" };
export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  await requireUser();
  const rewards = await prisma.monthlyReward.findMany({
    orderBy: { month: "desc" },
    include: {
      winner: { select: { nickname: true, avatarUrl: true } },
      loser: { select: { nickname: true, avatarUrl: true } },
    },
  });
  const [latest, ...history] = rewards;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Récompense du mois"
        subtitle="Le plus souvent 1er reçoit une boisson, offerte par le plus souvent dernier. Éligibilité : 3 lundis minimum dans le mois."
      />

      {!latest ? (
        <div className="panel text-center text-white/60">Pas encore de récompense calculée. Premier verdict à la fin du mois !</div>
      ) : (
        <RewardHero reward={latest} />
      )}

      {history.length > 0 && (
        <section>
          <h2 className="heading mb-3 text-2xl">Historique</h2>
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="panel flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40">{formatMonth(r.month)}</div>
                  <div className="font-semibold">
                    {r.winner && r.loser ? (
                      <>
                        <span className="text-red-300">{r.loser.nickname}</span> doit offrir une boisson à{" "}
                        <span className="text-gold-light">{r.winner.nickname}</span>
                      </>
                    ) : (
                      <span className="text-white/50">Pas de récompense ce mois-ci</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "GIVEN" | "NO_REWARD" }) {
  if (status === "GIVEN") return <Badge tone="green">Offerte ✓</Badge>;
  if (status === "PENDING") return <Badge tone="gold">En attente</Badge>;
  return <Badge>Aucune</Badge>;
}

type RewardWithPlayers = {
  month: string;
  status: "PENDING" | "GIVEN" | "NO_REWARD";
  winnerCount: number | null;
  loserCount: number | null;
  details: unknown;
  winner: { nickname: string | null; avatarUrl: string | null } | null;
  loser: { nickname: string | null; avatarUrl: string | null } | null;
};

function RewardHero({ reward }: { reward: RewardWithPlayers }) {
  const reason = (reward.details as { reason?: string | null } | null)?.reason;
  return (
    <section className="panel overflow-hidden text-center">
      <div className="text-xs font-bold uppercase tracking-[.3em] text-white/40">{formatMonth(reward.month)}</div>
      {reward.winner && reward.loser ? (
        <>
          <div className="mt-6 flex items-center justify-center gap-6 sm:gap-12">
            <div className="flex flex-col items-center gap-2">
              <PlayerAvatar nickname={reward.loser.nickname ?? "?"} avatarUrl={reward.loser.avatarUrl} size={80} className="ring-boulet" />
              <div className="heading text-2xl text-red-300">{reward.loser.nickname}</div>
              <div className="text-xs text-white/50">{reward.loserCount} fois dernier</div>
            </div>
            <div className="heading text-5xl text-white/30">→</div>
            <div className="flex flex-col items-center gap-2">
              <PlayerAvatar nickname={reward.winner.nickname ?? "?"} avatarUrl={reward.winner.avatarUrl} size={80} />
              <div className="heading text-2xl text-gold-light">{reward.winner.nickname}</div>
              <div className="text-xs text-white/50">{reward.winnerCount} fois 1er</div>
            </div>
          </div>
          <p className="heading mt-8 text-3xl sm:text-4xl">
            <span className="text-red-300">{reward.loser.nickname}</span> doit offrir une boisson à{" "}
            <span className="text-gold-gradient">{reward.winner.nickname}</span> 🍺
          </p>
          <div className="mt-4">
            <StatusBadge status={reward.status} />
          </div>
        </>
      ) : (
        <p className="mt-4 text-white/60">Pas de récompense ce mois-ci. {reason}</p>
      )}
    </section>
  );
}
