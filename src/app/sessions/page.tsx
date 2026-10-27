import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { formatDateTime } from "@/lib/dates";
import { votePhase } from "@/lib/voting/window";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, PhaseBadge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Sessions du lundi" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await requireUser();
  const sessions = await prisma.gameSession.findMany({
    orderBy: { date: "desc" },
    take: 60,
    include: {
      _count: { select: { participants: true } },
      participants: { where: { userId: user.id }, select: { id: true } },
      receipts: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Sessions du lundi" subtitle="Toutes les soirées de foot en salle." />
      {sessions.length === 0 ? (
        <div className="panel text-white/60">Aucune session pour le moment. L’ADMIN la créera avant lundi.</div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const phase = votePhase(s);
            const isParticipant = s.participants.length > 0;
            const hasVoted = s.receipts.length > 0;
            return (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="panel flex items-center justify-between gap-4 transition hover:border-gold/40">
                  <div className="min-w-0">
                    <div className="heading truncate text-2xl">{s.title}</div>
                    <div className="text-sm text-white/50">
                      {s._count.participants} joueur(s) · vote {formatDateTime(s.voteOpensAt, "EEE HH'h'mm")} →{" "}
                      {formatDateTime(s.voteClosesAt, "EEE HH'h'mm")}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <PhaseBadge phase={phase} />
                    {isParticipant && phase === "open" && !hasVoted && <Badge tone="gold">À toi de voter</Badge>}
                    {hasVoted && <Badge tone="green">A voté ✓</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
