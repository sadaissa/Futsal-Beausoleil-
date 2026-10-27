import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "PLAYER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      nickname: string | null;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    ver?: number;
    role?: AppRole;
    nickname?: string | null;
    avatarUrl?: string | null;
  }
}
