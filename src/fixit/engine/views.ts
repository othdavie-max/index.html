/** Read-only derived views used by the UI: headline labels, regional layers, trends. */
import { hashString } from "../../game/engine/rng";
import { LGA_BY_ID } from "../../game/engine/admin";
import type { FixState, Snap } from "./types";
import { clamp100, debtServiceRatio, foodAffordIdx, infraScore, lever, powerRatio, realWage, round } from "./util";

export type Tone = "good" | "ok" | "warn" | "bad";

export function fiscalCondition(s: FixState): { label: string; tone: Tone; why: string } {
  const dsr = debtServiceRatio(s);
  const monthsCash = s.fin.treasury / Math.max(1, s.fin.spend);
  if (s.fin.waysAndMeans > 0 || dsr > 0.75) return { label: "Crisis", tone: "bad", why: s.fin.waysAndMeans > 0 ? "The central bank is printing money to pay bills." : "Debt payments eat most of revenue." };
  if (dsr > 0.5 || s.fin.deficit > s.fin.revenue * 0.25) return { label: "Strained", tone: "warn", why: `Debt payments take ${Math.round(dsr * 100)}% of revenue.` };
  if (dsr > 0.3 || monthsCash < 0.3 || s.fin.deficit > 0) return { label: "Tight", tone: "ok", why: s.fin.deficit > 0 ? "Spending is above revenue; the gap is borrowed." : "Cash is thin." };
  return { label: "Healthy", tone: "good", why: "Revenue covers spending and debt payments." };
}

export function economyScore(s: FixState): { score: number; label: string; tone: Tone } {
  const g = s.eco.growth;
  const score = clamp100(50 + 7 * (g - 2) - 0.8 * Math.max(0, s.eco.inflation - 12) + 0.3 * (s.eco.investor - 42) + 0.2 * (powerRatio(s) * 100 - 25) - 0.6 * (s.jobs.unemployment - 19) + 0.12 * (s.jobs.manuf + lever(s, "manuf") - 32) + 0.1 * (s.jobs.sme + lever(s, "sme") - 38));
  return { score: Math.round(score), label: score >= 65 ? "Strong" : score >= 50 ? "Recovering" : score >= 35 ? "Fragile" : "Weak", tone: score >= 65 ? "good" : score >= 50 ? "ok" : score >= 35 ? "warn" : "bad" };
}

export function securityLabel(s: FixState): { label: string; tone: Tone } {
  const i = s.sec.index;
  return i < 35 ? { label: "Calm", tone: "good" } : i < 50 ? { label: "Uneasy", tone: "ok" } : i < 62 ? { label: "Dangerous", tone: "warn" } : { label: "Critical", tone: "bad" };
}

/** change versus `months` ago, from the monthly history */
export function trendOf(s: FixState, key: keyof Snap, months = 3): number {
  const h = s.history;
  if (h.length < 2) return 0;
  const a = h[Math.max(0, h.length - 1 - months)][key] as number;
  const b = h[h.length - 1][key] as number;
  return b - a;
}

export type Layer = "overview" | "food" | "fuel" | "power" | "jobs" | "security" | "flood" | "unrest";
export const LAYERS: { id: Layer; label: string; blurb: string }[] = [
  { id: "overview", label: "Overall stress", blurb: "A blend of every pressure on the area" },
  { id: "food", label: "Food", blurb: "Food prices and shortages (higher is worse)" },
  { id: "fuel", label: "Fuel & oil", blurb: "Fuel costs, oil theft and refining pressure" },
  { id: "power", label: "Electricity", blurb: "Blackouts and unreliable supply" },
  { id: "jobs", label: "Jobs", blurb: "Unemployment and weak local economy" },
  { id: "security", label: "Security", blurb: "Armed attacks and displacement" },
  { id: "flood", label: "Flooding", blurb: "Exposure to seasonal floods" },
  { id: "unrest", label: "Unrest", blurb: "Anger that can turn into protests" },
];

export function stateLayerValue(s: FixState, id: string, layer: Layer): number {
  const r = s.regions[id];
  if (!r) return 0;
  switch (layer) {
    case "food": return r.food;
    case "fuel": return clamp100(0.5 * (s.fuel.pump / 750 - 0.6) * 100 + (["NG-RI", "NG-BY", "NG-DE", "NG-AK"].includes(id) ? 0.5 * s.oil.theft : 0) + 0.2 * r.unrest);
    case "power": return r.power;
    case "jobs": return r.jobless;
    case "security": return r.insecurity;
    case "flood": return r.flood;
    case "unrest": return r.unrest;
    default: return 0.2 * r.food + 0.2 * r.insecurity + 0.2 * r.jobless + 0.15 * r.power + 0.1 * r.flood + 0.15 * r.unrest;
  }
}
/** local-government detail is a stable simulated offset around the state value */
export function lgaOffset(lgaId: string, layer: Layer): number {
  return (hashString(`${lgaId}|${layer}`) % 25) - 12;
}
export function lgaLayerValue(s: FixState, lgaId: string, layer: Layer): number {
  const l = LGA_BY_ID[lgaId];
  if (!l) return 0;
  return clamp100(stateLayerValue(s, l.stateId, layer) + lgaOffset(lgaId, layer));
}
export const stressWord = (v: number) => (v < 25 ? "Low" : v < 45 ? "Moderate" : v < 65 ? "High" : "Severe");
/** colour ramp for stress (light → deep red-brown). Never the only cue: values and words are always shown too. */
export function stressColor(v: number): string {
  const stops = [[236, 244, 240], [246, 224, 160], [240, 164, 96], [200, 80, 60], [120, 30, 40]];
  const t = Math.min(0.999, Math.max(0, v / 100)) * (stops.length - 1);
  const i = Math.floor(t), f = t - i;
  const c = stops[i].map((x, k) => Math.round(x + (stops[i + 1][k] - x) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function headline(s: FixState) {
  const base = s.baseline;
  return {
    fxChangePct: round((s.eco.fx / base.fx - 1) * 100, 1),
    foodAfford: foodAffordIdx(s),
    realIncome: round(realWage(s), 1),
    infra: infraScore(s),
  };
}
export const monthsLeftInTerm = (s: FixState) => Math.max(0, s.termStart + 48 - s.month);
