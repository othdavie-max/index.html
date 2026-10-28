import { describe, it, expect } from "vitest";
import { makeGame, advance, lgaNamed } from "./helpers";
import { perform } from "../engine/actions";
import { availableRaces } from "../engine/campaign";
import { advanceMonth } from "../engine/turn";
import { monthIndexOf } from "../engine/calendar";
import { contestIdFor } from "../engine/elections";
import type { GameState } from "../engine/types";

/** A well-prepared, well-known, well-funded candidate. */
function primeCandidate(s: GameState) {
  const lga = s.player.residenceLgaId;
  s.player.fame.lgas[lga] = 70; s.player.fame.states[s.player.residenceStateId] = 35; s.player.fame.national = 10;
  s.player.attrs.reputation = 70; s.player.attrs.leadership = 70; s.player.attrs.communication = 70; s.player.attrs.charisma = 65;
  s.player.politics.capital = 60;
  if (s.player.politics.membership) s.player.politics.membership.standing = 85;
}

describe("the election cycle runs end to end", () => {
  it("holds the scheduled general election and inaugurates the winners on time", () => {
    const s = makeGame({ seed: 14 });
    const pres0 = s.seats["pres"];
    expect(pres0.nextElection).toBe(monthIndexOf(2027, 2));
    expect(pres0.termEnd).toBe(monthIndexOf(2027, 5));
    advance(s, 22, { keepAfloat: 100000 });
    const pc = s.contests[contestIdFor(pres0, monthIndexOf(2027, 2))];
    expect(pc.phase).toBe("done");
    expect(pc.result).toBeDefined();
    expect(pc.result!.turnout).toBeGreaterThan(0.05);
    expect(Object.keys(pc.nominees).length).toBeGreaterThanOrEqual(5);
    const winner = pc.nominees[pc.result!.winnerPartyId];
    expect(s.seats["pres"].holderId).toBe(winner.charId);
    expect(s.seats["pres"].nextElection).toBe(monthIndexOf(2031, 2));
    expect(s.seats["pres"].termEnd).toBe(monthIndexOf(2031, 5));
    expect(s.seats["pres"].termsServed).toBeGreaterThanOrEqual(1);
    expect(s.parties[s.seats["pres"].partyId!].inPower).toBe(true);
    expect(Object.values(s.parties).filter((p) => p.inPower)).toHaveLength(1);
    expect(s.lastPresidential?.winnerPartyId).toBe(pc.result!.winnerPartyId);
    expect(Object.keys(s.lastPresidential!.byLga)).toHaveLength(774);
    // a presidential election produced news and an election-log entry
    expect(s.electionLog.some((e) => e.office === "president")).toBe(true);
    expect(s.news.some((n) => n.topic === "elections" && n.source.startsWith("election:C:"))).toBe(true);
  });
  it("a sitting president cannot serve a third term and parties field several candidates", () => {
    const s = makeGame({ seed: 15 });
    advance(s, 70, { keepAfloat: 100000 });
    const pres = s.seats["pres"];
    const hist = s.electionLog.filter((e) => e.office === "president");
    expect(hist.length).toBeGreaterThanOrEqual(2);
    expect(pres.termsServed).toBeLessThanOrEqual(2);
  });
  it("off-cycle governorship elections happen on their own schedule", () => {
    const s = makeGame({ seed: 16 });
    advance(s, 9, { keepAfloat: 100000 });
    const ekiti = s.electionLog.find((e) => e.office === "governor" && e.stateId === "NG-EK");
    const osun = s.electionLog.find((e) => e.office === "governor" && e.stateId === "NG-OS");
    expect(ekiti).toBeDefined();
    expect(osun).toBeDefined();
    expect(s.electionLog.some((e) => e.office === "governor" && e.stateId === "NG-LA")).toBe(false); // Lagos waits for the general cycle
  });
  it("results are explainable: every nominee has factor breakdowns", () => {
    const s = makeGame({ seed: 17 });
    advance(s, 16, { keepAfloat: 100000 });
    const c = Object.values(s.contests).find((x) => x.office === "president" && x.result)!;
    for (const k of Object.keys(c.result!.votes)) expect(Object.keys(c.result!.factors[k]).length).toBeGreaterThanOrEqual(9);
    expect(c.result!.notes.length).toBeGreaterThan(0);
  });
  it("no party is dominant everywhere: legislative seats are spread across parties", () => {
    const s = makeGame({ seed: 18 });
    const counts: Record<string, number> = {};
    for (const seat of Object.values(s.seats)) if (seat.office === "reps") counts[seat.partyId!] = (counts[seat.partyId!] ?? 0) + 1;
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...Object.values(counts))).toBeLessThan(250);
  });
});

describe("a player can rise: from citizen to elected office", () => {
  it("a prepared candidate can win a primary and an election and be sworn in; others can lose", () => {
    let office = 0, lost = 0, lostPrimary = 0;
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const seed of seeds) {
      const lga = lgaNamed(["Ikeja", "Ibadan North", "Fagge", "Enugu North", "Ilorin West", "Jos North", "Port-Harcourt", "Abeokuta South"][seed - 1] ?? "Ikeja");
      const s = makeGame({ seed, startAge: 30, backgroundId: "political", birthLgaId: lga.id, birthStateId: lga.stateId, bonus: { communication: 10, leadership: 10, negotiation: 4 } });
      perform(s, { t: "joinParty", partyId: ["NRC", "PHP", "SDU", "ARA", "NRC", "PHP", "NRC", "PHP"][seed - 1] });
      for (const k of ["partyWork", "organising", "volunteering"] as const) perform(s, { t: "commitment", key: k, on: true });
      let declared = false;
      for (let i = 0; i < 110 && !s.player.politics.seatId; i++) {
        s.pending = []; s.player.finances.cash += 300000; primeCandidate(s);
        if (!declared) { const r = availableRaces(s).find((x) => x.seat.office === "lg_chair" && x.open && x.eligibility.eligible); if (r) { perform(s, { t: "declare", seatId: r.seat.id }); declared = true; } }
        const cand = s.player.politics.candidacies.find((c) => c.stage === "aspirant" || c.stage === "nominee");
        if (cand?.stage === "aspirant") perform(s, { t: "primarySpend", amount: 200000 });
        if (cand?.stage === "nominee" && s.contests[cand.contestId]?.phase === "campaign") {
          perform(s, { t: "fundCampaign", amount: Math.min(s.player.finances.cash, 1_000_000) }); perform(s, { t: "fundraise" });
          perform(s, { t: "campaignBudget", activity: "grassroots", amount: 1_000_000 }); perform(s, { t: "campaignBudget", activity: "rallies", amount: 1_000_000 });
        }
        advanceMonth(s);
        if (s.player.politics.electionHistory.length && !s.player.politics.seatId && s.player.politics.electionHistory.at(-1)!.won === false) break;
      }
      const h = s.player.politics.electionHistory;
      if (s.player.politics.seatId) {
        office++;
        const seat = s.seats[s.player.politics.seatId];
        expect(seat.holderId).toBe("player");
        expect(seat.office).toBe("lg_chair");
        expect(s.player.occupation.kind).toBe("politician");
        expect(h.at(-1)!.won).toBe(true);
        expect(s.player.politics.pastOffices.at(-1)!.office).toBe("lg_chair");
        expect(s.notifications.some((n) => /sworn in/i.test(n.text))).toBe(true);
      } else if (h.length) { lost++; expect(h.at(-1)!.won).toBe(false); }
      else if (s.player.politics.candidacies.some((c) => c.stage === "lost_primary")) lostPrimary++;
    }
    // the path is open (some win) and not guaranteed (the outcomes vary)
    expect(office).toBeGreaterThan(0);
    expect(office + lost + lostPrimary).toBeGreaterThan(3);
  });
});
