import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { formatDateTime } from "@/lib/dates";
import { votePhase } from "@/lib/voting/window";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { AntiCapture } from "@/components/security/AntiCapture";
import { Watermark } from "@/components/security/Watermark";

export const metadata: Metadata = { title: "Session" };
export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { user: { nickname: "asc" } },
        select: { id: true, userId: true, user: { select: { nickname: true, avatarUrl: true } } },
      },
      _count: { select: { receipts: true } },
    },
  });
  if (!session) notFound();

  const phase = votePhase(session);
  const isParticipant = session.participants.some((p) => p.userId === user.id);
  const hasVoted = Boolean(
    await prisma.voteReceipt.findUnique({ where: { sessionId_userId: { sessionId: id, userId: user.id } } }),
  );
  // Les résultats ne sont lus qu'après publication.
  const results =
    phase === "published"
      ? await prisma.sessionResult.findMany({
          where: { sessionId: id },
          orderBy: { rank: "asc" },
          include: { player: { select: { nickname: true, avatarUrl: true } } },
        })
      : [];

  return (
    <AntiCapture>
      <Watermark email={user.email} userId={user.id} />
      <PageHeader
        title={session.title}
        subtitle={`Vote du ${formatDateTime(session.voteOpensAt)} au ${formatDateTime(session.voteClosesAt)}`}
        actions={<PhaseBadge phase={phase} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="panel space-y-4">
          <h2 className="heading text-2xl">Vote</h2>
          <p className="text-white/70">
            {session._count.receipts} / {session.participants.length} joueur(s) ont voté.
          </p>
          {phase === "open" && isParticipant && !hasVoted && (
            <ButtonLink href={`/vote/${session.id}`} className="w-full">
              Voter maintenant
            </ButtonLink>
          )}
          {hasVoted && phase === "open" && <Alert tone="success">Merci ! Ton vote anonyme est bien enregistré.</Alert>}
          {phase === "open" && !isParticipant && (
            <Alert>Tu n’es pas marqué comme participant à cette session : tu ne peux pas voter.</Alert>
          )}
          {phase === "upcoming" && <Alert>Le vote ouvrira le {formatDateTime(session.voteOpensAt)}.</Alert>}
          {(phase === "open" || phase === "closed") && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-6 text-center">
              <div className="heading text-3xl text-gold-light">{phase === "open" ? "Vote en cours" : "Dépouillement…"}</div>
              <p className="mt-1 text-sm text-white/60">
                {phase === "open"
                  ? "Les résultats sont masqués jusqu’à la fermeture du vote."
                  : "La Team of the Week sera publiée mardi matin."}
              </p>
            </div>
          )}
          {phase === "published" && (
            <ButtonLink href={`/team-of-the-week?session=${session.id}`} className="w-full">
              Voir la Team of the Week
            </ButtonLink>
          )}
        </section>

        <section className="panel">
          <h2 className="heading mb-3 text-2xl">
            {phase === "published" ? "Classement de la soirée" : `Participants (${session.participants.length})`}
          </h2>
          {phase === "published" ? (
            <ol className="space-y-2">
              {results.map((r) => (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl p-2.5 ${
                    r.isWorst ? "bg-boulet/15 ring-1 ring-boulet/40" : r.totwRank ? "bg-gold/10 ring-1 ring-gold/30" : "bg-ink-900"
                  }`}
                >
                  <span className="heading w-7 text-center text-xl text-white/60">{r.rank}</span>
                  <PlayerAvatar nickname={r.player.nickname ?? "?"} avatarUrl={r.player.avatarUrl} size={36} />
                  <span className="flex-1 truncate font-semibold">{r.player.nickname}</span>
                  <span className="text-sm text-white/60">{r.topVotes} vote(s)</span>
                  {r.isWorst && <span className="text-xs font-black uppercase text-red-300">Boulet · {r.worstVotes}</span>}
                </li>
              ))}
            </ol>
          ) : session.participants.length === 0 ? (
            <p className="text-white/50">Les participants n’ont pas encore été cochés.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {session.participants.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-xl bg-ink-900 p-2">
                  <PlayerAvatar nickname={p.user.nickname ?? "?"} avatarUrl={p.user.avatarUrl} size={32} />
                  <span className="truncate text-sm font-semibold">{p.user.nickname}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/sessions" className="text-white/50 hover:text-white">
          ← Toutes les sessions
        </Link>
      </p>
    </AntiCapture>
  );
}
