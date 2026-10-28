/**
 * The world league: 22 other countries with simulated numbers that move on their own, and one composite ranking
 * (economy, military, technology and influence). Nigeria climbs it as you build; the others do not stand still.
 * State lives in one JSON flag (`flags.world`). All figures are simulated and simplified.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { annualGdpNgn, clamp, clamp100, pushNews } from "./util";
import { dealsOf } from "./trade";

export type Region = "africa" | "europe" | "asia" | "americas" | "mideast";
export interface Country {
  id: string; name: string; flag: string; region: Region; blurb: string;
  gdp: number; g: number; baseG: number; mil: number; tech: number; inf: number; stab: number;
  /** yearly drift in military, technology and influence: what they are busy doing */
  trend: { mil: number; tech: number; inf: number };
  rel: number; slump?: number; boom?: number;
}
export interface WorldState { c: Country[]; ranks: Record<string, number>; best: number; lead: string[]; seeded: number; era: number; eraLog: { month: number; text: string }[]; tier: number; at: string | null; trips: Record<string, number>; invites: string[]; bloc: string[]; naira: string[]; reserve: boolean }
export const NG = "NG";

const mk = (id: string, name: string, flag: string, region: Region, gdp: number, g: number, mil: number, tech: number, inf: number, stab: number, trend: [number, number, number], blurb: string): Country =>
  ({ id, name, flag, region, blurb, gdp, g, baseG: g, mil, tech, inf, stab, trend: { mil: trend[0], tech: trend[1], inf: trend[2] }, rel: 50 });
const SEED: Country[] = [
  mk("us", "United States", "🇺🇸", "americas", 31000, 2.1, 95, 92, 95, 70, [0, 0.3, -0.4], "The biggest economy and the biggest army. Used to getting its way."),
  mk("cn", "China", "🇨🇳", "asia", 20500, 4.0, 86, 84, 84, 78, [0.8, 1.6, 1.0], "Rising fast in technology and influence, and building ports across Africa."),
  mk("de", "Germany", "🇩🇪", "europe", 5200, 1.0, 55, 82, 70, 82, [0.3, 0.1, -0.2], "Precise, rich and cautious. Sells machines to the world."),
  mk("in", "India", "🇮🇳", "asia", 4600, 6.0, 70, 62, 62, 66, [0.6, 1.4, 0.8], "Growing faster than anyone big. Drives a hard bargain."),
  mk("jp", "Japan", "🇯🇵", "asia", 4400, 0.8, 60, 88, 66, 88, [0.1, 0.1, -0.1], "Old, rich and brilliant with machines."),
  mk("gb", "United Kingdom", "🇬🇧", "europe", 3900, 1.4, 66, 82, 76, 78, [0, 0.1, -0.5], "Fading empire, strong finance, long memories."),
  mk("fr", "France", "🇫🇷", "europe", 3300, 1.0, 68, 78, 72, 72, [0.1, 0.1, -0.3], "Cultured, proud and influential across West Africa."),
  mk("br", "Brazil", "🇧🇷", "americas", 2300, 2.0, 46, 52, 52, 60, [0.1, 0.4, 0.1], "A giant that keeps promising and keeps stumbling."),
  mk("ru", "Russia", "🇷🇺", "europe", 2300, 1.0, 82, 55, 66, 56, [-0.4, 0.1, -0.3], "Big army, big grudges, heavy sanctions."),
  mk("sa", "Saudi Arabia", "🇸🇦", "mideast", 1300, 3.0, 54, 46, 58, 70, [0.4, 1.0, 0.4], "Oil money turning into new industries."),
  mk("tr", "Turkey", "🇹🇷", "mideast", 1500, 3.0, 62, 56, 54, 56, [0.4, 0.6, 0.3], "A bridge between continents, and a talented drone maker."),
  mk("kr", "South Korea", "🇰🇷", "asia", 1900, 2.0, 62, 86, 58, 80, [0.1, 0.3, 0.3], "Small, sharp and ahead on technology."),
  mk("id", "Indonesia", "🇮🇩", "asia", 1500, 5.0, 46, 48, 48, 66, [0.3, 0.8, 0.4], "A fast-growing island giant."),
  mk("mx", "Mexico", "🇲🇽", "americas", 1900, 2.0, 38, 52, 46, 54, [0, 0.3, 0], "Tied to its northern neighbour's mood."),
  mk("ca", "Canada", "🇨🇦", "americas", 2300, 1.7, 46, 78, 60, 86, [0, 0.1, 0], "Quiet, rich and polite."),
  mk("au", "Australia", "🇦🇺", "asia", 1900, 2.0, 46, 74, 52, 86, [0.1, 0.2, 0.1], "Resource rich, far from everything."),
  mk("ae", "United Arab Emirates", "🇦🇪", "mideast", 560, 4.0, 42, 68, 58, 84, [0.3, 1.0, 0.8], "A trade hub that does deals with everyone."),
  mk("eg", "Egypt", "🇪🇬", "africa", 420, 4.0, 52, 38, 50, 56, [0.2, 0.4, 0.2], "Africa's old power, and its closest rival for the north."),
  mk("za", "South Africa", "🇿🇦", "africa", 400, 1.5, 40, 52, 54, 48, [0, 0.1, -0.1], "Africa's most developed economy, with a power-cut problem of its own."),
  mk("et", "Ethiopia", "🇪🇹", "africa", 160, 6.0, 30, 26, 34, 40, [0.3, 0.8, 0.5], "A huge, fast-growing population and a big new dam."),
  mk("ke", "Kenya", "🇰🇪", "africa", 125, 5.0, 22, 42, 38, 54, [0.1, 0.9, 0.4], "East Africa's tech and finance hub."),
  mk("gh", "Ghana", "🇬🇭", "africa", 90, 4.5, 16, 36, 36, 70, [0, 0.4, 0.1], "Stable, proud, and will never concede the jollof."),
];

// ------------------------------------------------------------------------------------------------ Nigeria's own numbers
const done = (s: FixState, def: string) => s.projects.filter((p) => p.defId === def && p.status === "done").length;
export const gdpUsd = (s: FixState) => annualGdpNgn(s) / s.eco.fx;
const gdpScore = (gdp: number) => clamp(((Math.log10(Math.max(gdp, 10)) - 1.8) / (4.55 - 1.8)) * 100, 0, 100);
export const WEIGHTS = { econ: 0.35, mil: 0.2, tech: 0.2, inf: 0.25 } as const;
export interface Dims { gdp: number; econ: number; mil: number; tech: number; inf: number; score: number }
export const scoreOf = (d: Pick<Dims, "econ" | "mil" | "tech" | "inf">) => Math.round((WEIGHTS.econ * d.econ + WEIGHTS.mil * d.mil + WEIGHTS.tech * d.tech + WEIGHTS.inf * d.inf) * 10) / 10;
export function ngDims(s: FixState): Dims {
  const gdp = gdpUsd(s); const econ = gdpScore(gdp);
  const mil = clamp100(s.mil.strength + Number(s.flags.milBoost ?? 0));
  const tech = clamp100(0.3 * s.jobs.skills + 0.25 * s.soc.education + 0.15 * clamp(s.jobs.productivity - 60, 0, 100) + 5 * (done(s, "techHubs") + done(s, "broadband")) + 2 * done(s, "nollywoodCity") + Number(s.flags.techBoost ?? 0));
  const rels = s.foreign.rel; const avg = (rels.imf + rels.china + rels.usa + rels.ecowas) / 4;
  const deals = dealsOf(s).length;
  const inf = clamp100(0.3 * avg + 0.15 * s.rule.democracy + 0.1 * Math.min(100, deals * 20) + 0.2 * econ + 0.05 * s.gov.trust + Number(s.flags.infBoost ?? 0) + Number(W(s).tier) * 3);
  return { gdp, econ, mil, tech, inf, score: scoreOf({ econ, mil, tech, inf }) };
}

// ------------------------------------------------------------------------------------------------ state
export function W(s: FixState): WorldState {
  try { const raw = s.flags.world; if (typeof raw === "string") return JSON.parse(raw) as WorldState; } catch { /* fall through */ }
  const w: WorldState = { c: SEED.map((c) => ({ ...c, trend: { ...c.trend } })), ranks: {}, best: 99, lead: [], seeded: s.month, era: 0, eraLog: [], tier: 0, at: null, trips: {}, invites: [], bloc: [], naira: [], reserve: false };
  // a fresh world is shaped by the seed so no two games start identically
  let h = s.meta.seed >>> 0; const r = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  for (const c of w.c) { c.gdp *= 0.94 + 0.12 * r(); c.mil = clamp100(c.mil + (r() - 0.5) * 6); c.tech = clamp100(c.tech + (r() - 0.5) * 6); c.inf = clamp100(c.inf + (r() - 0.5) * 6); c.rel = 46 + r() * 10; }
  saveW(s, w); ranksInto(s, w); w.best = w.ranks[NG]; saveW(s, w); return w;
}
export const saveW = (s: FixState, w: WorldState) => { s.flags.world = JSON.stringify(w); };

export interface Row { id: string; name: string; flag: string; me: boolean; rank: number; score: number; econ: number; mil: number; tech: number; inf: number; gdp: number; region: Region; trendText: string; c?: Country }
const countryDims = (c: Country) => ({ econ: gdpScore(c.gdp), mil: c.mil, tech: c.tech, inf: c.inf });
export function league(s: FixState): Row[] {
  const w = W(s); const me = ngDims(s);
  const rows: Row[] = [
    { id: NG, name: "Nigeria", flag: "🇳🇬", me: true, rank: 0, score: me.score, econ: me.econ, mil: me.mil, tech: me.tech, inf: me.inf, gdp: me.gdp, region: "africa", trendText: "That's you." },
    ...w.c.map((c) => { const d = countryDims(c); return { id: c.id, name: c.name, flag: c.flag, me: false, rank: 0, score: scoreOf(d), ...d, gdp: c.gdp, region: c.region, trendText: trendText(c), c }; }),
  ];
  rows.sort((a, b) => b.score - a.score); rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
function trendText(c: Country): string {
  if (c.slump) return "In a slump";
  if (c.boom) return "Booming";
  const best = (["tech", "mil", "inf"] as ("tech" | "mil" | "inf")[]).sort((a, b) => c.trend[b] - c.trend[a])[0];
  const v = c.trend[best];
  if (v >= 0.8) return `Rising fast in ${best === "tech" ? "technology" : best === "mil" ? "military" : "influence"}`;
  if (v <= -0.3) return `Losing ${best === "inf" ? "influence" : best === "mil" ? "military strength" : "its edge"}`;
  return c.g >= 4 ? "Growing quickly" : c.g <= 1.2 ? "Growing slowly" : "Steady";
}
function ranksInto(s: FixState, w: WorldState) {
  const rows = league(s);
  w.ranks = Object.fromEntries(rows.map((r) => [r.id, r.rank]));
}
export const myRank = (s: FixState) => league(s).find((r) => r.me)!.rank;
export const africaRank = (s: FixState) => { const l = league(s).filter((r) => r.region === "africa"); return l.findIndex((r) => r.me) + 1; };
export const TIERS = ["Struggling state", "Rising nation", "Regional power", "Major power", "Great power", "Superpower"] as const;
export function tierOf(rank: number, score: number): number {
  if (rank <= 1 && score > 78) return 5;
  if (rank <= 3) return 4;
  if (rank <= 8) return 3;
  if (rank <= 15) return 2;
  if (rank <= 20) return 1;
  return 0;
}
/** the country just above you, and where you trail */
export function nextTarget(s: FixState): { row: Row; gaps: { dim: "econ" | "mil" | "tech" | "inf"; gap: number }[]; hint: string } | null {
  const rows = league(s); const i = rows.findIndex((r) => r.me); if (i <= 0) return null;
  const row = rows[i - 1]; const me = rows[i];
  const gaps = (["econ", "mil", "tech", "inf"] as const).map((dim) => ({ dim, gap: Math.round((row[dim] - me[dim]) * 10) / 10 })).sort((a, b) => b.gap - a.gap);
  const hints = { econ: "Grow the economy: factories, farms, exports and a stable naira.", mil: "Build up the armed forces and keep them paid and loyal.", tech: "Back schools, skills, broadband and tech hubs.", inf: "Win friends: visits, trade deals, a clean democracy and a strong economy." } as const;
  return { row, gaps, hint: hints[gaps[0].dim] };
}

// ------------------------------------------------------------------------------------------------ the world moves on
export function worldMonthly(s: FixState, rng: Rng) {
  const w = W(s);
  for (const c of w.c) {
    c.g += (c.baseG - c.g) * 0.06 + rng.normal(0, 0.12);
    if (c.slump && c.slump > s.month) c.g = Math.min(c.g, c.baseG - 3.2); else delete c.slump;
    if (c.boom && c.boom > s.month) c.g = Math.max(c.g, c.baseG + 2.2); else delete c.boom;
    c.gdp *= 1 + c.g / 1200;
    c.mil = clamp100(c.mil + c.trend.mil / 12); c.tech = clamp100(c.tech + c.trend.tech / 12); c.inf = clamp100(c.inf + c.trend.inf / 12);
    c.rel = clamp100(c.rel + (50 - c.rel) * 0.01);
  }
  if (s.month % 12 === 6) yearly(s, w, rng);
  // how the league changed this month
  const rows = league(s); const me = rows.find((r) => r.me)!;
  const prev = w.ranks[NG] ?? me.rank;
  for (const r of rows) if (!r.me) {
    const lead = me.score - r.score; const has = w.lead.includes(r.id);
    if (!has && lead > 1.5) { w.lead.push(r.id); if (r.rank - me.rank === 1 || me.rank < prev) announce(s, `Nigeria overtakes ${r.name}`, `${r.flag} ${r.name} now sits below Nigeria in the world league. Nigerians online are insufferable about it.`, "good", `wpass:${r.id}`); }
    else if (has && lead < -1.5) { w.lead = w.lead.filter((x) => x !== r.id); announce(s, `${r.name} overtakes Nigeria`, `${r.flag} ${r.name} edges back above Nigeria in the league. The columnists are not kind.`, "bad", `wlose:${r.id}:${s.month}`); }
  }
  if (me.rank < w.best) {
    const crossed = [20, 15, 10, 5, 3, 2, 1].filter((m) => me.rank <= m && w.best > m).pop();
    w.best = me.rank;
    const marks: Record<number, string> = { 20: "Nigeria enters the world's top 20", 15: "Nigeria breaks into the world's top 15", 10: "Nigeria makes the world top 10", 5: "Nigeria is now a top-five power", 3: "Nigeria joins the world's top three", 2: "Nigeria is the world's second power", 1: "Nigeria is number one in the world" };
    if (crossed) announce(s, marks[crossed], `The league table has Nigeria at #${me.rank}. Rivals have noticed.`, "good", `wrank:${crossed}`);
  }
  const africa = rows.filter((r) => r.region === "africa"); if (africa[0]?.me && !s.flags.africaFirst) { s.flags.africaFirst = s.month; announce(s, "Nigeria is Africa's number one", "Ahead of South Africa and Egypt at last. The rest of the continent is paying attention.", "good", "wafrica"); }
  w.tier = tierOf(me.rank, me.score);
  w.ranks = Object.fromEntries(rows.map((r) => [r.id, r.rank]));
  saveW(s, w);
}
function announce(s: FixState, headline: string, body: string, tone: "good" | "bad", source: string) {
  pushNews(s, { source, headline, body, tone });
  s.timeline.push({ month: s.month, title: headline, text: body, tone, chain: "world" });
}
function yearly(s: FixState, w: WorldState, rng: Rng) {
  for (const c of w.c) {
    if (!c.slump && !c.boom) { const r = rng.next(); if (r < 0.07) c.slump = s.month + 18; else if (r > 0.93) c.boom = s.month + 18; }
    c.stab = clamp100(c.stab + rng.normal(0, 3));
    c.baseG = clamp(c.baseG + rng.normal(0, 0.25), 0, 8);
  }
}
