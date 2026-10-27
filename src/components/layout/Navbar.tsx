import Link from "next/link";
import { getCurrentUser } from "@/lib/guards";
import { logoutAction } from "@/actions/auth";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { MobileMenu } from "./MobileMenu";

export const navLinks = [
  { href: "/sessions", label: "Sessions" },
  { href: "/team-of-the-week", label: "Team of the Week" },
  { href: "/monthly", label: "Mensuel" },
];

export async function Navbar() {
  const user = await getCurrentUser();
  const links = user?.role === "ADMIN" ? [...navLinks, { href: "/admin", label: "Admin" }] : navLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur no-print">
      <nav className="container-app flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="heading flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-light to-gold-dark text-lg text-ink">
            BU
          </span>
          <span className="heading hidden text-xl leading-none sm:block">
            Beausoleil <span className="text-gold">Ultimate Team</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/account" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-white/5">
                <PlayerAvatar nickname={user.nickname ?? "?"} avatarUrl={user.avatarUrl} size={32} />
                <span className="hidden text-sm font-semibold sm:block">{user.nickname ?? "Mon compte"}</span>
              </Link>
              <form action={logoutAction} className="hidden md:block">
                <button className="rounded-lg px-3 py-2 text-sm text-white/50 hover:text-white">Déconnexion</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink hover:brightness-110">
              Connexion
            </Link>
          )}
          <MobileMenu links={links} loggedIn={Boolean(user)} />
        </div>
      </nav>
    </header>
  );
}
