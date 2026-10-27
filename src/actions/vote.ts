"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/guards";
import type { ActionState } from "@/lib/action-result";
import { fieldErrors, voteSchema } from "@/lib/validations";
import { submitVote, VoteError } from "@/lib/voting/submit";

export async function voteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = voteSchema.safeParse({
    sessionId: formData.get("sessionId"),
    top: [1, 2, 3, 4, 5].map((i) => formData.get(`top${i}`)),
    worst: formData.get("worst"),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { error: Object.values(errors)[0] ?? "Vote invalide.", fieldErrors: errors };
  }
  try {
    await submitVote({
      sessionId: parsed.data.sessionId,
      voterId: user.id,
      topParticipantIds: parsed.data.top,
      worstParticipantId: parsed.data.worst,
    });
  } catch (e) {
    if (e instanceof VoteError) return { error: e.message };
    console.error("Erreur lors du vote", e instanceof Error ? e.message : e);
    return { error: "Une erreur est survenue, réessaie." };
  }
  revalidatePath(`/sessions/${parsed.data.sessionId}`);
  // Retour sur la session, qui confirme le vote (la page de vote n'est plus accessible).
  redirect(`/sessions/${parsed.data.sessionId}?vote=ok`);
}
