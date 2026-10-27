import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import { resetPlayerAvatarAction, togglePlayerDisabledAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export const metadata: Metadata = { title: "Admin · Joueurs" };

/** Gestion des joueurs : aucune donnée de vote individuelle n'est accessible ici. */
export default async function AdminPlayersPage() {
  const players = await prisma.user.findMany({
    orderBy: [{ nickname: "asc" }],
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      role: true,
      disabled: true,
      createdAt: true,
      _count: { select: { participations: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Joueurs" subtitle={`${players.length} compte(s) inscrit(s)`} />
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id} className="panel flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PlayerAvatar nickname={p.nickname ?? "?"} avatarUrl={p.avatarUrl} size={44} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-bold">{p.nickname ?? <em className="text-white/40">surnom à choisir</em>}</span>
                  {p.role === "ADMIN" && <Badge tone="gold">ADMIN</Badge>}
                  {p.disabled && <Badge tone="red">Bloqué</Badge>}
                </div>
                <div className="truncate text-sm text-white/50">{p.email}</div>
                <div className="text-xs text-white/40">
                  {p._count.participations} participation(s) · inscrit le {formatDateTime(p.createdAt, "dd/MM/yyyy")}
                </div>
              </div>
            </div>
            {p.role !== "ADMIN" && (
              <div className="flex flex-wrap gap-2">
                {p.avatarUrl && (
                  <form action={resetPlayerAvatarAction}>
                    <input type="hidden" name="userId" value={p.id} />
                    <ConfirmButton variant="ghost" confirm="Supprimer la photo de ce joueur ?">
                      Retirer la photo
                    </ConfirmButton>
                  </form>
                )}
                <form action={togglePlayerDisabledAction}>
                  <input type="hidden" name="userId" value={p.id} />
                  <ConfirmButton
                    variant={p.disabled ? "pitch" : "danger"}
                    confirm={p.disabled ? "Débloquer ce joueur ?" : "Bloquer ce joueur ? Il sera déconnecté."}
                  >
                    {p.disabled ? "Débloquer" : "Bloquer"}
                  </ConfirmButton>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
