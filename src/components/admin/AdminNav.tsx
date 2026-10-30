import Link from "next/link";

const links = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/players", label: "Joueurs" },
  { href: "/admin/results", label: "Résultats" },
  { href: "/admin/rewards", label: "Distinctions" },
];

export function AdminNav() {
  return (
    <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="shrink-0 rounded-full border border-white/10 bg-ink-800 px-4 py-2 text-sm font-semibold text-white/70 hover:border-gold/50 hover:text-white"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
