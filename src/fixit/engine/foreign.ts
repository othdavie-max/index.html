/**
 * Foreign relations. The IMF lends with strings, China builds with strings, America helps with strings, and ECOWAS
 * watches how you treat democracy. Relations move with what you do at home. All figures are simulated.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp100, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";

export const PARTNERS = [
  { id: "imf", name: "IMF & World Bank", icon: "🏦", blurb: "Loans and credibility. They want a floating naira, no fuel subsidy and honest books." },
  { id: "china", name: "China", icon: "🇨🇳", blurb: "Builds railways and ports fast and asks for oil and loyalty. Does not mind how you rule." },
  { id: "usa", name: "United States & EU", icon: "🇺🇸", blurb: "Security help and market access, but they watch human rights and elections very closely." },
  { id: "ecowas", name: "ECOWAS & African Union", icon: "🌍", blurb: "The neighbours. They will suspend you if you cling to power, and trade with you if you do not." },
] as const;
export type PartnerId = (typeof PARTNERS)[number]["id"];
const note = (s: FixState, text: string) => { s.foreign.log.push({ month: s.month, text }); if (s.foreign.log.length > 30) s.foreign.log.shift(); };
export const relWord = (v: number) => (v >= 75 ? "Warm" : v >= 55 ? "Friendly" : v >= 35 ? "Cool" : v >= 20 ? "Hostile" : "Pariah");

export function foreignMonthly(s: FixState, rng: Rng) {
  const F = s.foreign, P = s.rule;
  const target: Record<PartnerId, number> = {
    imf: 46 + 0.35 * (s.gov.transparency - 38) - 0.5 * Math.max(0, s.eco.inflation - 20) + (F.imf && !F.imf.suspended ? 10 : 0) - (F.imf?.suspended ? 25 : 0),
    china: 50 + (P.democracy < 45 ? 8 : 0) + (F.china ? 18 : 0) - 0.15 * Math.max(0, P.intlPressure - 40) * 0,
    usa: 52 + 0.55 * (P.democracy - 55) - 5 * Math.min(4, P.executions) - 3 * Math.min(4, P.wrongful) - (P.stolenElection ? 20 : 0) + (F.usaAid && !F.usaAid.suspended ? 6 : 0),
    ecowas: 56 + 0.4 * (P.democracy - 55) - (s.flags.illegitimate !== undefined ? 35 : 0) - (P.maxTerms >= 99 ? 10 : 0),
  };
  for (const p of PARTNERS) F.rel[p.id] = clamp100(F.rel[p.id] + 0.07 * (target[p.id] - F.rel[p.id]) + rng.normal(0, 0.4));
  // the IMF programme: tranches, conditions, breaches
  if (F.imf && !F.imf.suspended) {
    s.eco.reserves += 0.22; F.imf.tranches += 1;
    const floatOk = s.eco.fxDefence < 0.2, subsidyOk = s.month - F.imf.since < 12 || s.fuel.coverage < 0.15;
    F.imf.breach = floatOk && subsidyOk ? Math.max(0, F.imf.breach - 1) : F.imf.breach + 1;
    if (F.imf.breach >= 3) {
      F.imf.suspended = true; removeMods(s, "foreign:imf"); s.eco.investor = clamp100(s.eco.investor - 6); F.rel.imf = clamp100(F.rel.imf - 18);
      const why = !floatOk ? "you kept propping up the naira" : "the fuel subsidy is still in place";
      pushNews(s, { source: `imfsus:${s.month}`, headline: "IMF suspends Nigeria's programme", body: `The Fund says ${why}. Investors take note.`, tone: "bad" }); note(s, `IMF programme suspended: ${why}.`);
    }
  }
  // American security help needs clean hands
  if (F.usaAid && !F.usaAid.suspended && (P.executions > 0 || P.democracy < 42 || P.stolenElection)) {
    F.usaAid.suspended = true; removeMods(s, "foreign:usa"); F.rel.usa = clamp100(F.rel.usa - 12);
    pushNews(s, { source: `usasus:${s.month}`, headline: "Washington suspends military assistance", body: "Officials cite executions, a weak democracy or a disputed election.", tone: "bad" }); note(s, "American aid suspended over human rights.");
  }
  // offers
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  const gap = (k: string, m: number) => s.month - Number(s.flags[`lastOffer:${k}`] ?? -99) >= m;
  const make = (tpl: string) => { s.flags[`lastOffer:${tpl}`] = s.month; createEvent(s, tpl, "NG-FC"); };
  if (!F.imf && !open("imfOffer") && gap("imfOffer", 20) && (s.eco.reserves < 26 || s.eco.inflation > 27) && s.month >= 5 && rng.chance(0.14)) make("imfOffer");
  if (!F.china && !open("chinaOffer") && gap("chinaOffer", 30) && s.month >= 8 && rng.chance(0.05)) make("chinaOffer");
  if (!F.usaAid && !open("usaOffer") && gap("usaOffer", 30) && s.sec.index > 52 && s.month >= 6 && rng.chance(0.07) && F.rel.usa >= 40) make("usaOffer");
  if (s.month % 12 === 4 && s.flags.summit !== Math.floor(s.month / 12) && !open("ecowasSummit")) { s.flags.summit = Math.floor(s.month / 12); createEvent(s, "ecowasSummit", "NG-FC"); }
}

const accept = (s: FixState, k: "imf" | "china" | "usa") => {
  const F = s.foreign;
  if (k === "imf") {
    F.imf = { since: s.month, tranches: 0, breach: 0, suspended: false }; F.rel.imf = clamp100(F.rel.imf + 15);
    addMod(s, "foreign:imf", "IMF programme: credibility and cheaper money", { investor: 4, inflation: -0.6, trust: 0.5 }, { duration: null, ramp: 3 });
    addMod(s, "foreign:imf:pain", "IMF conditions: austerity and a floating naira", { happiness: -0.7 }, { duration: 14, ramp: 2 });
    s.eco.reserves += 1.5; note(s, "IMF programme signed: float the naira, end the fuel subsidy within a year.");
  } else if (k === "china") {
    F.china = { since: s.month }; F.rel.china = clamp100(F.rel.china + 22); F.rel.usa = clamp100(F.rel.usa - 6);
    addMod(s, "foreign:china", "Chinese-built railway and port", { rail: 7, ports: 3, transport: 2, jobs: 0.6 }, { duration: null, ramp: 18 });
    addMod(s, "foreign:china:oil", "Oil revenue pledged to Chinese loan", { revenue: -55 }, { duration: null, ramp: 1 });
    note(s, "Chinese rail-for-oil deal signed: oil revenue pledged for years.");
  } else {
    F.usaAid = { since: s.month, suspended: false }; F.rel.usa = clamp100(F.rel.usa + 12);
    addMod(s, "foreign:usa", "American security assistance", { security: 4, forces: 3 }, { duration: null, ramp: 4 });
    note(s, "American security assistance agreed: clean hands required.");
  }
};
export const FOREIGN_TEMPLATES = [
  {
    id: "imfOffer", kind: "global" as const, urgency: 2,
    title: () => "The IMF offers a rescue programme",
    cause: (s: FixState) => `Reserves are $${s.eco.reserves.toFixed(0)}bn and inflation is ${Math.round(s.eco.inflation)}%. The Fund will lend about $3bn over time and investors will relax, but with conditions: let the naira float, end the fuel subsidy within a year, publish contracts. "We do not impose. We only insist."`,
    options: [
      { id: "sign", label: "Sign the programme", explain: "Credibility, cash, and pain.", cost: 0, tradeoff: "Austerity is unpopular. Break the conditions and it is cancelled.", unc: "medium" as const, chance: () => 0.95, win: { run: (s: FixState) => { accept(s, "imf"); return "The programme is signed. Reserves get a boost, investors relax, and the unions start counting days."; } }, lose: {}, winText: "", loseText: "" },
      { id: "negotiate", label: "Negotiate a softer version", explain: "Hold out for more time.", cost: 0, tradeoff: "They may walk away.", unc: "high" as const, chance: () => 0.45, win: { run: (s: FixState) => { accept(s, "imf"); s.foreign.imf!.since += 6; return "The Fund gave you six extra months on the subsidy. Your minister called it a diplomatic win."; } }, lose: { run: (s: FixState) => { s.foreign.rel.imf = clamp100(s.foreign.rel.imf - 8); return "The Fund said the offer stands for a month. Then it was withdrawn."; } }, winText: "", loseText: "" },
      { id: "no", label: "Refuse: 'we do not take orders'", explain: "A nationalist moment.", cost: 0, tradeoff: "Investors worry; the street cheers.", unc: "low" as const, chance: () => 1, win: { trust: 2, groups: { workers: 3, youth: 2 }, run: (s: FixState) => { s.foreign.rel.imf = clamp100(s.foreign.rel.imf - 10); s.eco.investor = clamp100(s.eco.investor - 2); return "The press called it 'sovereignty'. The markets called it a risk."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "The offer lapsed.",
  },
  {
    id: "chinaOffer", kind: "global" as const, urgency: 3,
    title: () => "China offers to build your railway for oil",
    cause: () => "A delegation from Beijing offers to build a railway and a deep-sea port, financed by a loan secured on future oil revenue. It will be fast, quiet and no questions will be asked about how you run the country. The cost is that a slice of oil money is already spoken for.",
    options: [
      { id: "accept", label: "Accept the rail-for-oil deal", explain: "Fast infrastructure, pledged revenue.", cost: 0, tradeoff: "Less oil revenue for years; America is annoyed.", unc: "low" as const, chance: () => 0.95, win: { run: (s: FixState) => { accept(s, "china"); return "Excavators arrived within the quarter. The revenue pledge was read by very few people."; } }, lose: {}, winText: "", loseText: "" },
      { id: "no", label: "Politely decline", explain: "Keep your options open.", cost: 0, tradeoff: "Beijing remembers.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.foreign.rel.china = clamp100(s.foreign.rel.china - 6); return "They left, promising to return."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "usaOffer", kind: "global" as const, urgency: 3,
    title: () => "Washington offers security assistance",
    cause: () => "The Americans will train and equip special units and share intelligence. The price is that they watch how you use them: executions, a rigged election or a crackdown will end it, and you will hear about it on the evening news.",
    options: [
      { id: "accept", label: "Accept with thanks", explain: "Better troops and intelligence.", cost: 0, tradeoff: "It ends if you break the rules.", unc: "low" as const, chance: () => 0.95, win: { run: (s: FixState) => { accept(s, "usa"); return "The first trainers arrived with a thick binder of conditions."; } }, lose: {}, winText: "", loseText: "" },
      { id: "no", label: "Decline: 'we handle our own security'", explain: "Independence.", cost: 0, tradeoff: "You stay on your own.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.foreign.rel.usa = clamp100(s.foreign.rel.usa - 3); return "They said the offer could be reopened."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "ecowasSummit", kind: "moment" as const, urgency: 4,
    title: () => "ECOWAS summit: your neighbours are watching",
    cause: (s: FixState) => `The regional heads of state meet this week. ${s.rule.democracy < 50 ? "Several leaders will ask pointed questions about your democracy." : "You are expected to lead on regional security and trade."}`,
    options: [
      { id: "lead", label: "Attend and offer leadership: troops and trade", explain: "Be the regional big brother.", cost: 15, tradeoff: "Costs money, earns respect.", unc: "medium" as const, chance: (s: FixState) => 0.4 + 0.4 * (s.rule.democracy / 100), win: { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 12); s.rule.intlPressure = Math.max(0, s.rule.intlPressure - 4); addMod(s, "foreign:ecowas", "ECOWAS trade deal", { exports: 0.5 }, { duration: 12, ramp: 2 }); return "You were applauded. A trade corridor deal was announced."; } }, lose: { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 4); return "A smaller leader lectured you about democracy on live TV."; } }, winText: "", loseText: "" },
      { id: "send", label: "Send the foreign minister", explain: "Low profile.", cost: 0, tradeoff: "Nothing gained.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 1); return "A quiet summit."; } }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
];
