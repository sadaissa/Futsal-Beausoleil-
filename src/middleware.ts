import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Middleware Edge : première barrière d'authentification et d'autorisation.
// Chaque page et chaque action revérifie les droits côté serveur (défense en profondeur).
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/register", "/team-of-the-week", "/confidentialite"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));

  // Note : /login et /register ne redirigent pas ici un utilisateur "connecté". Le jeton lu
  // par le middleware peut avoir été révoqué côté serveur (compte bloqué, mot de passe changé) :
  // ces pages vérifient elles-mêmes la session en base, ce qui évite une boucle de redirections.

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
