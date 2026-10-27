import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSameOrigin } from "@/lib/guards";
import { captureEventSchema } from "@/lib/validations";

/** Journalise une tentative de capture d'écran détectée sur une page sensible. */
export async function POST(req: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origine refusée." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const parsed = captureEventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Événement invalide." }, { status: 400 });

  // Limitation simple : au plus 20 événements par joueur et par heure.
  const recent = await prisma.screenshotEvent.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600_000) } },
  });
  if (recent < 20) {
    const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
    await prisma.screenshotEvent.create({ data: { userId: user.id, ...parsed.data, userAgent: ua } });
  }
  return NextResponse.json({ ok: true });
}
