import "server-only";
import { del } from "@vercel/blob";

/** Supprime une ancienne photo de profil stockée sur Vercel Blob (sans bloquer en cas d'échec). */
export async function deleteAvatarBlob(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !url.includes(".blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch (e) {
    console.warn("Suppression de l'ancien avatar impossible", e instanceof Error ? e.message : e);
  }
}
