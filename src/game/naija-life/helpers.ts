import { MAJOR_BY_ID } from "./universities";
import { JOBS, JOB_BY_ID, STATE_BY_ID, poolFor, type JobDef } from "./data";
import type { Gender, Player, Stats } from "./types";
import { T, clamp, pick } from "./util";

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
  if (p.politics && p.politics.office >= 0) return T("Politician", "Politician");
  if (!p.job && p.flags.nyscServing === true) return T("Corps member (NYSC)", "Corper (NYSC)");
  if (!j || !p.job) return p.school ? T("Student", "Student") : p.age < 6 ? T("Child", "Pikin") : T("Unemployed", "No job");
  return j.ladder[Math.min(p.job.rank, j.ladder.length - 1)].title;
}

export function ownsHouseIn(p: Player, stateId: string): boolean {
  return p.houses.some((h) => h.state === stateId);
}

const EDU_ORDER = { none: 0, primary: 1, secondary: 2, tertiary: 3 } as const;
export const eduAtLeast = (p: Player, need: keyof typeof EDU_ORDER) => EDU_ORDER[p.edu] >= EDU_ORDER[need];

/** Jobs this person could realistically apply for right now. */
/** Why this person cannot take the job, or null when they qualify. */
export function qualifyBlock(p: Player, j: JobDef): string | null {
  if (p.age < j.minAge) return T(`Age ${j.minAge}+`, `Age ${j.minAge}+`);
  if (!eduAtLeast(p, j.edu)) return j.edu === "tertiary" ? T("Needs a degree", "You need degree") : T(`Needs ${j.edu} school`, `You need ${j.edu} school`);
  if (j.postgrad && !p.flags.postgrad) return T("Needs a master's degree", "You need master's degree");
  if (j.majors) {
    const major = p.campus?.graduated ? p.campus.major : undefined;
    const ok = major ? j.majors.includes(major) : false;
    const legacy = !major && p.course && j.courses?.includes(p.course);
    if (!ok && !legacy && !(j.postgrad && p.flags.postgrad)) {
      const names = j.majors.slice(0, 3).map((m) => MAJOR_BY_ID[m]?.label ?? m).join(" / ");
      return T(`Needs a degree in ${names}`, `You need degree for ${names}`);
    }
  } else if (j.courses && (!p.course || !j.courses.includes(p.course))) return T(`Needs ${j.courses.slice(0, 2).join(" / ")} degree`, `You need ${j.courses.slice(0, 2).join(" / ")} degree`);
  if (j.skillAny) {
    const ok = j.skillAny.some(([s, min]) => (p.skills[s] ?? 0) >= min || p.flags.trade === s);
    if (!ok) return T(`Needs the ${j.skillAny.map(([s]) => s).join(" or ")} skill. Learn it in Work`, `You need ${j.skillAny.map(([s]) => s).join(" or ")} skill. Learn am for Work`);
  }
  return null;
}

export function eligibleJobs(p: Player): JobDef[] {
  const st = stateOf(p);
  return JOBS.filter((j) => {
    if (qualifyBlock(p, j)) return false;
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
      note = T(` You left your ${j.selfEmployed ? "business" : "job"} in ${from} behind.`, ` You leave your ${j.selfEmployed ? "business" : "job"} for ${from} behind.`);
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
  let fallout = "";
  if (p.school) {
    // A convicted student is expelled and has to reapply from scratch after release.
    fallout += T("The school expels you. ", "The school expel you. ");
    p.school = null;
    delete p.campus;
    p.course = null;
    p.flags.expelledAge = p.age;
  }
  if (p.flags.admOpen) { delete p.flags.admOpen; fallout += T("Your admission offer is withdrawn. ", "Dem withdraw your admission. "); }
  if (p.flags.nyscServing === true) {
    p.flags.nyscServing = false;
    p.flags.nyscTerminated = true;
    fallout += T("NYSC removes you from service: no certificate. ", "NYSC remove you from service: no certificate. ");
  }
  return T(`You were sentenced to ${years} year${years > 1 ? "s" : ""} in Kuje.${seized ? " EFCC seized half of your money." : ""} ${fallout}`, `Dem sentence you to ${years} year${years > 1 ? "s" : ""} for Kuje.${seized ? " EFCC seize half of your money." : ""} ${fallout}`);
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
