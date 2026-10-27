import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { previousMonthKey } from "@/lib/dates";
import { publishDueSessions } from "@/lib/results/publish";
import { computeAndSaveMonth } from "@/lib/rewards/compute-month";
import { isCronAuthorized } from "../auth";

export const dynamic = "force-dynamic";

/** Le 1er de chaque mois : calcule la récompense du mois écoulé. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  await publishDueSessions(); // au cas où une session du mois n'aurait pas encore été publiée
  const month = previousMonthKey();
  const reward = await computeAndSaveMonth(month);
  revalidatePath("/monthly");
  return NextResponse.json({ month, status: reward.status });
}
