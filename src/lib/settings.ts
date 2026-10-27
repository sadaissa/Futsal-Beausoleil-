import { prisma } from "./prisma";

// Réglages du vote : valeurs par défaut issues des variables d'environnement,
// surchargées par la table AppSetting (modifiable dans /admin).

export type VoteSettings = { voteStartTime: string; voteEndTime: string };

const DEFAULTS: VoteSettings = {
  voteStartTime: process.env.VOTE_START_TIME || "20:00",
  voteEndTime: process.env.VOTE_END_TIME || "08:00",
};

export async function getVoteSettings(): Promise<VoteSettings> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.keys(DEFAULTS) } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    voteStartTime: map.voteStartTime ?? DEFAULTS.voteStartTime,
    voteEndTime: map.voteEndTime ?? DEFAULTS.voteEndTime,
  };
}

export async function saveVoteSettings(settings: VoteSettings): Promise<void> {
  await prisma.$transaction(
    Object.entries(settings).map(([key, value]) =>
      prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
}
