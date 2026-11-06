/** Creates a new game: world, parties, politicians, economy and the player's character. */
import type { GameState, Player, PlayerAttrs, Education } from "./types";
import { SIM_VERSION } from "./types";
import { RULESET_NG_2026 } from "../data/rules";
import { Rng, clamp100, hashString } from "./rng";
import { buildGeography, buildSeatsAndPoliticians, buildParties, initTreasuries, weightedAverageIndicators } from "./world";
import { initialEconomy } from "./economy";
import { emptyFinances, addAsset } from "./finance";
import { BACKGROUND_BY_ID, COURSE_BY_ID, JOB_BY_ID, INSTITUTION_COST, type InstType } from "../data/life";
import { makePrivate } from "./characters";
import { ensureRelationship } from "./relationships";
import { LGA_BY_ID, LGAS_BY_STATE, stateName } from "./admin";
import { EDUCATION_RANK } from "../data/rules";
import { processElections } from "./elections";
import { pushNews, careerLog } from "./news";
import { DEFAULT_ALLOCATIONS } from "./economy";
import { holderOf } from "./queries";
import { jobRequirements } from "./education";

export const ATTR_KEYS = ["intelligence", "communication", "leadership", "negotiation", "financialMgmt", "integrity", "ambition", "charisma"] as const;
export type CoreAttr = (typeof ATTR_KEYS)[number];
export const BONUS_POINTS = 24;
export const MAX_BONUS_PER_ATTR = 14;

export interface NewGameConfig {
  name: string;
  female: boolean;
  birthStateId: string;
  birthLgaId: string;
  startAge: number; // 18..45
  backgroundId: string;
  difficulty: "standard" | "challenging" | "sandbox";
  seed?: number;
  /** distribution of BONUS_POINTS across core attributes */
  bonus?: Partial<Record<CoreAttr, number>>;
  portrait?: { skin: number; hair: number; style: number; accent: number };
  /** for starting ages above 18: what the character did since leaving school */
  path?: { courseId?: string; jobId?: string };
  sandbox?: { startingCash?: number; noScandals?: boolean };
  /** optional overrides to the chosen background */
  familyOverrides?: { wealthTier?: number; politicalTies?: number };
}

export function validateConfig(cfg: NewGameConfig): string[] {
  const errs: string[] = [];
  if (!cfg.name.trim()) errs.push("Enter a name.");
  if (!LGA_BY_ID[cfg.birthLgaId]) errs.push("Choose a local government area.");
  else if (LGA_BY_ID[cfg.birthLgaId].stateId !== cfg.birthStateId) errs.push("That LGA is not in the selected state.");
  if (cfg.startAge < 18 || cfg.startAge > 45) errs.push("Starting age must be between 18 and 45.");
  if (!BACKGROUND_BY_ID[cfg.backgroundId]) errs.push("Choose a family background.");
  const spent = Object.values(cfg.bonus ?? {}).reduce((t, v) => t + (v ?? 0), 0);
  if (spent > BONUS_POINTS) errs.push(`You can spend at most ${BONUS_POINTS} bonus points.`);
  for (const v of Object.values(cfg.bonus ?? {})) if ((v ?? 0) > MAX_BONUS_PER_ATTR || (v ?? 0) < 0) errs.push(`Each attribute can take 0–${MAX_BONUS_PER_ATTR} bonus points.`);
  return errs;
}

export function randomSeed(): number {
  return (Math.floor(Math.random() * 2 ** 31) ^ Date.now()) >>> 0;
}

export function createNewGame(cfg: NewGameConfig): GameState {
  const errs = validateConfig(cfg);
  if (errs.length) throw new Error(errs.join(" "));
  const seed = (cfg.seed ?? randomSeed()) >>> 0;
  const rng = new Rng(hashString(`world|${seed}`));
  const rule = RULESET_NG_2026;
  const state = {
    meta: { id: `g${seed.toString(36)}`, name: cfg.name.trim(), seed, difficulty: cfg.difficulty, rulesetId: rule.id, scenarioId: "ng-2026", simVersion: SIM_VERSION, sandbox: cfg.difficulty === "sandbox" ? { startingCash: cfg.sandbox?.startingCash ?? 0, fixedWorld: false, noScandals: !!cfg.sandbox?.noScandals } : null },
    clock: { monthIndex: 0, processedThrough: 0 },
    rngState: seed,
    chars: {}, seats: {}, states: {}, lgas: {}, parties: {}, customParties: {}, contests: {}, electionLog: [], lastPresidential: null,
    eventLog: [], activeEffects: [], eventCooldowns: {}, flags: {}, pending: [], news: [], notifications: [], history: [],
    settings: { autoSave: true, reducedMotion: false, showTooltips: true }, nextId: 1, processed: {}, gameOver: null,
    government: { projects: [], appointees: [], legislativeSupport: 55, approval: 50, lastBudgetMonth: 0, pendingBill: null, allocations: null, actions: [], localTreasuryM: 0, borrowedM: 0, factionSatisfaction: {} },
  } as unknown as GameState;

  buildGeography(state, rng);
  state.economy = initialEconomy(weightedAverageIndicators(state).power);
  state.economy.allocations = { ...DEFAULT_ALLOCATIONS };
  initTreasuries(state, rng);

  // ---- the player (created before seats so catch-up elections see them)
  state.player = buildPlayer(state, cfg, rng);
  buildSeatsAndPoliticians(state, rng);
  buildParties(state, rng);
  const ruling = state.parties["NRC"];
  if (ruling) ruling.inPower = true;
  seedRelationships(state, rng);
  state.government.localTreasuryM = 0;

  // catch up any elections already under way at game start (off-cycle governorships, LGA polls)
  processElections(state);

  state.history.push({ m: 0, inflation: state.economy.inflation, unemployment: state.economy.unemployment, gdpGrowth: state.economy.gdpGrowth, satisfaction: state.economy.satisfaction, fx: state.economy.fxRate, purchasingPower: state.economy.purchasingPower, wealth: 0, popularity: 0 });
  careerLog(state, `Born in ${LGA_BY_ID[cfg.birthLgaId].name}, ${stateName(cfg.birthStateId)}. Life begins at ${cfg.startAge}.`);
  pushNews(state, { headline: `${state.player.name} begins a new chapter in ${LGA_BY_ID[cfg.birthLgaId].name}`, topic: "personal", importance: 1, stateId: cfg.birthStateId, source: "start", personal: true });
  return state;
}

function buildPlayer(state: GameState, cfg: NewGameConfig, rng: Rng): Player {
  const bg = BACKGROUND_BY_ID[cfg.backgroundId];
  const base = (x = 40) => clamp100(x + rng.normal(0, 4));
  const attrs: PlayerAttrs = {
    intelligence: base(44), communication: base(42), leadership: base(40), negotiation: base(40), financialMgmt: base(40), integrity: base(52), ambition: base(50),
    stress: 18, health: 88, politicalExperience: 0, reputation: base(46), charisma: base(42),
  };
  for (const [k, v] of Object.entries(bg.attrMods)) attrs[k as keyof PlayerAttrs] = clamp100(attrs[k as keyof PlayerAttrs] + (v as number));
  for (const k of ATTR_KEYS) attrs[k] = clamp100(attrs[k] + (cfg.bonus?.[k] ?? 0));

  const wealthTier = cfg.familyOverrides?.wealthTier ?? bg.wealthTier;
  const politicalTies = cfg.familyOverrides?.politicalTies ?? bg.politicalTies;
  const birthMonth = -(cfg.startAge * 12 + rng.int(0, 11));

  const education: Education = { level: "secondary", field: null, institution: null, institutionType: null, certificates: ["SSCE"], enrolled: null, nysc: "na", graduated: null };
  let occupation: Player["occupation"] = { kind: "unemployed", jobId: null, title: "School-leaver (job-seeking)", baseSalary: 0, since: 0, grade: 0, timePct: 0 };
  const careerNotes: { m: number; text: string }[] = [];

  const finances = emptyFinances();
  finances.cash = bg.cash;
  finances.savings = bg.savings;
  if (cfg.difficulty === "sandbox" && cfg.sandbox?.startingCash) finances.cash += cfg.sandbox.startingCash;
  if (cfg.difficulty === "challenging") { finances.cash = Math.round(finances.cash * 0.6); finances.savings = Math.round(finances.savings * 0.5); }
  for (const a of bg.assets) finances.assets.push({ id: `a${state.nextId++}`, label: a.label, value: a.value, kind: a.kind });
  for (const d of bg.debts) finances.debts.push({ id: `d${state.nextId++}`, label: d.label, principal: d.principal, rate: d.rate, monthlyPayment: Math.ceil(d.principal / d.months + (d.principal * d.rate) / 1200), remainingMonths: d.months });

  const player: Player = {
    id: "player", name: cfg.name.trim(), female: cfg.female, portrait: cfg.portrait ?? { skin: 2, hair: 1, style: 0, accent: 0 }, birthMonth,
    birthStateId: cfg.birthStateId, birthLgaId: cfg.birthLgaId, residenceLgaId: cfg.birthLgaId, residenceStateId: cfg.birthStateId, backgroundId: cfg.backgroundId,
    family: { wealthTier, politicalTies, fatherJob: rng.pick(bg.fatherJobs), motherJob: rng.pick(bg.motherJobs), relatives: [], obligation: bg.obligation, notes: bg.challenges },
    attrs, fame: { national: 0, states: {}, lgas: {} }, education, occupation, business: null, career: careerNotes,
    commitments: { volunteering: false, organising: false, partyWork: false, studentUnion: false, professionalBody: false, selfStudy: false, constituencyWork: false, family: false },
    finances,
    politics: { membership: null, capital: 5 + politicalTies * 3, candidacies: [], seatId: null, appointment: null, pastOffices: [], electionHistory: [], termsServed: {}, defections: 0, coalitions: [], warned: [] },
    integrity: { exposure: 0, legalRisk: 0, influence: politicalTies * 2, publicTrust: 60, schemes: [], cases: [], convictions: [], violations: [] },
    relationships: {}, flags: {}, alive: true, retiredFromPolitics: false,
  };

  // ---- life since 18 for older starting ages
  const yearsSince = cfg.startAge - 18;
  const course = cfg.path?.courseId ? COURSE_BY_ID[cfg.path.courseId] : null;
  if (yearsSince > 0 && course && course.level !== "masters" && course.id !== "law_school") {
    const inst: InstType = course.level === "nd" ? "polytechnic" : wealthTier >= 3 ? "private" : wealthTier >= 2 ? "state" : "federal";
    if (yearsSince >= course.years) {
      education.level = course.level;
      education.certificates.push(course.certificate);
      education.field = course.field;
      education.graduated = -(yearsSince - course.years) * 12;
      for (const [k, v] of Object.entries(course.attrGain)) attrs[k as keyof PlayerAttrs] = clamp100(attrs[k as keyof PlayerAttrs] + (v as number) * 0.9);
      if (course.followOn === "law_school" && yearsSince >= course.years + 1) { education.certificates.push("Called to the Bar (BL)"); }
      const after = yearsSince - course.years - (course.followOn ? 1 : 0);
      education.nysc = after >= 1 ? "done" : "pending";
      if (cfg.startAge > 30) education.nysc = "exempt";
      if (course.id === "law" && !education.certificates.includes("Called to the Bar (BL)")) occupation = { ...occupation, title: "Law graduate (Law School pending)" };
      else occupation = { ...occupation, title: "Graduate (job-seeking)" };
      careerNotes.push({ m: 0, text: `Graduated: ${course.certificate}.` });
    } else {
      const remaining = (course.years - yearsSince) * 12;
      const c = INSTITUTION_COST[inst];
      education.enrolled = { programmeId: course.id, startedMonth: -(yearsSince * 12), monthsRemaining: remaining, monthlyCost: Math.round(c.tuitionYear / 12 + c.livingMonth), delayed: 0 };
      education.institutionType = inst;
      education.field = course.field;
      education.institution = `${stateName(cfg.birthStateId)} ${c.label}`;
      occupation = { kind: "student", jobId: null, title: `Student, ${course.label}`, baseSalary: 0, since: -(yearsSince * 12), grade: 0, timePct: 55 };
    }
  } else if (yearsSince > 0) {
    occupation = { kind: "unemployed", jobId: null, title: "Looking for work", baseSalary: 0, since: 0, grade: 0, timePct: 0 };
  }
  if (cfg.path?.jobId && yearsSince > 0) {
    const j = JOB_BY_ID[cfg.path.jobId];
    // temporarily attach to a throw-away state-like object for the requirement check
    const miss = j ? jobRequirements({ player } as unknown as GameState, j.id) : ["x"];
    if (j && !miss.length && !education.enrolled) {
      occupation = { kind: j.sector === "public" || j.isPublicService ? "civil_service" : j.variance > 0.2 ? "freelance" : "employed", jobId: j.id, title: j.label, baseSalary: j.salary * 0.95, since: -12, grade: 1, timePct: j.timePct };
      careerNotes.push({ m: 0, text: `Working as ${j.label}.` });
    }
  }
  player.occupation = occupation;
  // maturity bonuses from age
  attrs.politicalExperience = clamp100(yearsSince * 0.6);
  attrs.reputation = clamp100(attrs.reputation + yearsSince * 0.4);
  if (yearsSince > 0) player.finances.savings += Math.round(yearsSince * 30_000 * (1 + wealthTier * 0.3));

  // ---- family
  const lga = LGA_BY_ID[cfg.birthLgaId];
  const family: { id: string; role: Player["family"]["relatives"][number]["role"] }[] = [];
  const surname = undefined;
  void surname;
  const father = makePrivate(state, rng, { stateId: cfg.birthStateId, lgaId: lga.id, birthYear: 2026 - cfg.startAge - rng.int(24, 38), female: false, role: `Father — ${player.family.fatherJob}` });
  const mother = makePrivate(state, rng, { stateId: cfg.birthStateId, lgaId: lga.id, birthYear: 2026 - cfg.startAge - rng.int(22, 36), female: true, surname: father.name.split(" ")[1], role: `Mother — ${player.family.motherJob}` });
  family.push({ id: father.id, role: "father" }, { id: mother.id, role: "mother" });
  const sibs = rng.int(0, 3);
  for (let i = 0; i < sibs; i++) {
    const s = makePrivate(state, rng, { stateId: cfg.birthStateId, lgaId: lga.id, birthYear: 2026 - cfg.startAge + rng.int(-6, 8), female: rng.chance(0.5), surname: father.name.split(" ")[1], role: "Sibling" });
    family.push({ id: s.id, role: "sibling" });
  }
  player.family.relatives = family;
  for (const f of family) {
    state.player = player; // relationships need state.player
    player.relationships[f.id] = { id: f.id, kind: "family", affinity: Math.round(55 + rng.normal(0, 12)), favours: 0, since: 0, last: 0 };
  }
  return player;
}

/** Introduce the player to local office-holders according to their family's political ties. */
function seedRelationships(state: GameState, rng: Rng): void {
  const p = state.player;
  const ties = p.family.politicalTies;
  if (ties <= 0 && p.family.wealthTier < 3) return;
  const sid = p.birthStateId;
  const chair = holderOf(state, `lgc:${p.birthLgaId}`);
  if (chair) ensureRelationship(state, chair.id, "associate", ties * 6 + rng.int(0, 6));
  const st = state.states[sid];
  const rep = st.repsSeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(p.birthLgaId));
  if (rep && ties >= 2) { const h = holderOf(state, rep.id); if (h) ensureRelationship(state, h.id, "associate", ties * 5); }
  const sha = st.assemblySeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(p.birthLgaId));
  if (sha && ties >= 2) { const h = holderOf(state, sha.id); if (h) ensureRelationship(state, h.id, "associate", ties * 5); }
  if (ties >= 4) { const g = holderOf(state, st.governorSeatId); if (g) ensureRelationship(state, g.id, "patron", 12 + rng.int(0, 8)); }
  if (p.family.wealthTier >= 3 && st.governorSeatId) { const g = holderOf(state, st.governorSeatId); if (g) ensureRelationship(state, g.id, "associate", 6); }
  p.fame.lgas[p.birthLgaId] = ties >= 3 ? 4 : 0;
}

void LGAS_BY_STATE;
void EDUCATION_RANK;
void addAsset;
