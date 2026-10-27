import Image from "next/image";
import { getCurrentUser } from "@/lib/guards";
import { ButtonLink } from "@/components/ui/Button";
import { FutCard } from "@/components/fut/FutCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-16">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 pt-4 md:grid-cols-2">
        <div>
          <Image
            src="/logo.png"
            alt="Logo Beausoleil Ultimate Team"
            width={160}
            height={160}
            priority
            className="mb-4 h-28 w-28 drop-shadow-[0_0_30px_rgba(229,181,58,.35)] sm:h-40 sm:w-40"
          />
          <p className="text-xs font-bold uppercase tracking-[.2em] text-pitch-light sm:text-sm sm:tracking-[.3em]">Foot en salle · 5 contre 5 · Lundi soir</p>
          <h1 className="heading mt-3 text-6xl leading-[.9] sm:text-7xl">
            Beausoleil <span className="text-gold-gradient">Ultimate Team</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/70">
            Chaque lundi, les joueurs élisent anonymement leurs 5 meilleurs et le plus nul de la soirée. Le mardi matin, la{" "}
            <strong className="text-gold-light">Team of the Week</strong> tombe en cartes FUT.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <ButtonLink href="/sessions">Mes sessions</ButtonLink>
                <ButtonLink href="/team-of-the-week" variant="outline">
                  Team of the Week
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/register">Créer mon compte</ButtonLink>
                <ButtonLink href="/login" variant="outline">
                  Connexion
                </ButtonLink>
              </>
            )}
          </div>
        </div>
        <div className="flex items-end justify-center gap-3 sm:gap-5" aria-hidden>
          {/* 3e carte masquée sur téléphone : la rangée dépasserait la largeur de l'écran */}
          <div className="hidden translate-y-6 sm:block">
            <FutCard nickname="Le Mur" rating={86} votes={6} firstPlaces={1} rank={3} delay={200} />
          </div>
          <FutCard nickname="Zizou" rating={94} votes={9} firstPlaces={5} rank={1} size="lg" />
          <div className="translate-y-6">
            <FutCard nickname="Boulet" rating={41} votes={7} variant="worst" delay={400} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. On joue", "L’ADMIN crée la session du lundi et coche les participants."],
          ["2. On vote", "De 20h à 8h : ton Top 5 classé et le plus nul. Vote unique et 100 % anonyme."],
          ["3. On publie", "Mardi matin, la Team of the Week et le Boulet de la semaine apparaissent."],
        ].map(([t, d]) => (
          <div key={t} className="panel">
            <h2 className="heading text-2xl text-gold">{t}</h2>
            <p className="mt-2 text-white/70">{d}</p>
          </div>
        ))}
      </section>

      <section className="panel text-center">
        <h2 className="heading text-3xl">Récompense du mois</h2>
        <p className="mx-auto mt-2 max-w-xl text-white/70">
          Le joueur le plus souvent premier gagne une boisson… offerte par celui qui a fini le plus souvent dernier.
        </p>
      </section>
    </div>
  );
}
