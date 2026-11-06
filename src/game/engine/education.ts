/** Education, NYSC, employment and business actions. All return { ok, message } for the UI. */
import type { GameState, Business } from "./types";
import { COURSE_BY_ID, INSTITUTION_COST, JOB_BY_ID, BUSINESS_BY_ID, type InstType } from "../data/life";
import { EDUCATION_RANK } from "../data/rules";
import { subRng, clamp, clamp100 } from "./rng";
import { debit, canAfford, credit, addAsset } from "./finance";
import { careerLog, notify, pushNews } from "./news";
import { priceLevel } from "./queries";
import { playerAge } from "./calendar";
import { stateName, lgaName, LGAS_BY_STATE } from "./admin";
import { networkStrength } from "./relationships";

export type Result = { ok: boolean; message: string };
const fail = (message: string): Result => ({ ok: false, message });
const good = (message: string): Result => ({ ok: true, message });

export function admissionChance(state: GameState, programmeId: string, inst: InstType): number {
  const c = COURSE_BY_ID[programmeId];
  const a = state.player.attrs;
  const inc = INSTITUTION_COST[inst];
  const score = a.intelligence / 100 * 0.75 + (state.player.family.wealthTier * 0.02) + (state.player.commitments.selfStudy ? 0.05 : 0);
  return clamp(0.25 + score - c.difficulty * 0.55 - inc.admissionBonus * -1 + (inst === "private" ? 0.2 : 0), 0.03, 0.97);
}

export function programmeCost(state: GameState, programmeId: string, inst: InstType): { tuitionYear: number; living: number; monthly: number } {
  const c = COURSE_BY_ID[programmeId];
  const i = INSTITUTION_COST[inst];
  const monthly = Math.round(i.tuitionYear / 12 + i.livingMonth * (state.player.family.wealthTier >= 3 ? 1.2 : 1));
  return { tuitionYear: i.tuitionYear, living: i.livingMonth, monthly: c.years > 0 ? monthly : 0 };
}

export function enroll(state: GameState, programmeId: string, inst: InstType): Result {
  const p = state.player;
  const c = COURSE_BY_ID[programmeId];
  if (!c) return fail("Unknown programme.");
  if (p.education.enrolled) return fail("You are already enrolled in a programme.");
  if (c.requires && EDUCATION_RANK[p.education.level] < EDUCATION_RANK[c.requires]) return fail("You need a bachelor's degree first.");
  if (c.requiresField && !p.education.certificates.some((x) => x.includes(c.requiresField!))) return fail(`This programme needs a ${c.requiresField} degree.`);
  if (c.id === "law_school" && p.education.certificates.includes("Called to the Bar (BL)")) return fail("You are already called to the Bar.");
  if (c.level === "nd" && inst !== "polytechnic") return fail("National Diploma programmes are offered at polytechnics.");
  if (c.level !== "nd" && inst === "polytechnic") return fail("Pick a university for degree programmes.");
  if (EDUCATION_RANK[p.education.level] >= EDUCATION_RANK[c.level] && !c.requires) return fail("You already hold that level of education.");
  const rng = subRng(state.meta.seed, "admission", state.clock.monthIndex, programmeId, inst, p.education.certificates.length);
  const chance = admissionChance(state, programmeId, inst);
  const cost = programmeCost(state, programmeId, inst);
  if (!canAfford(state, Math.round(cost.monthly * 3 * priceLevel(state)))) return fail(`You need at least three months of fees (about ₦${Math.round(cost.monthly * 3 * priceLevel(state)).toLocaleString()}) to enrol.`);
  if (!rng.chance(chance)) {
    p.attrs.stress = clamp100(p.attrs.stress + 4);
    return fail(`Your application to the ${INSTITUTION_COST[inst].label.toLowerCase()} was unsuccessful (${Math.round(chance * 100)}% odds). You can try another institution.`);
  }
  p.education.enrolled = { programmeId, startedMonth: state.clock.monthIndex, monthsRemaining: c.years * 12, monthlyCost: cost.monthly, delayed: 0 };
  p.education.institutionType = inst;
  p.education.field = c.field;
  p.education.institution = `${stateName(p.residenceStateId)} ${INSTITUTION_COST[inst].label}`;
  if (p.occupation.kind !== "politician") {
    p.occupation = { kind: "student", jobId: null, title: `Student, ${c.label}`, baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: c.years === 1 ? 70 : 55 };
  }
  careerLog(state, `Admitted to ${c.label}.`);
  return good(`You are admitted to ${c.label} (${c.years} yr${c.years > 1 ? "s" : ""}).`);
}

export function applyEducationAward(state: GameState): void {
  const p = state.player;
  const en = p.education.enrolled;
  if (!en) return;
  const c = COURSE_BY_ID[en.programmeId];
  if (EDUCATION_RANK[c.level] > EDUCATION_RANK[p.education.level]) p.education.level = c.level;
  p.education.certificates.push(c.certificate);
  p.education.enrolled = null;
  p.education.graduated = state.clock.monthIndex;
  p.education.institutionType = null;
  const age = playerAge(state);
  if (c.level === "bachelor" || c.level === "nd") {
    if (p.education.nysc === "na" || p.education.nysc === "pending") p.education.nysc = age <= 30 && c.id !== "law_school" && !p.education.certificates.includes("NYSC") ? "pending" : "exempt";
  }
  if (c.id === "law_school") p.education.nysc = p.education.nysc === "done" ? "done" : "pending";
  if (p.occupation.kind === "student") p.occupation = { kind: "unemployed", jobId: null, title: "Graduate (job-seeking)", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 0 };
  p.attrs.reputation = clamp100(p.attrs.reputation + 2);
  careerLog(state, `Graduated: ${c.certificate}.`);
  notify(state, `Congratulations — you earned ${c.certificate}!`, "good");
  if (c.followOn) notify(state, "Law graduates must attend Law School to practise. See My Life → Education.", "info");
  if (p.education.nysc === "pending") notify(state, "You are due for National Youth Service. Start your NYSC year from My Life.", "info");
}

export function startNysc(state: GameState): Result {
  const p = state.player;
  if (p.education.nysc !== "pending") return fail("You are not due for NYSC.");
  const rng = subRng(state.meta.seed, "nysc", state.clock.monthIndex);
  const all = Object.keys(state.states).filter((s) => s !== p.residenceStateId);
  const posted = rng.chance(0.4) ? p.residenceStateId : rng.pick(all);
  p.education.nysc = "serving";
  p.education.nyscStateId = posted;
  p.occupation = { kind: "employed", jobId: null, title: "Youth corps member", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 40 };
  state.flags["nyscEnd"] = state.clock.monthIndex + 12;
  // a posting widens your network a little
  p.fame.states[posted] = clamp100((p.fame.states[posted] ?? 0) + 2);
  careerLog(state, `Posted to ${stateName(posted)} for NYSC.`);
  return good(`You were posted to ${stateName(posted)} for your service year.`);
}

export function jobChance(state: GameState, jobId: string): number {
  const j = JOB_BY_ID[jobId];
  const a = state.player.attrs;
  const net = Math.min(0.25, networkStrength(state) * 0.04);
  return clamp(0.8 - j.difficulty * 0.9 + a.intelligence / 400 + a.communication / 500 + net - (state.economy.unemployment - 5) * 0.01, 0.03, 0.95);
}

export function jobRequirements(state: GameState, jobId: string): string[] {
  const j = JOB_BY_ID[jobId];
  const p = state.player;
  const miss: string[] = [];
  if (EDUCATION_RANK[p.education.level] < EDUCATION_RANK[j.minEducation]) miss.push(`Needs ${j.minEducation} education`);
  if (j.requiresCert && !p.education.certificates.includes(j.requiresCert)) miss.push(`Needs ${j.requiresCert}`);
  if (j.requiresNysc && !(p.education.nysc === "done" || p.education.nysc === "exempt" || p.education.nysc === "na")) miss.push("Needs NYSC certificate");
  if (j.requiresNysc && p.education.nysc === "na" && EDUCATION_RANK[p.education.level] >= 3 && p.education.certificates.length > 1) miss.push("Needs NYSC certificate");
  return miss;
}

export function applyForJob(state: GameState, jobId: string): Result {
  const p = state.player;
  const j = JOB_BY_ID[jobId];
  if (!j) return fail("Unknown job.");
  if (p.occupation.kind === "politician") return fail("You hold public office; resign first.");
  if (p.education.enrolled && j.timePct > 60 && p.occupation.kind === "student") return fail("Finish or pause your studies first (jobs here are full-time).");
  const miss = jobRequirements(state, jobId);
  if (miss.length) return fail(miss.join(". ") + ".");
  const rng = subRng(state.meta.seed, "job", state.clock.monthIndex, jobId, p.career.length);
  const chance = jobChance(state, jobId);
  if (!rng.chance(chance)) {
    p.attrs.stress = clamp100(p.attrs.stress + 2);
    return fail(`The ${j.label.toLowerCase()} application was unsuccessful (${Math.round(chance * 100)}% odds). Try again later or improve your skills.`);
  }
  p.occupation = { kind: j.sector === "public" || j.isPublicService ? "civil_service" : j.variance > 0.2 ? "freelance" : "employed", jobId: j.id, title: j.label, baseSalary: j.salary * (state.economy.cpi / 100) * 0.9, since: state.clock.monthIndex, grade: 1, timePct: j.timePct };
  if (j.sector === "informal" || j.id === "consultant") p.occupation.kind = "freelance";
  if (j.sector === "private" || j.sector === "professional" || j.sector === "ngo" || j.sector === "media") p.occupation.kind = "employed";
  careerLog(state, `Started work as ${j.label}.`);
  return good(`You got the job: ${j.label}.`);
}

export function quitJob(state: GameState): Result {
  const p = state.player;
  if (p.occupation.kind === "unemployed" || p.occupation.kind === "student" || p.occupation.kind === "politician") return fail("Nothing to quit.");
  careerLog(state, `Left ${p.occupation.title}.`);
  p.occupation = { kind: p.business ? "business" : "unemployed", jobId: null, title: p.business ? `Owner, ${p.business.name}` : "Unemployed", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: p.business ? 60 : 0 };
  return good("You resigned.");
}

export function startBusiness(state: GameState, typeId: string, name: string): Result {
  const p = state.player;
  const def = BUSINESS_BY_ID[typeId];
  if (!def) return fail("Unknown business type.");
  if (p.business) return fail("You already own a business.");
  const cost = Math.round(def.startup * priceLevel(state));
  if (!canAfford(state, cost)) return fail(`Start-up capital needed: ₦${cost.toLocaleString()}.`);
  debit(state, "asset", cost, `Start-up capital: ${name}`);
  const lgas = LGAS_BY_STATE[p.residenceStateId];
  void lgas;
  const b: Business = { typeId, name: name.trim() || def.label, stateId: p.residenceStateId, lgaId: p.residenceLgaId, capital: cost * 0.4, employees: def.employees, monthlyRevenue: 0, monthlyCosts: 0, quality: clamp100(35 + p.attrs.financialMgmt * 0.4 + p.attrs.leadership * 0.2), since: state.clock.monthIndex, lossStreak: 0, contractsWon: 0 };
  p.business = b;
  if (p.occupation.kind === "unemployed") p.occupation = { kind: "business", jobId: null, title: `Owner, ${b.name}`, baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 60 };
  addAsset(state, `${b.name} (equity)`, Math.round(cost * 0.6), "equity");
  careerLog(state, `Started ${b.name} in ${lgaName(p.residenceLgaId)}.`);
  return good(`${b.name} is open for business.`);
}

export function closeBusiness(state: GameState): Result {
  const p = state.player;
  if (!p.business) return fail("You have no business.");
  const back = Math.round(p.business.capital * 0.6);
  credit(state, "business", back, `Closing ${p.business.name}: recovered capital`);
  p.finances.assets = p.finances.assets.filter((a) => !a.label.startsWith(p.business!.name));
  careerLog(state, `Closed ${p.business.name}.`);
  p.business = null;
  if (p.occupation.kind === "business") p.occupation = { kind: "unemployed", jobId: null, title: "Unemployed", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 0 };
  return good(`You wound up the business and recovered ₦${back.toLocaleString()}.`);
}

void pushNews;
