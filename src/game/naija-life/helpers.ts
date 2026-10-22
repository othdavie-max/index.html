import { JOBS, JOB_BY_ID, STATE_BY_ID, poolFor, type JobDef } from "./data";
import type { Gender, Player, Stats } from "./types";
import { clamp, pick } from "./util";

export const stateOf = (p: Player) => STATE_BY_ID[p.state];

export function bump(p: Player, key: keyof Stats, delta: number) {
  p.stats[key] = clamp(p.stats[key] + delta);
}

export function randomName(tribe: string, gender: Gender): string {
  return pick(poolFor(tribe)[gender]);
}

export function jobDef(p: Player): JobDef | null {
  return p.job ? JOB_BY_ID[p.job.id] ?? null : null;
}

export function jobTitle(p: Player): string {
  const j = jobDef(p);
  if (p.politics && p.politics.office >= 0) return "Politician";
  if (!j || !p.job) return p.school ? "Student" : p.age < 6 ? "Child" : "Unemployed";
  return j.ladder[Math.min(p.job.rank, j.ladder.length - 1)].title;
}

export function ownsHouseIn(p: Player, stateId: string): boolean {
  return p.houses.some((h) => h.state === stateId);
}

const EDU_ORDER = { none: 0, primary: 1, secondary: 2, tertiary: 3 } as const;
export const eduAtLeast = (p: Player, need: keyof typeof EDU_ORDER) => EDU_ORDER[p.edu] >= EDU_ORDER[need];

/** Jobs this person could realistically apply for right now. */
export function eligibleJobs(p: Player): JobDef[] {
  const st = stateOf(p);
  return JOBS.filter((j) => {
    if (p.age < j.minAge) return false;
    if (!eduAtLeast(p, j.edu)) return false;
    if (j.courses && (!p.course || !j.courses.includes(p.course))) return false;
    if (st.opp < j.minOpp) return false;
    if (j.id === "kidnapper") return false;
    if (j.group === "formal" && !["police", "soldier", "navy", "airforce"].includes(j.id) && (p.crime?.record ?? []).some((r) => r.severity >= 3 && r.outcome === "convicted")) return false;
    return true;
  });
}

/** Move to another state. Your day job stays behind. Returns a note about what you lost. */
export function moveTo(p: Player, stateId: string): string {
  const from = stateOf(p).name;
  p.state = stateId;
  let note = "";
  if (p.job) {
    const j = JOB_BY_ID[p.job.id];
    if (j && j.group !== "creative") {
      note = ` You left your ${j.selfEmployed ? "business" : "job"} in ${from} behind.`;
      p.job = null;
    }
  }
  return note;
}

export function enterPrison(p: Player, years: number): string {
  const crimeJob = jobDef(p)?.group === "crime";
  const seized = crimeJob || p.loot > 0 ? 0.5 : 0;
  if (seized) p.money *= 1 - seized;
  p.prison = years;
  p.job = null;
  bump(p, "reputation", -25);
  bump(p, "happiness", -20);
  return `You was sentenced to ${years} year${years > 1 ? "s" : ""} for Kuje.${seized ? " EFCC seize half of your money." : ""} `;
}

export function addLoot(p: Player, amount: number) {
  p.money += amount;
  p.loot += amount;
}

export const I = (p: Player, n: number) => n * p.index;

/** Cost to grow a self-employed business to its next rung, or null. */
export function expandCostFor(p: Player): number | null {
  const j = jobDef(p);
  if (!p.job || !j || !j.selfEmployed) return null;
  const rung = j.ladder[Math.min(p.job.rank, j.ladder.length - 1)];
  if (!rung.upgrade) return null;
  return Math.round(rung.upgrade * Math.pow(p.index, 0.9));
}

/** Small bonus (or penalty) to a probability from the hidden luck stat. */
export const luckBonus = (p: Player) => (p.luck - 50) / 300;
