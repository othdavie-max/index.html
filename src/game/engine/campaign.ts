/**
 * The player's side of elections: declaring candidacy, primaries, campaign budgets and effects, fundraising,
 * lawful vs unlawful campaign finance, debates, and entering office. Results come from the election engine.
 */
import type { GameState, Contest, Seat, ContestResult, Candidacy, CampaignActivity, CampaignState } from "./types";
import type { OfficeId } from "../data/rules";
import type { Runner } from "./electionModel";
import { ruleOf } from "./world";
import { checkPlayerEligibility, type Eligibility } from "./eligibility";
import { debit, canAfford, credit, creditCampaign, debitCampaign, liquid } from "./finance";
import { subRng, clamp, clamp100 } from "./rng";
import { pushNews, notify, careerLog } from "./news";
import { partyDefOf, priceLevel, holderOf } from "./queries";
import { networkStrength, affinityWith } from "./relationships";
import { startScheme } from "./corruption";
import { vacateSeat } from "./politics";
import { contestIdFor } from "./elections";
import { TERM_LABEL, TERMS } from "./electionModel";
import { stateName } from "./admin";
import { once } from "./ids";
import { PARTY_BY_ID } from "../data/parties";

export type Result = { ok: boolean; message: string };
const fail = (message: string): Result => ({ ok: false, message });
const good = (message: string): Result => ({ ok: true, message });

export const ACTIVITIES: { id: CampaignActivity; label: string; blurb: string }[] = [
  { id: "rallies", label: "Rallies & town halls", blurb: "Raise name recognition and enthusiasm. Expensive; charisma matters." },
  { id: "media", label: "Radio, TV & press", blurb: "Reach whole states cheaply per voter. Builds recognition beyond your home area." },
  { id: "grassroots", label: "Grassroots canvassing", blurb: "Builds organisation — volunteers and polling-unit agents. Leadership matters." },
  { id: "logistics", label: "Logistics & agents", blurb: "Keeps your organisation intact on election day." },
  { id: "digital", label: "Digital campaign", blurb: "Strong with young and urban voters; volatile momentum." },
];

export function emptyCampaign(): CampaignState {
  return { activities: { rallies: 0, media: 0, grassroots: 0, logistics: 0, digital: 0 }, spentTotal: 0, organisation: 15, momentum: 0, rallies: 0, debatePerformance: null, endorsements: [], unlawfulSpending: 0, concealedDonations: 0, pendingMonthlySpend: 0 };
}

export function candidacyOf(state: GameState, contestId?: string): Candidacy | null {
  return state.player.politics.candidacies.find((c) => (contestId ? c.contestId === contestId : c.stage === "aspirant" || c.stage === "nominee")) ?? null;
}
export function activeCandidacy(state: GameState): Candidacy | null {
  return state.player.politics.candidacies.find((c) => c.stage === "aspirant" || c.stage === "nominee") ?? null;
}

// ---------------------------------------------------------------- races available to the player
export interface RaceInfo {
  seat: Seat;
  contest: Contest | null;
  electionMonth: number;
  windowOpensIn: number;
  open: boolean;
  eligibility: Eligibility;
  fee: number;
  limit: number;
}
export function availableRaces(state: GameState, opts: { stateId?: string } = {}): RaceInfo[] {
  const rule = ruleOf(state);
  const p = state.player;
  const m = state.clock.monthIndex;
  const res: RaceInfo[] = [];
  const stateIds = [p.residenceStateId, p.birthStateId];
  const seats = Object.values(state.seats).filter((s) => {
    if (s.office === "president") return true;
    if (opts.stateId) return s.stateId === opts.stateId;
    return s.stateId !== null && stateIds.includes(s.stateId);
  });
  for (const s of seats) {
    const cid = contestIdFor(s);
    const contest = state.contests[cid] ?? null;
    const o = rule.offices[s.office];
    // seats the player lives near: their own LGA's chair, constituencies containing their LGA, their state's senate/gov, plus national
    if (s.office === "lg_chair" && !s.lgaIds.includes(p.residenceLgaId) && !s.lgaIds.includes(p.birthLgaId)) continue;
    if ((s.office === "reps" || s.office === "state_assembly") && !s.lgaIds.includes(p.residenceLgaId) && !s.lgaIds.includes(p.birthLgaId)) continue;
    const opensIn = Math.max(0, s.nextElection - rule.timeline.aspirantWindowOpens - m);
    const open = !!contest && contest.phase === "window";
    res.push({
      seat: s, contest, electionMonth: s.nextElection, windowOpensIn: opensIn, open, eligibility: checkPlayerEligibility(state, s.office, s.nextElection),
      fee: Math.round(o.nominationFee * priceLevel(state)), limit: o.campaignLimit,
    });
  }
  return res.sort((a, b) => a.electionMonth - b.electionMonth || ["lg_chair", "state_assembly", "reps", "senate", "governor", "president"].indexOf(a.seat.office) - ["lg_chair", "state_assembly", "reps", "senate", "governor", "president"].indexOf(b.seat.office));
}

// ---------------------------------------------------------------- declare / withdraw
export function declareCandidacy(state: GameState, seatId: string): Result {
  const p = state.player;
  const seat = state.seats[seatId];
  if (!seat) return fail("Unknown seat.");
  const contest = state.contests[contestIdFor(seat)];
  if (!contest || contest.phase !== "window") return fail("The aspirant window is not open for this race.");
  const elig = checkPlayerEligibility(state, seat.office, contest.electionMonth);
  if (!elig.eligible) return fail("You are not eligible: " + elig.checks.filter((c) => !c.ok).map((c) => c.text).join("; "));
  const m = p.politics.membership!;
  const o = ruleOf(state).offices[seat.office];
  const fee = Math.round(o.nominationFee * priceLevel(state));
  if (!canAfford(state, fee)) return fail(`The party's nomination form costs ₦${fee.toLocaleString()}.`);
  debit(state, "fees", fee, `${partyDefOf(state, m.partyId)?.abbr} nomination form: ${seat.label}`);
  const list = (contest.aspirants[m.partyId] ??= []);
  list.push({ charId: null, isPlayer: true, partyId: m.partyId });
  p.politics.candidacies.push({
    contestId: contest.id, office: seat.office, seatId: seat.id, stage: "aspirant", formPaid: true, campaign: emptyCampaign(), declaredMonth: state.clock.monthIndex,
    primarySpend: 0, delegatesBought: 0, debatePrepared: false,
  });
  careerLog(state, `Declared as an aspirant for ${seat.label}.`);
  pushNews(state, { headline: `${p.name} declares for ${seat.label}`, topic: "elections", importance: seat.office === "president" || seat.office === "governor" ? 3 : 1, stateId: seat.stateId, partyId: m.partyId, source: `declare:${contest.id}`, personal: true });
  return good(`You picked up the ${partyDefOf(state, m.partyId)?.abbr} form for ${seat.label}. Primaries are in ${Math.max(0, contest.electionMonth - ruleOf(state).timeline.primaryMonth - state.clock.monthIndex)} months.`);
}

export function withdrawCandidacy(state: GameState): Result {
  const cand = activeCandidacy(state);
  if (!cand) return fail("You are not a candidate.");
  const c = state.contests[cand.contestId];
  if (c) {
    for (const list of Object.values(c.aspirants)) {
      const i = list.findIndex((a) => a.isPlayer);
      if (i >= 0) list.splice(i, 1);
    }
    for (const [k, n] of Object.entries(c.nominees)) if (n.isPlayer) delete c.nominees[k];
  }
  cand.stage = "withdrawn";
  state.player.integrity.publicTrust = clamp100(state.player.integrity.publicTrust - 1);
  return good("You withdrew from the race.");
}

export function resignAppointment(state: GameState): Result {
  if (!state.player.politics.appointment) return fail("You hold no appointment.");
  careerLog(state, `Resigned as ${state.player.politics.appointment.label}.`);
  state.player.politics.appointment = null;
  return good("You resigned your appointment.");
}

// ---------------------------------------------------------------- primary
function fameWeights(office: OfficeId): [number, number, number] {
  switch (office) {
    case "councillor": case "lg_chair": return [0.85, 0.1, 0.05];
    case "state_assembly": case "reps": return [0.7, 0.25, 0.05];
    case "senate": return [0.45, 0.45, 0.1];
    case "governor": return [0.3, 0.6, 0.1];
    case "president": return [0.05, 0.3, 0.65];
  }
}
export function fameFor(state: GameState, office: OfficeId, lgaId: string, stateId: string): number {
  const [wl, ws, wn] = fameWeights(office);
  const f = state.player.fame;
  return clamp100((f.lgas[lgaId] ?? 0) * wl + (f.states[stateId] ?? 0) * ws + f.national * wn);
}
/** player's fame in their own jurisdiction — used for primaries and display */
export function localFame(state: GameState, office: OfficeId, seat: Seat): number {
  const p = state.player;
  const lga = seat.lgaIds.includes(p.residenceLgaId) ? p.residenceLgaId : seat.lgaIds[0] ?? p.residenceLgaId;
  const sid = seat.stateId ?? p.residenceStateId;
  return fameFor(state, office, lga, sid);
}

export function playerPrimaryBreakdown(state: GameState, c: Contest): { items: { label: string; value: number }[]; total: number } {
  const p = state.player;
  const seat = state.seats[c.seatId];
  const cand = candidacyOf(state, c.id);
  const m = p.politics.membership;
  const fame = localFame(state, c.office, seat);
  const items: { label: string; value: number }[] = [];
  items.push({ label: "Name recognition", value: 0.5 * fame });
  items.push({ label: "Reputation & appeal", value: 0.25 * p.attrs.reputation });
  items.push({ label: "Party standing", value: 0.3 * (m?.standing ?? 0) });
  items.push({ label: "Network & political capital", value: Math.min(30, networkStrength(state) * 6) + p.politics.capital * 0.2 });
  const party = Object.values(p.relationships).filter((r) => r.kind === "party").sort((a, b) => b.affinity - a.affinity).slice(0, 5);
  items.push({ label: "Standing with party officials", value: party.length ? (party.reduce((t, r) => t + r.affinity, 0) / party.length) * 0.3 : 0 });
  items.push({ label: "Wealth (log scale)", value: 6 * Math.log10(Math.max(1, (liquid(p.finances) + p.finances.campaignFund) / 1_000_000 + 1)) });
  if (m?.office) items.push({ label: `Party office (${m.office.post})`, value: { ward: 4, lga: 7, state: 10, national: 14 }[m.office.level] });
  if (cand) items.push({ label: "Delegate mobilisation (lawful)", value: Math.min(14, (cand.primarySpend / (ruleOf(state).offices[c.office].nominationFee * 2)) * 14) });
  if (cand && cand.delegatesBought > 0) items.push({ label: "Delegate inducements (unlawful)", value: Math.min(18, (cand.delegatesBought / (ruleOf(state).offices[c.office].nominationFee * 2)) * 18) });
  const total = items.reduce((t, i) => t + i.value, 0);
  return { items, total };
}
export function playerPrimaryScore(state: GameState, c: Contest): number {
  const rng = subRng(state.meta.seed, "player-primary", c.id);
  return playerPrimaryBreakdown(state, c).total + rng.normal(0, 8);
}

export function onPlayerPrimaryResolved(state: GameState, c: Contest, won: boolean, score: number, rival: number, rivalName: string): void {
  const cand = candidacyOf(state, c.id);
  if (!cand) return;
  cand.primaryResult = { won, score, rivalScore: rival, text: won ? "You won your party's primary." : `You lost the primary to ${rivalName}.` };
  if (won) {
    cand.stage = "nominee";
    careerLog(state, `Won the party ticket for ${c.label}.`);
    notify(state, `You won the ${partyDefOf(state, c.nominees[Object.keys(c.nominees)[0]]?.partyId ?? state.player.politics.membership?.partyId ?? null)?.abbr ?? ""} primary for ${c.label}!`, "good", "elections");
    pushNews(state, { headline: `${state.player.name} wins party primary for ${c.label}`, topic: "elections", importance: c.office === "president" || c.office === "governor" ? 3 : 1, stateId: c.stateId, source: `primary:${c.id}:player`, personal: true });
    state.player.politics.capital = clamp100(state.player.politics.capital + 5);
  } else {
    cand.stage = "lost_primary";
    careerLog(state, `Lost the primary for ${c.label}.`);
    notify(state, `You lost the primary for ${c.label} to ${rivalName}. Consider backing the nominee, defecting, or trying again next cycle.`, "bad", "elections");
    if (state.player.politics.membership) state.player.politics.membership.standing = clamp100(state.player.politics.membership.standing - 4);
    state.player.attrs.stress = clamp100(state.player.attrs.stress + 6);
  }
}

export function spendOnPrimary(state: GameState, amount: number): Result {
  const cand = candidacyOf(state);
  if (!cand || cand.stage !== "aspirant") return fail("You are not an aspirant in a primary.");
  if (amount <= 0 || !canAfford(state, amount)) return fail("You can't afford that.");
  debit(state, "campaign", amount, "Delegate mobilisation: transport, welfare, meetings");
  cand.primarySpend += amount;
  return good("You hosted delegates and supporters across the area. The effect is built into your primary score.");
}

/** UNLAWFUL: inducements to party delegates. Creates a traceable campaign-finance/electoral-offence scheme. */
export function buyDelegates(state: GameState, amount: number): Result {
  const cand = candidacyOf(state);
  if (!cand || cand.stage !== "aspirant") return fail("You are not an aspirant in a primary.");
  if (amount <= 0 || !canAfford(state, amount)) return fail("You can't afford that.");
  debit(state, "campaign", amount, "Payments to party delegates (unlawful inducement)");
  cand.delegatesBought += amount;
  startScheme(state, { kind: "delegate_inducement", label: `Delegate inducements (${state.contests[cand.contestId]?.label ?? "primary"})`, gain: 0, category: "campaign_finance", evidence: 24, witnesses: 3, officeId: null });
  return good("Delegates took the money. So did the people who saw it happen.");
}

// ---------------------------------------------------------------- campaign
export function setCampaignBudget(state: GameState, activity: CampaignActivity, amount: number): void {
  const cand = activeCandidacy(state);
  if (cand) cand.campaign.activities[activity] = Math.max(0, Math.round(amount));
}

export function fundraise(state: GameState): Result {
  const cand = activeCandidacy(state);
  const p = state.player;
  if (!cand) return fail("You are not a candidate.");
  const o = ruleOf(state).offices[cand.office];
  if (p.flags["fundraised"] === state.clock.monthIndex) return fail("You already held a fundraiser this month.");
  const cost = Math.round(o.campaignLimit * 0.0015 * Math.max(1, priceLevel(state) * 0.5));
  if (!canAfford(state, cost)) return fail(`A fundraising dinner costs about ₦${cost.toLocaleString()}.`);
  debit(state, "campaign", cost, "Fundraising dinner costs");
  const rng = subRng(state.meta.seed, "fundraise", state.clock.monthIndex);
  const fame = localFame(state, cand.office, state.seats[cand.seatId]);
  const m = p.politics.membership;
  const appeal = 0.4 + networkStrength(state) * 0.15 + fame / 120 + (m?.standing ?? 0) / 250 + p.attrs.communication / 250;
  let gross = Math.round(cost * rng.range(1.2, 2.6) * appeal * (state.economy.businessActivity / 50));
  // individual donation cap per donor
  const cap = ruleOf(state).finance.individualDonationLimit;
  const donors = Math.max(3, Math.min(40, Math.round(gross / Math.min(cap, Math.max(100_000, gross / 8)))));
  const each = Math.min(cap, Math.round(gross / donors));
  gross = each * donors;
  for (let i = 0; i < donors; i++) {
    const key = `donor-${state.clock.monthIndex}-${i}`;
    p.finances.lifetimeDonationsByDonor[key] = each;
  }
  creditCampaign(state, "donation_in", gross, `Lawful donations (${donors} donors, ≤ ₦${cap.toLocaleString()} each)`);
  p.flags["fundraised"] = state.clock.monthIndex;
  p.politics.capital = clamp100(p.politics.capital + 0.5);
  return good(`The dinner raised ₦${gross.toLocaleString()} from ${donors} donors, all within the individual donation limit.`);
}

/** UNLAWFUL: a donor offers far above the individual limit and asks it not be declared. */
export function acceptUnreportedDonation(state: GameState, amount: number): Result {
  const cand = activeCandidacy(state);
  if (!cand) return fail("You are not a candidate.");
  if (amount <= 0) return fail("Enter an amount.");
  creditCampaign(state, "donation_in", amount, "Large donation outside the lawful limit (undeclared)");
  cand.campaign.concealedDonations += amount;
  startScheme(state, { kind: "unreported_donation", label: "Undeclared donation above the individual limit", gain: 0, category: "campaign_finance", evidence: 20 + Math.min(30, amount / 20_000_000 * 30), witnesses: 2, officeId: null });
  return good("The money arrives. A paper trail of who gave it exists whether or not you declare it.");
}

export function prepareDebate(state: GameState): Result {
  const cand = activeCandidacy(state);
  if (!cand) return fail("You are not a candidate.");
  if (cand.debatePrepared) return fail("You already prepared for the debate.");
  const cost = Math.round(120_000 * priceLevel(state));
  if (!canAfford(state, cost)) return fail(`Debate coaching costs ₦${cost.toLocaleString()}.`);
  debit(state, "campaign", cost, "Debate coaching and research");
  cand.debatePrepared = true;
  return good("Your team drilled you on the likely questions.");
}

/** monthly campaign processing for the player's candidacies in the campaign phase */
export function processPlayerCampaign(state: GameState): void {
  if (!once(state, "campaign")) return;
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "player-campaign", m);
  const p = state.player;
  for (const cand of p.politics.candidacies) {
    if (cand.stage !== "nominee") continue;
    const c = state.contests[cand.contestId];
    if (!c || (c.phase !== "campaign" && c.phase !== "nominated" && c.phase !== "runoff")) continue;
    const o = ruleOf(state).offices[cand.office];
    const camp = cand.campaign;
    const seat = state.seats[cand.seatId];
    camp.organisation = clamp100(camp.organisation * 0.96);
    camp.momentum = clamp(camp.momentum * 0.9, -1, 1);
    const inCampaign = c.phase === "campaign" || c.phase === "runoff";
    const requested = inCampaign ? Object.values(camp.activities).reduce((a, b) => a + b, 0) : 0;
    let scale = 1;
    if (requested > 0) {
      const have = p.finances.campaignFund;
      if (have < requested) scale = have / requested;
      const paidTotal = Math.round(requested * scale);
      debitCampaign(state, paidTotal, "Campaign spending");
      const before = camp.spentTotal;
      camp.spentTotal += paidTotal;
      // spending beyond the lawful limit is a campaign-finance violation
      if (camp.spentTotal > o.campaignLimit) {
        const over = camp.spentTotal - Math.max(before, o.campaignLimit);
        camp.unlawfulSpending += over;
        if (!p.integrity.schemes.some((s) => s.kind === "overspend" && s.stage !== "closed")) {
          startScheme(state, { kind: "overspend", label: `Campaign spending above the lawful limit (${seat.label})`, gain: 0, category: "campaign_finance", evidence: 35, witnesses: 2, officeId: null });
          notify(state, "You have passed the lawful campaign-spending limit. This is a campaign-finance violation.", "bad");
        }
      }
      const diminish = Math.exp(-1.0 * (before / o.campaignLimit));
      const gainFrame = (activity: CampaignActivity) => ((camp.activities[activity] * scale) / (o.campaignLimit / 5)) * diminish;
      const a = p.attrs;
      const r = gainFrame("rallies"), me = gainFrame("media"), g = gainFrame("grassroots"), l = gainFrame("logistics"), d = gainFrame("digital");
      addFame(state, cand, seat, 3 * r * (0.6 + a.charisma / 100) + 2.5 * me + 1.5 * g + 1.5 * d);
      camp.organisation = clamp100(camp.organisation + 6 * g * (0.5 + a.leadership / 100) + 3 * l);
      camp.momentum = clamp(camp.momentum + 0.05 * r * (a.communication / 100 + 0.5) + 0.03 * me + 0.04 * d, -1, 1);
      camp.rallies += r > 0.05 ? 1 : 0;
      a.stress = clamp100(a.stress + 1.5);
    }
    // supporters volunteer and donate modestly
    if (inCampaign && (c.phase === "campaign")) {
      const volunteers = (p.commitments.partyWork ? 1 : 0) + (p.commitments.organising ? 1 : 0);
      camp.organisation = clamp100(camp.organisation + volunteers * 1.5 + networkStrength(state) * 0.15);
    }
    // debate two months out for competitive offices
    const debateMonth = c.electionMonth - 2;
    if (m === debateMonth && camp.debatePerformance === null && c.office !== "councillor") {
      const a = p.attrs;
      const perf = clamp((a.communication * 0.4 + a.intelligence * 0.3 + a.charisma * 0.3) / 100 + (cand.debatePrepared ? 0.12 : 0) + rng.normal(0, 0.12), 0, 1);
      camp.debatePerformance = perf;
      camp.momentum = clamp(camp.momentum + (perf - 0.5) * 0.5, -1, 1);
      addFame(state, cand, seat, perf * 4);
      notify(state, perf > 0.65 ? "You performed strongly in the candidates' debate." : perf < 0.4 ? "The debate went badly for you." : "A solid but unremarkable debate performance.", perf > 0.65 ? "good" : perf < 0.4 ? "bad" : "info");
      pushNews(state, { headline: perf > 0.65 ? `${p.name} wins plaudits in ${seat.label} debate` : perf < 0.4 ? `${p.name} stumbles in ${seat.label} debate` : `${seat.label} candidates face off in debate`, topic: "elections", importance: 1, stateId: seat.stateId, source: `debate:${c.id}`, personal: true });
    }
  }
}

function addFame(state: GameState, cand: Candidacy, seat: Seat, g: number) {
  if (g <= 0) return;
  const p = state.player;
  const [wl, ws, wn] = fameWeights(cand.office);
  const lgaTargets = cand.office === "president" || cand.office === "governor" ? [] : seat.lgaIds;
  for (const l of lgaTargets) p.fame.lgas[l] = clamp100((p.fame.lgas[l] ?? 0) + g * (0.4 + wl));
  if (cand.office === "governor") for (const l of state.states[seat.stateId!].lgaIds) p.fame.lgas[l] = clamp100((p.fame.lgas[l] ?? 0) + g * 0.8);
  if (cand.office === "president") for (const l of Object.keys(state.lgas)) p.fame.lgas[l] = clamp100((p.fame.lgas[l] ?? 0) + g * 0.45);
  const sids = seat.stateId ? [seat.stateId] : Object.keys(state.states);
  for (const s of sids) p.fame.states[s] = clamp100((p.fame.states[s] ?? 0) + g * (0.3 + ws));
  p.fame.national = clamp100(p.fame.national + g * (0.1 + wn * 0.6));
}

// ---------------------------------------------------------------- runner for the model
export function playerRunner(state: GameState, c: Contest): Runner | null {
  const cand = candidacyOf(state, c.id);
  const rec = Object.values(c.nominees).find((n) => n.isPlayer);
  if (!cand || !rec) return null;
  const p = state.player;
  const o = ruleOf(state).offices[c.office];
  const a = p.attrs;
  const appeal = clamp100(40 + 0.35 * (a.reputation - 50) + 0.25 * (a.charisma - 50) + 0.25 * (a.communication - 50) + 0.15 * a.politicalExperience * 0.5);
  const stage = p.integrity.schemes.reduce((mx, s) => Math.max(mx, { hidden: 0, rumour: 8, story: 28, audit: 34, investigation: 38, charged: 55, closed: 0 }[s.stage]), 0);
  const scandal = clamp100((100 - p.integrity.publicTrust) * 0.35 + stage);
  const seat = state.seats[c.seatId];
  const holder = p.politics.seatId === c.seatId;
  const mateId = cand.runningMateId;
  const mate = mateId ? state.chars[mateId] : null;
  return {
    key: "player", partyId: rec.partyId, name: p.name, isPlayer: true, charId: null, appeal, charisma: a.charisma, integrity: a.integrity,
    organisation: cand.campaign.organisation, momentum: cand.campaign.momentum, scandal, budgetRatio: cand.campaign.spentTotal / o.campaignLimit,
    incumbent: holder, homeLgaId: p.residenceLgaId, homeStateId: p.residenceStateId, runningMateStateId: mate?.stateId ?? null,
    fame: (lga, sid) => fameFor(state, c.office, lga, sid), approval: holder ? state.government.approval : undefined,
  };
  void seat;
}

export function chooseRunningMate(state: GameState, charId: string): Result {
  const cand = activeCandidacy(state);
  if (!cand || (cand.office !== "president" && cand.office !== "governor")) return fail("Only presidential and governorship tickets need a running mate.");
  const ch = state.chars[charId];
  if (!ch || ch.partyId !== state.player.politics.membership?.partyId) return fail("Pick a member of your own party.");
  cand.runningMateId = charId;
  return good(`${ch.name} will be your running mate.`);
}

export function runningMateOptions(state: GameState): { id: string; name: string; state: string; appeal: number }[] {
  const pid = state.player.politics.membership?.partyId;
  const out: { id: string; name: string; state: string; appeal: number }[] = [];
  for (const ch of Object.values(state.chars)) {
    if (ch.kind !== "politician" || ch.status !== "active" || ch.partyId !== pid || ch.stateId === state.player.residenceStateId) continue;
    if (ch.attrs.popularity < 55 && !ch.seatId) continue;
    out.push({ id: ch.id, name: ch.name, state: stateName(ch.stateId), appeal: ch.attrs.popularity });
  }
  return out.sort((a, b) => b.appeal - a.appeal).slice(0, 8);
}

// ---------------------------------------------------------------- results & office
export function onPlayerContestResult(state: GameState, c: Contest, res: ContestResult, runners: Runner[], final: boolean): void {
  const cand = candidacyOf(state, c.id);
  if (!cand || cand.stage !== "nominee") return;
  const rec = Object.values(c.nominees).find((n) => n.isPlayer);
  const mine = runners.find((r) => r.isPlayer);
  if (!rec || !mine) return;
  const sorted = Object.entries(res.votes).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  const pos = sorted.indexOf("player") + 1;
  if (!final) {
    if (!res.finalists?.includes("player")) {
      cand.stage = "done";
      notify(state, `You missed the runoff for ${c.label} (finished ${pos}).`, "bad", "elections");
      logElection(state, c, res, false, pos);
    } else notify(state, `You are in the runoff for ${c.label}!`, "good", "elections");
    return;
  }
  const won = res.winnerKey === "player";
  cand.stage = "done";
  logElection(state, c, res, won, pos);
  const share = res.shares["player"] ?? 0;
  if (won) {
    notify(state, `You WON the election for ${c.label} with ${(share * 100).toFixed(1)}%! You will be sworn in on schedule.`, "good", "elections");
    careerLog(state, `Won election: ${c.label} (${(share * 100).toFixed(1)}%).`);
    state.player.politics.capital = clamp100(state.player.politics.capital + 10);
    state.player.attrs.stress = clamp100(state.player.attrs.stress - 5);
  } else {
    notify(state, `You lost the election for ${c.label} (finished ${pos}, ${(share * 100).toFixed(1)}%). Open Elections for an explanation.`, "bad", "elections");
    careerLog(state, `Lost election: ${c.label} (${(share * 100).toFixed(1)}%).`);
    state.player.attrs.stress = clamp100(state.player.attrs.stress + 10);
    state.player.politics.capital = clamp100(state.player.politics.capital - 3);
    // unspent campaign funds are returned to the personal account
    const left = state.player.finances.campaignFund;
    if (left > 0) {
      state.player.finances.campaignFund = 0;
      credit(state, "other", Math.round(left * 0.5), "Unspent campaign funds returned (half repaid to donors)");
    }
  }
}

function logElection(state: GameState, c: Contest, res: ContestResult, won: boolean, pos: number) {
  state.player.politics.electionHistory.push({
    month: c.electionMonth, office: c.office, label: c.label, partyId: Object.values(c.nominees).find((n) => n.isPlayer)?.partyId ?? "",
    won, share: res.shares["player"] ?? 0, position: pos, turnout: res.turnout, contestId: c.id,
  });
}
export const logPlayerElection = logElection;

export function enterOfficeAsPlayer(state: GameState, seat: Seat, c: Contest): void {
  const p = state.player;
  const m = state.clock.monthIndex;
  const rule = ruleOf(state);
  if (p.politics.seatId && p.politics.seatId !== seat.id) {
    const old = state.seats[p.politics.seatId];
    const open = p.politics.pastOffices.find((o) => o.to === null);
    if (open) { open.to = m; open.reason = "moved to higher office"; }
    old.holderId = null;
    vacateSeat(state, old.id, "player moved to another office", true);
  }
  const reelected = p.politics.seatId === seat.id;
  seat.holderId = "player";
  seat.partyId = p.politics.membership?.partyId ?? seat.partyId;
  seat.termStart = m;
  seat.termsServed = reelected ? seat.termsServed + 1 : 1;
  p.politics.seatId = seat.id;
  p.politics.termsServed[seat.office] = (p.politics.termsServed[seat.office] ?? 0) + 1;
  if (!reelected) p.politics.pastOffices.push({ office: seat.office, label: seat.label, from: m, to: null, terms: 1 });
  else {
    const open = p.politics.pastOffices.find((o) => o.to === null);
    if (open) open.terms += 1;
  }
  p.occupation = { kind: "politician", jobId: null, title: rule.offices[seat.office].short, baseSalary: 0, since: m, grade: 0, timePct: 35 };
  p.politics.appointment = null;
  state.government.approval = reelected ? state.government.approval : 55;
  state.government.legislativeSupport = 55;
  state.government.allocations = null;
  state.government.lastBudgetMonth = m;
  careerLog(state, `Sworn in as ${seat.label}.`);
  notify(state, `You were sworn in as ${seat.label}. The Government section is now unlocked.`, "good", "government");
  pushNews(state, { headline: `${p.name} sworn in as ${seat.label}`, topic: seat.stateId ? "state" : "national", importance: seat.office === "president" || seat.office === "governor" ? 3 : 2, stateId: seat.stateId, partyId: seat.partyId, source: `inaug:${seat.id}:${m}:player`, personal: true });
  void c; void holderOf; void affinityWith; void PARTY_BY_ID; void TERM_LABEL; void TERMS;
}
