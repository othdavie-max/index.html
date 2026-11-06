/**
 * Weighted, rule-based behaviour for AI politicians and parties — no cloud calls, fully deterministic given the seed.
 * Each action respects the character's role: only seat-holders defect from a seat, only old characters retire, party
 * finances move with performance, and so on. Candidate selection and election behaviour live in elections.ts.
 */
import type { GameState } from "./types";
import { subRng, clamp } from "./rng";
import { once } from "./ids";
import { pushNews } from "./news";
import { partyDefOf, activeParties } from "./queries";
import { dateOf } from "./calendar";
import { ruleOf } from "./world";
import { vacateSeat } from "./politics";
import { addRecord } from "./characters";
import { stateName } from "./admin";

export function processAi(state: GameState): void {
  if (!once(state, "ai")) return;
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "ai", m);
  const rule = ruleOf(state);
  const year = dateOf(m, rule.startYear, rule.startMonth).year;
  const parties = activeParties(state);
  const presParty = state.seats["pres"].partyId;
  const inWindow = (seatNext: number) => seatNext - m <= 10 && seatNext - m >= 0;

  // party finances and momentum
  for (const p of Object.values(state.parties)) {
    if (!p.exists) continue;
    p.momentum = clamp(p.momentum * 0.97, -1, 1);
    const holders = Object.values(state.seats).filter((s) => s.partyId === p.id).length;
    p.fundsM = Math.max(0, p.fundsM + (holders * 0.4 - 6) * (state.economy.cpi / 100) * 0.1 + rng.normal(0, 3));
    p.memberCount = Math.max(5, Math.round(p.memberCount * (1 + p.momentum * 0.002)));
  }

  for (const c of Object.values(state.chars)) {
    if (c.kind !== "politician" || c.status !== "active") continue;
    const age = year - c.birthYear;
    // ageing out
    if (age > 70 && rng.chance(0.002 * Math.exp((age - 70) / 5))) {
      if (c.seatId) {
        const seat = state.seats[c.seatId];
        addRecord(c, m, "Died in office.");
        c.status = "deceased";
        pushNews(state, { headline: `${c.name}, ${seat.label}, dies at ${age}`, topic: seat.stateId ? "state" : "national", importance: seat.office === "president" || seat.office === "governor" ? 3 : 1, stateId: seat.stateId, partyId: c.partyId, source: `death:${c.id}` });
        vacateSeat(state, seat.id, "death in office");
      } else c.status = "deceased";
      continue;
    }
    // defection of seat-holders: more likely toward the party in power, and after poor party momentum
    if (!c.seatId || !c.partyId || (c.lastDefection !== undefined && m - c.lastDefection < 12)) continue;
    const seat = state.seats[c.seatId];
    if (inWindow(seat.nextElection)) continue; // defection season is handled around primaries
    const pm = state.parties[c.partyId]?.momentum ?? 0;
    const towardPower = c.partyId !== presParty && presParty ? 1 : 0;
    const hazard = 0.00035 * (1 + Math.max(0, -pm) * 3) * (1 + towardPower * (seat.office === "governor" ? 3 : 1.4)) * (0.6 + c.attrs.ambition / 100);
    if (!rng.chance(hazard)) continue;
    const targets = parties.filter((p) => p !== c.partyId);
    const to = rng.weighted(targets, (p) => (p === presParty ? 2.5 : 1) * (0.5 + (state.parties[p].orgStrength ?? 20) / 100));
    const from = partyDefOf(state, c.partyId)?.abbr;
    const toAbbr = partyDefOf(state, to)?.abbr;
    c.partyId = to;
    c.lastDefection = m;
    seat.partyId = to;
    addRecord(c, m, `Defected from ${from} to ${toAbbr}.`);
    const important = seat.office === "governor" || seat.office === "senate" || seat.office === "president";
    if (important || rng.chance(0.2)) {
      pushNews(state, { headline: `${seat.office === "governor" ? `${stateName(seat.stateId!)} governor ` : seat.office === "senate" ? "Senator " : ""}${c.name} defects from ${from} to ${toAbbr}`, body: "Observers say the move reshapes the local balance of power.", topic: "party", importance: seat.office === "governor" ? 3 : important ? 2 : 1, stateId: seat.stateId, partyId: to, source: `defect:${c.id}:${m}` });
    }
    if (state.parties[to]) state.parties[to].momentum = clamp(state.parties[to].momentum + (seat.office === "governor" ? 0.04 : 0.01), -1, 1);
  }
}
