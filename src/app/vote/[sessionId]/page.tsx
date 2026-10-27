import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { isVotingOpen } from "@/lib/voting/window";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { AntiCapture } from "@/components/security/AntiCapture";
import { Watermark } from "@/components/security/Watermark";
import { VoteForm } from "@/components/vote/VoteForm";

export const metadata: Metadata = { title: "Voter" };
export const dynamic = "force-dynamic";

export default async function VotePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: {
        orderBy: { user: { nickname: "asc" } },
        select: { id: true, userId: true, user: { select: { nickname: true, avatarUrl: true } } },
      },
    },
  });
  if (!session) notFound();

  const isParticipant = session.participants.some((p) => p.userId === user.id);
  const hasVoted = await prisma.voteReceipt.findUnique({
    where: { sessionId_userId: { sessionId, userId: user.id } },
  });
  if (hasVoted) redirect(`/sessions/${sessionId}`);

  let blocker: string | null = null;
  if (!isVotingOpen(session)) blocker = `Le vote n’est pas ouvert (ouverture : ${formatDateTime(session.voteOpensAt)}).`;
  else if (!isParticipant) blocker = "Tu n’as pas été marqué comme participant à cette session : tu ne peux pas voter.";
  else if (session.participants.length < 6) blocker = "Il faut au moins 6 participants pour voter (5 meilleurs + 1 plus nul).";

  return (
    <AntiCapture>
      <Watermark email={user.email} userId={user.id} />
      <PageHeader title="Ton vote" subtitle={session.title} />
      {blocker ? (
        <div className="space-y-4">
          <Alert tone="warning">{blocker}</Alert>
          <ButtonLink href={`/sessions/${sessionId}`} variant="outline">
            Retour à la session
          </ButtonLink>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-white/60">
            Vote unique, définitif et anonyme : personne, pas même l’ADMIN, ne peut voir qui a voté pour qui.
          </p>
          <VoteForm
            sessionId={session.id}
            candidates={session.participants.map((p) => ({
              participantId: p.id,
              nickname: p.user.nickname ?? "Joueur",
              avatarUrl: p.user.avatarUrl,
              isMe: p.userId === user.id,
            }))}
          />
        </>
      )}
    </AntiCapture>
  );
}
