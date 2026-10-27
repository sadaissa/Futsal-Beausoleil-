import { formatDateTime } from "@/lib/dates";

/**
 * Filigrane dynamique répété sur toute la page : e-mail et identifiant du joueur
 * connecté, avec la date. Une capture partagée permet d'en identifier l'auteur.
 */
export function Watermark({ email, userId }: { email: string; userId: string }) {
  const stamp = formatDateTime(new Date(), "dd/MM/yyyy HH:mm");
  const text = `${email} · ${userId.slice(-8)} · ${stamp}`;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden no-print">
      <div className="absolute -inset-[50%] flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-14 opacity-[0.07]">
        {Array.from({ length: 120 }, (_, i) => (
          <span key={i} className="whitespace-nowrap text-sm font-semibold text-white">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
