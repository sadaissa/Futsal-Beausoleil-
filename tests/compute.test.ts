import { describe, expect, it } from "vitest";
import { computeSessionResults, type PlayerTally } from "@/lib/results/compute";
import { drawOrder } from "@/lib/results/draw";

const t = (playerId: string, o: Partial<PlayerTally> = {}): PlayerTally => ({
  playerId,
  top1: 0,
  top2: 0,
  top3: 0,
  top4: 0,
  top5: 0,
  worst: 0,
  participations: 1,
  ...o,
});

describe("computeSessionResults", () => {
  it("classe les 5 joueurs ayant le plus d'apparitions dans les Top 5", () => {
    const { results, draws } = computeSessionResults(
      [
        t("a", { top1: 3, top2: 1 }),
        t("b", { top2: 2, top3: 1 }),
        t("c", { top3: 2 }),
        t("d", { top4: 4 }),
        t("e", { top5: 1 }),
        t("f", { top5: 5 }),
        t("g", { worst: 3 }),
      ],
      6,
    );
    const team = results.filter((r) => r.totwRank !== null).map((r) => r.playerId);
    expect(team).toEqual(["f", "a", "d", "b", "c"]);
    expect(results.find((r) => r.isWorst)?.playerId).toBe("g");
    expect(draws).toHaveLength(0);
  });

  it("départage par 1res places, puis 2es places, puis participations", () => {
    const { results } = computeSessionResults(
      [
        t("x", { top3: 2, participations: 9 }),
        t("y", { top1: 1, top3: 1 }),
        t("z", { top2: 1, top4: 1 }),
        t("w", { top2: 1, top5: 1, participations: 4 }),
      ],
      2,
    );
    expect(results.map((r) => r.playerId)).toEqual(["y", "w", "z", "x"]);
  });

  it("utilise un tirage au sort traçable en cas d'égalité parfaite", () => {
    const seed = "deadbeef";
    const { results, draws } = computeSessionResults([t("p1", { top1: 1 }), t("p2", { top1: 1 })], 2, () => seed);
    expect(draws).toHaveLength(1);
    expect(draws[0].seed).toBe(seed);
    expect(draws[0].result).toEqual(drawOrder(["p1", "p2"], seed));
    expect(results.map((r) => r.playerId)).toEqual(draws[0].result);
  });

  it("n'effectue pas de tirage pour une égalité hors du Top 5", () => {
    const tallies = ["a", "b", "c", "d", "e"].map((id, i) => t(id, { top1: 5 - i }));
    const { draws } = computeSessionResults([...tallies, t("f", { top5: 0 }), t("g")], 5);
    expect(draws).toHaveLength(0);
  });

  it("départage le plus nul par tirage au sort", () => {
    const { results, draws } = computeSessionResults([t("a", { worst: 2 }), t("b", { worst: 2 }), t("c", { worst: 1 })], 5, () => "01");
    expect(draws[0].context).toBe("WORST");
    expect(results.filter((r) => r.isWorst).map((r) => r.playerId)).toEqual([draws[0].result[0]]);
  });

  it("n'élit personne sans vote", () => {
    const { results } = computeSessionResults([t("a"), t("b")], 0);
    expect(results.every((r) => r.totwRank === null && !r.isWorst)).toBe(true);
  });

  it("donne des notes FUT cohérentes", () => {
    const { results } = computeSessionResults([t("a", { top1: 10 }), t("b", { worst: 10 })], 10);
    expect(results.find((r) => r.playerId === "a")!.rating).toBe(99);
    expect(results.find((r) => r.playerId === "b")!.rating).toBe(30);
  });
});

describe("drawOrder", () => {
  it("est déterministe pour une graine donnée et indépendant de l'ordre d'entrée", () => {
    expect(drawOrder(["a", "b", "c"], "s")).toEqual(drawOrder(["c", "a", "b"], "s"));
  });
});
