/**
 * Investor deals. When investors trust Nigeria, real offers arrive: a private refinery, a solar park, a garment hub.
 * You choose the terms, you watch the project rise, and when it opens you see exactly what it did for the country.
 * All companies and projects are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Deal, Effects, FixState } from "./types";
import { addMod, clamp100, nb, pushNews, pushReport } from "./util";
import { createEvent } from "./spawn";

interface DealDef { id: string; name: string; sector: string; icon: string; sites: string[]; capex: number; months: number; jobs: number; effects: Effects; revenue: number; blurb: string; min: number }
export const DEAL_DEFS: DealDef[] = [
  { id: "privRefinery", name: "Coastal Private Refinery", sector: "Oil & fuel", icon: "🛢️", sites: ["NG-LA", "NG-OG", "NG-RI"], capex: 900, months: 28, jobs: 3500, effects: { refinery: 220, jobs: 1.2, exports: 0.4 }, revenue: 30, blurb: "A privately funded refinery that would make a quarter of the country's petrol at home.", min: 50 },
  { id: "solarPark", name: "Northern Solar Park", sector: "Power", icon: "☀️", sites: ["NG-KN", "NG-KT", "NG-SO", "NG-JI"], capex: 280, months: 20, jobs: 1800, effects: { power: 260, grid: 1, jobs: 0.5 }, revenue: 10, blurb: "500 MW of solar power for the northern grid.", min: 45 },
  { id: "garmentHub", name: "Aba Garment & Leather Hub", sector: "Manufacturing", icon: "👕", sites: ["NG-AB", "NG-AN", "NG-KN"], capex: 120, months: 16, jobs: 22000, effects: { manuf: 3, jobs: 1.5, exports: 0.6, sme: 1 }, revenue: 6, blurb: "A factory cluster for clothes and shoes, with 22,000 jobs.", min: 40 },
  { id: "dataCentre", name: "Lagos Data Centre Campus", sector: "Technology", icon: "💾", sites: ["NG-LA", "NG-FC"], capex: 200, months: 14, jobs: 900, effects: { investor: 3, jobs: 0.6, skills: 1, exports: 0.3 }, revenue: 14, blurb: "A big cloud campus that brings developers and foreign currency.", min: 55 },
  { id: "gasPlant", name: "Delta Gas Processing Plant", sector: "Power", icon: "🔥", sites: ["NG-DE", "NG-BY", "NG-AK"], capex: 380, months: 24, jobs: 2200, effects: { gas: 6, power: 180, crude: 20 }, revenue: 22, blurb: "Captures flared gas and feeds power stations.", min: 50 },
  { id: "fertiliser", name: "Niger Fertiliser Plant", sector: "Agriculture", icon: "🌱", sites: ["NG-NI", "NG-KD", "NG-OG"], capex: 160, months: 18, jobs: 2800, effects: { inputs: 8, foodSupply: 1.5, jobs: 0.4 }, revenue: 8, blurb: "Cheaper fertiliser for millions of farmers.", min: 42 },
  { id: "lightRail", name: "Abuja Light Rail (PPP)", sector: "Transport", icon: "🚆", sites: ["NG-FC"], capex: 450, months: 30, jobs: 5000, effects: { rail: 4, transport: 2, jobs: 0.5 }, revenue: 12, blurb: "A modern city rail system for the capital.", min: 52 },
];
export const DEAL_DEF_BY_ID = Object.fromEntries(DEAL_DEFS.map((d) => [d.id, d]));

const sname = (id: string) => STATE_BY_ID[id]?.name ?? id;
const offerOf = (s: FixState) => DEAL_DEFS.find((d) => d.id === s.flags.offerDef);
export const dealsBuilding = (s: FixState) => (s.deals ?? []).filter((d) => d.status === "building");
export const dealsOpen = (s: FixState) => (s.deals ?? []).filter((d) => d.status === "open");

function startDeal(s: FixState, def: DealDef, terms: "generous" | "fair") {
  const site = String(s.flags.offerSite ?? def.sites[0]);
  const months = Math.round(def.months * (terms === "generous" ? 0.8 : 1));
  const deal: Deal = { id: `d${s.deals.length + 1}`, name: def.name, sector: def.sector, stateId: site, capex: def.capex, jobs: def.jobs, start: s.month, months, progress: 0, status: "building", terms, benefit: def.blurb, effects: def.effects, revenue: def.revenue * (terms === "generous" ? 0.6 : 1) };
  s.deals.push(deal);
  pushNews(s, { source: `deal:${deal.id}`, headline: `Investors break ground: ${def.name} in ${sname(site)}`, body: `${def.blurb} Cost to investors about ${nb(def.capex)}.`, tone: "good" });
}

/** Monthly: offers arrive when investors are confident, and projects rise and open. */
export function investorsMonthly(s: FixState, rng: Rng) {
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  const inv = s.eco.investor;
  if (!open("investorOffer") && s.month >= 5 && inv >= 40 && s.month - Number(s.flags.lastOffer ?? -9) >= 6 && rng.chance(0.08 + 0.004 * Math.max(0, inv - 40))) {
    const taken = new Set(s.deals.map((d) => d.name));
    const pool = DEAL_DEFS.filter((d) => inv >= d.min && !taken.has(d.name));
    if (pool.length) { const def = rng.pick(pool); s.flags.offerDef = def.id; s.flags.offerSite = rng.pick(def.sites); s.flags.lastOffer = s.month; createEvent(s, "investorOffer", String(s.flags.offerSite)); }
  }
  for (const d of s.deals) {
    if (d.status === "building" || d.status === "stalled") {
      const stall = s.eco.investor < 30 || s.sec.index > 70 || s.rule.democracy < 25;
      d.status = stall ? "stalled" : "building";
      if (!stall) d.progress = Math.min(1, d.progress + 1 / d.months);
      if (d.progress >= 1) {
        d.status = "open"; d.opened = s.month;
        addMod(s, `deal:${d.id}`, `${d.name} opens`, d.effects, { duration: null, ramp: 4 });
        s.fin.treasury += 0;
        pushNews(s, { source: `dealopen:${d.id}`, headline: `${d.name} opens in ${sname(d.stateId)}: ${d.jobs.toLocaleString()} jobs`, body: d.benefit, tone: "good" });
        pushReport(s, { title: `Investor project opens: ${d.name}`, tone: "good", lines: [`${d.jobs.toLocaleString()} jobs created in ${sname(d.stateId)}.`, `${d.benefit}`, `It pays about ${nb(d.revenue)} a year in taxes and fees (${d.terms === "generous" ? "reduced by the tax holiday you granted" : "full rate"}).`] });
        s.flags.ribbon = d.id; createEvent(s, "ribbonCutting", d.stateId);
      }
    }
    if (d.status === "open") s.fin.treasury += d.revenue / 12;
  }
}

export const INVESTOR_TEMPLATES = [
  {
    id: "investorOffer", kind: "opportunity" as const, urgency: 4,
    title: (s: FixState) => `Investors offer: ${offerOf(s)?.name ?? "a big project"}`,
    cause: (s: FixState) => { const d = offerOf(s); return d ? `${d.icon} A consortium wants to build the ${d.name} in ${sname(String(s.flags.offerSite))}: ${d.blurb} It would cost them about ${nb(d.capex)} and create ${d.jobs.toLocaleString()} jobs. They ask for terms.` : ""; },
    options: [
      { id: "fair", label: "Accept on fair terms: local content and full taxes", explain: "Slower to close, but the country keeps the money.", cost: 0, tradeoff: "They may walk away.", unc: "medium" as const, chance: (s: FixState) => 0.5 + 0.3 * (s.eco.investor / 100), win: { run: (s: FixState) => { const d = offerOf(s); if (d) startDeal(s, d, "fair"); return `Contracts signed. Ground will be broken within weeks.${d ? ` ${d.name} will take about ${d.months} months.` : ""}`; } }, lose: { run: () => "The consortium wanted better terms and walked away." }, winText: "", loseText: "" },
      { id: "generous", label: "Offer a 10-year tax holiday and free land", explain: "A sure deal, built faster, but the country earns less.", cost: 0, tradeoff: "Critics say you gave it away. The deal may attract favours.", unc: "low" as const, chance: () => 0.95, win: { corruption: 0.6, run: (s: FixState) => { const d = offerOf(s); if (d) startDeal(s, d, "generous"); return "They signed in a day. Opposition calls it a giveaway; the first bulldozers arrive."; } }, lose: {}, winText: "", loseText: "" },
      { id: "decline", label: "Decline: the terms are not good enough", explain: "Keep your options open.", cost: 0, tradeoff: "Investors notice.", unc: "low" as const, chance: () => 1, win: { run: () => "The consortium said it will take its money to Ghana." }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "The consortium took its money elsewhere.",
  },
  {
    id: "ribbonCutting", kind: "opportunity" as const, urgency: 5,
    title: (s: FixState) => { const d = s.deals.find((x) => x.id === s.flags.ribbon); return `Ribbon cutting: ${d?.name ?? "a new investor project"}`; },
    cause: (s: FixState) => { const d = s.deals.find((x) => x.id === s.flags.ribbon); return d ? `${d.name} is ready. The company wants you at the opening, with cameras. ${d.jobs.toLocaleString()} jobs, a happy governor and a crowd.` : ""; },
    options: [
      { id: "attend", label: "Cut the ribbon yourself", explain: "Be seen with a win.", cost: 3, tradeoff: "Looks like a photo-op if it is not working yet.", unc: "low" as const, chance: () => 0.9, win: { trust: 2.5, groups: { business: 3, youth: 2 }, mods: { happiness: 1.5 }, dur: 3 }, lose: {}, winText: "The crowd cheered. The governor cried.", loseText: "" },
      { id: "delegate", label: "Send the minister", explain: "Save your time.", cost: 0, tradeoff: "A smaller headline.", unc: "low" as const, chance: () => 1, win: { trust: 0.5 }, lose: {}, winText: "A quiet opening.", loseText: "" },
    ],
    expire: {}, expireText: () => "It opened without ceremony.",
  },
];
void clamp100;
