import type { NextAuthConfig } from "next-auth";

/**
 * Configuration Auth.js compatible Edge (utilisée par le middleware).
 * Elle ne doit importer ni Prisma ni bcrypt : les fournisseurs et l'accès
 * à la base de données sont ajoutés dans `auth.ts` (runtime Node.js).
 */
export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [],
  callbacks: {
    // Expose dans la session uniquement les champs nécessaires à l'interface.
    session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid;
        session.user.role = token.role ?? "PLAYER";
        session.user.nickname = token.nickname ?? null;
        session.user.avatarUrl = token.avatarUrl ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
