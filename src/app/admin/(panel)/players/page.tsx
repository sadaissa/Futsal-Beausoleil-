import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import { deleteGuestAction, resetPlayerAvatarAction, togglePlayerDisabledAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/fut/PlayerAvatar";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AddGuestForm, ResetPasswordForm } from "@/components/admin/AdminForms";

export const metadata: Metadata = { title: "Admin · Joueurs" };

/** Gestion des joueurs : aucune donnée de vote individuelle n'est accessible ici. */
export default async function AdminPlayersPage() {
  const [players, guests] = await Promise.all([
    prisma.user.findMany({
      where: { isGuest: false },
      orderBy: [{ nickname: "asc" }],
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        disabled: true,
        mustChangePassword: true,
        createdAt: true,
        _count: { select: { participations: true } },
      },
    }),
    prisma.user.findMany({
      where: { isGuest: true },
      orderBy: { nickname: "asc" },
      select: { id: true, nickname: true, _count: { select: { participations: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Joueurs" subtitle={`${players.length} compte(s) inscrit(s) · ${guests.length} invité(s)`} />
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
                  {p.mustChangePassword && <Badge>Mot de passe temporaire</Badge>}
                </div>
                <div className="truncate text-sm text-white/50">{p.email}</div>
                <div className="text-xs text-white/40">
                  {p._count.participations} participation(s) · inscrit le {formatDateTime(p.createdAt, "dd/MM/yyyy")}
                </div>
              </div>
            </div>
            {p.role !== "ADMIN" && (
              <div className="flex flex-wrap items-start gap-2">
                <ResetPasswordForm userId={p.id} nickname={p.nickname ?? p.email} />
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

      <section className="space-y-3">
        <h2 className="heading text-3xl">Invités ({guests.length})</h2>
        <p className="text-sm text-white/50">
          Joueurs ponctuels sans compte. On peut voter pour eux et ils peuvent être élus ; ils ne votent pas et sont
          exclus des récompenses mensuelles. Coche-les dans une session comme les autres joueurs.
        </p>
        <div className="panel">
          <AddGuestForm />
        </div>
        <ul className="space-y-2">
          {guests.map((g) => (
            <li key={g.id} className="panel flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar nickname={g.nickname ?? "?"} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{g.nickname}</span>
                    <Badge>Invité</Badge>
                  </div>
                  <div className="text-xs text-white/40">{g._count.participations} participation(s)</div>
                </div>
              </div>
              {g._count.participations === 0 && (
                <form action={deleteGuestAction}>
                  <input type="hidden" name="userId" value={g.id} />
                  <ConfirmButton variant="ghost" confirm={`Supprimer l'invité ${g.nickname} ?`}>
                    Supprimer
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
          {guests.length === 0 && <li className="text-sm text-white/40">Aucun invité pour l’instant.</li>}
        </ul>
      </section>
    </div>
  );
}
