/**
 * Personal life simulation: living costs, income, education, jobs, business, commitments, stress and health.
 * Runs in a fixed order each month (see turn.ts): expenses → income → education/career → wellbeing.
 * Every money movement goes through finance.ts with a labelled category.
 */
import type { GameState } from "./types";
import { credit, debit, serviceDebts, liquid } from "./finance";
import { notify, careerLog, pushNews } from "./news";
import { subRng, clamp, clamp100 } from "./rng";
import { priceLevel } from "./queries";
import { BACKGROUNDS, BACKGROUND_BY_ID, COURSE_BY_ID, JOB_BY_ID, BUSINESS_BY_ID, LIVING_COSTS, STUDENT_COMMITMENT_TIME, INSTITUTION_COST } from "../data/life";
import { EDUCATION_RANK } from "../data/rules";
import { playerAge } from "./calendar";
import { STATE_BY_ID } from "../data/states";
import { applyEducationAward } from "./education";

void BACKGROUNDS;

export function timeBudget(state: GameState): { used: number; items: { label: string; pct: number }[] } {
  const p = state.player;
  const items: { label: string; pct: number }[] = [];
  if (p.occupation.timePct > 0) items.push({ label: p.occupation.title, pct: p.occupation.timePct });
  if (p.education.enrolled && p.occupation.kind !== "student") items.push({ label: "Studies", pct: 35 });
  const labels: Record<string, string> = { volunteering: "Volunteering", organising: "Community organising", partyWork: "Party work", studentUnion: "Student union", professionalBody: "Professional association", selfStudy: "Self-study", constituencyWork: "Constituency work", family: "Family time" };
  for (const [k, on] of Object.entries(p.commitments)) if (on) items.push({ label: labels[k], pct: STUDENT_COMMITMENT_TIME[k as keyof typeof STUDENT_COMMITMENT_TIME] });
  const camp = p.politics.candidacies.find((c) => c.stage === "nominee");
  if (camp) items.push({ label: "Campaigning", pct: 30 });
  if (p.politics.seatId) items.push({ label: "Official duties", pct: 35 });
  return { used: items.reduce((t, i) => t + i.pct, 0), items };
}

export function monthlyLivingCost(state: GameState): { food: number; transport: number; utilities: number; rent: number } {
  const p = state.player;
  const tier = p.family.wealthTier;
  const meta = STATE_BY_ID[p.residenceStateId];
  const loc = 0.85 + meta.urbanTier * 0.15;
  const pl = priceLevel(state) * loc;
  const powerCost = 1 + (60 - state.economy.electricity) * 0.004; // diesel/generator costs
  const fuel = state.economy.fuelPrice / 925;
  const student = p.occupation.kind === "student";
  const tierEff = Math.min(4, student ? Math.max(0, tier - 1) : tier);
  const rentOn = !(playerAge(state) < 22 && tier <= 3 && p.occupation.kind === "student") && p.occupation.kind !== "politician";
  return {
    food: Math.round(LIVING_COSTS.food[tierEff] * pl),
    transport: Math.round(LIVING_COSTS.transport[tierEff] * pl * fuel),
    utilities: Math.round(LIVING_COSTS.utilities[tierEff] * pl * powerCost),
    rent: rentOn && tier <= 3 ? Math.round(LIVING_COSTS.rent[Math.min(tierEff, 3)] * pl) : 0,
  };
}

/** 1. personal circumstances and recurring expenses */
export function processExpenses(state: GameState): void {
  const p = state.player;
  const c = monthlyLivingCost(state);
  if (state.meta.sandbox && state.meta.difficulty === "sandbox" && state.flags["noExpenses"]) return;
  debit(state, "food", c.food, "Food and groceries", { mandatory: true });
  debit(state, "transport", c.transport, "Transport (fuel & fares)", { mandatory: true });
  debit(state, "utilities", c.utilities, "Electricity, generator fuel, data", { mandatory: true });
  if (c.rent) debit(state, "rent", c.rent, "Rent", { mandatory: true });
  if (p.commitments.family) {
    debit(state, "family", Math.round(p.family.obligation * 0.6 * priceLevel(state)), "Support for family and relatives", { mandatory: false });
  } else if (p.family.obligation > 0) {
    const amt = Math.round(p.family.obligation * 0.35 * priceLevel(state));
    debit(state, "family", amt, "Family obligations", { mandatory: false });
  }
  const enr = p.education.enrolled;
  if (enr) debit(state, "education", Math.round(enr.monthlyCost * priceLevel(state)), "Tuition and student upkeep", { mandatory: true });
  serviceDebts(state);
}

/** 2. employment, income and economic changes */
export function processIncome(state: GameState): void {
  const p = state.player;
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "income", m);
  const eco = state.economy;
  const occ = p.occupation;
  const wage = eco.wageIndex / 100;
  if (occ.kind === "employed" || occ.kind === "civil_service" || occ.kind === "freelance") {
    const job = occ.jobId ? JOB_BY_ID[occ.jobId] : null;
    const vol = job?.variance ?? 0;
    let pay = occ.baseSalary * wage;
    if (vol > 0.1) pay *= clamp(1 + rng.normal(0, vol) * (0.7 + (50 - eco.businessActivity) * -0.01), 0.4, 1.8);
    if (job?.isPublicService && rng.chance(0.015 * (state.states[p.residenceStateId].indicators.economy < 40 ? 3 : 1))) {
      notify(state, "Your salary was delayed this month.", "warn");
      pay = 0;
    }
    if (pay > 0) credit(state, "salary", Math.round(pay), `Pay: ${occ.title}`);
  } else if (occ.kind === "politician") {
    // official remuneration is only paid for the office actually held
    const seat = p.politics.seatId ? state.seats[p.politics.seatId] : null;
    if (seat) {
      const pay = state_rule(state, seat.office);
      credit(state, "office_pay", Math.round(pay * Math.max(1, priceLevel(state) * 0.8)), `Official remuneration: ${seat.label}`);
    }
  }
  if (p.politics.appointment && occ.kind !== "politician") credit(state, "office_pay", Math.round(400_000 * priceLevel(state)), `Appointment: ${p.politics.appointment.label}`);

  // business
  if (p.business) {
    const b = p.business;
    const def = BUSINESS_BY_ID[b.typeId];
    const stEco = state.states[b.stateId].indicators;
    const power = 1 - def.powerSensitivity * ((60 - stEco.power) / 100 + 0.1);
    const fuel = 1 - def.fuelSensitivity * ((eco.fuelPrice / 925) - 1) * 0.5;
    const demand = 0.6 + (eco.businessActivity / 50) * 0.3 + (stEco.economy / 100) * 0.3;
    const sec = 0.85 + (stEco.security / 100) * 0.15;
    const qual = 0.7 + b.quality / 150;
    const rev = def.revenue * priceLevel(state) * demand * power * fuel * sec * qual * clamp(1 + rng.normal(0, def.id === "tech" ? 0.3 : 0.08), 0.4, 2);
    const costs = def.costs * priceLevel(state) * (1 + def.powerSensitivity * (60 - eco.electricity) * 0.004) * (1 + (eco.interestRate - 18) * 0.004);
    b.monthlyRevenue = Math.round(rev);
    b.monthlyCosts = Math.round(costs);
    const profit = rev - costs;
    if (profit >= 0) {
      const owner = profit * 0.7;
      credit(state, "business", Math.round(owner), `${b.name}: owner's profit`);
      b.capital += profit * 0.3;
      b.lossStreak = 0;
    } else {
      b.lossStreak += 1;
      b.capital += profit;
      if (b.capital < 0) {
        debit(state, "business", Math.round(-b.capital), `${b.name}: covering losses`, { mandatory: true });
        b.capital = 0;
      }
      if (b.lossStreak >= 8 && rng.chance(0.2)) {
        notify(state, `${b.name} has collapsed after months of losses.`, "bad");
        careerLog(state, `${b.name} shut down.`);
        p.business = null;
        if (p.occupation.kind === "business") p.occupation = { kind: "unemployed", jobId: null, title: "Unemployed", baseSalary: 0, since: m, grade: 0, timePct: 0 };
      }
    }
  }

  // savings interest (real rate eroded by inflation is felt through prices, not here)
  if (p.finances.savings > 0) credit(state, "interest", Math.round((p.finances.savings * Math.max(2, eco.interestRate - 8)) / 1200), "Savings interest");
}

function state_rule(state: GameState, office: string): number {
  const r = state.meta.rulesetId;
  void r;
  return ({ councillor: 150_000, lg_chair: 1_200_000, state_assembly: 2_000_000, reps: 4_000_000, senate: 6_000_000, governor: 5_000_000, president: 8_000_000 } as Record<string, number>)[office] ?? 0;
}

/** 3. education & career progress */
export function processCareer(state: GameState): void {
  const p = state.player;
  const m = state.clock.monthIndex;
  const rng = subRng(state.meta.seed, "career", m);
  const edu = p.education;
  if (edu.enrolled) {
    edu.enrolled.monthsRemaining -= 1;
    const course = COURSE_BY_ID[edu.enrolled.programmeId];
    // monthly learning
    for (const [k, v] of Object.entries(course.attrGain)) {
      const a = k as keyof typeof p.attrs;
      p.attrs[a] = clamp100(p.attrs[a] + (v as number) / (course.years * 12));
    }
    if (edu.enrolled.monthsRemaining <= 0) applyEducationAward(state);
  }
  if (edu.nysc === "serving") {
    edu.nysc = "serving";
    if (!state.flags["nyscEnd"]) state.flags["nyscEnd"] = m + 12;
    if (m >= Number(state.flags["nyscEnd"])) {
      edu.nysc = "done";
      delete state.flags["nyscEnd"];
      careerLog(state, "Completed National Youth Service.");
      notify(state, "You completed your NYSC year and received your certificate.", "good");
      if (p.occupation.kind === "student" || p.occupation.title === "Youth corps member") p.occupation = { kind: "unemployed", jobId: null, title: "Unemployed", baseSalary: 0, since: m, grade: 0, timePct: 0 };
    } else {
      credit(state, "salary", Math.round(33_000 * priceLevel(state)), "NYSC allowance");
    }
  }
  // job gains & progression
  const occ = p.occupation;
  const job = occ.jobId ? JOB_BY_ID[occ.jobId] : null;
  if (job) {
    for (const [k, v] of Object.entries(job.gains)) {
      if (k === "connections") p.politics.capital = clamp100(p.politics.capital + (v as number) * 0.4);
      else if (k === "fame") bumpFame(state, v as number);
      else {
        const a = k as keyof typeof p.attrs;
        p.attrs[a] = clamp100(p.attrs[a] + (v as number));
      }
    }
    for (const pr of job.progression ?? []) {
      if (m - occ.since >= pr.afterMonths && rng.chance(0.08)) {
        const to = JOB_BY_ID[pr.to];
        if (EDUCATION_RANK[edu.level] >= EDUCATION_RANK[to.minEducation]) {
          p.occupation = { ...occ, jobId: to.id, title: to.label, baseSalary: to.salary, since: m, timePct: to.timePct, grade: occ.grade + 1 };
          careerLog(state, `Promoted to ${to.label}.`);
          notify(state, `Promotion: you are now ${to.label}.`, "good");
        }
      }
    }
  }
  if (p.business) {
    p.attrs.financialMgmt = clamp100(p.attrs.financialMgmt + 0.05);
    p.attrs.leadership = clamp100(p.attrs.leadership + 0.03);
    bumpFame(state, 0.08);
  }
}

function bumpFame(state: GameState, amt: number) {
  const p = state.player;
  p.fame.lgas[p.residenceLgaId] = clamp100((p.fame.lgas[p.residenceLgaId] ?? 0) + amt);
  p.fame.states[p.residenceStateId] = clamp100((p.fame.states[p.residenceStateId] ?? 0) + amt * 0.3);
  p.fame.national = clamp100(p.fame.national + amt * 0.05);
}

/** 4. commitments, stress, health and slow attribute drift */
export function processWellbeing(state: GameState): void {
  const p = state.player;
  const a = p.attrs;
  const tb = timeBudget(state);
  const c = p.commitments;
  if (c.volunteering) { bumpFame(state, 0.35); a.reputation = clamp100(a.reputation + 0.08); a.leadership = clamp100(a.leadership + 0.03); p.politics.capital = clamp100(p.politics.capital + 0.05); }
  if (c.organising) { bumpFame(state, 0.6); a.leadership = clamp100(a.leadership + 0.07); a.communication = clamp100(a.communication + 0.05); a.politicalExperience = clamp100(a.politicalExperience + 0.12); }
  if (c.partyWork && p.politics.membership) {
    p.politics.membership.standing = clamp100(p.politics.membership.standing + 0.6);
    a.politicalExperience = clamp100(a.politicalExperience + 0.15);
    bumpFame(state, 0.2);
    p.politics.capital = clamp100(p.politics.capital + 0.12);
  }
  if (c.studentUnion) { a.leadership = clamp100(a.leadership + 0.06); a.communication = clamp100(a.communication + 0.06); bumpFame(state, 0.25); }
  if (c.professionalBody) { p.politics.capital = clamp100(p.politics.capital + 0.1); a.negotiation = clamp100(a.negotiation + 0.04); }
  if (c.selfStudy) a.intelligence = clamp100(a.intelligence + 0.08);
  if (c.constituencyWork && p.politics.seatId) { bumpFame(state, 0.5); a.reputation = clamp100(a.reputation + 0.05); }
  if (c.family) { a.stress = clamp100(a.stress - 1); }
  const over = Math.max(0, tb.used - 100);
  const under = tb.used < 60 ? (60 - tb.used) * 0.04 : 0;
  a.stress = clamp100(a.stress + over * 0.12 - 1.2 - under * 0 + (liquid(p.finances) < 5000 ? 1.2 : 0) + p.finances.debts.length * 0.15);
  if (state.economy.inflation > 25) a.stress = clamp100(a.stress + 0.2);
  // health follows stress
  a.health = clamp100(a.health + (a.stress > 70 ? -0.8 : a.stress < 35 ? 0.5 : 0) - (over > 20 ? 0.5 : 0));
  // reputation and trust drift gently towards integrity
  a.reputation = clamp100(a.reputation + (a.integrity - 50) * 0.002);
  p.integrity.publicTrust = clamp100(p.integrity.publicTrust + (a.reputation - 50) * 0.002);
  // mortality: very small and age/health dependent
  const age = playerAge(state);
  if (age >= 55) {
    const rng = subRng(state.meta.seed, "mortality", state.clock.monthIndex);
    const base = 0.00015 * Math.exp((age - 55) / 7) * (1 + (50 - a.health) / 60) * (state.states[p.residenceStateId].indicators.health < 40 ? 1.2 : 1);
    if (rng.chance(clamp(base, 0, 0.1))) {
      p.alive = false;
      state.gameOver = { month: state.clock.monthIndex, kind: "died", text: `${p.name} died at ${age}.` };
      pushNews(state, { headline: `${p.name} dies at ${age}`, topic: "personal", importance: 2, source: `death:${p.id}`, personal: true });
    }
  }
}

export function backgroundOf(state: GameState) {
  return BACKGROUND_BY_ID[state.player.backgroundId];
}
export { INSTITUTION_COST };
