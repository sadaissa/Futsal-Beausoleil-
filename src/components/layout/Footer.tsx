import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 py-8 text-center text-xs text-white/40 no-print">
      Beausoleil Ultimate Team · Foot en salle du lundi · Votes 100 % anonymes ·{" "}
      <Link href="/confidentialite" className="underline hover:text-white">
        Confidentialité
      </Link>
    </footer>
  );
}
