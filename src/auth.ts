import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { isValidResyncProof } from "@/lib/token-resync";

class InvalidCredentials extends CredentialsSignin {
  code = "identifiants";
}

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(googleEnabled
      ? [
          Google({
            // Google vérifie l'adresse e-mail : on rattache le compte Google au compte
            // existant ayant le même e-mail, ce qui garantit un compte unique par e-mail.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        // Comparaison systématique pour ne pas révéler l'existence d'un compte par le temps de réponse.
        const hash = user?.passwordHash ?? "$2b$12$P/YVOBVMloT3Uq.q.BV6F.KxoDrDE5jvqSSSlyqz99Lhb5E/yUcwq";
        const valid = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !user.passwordHash || !valid || user.disabled || user.isGuest) throw new InvalidCredentials();
        return { id: user.id, email: user.email };
      },
    }),
  ],
  events: {
    /**
     * Un compte Google vient d'être rattaché. Si le compte existant avait été créé par
     * e-mail/mot de passe sans vérification, son mot de passe est supprimé et toutes ses
     * sessions sont invalidées : seul le vrai propriétaire de l'adresse garde l'accès.
     */
    async linkAccount({ user }) {
      if (!user.id) return;
      const existing = await prisma.user.findUnique({ where: { id: user.id } });
      if (!existing) return;
      await prisma.user.update({
        where: { id: user.id },
        data: existing.emailVerified
          ? {}
          : { emailVerified: new Date(), passwordHash: null, tokenVersion: { increment: 1 } },
      });
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      // Les comptes bloqués par l'ADMIN ne peuvent pas se connecter.
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !existing?.disabled && !existing?.isGuest;
    },
    /**
     * Le jeton est resynchronisé avec la base à chaque lecture côté serveur :
     * rôle, surnom et avatar sont toujours à jour, et un compte supprimé, bloqué
     * ou dont les sessions ont été révoquées est immédiatement déconnecté.
     */
    async jwt({ token, user, trigger, session }) {
      const uid = user?.id ?? token.uid;
      if (!uid) return null;
      const dbUser = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, role: true, nickname: true, avatarUrl: true, disabled: true, isGuest: true, tokenVersion: true },
      });
      if (!dbUser || dbUser.disabled || dbUser.isGuest) return null;
      const resync =
        trigger === "update" && isValidResyncProof(dbUser.id, dbUser.tokenVersion, (session as { resync?: unknown })?.resync);
      if (user || resync) token.ver = dbUser.tokenVersion;
      else if (token.ver !== dbUser.tokenVersion) return null;
      token.uid = dbUser.id;
      token.role = dbUser.role;
      token.nickname = dbUser.nickname;
      token.avatarUrl = dbUser.avatarUrl;
      return token;
    },
  },
});

export { googleEnabled };
