import { FutCard, type FutCardProps } from "./FutCard";

/**
 * Terrain de foot en salle avec les 5 cartes de la Team of the Week en 1-2-2 :
 * le n°1 en pointe, puis deux lignes de deux joueurs.
 */
export function FutsalPitch({ players }: { players: (FutCardProps & { key: string })[] }) {
  const [first, ...rest] = players;
  const rows = [rest.slice(0, 2), rest.slice(2, 4)];
  return (
    <div className="pitch relative overflow-hidden rounded-3xl border border-pitch-light/30 px-2 py-6 shadow-2xl sm:px-6 sm:py-10">
      <div className="pitch-lines" aria-hidden />
      <div className="relative flex flex-col items-center gap-4 sm:gap-6">
        {first && <FutCard {...first} size="lg" delay={0} />}
        {rows.map((row, r) => (
          <div key={r} className="flex justify-center gap-6 sm:gap-16">
            {row.map((p, i) => {
              const { key, ...props } = p;
              return <FutCard key={key} {...props} delay={150 * (r * 2 + i + 1)} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
