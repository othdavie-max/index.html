/**
 * The command layer: every player action is a plain serialisable object handled by `perform`.
 * The UI never mutates state directly; it dispatches actions. This is the seam where a future server-authoritative
 * multiplayer mode would validate and apply commands.
 */
import type { GameState, Commitments, CampaignActivity, BudgetLine } from "./types";
import { advanceMonth, advanceToNextEvent, canAdvance } from "./turn";
import { resolveDecision } from "./events";
import * as edu from "./education";
import * as pol from "./politics";
import * as camp from "./campaign";
import * as gov from "./governance";
import * as corr from "./corruption";
import { debit, canAfford, transferToCampaign, credit } from "./finance";
import { priceLevel } from "./queries";
import { clamp100, subRng } from "./rng";
import { careerLog } from "./news";
import { ensureRelationship, adjustRelation } from "./relationships";
import { LGA_BY_ID } from "./admin";
import type { InstType } from "../data/life";
import type { Funding } from "../data/policies";

export type Result = { ok: boolean; message: string };

export type GameAction =
  | { t: "advance" }
  | { t: "advanceToEvent" }
  | { t: "decide"; occurrenceId: string; choiceId: string }
  | { t: "commitment"; key: keyof Commitments; on: boolean }
  | { t: "enroll"; programmeId: string; inst: InstType }
  | { t: "nysc" }
  | { t: "applyJob"; jobId: string }
  | { t: "quitJob" }
  | { t: "startBusiness"; typeId: string; name: string }
  | { t: "closeBusiness" }
  | { t: "relocate"; lgaId: string }
  | { t: "social"; id: SocialId; targetId?: string }
  | { t: "deposit"; amount: number }
  | { t: "withdraw"; amount: number }
  | { t: "joinParty"; partyId: string; factionId?: string }
  | { t: "leaveParty" }
  | { t: "defect"; partyId: string }
  | { t: "partyOffice"; level: "ward" | "lga" | "state" | "national"; top: boolean }
  | { t: "foundParty"; cfg: pol.NewPartyConfig }
  | { t: "appointment"; level: "local" | "state" | "federal" }
  | { t: "resignAppointment" }
  | { t: "declare"; seatId: string }
  | { t: "withdrawCandidacy" }
  | { t: "primarySpend"; amount: number }
  | { t: "buyDelegates"; amount: number }
  | { t: "campaignBudget"; activity: CampaignActivity; amount: number }
  | { t: "fundCampaign"; amount: number }
  | { t: "fundraise" }
  | { t: "unreportedDonation"; amount: number }
  | { t: "prepareDebate" }
  | { t: "runningMate"; charId: string }
  | { t: "allocations"; alloc: Record<BudgetLine, number> }
  | { t: "startProject"; defId: string; funding: Funding }
  | { t: "cancelProject"; projectId: string }
  | { t: "fuelSubsidy"; level: number }
  | { t: "deficit"; v: number }
  | { t: "appoint"; post: string; charId: string }
  | { t: "negotiate" }
  | { t: "divertFunds"; amountM: number }
  | { t: "inflateProject"; projectId: string }
  | { t: "contractForAlly" }
  | { t: "hireLawyers" }
  | { t: "settle"; schemeId: string }
  | { t: "markRead" }
  | { t: "setting"; key: "autoSave" | "reducedMotion" | "showTooltips"; value: boolean };

export type SocialId = "donate_community" | "public_statement" | "courtesy_visit" | "host_feast" | "write_oped" | "mentor_ask";

export interface SocialDef { id: SocialId; label: string; desc: string; cost: (s: GameState) => number; needsTarget?: boolean; minAge?: number }
export const SOCIAL: SocialDef[] = [
  { id: "donate_community", label: "Fund a community project", desc: "Sponsor a clinic stock-up, borehole repair or school desks. Builds local name recognition and goodwill.", cost: (s) => Math.round(60_000 * priceLevel(s)) },
  { id: "host_feast", label: "Host a community feast", desc: "A festive gathering that deepens ties in your neighbourhood.", cost: (s) => Math.round(90_000 * priceLevel(s)) },
  { id: "public_statement", label: "Speak at a town hall", desc: "Free. Your communication skill decides whether you impress or stumble.", cost: () => 0 },
  { id: "write_oped", label: "Write an opinion piece", desc: "Free. Builds profile among educated readers; reputation risk if it is poorly argued.", cost: () => 0 },
  { id: "courtesy_visit", label: "Pay a courtesy visit to an official", desc: "Meet a local office-holder to build a relationship. Costs a modest gift for the delegation.", cost: (s) => Math.round(25_000 * priceLevel(s)), needsTarget: true },
  { id: "mentor_ask", label: "Ask an elder for mentorship", desc: "Seek guidance from a respected local figure. Easier if you are known and respected.", cost: () => 0, needsTarget: true },
];

function fail(message: string): Result { return { ok: false, message }; }
function good(message: string): Result { return { ok: true, message }; }

export function perform(state: GameState, a: GameAction): Result {
  if (state.gameOver && a.t !== "setting" && a.t !== "markRead") return fail("This life has ended. Start a new game or load a save.");
  switch (a.t) {
    case "advance": {
      const gate = canAdvance(state);
      if (!gate.ok) return fail(gate.reason!);
      advanceMonth(state);
      return good("A month passes.");
    }
    case "advanceToEvent": {
      const gate = canAdvance(state);
      if (!gate.ok) return fail(gate.reason!);
      const n = advanceToNextEvent(state);
      return good(`${n} month${n === 1 ? "" : "s"} pass.`);
    }
    case "decide": return { ok: true, message: resolveDecision(state, a.occurrenceId, a.choiceId) };
    case "commitment": {
      state.player.commitments[a.key] = a.on;
      return good(a.on ? "Commitment added." : "Commitment dropped.");
    }
    case "enroll": return edu.enroll(state, a.programmeId, a.inst);
    case "nysc": return edu.startNysc(state);
    case "applyJob": return edu.applyForJob(state, a.jobId);
    case "quitJob": return edu.quitJob(state);
    case "startBusiness": return edu.startBusiness(state, a.typeId, a.name);
    case "closeBusiness": return edu.closeBusiness(state);
    case "relocate": return relocate(state, a.lgaId);
    case "social": return social(state, a.id, a.targetId);
    case "deposit": {
      const f = state.player.finances;
      const amt = Math.min(a.amount, f.cash);
      if (amt <= 0) return fail("Nothing to deposit.");
      f.cash -= amt; f.savings += amt;
      return good(`Moved ₦${Math.round(amt).toLocaleString()} into savings.`);
    }
    case "withdraw": {
      const f = state.player.finances;
      const amt = Math.min(a.amount, f.savings);
      if (amt <= 0) return fail("Nothing to withdraw.");
      f.savings -= amt; f.cash += amt;
      return good(`Moved ₦${Math.round(amt).toLocaleString()} to cash.`);
    }
    case "joinParty": return pol.joinParty(state, a.partyId, a.factionId);
    case "leaveParty": return pol.leaveParty(state);
    case "defect": return pol.defect(state, a.partyId);
    case "partyOffice": return pol.applyPartyOffice(state, a.level, a.top);
    case "foundParty": return pol.startFoundingParty(state, a.cfg);
    case "appointment": return gov.seekAppointment(state, a.level);
    case "resignAppointment": return camp.resignAppointment(state);
    case "declare": return camp.declareCandidacy(state, a.seatId);
    case "withdrawCandidacy": return camp.withdrawCandidacy(state);
    case "primarySpend": return camp.spendOnPrimary(state, a.amount);
    case "buyDelegates": return camp.buyDelegates(state, a.amount);
    case "campaignBudget": camp.setCampaignBudget(state, a.activity, a.amount); return good("Budget updated.");
    case "fundCampaign": return transferToCampaign(state, a.amount) ? good(`₦${Math.round(a.amount).toLocaleString()} moved to your campaign fund.`) : fail("Not enough personal funds.");
    case "fundraise": return camp.fundraise(state);
    case "unreportedDonation": return camp.acceptUnreportedDonation(state, a.amount);
    case "prepareDebate": return camp.prepareDebate(state);
    case "runningMate": return camp.chooseRunningMate(state, a.charId);
    case "allocations": return gov.setAllocations(state, a.alloc);
    case "startProject": return gov.startProject(state, a.defId, a.funding);
    case "cancelProject": return gov.cancelProject(state, a.projectId);
    case "fuelSubsidy": return gov.setFuelSubsidy(state, a.level);
    case "deficit": return gov.setDeficitTarget(state, a.v);
    case "appoint": return gov.appoint(state, a.post, a.charId);
    case "negotiate": return gov.negotiateWithLegislature(state);
    case "divertFunds": return gov.divertFunds(state, a.amountM);
    case "inflateProject": return gov.inflateProject(state, a.projectId);
    case "contractForAlly": return gov.contractForAlly(state);
    case "hireLawyers": return { ok: true, message: corr.hireLawyers(state) };
    case "settle": return { ok: true, message: corr.settleAndReturn(state, a.schemeId) };
    case "markRead": for (const n of state.notifications) n.read = true; return good("");
    case "setting": state.settings[a.key] = a.value; return good("Saved.");
  }
}

function relocate(state: GameState, lgaId: string): Result {
  const p = state.player;
  const lga = LGA_BY_ID[lgaId];
  if (!lga) return fail("Unknown LGA.");
  if (lgaId === p.residenceLgaId) return fail("You already live there.");
  if (p.education.enrolled) return fail("Finish your programme before moving.");
  const cost = Math.round((60_000 + 50_000 * p.family.wealthTier) * priceLevel(state));
  if (!canAfford(state, cost)) return fail(`Moving costs about ₦${cost.toLocaleString()}.`);
  debit(state, "other", cost, `Relocation to ${lga.name}`);
  p.residenceLgaId = lgaId;
  p.residenceStateId = lga.stateId;
  p.attrs.stress = clamp100(p.attrs.stress + 4);
  careerLog(state, `Moved to ${lga.name}.`);
  return good(`You moved to ${lga.name}. You're a new face there — local name recognition starts low.`);
}

function social(state: GameState, id: SocialId, targetId?: string): Result {
  const def = SOCIAL.find((s) => s.id === id)!;
  const p = state.player;
  const cost = def.cost(state);
  if (cost > 0 && !canAfford(state, cost)) return fail(`That costs ₦${cost.toLocaleString()}.`);
  const key = `social:${id}`;
  if (p.flags[key] === state.clock.monthIndex) return fail("You already did that this month.");
  const lga = p.residenceLgaId, st = p.residenceStateId;
  const fame = (g: number) => {
    p.fame.lgas[lga] = clamp100((p.fame.lgas[lga] ?? 0) + g);
    p.fame.states[st] = clamp100((p.fame.states[st] ?? 0) + g * 0.3);
    p.fame.national = clamp100(p.fame.national + g * 0.04);
  };
  p.flags[key] = state.clock.monthIndex;
  switch (id) {
    case "donate_community": {
      debit(state, "community", cost, "Community project sponsorship");
      fame(2.5); p.attrs.reputation = clamp100(p.attrs.reputation + 1.5);
      state.lgas[lga].indicators.health = Math.min(97, state.lgas[lga].indicators.health + 0.4);
      return good("The community notices. Name recognition and reputation rise.");
    }
    case "host_feast": {
      debit(state, "community", cost, "Community feast");
      fame(2.0); p.politics.capital = clamp100(p.politics.capital + 1);
      return good("A joyful gathering. People remember who hosted.");
    }
    case "public_statement": {
      const strength = (p.attrs.communication + p.attrs.charisma) / 200;
      fame(0.8 + strength * 2); p.attrs.communication = clamp100(p.attrs.communication + 0.3);
      if (strength < 0.35) { p.attrs.reputation = clamp100(p.attrs.reputation - 0.5); return good("Your remarks are heard, though they could have landed better."); }
      return good("You spoke well and people applauded.");
    }
    case "write_oped": {
      const q = (p.attrs.intelligence + p.attrs.communication) / 200;
      fame(0.6 + q * 1.4); p.attrs.reputation = clamp100(p.attrs.reputation + (q > 0.4 ? 0.6 : -0.4));
      return good(q > 0.4 ? "Your piece is shared widely." : "The argument is thin and critics say so.");
    }
    case "courtesy_visit": {
      if (!targetId || !state.chars[targetId]) return fail("Choose someone to visit.");
      debit(state, "gift", cost, `Courtesy visit gift (${state.chars[targetId].name})`);
      const w = state.chars[targetId].seatId ? 1 : 0.5;
      adjustRelation(state, targetId, Math.round((3 + p.attrs.negotiation / 25) * w), "associate");
      p.politics.capital = clamp100(p.politics.capital + 0.5);
      return good(`${state.chars[targetId].name} received you warmly.`);
    }
    case "mentor_ask": {
      if (!targetId || !state.chars[targetId]) return fail("Choose an elder to approach.");
      const known = Math.max(p.fame.national, p.fame.lgas[lga] ?? 0);
      const chance = Math.min(0.8, 0.2 + known / 120 + p.attrs.reputation / 400 + p.family.politicalTies * 0.06);
      if (subRng(state.meta.seed, 'mentor', state.clock.monthIndex, targetId).chance(chance)) {
        const r = ensureRelationship(state, targetId, "mentor", 15);
        r.affinity = Math.min(100, r.affinity + 10);
        p.politics.capital = clamp100(p.politics.capital + 3);
        return good(`${state.chars[targetId].name} agrees to mentor you.`);
      }
      return fail("They politely decline for now. Build your standing and try again.");
    }
  }
}

void credit;
