import { FutCard, type FutCardProps } from "./FutCard";

/**
 * Terrain de foot en salle avec 5 cartes FUT (Team of the Week ou équipe du mois) en 1-2-2 :
 * le n°1 en pointe, puis deux lignes de deux joueurs.
 */
export function FutsalPitch({ players }: { players: (FutCardProps & { key: string })[] }) {
  const [firstEntry, ...rest] = players;
  const rows = [rest.slice(0, 2), rest.slice(2, 4)];
  return (
    <div className="pitch relative overflow-hidden rounded-3xl border border-pitch-light/30 px-2 py-6 shadow-2xl sm:px-6 sm:py-10">
      <div className="pitch-lines" aria-hidden />
      <div className="relative flex flex-col items-center gap-4 sm:gap-6">
        {firstEntry && <FutCard key={firstEntry.key} {...withoutKey(firstEntry)} size="lg" delay={0} />}
        {rows.map((row, r) => (
          <div key={r} className="flex justify-center gap-6 sm:gap-16">
            {row.map((p, i) => {
              return <FutCard key={p.key} {...withoutKey(p)} delay={150 * (r * 2 + i + 1)} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Retire `key` des props (React interdit de la transmettre par décomposition). */
function withoutKey({ key, ...props }: FutCardProps & { key: string }): FutCardProps {
  void key;
  return props;
}
