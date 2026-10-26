/**
 * The cabinet. Six ministers whose skill makes your policies work (or not), whose honesty decides how much leaks,
 * and whose faction is a political trade-off: technocrats are competent but have no political base, party loyalists
 * keep the party behind you, regional heavyweights deliver their zone's votes. All names are fictional.
 */
import { subRng } from "../../game/engine/rng";
import { STATE_BY_ID } from "../../game/data/states";
import type { Rng } from "../../game/engine/rng";
import type { Effects, Faction, FixState, Minister, Portfolio } from "./types";
import { addMod, clamp, clamp100, infraScore, pushNews, pushReport, removeMods } from "./util";

export const PORTFOLIOS: { id: Portfolio; title: string; area: string }[] = [
  { id: "finance", title: "Finance Minister", area: "Revenue, taxes and the budget" },
  { id: "cbn", title: "Central Bank Governor", area: "Inflation, interest rates and the naira" },
  { id: "agriculture", title: "Agriculture Minister", area: "Farming, food supply and storage" },
  { id: "power", title: "Power Minister", area: "Electricity generation and the grid" },
  { id: "works", title: "Works Minister", area: "Roads, maintenance and contracts" },
  { id: "security", title: "Security Adviser", area: "Troops, police and intelligence" },
];
export const PORTFOLIO_BY_ID = Object.fromEntries(PORTFOLIOS.map((p) => [p.id, p])) as Record<Portfolio, (typeof PORTFOLIOS)[number]>;
export const FACTION_LABEL: Record<Faction, { label: string; blurb: string }> = {
  technocrat: { label: "Technocrat", blurb: "Highly skilled, but has no political base. Investors like them." },
  loyalist: { label: "Party loyalist", blurb: "Keeps the party behind you and weakens the opposition. Often less skilled." },
  heavyweight: { label: "Regional heavyweight", blurb: "Brings votes from their home zone. Medium skill." },
};

const FIRST = ["Adebayo", "Folake", "Tunde", "Funmilayo", "Kunle", "Chukwuemeka", "Ngozi", "Obinna", "Adaeze", "Ifeanyi", "Aminu", "Hadiza", "Sani", "Zainab", "Bello", "Ebiere", "Tamuno", "Ene", "Oghenekaro", "Nenpin", "Terver", "Halima", "Yakubu", "Chiamaka", "Kayode", "Amina", "Emeka", "Ronke", "Musa", "Ifeoma"];
const LAST = ["Okafor", "Adeyemi", "Danjuma", "Eze", "Ogunleye", "Yusuf", "Ibrahim", "Nwosu", "Abubakar", "Akpan", "Iyorchia", "Ekanem", "Lawal", "Ojo", "Nnamdi", "Bassey", "Garba", "Olatunji", "Umeh", "Dikko", "Ayuba", "Ikwuemesi", "Sowore", "Fashola", "Tanko", "Agbaje", "Okon", "Mohammed", "Igwe", "Alabi"];
const TITLES = ["Dr", "Mrs", "Mr", "Engr", "Prof", "Alhaji", "Hajia", "Chief", "Barr"];
const TRAITS = ["Blunt", "Cautious", "Ambitious", "Loyal", "Media-savvy", "Stubborn", "Hard-working", "Well-connected"];
const ZONES = ["NC", "NE", "NW", "SE", "SS", "SW"];

function makeMinister(rng: Rng, portfolio: Portfolio, faction: Faction, i: number): Minister {
  const [sk, ig] = faction === "technocrat" ? [rng.range(68, 90), rng.range(55, 92)] : faction === "loyalist" ? [rng.range(32, 55), rng.range(28, 62)] : [rng.range(48, 66), rng.range(38, 72)];
  return {
    id: `m-${portfolio}-${i}`, name: `${rng.pick(TITLES)} ${rng.pick(FIRST)} ${rng.pick(LAST)}`, portfolio, skill: Math.round(sk), integrity: Math.round(ig), faction,
    trait: rng.pick(TRAITS), zone: rng.pick(ZONES), since: 0, mood: 60,
  };
}

export function initCabinet(s: FixState) {
  const rng = subRng(s.meta.seed, "cabinet");
  const pool: Minister[] = [];
  const members: Partial<Record<Portfolio, Minister>> = {};
  for (const p of PORTFOLIOS) {
    const fs: Faction[] = ["loyalist", "technocrat", "heavyweight", rng.pick(["technocrat", "loyalist", "heavyweight"] as Faction[])];
    fs.forEach((f, i) => pool.push(makeMinister(rng, p.id, f, i)));
    // you inherit party loyalists as acting ministers; choosing your own team is your first big call
    members[p.id] = pool.find((m) => m.portfolio === p.id && m.faction === "loyalist");
  }
  s.cabinet = { members, pool: pool.filter((m) => !Object.values(members).includes(m)), reshuffles: 0 };
  for (const p of PORTFOLIOS) applyMinister(s, p.id);
}

/** effects of whoever holds (or does not hold) a portfolio */
export function ministerEffects(m: Minister | undefined, portfolio: Portfolio): Effects {
  const k = (m ? (m.skill - 50) / 50 : -0.5) * 0.7;
  const c = m ? Math.max(0, (50 - m.integrity) / 50) : 0;
  const base: Record<Portfolio, Effects> = {
    finance: { revenue: 80 * k, taxCompl: 4 * k, investor: 2 * k },
    cbn: { inflation: -2.5 * k, fxSupply: 0.2 * k, investor: 3 * k },
    agriculture: { foodSupply: 3 * k, postHarvest: 2 * k, inputs: 6 * k },
    power: { power: 420 * k, grid: 5 * k, gas: 4 * k },
    works: { maint: 6 * k, roads: 3 * k, procurement: 4 * k },
    security: { security: 5 * k, forces: 4 * k },
  };
  const e: Effects = { ...base[portfolio] };
  if (c > 0) { e.corruption = (e.corruption ?? 0) + 3 * c; e.procurement = (e.procurement ?? 0) - 4 * c; }
  if (m?.faction === "technocrat") e.investor = (e.investor ?? 0) + 1.5;
  return e;
}
function applyMinister(s: FixState, p: Portfolio) {
  removeMods(s, `minister:${p}`);
  const m = s.cabinet.members[p];
  addMod(s, `minister:${p}`, m ? `${PORTFOLIO_BY_ID[p].title}: ${m.name}` : `${PORTFOLIO_BY_ID[p].title}: vacant`, ministerEffects(m, p), { duration: null, ramp: 3 });
}

export function loyalistCount(s: FixState) { return Object.values(s.cabinet.members).filter((m) => m?.faction === "loyalist").length; }
export function heavyweightZones(s: FixState): string[] { return Object.values(s.cabinet.members).filter((m) => m?.faction === "heavyweight").map((m) => m!.zone); }

export interface CabResult { ok: boolean; message: string }
export function appoint(s: FixState, portfolio: Portfolio, candidateId: string): CabResult {
  const cand = s.cabinet.pool.find((m) => m.id === candidateId && m.portfolio === portfolio);
  if (!cand) return { ok: false, message: "That candidate is not available." };
  const old = s.cabinet.members[portfolio];
  const early = s.month <= 2;
  s.cabinet.pool = s.cabinet.pool.filter((m) => m.id !== candidateId);
  if (old) {
    s.cabinet.pool.push({ ...old, mood: 30 });
    if (!early) {
      s.gov.trust = clamp100(s.gov.trust - 0.5);
      if (old.faction === "loyalist") s.rival.popularity = clamp100(s.rival.popularity + 2);
      if (old.faction === "heavyweight") for (const [id, r] of Object.entries(s.regions)) if (zoneOf(id) === old.zone) r.unrest = clamp100(r.unrest + 4);
      for (const m of Object.values(s.cabinet.members)) if (m && m.portfolio !== portfolio) m.mood = clamp100(m.mood - 3);
    }
  }
  s.cabinet.members[portfolio] = { ...cand, since: s.month, mood: 65 };
  s.cabinet.reshuffles += early ? 0 : 1;
  applyMinister(s, portfolio);
  const lines = [
    `${cand.name} (${FACTION_LABEL[cand.faction].label}) takes over: skill ${cand.skill}, integrity ${cand.integrity}.`,
    old ? `${old.name} leaves the post${early ? "" : old.faction === "loyalist" ? "; party loyalists are unhappy and some drift to the opposition" : old.faction === "heavyweight" ? "; their home zone feels snubbed" : ""}.` : "The post had been vacant.",
    "Their effect builds up over three months.",
  ];
  pushReport(s, { title: `New ${PORTFOLIO_BY_ID[portfolio].title}`, tone: "neutral", lines });
  pushNews(s, { source: `appoint:${portfolio}`, headline: `${cand.name} named ${PORTFOLIO_BY_ID[portfolio].title}`, body: FACTION_LABEL[cand.faction].blurb, tone: "neutral" });
  return { ok: true, message: `${cand.name} is the new ${PORTFOLIO_BY_ID[portfolio].title}.` };
}
export function sack(s: FixState, portfolio: Portfolio, reason = "sacked"): CabResult {
  const m = s.cabinet.members[portfolio];
  if (!m) return { ok: false, message: "That post is already vacant." };
  delete s.cabinet.members[portfolio];
  applyMinister(s, portfolio);
  pushNews(s, { source: `sack:${portfolio}`, headline: `${m.name} ${reason === "resigned" ? "resigns as" : "removed as"} ${PORTFOLIO_BY_ID[portfolio].title}`, body: "The post is vacant until a replacement is named.", tone: "bad" });
  return { ok: true, message: `${m.name} is out. Appoint a replacement soon: a vacant post hurts.` };
}
export function zoneOf(stateId: string): string { return STATE_BY_ID[stateId]?.zone ?? ""; }

/** how their area has moved over three months: +1 better, -1 worse */
function areaTrend(s: FixState, p: Portfolio): number {
  const h = s.history;
  if (h.length < 4) return 0;
  const a = h[h.length - 4], b = h[h.length - 1];
  const d = p === "finance" ? b.treasury - a.treasury : p === "cbn" ? a.inflation - b.inflation : p === "agriculture" ? a.foodInflation - b.foodInflation : p === "power" ? (b.power - a.power) / 100 : p === "works" ? b.infra - a.infra : a.insecurity - b.insecurity;
  return Math.abs(d) < 0.3 ? 0 : Math.sign(d);
}

/** Monthly: moods, scandals, resignations. */
export function cabinetMonthly(s: FixState, rng: Rng, createScandal: (p: Portfolio) => void) {
  for (const p of PORTFOLIOS) {
    const m = s.cabinet.members[p.id];
    if (!m) continue;
    m.mood = clamp100(m.mood + 1.5 * areaTrend(s, p.id) + (s.gov.approval - 45) * 0.03 + rng.normal(0, 1));
    if (m.faction === "technocrat" && s.me.acts.includes("kickback")) m.mood = clamp100(m.mood - 1.5);
    const corrupt = Math.max(0, (50 - m.integrity) / 50);
    if (corrupt > 0 && s.month - m.since >= 3 && rng.chance(corrupt * 0.045)) { createScandal(p.id); continue; }
    if (m.mood < 18 && rng.chance(0.4)) {
      sack(s, p.id, "resigned");
      s.gov.trust = clamp100(s.gov.trust - 1);
      pushReport(s, { title: `${m.name} resigned`, tone: "bad", lines: [`Morale had collapsed (${Math.round(m.mood)}/100): their area kept getting worse${m.faction === "technocrat" ? " and they objected to how government is run" : ""}.`, `The ${p.title} post is now vacant.`] });
    }
  }
}
export const vacancies = (s: FixState) => PORTFOLIOS.filter((p) => !s.cabinet.members[p.id]);
export function cabinetScore(s: FixState): number {
  const ms = Object.values(s.cabinet.members).filter(Boolean) as Minister[];
  return ms.length ? Math.round(ms.reduce((a, m) => a + m.skill, 0) / 6) : 0;
}
export { clamp, infraScore };
