import { describe, expect, it } from "vitest";
import { computeMonthlyReward, type MonthSession } from "@/lib/rewards/monthly";

const s = (id: string, participantIds: string[], firstId: string | null, worstId: string | null): MonthSession => ({
  sessionId: id,
  participantIds,
  firstId,
  worstId,
});

const all = ["a", "b", "c", "d"];

describe("computeMonthlyReward", () => {
  it("désigne le plus souvent 1er et le plus souvent dernier", () => {
    const out = computeMonthlyReward([
      s("1", all, "a", "d"),
      s("2", all, "a", "c"),
      s("3", all, "b", "d"),
      s("4", all, "a", "d"),
    ]);
    expect(out.winnerId).toBe("a");
    expect(out.winnerCount).toBe(3);
    expect(out.loserId).toBe("d");
    expect(out.loserCount).toBe(3);
  });

  it("exige au moins 3 participations pour être éligible", () => {
    const out = computeMonthlyReward([
      s("1", [...all, "z"], "z", "d"),
      s("2", [...all, "z"], "z", "d"),
      s("3", all, "a", "c"),
    ]);
    expect(out.eligibleIds).not.toContain("z");
    expect(out.winnerId).toBe("a");
  });

  it("ignore les sessions avec moins de 3 joueurs éligibles", () => {
    const out = computeMonthlyReward([
      s("1", ["a", "b", "c"], "a", "c"),
      s("2", ["a", "b", "c"], "a", "c"),
      s("3", ["a", "b", "c"], "b", "c"),
      s("4", ["a", "x"], "x", "a"),
    ]);
    expect(out.countedSessionIds).toEqual(["1", "2", "3"]);
    expect(out.loserId).toBe("c");
  });

  it("ne génère pas de récompense sans session retenue", () => {
    const out = computeMonthlyReward([s("1", ["a", "b"], "a", "b")]);
    expect(out.winnerId).toBeNull();
    expect(out.reason).toBeTruthy();
  });

  it("le gagnant ne peut pas être aussi celui qui offre", () => {
    const out = computeMonthlyReward([
      s("1", all, "a", "a"),
      s("2", all, "a", "a"),
      s("3", all, "b", "c"),
    ]);
    expect(out.winnerId).toBe("a");
    expect(out.loserId).toBe("c");
  });

  it("départage par participations puis tirage traçable", () => {
    const out = computeMonthlyReward(
      [s("1", all, "a", "c"), s("2", all, "b", "d"), s("3", all, "a", "c"), s("4", all, "b", "d")],
      () => "seed",
    );
    expect(["a", "b"]).toContain(out.winnerId);
    expect(out.draws.map((d) => d.context)).toEqual(["MONTHLY_BEST", "MONTHLY_WORST"]);
  });
});
