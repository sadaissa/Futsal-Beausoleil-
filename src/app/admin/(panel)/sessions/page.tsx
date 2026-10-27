import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { addDaysToKey, formatDateTime, toDateKey, APP_TIMEZONE } from "@/lib/dates";
import { formatInTimeZone } from "date-fns-tz";
import { votePhase } from "@/lib/voting/window";
import { PageHeader } from "@/components/ui/PageHeader";
import { PhaseBadge } from "@/components/ui/Badge";
import { CreateSessionForm } from "@/components/admin/AdminForms";

export const metadata: Metadata = { title: "Admin · Sessions" };

/** Prochain lundi (ou aujourd'hui si on est lundi), dans le fuseau de l'application. */
function nextMonday(): string {
  const today = formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDaysToKey(today, (8 - day) % 7);
}

export default async function AdminSessionsPage() {
  const sessions = await prisma.gameSession.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { participants: true, receipts: true } } },
  });
  const existing = new Set(sessions.map((s) => toDateKey(s.date)));
  let suggested = nextMonday();
  while (existing.has(suggested)) suggested = addDaysToKey(suggested, 7);

  return (
    <div className="space-y-6">
      <PageHeader title="Sessions" subtitle="Crée la session de chaque lundi, coche les participants, pilote le vote." />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="panel h-fit space-y-3">
          <h2 className="heading text-2xl">Nouvelle session</h2>
          <CreateSessionForm defaultDate={suggested} />
        </section>
        <section className="space-y-3">
          {sessions.length === 0 && <div className="panel text-white/50">Aucune session.</div>}
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="panel flex items-center justify-between gap-4 transition hover:border-gold/40"
            >
              <div className="min-w-0">
                <div className="heading truncate text-xl">{s.title}</div>
                <div className="text-sm text-white/50">
                  {s._count.participants} participant(s) · {s._count.receipts} votant(s) · fermeture{" "}
                  {formatDateTime(s.voteClosesAt, "EEE dd/MM HH'h'mm")}
                </div>
              </div>
              <PhaseBadge phase={votePhase(s)} />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
