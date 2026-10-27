import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSameOrigin } from "@/lib/guards";
import { deleteAvatarBlob } from "@/lib/blob";

export const runtime = "nodejs";

const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Vérifie la signature binaire du fichier (on ne se fie pas au type déclaré par le navigateur). */
function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

/** Envoi d'une nouvelle photo de profil vers Vercel Blob. */
export async function POST(req: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origine refusée." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Stockage des photos non configuré (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image trop lourde (2 Mo maximum)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) return NextResponse.json({ error: "Formats acceptés : JPEG, PNG ou WebP." }, { status: 415 });

  const blob = await put(`avatars/${user.id}-${randomBytes(6).toString("hex")}.${TYPES[type]}`, buf, {
    access: "public",
    contentType: type,
    addRandomSuffix: false,
  });
  if (user.avatarUrl) await deleteAvatarBlob(user.avatarUrl);
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: blob.url } });
  revalidatePath("/", "layout");
  return NextResponse.json({ url: blob.url });
}

/** Suppression de la photo de profil (retour aux initiales). */
export async function DELETE() {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origine refusée." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  if (user.avatarUrl) await deleteAvatarBlob(user.avatarUrl);
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
