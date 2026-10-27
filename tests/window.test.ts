import { describe, expect, it } from "vitest";
import { computeVoteWindow, defaultSessionTitle, isMonday, previousMonthKey } from "@/lib/dates";
import { isDueForPublication, isVotingOpen, votePhase } from "@/lib/voting/window";

describe("fenêtre de vote", () => {
  it("lundi 20h00 → mardi 08h00, heure de Paris", () => {
    const { opensAt, closesAt } = computeVoteWindow("2026-10-26", "20:00", "08:00", "Europe/Paris");
    expect(opensAt.toISOString()).toBe("2026-10-26T19:00:00.000Z"); // heure d'hiver (UTC+1)
    expect(closesAt.toISOString()).toBe("2026-10-27T07:00:00.000Z");
  });

  it("fenêtre le même jour si la fin suit le début", () => {
    const { closesAt } = computeVoteWindow("2026-06-01", "20:00", "23:59", "Europe/Paris");
    expect(closesAt.toISOString()).toBe("2026-06-01T21:59:00.000Z"); // heure d'été (UTC+2)
  });

  it("ouvre et ferme selon le statut et l'heure", () => {
    const s = { status: "SCHEDULED" as const, voteOpensAt: new Date("2026-10-26T19:00:00Z"), voteClosesAt: new Date("2026-10-27T07:00:00Z") };
    expect(isVotingOpen(s, new Date("2026-10-26T18:59:00Z"))).toBe(false);
    expect(isVotingOpen(s, new Date("2026-10-26T21:00:00Z"))).toBe(true);
    expect(isVotingOpen(s, new Date("2026-10-27T07:00:00Z"))).toBe(false);
    expect(isDueForPublication(s, new Date("2026-10-27T07:10:00Z"))).toBe(true);
    expect(isVotingOpen({ ...s, status: "OPEN" }, new Date("2030-01-01"))).toBe(true);
    expect(isVotingOpen({ ...s, status: "CLOSED" }, new Date("2026-10-26T21:00:00Z"))).toBe(false);
    expect(votePhase({ ...s, status: "PUBLISHED" })).toBe("published");
  });

  it("utilitaires de dates", () => {
    expect(isMonday("2026-10-26")).toBe(true);
    expect(isMonday("2026-10-27")).toBe(false);
    expect(defaultSessionTitle("2026-10-26")).toBe("Lundi 26 octobre 2026");
    expect(previousMonthKey(new Date("2026-01-01T10:00:00Z"))).toBe("2025-12");
  });
});
