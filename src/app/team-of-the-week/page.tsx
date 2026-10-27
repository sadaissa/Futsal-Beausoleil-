import Link from "next/link";
import type { Metadata } from "next";
import { getTeamOfTheWeek, getPublishedSessionsList } from "@/lib/queries";
import { publishDueSessions } from "@/lib/results/publish";
import { PageHeader } from "@/components/ui/PageHeader";
import { FutsalPitch } from "@/components/fut/FutsalPitch";
import { FutCard } from "@/components/fut/FutCard";
import { ShareButton } from "@/components/fut/ShareButton";

export const metadata: Metadata = { title: "Team of the Week" };
export const dynamic = "force-dynamic";

/**
 * Page publique et partageable : seules les sessions PUBLIÉES (vote clos) y apparaissent.
 */
export default async function TeamOfTheWeekPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session: sessionParam } = await searchParams;
  // Filet de sécurité si le cron du mardi n'est pas encore passé.
  await publishDueSessions().catch((e) => console.error("Publication automatique impossible", e));

  const sessionId = typeof sessionParam === "string" && /^[a-z0-9]{1,64}$/i.test(sessionParam) ? sessionParam : undefined;
  const [totw, history] = await Promise.all([getTeamOfTheWeek(sessionId), getPublishedSessionsList()]);

  if (!totw) {
    return (
      <div>
        <PageHeader title="Team of the Week" />
        <div className="panel text-center text-white/60">
          Aucune Team of the Week publiée pour l’instant. Rendez-vous mardi matin, après le vote du lundi !
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team of the Week"
        subtitle={`${totw.session.title} · ${totw.voters} votant(s) sur ${totw.participants} joueur(s)`}
        actions={<ShareButton title={`Team of the Week · ${totw.session.title}`} />}
      />

      {totw.team.length === 0 ? (
        <div className="panel text-center text-white/60">Aucun vote n’a été enregistré pour cette session.</div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_auto]">
          <FutsalPitch players={totw.team} />
          {totw.worst && (
            <aside className="panel flex flex-col items-center gap-3 border-boulet/30 bg-gradient-to-b from-boulet-dark/40 to-ink-800">
              <h2 className="heading text-2xl text-red-300">Le plus nul</h2>
              <FutCard {...totw.worst} variant="worst" delay={900} />
            </aside>
          )}
        </div>
      )}

      {history.length > 1 && (
        <section>
          <h2 className="heading mb-3 text-2xl">Semaines précédentes</h2>
          <div className="flex flex-wrap gap-2">
            {history.map((s) => (
              <Link
                key={s.id}
                href={`/team-of-the-week?session=${s.id}`}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  s.id === totw.session.id ? "border-gold bg-gold/15 text-gold-light" : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {s.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
