/**
 * Delayed consequences ("echoes"). Most decisions do something now AND plant a consequence that arrives months later.
 * The echo is visible in advance as a hint ("Coming up"), but what actually happens is decided from the state of
 * the country when it falls due: good follow-through can turn a risk into a payoff, neglect can make it worse.
 */
import type { Rng } from "../../game/engine/rng";
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Echo, FixState } from "./types";
import { addMod, calMonth, clamp100, delivery, monthLabel, nb, powerRatio, pushNews, pushReport } from "./util";
import { createEvent } from "./events";

interface Outcome { text: string; tone: "good" | "bad" | "neutral" }
interface EchoDef { tone: Echo["tone"]; resolve: (s: FixState, e: Echo, rng: Rng) => Outcome }

const sname = (id?: string) => (id ? STATE_BY_ID[id]?.name ?? id : "");
const hottest = (s: FixState, key: "unrest" | "insecurity" | "food") => Object.keys(s.regions).sort((a, b) => s.regions[b][key] - s.regions[a][key])[0];
const policyOn = (s: FixState, id: string) => !!s.policies[id]?.active;

export const ECHOES: Record<string, EchoDef> = {
  emptySilos: {
    tone: "bad",
    resolve: (s) => {
      const storage = s.agri.storage;
      if (storage >= 25 || policyOn(s, "farmInputs")) return { text: "Silos were refilled in time, so the reserve release left no lasting gap.", tone: "good" };
      addMod(s, "echo:emptySilos", "Empty grain silos", { foodPrice: 4 }, { duration: 3 });
      return { text: "The grain reserve is still empty, so there was nothing to cushion this season: food prices jumped.", tone: "bad" };
    },
  },
  programmeEnds: {
    tone: "bad",
    resolve: (s, e) => {
      if (policyOn(s, "cashTransfers") || s.fuel.transfers) return { text: `${e.cause.replace(/^You (started|paid for) /, "")} ended, but permanent cash transfers caught the families who relied on it.`, tone: "good" };
      addMod(s, "echo:cliff", "Support ended abruptly", { happiness: -1.8, trust: -0.8 }, { duration: 2 });
      return { text: "The temporary support ended with nothing to replace it. Families felt the cliff edge.", tone: "bad" };
    },
  },
  reservesQuestion: {
    tone: "mixed",
    resolve: (s) => {
      if (s.eco.reserves < 22) { addMod(s, "echo:reserves", "Doubts about the naira defence", { investor: -4, fxDemand: 0.15 }, { duration: 4 }); return { text: `Reserves are down to $${s.eco.reserves.toFixed(1)}bn. Traders now doubt the central bank can keep defending the naira.`, tone: "bad" }; }
      addMod(s, "echo:reserves", "Credible naira defence", { investor: 2 }, { duration: 4 });
      return { text: "Reserves held up, so markets believe the naira defence is credible.", tone: "good" };
    },
  },
  smuggling: {
    tone: "bad",
    resolve: (s) => { addMod(s, "echo:smuggling", "Smuggling around import limits", { inflation: 0.8, revenue: -30, trust: -0.8 }, { duration: 4 }); return { text: "Import limits pushed trade into smuggling: prices up, customs revenue down.", tone: "bad" }; },
  },
  promiseCheck: {
    tone: "mixed",
    resolve: (s, e) => {
      const then = s.history.find((h) => h.month >= e.causeMonth)?.happiness ?? s.gov.happiness;
      if (s.gov.happiness >= then + 1) { s.gov.trust = clamp100(s.gov.trust + 2.5); return { text: "People feel the dialogue led somewhere: life improved since you made those promises.", tone: "good" }; }
      s.gov.trust = clamp100(s.gov.trust - 3); s.gov.opposition = clamp100(s.gov.opposition + 2);
      return { text: "Months after the national dialogue, nothing has improved. The opposition calls them broken promises.", tone: "bad" };
    },
  },
  auditFindings: {
    tone: "mixed",
    resolve: (s) => {
      addMod(s, "echo:audit", "Audit recoveries", { corruption: -2, revenue: 20 }, { duration: 12 });
      s.gov.opposition = clamp100(s.gov.opposition + 1.5);
      if (s.me.evidence > 20) { s.me.evidence = clamp100(s.me.evidence + 10); return { text: "The auditors recovered stolen money, and also found contracts linked to your own circle.", tone: "bad" }; }
      return { text: "The audits recovered stolen money and scared some officials straight. A few allies are angry.", tone: "good" };
    },
  },
  retaliation: {
    tone: "mixed",
    resolve: (s, e, rng) => {
      if (s.sec.humanRights < 50 && rng.chance(0.6)) {
        addMod(s, "echo:retaliation", "Revenge attacks", { security: -3 }, { duration: 4 });
        if (e.stateId) createEvent(s, "banditry", e.stateId);
        return { text: `Heavy-handed operations in ${sname(e.stateId) || "the north"} turned locals against the troops; armed groups hit back.`, tone: "bad" };
      }
      addMod(s, "echo:retaliation", "Security gains hold", { security: 1.5 }, { duration: 4 });
      return { text: "The security push was handled lawfully and the gains held.", tone: "good" };
    },
  },
  otherUnions: {
    tone: "bad",
    resolve: (s, _e, rng) => {
      if (rng.chance(0.55)) { createEvent(s, "labourStrike", hottest(s, "unrest")); return { text: "Seeing one union win a pay deal, other unions downed tools to demand the same.", tone: "bad" }; }
      return { text: "Other unions grumbled about the pay deal but stayed at work.", tone: "neutral" };
    },
  },
  investorVisit: {
    tone: "mixed",
    resolve: (s) => {
      if (s.eco.investor >= 44 && powerRatio(s) > 0.26) { createEvent(s, "investorOffer", ["NG-LA", "NG-OG", "NG-KN", "NG-RI"][s.month % 4]); return { text: "Investors from the roadshow came back with a concrete offer.", tone: "good" }; }
      addMod(s, "echo:roadshow", "Investors unconvinced", { investor: -1.5 }, { duration: 3 });
      return { text: "The roadshow investors visited, saw blackouts and high inflation, and left without signing anything.", tone: "bad" };
    },
  },
  farmersHurt: {
    tone: "bad",
    resolve: (s) => {
      if (!policyOn(s, "foodImport")) return { text: "You ended the duty waiver in time; local farmers recovered.", tone: "good" };
      s.agri.inputs = clamp100(s.agri.inputs - 5);
      addMod(s, "echo:farmers", "Farmers undercut by imports", { jobs: 0.25, foodSupply: -2 }, { duration: 12 });
      createEvent(s, "foodProtest", hottest(s, "food"));
      return { text: "Cheap imports undercut local farmers: many planted less this season, and farm workers lost jobs.", tone: "bad" };
    },
  },
  cutsBite: {
    tone: "bad",
    resolve: (s, e) => {
      const edu = e.kind === "cutsBite" && e.cause.includes("education");
      if (!policyOn(s, edu ? "eduCut" : "healthCut")) return { text: `You reversed the ${edu ? "education" : "health"} cuts before lasting damage was done.`, tone: "good" };
      if (edu) { s.jobs.skills = clamp100(s.jobs.skills - 4); s.soc.education = clamp100(s.soc.education - 3); }
      else { s.soc.health = clamp100(s.soc.health - 4); addMod(s, "echo:outbreak", "Disease outbreak", { happiness: -2, jobs: 0.1 }, { duration: 3 }); }
      return { text: edu ? "Exam results slumped and employers report a skills gap: the education cuts are now costing the economy." : "Clinic closures were followed by a disease outbreak: the health cuts are now costing lives and work days.", tone: "bad" };
    },
  },
  rightsReport: {
    tone: "bad",
    resolve: (s) => {
      if (s.sec.humanRights >= 50) return { text: "An international review praised the troops' conduct during the surge.", tone: "good" };
      addMod(s, "echo:rights", "International criticism", { investor: -3, trust: -2 }, { duration: 6 });
      return { text: "A rights group documented abuses during the security surge. Partners are cooling and investors are nervous.", tone: "bad" };
    },
  },
  creditCrunch: {
    tone: "bad",
    resolve: (s) => {
      if (!policyOn(s, "tightMoney")) return { text: "Rates came down before businesses were badly hurt.", tone: "good" };
      s.jobs.sme = clamp100(s.jobs.sme - 3);
      return { text: "A year of high interest rates has starved small businesses of credit; some have closed.", tone: "bad" };
    },
  },
  contractsCheaper: {
    tone: "good",
    resolve: (s) => {
      if (!policyOn(s, "eProcure")) return { text: "Open contracting was dropped before it could pay off.", tone: "bad" };
      s.gov.procurement = clamp100(s.gov.procurement + 5);
      return { text: "A year of open contracting has made projects cheaper and harder to rig.", tone: "good" };
    },
  },
  ghostWorkers: {
    tone: "good",
    resolve: (s) => {
      if (!policyOn(s, "civilService")) return { text: "Civil service reform stalled before the payroll audit finished.", tone: "neutral" };
      addMod(s, "echo:ghost", "Ghost workers removed", { revenue: 35 }, { duration: null });
      return { text: `The payroll audit removed thousands of ghost workers, saving about ${nb(35)} a month for good.`, tone: "good" };
    },
  },
  registerQuality: {
    tone: "mixed",
    resolve: (s) => {
      if (delivery(s) < 0.78) { s.gov.trust = clamp100(s.gov.trust - 2); addMod(s, "echo:register", "Leaky payment register", { corruption: 1 }, { duration: 6 }); return { text: "Reporters found ghost names on the cash-transfer register. Weak systems are leaking money.", tone: "bad" }; }
      addMod(s, "echo:register", "Transfers reaching families", { happiness: 1 }, { duration: 8 });
      return { text: "Cash transfers are reaching the families they were meant for.", tone: "good" };
    },
  },
  fuelShockWave: {
    tone: "bad",
    resolve: (s) => {
      if (s.fuel.transfers) { addMod(s, "echo:fuelwave", "Fares rise (cushioned)", { foodPrice: 1 }, { duration: 2 }); return { text: "Transport fares followed fuel up, but transfers cushioned the poorest households.", tone: "neutral" }; }
      addMod(s, "echo:fuelwave", "Transport fares follow fuel", { foodPrice: 3, happiness: -1 }, { duration: 3 });
      return { text: "Bus fares and food prices have followed the fuel price up.", tone: "bad" };
    },
  },
  transfersVerdict: {
    tone: "mixed",
    resolve: (s) => {
      if (delivery(s) >= 0.78) { s.gov.trust = clamp100(s.gov.trust + 3); return { text: "Six months on, targeted transfers are working: the poor are protected and the budget is healthier.", tone: "good" }; }
      s.gov.trust = clamp100(s.gov.trust - 3);
      return { text: "Six months on, many poor families never received the promised transfers. Government systems were not ready.", tone: "bad" };
    },
  },
  bondRepay: {
    tone: "mixed",
    resolve: (s, e) => {
      const fx0 = s.history.find((h) => h.month >= e.causeMonth)?.fx ?? s.eco.fx;
      const rise = s.eco.fx / fx0 - 1;
      if (rise > 0.12) { const hit = 120 * rise * 5; s.fin.treasury -= hit; return { text: `The naira has fallen ${Math.round(rise * 100)}% since you borrowed in dollars. Repaying that debt now costs about ${nb(hit)} more.`, tone: "bad" }; }
      return { text: "The naira held since you borrowed in dollars, so the debt has not grown in naira terms.", tone: "good" };
    },
  },
  crowdOut: {
    tone: "bad",
    resolve: (s) => { addMod(s, "echo:crowd", "Banks lend to government, not business", { sme: -2 }, { duration: 8 }); return { text: "Banks are lending to the government instead of businesses. Small firms struggle to borrow.", tone: "bad" }; },
  },
  contractorFails: {
    tone: "bad",
    resolve: (s, e) => {
      const p = s.projects.find((x) => e.id.includes(`:${x.id}:`));
      if (p && (p.status === "active" || p.status === "stalled")) { p.delay += 3; p.quality = Math.max(0.2, p.quality - 0.1); p.notes.push("Your friend's firm subcontracted the work and fell behind"); }
      s.me.evidence = clamp100(s.me.evidence + 5);
      return { text: "Your friend's firm sold the contract on to a subcontractor. The work is behind and journalists are asking who chose them.", tone: "bad" };
    },
  },
  demandsReturn: {
    tone: "bad",
    resolve: (s, e, rng) => {
      const r = e.stateId ? s.regions[e.stateId] : undefined;
      if (r && r.unrest > 35 && rng.chance(0.6)) { createEvent(s, "foodProtest", e.stateId!); return { text: `Protest leaders in ${sname(e.stateId)} say the deal was not honoured and are back on the streets.`, tone: "bad" }; }
      return { text: `The deal with protest leaders in ${sname(e.stateId)} has held.`, tone: "good" };
    },
  },
  fightersRegroup: {
    tone: "bad",
    resolve: (s, e, rng) => {
      if (rng.chance(s.sec.forces > 55 ? 0.25 : 0.5)) { createEvent(s, "banditry", e.stateId ?? hottest(s, "insecurity")); return { text: "Some fighters who took the amnesty have regrouped and returned to violence.", tone: "bad" }; }
      addMod(s, "echo:amnesty", "Amnesty holds", { security: 2 }, { duration: 6 });
      return { text: "The amnesty has held: former fighters are in training programmes.", tone: "good" };
    },
  },
  kickbackTrail: {
    tone: "bad",
    resolve: (s) => { s.me.evidence = clamp100(s.me.evidence + 10); return { text: "Journalists have found the front company that paid you. The paper trail is getting longer.", tone: "bad" }; },
  },
  whistleblowerPraise: {
    tone: "good",
    resolve: (s) => { s.gov.trust = clamp100(s.gov.trust + 1); addMod(s, "echo:whistle", "Reputation for integrity", { investor: 1.5 }, { duration: 8 }); return { text: "Your refusal to take a bribe became public. Investors and voters noticed.", tone: "good" }; },
  },
  coverupLeak: {
    tone: "bad",
    resolve: (s, _e, rng) => {
      if (rng.chance(0.5)) { s.me.evidence = clamp100(s.me.evidence + 20); s.me.scandals += 1; s.gov.trust = clamp100(s.gov.trust - 6); return { text: "A former aide leaked documents about the cover-up. It is now a full scandal.", tone: "bad" }; }
      return { text: "The cover-up has held, for now.", tone: "neutral" };
    },
  },
  factoryOpens: {
    tone: "mixed",
    resolve: (s) => {
      if (powerRatio(s) >= 0.27) { addMod(s, "echo:factory", "New factory hiring", { jobs: -0.3, exports: 0.06 }, { duration: null }); return { text: "The new factory is running full shifts and exporting.", tone: "good" }; }
      return { text: "The new factory opened but runs on diesel generators because of blackouts; it hired fewer people than promised.", tone: "bad" };
    },
  },
  loanConditions: {
    tone: "mixed",
    resolve: (s) => {
      if (policyOn(s, "eProcure") || policyOn(s, "taxDrive")) return { text: "Lenders were satisfied with your reforms and released the rest of the loan on time.", tone: "good" };
      s.fin.treasury -= 300;
      return { text: `Lenders held back ${nb(300)} of the loan until you deliver reforms (open contracting or a tax drive).`, tone: "bad" };
    },
  },
  oilBust: {
    tone: "mixed",
    resolve: (s) => {
      if (s.eco.oilPrice < 80) { addMod(s, "echo:oilbust", "Oil windfall spent", { revenue: -60 }, { duration: 6 }); return { text: "Oil prices fell back and the windfall was already spent. The budget is squeezed.", tone: "bad" }; }
      return { text: "Oil prices stayed high, so spending the windfall did not leave a hole.", tone: "good" };
    },
  },
  rainyDayFund: {
    tone: "good",
    resolve: (s) => {
      if (s.eco.oilPrice < 80) { addMod(s, "echo:rainy", "Savings cushion", { investor: 3 }, { duration: 6 }); return { text: "Oil prices fell, but the windfall you saved is cushioning the naira.", tone: "good" }; }
      return { text: "Your saved windfall sits in reserves, a quiet insurance policy.", tone: "neutral" };
    },
  },
  gridRelapse: {
    tone: "bad",
    resolve: (s) => {
      if (policyOn(s, "gridMaint")) return { text: "Regular maintenance kept the emergency repairs working.", tone: "good" };
      addMod(s, "echo:grid", "Patched lines fail again", { power: -260 }, { duration: 3 });
      return { text: "The emergency patches failed without regular maintenance. Blackouts are back.", tone: "bad" };
    },
  },
  subsidyCreep: {
    tone: "bad",
    resolve: (s) => { s.gov.opposition = clamp100(s.gov.opposition - 1); return { text: `Restoring part of the subsidy calmed the streets, but it now costs ${nb(s.fuel.costMonthly)} a month again.`, tone: "neutral" }; },
  },
};

export function scheduleEcho(s: FixState, kind: string, cause: string, delay: number, hint: string, opts: { stateId?: string; key?: string } = {}) {
  const def = ECHOES[kind];
  if (!def) return;
  const id = `echo:${kind}:${opts.key ?? ""}:${s.month}`;
  if (s.echoes.some((e) => e.id === id)) return;
  s.echoes.push({ id, kind, cause, causeMonth: s.month, due: s.month + Math.max(1, Math.round(delay)), hint, tone: def.tone, stateId: opts.stateId, status: "pending" });
  if (s.echoes.length > 160) s.echoes = s.echoes.filter((e, i) => e.status === "pending" || i > s.echoes.length - 100);
}

/** Phase 5 of the monthly turn: consequences of earlier decisions arrive. */
export function resolveEchoes(s: FixState) {
  for (const e of s.echoes) {
    if (e.status !== "pending" || e.due > s.month) continue;
    const out = ECHOES[e.kind].resolve(s, e, subRng(s.meta.seed, "echo", e.id));
    e.status = "done";
    e.outcome = out.text;
    e.outTone = out.tone;
    pushReport(s, { title: `Consequence: ${e.hint}`, tone: out.tone, lines: [`Because ${e.cause.charAt(0).toLowerCase()}${e.cause.slice(1)} in ${monthLabel(e.causeMonth)}:`, out.text] });
    pushNews(s, { source: `echo:${e.id}`, headline: out.text.split(/[.:]/)[0], body: `${out.text} (Follows a decision in ${monthLabel(e.causeMonth)}.)`, tone: out.tone, stateId: e.stateId });
  }
}

// ---------------------------------------------------------------- what each decision plants
type Plan = { kind: string; delay: number | ((s: FixState) => number); hint: string };
export const MEASURE_ECHO: Record<string, Plan> = {
  grainReserve: { kind: "emptySilos", delay: (s) => { let d = 3; while (calMonth(s.month + d) !== 5) d++; return d; }, hint: "Grain silos may be empty when the next lean season comes" },
  foodVouchers: { kind: "programmeEnds", delay: 4, hint: "Vouchers end; families may feel a cliff edge" },
  fuelTransferWave: { kind: "programmeEnds", delay: 4, hint: "Transport allowance ends; anger may return" },
  jobsBlitz: { kind: "programmeEnds", delay: 5, hint: "Temporary jobs end" },
  fxSale: { kind: "reservesQuestion", delay: 4, hint: "Markets will judge whether reserves can last" },
  importCurb: { kind: "smuggling", delay: 3, hint: "Smuggling may grow around the import limits" },
  dialogue: { kind: "promiseCheck", delay: 6, hint: "People will judge whether the dialogue changed anything" },
  auditSweep: { kind: "auditFindings", delay: 4, hint: "Audit findings will be published" },
  securityPush: { kind: "retaliation", delay: 3, hint: "Armed groups may retaliate if troops behave badly" },
  wageDeal: { kind: "otherUnions", delay: 5, hint: "Other unions may demand the same deal" },
  investorRoadshow: { kind: "investorVisit", delay: 6, hint: "Investors will visit to see conditions for themselves" },
  overtimeGrid: { kind: "gridRelapse", delay: 6, hint: "Patched grid lines may fail without regular maintenance" },
};
export const POLICY_ECHO: Record<string, Plan> = {
  foodImport: { kind: "farmersHurt", delay: 8, hint: "Local farmers may be undercut by cheap imports" },
  eduCut: { kind: "cutsBite", delay: 18, hint: "Education cuts will show up in skills and exam results" },
  healthCut: { kind: "cutsBite", delay: 14, hint: "Health cuts may lead to outbreaks" },
  troopSurge: { kind: "rightsReport", delay: 9, hint: "International observers will report on troop conduct" },
  tightMoney: { kind: "creditCrunch", delay: 10, hint: "Long high rates may starve small businesses of credit" },
  eProcure: { kind: "contractsCheaper", delay: 12, hint: "Open contracting should start making projects cheaper" },
  civilService: { kind: "ghostWorkers", delay: 10, hint: "The payroll audit should find ghost workers" },
  cashTransfers: { kind: "registerQuality", delay: 6, hint: "Reporters will check whether transfers reach real families" },
};
export const EVENT_ECHO: Record<string, Plan & { when?: "ok" | "fail" | "any" }> = {
  "foodProtest:negotiate": { kind: "demandsReturn", delay: 8, hint: "Protest leaders will check the deal was honoured", when: "ok" },
  "fuelProtest:negotiate": { kind: "demandsReturn", delay: 8, hint: "Unions will check the deal was honoured", when: "ok" },
  "youthProtest:negotiate": { kind: "demandsReturn", delay: 8, hint: "Youth leaders will check the deal was honoured", when: "ok" },
  "fuelProtest:allowance": { kind: "programmeEnds", delay: 4, hint: "Transport allowance ends", when: "any" },
  "fuelProtest:partial": { kind: "subsidyCreep", delay: 6, hint: "The restored subsidy bill will come back", when: "any" },
  "labourStrike:deal": { kind: "otherUnions", delay: 5, hint: "Other unions may demand the same", when: "any" },
  "banditry:talks": { kind: "fightersRegroup", delay: 6, hint: "Amnestied fighters may regroup", when: "ok" },
  "banditry:surge": { kind: "retaliation", delay: 3, hint: "Armed groups may retaliate", when: "any" },
  "kickback:accept": { kind: "kickbackTrail", delay: 10, hint: "The payment left a paper trail", when: "any" },
  "kickback:report": { kind: "whistleblowerPraise", delay: 3, hint: "Your integrity may become public", when: "ok" },
  "investigation:obstruct": { kind: "coverupLeak", delay: 8, hint: "Insiders may leak the cover-up", when: "ok" },
  "investorOffer:accept": { kind: "factoryOpens", delay: 10, hint: "The factory opens: it needs reliable power", when: "ok" },
  "investorOffer:counter": { kind: "factoryOpens", delay: 10, hint: "The factory opens: it needs reliable power", when: "ok" },
  "loanOffer:accept": { kind: "loanConditions", delay: 6, hint: "Lenders will check your reforms", when: "any" },
  "loanOffer:smaller": { kind: "loanConditions", delay: 6, hint: "Lenders will check your reforms", when: "any" },
  "oilWindfall:spend": { kind: "oilBust", delay: 10, hint: "If oil prices fall, the spent windfall leaves a hole", when: "any" },
  "oilWindfall:save": { kind: "rainyDayFund", delay: 10, hint: "Saved windfall will cushion a downturn", when: "any" },
  "gridCollapse:repair": { kind: "gridRelapse", delay: 6, hint: "Repairs may fail without maintenance", when: "ok" },
};

const delayOf = (p: Plan, s: FixState) => (typeof p.delay === "function" ? p.delay(s) : p.delay);
export function plantForMeasure(s: FixState, id: string, name: string) {
  const p = MEASURE_ECHO[id];
  if (p) scheduleEcho(s, p.kind, `You used “${name}”`, delayOf(p, s), p.hint, { key: id });
}
export function plantForPolicy(s: FixState, id: string, name: string) {
  const p = POLICY_ECHO[id];
  if (p) scheduleEcho(s, p.kind, `You started “${name}”${id === "eduCut" ? " (education)" : ""}`, delayOf(p, s), p.hint, { key: id });
}
export function plantForEvent(s: FixState, tpl: string, opt: string, ok: boolean, label: string, stateId: string) {
  const p = EVENT_ECHO[`${tpl}:${opt}`];
  if (!p) return;
  if (p.when === "ok" && !ok) return;
  if (p.when === "fail" && ok) return;
  scheduleEcho(s, p.kind, `You chose “${label}”`, delayOf(p, s), p.hint, { stateId, key: `${tpl}-${opt}-${stateId}` });
}
/** future consequence hint for UI previews */
export function futureHint(ref: { type: string; id?: string; action?: string; eventTpl?: string; optionId?: string }): string | null {
  if (ref.type === "measure" && ref.id) return MEASURE_ECHO[ref.id]?.hint ?? null;
  if (ref.type === "policy" && ref.id) return POLICY_ECHO[ref.id]?.hint ?? null;
  if (ref.type === "fuel") return ref.action === "reform" ? "In 6 months: verdict on whether transfers reach the poor" : ref.action === "increase" ? "The subsidy bill grows if the naira weakens" : "Fares and food prices follow fuel up within months";
  if (ref.type === "respond" && ref.eventTpl && ref.optionId) return EVENT_ECHO[`${ref.eventTpl}:${ref.optionId}`]?.hint ?? null;
  if (ref.type === "bond") return "If the naira falls, this dollar debt costs more to repay";
  if (ref.type === "project") return "Benefits arrive only when it is finished; delays are common";
  return null;
}
