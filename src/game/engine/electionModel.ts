/**
 * The voting model. Pure functions: (state, contest description, runners, rng) → ContestResult.
 *
 * Each LGA is a voter bloc with a party-affinity vector, issue salience, turnout base and local conditions.
 * For every runner in every bloc a utility is computed from transparent terms, then shares = softmax(utility).
 *
 *   party        ln(local party affinity / average)                       party identification
 *   candidate    popularity and charisma                                  personal appeal
 *   local        home LGA / state / zone ties, by office level
 *   fame         (player) name recognition where the voters live
 *   campaign     diminishing returns on spend relative to the lawful limit, plus organisation
 *   momentum     candidate momentum + party national momentum
 *   incumbency   office-holder advantage, and a reward/penalty for the governing party tied to satisfaction
 *   issues       how well the party's priorities match the bloc's unmet needs
 *   scandal      known scandal penalty
 *   shocks       national + state + local random shocks (seeded, reported as "local factors")
 *
 * Turnout depends on base turnout, enthusiasm, campaign engagement, insecurity, rain and election-day events.
 * Money alone cannot win: spend has diminishing returns and is one term among many.
 */
import type { GameState, ContestResult, ContestResultState, PartyId, LgaId, StateId } from "./types";
import type { OfficeId, Ruleset } from "../data/rules";
import { PARTY_BY_ID, ISSUES, type Issue } from "../data/parties";
import { STATE_BY_ID } from "../data/states";
import { Rng, subRng, clamp, clamp01 } from "./rng";
import { partyDefOf } from "./queries";
import { calendarMonth } from "./calendar";

export interface Runner {
  key: string;
  partyId: PartyId;
  name: string;
  isPlayer: boolean;
  charId: string | null;
  appeal: number; // 0..100
  charisma: number;
  integrity: number;
  organisation: number; // 0..100
  momentum: number; // -1..1
  scandal: number; // 0..100 public
  budgetRatio: number; // lawful spend / limit
  incumbent: boolean;
  homeLgaId: LgaId | null;
  homeStateId: StateId | null;
  /** player only: name recognition 0..100 by area */
  fame?: (lgaId: LgaId, stateId: StateId) => number;
  runningMateStateId?: StateId | null;
  /** player's administration approval, if the player is the incumbent */
  approval?: number;
}

export interface ModelContext {
  state: GameState;
  rule: Ruleset;
  office: OfficeId;
  seatLgaIds: LgaId[];
  lgaWeights: number[];
  seatStateId: StateId | null;
  electionMonth: number;
  round: 1 | 2;
  /** round 2: parties eliminated and whom they endorse (partyId → runner key or null) */
  eliminated?: { partyId: PartyId; endorses: string | null }[];
  rngSeedKey: string;
}

export const TERMS = ["party", "candidate", "local", "fame", "campaign", "momentum", "incumbency", "issues", "scandal", "shocks"] as const;
export type Term = (typeof TERMS)[number];
export const TERM_LABEL: Record<Term, string> = {
  party: "Party base", candidate: "Personal appeal", local: "Home ties", fame: "Name recognition", campaign: "Campaign & organisation",
  momentum: "Momentum", incumbency: "Incumbency & performance", issues: "Issue fit", scandal: "Scandal", shocks: "Local factors & luck",
};

const W = { party: 1.0, candidate: 0.9, charisma: 0.4, fame: 1.1, campaign: 1.2, org: 0.6, momentum: 0.8, incumbent: 0.3, issues: 1.5, partyMomentum: 0.8, scandal: 0.025, integrity: 0.3 };

const OFFICE_TURNOUT_BUMP: Record<OfficeId, number> = { president: 0.08, governor: 0.04, senate: 0.02, reps: 0.01, state_assembly: -0.01, lg_chair: -0.04, councillor: -0.05 };

/** which party governs the relevant level, for the performance term */
function governingParty(state: GameState, office: OfficeId, stateId: StateId | null): { partyId: PartyId | null; sat: number } {
  const pres = state.seats["pres"];
  if (office === "president") return { partyId: pres.partyId, sat: state.economy.satisfaction };
  const gov = stateId ? state.seats[`gov:${stateId}`] : null;
  const stSat = stateId ? state.states[stateId].satisfaction : state.economy.satisfaction;
  if (office === "governor" || office === "state_assembly" || office === "lg_chair" || office === "councillor") return { partyId: gov?.partyId ?? null, sat: stSat };
  return { partyId: pres.partyId, sat: 0.5 * state.economy.satisfaction + 0.5 * stSat };
}

function localTie(office: OfficeId, r: Runner, lgaId: LgaId, stateId: StateId, seatLgas: LgaId[]): number {
  if (!r.homeLgaId || !r.homeStateId) return 0;
  const sameLga = r.homeLgaId === lgaId;
  const sameState = r.homeStateId === stateId;
  const sameZone = STATE_BY_ID[r.homeStateId]?.zone === STATE_BY_ID[stateId]?.zone;
  switch (office) {
    case "lg_chair": case "councillor": return sameLga ? 0.5 : sameState ? 0.12 : 0;
    case "state_assembly": case "reps": return seatLgas.includes(r.homeLgaId) ? (sameLga ? 0.5 : 0.35) : sameState ? 0.12 : 0;
    case "senate": return sameLga ? 0.4 : sameState ? 0.25 : 0;
    case "governor": return sameLga ? 0.3 : sameState ? 0.0 : 0;
    case "president": return sameState ? 0.4 : sameZone ? 0.12 : 0;
  }
}

function dot(prio: Partial<Record<Issue, number>>, sal: Record<Issue, number>): number {
  let s = 0, meanSal = 0;
  for (const i of ISSUES) meanSal += sal[i] / ISSUES.length;
  for (const i of ISSUES) s += (prio[i] ?? 0) * (sal[i] - meanSal);
  return s;
}

function ideologyDistance(state: GameState, a: PartyId, b: PartyId): number {
  const da = partyDefOf(state, a), db = partyDefOf(state, b);
  if (!da || !db) return 1;
  const x = da.ideology, y = db.ideology;
  return Math.sqrt((x.economic - y.economic) ** 2 + (x.social - y.social) ** 2 + (x.federalism - y.federalism) ** 2);
}

export interface BlocResult {
  lgaId: LgaId;
  stateId: StateId;
  turnout: number;
  registered: number;
  votes: Record<string, number>;
  terms: Record<string, Record<Term, number>>;
}

/** Compute one LGA bloc. weight scales the registered voters counted (sub-constituency share). */
export function computeBloc(ctx: ModelContext, runners: Runner[], lgaId: LgaId, weight: number, shocks: { national: Record<PartyId, number>; state: Record<PartyId, number> }, rng: Rng, dayShift: number): BlocResult {
  const { state, office } = ctx;
  const lga = state.lgas[lgaId];
  const stateId = lgaId.split("-").slice(0, 2).join("-");
  const st = state.states[stateId];
  const gov = governingParty(state, office, ctx.seatStateId ?? stateId);
  const n = Object.keys(lga.affinity).length;
  const terms: Record<string, Record<Term, number>> = {};
  const U: Record<string, number> = {};

  // effective affinity in round 2 (endorsements & ideological drift of eliminated parties' voters)
  const eff: Record<PartyId, number> = { ...lga.affinity };
  let abstainFromEliminated = 0;
  if (ctx.round === 2 && ctx.eliminated) {
    for (const e of ctx.eliminated) {
      const share = lga.affinity[e.partyId] ?? 0;
      eff[e.partyId] = 0;
      abstainFromEliminated += share * 0.18;
      const finalists = runners.filter((r) => !ctx.eliminated!.some((x) => x.partyId === r.partyId));
      const weights = finalists.map((f) => (e.endorses === f.key ? 0.7 : 0) + 0.3 / (0.3 + ideologyDistance(state, e.partyId, f.partyId)));
      const tot = weights.reduce((a, b) => a + b, 0) || 1;
      finalists.forEach((f, i) => (eff[f.partyId] = (eff[f.partyId] ?? 0) + share * 0.82 * (weights[i] / tot)));
    }
  }

  for (const r of runners) {
    const aff = Math.max(0.004, eff[r.partyId] ?? 0.004);
    const t = {} as Record<Term, number>;
    t.party = W.party * Math.log(aff * n);
    t.candidate = W.candidate * ((r.appeal - 50) / 50) + W.charisma * ((r.charisma - 50) / 50);
    let local = localTie(office, r, lgaId, stateId, ctx.seatLgaIds);
    if (office === "president" && r.runningMateStateId) local += r.runningMateStateId === stateId ? 0.3 : STATE_BY_ID[r.runningMateStateId]?.zone === STATE_BY_ID[stateId]?.zone ? 0.08 : 0;
    t.local = local;
    t.fame = r.fame ? W.fame * (r.fame(lgaId, stateId) / 100) : 0;
    t.campaign = W.campaign * (1 - Math.exp(-3 * clamp(r.budgetRatio, 0, 1.6))) + W.org * (r.organisation / 100) * (r.isPlayer ? 1 : 0.9);
    t.momentum = W.momentum * r.momentum + W.partyMomentum * (state.parties[r.partyId]?.momentum ?? 0);
    let inc = 0;
    if (r.incumbent) inc += W.incumbent + (r.approval !== undefined ? ((r.approval - 50) / 50) * 0.9 : ((gov.sat - 50) / 50) * 0.3);
    if (gov.partyId && r.partyId === gov.partyId) inc += ((gov.sat - 50) / 50) * 0.9; // governing party rewarded/punished for conditions
    t.incumbency = inc;
    const def = partyDefOf(state, r.partyId);
    t.issues = def ? W.issues * dot(def.priorities, lga.salience) : 0;
    t.scandal = -W.scandal * r.scandal + (lga.salience.integrity > 0.45 ? W.integrity * ((r.integrity - 50) / 50) * (lga.salience.integrity - 0.4) : 0);
    t.shocks = (shocks.national[r.partyId] ?? 0) + (shocks.state[r.partyId] ?? 0) + rng.normal(0, 0.14);
    terms[r.key] = t;
    U[r.key] = TERMS.reduce((s, k) => s + t[k], 0);
  }

  // softmax shares
  const mx = Math.max(...Object.values(U));
  let z = 0;
  const e: Record<string, number> = {};
  for (const r of runners) {
    e[r.key] = Math.exp(U[r.key] - mx);
    z += e[r.key];
  }

  // turnout
  const spendEngagement = 0.05 * clamp01(runners.reduce((s, r) => s + r.budgetRatio, 0) / runners.length / 0.6);
  const enthusiasm = (50 - (office === "president" || office === "governor" ? st.satisfaction : st.satisfaction * 0.7 + 15)) / 500; // discontent mobilises a bit
  const rain = [7, 8, 9].includes(calendarMonth(state, ctx.electionMonth)) ? -0.025 : 0;
  const insecurity = -0.1 * (st.incidents / 100) - 0.04 * (1 - st.indicators.security / 100);
  let turnout = lga.turnoutBase + OFFICE_TURNOUT_BUMP[office] + enthusiasm + spendEngagement + rain + insecurity + dayShift - abstainFromEliminated - (ctx.round === 2 ? 0.04 : 0);
  turnout = clamp(turnout, 0.08, 0.82);
  const registered = Math.round(lga.registered * weight);
  const voters = registered * turnout;
  const votes: Record<string, number> = {};
  for (const r of runners) votes[r.key] = Math.round((voters * e[r.key]) / z);
  return { lgaId, stateId, turnout, registered, votes, terms };
}

export function ruleSpreadForGov(ctx: ModelContext) {
  return ctx.rule.governorship;
}

/** Election-day events: per-state turnout shifts. Deterministic from the seed. */
export function electionDayShifts(state: GameState, ctx: ModelContext): { shift: Record<StateId, number>; events: string[] } {
  const rng = subRng(state.meta.seed, "election-day", ctx.rngSeedKey);
  const shift: Record<StateId, number> = {};
  const events: string[] = [];
  const states = ctx.seatStateId ? [ctx.seatStateId] : Object.keys(state.states);
  for (const sid of states) {
    const st = state.states[sid];
    let d = 0;
    if (rng.chance(0.06)) { d -= 0.04; events.push(`Late arrival of materials delayed voting in parts of ${STATE_BY_ID[sid].name}.`); }
    if (rng.chance(0.03 + st.incidents / 1400)) { d -= 0.06; events.push(`Security incidents kept some voters away in ${STATE_BY_ID[sid].name}.`); }
    if (rng.chance(0.04) && [7, 8, 9, 10].includes(calendarMonth(state, ctx.electionMonth))) { d -= 0.03; events.push(`Heavy rain reduced turnout in ${STATE_BY_ID[sid].name}.`); }
    if (rng.chance(0.02)) { d -= 0.02; events.push(`Technical glitches with accreditation devices slowed voting in ${STATE_BY_ID[sid].name}.`); }
    shift[sid] = d;
  }
  return { shift, events: ctx.seatStateId ? events : events.slice(0, 8) };
}

/** Run the whole contest: all blocs, aggregate, explanation. */
export function runContest(ctx: ModelContext, runners: Runner[]): ContestResult {
  const { state } = ctx;
  const root = `${ctx.rngSeedKey}`;
  const natRng = subRng(state.meta.seed, "shock-national", ctx.electionMonth, ctx.round);
  const national: Record<PartyId, number> = {};
  for (const p of Object.keys(state.parties)) national[p] = natRng.normal(0, 0.16);
  const dayEv = electionDayShifts(state, ctx);

  const stateShocks: Record<StateId, Record<PartyId, number>> = {};
  const rngBloc = subRng(state.meta.seed, "bloc", root, ctx.round);
  const blocs: BlocResult[] = [];
  ctx.seatLgaIds.forEach((id, i) => {
    const sid = id.split("-").slice(0, 2).join("-");
    if (!stateShocks[sid]) {
      const r = subRng(state.meta.seed, "shock-state", ctx.electionMonth, ctx.round, sid);
      stateShocks[sid] = {};
      for (const p of Object.keys(state.parties)) stateShocks[sid][p] = r.normal(0, 0.2);
    }
    blocs.push(computeBloc(ctx, runners, id, ctx.lgaWeights[i] ?? 1, { national, state: stateShocks[sid] }, rngBloc, dayEv.shift[sid] ?? 0));
  });
  return aggregate(ctx, runners, blocs, dayEv.events);
}

function aggregate(ctx: ModelContext, runners: Runner[], blocs: BlocResult[], dayEvents: string[]): ContestResult {
  const { state, rule, office } = ctx;
  const votes: Record<string, number> = Object.fromEntries(runners.map((r) => [r.key, 0]));
  let registered = 0;
  const factorsNum: Record<string, Record<Term, number>> = {};
  for (const r of runners) factorsNum[r.key] = Object.fromEntries(TERMS.map((t) => [t, 0])) as Record<Term, number>;
  const byLga: Record<LgaId, { w: string; t: number }> = {};
  const byStateMap: Record<StateId, ContestResultState> = {};
  let totalVotes = 0;
  for (const b of blocs) {
    registered += b.registered;
    let w = runners[0].key, wv = -1, bt = 0;
    for (const r of runners) {
      votes[r.key] += b.votes[r.key];
      bt += b.votes[r.key];
      if (b.votes[r.key] > wv) { wv = b.votes[r.key]; w = r.key; }
      for (const t of TERMS) factorsNum[r.key][t] += b.terms[r.key][t] * Math.max(1, b.votes[r.key]);
    }
    totalVotes += bt;
    byLga[b.lgaId] = { w, t: Math.round(b.turnout * 1000) / 1000 };
    const ss = (byStateMap[b.stateId] ??= { stateId: b.stateId, turnout: 0, votes: Object.fromEntries(runners.map((r) => [r.key, 0])), winnerKey: runners[0].key, registered: 0 });
    ss.registered += b.registered;
    for (const r of runners) ss.votes[r.key] += b.votes[r.key];
  }
  const byState = Object.values(byStateMap).map((s) => {
    const tot = Object.values(s.votes).reduce((a, b) => a + b, 0);
    s.turnout = Math.round((tot / (s.registered || 1)) * 1000) / 1000;
    s.winnerKey = Object.entries(s.votes).sort((a, b) => b[1] - a[1])[0][0];
    return s;
  });
  const shares: Record<string, number> = {};
  for (const r of runners) shares[r.key] = totalVotes ? votes[r.key] / totalVotes : 0;
  const ranked = [...runners].sort((a, b) => votes[b.key] - votes[a.key]);
  const winner = ranked[0];
  let needsRunoff = false;
  let spread: ContestResult["spread"];
  let finalists: [string, string] | undefined;

  if (ctx.round === 1 && office === "president") {
    const need = rule.presidential.requiredStates;
    const states36 = byState.filter((s) => s.stateId !== "NG-FC");
    const fct = byState.find((s) => s.stateId === "NG-FC");
    const unitsOf = (key: string) => states36.filter((s) => s.votes[key] / (Object.values(s.votes).reduce((a, b) => a + b, 0) || 1) >= rule.presidential.minUnitShare).length;
    const fctOk = (key: string) => !rule.presidential.fctRequired || (fct ? fct.votes[key] / (Object.values(fct.votes).reduce((a, b) => a + b, 0) || 1) >= rule.presidential.minUnitShare : false);
    const met = unitsOf(winner.key);
    const ok = met >= need && fctOk(winner.key);
    spread = { required: `At least ${Math.round(rule.presidential.minUnitShare * 100)}% of votes in at least ${need} of 36 states${rule.presidential.fctRequired ? " and the FCT" : ""}`, achieved: ok, unitsMet: met, unitsNeeded: need, note: ok ? "Constitutional spread requirement met." : "The leading candidate did not meet the spread requirement." };
    if (!ok && ranked.length > 1) needsRunoff = true;
  } else if (ctx.round === 1 && office === "governor" && ctx.seatStateId) {
    const lgasN = blocs.length;
    const need = Math.ceil(lgasN * rule.governorship.requiredLgaFraction);
    const met = blocs.filter((b) => b.votes[winner.key] / (Object.values(b.votes).reduce((a, c) => a + c, 0) || 1) >= rule.governorship.minUnitShare).length;
    const ok = met >= need;
    spread = { required: `At least ${Math.round(rule.governorship.minUnitShare * 100)}% of votes in at least two-thirds of the state's LGAs (${need} of ${lgasN})`, achieved: ok, unitsMet: met, unitsNeeded: need, note: ok ? "Spread requirement met." : "The leading candidate did not meet the LGA spread requirement." };
    if (!ok && ranked.length > 1) needsRunoff = true;
  }
  if (needsRunoff) {
    // second finalist: the runner-up with the most unit wins among the others
    const winsOf = (key: string) => (office === "president" ? byState.filter((s) => s.winnerKey === key).length : blocs.filter((b) => Object.entries(b.votes).sort((a, c) => c[1] - a[1])[0][0] === key).length);
    const others = ranked.slice(1);
    const second = [...others].sort((a, b) => winsOf(b.key) - winsOf(a.key) || votes[b.key] - votes[a.key])[0];
    // finalists recorded in notes; winner placeholder is the leader until the runoff
    dayEvents = [...dayEvents];
    (spread as NonNullable<typeof spread>).note += ` A runoff between ${winner.name} (${partyAbbrOf(state, winner.partyId)}) and ${second.name} (${partyAbbrOf(state, second.partyId)}) is required.`;
    finalists = [winner.key, second.key];
  }

  const factors: Record<string, Record<string, number>> = {};
  for (const r of runners) {
    factors[r.key] = {};
    const denom = Math.max(1, votes[r.key]);
    for (const t of TERMS) factors[r.key][t] = Math.round((factorsNum[r.key][t] / denom) * 100) / 100;
  }
  const notes = localIssueNotes(state, blocs);
  return {
    winnerKey: winner.key, winnerPartyId: winner.partyId, round: ctx.round, totalVotes, registered, turnout: registered ? totalVotes / registered : 0,
    votes, shares, byState: ctx.seatLgaIds.length > 30 ? byState : byState, byLga, spread, needsRunoff, finalists, factors, notes, electionDayEvents: dayEvents,
  };
}

function partyAbbrOf(state: GameState, id: PartyId): string {
  return PARTY_BY_ID[id]?.abbr ?? state.customParties[id]?.abbr ?? id;
}

function localIssueNotes(state: GameState, blocs: BlocResult[]): string[] {
  const sums: Record<Issue, number> = Object.fromEntries(ISSUES.map((i) => [i, 0])) as Record<Issue, number>;
  let w = 0;
  for (const b of blocs) {
    const l = state.lgas[b.lgaId];
    w += b.registered;
    for (const i of ISSUES) sums[i] += l.salience[i] * b.registered;
  }
  const top = (Object.entries(sums) as [Issue, number][]).map(([i, v]) => [i, v / (w || 1)] as const).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return top.map(([i]) => i);
}
