/** How each state is doing compared with day one, and the milestones worth celebrating. Leaf module (reads state only, except milestones). */
import { STATE_BY_ID } from "../../game/data/states";
import type { FixState } from "./types";
import { clamp100, pushNews } from "./util";

export const powerHours = (stress: number) => Math.round(2 + 20 * (1 - clamp100(stress) / 100));
export interface StateProgress {
  powerHours: [number, number]; jobsCreated: number; foodBetter: number; saferBy: number; projects: number; zoneGovernor?: string;
  verdict: "thriving" | "improving" | "flat" | "slipping";
}
export function stateProgress(s: FixState, id: string): StateProgress | null {
  const r = s.regions[id], st = STATE_BY_ID[id];
  if (!r || !st) return null;
  const a = r.start ?? { food: r.food, insecurity: r.insecurity, jobless: r.jobless, power: r.power };
  const jobsCreated = Math.round(((a.jobless - r.jobless) / 100) * st.pop2006m * 1e6 * 0.12 / 1000) * 1000;
  const total = (a.food - r.food) + (a.insecurity - r.insecurity) + (a.jobless - r.jobless) + (a.power - r.power);
  const verdict = total >= 24 ? "thriving" : total >= 6 ? "improving" : total <= -8 ? "slipping" : "flat";
  return { powerHours: [powerHours(a.power), powerHours(r.power)], jobsCreated, foodBetter: Math.round(a.food - r.food), saferBy: Math.round(a.insecurity - r.insecurity), projects: s.projects.filter((p) => p.stateId === id && p.status === "done").length, zoneGovernor: s.governors.find((g) => g.zone === st.zone)?.name, verdict };
}
const MS = [
  { key: "power" as const, drop: 14, text: (n: string, p: StateProgress) => `${n} now gets about ${p.powerHours[1]} hours of light a day, up from ${p.powerHours[0]}`, body: "Shops stay open later and generators are going quiet." },
  { key: "jobless" as const, drop: 12, text: (n: string, p: StateProgress) => `Jobs are returning to ${n}: about ${Math.max(1, Math.round(p.jobsCreated / 1000))},000 more people at work`, body: "Young people are starting to say they might stay." },
  { key: "food" as const, drop: 14, text: (n: string) => `Food is easier to afford in ${n}`, body: "Market women report fuller baskets and fewer empty stalls." },
  { key: "insecurity" as const, drop: 14, text: (n: string) => `${n} is safer than it has been in years`, body: "Farmers are going back to their fields." },
];
export function stateMilestonesMonthly(s: FixState) {
  if (s.month < 6) return;
  for (const [id, r] of Object.entries(s.regions)) {
    const a = r.start; if (!a) continue;
    const st = STATE_BY_ID[id]; if (!st) continue;
    for (const m of MS) {
      const flag = `ms:${id}:${m.key}`;
      if (s.flags[flag] !== undefined || a[m.key] - r[m.key] < m.drop) continue;
      s.flags[flag] = s.month;
      const p = stateProgress(s, id)!;
      pushNews(s, { source: `ms:${id}:${m.key}`, headline: m.text(st.name, p), body: m.body, tone: "good", stateId: id });
    }
  }
}
