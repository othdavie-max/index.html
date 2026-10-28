/** "What is coming" and plain-language effect chips, derived from live state. */
import { MEASURE_BY_ID, POLICY_BY_ID, PROJECT_BY_ID } from "../data/catalogue";
import type { Effects, FixState, Lever } from "./types";
import { TERM_MONTHS } from "./types";
import { strength } from "./util";

export interface Upcoming { month: number; label: string; detail?: string; kind: "policy" | "ends" | "project" | "consequence" | "deadline" | "election" | "report"; tone: "good" | "bad" | "mixed" | "neutral" }

export function upcoming(s: FixState, limit = 8): Upcoming[] {
  const m = s.month;
  const out: Upcoming[] = [];
  for (const [id, st] of Object.entries(s.policies)) {
    if (!st.active) continue;
    const d = POLICY_BY_ID[id];
    if (d && st.since + d.delay > m) out.push({ month: st.since + d.delay, label: `${d.name} reaches full effect`, detail: d.long, kind: "policy", tone: "good" });
  }
  for (const mod of s.modifiers) {
    if (!mod.source.startsWith("measure:") || mod.end === null || mod.end < m) continue;
    const d = MEASURE_BY_ID[mod.source.slice(8)];
    out.push({ month: mod.end + 1, label: `${d?.name ?? mod.label} ends`, detail: "Its effect stops after this.", kind: "ends", tone: "neutral" });
  }
  for (const p of s.projects) {
    if (p.status !== "active" && p.status !== "stalled") continue;
    const left = Math.ceil((1 - p.progress) * (p.months + p.delay));
    out.push({ month: m + Math.max(1, left), label: `${p.name} due to finish${p.status === "stalled" ? " (stalled!)" : ""}`, detail: PROJECT_BY_ID[p.defId]?.benefitText, kind: "project", tone: p.status === "stalled" ? "bad" : "good" });
  }
  for (const e of s.echoes) if (e.status === "pending") out.push({ month: e.due, label: e.hint, detail: `${e.cause}.`, kind: "consequence", tone: e.tone });
  for (const e of s.events) if (e.status === "open") out.push({ month: e.deadline, label: `Deadline: ${e.title}`, detail: "Unanswered situations escalate.", kind: "deadline", tone: "bad" });
  const mid = s.termStart + 24;
  if (mid > m && s.promises.length) out.push({ month: mid, label: "Halfway report card on your promises", kind: "report", tone: "neutral" });
  out.push({ month: s.termStart + TERM_MONTHS, label: s.term >= 2 ? "Your final term ends" : "Election day", detail: "Voters judge your whole term.", kind: "election", tone: "neutral" });
  return out.filter((x) => x.month >= m).sort((a, b) => a.month - b.month).slice(0, limit);
}

// ---------------------------------------------------------------- effect chips
/** label, and whether a higher lever value is good for the country */
export const LEVER_INFO: Record<Lever, [string, boolean]> = {
  foodSupply: ["Food supply", true], postHarvest: ["Food waste cut", true], storage: ["Food storage", true], irrigation: ["Irrigation", true], inputs: ["Farm inputs", true],
  foodPrice: ["Food prices", false], transport: ["Transport costs", false], refinery: ["Local fuel", true], oilTheft: ["Oil theft", false], crude: ["Oil output", true],
  power: ["Electricity", true], grid: ["Grid", true], gas: ["Gas to power", true], maint: ["Maintenance", true], roads: ["Roads", true], rail: ["Rail", true], ports: ["Ports", true],
  jobs: ["Unemployment", false], sme: ["Small business", true], manuf: ["Factories", true], exports: ["Exports", true], skills: ["Skills", true], wage: ["Incomes", true],
  fxSupply: ["Dollars in", true], fxDemand: ["Dollars out", false], investor: ["Investor confidence", true], inflation: ["Inflation", false],
  revenue: ["Revenue", true], taxCompl: ["Tax collected", true], corruption: ["Corruption", false], procurement: ["Honest contracts", true], capacity: ["Govt capacity", true], transparency: ["Transparency", true],
  trust: ["Trust", true], happiness: ["Happiness", true], security: ["Safety", true], forces: ["Security forces", true], education: ["Schools", true], health: ["Health", true], welfare: ["Social support", true],
};
export interface Chip { label: string; up: boolean; good: boolean }
const SCALE: Partial<Record<Lever, number>> = { power: 100, revenue: 20, fxSupply: 0.1, fxDemand: 0.1, exports: 0.05, jobs: 0.15, wage: 1 };
export function chips(effects: Effects, max = 4): Chip[] {
  return (Object.entries(effects) as [Lever, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => ({ k, v, w: Math.abs(v) / (SCALE[k] ?? 2) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, max)
    .map(({ k, v }) => ({ label: LEVER_INFO[k][0], up: v > 0, good: (v > 0) === LEVER_INFO[k][1] }));
}
export function refChips(ref: { type: string; id?: string; defId?: string }): Chip[] {
  if (ref.type === "measure" && ref.id) return chips(MEASURE_BY_ID[ref.id]?.effects ?? {});
  if (ref.type === "policy" && ref.id) return chips(POLICY_BY_ID[ref.id]?.effects ?? {});
  if (ref.type === "project" && ref.defId) return chips(PROJECT_BY_ID[ref.defId]?.benefit ?? {});
  return [];
}
/** how strong each active policy is right now (0..1), for progress displays */
export function policyStrength(s: FixState, id: string): number {
  const m = s.modifiers.find((x) => x.source === `policy:${id}`);
  return m ? strength(m, s.month) : 0;
}
