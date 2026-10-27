import Image from "next/image";

/** Initiales d'un surnom : "Zizou" → "ZI", "Le Mur" → "LM". */
export function initials(nickname: string): string {
  const words = nickname.trim().split(/[\s._'-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nickname.trim().slice(0, 2).toUpperCase();
}

/** Photo de profil, ou initiales du surnom si aucune photo n'a été ajoutée. */
export function PlayerAvatar({
  nickname,
  avatarUrl,
  size = 40,
  className = "",
}: {
  nickname: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={nickname}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ring-2 ring-gold/40 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={nickname}
      className={`heading inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-ink ring-2 ring-gold/40 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(nickname)}
    </span>
  );
}
