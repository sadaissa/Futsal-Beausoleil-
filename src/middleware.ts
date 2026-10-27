import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Middleware Edge : première barrière d'authentification et d'autorisation.
// Chaque page et chaque action revérifie les droits côté serveur (défense en profondeur).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/register", "/team-of-the-week"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));

  // Utilisateur connecté qui revient sur /login ou /register.
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/sessions", req.nextUrl));
  }

  if (!isPublic && !user) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  // Routes ADMIN : réservées au rôle ADMIN (sauf l'écran d'initialisation).
  if (pathname.startsWith("/admin") && pathname !== "/admin/setup" && user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Exclut les API (protégées individuellement), les fichiers statiques et les images.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
