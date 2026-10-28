import type { Effects, FixState, Lever, Modifier, NewsItem, Report, Snap } from "./types";
import { PROJECT_BY_ID } from "../data/catalogue";

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp100 = (v: number) => clamp(v, 0, 100);
export const round = (v: number, d = 0) => { const k = 10 ** d; return Math.round(v * k) / k; };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const START_CAL_MONTH = 5; // the presidency begins in June 2027 (fictional calendar)
export const START_YEAR = 2027;
export const calMonth = (month: number) => (START_CAL_MONTH + month) % 12;
export const calYear = (month: number) => START_YEAR + Math.floor((START_CAL_MONTH + month) / 12);
export const monthLabel = (month: number) => `${MONTHS[calMonth(month)]} ${calYear(month)}`;
export const monthShort = (month: number) => `${MONTHS[calMonth(month)].slice(0, 3)} ${calYear(month)}`;
export const isLeanSeason = (month: number) => { const c = calMonth(month); return c >= 5 && c <= 7; };
export const isHarvest = (month: number) => { const c = calMonth(month); return c >= 9 && c <= 11; };
export const isFloodSeason = (month: number) => { const c = calMonth(month); return c >= 7 && c <= 9; };

/** state capacity -> how well policies and projects are delivered (0.6..1.0) */
export const delivery = (s: FixState) => 0.6 + 0.4 * clamp100(s.gov.capacity + lever(s, "capacity")) / 100;

/** realised strength (0..1) of a modifier this month */
export function strength(m: Modifier, month: number): number {
  if (month < m.start) return 0;
  if (m.end !== null && month > m.end) return 0;
  return m.ramp <= 1 ? 1 : Math.min(1, (month - m.start + 1) / m.ramp);
}

/**
 * Sum of one lever across everything currently in force. `capacity` itself is excluded from the delivery factor to
 * avoid a loop; policies and projects are weighted by how well government can deliver them.
 */
export function lever(s: FixState, name: Lever, month = s.month): number {
  let total = 0;
  for (const m of s.modifiers) {
    const v = m.effects[name];
    if (v === undefined) continue;
    const st = strength(m, month);
    if (st === 0) continue;
    let k = st * m.scale;
    if (name !== "capacity" && (m.source.startsWith("policy:") || m.source.startsWith("project:"))) k *= delivery0(s);
    total += v * k;
  }
  return total;
}
function delivery0(s: FixState): number { return 0.6 + 0.4 * clamp100(s.gov.capacity) / 100; }

export function leverFrom(s: FixState, source: string, name: Lever): number {
  let t = 0;
  for (const m of s.modifiers) if (m.source === source && m.effects[name] !== undefined) t += (m.effects[name] as number) * strength(m, s.month) * m.scale;
  return t;
}

let seq = 0;
export function uid(s: FixState, p: string): string { seq++; return `${p}${s.month}-${seq.toString(36)}${Math.floor(s.meta.seed % 97)}`; }

export function addMod(s: FixState, source: string, label: string, effects: Effects, opts: { duration?: number | null; ramp?: number; scale?: number; start?: number } = {}) {
  const start = opts.start ?? s.month;
  const id = `${source}@${start}`;
  if (s.modifiers.some((m) => m.id === id)) return; // idempotent
  s.modifiers.push({ id, source, label, start, end: opts.duration === null || opts.duration === undefined ? null : start + opts.duration - 1, ramp: opts.ramp ?? 1, scale: opts.scale ?? 1, effects });
}
export function removeMods(s: FixState, source: string) { s.modifiers = s.modifiers.filter((m) => m.source !== source); }

export function pushNews(s: FixState, n: Omit<NewsItem, "month" | "id"> & { id?: string }) {
  const id = n.id ?? `${n.source}@${s.month}`;
  if (s.news.some((x) => x.id === id)) return;
  s.news.push({ ...n, id, month: s.month });
  if (s.news.length > 400) s.news.splice(0, s.news.length - 400);
}
export function pushReport(s: FixState, r: Omit<Report, "month" | "id">) {
  s.reports.push({ ...r, month: s.month, id: `r${s.month}-${s.reports.length}` });
  if (s.reports.length > 200) s.reports.splice(0, s.reports.length - 200);
}

export function projectsDone(s: FixState) { return s.projects.filter((p) => p.status === "done"); }
export function infraScore(s: FixState): number {
  return round((s.infra.roads + lever(s, "roads") + (s.infra.rail + lever(s, "rail")) * 0.6 + s.infra.ports + lever(s, "ports")) / 2.6);
}

export function powerRatio(s: FixState): number { return s.power.available / s.power.demand; }
export function debtTotalNgn(s: FixState): number { return s.fin.domesticDebt + s.fin.foreignDebt * s.eco.fx; }
/** annualised ₦bn revenue approximation, used for ratios */
export function annualRevenue(s: FixState): number { return Math.max(1, s.fin.revenue * 12); }
export function debtToRevenue(s: FixState): number { return debtTotalNgn(s) / annualRevenue(s); }
export function debtServiceRatio(s: FixState): number { return s.fin.debtService / Math.max(1, s.fin.revenue); }
export function annualGdpNgn(s: FixState): number { return 230000 * (s.eco.gdpIdx / 100) * (s.eco.priceLevel / 100); }
export function realWage(s: FixState): number { return (s.eco.wageIdx * (1 + lever(s, "wage") / 100)) / s.eco.priceLevel * 100; }
export function foodAffordIdx(s: FixState): number { return round((s.eco.wageIdx * (1 + lever(s, "wage") / 100)) / s.eco.foodPriceIdx * 100, 1); }

export function snap(s: FixState): Snap {
  return {
    month: s.month, fx: round(s.eco.fx), inflation: round(s.eco.inflation, 1), foodInflation: round(s.eco.foodInflation, 1), fuel: round(s.fuel.pump),
    unemployment: round(s.jobs.unemployment, 1), youthUnemployment: round(s.jobs.youth, 1), happiness: round(s.gov.happiness, 1), approval: round(s.gov.approval, 1),
    treasury: round(s.fin.treasury), debt: round(debtTotalNgn(s)), reserves: round(s.eco.reserves, 1), power: round(s.power.available), insecurity: round(s.sec.index, 1),
    realIncome: round(realWage(s), 1), growth: round(s.eco.growth, 1), foodAfford: foodAffordIdx(s), personalWealth: round(s.me.wealth, 1), trust: round(s.gov.trust, 1),
    infra: infraScore(s), displaced: round(s.sec.displaced), dsr: round(debtServiceRatio(s) * 100, 1), debtGdp: round(debtTotalNgn(s) / annualGdpNgn(s) * 100, 1),
  };
}

export function projectDef(p: { defId: string }) { return PROJECT_BY_ID[p.defId]; }
export const fmtN = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
/** ₦bn -> readable */
export function nb(n: number): string {
  const a = Math.abs(n); const sign = n < 0 ? "−" : "";
  if (a >= 1000) return `${sign}₦${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}tn`;
  return `${sign}₦${Math.round(a).toLocaleString("en-NG")}bn`;
}

/** how to address the player: their chosen name, or a neutral title if they did not give one */
export const presidentName = (s: { meta: { president: string } }) => (!s.meta.president || s.meta.president === "Madam/Mr President" ? "Your Excellency" : `President ${s.meta.president}`);
