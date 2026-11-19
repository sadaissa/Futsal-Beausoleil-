import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { formatMonth, ofMonth, previousMonthKey, shiftMonthKey } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { FutsalPitch } from "@/components/fut/FutsalPitch";
import { FutCard } from "@/components/fut/FutCard";
import type { TeamOfMonthEntry } from "@/lib/rewards/monthly";

export const metadata: Metadata = { title: "Distinctions du mois" };
export const dynamic = "force-dynamic";

type Player = { nickname: string | null; avatarUrl: string | null } | null;

/** Mois suivant en toutes lettres, sans l'année : "novembre". */
const nextMonthName = (month: string) => formatMonth(shiftMonthKey(month, 1)).split(" ")[0];

export default async function MonthlyPage() {
  await requireUser();
  const rewards = await prisma.monthlyReward.findMany({
    orderBy: { month: "desc" },
    include: {
      winner: { select: { nickname: true, avatarUrl: true } },
      loser: { select: { nickname: true, avatarUrl: true } },
    },
  });
  // En vedette : le mois dont les distinctions sont en vigueur aujourd'hui (le mois précédent),
  // et non un mois en cours qui aurait été calculé à l'avance.
  const latest = rewards.find((r) => r.month <= previousMonthKey()) ?? null;
  const history = rewards.filter((r) => r !== latest && r.month <= previousMonthKey());

  // Équipe du mois en vedette : cartes FUT avec photo et surnom.
  const team = ((latest?.team ?? []) as TeamOfMonthEntry[]).slice(0, 5);
  const teamIds = [...team, ...history.flatMap((r) => r.team as TeamOfMonthEntry[])].map((t) => t.playerId);
  const teamPlayers = teamIds.length
    ? await prisma.user.findMany({
        where: { id: { in: [...new Set(teamIds)] } },
        select: { id: true, nickname: true, avatarUrl: true },
      })
    : [];
  const nameOf = (id: string) => teamPlayers.find((p) => p.id === id)?.nickname ?? "?";
  const countedSessions = Math.max(1, (latest?.details as { countedSessions?: number } | null)?.countedSessions ?? 1);
  const maxTeamVotes = Math.max(1, ...team.map((t) => t.topVotes));
  // Note d'une carte du mois : présences dans la Team of the Week (sur les sessions retenues),
  // affinée par les votes Top 5 reçus par rapport au meilleur de l'équipe.
  const monthRating = (t: TeamOfMonthEntry) =>
    Math.min(99, Math.round(60 + 30 * (t.appearances / countedSessions) + 9 * (t.topVotes / maxTeamVotes)));
  const winnerEntry = team.find((t) => t.playerId === latest?.winnerId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Distinctions du mois"
        subtitle="Le plus souvent 1er est élu Joueur du mois. Le plus souvent dernier porte le dossard « Joueur le plus nul du mois » pendant tout le mois suivant. Éligibilité : 3 lundis minimum dans le mois."
      />

      {!latest ? (
        <div className="panel text-center text-white/60">Pas encore de verdict. Premier verdict à la fin du mois !</div>
      ) : (
        <MonthHero
          month={latest.month}
          winner={latest.winner}
          loser={latest.loser}
          winnerCount={latest.winnerCount}
          loserCount={latest.loserCount}
          details={latest.details}
          winnerRating={
            winnerEntry
              ? monthRating(winnerEntry)
              : Math.min(99, Math.round(60 + 39 * ((latest.winnerCount ?? 0) / countedSessions)))
          }
          winnerAppearances={winnerEntry?.appearances ?? latest.winnerCount ?? 0}
        />
      )}

      {latest && team.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="heading text-3xl">Équipe du mois {ofMonth(latest.month)}</h2>
            <p className="text-sm text-white/50">
              Les 5 joueurs le plus souvent dans la Team of the Week du mois ({countedSessions} session
              {countedSessions > 1 ? "s" : ""} retenue{countedSessions > 1 ? "s" : ""}).
            </p>
          </div>
          <FutsalPitch
            players={team.map((t) => {
              const player = teamPlayers.find((p) => p.id === t.playerId);
              return {
                key: t.playerId,
                nickname: player?.nickname ?? "Joueur",
                avatarUrl: player?.avatarUrl ?? null,
                rating: monthRating(t),
                ratingLabel: t.playerId === latest.winnerId ? "POTM" : "TOTM",
                variant: "potm" as const,
                votes: t.appearances,
                firstPlaces: t.topVotes,
                statLabels: ["TOTW", "votes"] as [string, string],
                rank: t.rank,
                honor: t.playerId === latest.winnerId ? ("mvp" as const) : null,
              };
            })}
          />
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="heading mb-3 text-2xl">Historique</h2>
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="panel space-y-1 py-4">
                <div className="text-xs uppercase tracking-wider text-white/40">{formatMonth(r.month)}</div>
                {r.winner && r.loser ? (
                  <>
                    <div>
                      ⭐ Joueur du mois : <span className="font-semibold text-gold-light">{r.winner.nickname}</span>
                    </div>
                    <div>
                      🦺 Dossard porté en {nextMonthName(r.month)} :{" "}
                      <span className="font-semibold text-red-300">{r.loser.nickname}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-white/50">Pas de distinction ce mois-ci</div>
                )}
                {(r.team as TeamOfMonthEntry[]).length > 0 && (
                  <div className="text-sm text-white/60">
                    🏆 Équipe du mois : {(r.team as TeamOfMonthEntry[]).map((t) => nameOf(t.playerId)).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MonthHero(props: {
  month: string;
  winner: Player;
  loser: Player;
  winnerCount: number | null;
  loserCount: number | null;
  details: unknown;
  winnerRating: number;
  winnerAppearances: number;
}) {
  const { month, winner, loser } = props;
  const reason = (props.details as { reason?: string | null } | null)?.reason;
  if (!winner || !loser) {
    return (
      <section className="panel text-center">
        <div className="text-xs font-bold uppercase tracking-[.3em] text-white/40">{formatMonth(month)}</div>
        <p className="mt-4 text-white/60">Pas de distinction ce mois-ci. {reason}</p>
      </section>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="panel flex flex-col items-center gap-3 border-sky-300/30 bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-ink-800 text-center">
        <Badge tone="gold">⭐ Joueur du mois {ofMonth(month)}</Badge>
        {/* Carte spéciale « joueur du mois » (bleu ciel vers violet) */}
        <FutCard
          nickname={winner.nickname ?? "Joueur"}
          avatarUrl={winner.avatarUrl}
          rating={props.winnerRating}
          ratingLabel="POTM"
          variant="potm"
          size="lg"
          votes={props.winnerCount ?? 0}
          firstPlaces={props.winnerAppearances}
          statLabels={["1er", "TOTW"]}
        />
        <div className="text-sm text-white/50">{props.winnerCount} fois 1er de la Team of the Week</div>
      </section>
      <section className="panel flex flex-col items-center gap-3 border-boulet/40 bg-gradient-to-b from-boulet-dark/40 to-ink-800 text-center">
        <Badge tone="red">🦺 Dossard du mois {ofMonth(shiftMonthKey(month, 1), false)}</Badge>
        <PlayerAvatar nickname={loser.nickname ?? "?"} avatarUrl={loser.avatarUrl} size={96} className="grayscale" />
        <div className="heading text-4xl text-red-300">{loser.nickname}</div>
        <div className="text-sm text-white/50">{props.loserCount} fois Boulet de la semaine</div>
        <p className="mt-2 rounded-xl border border-boulet/40 bg-black/40 px-4 py-3 text-sm text-white/80">
          Porte le dossard <strong className="text-red-300">« Joueur le plus nul du mois {ofMonth(month, false)} »</strong>{" "}
          pendant tout le mois {ofMonth(shiftMonthKey(month, 1), false)}.
        </p>
      </section>
    </div>
  );
}
