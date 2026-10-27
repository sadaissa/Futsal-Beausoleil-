import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { publishDueSessions } from "@/lib/results/publish";
import { isCronAuthorized } from "../auth";

export const dynamic = "force-dynamic";

/** Mardi matin : clôture les votes terminés et publie la Team of the Week. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const published = await publishDueSessions();
  if (published.length) {
    revalidatePath("/team-of-the-week");
    revalidatePath("/sessions");
  }
  return NextResponse.json({ published });
}
