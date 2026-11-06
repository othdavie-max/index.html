/**
 * Corruption, patronage and accountability.
 *
 * Model (all variables are separate and non-interchangeable):
 *   integrity (attr)     — the player's own conduct; moves only through actions/choices.
 *   illicit wealth       — a SEPARATE account (finances.illicit), only created by explicit corrupt actions.
 *   influence            — power to move things; helps in office, offers some cover from scrutiny.
 *   exposure             — the strongest evidence file against the player across live schemes.
 *   legalRisk            — rises once a case opens.
 *   public trust         — falls on exposure, recovers slowly; separate from popularity and reputation.
 *
 * Detection is NOT arbitrary. Each live scheme carries an evidence level and a stage:
 *   hidden → rumour → story → audit/investigation → charged → verdict
 * and each transition has an explicit hazard built from: evidence strength, number of witnesses, media vigilance,
 * oversight capacity, institutional independence, and political cover. A player with no schemes has zero hazard,
 * so a clean record can never trigger a corruption scandal. A powerful player gets cover — never immunity.
 *
 * The game distinguishes lawful patronage and coalition-building (not modelled as schemes), conflicts of interest,
 * campaign-finance violations (civil/administrative penalties, possible disqualification) and criminal corruption.
 * It deliberately contains no operational guidance for concealing assets or evading real agencies.
 */
import type { GameState, CorruptionScheme, LegalCase, Character } from "./types";
import { clamp, clamp100, subRng } from "./rng";
import { creditIllicit, debit, netWorth } from "./finance";
import { pushNews, notify, careerLog } from "./news";
import { newId, once } from "./ids";
import { flagActive, playerSeat } from "./queries";
import { adjustRelation } from "./relationships";
import { removePlayerFromOffice, vacateSeat, expelFromParty } from "./politics";
import { stateName } from "./admin";

export interface SchemeInput {
  kind: string;
  label: string;
  gain: number;
  category: CorruptionScheme["category"];
  evidence: number;
  witnesses: number;
  officeId: string | null;
}

/** institutional parameters (0..1). Configurable per scenario in future. */
export function institutions(state: GameState) {
  const independenceBase = 0.45;
  const oversight = clamp(0.5 + (flagActive(state, "oversight_up") ? 0.22 : 0), 0.1, 1);
  const media = clamp(0.5 + (flagActive(state, "media_up") ? 0.22 : 0), 0.1, 1);
  const rulingIsPlayersParty = state.player.politics.membership && state.seats["pres"].partyId === state.player.politics.membership.partyId;
  const independence = clamp(independenceBase - (rulingIsPlayersParty ? 0.07 : 0) + (state.meta.difficulty === "challenging" ? 0.07 : 0), 0.15, 0.9);
  return { oversight, media, independence };
}

/** political cover from influence and standing in a ruling party — reduces hazards, never to zero */
export function cover(state: GameState): number {
  const inf = state.player.integrity.influence / 100;
  const m = state.player.politics.membership;
  const inPower = m && state.parties[m.partyId]?.inPower;
  const standing = m ? m.standing / 100 : 0;
  return clamp(0.45 * inf + (inPower ? 0.25 * standing : 0.05 * standing), 0, 0.65);
}

export function startScheme(state: GameState, input: SchemeInput): CorruptionScheme {
  const s: CorruptionScheme = {
    id: newId(state, "x"), kind: input.kind, label: input.label, month: state.clock.monthIndex, gain: input.gain, evidence: input.evidence,
    witnesses: input.witnesses, officeId: input.officeId, stage: "hidden", category: input.category,
  };
  state.player.integrity.schemes.push(s);
  if (input.category === "criminal" && input.gain > 0) creditIllicit(state, input.gain, input.label);
  state.player.attrs.integrity = clamp100(state.player.attrs.integrity - (input.category === "criminal" ? 5 : 3));
  if (input.category === "criminal") state.player.integrity.influence = clamp100(state.player.integrity.influence + 2);
  recomputeExposure(state);
  state.processed[`scheme:${s.id}`] = true;
  return s;
}

export function recomputeExposure(state: GameState): void {
  const live = state.player.integrity.schemes.filter((s) => s.stage !== "closed");
  state.player.integrity.exposure = clamp100(live.reduce((m, s) => Math.max(m, s.evidence), 0));
}


/** Monthly accountability step. Deterministic given (seed, month). */
export function processCorruption(state: GameState): void {
  if (!once(state, "corruption")) return;
  const m = state.clock.monthIndex;
  const inst = institutions(state);
  const cv = cover(state);
  const rng = subRng(state.meta.seed, "corruption", m);
  const p = state.player;
  const noScandals = state.meta.sandbox?.noScandals;

  for (const s of p.integrity.schemes) {
    if (s.stage === "closed") continue;
    // paper trail grows with witnesses; time erodes weak evidence slowly
    s.evidence = clamp100(s.evidence + s.witnesses * 0.35 - (s.stage === "hidden" ? 0.35 : 0));
    if (noScandals) continue;
    const ev = s.evidence / 100;

    if (s.stage === "hidden") {
      const h = 0.003 + 0.05 * Math.pow(ev, 1.3) * (0.6 + inst.media) * (1 + s.witnesses * 0.12) * (1 - cv * 0.5);
      if (rng.chance(h)) {
        s.stage = "rumour";
        p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 2);
        pushNews(state, { headline: `Questions raised over ${s.category === "campaign_finance" ? "campaign financing" : "contracts"} linked to ${p.name}`, body: "Unconfirmed reports and social-media posts allege irregularities. The allegations are denied.", topic: "corruption", importance: 1, source: `scheme:${s.id}`, personal: true });
        notify(state, "Rumours about your conduct are circulating.", "warn");
      }
    } else if (s.stage === "rumour") {
      const h = 0.12 * Math.pow(ev, 0.8) * (0.5 + inst.media) * (1 - cv * 0.4);
      if (rng.chance(h)) {
        s.stage = "story";
        p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 8);
        p.attrs.reputation = clamp100(p.attrs.reputation - 6);
        if (p.politics.membership) p.politics.membership.standing = clamp100(p.politics.membership.standing - 6);
        spookAllies(state, 5);
        pushNews(state, { headline: `Investigation: documents point to irregularities involving ${p.name}`, body: "A newsroom publishes documents and testimony. Allies call for calm; opponents demand action.", topic: "corruption", importance: 2, source: `scheme:${s.id}`, personal: true });
        notify(state, "A newspaper has published an investigation into your dealings.", "bad");
      }
    } else if (s.stage === "story") {
      const h = 0.28 * inst.oversight * (0.4 + ev) * (1 - cv * 0.55);
      if (rng.chance(h)) {
        s.stage = s.category === "criminal" ? "investigation" : "audit";
        openCase(state, s, s.category === "criminal" ? "investigation" : "audit");
      } else if (ev < 0.2 && rng.chance(0.15)) {
        s.stage = "closed";
        notify(state, "The story fades; no agency has taken it up.", "info");
      }
    }
  }

  // legal cases
  for (const c of p.integrity.cases) {
    if (c.outcome) continue;
    const s = p.integrity.schemes.find((x) => x.id === c.schemeId);
    if (!s) continue;
    if (m < c.nextStepMonth) {
      // ongoing legal costs
      if (c.stage !== "audit") debit(state, "legal", Math.round(30_000 * state.economy.cpi / 100), `Legal fees: ${c.title}`);
      continue;
    }
    advanceCase(state, c, s, inst, cv, rng);
  }

  // trust recovers slowly when nothing is live
  const anyLive = p.integrity.schemes.some((s) => s.stage !== "closed" && s.stage !== "hidden");
  if (!anyLive) p.integrity.publicTrust = clamp100(p.integrity.publicTrust + 0.5);
  p.integrity.legalRisk = clamp100(p.integrity.cases.filter((c) => !c.outcome).length * 25 + p.integrity.exposure * 0.3);
  recomputeExposure(state);

  processAiCorruption(state, inst);
}

function spookAllies(state: GameState, amount: number) {
  for (const r of Object.values(state.player.relationships)) {
    if (r.kind === "ally" || r.kind === "party" || r.kind === "patron") r.affinity = clamp(r.affinity - amount * (r.affinity > 0 ? 1 : 0), -100, 100);
  }
}

function openCase(state: GameState, s: CorruptionScheme, stage: LegalCase["stage"]) {
  const m = state.clock.monthIndex;
  const title = s.category === "criminal" ? `Anti-graft investigation: ${s.label}` : s.category === "campaign_finance" ? `Electoral commission audit: ${s.label}` : `Ethics inquiry: ${s.label}`;
  const c: LegalCase = { id: newId(state, "k"), schemeId: s.id, stage, openedMonth: m, nextStepMonth: m + 3 + (s.evidence > 60 ? 0 : 2), strength: s.evidence, title };
  state.player.integrity.cases.push(c);
  const agency = s.category === "criminal" ? "The anti-graft agency" : s.category === "campaign_finance" ? "The electoral commission" : "The ethics committee";
  pushNews(state, { headline: `${agency} opens a probe into ${state.player.name}`, body: `${title}. ${state.player.name} says they will cooperate fully.`, topic: "corruption", importance: 3, source: `case:${c.id}`, personal: true });
  notify(state, `${agency} has opened a case: ${title}`, "bad");
  state.player.integrity.publicTrust = clamp100(state.player.integrity.publicTrust - 6);
  state.player.attrs.stress = clamp100(state.player.attrs.stress + 10);
  careerLog(state, `Case opened: ${title}`);
}

function advanceCase(state: GameState, c: LegalCase, s: CorruptionScheme, inst: ReturnType<typeof institutions>, cv: number, rng: ReturnType<typeof subRng>) {
  const m = state.clock.monthIndex;
  const p = state.player;
  const ev = s.evidence / 100;
  const defence = (p.flags["defence_strength"] as number | undefined) ?? 0; // 0..40 from lawyers
  if (c.stage === "audit" || c.stage === "investigation") {
    const h = (0.55 * ev + 0.15) * inst.independence * (1 - cv * 0.5) * (s.category === "criminal" ? 1 : 1.2);
    if (rng.chance(h)) {
      c.stage = s.category === "criminal" ? "charged" : "verdict";
      c.strength = s.evidence;
      c.nextStepMonth = m + (c.stage === "charged" ? 4 : 0);
      s.stage = "charged";
      if (c.stage === "charged") {
        pushNews(state, { headline: `${p.name} charged over ${s.label.toLowerCase()}`, body: "Prosecutors file charges. The accused pleads not guilty.", topic: "corruption", importance: 3, source: `case:${c.id}`, personal: true });
        if (p.politics.membership) {
          p.politics.membership.standing = clamp100(p.politics.membership.standing - 15);
          notify(state, "Your party has suspended your privileges pending the outcome.", "bad");
        }
        p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 10);
        spookAllies(state, 12);
      }
    } else if (ev < 0.18 && rng.chance(0.4)) {
      closeCase(state, c, s, "withdrawn");
      return;
    } else c.nextStepMonth = m + 2;
    if (c.stage === "verdict") resolveVerdict(state, c, s, inst, cv, rng, defence);
    return;
  }
  if (c.stage === "charged") {
    c.stage = "trial";
    c.nextStepMonth = m + 3;
    return;
  }
  if (c.stage === "trial") {
    c.stage = "verdict";
    resolveVerdict(state, c, s, inst, cv, rng, defence);
  }
}

function resolveVerdict(state: GameState, c: LegalCase, s: CorruptionScheme, inst: ReturnType<typeof institutions>, cv: number, rng: ReturnType<typeof subRng>, defence: number) {
  const ev = s.evidence / 100;
  const pConvict = clamp(0.1 + ev * 0.85 * (0.4 + inst.independence) - defence / 100 - cv * 0.15, 0.04, 0.95);
  if (rng.chance(pConvict)) {
    c.outcome = "convicted";
    s.stage = "closed";
    c.stage = "verdict";
    applyConviction(state, c, s);
  } else {
    closeCase(state, c, s, "acquitted");
  }
}

function applyConviction(state: GameState, c: LegalCase, s: CorruptionScheme) {
  const p = state.player;
  const m = state.clock.monthIndex;
  if (s.category === "criminal") {
    const recovered = Math.min(p.finances.illicit, s.gain * 1.1);
    p.finances.illicit -= recovered;
    const fine = Math.round(Math.max(500_000, s.gain * 0.6) * state.economy.cpi / 100);
    debit(state, "penalty", fine, "Court-ordered penalty and asset recovery", { mandatory: true });
    p.integrity.convictions.push({ m, text: s.label, dishonesty: true });
    state.flags["convictedMonth"] = m;
    const months = s.gain > 20_000_000 ? 36 : s.gain > 3_000_000 ? 18 : 8;
    state.flags["jailedUntil"] = m + months;
    p.attrs.reputation = clamp100(p.attrs.reputation - 25);
    p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 25);
    pushNews(state, { headline: `${p.name} convicted over ${s.label.toLowerCase()}, sentenced to ${months} months`, body: "The court orders recovery of proceeds and a fine.", topic: "corruption", importance: 3, source: `case:${c.id}`, personal: true });
    notify(state, `You were convicted and sentenced to ${months} months.`, "bad");
    if (playerSeat(state)) removePlayerFromOffice(state, "convicted");
    expelFromParty(state, "convicted of a dishonesty offence");
  } else if (s.category === "campaign_finance") {
    const fine = Math.round(Math.max(1_000_000, s.gain * 0.5, p.finances.campaignFund * 0.1) * state.economy.cpi / 100);
    debit(state, "penalty", fine, "Electoral commission penalty", { mandatory: true });
    p.integrity.violations.push({ m, kind: s.kind, text: s.label });
    p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 8);
    // an unlawful-overspend finding can disqualify a pending candidacy
    const cand = p.politics.candidacies.find((x) => x.stage === "nominee" || x.stage === "aspirant");
    if (cand && cand.campaign.unlawfulSpending > 0.5 * (cand.campaign.spentTotal || 1)) {
      cand.stage = "disqualified";
      notify(state, "You were disqualified from the race over campaign-finance violations.", "bad");
    }
    pushNews(state, { headline: `Electoral commission penalises ${p.name} for campaign-finance violations`, body: "A fine is imposed.", topic: "corruption", importance: 2, source: `case:${c.id}`, personal: true });
  } else {
    p.integrity.violations.push({ m, kind: s.kind, text: s.label });
    p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 7);
    if (p.politics.appointment) {
      p.politics.appointment = null;
      notify(state, "You were removed from your appointment after an ethics finding.", "bad");
    }
    pushNews(state, { headline: `Ethics panel finds conflict of interest involving ${p.name}`, body: "The panel recommends sanctions.", topic: "corruption", importance: 2, source: `case:${c.id}`, personal: true });
  }
  careerLog(state, `Convicted/penalised: ${c.title}`);
}

function closeCase(state: GameState, c: LegalCase, s: CorruptionScheme, outcome: "acquitted" | "withdrawn") {
  c.outcome = outcome;
  s.stage = "closed";
  state.player.integrity.publicTrust = clamp100(state.player.integrity.publicTrust + (outcome === "acquitted" ? 6 : 3));
  pushNews(state, { headline: outcome === "acquitted" ? `Court acquits ${state.player.name} in ${c.title.split(": ")[1] ?? "case"}` : `Case against ${state.player.name} withdrawn for lack of evidence`, topic: "corruption", importance: 2, source: `case:${c.id}`, personal: true });
  notify(state, outcome === "acquitted" ? "You were acquitted." : "The case against you was dropped.", "good");
}

// ----------------------------------------------------------------- player legal actions
export function hireLawyers(state: GameState): string {
  const cost = Math.round(1_500_000 * state.economy.cpi / 100);
  if (state.player.finances.cash + state.player.finances.savings < cost) return `Top lawyers cost about ₦${cost.toLocaleString()}.`;
  debit(state, "legal", cost, "Retained defence counsel");
  state.player.flags["defence_strength"] = Math.min(40, ((state.player.flags["defence_strength"] as number) ?? 0) + 15);
  return "Your legal team is retained. This improves your chances at trial — it does not make the evidence go away.";
}
/** Return the proceeds: removes the illicit balance, cuts evidence, but is an admission that will be reported. */
export function settleAndReturn(state: GameState, schemeId: string): string {
  const s = state.player.integrity.schemes.find((x) => x.id === schemeId);
  if (!s || s.stage === "closed") return "Nothing to settle.";
  const amount = Math.min(state.player.finances.illicit, s.gain);
  state.player.finances.illicit -= amount;
  s.evidence = clamp100(s.evidence * 0.5);
  state.player.attrs.integrity = clamp100(state.player.attrs.integrity + 3);
  state.player.integrity.publicTrust = clamp100(state.player.integrity.publicTrust - 2);
  pushNews(state, { headline: `${state.player.name} returns disputed funds, admits "lapse of judgement"`, topic: "corruption", importance: 1, source: `scheme:${s.id}`, personal: true });
  return `You return ₦${Math.round(amount).toLocaleString()}. The evidence weakens, but the admission becomes public.`;
}

// ----------------------------------------------------------------- AI figures
function processAiCorruption(state: GameState, inst: ReturnType<typeof institutions>) {
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "ai-corruption", m);
  for (const c of Object.values(state.chars)) {
    if (c.kind !== "politician" || c.status !== "active" || !c.seatId) continue;
    const seat = state.seats[c.seatId];
    if (!seat) continue;
    const level = { councillor: 1, lg_chair: 2, state_assembly: 2, reps: 3, senate: 3, governor: 4, president: 4 }[seat.office] ?? 1;
    // accrue evidence only for low-integrity officials with opportunity
    const opp = (100 - c.attrs.integrity) / 100;
    if (c.evidence < 60 && rng.chance(0.004 * opp * opp * level)) c.evidence = clamp100(c.evidence + rng.range(6, 16));
    if (c.evidence <= 0) continue;
    const key = `aicase:${c.id}`;
    const stage = (state.flags[key] as number | undefined) ?? 0; // 0 none, 1 rumour, 2 probe, 3 charged
    const ev = c.evidence / 100;
    const powerCover = level * 0.06 + (c.partyId === state.seats["pres"].partyId ? 0.12 : 0);
    if (stage === 0 && rng.chance(0.03 * ev * (0.6 + inst.media) * (1 - powerCover))) {
      state.flags[key] = 1;
      pushNews(state, { headline: `Allegations surface against ${seatTitle(state, c)} ${c.name}`, topic: "corruption", importance: 1, stateId: seat.stateId, partyId: c.partyId, source: `aicase:${c.id}:1` });
    } else if (stage === 1 && rng.chance(0.12 * inst.oversight * ev * (1 - powerCover))) {
      state.flags[key] = 2;
      pushNews(state, { headline: `Anti-graft agency probes ${seatTitle(state, c)} ${c.name}`, topic: "corruption", importance: 2, stateId: seat.stateId, partyId: c.partyId, source: `aicase:${c.id}:2` });
    } else if (stage === 2 && rng.chance(0.1 * ev * inst.independence * (1 - powerCover))) {
      state.flags[key] = 3;
      pushNews(state, { headline: `${seatTitle(state, c)} ${c.name} charged with corruption`, topic: "corruption", importance: 2, stateId: seat.stateId, partyId: c.partyId, source: `aicase:${c.id}:3` });
    } else if (stage === 3 && rng.chance(0.15)) {
      const convict = rng.chance(clamp(0.1 + ev * 0.8 * (0.4 + inst.independence) - powerCover * 0.5, 0.05, 0.9));
      state.flags[key] = 4;
      if (convict) {
        c.convictedYear = Math.floor(2026 + m / 12);
        pushNews(state, { headline: `${seatTitle(state, c)} ${c.name} convicted of corruption`, topic: "corruption", importance: 3, stateId: seat.stateId, partyId: c.partyId, source: `aicase:${c.id}:4` });
        c.status = "jailed";
        vacateSeat(state, seat.id, "convicted");
        c.evidence = 0;
      } else {
        pushNews(state, { headline: `${seatTitle(state, c)} ${c.name} acquitted by court`, topic: "corruption", importance: 2, stateId: seat.stateId, partyId: c.partyId, source: `aicase:${c.id}:5` });
        c.evidence = Math.round(c.evidence * 0.3);
        delete state.flags[key];
      }
    }
  }
}

function seatTitle(state: GameState, c: Character): string {
  const seat = c.seatId ? state.seats[c.seatId] : null;
  if (!seat) return "Politician";
  switch (seat.office) {
    case "governor": return `Governor of ${seat.stateId ? stateName(seat.stateId) : ""}`.trim();
    case "senate": return "Senator";
    case "reps": return "Rep.";
    case "state_assembly": return "Assembly member";
    case "lg_chair": return "LG chairman";
    case "president": return "President";
    default: return "Councillor";
  }
}

export { adjustRelation, netWorth };
