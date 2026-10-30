import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toLocalInput } from "@/lib/dates";
import { votePhase } from "@/lib/voting/window";
import { closeVoteAction, deleteSessionAction, openVoteAction, publishSessionAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge, statusLabels } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { Alert } from "@/components/ui/Alert";
import { AddGuestForm, ParticipantsEditor, SessionEditForm } from "@/components/admin/AdminForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata: Metadata = { title: "Admin · Session" };

export default async function AdminSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      participants: { select: { userId: true, user: { select: { isGuest: true } } } },
      _count: { select: { receipts: true } }, // nombre de votants uniquement, jamais leur identité
    },
  });
  if (!session) notFound();
  const players = await prisma.user.findMany({
    where: { nickname: { not: null }, OR: [{ disabled: false }, { id: { in: session.participants.map((p) => p.userId) } }] },
    // Joueurs inscrits d'abord, puis les invités.
    orderBy: [{ isGuest: "asc" }, { nickname: "asc" }],
    select: { id: true, nickname: true, avatarUrl: true, isGuest: true },
  });

  const phase = votePhase(session);
  const published = session.status === "PUBLISHED";
  const voters = session._count.receipts;
  // Les invités n'ont pas de compte : seuls les joueurs inscrits peuvent voter.
  const possibleVoters = session.participants.filter((p) => !p.user.isGuest).length;
  const guests = session.participants.length - possibleVoters;

  return (
    <div className="space-y-6">
      <PageHeader title={session.title} subtitle={statusLabels[session.status]} actions={<PhaseBadge phase={phase} />} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={guests ? `Participants (dont ${guests} invité${guests > 1 ? "s" : ""})` : "Participants"} value={session.participants.length} />
        <StatTile label="Votants" value={voters} accent />
        <StatTile label="Participation au vote" value={possibleVoters ? `${Math.round((voters / possibleVoters) * 100)} %` : "—"} />
      </div>

      <section className="panel space-y-3">
        <h2 className="heading text-2xl">Pilotage du vote</h2>
        {published ? (
          <Alert tone="success">
            Session clôturée et Team of the Week publiée.{" "}
            <Link className="font-semibold underline" href={`/team-of-the-week?session=${session.id}`}>
              Voir la Team of the Week
            </Link>
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-2">
            {phase !== "open" && (
              <form action={openVoteAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <ConfirmButton variant="pitch" confirm="Ouvrir le vote maintenant ?">
                  Ouvrir le vote
                </ConfirmButton>
              </form>
            )}
            {phase === "open" && (
              <form action={closeVoteAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <ConfirmButton variant="outline" confirm="Fermer le vote ? Les joueurs ne pourront plus voter.">
                  Fermer le vote
                </ConfirmButton>
              </form>
            )}
            <form action={publishSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <ConfirmButton
                confirm="Clôturer la session et publier la Team of the Week ? Cette action est définitive."
                disabled={phase === "upcoming" && voters === 0}
              >
                Clôturer et publier
              </ConfirmButton>
            </form>
            {voters === 0 && (
              <form action={deleteSessionAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <ConfirmButton variant="danger" confirm="Supprimer définitivement cette session ?">
                  Supprimer
                </ConfirmButton>
              </form>
            )}
          </div>
        )}
        <p className="text-xs text-white/40">
          Sans action de ta part, le vote s’ouvre et se ferme automatiquement aux horaires ci-dessous, puis la Team of the
          Week est publiée automatiquement le mardi matin.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3">
          <h2 className="heading text-2xl">Participants</h2>
          {voters > 0 && !published && <Alert tone="warning">Des votes sont enregistrés : tu peux ajouter des joueurs, plus en retirer.</Alert>}
          <ParticipantsEditor
            sessionId={session.id}
            players={players.map((p) => ({ id: p.id, nickname: p.nickname!, avatarUrl: p.avatarUrl, isGuest: p.isGuest }))}
            selected={session.participants.map((p) => p.userId)}
            locked={published}
          />
          {!published && (
            <div className="border-t border-white/10 pt-4">
              <AddGuestForm sessionId={session.id} />
            </div>
          )}
        </section>
        <section className="panel space-y-3">
          <h2 className="heading text-2xl">Réglages de la session</h2>
          <SessionEditForm
            sessionId={session.id}
            title={session.title}
            voteOpensAt={toLocalInput(session.voteOpensAt)}
            voteClosesAt={toLocalInput(session.voteClosesAt)}
            locked={published}
          />
        </section>
      </div>
    </div>
  );
}
