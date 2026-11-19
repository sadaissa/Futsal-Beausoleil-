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

describe("dossard : départage par les votes « plus nul »", () => {
  it("à égalité de Boulets, le dossard va à celui qui a reçu le plus de votes « plus nul » dans le mois", () => {
    // c et d sont chacun Boulet 1 fois, mais d a reçu plus de votes « plus nul » sur le mois.
    const out = computeMonthlyReward([
      { ...s("1", all, "a", "c"), worstVotes: { c: 4, d: 3 } },
      { ...s("2", all, "a", "d"), worstVotes: { d: 4, c: 1 } },
      { ...s("3", all, "b", "b"), worstVotes: { b: 5, d: 2 } },
    ]);
    expect(out.worsts).toEqual({ c: 1, d: 1, b: 1 });
    expect(out.winnerId).toBe("a");
    // b (Boulet 1 fois, 5 votes) : égalité de Boulets avec c et d, mais b totalise 5 votes, d 9, c 5.
    expect(out.worstVotes).toEqual({ c: 5, d: 9, b: 5 });
    expect(out.loserId).toBe("d");
    expect(out.draws).toHaveLength(0);
  });
});

describe("équipe du mois", () => {
  const totw = (...ids: string[]) => ids.map((playerId, i) => ({ playerId, topVotes: 6 - i, firstPlaces: i === 0 ? 2 : 0 }));
  const players = ["a", "b", "c", "d", "e", "f", "g"];

  it("prend les 5 joueurs le plus souvent dans la Team of the Week", () => {
    const out = computeMonthlyReward([
      { ...s("1", players, "a", "g"), totw: totw("a", "b", "c", "d", "e") },
      { ...s("2", players, "a", "g"), totw: totw("a", "b", "c", "d", "f") },
      { ...s("3", players, "b", "g"), totw: totw("b", "a", "c", "f", "d") },
    ]);
    expect(out.team.map((t) => t.playerId)).toEqual(["a", "b", "c", "d", "f"]);
    expect(out.team[0]).toMatchObject({ rank: 1, appearances: 3 });
    expect(out.team.find((t) => t.playerId === "f")?.appearances).toBe(2);
  });

  it("exclut les joueurs non éligibles (moins de 3 sessions) et les invités", () => {
    const out = computeMonthlyReward([
      { ...s("1", [...players, "x"], "x", "g"), totw: totw("x", "a", "b", "c", "d") },
      { ...s("2", players, "a", "g"), totw: totw("a", "b", "c", "d", "e") },
      { ...s("3", players, "a", "g"), totw: totw("a", "b", "c", "d", "e") },
    ]);
    expect(out.team.map((t) => t.playerId)).not.toContain("x");
  });

  it("départage une égalité parfaite sur la 5e place par un tirage traçable", () => {
    const flat = (...ids: string[]) => ids.map((playerId) => ({ playerId, topVotes: 3, firstPlaces: 0 }));
    const out = computeMonthlyReward(
      [
        { ...s("1", players, "a", "g"), totw: flat("a", "b", "c", "d", "e") },
        { ...s("2", players, "a", "g"), totw: flat("a", "b", "c", "d", "f") },
        { ...s("3", players, "a", "g"), totw: flat("a", "b", "c", "d", "g") },
      ],
      () => "graine",
    );
    expect(out.team).toHaveLength(5);
    expect(out.team.slice(0, 4).map((t) => t.playerId)).toEqual(["a", "b", "c", "d"]);
    const draw = out.draws.find((d) => d.context === "MONTHLY_TEAM");
    expect(draw?.candidates).toEqual(["e", "f", "g"]);
    expect(out.team[4].playerId).toBe(draw?.result[0]);
  });
});
