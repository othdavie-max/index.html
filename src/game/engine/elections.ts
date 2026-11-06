/**
 * Election scheduling and lifecycle. Per seat: window → primaries → nominations → campaign → voting (→ runoff) →
 * inauguration. Winners are decided ONLY by electionModel.runContest from simulated conditions.
 */
import type { GameState, Contest, Seat, Character, CandidateRecord, PartyId, Aspirant, ContestResult } from "./types";
import type { OfficeId } from "../data/rules";
import { OFFICE_ORDER } from "../data/rules";
import { runContest, type Runner, type ModelContext } from "./electionModel";
import { subRng, clamp, clamp100, type Rng } from "./rng";
import { ruleOf } from "./world";
import { makePolitician, addRecord } from "./characters";
import { aiEligible } from "./eligibility";
import { pushNews, notify, careerLog } from "./news";
import { partyDefOf, activeParties, priceLevel } from "./queries";
import { dateOf, ageAt } from "./calendar";
import { stateName } from "./admin";
import { networkStrength } from "./relationships";
import { vacateSeat } from "./politics";
import { logPlayerElection, playerRunner, playerPrimaryScore, onPlayerPrimaryResolved, onPlayerContestResult, enterOfficeAsPlayer } from "./campaign";

export const contestIdFor = (seat: Seat, month = seat.nextElection) => `C:${month}:${seat.id}`;

const RANK: Record<OfficeId, number> = { councillor: 0, lg_chair: 1, state_assembly: 2, reps: 3, senate: 4, governor: 5, president: 6 };

function seedOf(state: GameState) { return state.meta.seed; }

// ---------------------------------------------------------------- scheduling
export function processElections(state: GameState): void {
  const rule = ruleOf(state);
  const m = state.clock.monthIndex;
  const tl = rule.timeline;

  // 1. create contests whose window has opened (highest office first so they claim aspirants first)
  const seats = Object.values(state.seats).sort((a, b) => RANK[b.office] - RANK[a.office]);
  const due = seats.filter((s) => s.nextElection - tl.aspirantWindowOpens <= m && !state.contests[contestIdFor(s)] && s.nextElection >= m - 1);
  if (due.length) {
    const idx = buildIndex(state);
    for (const s of due) createContest(state, s, idx);
  }

  // 2. advance phases
  for (const c of Object.values(state.contests)) {
    if (c.phase === "done") continue;
    const E = c.electionMonth;
    if (c.phase === "window" && m >= E - tl.primaryMonth) runPrimaries(state, c);
    if (c.phase === "primaries" && m >= E - tl.nominationDeadline) nominate(state, c);
    if (c.phase === "nominated" && m >= E - tl.campaignStarts) startCampaign(state, c);
    if ((c.phase === "campaign" || c.phase === "nominated") && m >= E) holdElection(state, c, 1);
    if (c.phase === "runoff" && c.runoffMonth !== undefined && m >= c.runoffMonth) holdElection(state, c, 2);
  }

  // 3. inaugurations
  processInaugurations(state);
  // 4. housekeeping
  if (m % 12 === 0) prune(state);
}

// ---------------------------------------------------------------- index of AI politicians
interface Index { byStateParty: Map<string, Character[]>; free: Map<string, Character[]>; national: Character[] }
function buildIndex(state: GameState): Index {
  const byStateParty = new Map<string, Character[]>();
  const free = new Map<string, Character[]>();
  const national: Character[] = [];
  for (const c of Object.values(state.chars)) {
    if (c.kind !== "politician" || c.status !== "active" || !c.partyId) continue;
    const k = `${c.stateId}|${c.partyId}`;
    if (c.seatId) {
      (byStateParty.get(k) ?? byStateParty.set(k, []).get(k)!).push(c);
      national.push(c);
    } else (free.get(k) ?? free.set(k, []).get(k)!).push(c);
  }
  return { byStateParty, free, national };
}

function fieldProb(state: GameState, partyId: PartyId, office: OfficeId): number {
  if (office === "president" || office === "governor") return 1;
  const org = state.parties[partyId]?.orgStrength ?? 20;
  return clamp(0.3 + org / 110, 0.45, 1);
}

function createContest(state: GameState, seat: Seat, idx: Index): void {
  const rule = ruleOf(state);
  const id = contestIdFor(seat);
  const rng = subRng(seedOf(state), "contest", id);
  const parties = activeParties(state);
  const c: Contest = {
    id, office: seat.office, seatId: seat.id, label: seat.label, stateId: seat.stateId, electionMonth: seat.nextElection, phase: "window",
    aspirants: {}, nominees: {}, incumbentSeeking: false, primaryNotes: {},
  };
  state.contests[id] = c;
  const holder = seat.holderId ? state.chars[seat.holderId] : null;
  const playerHolds = state.player.politics.seatId === seat.id;
  const officeRule = rule.offices[seat.office];
  const E = c.electionMonth;

  for (const pid of parties) {
    if (!rng.chance(fieldProb(state, pid, seat.office))) continue;
    const list: Aspirant[] = [];
    const pushChar = (ch: Character) => {
      if (ch.runningIn && ch.runningIn !== id) return;
      if (list.some((a) => a.charId === ch.id)) return;
      ch.runningIn = id;
      list.push({ charId: ch.id, isPlayer: false, partyId: pid });
    };
    // incumbent
    if (holder && holder.partyId === pid && !playerHolds) {
      const age = dateOf(E, rule.startYear, rule.startMonth).year - holder.birthYear;
      const limited = officeRule.termLimit !== null && seat.termsServed >= officeRule.termLimit;
      const willing = 0.82 + (holder.attrs.ambition - 50) / 400 - (age > 68 ? 0.3 : 0) - (holder.evidence > 40 ? 0.2 : 0);
      if (!limited && aiEligible(state, holder, seat.office, E, seat) && (!holder.runningIn || holder.runningIn === id) && rng.chance(willing)) {
        pushChar(holder);
        c.incumbentSeeking = true;
      }
    }
    // feeders: lower-ranked office holders of the same party seeking promotion
    const feeders = feederPool(state, idx, seat, pid);
    for (const f of feeders) {
      if (list.length >= 4) break;
      if (!aiEligible(state, f, seat.office, E)) continue;
      const fs = f.seatId ? state.seats[f.seatId] : null;
      if (fs && RANK[fs.office] >= RANK[seat.office]) continue;
      const p = clamp((f.attrs.ambition - 40) / 400 + (f.goal === seat.office ? 0.18 : 0) + f.attrs.popularity / 1500, 0, 0.3);
      if (rng.chance(p)) pushChar(f);
    }
    // fresh blood so every field has a candidate
    if (list.length === 0 || (seat.office === "president" && list.length < 2)) {
      const home = seat.lgaIds.length ? seat.lgaIds[Math.floor(rng.next() * seat.lgaIds.length)] : Object.keys(state.lgas)[Math.floor(rng.next() * 774)];
      const sid = seat.stateId ?? home.split("-").slice(0, 2).join("-");
      const profile: OfficeId | "party" = seat.office === "president" ? "president" : seat.office;
      const ch = makePolitician(state, rng, rule.startYear, { stateId: sid, lgaId: home, partyId: pid, profile, goal: seat.office });
      ch.attrs.ambition = Math.max(ch.attrs.ambition, 60);
      pushChar(ch);
    }
    if (list.length) c.aspirants[pid] = list;
  }
  void networkStrength;
}

function feederPool(state: GameState, idx: Index, seat: Seat, partyId: PartyId): Character[] {
  const out: Character[] = [];
  if (seat.office === "president") {
    for (const ch of idx.national) if (ch.partyId === partyId && ch.seatId && ["governor", "senate"].includes(state.seats[ch.seatId].office)) out.push(ch);
    for (const ch of Object.values(state.chars)) if (ch.partyId === partyId && ch.role?.startsWith("Minister") && ch.status === "active") out.push(ch);
    return out.sort((a, b) => b.attrs.popularity + b.attrs.connections - (a.attrs.popularity + a.attrs.connections)).slice(0, 12);
  }
  if (!seat.stateId) return out;
  const k = `${seat.stateId}|${partyId}`;
  const mine = idx.byStateParty.get(k) ?? [];
  for (const ch of mine) {
    const s = ch.seatId ? state.seats[ch.seatId] : null;
    if (!s || RANK[s.office] >= RANK[seat.office]) continue;
    if (seat.office === "lg_chair" || seat.office === "state_assembly" || seat.office === "reps") {
      if (!s.lgaIds.some((l) => seat.lgaIds.includes(l)) && seat.office !== "reps") continue;
    }
    out.push(ch);
  }
  for (const ch of idx.free.get(k) ?? []) out.push(ch);
  return out.sort((a, b) => b.attrs.popularity - a.attrs.popularity).slice(0, 8);
}

// ---------------------------------------------------------------- primaries
function primaryScore(state: GameState, ch: Character, c: Contest, rng: Rng): number {
  const seat = state.seats[c.seatId];
  const inc = seat.holderId === ch.id ? 12 : 0;
  const rank = state.chars[ch.id]?.seatId ? 4 : 0;
  return 0.5 * ch.attrs.popularity + 0.35 * ch.attrs.connections + 11 * Math.log10(Math.max(1, ch.wealthM)) + inc + rank + rng.normal(0, 8);
}

function recordFor(state: GameState, ch: Character): CandidateRecord {
  return { key: ch.id, charId: ch.id, isPlayer: false, name: ch.name, partyId: ch.partyId!, homeLgaId: ch.lgaId, homeStateId: ch.stateId, incumbent: false };
}

function runPrimaries(state: GameState, c: Contest): void {
  const rng = subRng(seedOf(state), "primary", c.id);
  const losers: { ch: Character; party: PartyId; score: number }[] = [];
  for (const [pid, list] of Object.entries(c.aspirants)) {
    const scored = list.map((a) => ({
      a, score: a.isPlayer ? playerPrimaryScore(state, c) : primaryScore(state, state.chars[a.charId!], c, rng),
    }));
    const def = partyDefOf(state, pid);
    let winner = scored[0];
    if (scored.length > 1) {
      const sorted = [...scored].sort((x, y) => y.score - x.score);
      const gap = sorted[0].score - (sorted[1]?.score ?? 0);
      if (def?.primaryStyle === "consensus-prone" && gap > 14 && !sorted.some((s) => s.a.isPlayer)) winner = sorted[0];
      else winner = rng.weighted(scored, (s) => Math.exp(s.score / 9));
    }
    for (const s of scored) {
      if (s === winner) continue;
      if (s.a.isPlayer) onPlayerPrimaryResolved(state, c, false, s.score, winner.score, winner.a.charId ? state.chars[winner.a.charId].name : "a rival");
      else if (s.a.charId) {
        const ch = state.chars[s.a.charId];
        ch.runningIn = undefined;
        losers.push({ ch, party: pid, score: s.score });
        addRecord(ch, state.clock.monthIndex, `Lost the ${def?.abbr} ticket for ${c.label}.`);
      }
    }
    if (winner.a.isPlayer) {
      onPlayerPrimaryResolved(state, c, true, winner.score, scored.filter((x) => x !== winner).reduce((mx, x) => Math.max(mx, x.score), 0), "rivals");
      c.nominees[pid] = { key: "player", charId: null, isPlayer: true, name: state.player.name, partyId: pid, homeLgaId: state.player.residenceLgaId, homeStateId: state.player.residenceStateId, incumbent: state.player.politics.seatId === c.seatId };
    } else {
      const ch = state.chars[winner.a.charId!];
      const rec = recordFor(state, ch);
      rec.incumbent = state.seats[c.seatId].holderId === ch.id;
      c.nominees[pid] = rec;
    }
    c.primaryNotes[pid] = scored.length > 1 ? `${scored.length} aspirants contested; ${def?.primaryStyle === "direct" ? "direct primary" : def?.primaryStyle === "consensus-prone" ? "consensus-leaning process" : "delegates' congress"}.` : "Sole aspirant — affirmed.";
    if (c.office === "president" || c.office === "governor") {
      const nm = c.nominees[pid].name;
      pushNews(state, { headline: `${nm} wins ${def?.abbr} ticket for ${c.office === "president" ? "President" : `Governor of ${stateName(c.stateId!)}`}`, topic: c.office === "president" ? "party" : "party", importance: c.office === "president" ? 3 : 2, stateId: c.stateId, partyId: pid, source: `primary:${c.id}:${pid}`, personal: false });
    }
  }
  // defection season: bitter losers with ambition & money may defect to a party with a weaker ticket
  if (c.office !== "lg_chair" && c.office !== "state_assembly") {
    for (const l of losers) {
      if (l.ch.attrs.ambition < 62 || l.ch.wealthM < 200 || !rng.chance(0.22)) continue;
      const candidates = Object.keys(c.nominees).filter((p) => p !== l.party && c.nominees[p] && !c.nominees[p].isPlayer && !c.nominees[p].incumbent);
      if (!candidates.length) continue;
      const target = rng.pick(candidates);
      const old = c.nominees[target];
      const oldCh = old.charId ? state.chars[old.charId] : null;
      if (oldCh && oldCh.attrs.popularity + oldCh.attrs.connections >= l.ch.attrs.popularity + l.ch.attrs.connections) continue;
      const from = partyDefOf(state, l.party)?.abbr, to = partyDefOf(state, target)?.abbr;
      l.ch.partyId = target;
      l.ch.lastDefection = state.clock.monthIndex;
      l.ch.runningIn = c.id;
      if (oldCh) { oldCh.runningIn = undefined; addRecord(oldCh, state.clock.monthIndex, `Stood aside for ${l.ch.name}.`); }
      c.nominees[target] = { ...recordFor(state, l.ch), partyId: target };
      addRecord(l.ch, state.clock.monthIndex, `Defected from ${from} to ${to}.`);
      pushNews(state, { headline: `${l.ch.name} defects from ${from} to ${to}, takes the ticket for ${c.label}`, topic: "party", importance: c.office === "president" || c.office === "governor" ? 3 : 2, stateId: c.stateId, partyId: target, source: `defect:${c.id}:${l.ch.id}` });
    }
  }
  c.phase = "primaries";
  for (const a of Object.values(c.aspirants)) for (const x of a) if (x.charId && !Object.values(c.nominees).some((n) => n.charId === x.charId)) state.chars[x.charId].runningIn = undefined;
}

function nominate(state: GameState, c: Contest): void {
  c.phase = "nominated";
  // the player's nomination is re-checked at the filing deadline (age, party, conviction…)
  const pc = state.player.politics.candidacies.find((x) => x.contestId === c.id && x.stage === "nominee");
  if (pc) {
    const age = ageAt(state.player.birthMonth, c.electionMonth);
    const o = ruleOf(state).offices[c.office];
    if (age < o.minAge || !state.player.politics.membership) {
      pc.stage = "disqualified";
      delete c.nominees[Object.keys(c.nominees).find((k) => c.nominees[k].isPlayer) ?? ""];
      notify(state, "Your nomination was rejected at the filing deadline: you no longer meet the eligibility rules.", "bad");
    }
  }
}

function startCampaign(state: GameState, c: Contest): void {
  c.phase = "campaign";
  if (Object.values(c.nominees).some((n) => n.isPlayer)) {
    notify(state, `The campaign period for ${c.label} has begun. Plan your campaign budget.`, "info", "elections");
  }
}

// ---------------------------------------------------------------- running mates & AI budgets
function aiRunner(state: GameState, c: Contest, rec: CandidateRecord, rng: Rng): Runner {
  const ch = state.chars[rec.charId!];
  const rule = ruleOf(state).offices[c.office];
  const party = state.parties[rec.partyId];
  const wealthTerm = Math.min(0.25, Math.log10(Math.max(1, ch.wealthM)) / 20);
  const ratio = clamp(0.1 + 0.4 * ((party?.orgStrength ?? 30) / 100) + wealthTerm + (rec.incumbent ? 0.08 : 0) + rng.normal(0, 0.05), 0.02, 0.95);
  const caseStage = (state.flags[`aicase:${ch.id}`] as number | undefined) ?? 0;
  void rule;
  const mate = c.office === "president" ? rng.pick(Object.keys(state.states).filter((s) => s !== ch.stateId)) : null;
  return {
    key: rec.key, partyId: rec.partyId, name: rec.name, isPlayer: false, charId: ch.id, appeal: ch.attrs.popularity, charisma: ch.attrs.charisma,
    integrity: ch.attrs.integrity, organisation: clamp100((party?.orgStrength ?? 30) * 0.6 + ch.attrs.connections * 0.4), momentum: rng.normal(0, 0.15),
    scandal: caseStage * 14, budgetRatio: ratio, incumbent: rec.incumbent, homeLgaId: ch.lgaId, homeStateId: ch.stateId, runningMateStateId: mate,
  };
}

function runnersFor(state: GameState, c: Contest, rng: Rng): Runner[] {
  const out: Runner[] = [];
  for (const rec of Object.values(c.nominees)) {
    if (rec.isPlayer) {
      const r = playerRunner(state, c);
      if (r) out.push(r);
    } else if (rec.charId && state.chars[rec.charId]) out.push(aiRunner(state, c, rec, rng));
  }
  return out;
}

// ---------------------------------------------------------------- internal poll
/** Dry run of the voting model for a contest in progress (does not change the game). Uses its own noise stream. */
export function pollContest(state: GameState, c: Contest): { key: string; name: string; partyId: PartyId; share: number; isPlayer: boolean }[] {
  if (c.phase === "window" || c.phase === "primaries") return [];
  const rule = ruleOf(state);
  const seat = state.seats[c.seatId];
  const rng = subRng(seedOf(state), "poll", c.id, state.clock.monthIndex);
  const runners = runnersFor(state, c, rng);
  if (runners.length === 0) return [];
  const lgas = c.office === "president" ? Object.keys(state.lgas) : c.office === "governor" ? state.states[seat.stateId!].lgaIds : seat.lgaIds;
  const ctx: ModelContext = { state, rule, office: c.office, seatLgaIds: lgas, lgaWeights: c.office === "president" || c.office === "governor" ? lgas.map(() => 1) : seat.lgaWeights, seatStateId: seat.stateId, electionMonth: c.electionMonth, round: 1, rngSeedKey: `${c.id}|poll${state.clock.monthIndex}` };
  const res = runContest(ctx, runners);
  return runners.map((r) => ({ key: r.key, name: r.name, partyId: r.partyId, share: res.shares[r.key] ?? 0, isPlayer: r.isPlayer })).sort((a, b) => b.share - a.share);
}

// ---------------------------------------------------------------- voting
function holdElection(state: GameState, c: Contest, round: 1 | 2): void {
  const rule = ruleOf(state);
  const seat = state.seats[c.seatId];
  const rng = subRng(seedOf(state), "run", c.id, round);
  let runners = runnersFor(state, c, rng);
  if (runners.length === 0) {
    c.phase = "done";
    return;
  }
  const ctx: ModelContext = {
    state, rule, office: c.office, seatLgaIds: c.office === "president" ? Object.keys(state.lgas) : seat.lgaIds,
    lgaWeights: c.office === "president" ? Object.keys(state.lgas).map(() => 1) : seat.lgaWeights, seatStateId: seat.stateId, electionMonth: c.electionMonth, round,
    rngSeedKey: `${c.id}`,
  };
  if (c.office === "governor") { ctx.seatLgaIds = state.states[seat.stateId!].lgaIds; ctx.lgaWeights = ctx.seatLgaIds.map(() => 1); }
  if (round === 2 && c.result?.finalists) {
    const [a, b] = c.result.finalists;
    const eliminated = runners.filter((r) => r.key !== a && r.key !== b).map((r) => {
      // eliminated parties endorse by closeness; the player's party endorses nobody automatically
      const pick = rng.chance(0.5) ? a : b;
      return { partyId: r.partyId, endorses: r.isPlayer ? null : pick };
    });
    runners = runners.filter((r) => r.key === a || r.key === b);
    ctx.eliminated = eliminated;
    c.firstRound = c.result;
  }
  const res = runContest(ctx, runners);
  if (round === 1 && res.needsRunoff) {
    c.result = res;
    c.phase = "runoff";
    c.runoffMonth = c.electionMonth + 1;
    const names = (res.finalists ?? []).map((k) => runners.find((r) => r.key === k)?.name);
    pushNews(state, { headline: `${c.office === "president" ? "Presidential" : stateName(c.stateId!) + " governorship"} election heads to a runoff`, body: `${names.join(" and ")} advance after no candidate met the constitutional spread requirement.`, topic: "elections", importance: 3, stateId: c.stateId, source: `election:${c.id}:r1` });
    onPlayerContestResult(state, c, res, runners, false);
    if (c.office === "president" || c.stateId === state.player.residenceStateId || state.player.politics.candidacies.some((x) => x.contestId === c.id)) notify(state, `${c.label}: a runoff is required.`, "info");
    return;
  }
  finalize(state, c, res, runners, round);
}

function finalize(state: GameState, c: Contest, res: ContestResult, runners: Runner[], round: 1 | 2): void {
  // runoff: winner is whoever got more votes of the two
  if (round === 2) {
    const top = Object.entries(res.votes).sort((a, b) => b[1] - a[1])[0][0];
    res.winnerKey = top;
    res.winnerPartyId = runners.find((r) => r.key === top)!.partyId;
  }
  res.round = round;
  c.result = res;
  c.phase = "done";
  const seat = state.seats[c.seatId];
  const winner = runners.find((r) => r.key === res.winnerKey)!;
  const second = [...runners].filter((r) => r.key !== res.winnerKey).sort((a, b) => res.votes[b.key] - res.votes[a.key])[0];
  const margin = second ? (res.votes[res.winnerKey] - res.votes[second.key]) / Math.max(1, res.totalVotes) : 1;
  seat.lastResult = { month: c.electionMonth, winnerPartyId: res.winnerPartyId, margin, turnout: res.turnout };
  const notable = c.office !== "lg_chair" && c.office !== "state_assembly" && c.office !== "reps";
  if (notable || c.stateId === state.player.residenceStateId) state.electionLog.push({ month: state.clock.monthIndex, contestId: c.id, office: c.office, label: c.label, stateId: c.stateId, winnerPartyId: res.winnerPartyId, winnerName: winner.name, turnout: res.turnout, margin });
  if (state.electionLog.length > 3000) state.electionLog.splice(0, state.electionLog.length - 3000);
  // losers go back to the pool
  for (const r of runners) {
    if (r.charId) {
      const ch = state.chars[r.charId];
      ch.runningIn = undefined;
      if (r.key !== res.winnerKey) addRecord(ch, state.clock.monthIndex, `Lost the ${c.label} election.`);
    }
  }
  const abbr = partyDefOf(state, res.winnerPartyId)?.abbr ?? "";
  if (c.office === "president") {
    const byState: Record<string, string> = {};
    for (const s of res.byState ?? []) byState[s.stateId] = runners.find((r) => r.key === s.winnerKey)?.partyId ?? "";
    const byLga: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.byLga ?? {})) byLga[k] = runners.find((r) => r.key === v.w)?.partyId ?? "";
    const turnout: Record<string, number> = {};
    for (const s of res.byState ?? []) turnout[s.stateId] = s.turnout;
    state.lastPresidential = { month: c.electionMonth, winnerPartyId: res.winnerPartyId, byState, byLga, turnout };
  }
  if (c.office === "president" || c.office === "governor" || c.stateId === state.player.residenceStateId || state.player.politics.candidacies.some((x) => x.contestId === c.id)) {
    pushNews(state, {
      headline: c.office === "president" ? `${winner.name} (${abbr}) wins the presidency` : c.office === "governor" ? `${winner.name} (${abbr}) wins ${stateName(c.stateId!)} governorship` : `${winner.name} (${abbr}) wins ${c.label}`,
      body: `Turnout ${(res.turnout * 100).toFixed(1)}%. Margin ${(margin * 100).toFixed(1)} points.`, topic: "elections", importance: c.office === "president" ? 3 : c.office === "governor" ? 3 : 1, stateId: c.stateId, partyId: res.winnerPartyId, source: `election:${c.id}`,
      personal: state.player.politics.candidacies.some((x) => x.contestId === c.id) || c.stateId === state.player.residenceStateId,
    });
  }
  onPlayerContestResult(state, c, res, runners, true);
  // party momentum reacts to national outcomes
  if (c.office === "president") {
    for (const p of Object.values(state.parties)) p.momentum = clamp(p.momentum * 0.4 + (p.id === res.winnerPartyId ? 0.1 : -0.02), -1, 1);
  }
}

// ---------------------------------------------------------------- inauguration
function processInaugurations(state: GameState): void {
  const m = state.clock.monthIndex;
  const rule = ruleOf(state);
  for (const seat of Object.values(state.seats)) {
    if (seat.termEnd !== m) continue;
    const cid = contestIdFor(seat);
    const c = state.contests[cid];
    const o = rule.offices[seat.office];
    const key = `inaug:${seat.id}:${m}`;
    if (state.processed[key]) continue;
    state.processed[key] = true;
    const advance = () => {
      seat.nextElection += o.termMonths;
      seat.termEnd += o.termMonths;
      if (seat.office === "lg_chair" && seat.stateId) state.states[seat.stateId].lgNextElection = seat.nextElection;
    };
    if (!c?.result || c.phase !== "done") {
      // no completed election: the incumbent continues (a safety net, e.g. empty field)
      advance();
      continue;
    }
    const res = c.result;
    const wrec = c.nominees[res.winnerPartyId];
    const prev = seat.holderId ? state.chars[seat.holderId] : null;
    const prevWasPlayer = state.player.politics.seatId === seat.id;
    if (wrec?.isPlayer) {
      if (prev && !prevWasPlayer) { prev.seatId = null; addRecord(prev, m, `Left office as ${seat.label}.`); }
      enterOfficeAsPlayer(state, seat, c);
    } else if (wrec?.charId) {
      const w = state.chars[wrec.charId];
      if (!w) { advance(); continue; }
      if (prevWasPlayer) {
        // the player lost / did not win re-election: leaves office
        endPlayerTerm(state, seat, "lost the election or term ended");
      }
      if (w.seatId && w.seatId !== seat.id) vacateSeat(state, w.seatId, `moved to ${seat.label}`);
      if (prev && prev.id !== w.id) { prev.seatId = null; if (prev.status === "active" && ageAtYear(state, prev) > 66) prev.status = "retired"; }
      seat.termsServed = prev && prev.id === w.id ? seat.termsServed + 1 : 1;
      seat.holderId = w.id;
      seat.partyId = w.partyId;
      seat.termStart = m;
      w.seatId = seat.id;
      w.role = seat.office === "governor" ? "Governor" : seat.office === "president" ? "President" : w.role;
      addRecord(w, m, `Sworn in: ${seat.label}.`);
      if (seat.office === "president" || seat.office === "governor") {
        pushNews(state, { headline: `${w.name} sworn in as ${seat.office === "president" ? "President" : `Governor of ${stateName(seat.stateId!)}`}`, topic: "national", importance: seat.office === "president" ? 3 : 2, stateId: seat.stateId, partyId: w.partyId, source: `inaug:${seat.id}:${m}` });
      }
    }
    if (seat.office === "president") for (const p of Object.values(state.parties)) p.inPower = p.id === seat.partyId;
    advance();
  }
}

function ageAtYear(state: GameState, ch: Character) {
  const rule = ruleOf(state);
  return dateOf(state.clock.monthIndex, rule.startYear, rule.startMonth).year - ch.birthYear;
}

/** Player leaves an elected seat at the end of a term. */
export function endPlayerTerm(state: GameState, seat: Seat, reason: string): void {
  const p = state.player;
  if (p.politics.seatId !== seat.id) return;
  const open = p.politics.pastOffices.find((o) => o.to === null);
  if (open) { open.to = state.clock.monthIndex; open.reason = reason; }
  p.politics.seatId = null;
  p.occupation = { kind: "unemployed", jobId: null, title: "Former office-holder", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 0 };
  careerLog(state, `Left office as ${seat.label}.`);
  notify(state, `Your term as ${seat.label} has ended.`, "info");
  if (seat.office === "president") {
    state.gameOver = null;
  }
}

function prune(state: GameState): void {
  const keep = new Set<string>(Object.keys(state.player.relationships));
  for (const c of Object.values(state.chars)) if (c.seatId || c.runningIn) keep.add(c.id);
  for (const c of Object.values(state.contests)) if (c.phase !== "done" || c.electionMonth === state.seats[c.seatId]?.nextElection) for (const n of Object.values(c.nominees)) if (n.charId) keep.add(n.charId);
  for (const a of state.government.appointees) keep.add(a.id);
  for (const p of Object.values(state.parties)) { if (p.chairId) keep.add(p.chairId); if (p.secretaryId) keep.add(p.secretaryId); }
  for (const f of state.player.family.relatives) keep.add(f.id);
  // the free pool of ex-office-holders and aspirants is capped to the most prominent
  const pool = Object.values(state.chars).filter((c) => !keep.has(c.id));
  pool.sort((a, b) => b.attrs.popularity + b.attrs.connections - (a.attrs.popularity + a.attrs.connections));
  const BENCH = 500;
  pool.forEach((c, i) => {
    if (c.status !== "active" || i >= BENCH) delete state.chars[c.id];
  });
  // keep the most recent finished contest per seat (two for the big offices); older ones are summarised by seat.lastResult / electionLog
  const bySeat: Record<string, Contest[]> = {};
  for (const c of Object.values(state.contests)) (bySeat[c.seatId] ??= []).push(c);
  for (const list of Object.values(bySeat)) {
    list.sort((a, b) => b.electionMonth - a.electionMonth);
    const keepN = list[0] && (list[0].office === "president" || list[0].office === "governor" || list[0].office === "senate") ? 2 : 1;
    for (const old of list.slice(keepN)) if (old.phase === "done") delete state.contests[old.id];
  }
  const keys = Object.keys(state.processed);
  if (keys.length > 40000) for (const k of keys.slice(0, keys.length - 30000)) delete state.processed[k];
  void priceLevel;
}

export { OFFICE_ORDER };
void logPlayerElection;
