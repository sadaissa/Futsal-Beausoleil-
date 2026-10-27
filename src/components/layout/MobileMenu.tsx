"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/actions/auth";

export function MobileMenu({ links, loggedIn }: { links: { href: string; label: string }[]; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/5"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-white/10 bg-ink-900/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-3 font-semibold hover:bg-white/5">
                {l.label}
              </Link>
            ))}
            {loggedIn && (
              <>
                <Link href="/account" className="rounded-lg px-3 py-3 font-semibold hover:bg-white/5">
                  Mon compte
                </Link>
                <form action={logoutAction}>
                  <button className="w-full rounded-lg px-3 py-3 text-left text-white/60 hover:bg-white/5">Déconnexion</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
