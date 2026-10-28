/**
 * World construction: LGA and state simulation state, legislative constituencies, seats, AI politicians, parties.
 * Everything is derived deterministically from the seed and the real administrative dataset.
 *
 * SIMULATED (labelled as such in the UI): LGA populations, urbanness, party affinities, indicator starting values,
 * constituency delimitation, and every named politician. The geography itself is real.
 */
import type { GameState, Seat, Indicators, PartyState, Character, StateId } from "./types";
import { INDICATORS } from "./types";
import { ADMIN_LGAS, LGAS_BY_STATE, LGA_BY_ID } from "./admin";
import { STATES, STATE_BY_ID, ZONES, POP_GROWTH_FACTOR, REGISTERED_SHARE, senateSeatsFor, assemblySeatsFor, type StateMeta } from "../data/states";
import { PARTIES, ISSUES, type Issue } from "../data/parties";
import { RULESETS, type Ruleset, type OfficeId } from "../data/rules";
import { Rng, clamp, clamp01, clamp100, subRng } from "./rng";
import { partition, apportion, ROMAN, type GeoItem } from "./geometry";
import { makePolitician, addRecord } from "./characters";
import { monthIndexOf } from "./calendar";
import { DEFAULT_ALLOCATIONS } from "./economy";

// ---------------------------------------------------------------- qualitative scenario priors (NOT statistics)
const TIER_BASE: Record<1 | 2 | 3, Indicators> = {
  1: { economy: 38, infrastructure: 36, security: 58, health: 42, education: 42, power: 38 },
  2: { economy: 48, infrastructure: 48, security: 58, health: 47, education: 50, power: 44 },
  3: { economy: 60, infrastructure: 60, security: 58, health: 55, education: 58, power: 52 },
};
const ZONE_ADJ: Record<string, Partial<Indicators>> = {
  SW: { economy: 4, health: 3, education: 4, security: 4 },
  SE: { economy: 2, health: 3, education: 4, security: -2 },
  SS: { economy: 1, security: -4, power: -2 },
  NC: { security: -8 },
  NW: { economy: -4, health: -5, education: -6, security: -12 },
  NE: { economy: -7, health: -6, education: -7, security: -18 },
};

export function weightedAverageIndicators(state: Pick<GameState, "states">): Indicators {
  const out = Object.fromEntries(INDICATORS.map((k) => [k, 0])) as Indicators;
  let pop = 0;
  for (const s of Object.values(state.states)) {
    pop += s.pop;
    for (const k of INDICATORS) out[k] += s.indicators[k] * s.pop;
  }
  for (const k of INDICATORS) out[k] /= pop || 1;
  return out;
}

export function ruleOf(state: Pick<GameState, "meta">): Ruleset {
  return RULESETS[state.meta.rulesetId];
}

const SEAT_ID = {
  pres: "pres",
  gov: (s: string) => `gov:${s}`,
  sen: (s: string, i: number) => `sen:${s}:${i + 1}`,
  rep: (s: string, i: number) => `rep:${s}:${i + 1}`,
  sha: (s: string, i: number) => `sha:${s}:${i + 1}`,
  lgc: (l: string) => `lgc:${l}`,
};
export const seatIds = SEAT_ID;

function nameForGroup(lgaIds: string[], pop: Record<string, number>): string {
  const sorted = [...lgaIds].sort((a, b) => pop[b] - pop[a] || a.localeCompare(b));
  const names = sorted.slice(0, 2).map((id) => LGA_BY_ID[id].name);
  const extra = sorted.length > 2 ? ` +${sorted.length - 2}` : "";
  return names.join("/") + extra;
}

function directionNames(groups: string[][], items: Record<string, GeoItem>): string[] {
  // order groups along the axis with greatest spread and name them
  const cents = groups.map((g) => {
    const w = g.reduce((t, id) => t + items[id].w, 0) || 1;
    return { x: g.reduce((t, id) => t + items[id].x * items[id].w, 0) / w, y: g.reduce((t, id) => t + items[id].y * items[id].w, 0) / w };
  });
  const sx = Math.max(...cents.map((c) => c.x)) - Math.min(...cents.map((c) => c.x));
  const sy = Math.max(...cents.map((c) => c.y)) - Math.min(...cents.map((c) => c.y));
  const useX = sx >= sy;
  const order = cents.map((c, i) => ({ i, v: useX ? c.x : -c.y })).sort((a, b) => a.v - b.v);
  const labels = useX ? ["West", "Central", "East"] : ["South", "Central", "North"];
  const out = new Array(groups.length).fill("");
  order.forEach((o, rank) => (out[o.i] = labels[Math.min(rank, 2)]));
  return out;
}

/** Create world simulation state for LGAs & states. */
export function buildGeography(state: GameState, rng: Rng): void {
  const rule = ruleOf(state);
  const start = { y: rule.startYear, m: rule.startMonth };
  // --- LGA populations (simulated): weight ∝ area^0.4 × lognormal noise
  const lgaW: Record<string, number> = {};
  for (const l of ADMIN_LGAS) lgaW[l.id] = Math.pow(Math.max(l.areaKm2, 5), 0.4) * Math.exp(rng.normal(0, 0.45));
  const stateWSum: Record<string, number> = {};
  for (const l of ADMIN_LGAS) stateWSum[l.stateId] = (stateWSum[l.stateId] ?? 0) + lgaW[l.id];

  // urbanness from density rank (simulated proxy)
  const dens: { id: string; d: number; pop: number }[] = ADMIN_LGAS.map((l) => {
    const meta = STATE_BY_ID[l.stateId];
    const pop = meta.pop2006m * 1e6 * POP_GROWTH_FACTOR * (lgaW[l.id] / stateWSum[l.stateId]);
    return { id: l.id, d: pop / Math.max(l.areaKm2, 1), pop };
  });
  const ranked = [...dens].sort((a, b) => a.d - b.d);
  const urbanOf: Record<string, number> = {};
  ranked.forEach((r, i) => (urbanOf[r.id] = Math.pow(i / (ranked.length - 1), 1.6)));

  // --- states
  for (const meta of STATES) {
    const lgas = LGAS_BY_STATE[meta.id];
    const zone = meta.zone;
    const adj = ZONE_ADJ[zone] ?? {};
    const ind = {} as Indicators;
    for (const k of INDICATORS) ind[k] = clamp(TIER_BASE[meta.urbanTier][k] + (adj[k] ?? 0) + rng.normal(0, 5), 8, 92);
    const pop = Math.round(meta.pop2006m * 1e6 * POP_GROWTH_FACTOR);
    // staggered LG election cycle by state
    const lgNext = 3 + Math.floor(rng.next() * 33);
    state.states[meta.id] = {
      id: meta.id, pop, registered: Math.round(pop * REGISTERED_SHARE), indicators: ind, satisfaction: clamp(rng.normal(46, 8), 25, 70),
      treasuryM: 0, revenueMonthlyM: 0, allocations: { ...DEFAULT_ALLOCATIONS, admin: 0.3, security: 0.15, infrastructure: 0.2 },
      debtM: 0, governorSeatId: null, assemblySeatIds: [], senateSeatIds: [], repsSeatIds: [], lgaIds: lgas.map((l) => l.id),
      lgNextElection: lgNext, incidents: clamp(50 - ind.security * 0.4 + rng.normal(0, 8), 0, 100), floodRisk: clamp01(rng.normal(meta.zone === "SS" || meta.zone === "NC" ? 0.45 : 0.25, 0.15)),
    };
  }

  // --- party affinities
  const stateNoise: Record<StateId, Record<string, number>> = {};
  for (const meta of STATES) {
    stateNoise[meta.id] = {};
    for (const p of PARTIES) stateNoise[meta.id][p.id] = rng.normal(0, 0.3);
  }
  for (const l of ADMIN_LGAS) {
    const meta = STATE_BY_ID[l.stateId];
    const st = state.states[l.stateId];
    const pop = dens.find((d) => d.id === l.id)!.pop;
    const urban = urbanOf[l.id];
    const aff: Record<string, number> = {};
    let sum = 0;
    for (const p of PARTIES) {
      const base = p.zoneStrength[meta.zone] * (1 + p.urbanLean * (urban - 0.4) * 1.4);
      const v = Math.max(0.005, base) * Math.exp(stateNoise[meta.id][p.id] + rng.normal(0, 0.18));
      aff[p.id] = v;
      sum += v;
    }
    for (const k of Object.keys(aff)) aff[k] /= sum;
    const ind = {} as Indicators;
    for (const k of INDICATORS) ind[k] = clamp(st.indicators[k] + (k === "economy" || k === "infrastructure" || k === "power" ? (urban - 0.4) * 14 : 0) + rng.normal(0, 6), 5, 95);
    const sal = {} as Record<Issue, number>;
    const map: Record<Issue, keyof Indicators | null> = { economy: "economy", infrastructure: "infrastructure", security: "security", health: "health", education: "education", power: "power", integrity: null };
    for (const i of ISSUES) sal[i] = map[i] ? clamp01(1 - ind[map[i]!] / 100 + rng.normal(0, 0.05)) : clamp01(0.4 + urban * 0.2 + rng.normal(0, 0.05));
    state.lgas[l.id] = {
      id: l.id, pop: Math.round(pop), registered: Math.round(pop * REGISTERED_SHARE), urban, affinity: aff, indicators: ind,
      turnoutBase: clamp(rng.normal(0.27 - (STATE_BY_ID[l.stateId].zone === "NE" ? 0.03 : 0) + urban * 0.03, 0.05), 0.12, 0.5),
      salience: sal, wards: Math.max(5, Math.round(pop / 22000 + rng.normal(0, 1))), chairSeatId: SEAT_ID.lgc(l.id),
    };
  }
  // reconcile state population as sum of LGAs
  for (const meta of STATES) {
    const st = state.states[meta.id];
    st.pop = st.lgaIds.reduce((t, id) => t + state.lgas[id].pop, 0);
    st.registered = st.lgaIds.reduce((t, id) => t + state.lgas[id].registered, 0);
  }
  void start;
}

/** state-level aggregate party affinity (registered-voter weighted) */
export function stateAffinity(state: Pick<GameState, "states" | "lgas">, stateId: StateId): Record<string, number> {
  const st = state.states[stateId];
  const out: Record<string, number> = {};
  let w = 0;
  for (const id of st.lgaIds) {
    const l = state.lgas[id];
    w += l.registered;
    for (const [p, v] of Object.entries(l.affinity)) out[p] = (out[p] ?? 0) + v * l.registered;
  }
  for (const k of Object.keys(out)) out[k] /= w || 1;
  return out;
}

function pickParty(rng: Rng, aff: Record<string, number>, sharpness = 2.2): string {
  const entries = Object.entries(aff);
  return rng.weighted(entries, ([, v]) => Math.pow(v, sharpness))[0];
}

function mkSeat(state: GameState, s: Omit<Seat, "holderId" | "partyId" | "termStart" | "termsServed">): Seat {
  const seat: Seat = { ...s, holderId: null, partyId: null, termStart: s.termEnd - 48, termsServed: 0 };
  state.seats[seat.id] = seat;
  return seat;
}

/** Seat holder helper. */
export function installHolder(state: GameState, seat: Seat, c: Character, termStart: number, termsServed: number): void {
  seat.holderId = c.id;
  seat.partyId = c.partyId;
  seat.termStart = termStart;
  seat.termsServed = termsServed;
  c.seatId = seat.id;
}

/** Creates seats, constituencies and AI politicians holding them. */
export function buildSeatsAndPoliticians(state: GameState, rng: Rng): void {
  const rule = ruleOf(state);
  const idx = (y: number, m: number) => monthIndexOf(y, m, rule.startYear, rule.startMonth);
  const gen = rule.baseGeneralElection;
  const eFed = idx(gen.year, gen.month); // presidential / NASS
  const eState = eFed + 1;
  const eInaugFed = idx(gen.year, rule.timeline.inaugurationMonth.president); // 29 May
  const eInaugLeg = idx(gen.year, rule.timeline.inaugurationMonth.senate); // legislatures are inaugurated in June
  const popOf: Record<string, number> = Object.fromEntries(Object.values(state.lgas).map((l) => [l.id, l.pop]));
  const rulingParty = "NRC";

  const mkChar = (stateId: StateId, lgaId: string, partyId: string, profile: OfficeId | "party" | "minister", role?: string) =>
    makePolitician(state, rng, rule.startYear, { stateId, lgaId, partyId, profile, role });

  // ---- presidency
  const presSeat = mkSeat(state, { id: SEAT_ID.pres, office: "president", label: "President of Nigeria", stateId: null, lgaIds: [], lgaWeights: [], termEnd: eInaugFed, nextElection: eFed });
  {
    const home = pickHome(state, rng, rulingParty);
    const c = mkChar(home.stateId, home.lgaId, rulingParty, "president", "President");
    installHolder(state, presSeat, c, presSeat.termEnd - 48, 1);
    addRecord(c, 0, "Sworn in as President (first term).");
  }

  for (const meta of STATES) {
    const st = state.states[meta.id];
    const lgas = LGAS_BY_STATE[meta.id];
    const items: Record<string, GeoItem> = {};
    for (const l of lgas) items[l.id] = { id: l.id, x: l.c[0], y: l.c[1], w: popOf[l.id] };
    const aff = stateAffinity(state, meta.id);

    // ---- governor
    if (!meta.isFct) {
      const offc = meta.offCycle;
      const nextE = offc ? idx(offc.year, offc.month) : eState;
      const termEnd = offc ? nextE + 4 : eInaugFed; // general-cycle governors take office 29 May
      const gSeat = mkSeat(state, { id: SEAT_ID.gov(meta.id), office: "governor", label: `Governor of ${meta.name}`, stateId: meta.id, lgaIds: lgas.map((l) => l.id), lgaWeights: lgas.map(() => 1), termEnd, nextElection: nextE });
      const party = pickParty(rng, aff);
      const home = lgas[Math.floor(rng.next() * lgas.length)];
      const c = mkChar(meta.id, home.id, party, "governor", "Governor");
      const terms = rng.chance(0.45) ? 2 : 1;
      installHolder(state, gSeat, c, termEnd - 48, terms);
      st.governorSeatId = gSeat.id;
    }

    // ---- senate
    const nSen = senateSeatsFor(meta);
    const senGroups = partition(Object.values(items), nSen);
    const senNames = nSen === 3 ? directionNames(senGroups.map((g) => g.map((i) => i.id)), items) : ["FCT"];
    senGroups.forEach((g, i) => {
      const ids = g.map((x) => x.id);
      const seat = mkSeat(state, { id: SEAT_ID.sen(meta.id, i), office: "senate", label: nSen === 1 ? "Senator, FCT" : `${meta.name} ${senNames[i]} Senatorial District`, stateId: meta.id, lgaIds: ids, lgaWeights: ids.map(() => 1), termEnd: eInaugLeg, nextElection: eFed });
      const aff2 = groupAffinity(state, ids);
      const home = LGA_BY_ID[ids[Math.floor(rng.next() * ids.length)]];
      const c = mkChar(meta.id, home.id, pickParty(rng, aff2), "senate", "Senator");
      installHolder(state, seat, c, eInaugLeg - 48, rng.int(1, 4));
      st.senateSeatIds.push(seat.id);
    });

    // ---- house of representatives and assembly (constituencies)
    const makeLegis = (kind: "rep" | "sha", count: number) => {
      const out: { ids: string[]; weights: number[]; label: string }[] = [];
      const lgaList = Object.values(items);
      if (count <= lgaList.length) {
        for (const g of partition(lgaList, count)) {
          const ids = g.map((x) => x.id);
          out.push({ ids, weights: ids.map(() => 1), label: "" });
        }
      } else {
        const seatsPer = apportion(lgaList.map((l) => l.w), count);
        lgaList.forEach((l, i) => {
          for (let j = 0; j < seatsPer[i]; j++) out.push({ ids: [l.id], weights: [1 / seatsPer[i]], label: seatsPer[i] > 1 ? `${LGA_BY_ID[l.id].name} ${ROMAN[j + 1] ?? j + 1}` : "" });
        });
      }
      return out.map((o) => ({ ...o, label: o.label || nameForGroup(o.ids, popOf) }));
    };
    const nReps = meta.repsSeats;
    makeLegis("rep", nReps).forEach((c0, i) => {
      const seat = mkSeat(state, { id: SEAT_ID.rep(meta.id, i), office: "reps", label: `${c0.label} Federal Constituency`, stateId: meta.id, lgaIds: c0.ids, lgaWeights: c0.weights, termEnd: eInaugLeg, nextElection: eFed });
      const aff2 = groupAffinity(state, c0.ids);
      const home = LGA_BY_ID[c0.ids[0]];
      const c = mkChar(meta.id, home.id, pickParty(rng, aff2), "reps", "Member, House of Representatives");
      installHolder(state, seat, c, eInaugLeg - 48, rng.int(1, 4));
      st.repsSeatIds.push(seat.id);
    });
    const nSha = assemblySeatsFor(meta);
    if (nSha > 0) {
      makeLegis("sha", nSha).forEach((c0, i) => {
        const seat = mkSeat(state, { id: SEAT_ID.sha(meta.id, i), office: "state_assembly", label: `${c0.label} State Constituency`, stateId: meta.id, lgaIds: c0.ids, lgaWeights: c0.weights, termEnd: eInaugLeg, nextElection: eState });
        const aff2 = groupAffinity(state, c0.ids);
        const home = LGA_BY_ID[c0.ids[0]];
        const c = mkChar(meta.id, home.id, pickParty(rng, aff2), "state_assembly", "State Assembly Member");
        installHolder(state, seat, c, eInaugLeg - 48, rng.int(1, 3));
        st.assemblySeatIds.push(seat.id);
      });
    }

    // ---- LGA chairmen
    for (const l of lgas) {
      const termEnd = st.lgNextElection + 1;
      const seat = mkSeat(state, { id: SEAT_ID.lgc(l.id), office: "lg_chair", label: `Chairman, ${l.name} ${meta.isFct ? "Area Council" : "LGA"}`, stateId: meta.id, lgaIds: [l.id], lgaWeights: [1], termEnd, nextElection: st.lgNextElection });
      seat.termStart = termEnd - 36;
      // chairs lean to the state's governing party (state electoral commissions)
      const gov = st.governorSeatId ? state.seats[st.governorSeatId].partyId : null;
      const localAff = state.lgas[l.id].affinity;
      const party = gov && rng.chance(0.62) ? gov : pickParty(rng, localAff);
      const c = mkChar(meta.id, l.id, party, "lg_chair", "LGA Chairman");
      installHolder(state, seat, c, termEnd - 36, rng.int(1, 2));
    }
  }
  seatsReady(state);
}
function seatsReady(state: GameState) {
  void state;
}

function groupAffinity(state: GameState, lgaIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  let w = 0;
  for (const id of lgaIds) {
    const l = state.lgas[id];
    w += l.registered;
    for (const [p, v] of Object.entries(l.affinity)) out[p] = (out[p] ?? 0) + v * l.registered;
  }
  for (const k of Object.keys(out)) out[k] /= w || 1;
  return out;
}

function pickHome(state: GameState, rng: Rng, partyId: string): { stateId: string; lgaId: string } {
  const sts = STATES.filter((s) => !s.isFct);
  const s = rng.weighted(sts, (m) => stateAffinity(state, m.id)[partyId] ?? 0.01);
  const lgas = LGAS_BY_STATE[s.id];
  return { stateId: s.id, lgaId: lgas[Math.floor(rng.next() * lgas.length)].id };
}

export function buildParties(state: GameState, rng: Rng): void {
  const rule = ruleOf(state);
  for (const def of PARTIES) {
    const home = pickHome(state, rng, def.id);
    const chair = makePolitician(state, rng, rule.startYear, { stateId: home.stateId, lgaId: home.lgaId, partyId: def.id, profile: "party", role: `${def.abbr} National Chairman` });
    const home2 = pickHome(state, rng, def.id);
    const sec = makePolitician(state, rng, rule.startYear, { stateId: home2.stateId, lgaId: home2.lgaId, partyId: def.id, profile: "party", role: `${def.abbr} National Secretary` });
    const fp: Record<string, number> = {};
    for (const f of def.factions) fp[f.id] = Math.round(clamp(rng.normal(100 / def.factions.length, 8), 10, 60));
    const ps: PartyState = {
      id: def.id, fundsM: def.fundsM, reputation: def.reputation, orgStrength: def.orgStrength, chairId: chair.id, secretaryId: sec.id,
      memberCount: Math.round(def.orgStrength * 28), factionPower: fp, momentum: 0, exists: true, inPower: def.id === "NRC",
    };
    state.parties[def.id] = ps;
  }
  // federal cabinet for the governing party (used by the AI as a pool of presidential-calibre figures)
  const ministries = ["Finance", "Works", "Power", "Health", "Education", "Defence", "Interior", "Agriculture", "Petroleum", "Justice", "Transport", "Labour", "Communications"];
  for (const m of ministries) {
    const home = pickHome(state, rng, "NRC");
    makePolitician(state, rng, rule.startYear, { stateId: home.stateId, lgaId: home.lgaId, partyId: "NRC", profile: "minister", role: `Minister of ${m}` });
  }
}

/** Initial party momentum is neutral; ruling party flagged. Initial state treasuries sized from revenue. */
export function initTreasuries(state: GameState, rng: Rng): void {
  const monthlyNationalM = (state.economy.revenueAnnualBn * 1000) / 12;
  const totalPop = Object.values(state.states).reduce((t, s) => t + s.pop, 0);
  for (const meta of STATES) {
    const st = state.states[meta.id];
    const share = 0.6 * (st.pop / totalPop) + 0.4 * (1 / STATES.length) + (meta.urbanTier - 1) * 0.004;
    st.revenueMonthlyM = Math.round(monthlyNationalM * 0.28 * share * (0.9 + rng.next() * 0.2) * (STATES.length / 37));
    st.treasuryM = st.revenueMonthlyM * 2;
  }
}

export function zoneLabel(stateId: string): string {
  return ZONES[STATE_BY_ID[stateId].zone];
}
export function stateMeta(stateId: string): StateMeta {
  return STATE_BY_ID[stateId];
}
export { subRng, clamp100 };
