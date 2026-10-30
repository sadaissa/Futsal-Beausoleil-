import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/guards";
import { isVotingFinished } from "@/lib/voting/window";
import { publishSessionAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AntiCapture } from "@/components/security/AntiCapture";
import { Watermark } from "@/components/security/Watermark";

export const metadata: Metadata = { title: "Admin · Résultats" };

/**
 * Résultats AGRÉGÉS uniquement (totaux par joueur), et seulement une fois le vote terminé.
 * Pendant le vote, rien n'est affiché, pas même à l'ADMIN.
 */
export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session: sessionParam } = await searchParams;
  const admin = (await getCurrentUser())!;
  const sessions = await prisma.gameSession.findMany({
    orderBy: { date: "desc" },
    take: 30,
    select: { id: true, title: true, status: true, voteOpensAt: true, voteClosesAt: true },
  });
  const selected = sessions.find((s) => s.id === sessionParam) ?? sessions[0];

  let content: React.ReactNode = <div className="panel text-white/50">Aucune session.</div>;
  if (selected) {
    const finished = isVotingFinished(selected);
    const voters = await prisma.voteReceipt.count({ where: { sessionId: selected.id } });
    if (!finished) {
      content = (
        <div className="panel text-center">
          <div className="heading text-4xl text-gold-light">Vote en cours</div>
          <p className="mt-2 text-white/60">{voters} votant(s) pour l’instant. Les résultats seront visibles après la fermeture du vote.</p>
        </div>
      );
    } else if (selected.status !== "PUBLISHED") {
      // Vote terminé mais pas encore publié : totaux agrégés par joueur.
      const tallies = await prisma.voteTally.findMany({
        where: { sessionId: selected.id },
        include: { player: { select: { nickname: true, isGuest: true } } },
      });
      const rows = tallies
        .map((t) => ({ ...t, total: t.top1 + t.top2 + t.top3 + t.top4 + t.top5 }))
        .sort((a, b) => b.total - a.total || b.top1 - a.top1 || b.top2 - a.top2);
      content = (
        <div className="space-y-4">
          <Alert tone="warning">Vote terminé ({voters} votant(s)). Publie la Team of the Week pour appliquer les départages.</Alert>
          <form action={publishSessionAction}>
            <input type="hidden" name="sessionId" value={selected.id} />
            <ConfirmButton confirm="Publier la Team of the Week ? Cette action est définitive.">Publier la Team of the Week</ConfirmButton>
          </form>
          <ResultsTable
            rows={rows.map((r) => ({
              key: r.playerId,
              nickname: `${r.player.nickname ?? "?"}${r.player.isGuest ? " (invité)" : ""}`,
              total: r.total,
              first: r.top1,
              second: r.top2,
              worst: r.worst,
            }))}
          />
        </div>
      );
    } else {
      const [results, draws] = await Promise.all([
        prisma.sessionResult.findMany({
          where: { sessionId: selected.id },
          orderBy: { rank: "asc" },
          include: { player: { select: { nickname: true, isGuest: true } } },
        }),
        prisma.tieBreakDraw.findMany({ where: { sessionId: selected.id }, orderBy: { createdAt: "asc" } }),
      ]);
      const names = new Map(results.map((r) => [r.playerId, r.player.nickname ?? "?"]));
      content = (
        <div className="space-y-4">
          <Alert tone="success">
            Publiée · {voters} votant(s).{" "}
            <Link href={`/team-of-the-week?session=${selected.id}`} className="font-semibold underline">
              Voir la Team of the Week
            </Link>
          </Alert>
          <ResultsTable
            rows={results.map((r) => ({
              key: r.id,
              nickname: `${r.player.nickname ?? "?"}${r.player.isGuest ? " (invité)" : ""}`,
              total: r.topVotes,
              first: r.firstPlaces,
              second: r.secondPlaces,
              worst: r.worstVotes,
              rank: r.rank,
              totw: r.totwRank !== null,
              isWorst: r.isWorst,
              rating: r.rating,
            }))}
          />
          {draws.length > 0 && (
            <section className="panel space-y-2">
              <h2 className="heading text-xl">Tirages au sort (traçables)</h2>
              {draws.map((d) => (
                <div key={d.id} className="rounded-lg bg-ink-900 p-3 text-sm">
                  <div className="font-semibold">{d.context === "TOP" ? "Égalité Top 5" : "Égalité plus nul"}</div>
                  <div className="text-white/60">
                    Ordre obtenu : {(d.result as string[]).map((id) => names.get(id) ?? "?").join(" → ")}
                  </div>
                  <div className="break-all font-mono text-xs text-white/40">
                    graine {d.seed} · {d.algorithm}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      );
    }
  }

  return (
    <AntiCapture>
      <Watermark email={admin.email} userId={admin.id} />
      <PageHeader title="Résultats agrégés" subtitle="Totaux par joueur uniquement : le détail des votes n’existe pas en base." />
      <div className="mb-6 flex flex-wrap gap-2">
        {sessions.map((s) => (
          <Link
            key={s.id}
            href={`/admin/results?session=${s.id}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              s.id === selected?.id ? "border-gold bg-gold/15 text-gold-light" : "border-white/10 text-white/60"
            }`}
          >
            {s.title}
          </Link>
        ))}
      </div>
      {content}
    </AntiCapture>
  );
}

type Row = {
  key: string;
  nickname: string;
  total: number;
  first: number;
  second: number;
  worst: number;
  rank?: number;
  totw?: boolean;
  isWorst?: boolean;
  rating?: number;
};

function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="panel overflow-x-auto p-0">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-white/40">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Joueur</th>
            <th className="p-3 text-right">Top 5</th>
            <th className="p-3 text-right">1res</th>
            <th className="p-3 text-right">2es</th>
            <th className="p-3 text-right">Plus nul</th>
            <th className="p-3 text-right">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-t border-white/5">
              <td className="p-3 text-white/50">{r.rank ?? i + 1}</td>
              <td className="p-3 font-semibold">
                {r.nickname} {r.totw && <Badge tone="gold">TOTW</Badge>} {r.isWorst && <Badge tone="red">Boulet</Badge>}
              </td>
              <td className="p-3 text-right">{r.total}</td>
              <td className="p-3 text-right">{r.first}</td>
              <td className="p-3 text-right">{r.second}</td>
              <td className="p-3 text-right">{r.worst}</td>
              <td className="p-3 text-right">{r.rating ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-4 text-center text-white/50">
                Aucun vote.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
