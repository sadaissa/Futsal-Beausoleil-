import Image from "next/image";
import { initials } from "./PlayerAvatar";

export type FutCardProps = {
  nickname: string;
  avatarUrl?: string | null;
  rating: number;
  /** Votes reçus : apparitions dans les Top 5 (carte or) ou votes "plus nul" (carte Boulet). */
  votes: number;
  firstPlaces?: number;
  rank?: number;
  /** Joueur invité (sans compte) : petit badge sur la carte. */
  isGuest?: boolean;
  /** Distinction du mois en cours : Joueur du mois (⭐) ou porteur du dossard (🦺). */
  honor?: "mvp" | "dossard" | null;
  /** gold : Team of the Week · worst : Boulet · potm : joueurs du mois (bleu/violet). */
  variant?: "gold" | "worst" | "potm";
  size?: "md" | "lg";
  /** Libellés des deux statistiques (par défaut « votes » et « 1res »). */
  statLabels?: [string, string];
  /** Libellé sous la note (par défaut « TOTW », ou « NUL » pour le Boulet). */
  ratingLabel?: string;
  /** Délai d'animation d'apparition (ms). */
  delay?: number;
};

/** Carte joueur façon FUT : dégradé or (ou rouge/noir pour le Boulet), reflet holographique. */
export function FutCard({
  nickname,
  avatarUrl,
  rating,
  votes,
  firstPlaces = 0,
  rank,
  isGuest = false,
  honor = null,
  variant = "gold",
  size = "md",
  statLabels = ["votes", "1res"],
  ratingLabel,
  delay = 0,
}: FutCardProps) {
  const worst = variant === "worst";
  const potm = variant === "potm";
  const light = worst || potm; // texte clair sur fond sombre
  const width = size === "lg" ? "w-36 sm:w-44" : "w-[7.25rem] sm:w-40";
  const ink = light ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]" : "text-ink";
  const sub = light ? "text-white/75" : "text-ink/70";

  return (
    <div className={`fut-wrap animate-rise ${width}`} style={{ animationDelay: `${delay}ms` }}>
      <div
        className={`fut-card fut-holo ${
          worst ? "fut-worst shadow-boulet" : potm ? "fut-potm shadow-potm" : "fut-gold shadow-gold"
        }`}
        role="img"
        aria-label={`${nickname}, note ${rating}, ${votes} vote${votes > 1 ? "s" : ""}`}
      >
        <div className="fut-inner flex flex-col items-center px-2 pb-[20%] pt-[12%]">
          {/* Note et libellé */}
          <div className={`absolute left-[12%] top-[11%] flex flex-col items-center leading-none ${ink}`}>
            <span className="heading text-[1.6rem] sm:text-4xl">{rating}</span>
            <span className={`heading mt-0.5 text-[10px] tracking-widest sm:text-xs ${sub}`}>{ratingLabel ?? (worst ? "NUL" : "TOTW")}</span>
            {rank && !worst && <span className={`heading mt-1 text-[10px] sm:text-xs ${sub}`}>#{rank}</span>}
            {isGuest && (
              <span
                className={`mt-1 rounded px-0.5 text-[7px] font-black uppercase sm:text-[8px] ${
                  light ? "bg-white/15 text-white/80" : "bg-ink/15 text-ink/80"
                }`}
              >
                Invité
              </span>
            )}
            {honor && (
              <span className="mt-1 text-sm leading-none" title={honor === "mvp" ? "Joueur du mois" : "Porte le dossard du plus nul du mois"}>
                {honor === "mvp" ? "⭐" : "🦺"}
              </span>
            )}
          </div>

          {/* Photo ou initiales */}
          <div className="relative ml-[22%] mt-[4%] flex aspect-square w-[50%] items-end justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                sizes="120px"
                className={`rounded-full object-cover ${worst ? "grayscale" : ""}`}
              />
            ) : (
              <span
                className={`heading flex h-full w-full items-center justify-center rounded-full text-3xl sm:text-5xl ${
                  light ? "bg-white/15 text-white/90" : "bg-ink/10 text-ink/80"
                }`}
              >
                {initials(nickname)}
              </span>
            )}
          </div>

          {/* Surnom */}
          <div className={`mt-[5%] w-[86%] border-b ${light ? "border-white/30" : "border-ink/25"} pb-1 text-center`}>
            <span className={`heading block truncate text-base sm:text-xl ${ink}`}>{nickname}</span>
          </div>

          {/* Statistiques */}
          <div className={`mt-1 flex w-[80%] justify-around text-center leading-none ${ink}`}>
            <div>
              <div className="heading text-sm sm:text-lg">{votes}</div>
              <div className={`text-[8px] font-bold uppercase sm:text-[9px] ${sub}`}>{statLabels[0]}</div>
            </div>
            {!worst && (
              <div>
                <div className="heading text-sm sm:text-lg">{firstPlaces}</div>
                <div className={`text-[8px] font-bold uppercase sm:text-[9px] ${sub}`}>{statLabels[1]}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {worst && (
        <div className="mt-2 text-center">
          <span className="inline-block -rotate-2 rounded-md bg-boulet px-2 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-boulet">
            Boulet de la semaine
          </span>
        </div>
      )}
    </div>
  );
}
