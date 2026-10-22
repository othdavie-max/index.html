import {
  HOUSE_KINDS, JOB_BY_ID, OFFICES, STATE_BY_ID, TRAVEL_STATES, TRIBES_BY_REGION, birthWeight, defaultReligion, payMult, poolFor, travelCost,
} from "./data";
import { AUTOS, EVENTS } from "./events";
import { AUTOS2, EVENTS2 } from "./events2";
import { I, bump, expandCostFor, jobDef, jobTitle, moveTo, randomName, stateOf } from "./helpers";
import { kidnapRisk, kidnapStep, makeKidnap, netWorth, type KidnapAction } from "./kidnap";
import { buyLuxury, divest, invest, investBlock, luxuryBlock, yearlyHoldings, yearlyUpkeep } from "./lifestyle";
import { POLITICS_EVENTS, canContest, canJoinPolitics, canPlotCoup, contestPending, freshNation, joinPolitics, migratePolitics, plotCoup, politicalRelease, powerMoveBlock, runGov, runPowerMove, yearlyPolitics, GOV_ACTIONS } from "./politics";
import type { EventDef, Game, Gender, HoldingKind, House, HouseKind, HouseUse, LineageEntry, Pending, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt, uid, weightedPick } from "./util";

const ALL_EVENTS: EventDef[] = [...EVENTS, ...EVENTS2, ...POLITICS_EVENTS];
const ALL_AUTOS = [...AUTOS, ...AUTOS2];
export const EVENT_DEFS: Record<string, EventDef> = Object.fromEntries(ALL_EVENTS.map((e) => [e.id, e]));
const START_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function addLog(p: Player, text: string) {
  const last = p.log[p.log.length - 1];
  if (last && last.age === p.age) last.lines.push(text);
  else p.log.push({ age: p.age, year: p.birthYear + p.age, lines: [text] });
  if (p.log.length > 140) p.log.shift();
}

/** The game never shows negative cash: shortfalls become debt. */
function settle(p: Player) {
  if (p.money < 0) {
    p.debt += -p.money;
    p.money = 0;
  }
  p.peakWorth = Math.max(p.peakWorth, netWorth(p));
  for (const k of Object.keys(p.stats) as (keyof Player["stats"])[]) p.stats[k] = clamp(p.stats[k]);
}

/** Fill in fields that older saves do not have. */
export function migrate(g: Game): Game {
  migratePolitics(g.p);
  return g;
}

export function worth(p: Player): number {
  return netWorth(p);
}

// ---------------------------------------------------------------------------
// Starting a life
// ---------------------------------------------------------------------------
export interface NewLifeOptions {
  name: string;
  gender: Gender;
  stateId: string | null;
  tribe: string | null;
  religion: string | null;
}

function pickBirthState(): string {
  const items = TRAVEL_STATES.map((s) => ({ item: s.id, w: birthWeight(s.id) }));
  return weightedPick(items) ?? "niger";
}

function rollClass(opp: number): "struggling" | "middle" | "rich" {
  const rich = 0.03 + opp * 0.012;
  const mid = 0.22 + opp * 0.03;
  const r = Math.random();
  if (r < rich) return "rich";
  if (r < rich + mid) return "middle";
  return "struggling";
}

const CLASS_TEXT = {
  struggling: "a struggling family that depends on faith and small trading",
  middle: "a middle-class family with a modest house and steady jobs",
  rich: "a wealthy family with a big compound and big connections",
};

function enrollByAge(p: Player) {
  p.edu = "none";
  p.school = null;
  if (p.age >= 18) p.edu = "secondary";
  else if (p.age >= 12) { p.edu = "primary"; p.school = { stage: "secondary", yearsLeft: 18 - p.age, type: "school" }; }
  else if (p.age >= 6) p.school = { stage: "primary", yearsLeft: 12 - p.age, type: "school" };
}

export function newGame(opts: NewLifeOptions): Game {
  const stateId = opts.stateId ?? pickBirthState();
  const st = STATE_BY_ID[stateId];
  const tribe = opts.tribe ?? pick(TRIBES_BY_REGION[st.region]);
  const religion = opts.religion ?? defaultReligion(st.region);
  const cls = rollClass(st.opp);
  const surnamePool = poolFor(tribe).surnames;
  const raw = opts.name.trim();
  const [first, ...rest] = raw.split(/\s+/);
  const given = first || randomName(tribe, opts.gender);
  const surname = rest.join(" ") || pick(surnamePool);
  const conn = cls === "rich" ? randInt(30, 55) : cls === "middle" ? randInt(10, 25) : randInt(3, 10);
  const p: Player = {
    id: uid(),
    name: given,
    surname,
    gender: opts.gender,
    tribe,
    religion,
    birthState: stateId,
    state: stateId,
    age: 0,
    birthYear: START_YEAR,
    generation: 1,
    alive: true,
    cause: "",
    classAtBirth: cls,
    stats: { health: randInt(70, 100), happiness: randInt(70, 95), smarts: randInt(20, 80), looks: randInt(20, 90), stress: 5, connections: conn, reputation: 50 },
    money: 0,
    debt: 0,
    index: 1,
    edu: "none",
    course: null,
    school: null,
    job: null,
    houses: [],
    holdings: [],
    family: { state: stateId, happy: 70, parentsAlive: true },
    spouse: null,
    kids: [],
    traveled: false,
    actionsLeft: 3,
    prison: 0,
    politics: null,
    nation: freshNation(),
    loot: 0,
    goodDeeds: 0,
    prestige: 0,
    kidnaps: 0,
    flags: {},
    achievements: [],
    peakWorth: 0,
    log: [],
  };
  addLog(p, `You were born in ${st.capital}, ${st.name} State, to ${CLASS_TEXT[cls]}. You are ${tribe}, ${religion}.`);
  if (st.opp <= 3) addLog(p, "Opportunities are few in your area. Many people here dream of moving to Abuja or Lagos.");
  return { p, queue: [], dynasty: { surname, lineage: [] } };
}

// ---------------------------------------------------------------------------
// Death and legacy
// ---------------------------------------------------------------------------
function epitaphFor(p: Player): string {
  const high = p.politics?.highest ?? -1;
  if (high >= 4) {
    if (p.goodDeeds >= 6 && p.loot < p.goodDeeds * 5_000_000_000) return high === 5 ? "The Reformer President" : "The Reformer Governor";
    if (p.loot > 0 && p.goodDeeds <= 2) return high === 5 ? "The Looter-in-Chief" : "The Looter Governor";
    return "The Typical Big Man";
  }
  if (p.job?.id === "kidnapper" || p.cause.includes("kidnap")) return "A Dangerous Name";
  if (p.peakWorth / p.index > 1_000_000_000) return "Self-Made Billionaire";
  if (p.peakWorth / p.index > 50_000_000) return "A Successful Hustler";
  if (p.kids.length >= 3) return "A Family Man/Woman";
  return "A Survivor";
}

function ensureRecorded(g: Game) {
  const p = g.p;
  if (p.alive || p.flags.recorded) return;
  p.flags.recorded = true;
  g.queue = [];
  const high = p.politics?.highest ?? -1;
  const entry: LineageEntry = {
    name: `${p.name} ${p.surname}`,
    generation: p.generation,
    born: p.birthYear,
    died: p.birthYear + p.age,
    ageAtDeath: p.age,
    cause: p.cause || "Natural causes",
    worth: netWorth(p),
    peakWorth: p.peakWorth,
    highestOffice: high >= 0 ? OFFICES[high].title : jobTitle(p),
    state: stateOf(p).name,
    prestige: p.prestige,
    loot: p.loot,
    goodDeeds: p.goodDeeds,
    epitaph: epitaphFor(p),
  };
  g.dynasty.lineage.push(entry);
  addLog(p, `You died at ${p.age}: ${entry.cause}.`);
}

export function startHeir(g0: Game, kidIndex: number): Game {
  const g = structuredClone(g0);
  const old = g.p;
  const kid = old.kids[kidIndex];
  if (!kid) return g;
  const deathYear = old.birthYear + old.age;
  const wealthNow = Math.max(0, netWorth(old));
  const estate = 0.7;
  const idxWealth = (wealthNow * estate) / old.index;
  const cls = idxWealth > 200_000_000 ? "rich" : idxWealth > 5_000_000 ? "middle" : "struggling";
  const p: Player = {
    ...structuredClone(old),
    id: uid(),
    name: kid.name,
    gender: kid.gender,
    age: kid.age,
    birthYear: deathYear - kid.age,
    generation: old.generation + 1,
    alive: true,
    cause: "",
    birthState: old.state,
    classAtBirth: cls,
    stats: {
      health: randInt(65, 100), happiness: randInt(55, 90), smarts: clamp(old.stats.smarts + randInt(-20, 20), 15, 95), looks: randInt(25, 90),
      stress: 10, connections: Math.round(old.stats.connections * 0.6), reputation: Math.round(30 + old.stats.reputation * 0.5),
    },
    money: Math.round(old.money * estate),
    debt: Math.round(old.debt),
    edu: "none",
    course: null,
    school: null,
    job: null,
    houses: old.houses.map((h) => ({ ...h, value: h.value })),
    holdings: old.holdings.map((h) => ({ ...h, invested: Math.round(h.invested * estate), value: Math.round(h.value * estate) })),
    family: { state: old.state, happy: 60, parentsAlive: false },
    spouse: null,
    kids: [],
    traveled: false,
    actionsLeft: 3,
    prison: 0,
    politics: null,
    nation: freshNation(),
    loot: 0,
    goodDeeds: 0,
    prestige: Math.round(old.prestige * 0.5),
    kidnaps: 0,
    flags: Object.fromEntries(Object.entries(old.flags).filter(([k]) => k.startsWith("own_"))) as Player["flags"],
    achievements: [],
    peakWorth: 0,
    log: [],
  };
  enrollByAge(p);
  if (p.age >= 18 && cls === "rich" && chance(0.6)) {
    p.edu = "tertiary";
    p.course = pick(["Law", "Medicine", "Engineering", "Accounting"]);
  }
  p.houses = p.houses.map((h) => ({ ...h, use: h.state === p.state ? "owner" : "empty" }));
  p.flags.dynasty = old.generation;
  settle(p);
  addLog(p, `You are ${p.name} ${p.surname}, the ${old.gender === "male" ? "son" : "daughter"} of ${old.name}. ${old.name} left you ${naira(p.money)} in cash${p.houses.length ? `, ${p.houses.length} house${p.houses.length > 1 ? "s" : ""}` : ""}${p.holdings.length ? " and investments" : ""}. The family name is now in your hands.`);
  return { p, queue: [], dynasty: g.dynasty };
}

export function startNewFamily(g: Game, opts: NewLifeOptions): Game {
  const ng = newGame(opts);
  ng.dynasty.lineage = [];
  return ng;
}

// ---------------------------------------------------------------------------
// The year tick
// ---------------------------------------------------------------------------
function deathChance(p: Player): number {
  const a = p.age;
  let d = Math.pow(a / 98, 7);
  d += ((100 - p.stats.health) / 100) * (a > 30 ? 0.006 : 0.002);
  if (p.stats.health < 15) d += 0.1;
  if (a < 5) d += 0.008;
  return clamp(d, 0, 0.95);
}
const CAUSES = ["Heart attack", "Stroke", "Complications of malaria", "A short illness", "Kidney failure", "Typhoid complications", "Hypertension"];

function schoolTick(p: Player, lines: string[], pending: Pending[]) {
  if (!p.school && p.age === 6 && p.edu === "none") {
    p.school = { stage: "primary", yearsLeft: 6, type: "school" };
    lines.push(p.classAtBirth === "rich" ? "You start primary school for one private school with school bus." : "You start primary school for the local school.");
    return;
  }
  if (!p.school) return;
  if (p.school.stage !== "tertiary") bump(p, "smarts", chance(0.5) ? 1 : 0);
  p.school.yearsLeft -= 1;
  if (p.school.yearsLeft > 0) return;
  const stage = p.school.stage;
  p.school = null;
  if (stage === "primary") {
    p.edu = "primary";
    p.school = { stage: "secondary", yearsLeft: 6, type: "school" };
    lines.push("You pass Common Entrance and start secondary school.");
  } else if (stage === "secondary") {
    p.edu = "secondary";
    lines.push("You finish secondary school. WAEC result don come out.");
    pending.push({ kind: "event", id: "jamb", data: {} });
  } else {
    p.edu = "tertiary";
    lines.push(`You graduate${p.course ? ` with degree in ${p.course}` : ""}. Your family throw small party.`);
    bump(p, "smarts", 3);
    if (!p.flags.nysc && p.age < 32) pending.push({ kind: "event", id: "nysc", data: { posted: pick(TRAVEL_STATES.filter((s) => s.id !== "abuja" && s.id !== "lagos")).id } });
  }
}

export function ageUp(g0: Game): Game {
  const g = structuredClone(g0);
  const p = g.p;
  if (!p.alive || g.queue.length > 0) return g;
  p.age += 1;
  p.actionsLeft = 3 + (p.politics && p.politics.office >= 2 ? 1 : 0);
  const lines: string[] = [];
  const pending: Pending[] = [];

  // Inflation
  let rate = rand(0.03, 0.15);
  if (chance(0.06)) {
    const shock = rand(0.08, 0.2);
    rate += shock;
    lines.push(`Economic shock: prices jump ${Math.round(rate * 100)}% this year.`);
  }
  p.index *= 1 + rate;
  for (const h of p.houses) h.value = Math.round(h.value * (1 + rate * 0.9));
  for (const k of p.kids) k.age += 1;

  schoolTick(p, lines, pending);

  const st = stateOf(p);
  if (p.prison > 0) {
    p.prison -= 1;
    bump(p, "health", -3);
    bump(p, "happiness", -4);
    lines.push(p.prison > 0 ? "Another year for Kuje prison." : "You was released from prison.");
    if (p.prison === 0) politicalRelease(p, pending);
  } else if (p.age >= 16) {
    let income = 0;
    const j = jobDef(p);
    if (p.job && j) {
      const rung = j.ladder[Math.min(p.job.rank, j.ladder.length - 1)];
      const pay = rung.pay * payMult(j, st) * Math.pow(p.index, 0.8) * rand(0.75, 1.25);
      income += pay;
      p.job.years += 1;
      if (!j.selfEmployed && p.job.rank < j.ladder.length - 1 && p.job.years >= 2) {
        const base = j.group === "creative" ? 0.07 + (p.stats.looks + p.stats.smarts) / 1500 : 0.12 + p.stats.connections / 400 + p.stats.smarts / 500;
        if (chance(base + p.stats.connections / 600)) {
          p.job.rank += 1;
          p.job.years = 0;
          lines.push(`Promotion! You don become: ${j.ladder[p.job.rank].title}.`);
          if (j.id === "kidnapper" || j.id === "yahoo") bump(p, "reputation", -2);
        }
      }
      if (j.id === "yahoo" && chance(0.1)) pending.push({ kind: "event", id: "arrested", data: {} });
      if (j.id === "kidnapper" && chance(0.07)) pending.push({ kind: "event", id: "arrested", data: {} });
      lines.push(`Income: ${naira(pay)}${j.selfEmployed ? ` from your ${j.title.toLowerCase()} business` : ` as ${rung.title}`}.`);
    }
    for (const h of p.houses) {
      if (h.use === "rent" && chance(0.88)) {
        income += HOUSE_KINDS[h.kind].rent * STATE_BY_ID[h.state].cost * Math.pow(p.index, 0.9) * rand(0.9, 1.1);
      }
    }
    let living = 0;
    let rent = 0;
    if (p.age >= 18) {
      const atHome = p.age < 24 && p.family.state === p.state;
      living = 700_000 * st.cost * p.index * (1 + 0.2 * Math.min(p.kids.length, 4)) * (atHome ? 0.5 : 1);
      const homeHere = p.houses.some((h) => h.state === p.state && (h.use === "owner" || h.use === "family"));
      rent = homeHere || atHome ? 0 : 300_000 * st.cost * p.index;
    }
    const upkeep = yearlyUpkeep(p);
    p.money += income - living - rent - upkeep;
    if (p.debt > 0) {
      p.debt *= 1.15;
      const repay = Math.min(p.debt, Math.max(0, p.money) * 0.35);
      p.money -= repay;
      p.debt -= repay;
    }
    if (p.money < 0) {
      bump(p, "stress", 10);
      bump(p, "happiness", -6);
      lines.push("Money tight o. You borrow to survive.");
    }
    settle(p);
    yearlyHoldings(p, rate, lines);
  }

  yearlyPolitics(p, lines, pending);
  if (p.flags.efccWatch && (p.politics?.office ?? -1) < 0 && p.loot > 0 && chance(0.12)) pending.push({ kind: "event", id: "efcc", data: {} });

  // Body and mind
  if (p.age > 45) p.stats.health -= (p.age - 45) * 0.03 + rand(0, 0.8);
  else p.stats.health += rand(-1, 1.8);
  if (p.stats.health < 60 && p.age < 60) p.stats.health += 1.5;
  if (p.stats.stress > 70) p.stats.health -= 2;
  p.stats.stress *= 0.85;
  p.stats.happiness += (65 - p.stats.stress * 0.3 - p.stats.happiness) * 0.15 + rand(-3, 3);
  p.stats.looks -= p.age > 35 ? rand(0, 1.2) : 0;
  if (p.spouse) p.spouse.happy = clamp(p.spouse.happy + rand(-6, 5));

  // Parents
  if (p.family.parentsAlive && p.age >= 40 && chance((p.age - 38) / 140)) {
    p.family.parentsAlive = false;
    bump(p, "happiness", -15);
    lines.push("Your parent don die.");
    pending.push({ kind: "event", id: "funeral", data: {} });
  }

  // Kidnapping is rare and random.
  if (chance(kidnapRisk(p))) pending.unshift({ kind: "kidnap", k: makeKidnap(p) });

  // Random life events
  const used = new Set<string>(pending.flatMap((x) => (x.kind === "event" ? [x.id] : [])));
  if (p.age >= 6 && p.prison >= 0) {
    const tries = p.prison > 0 ? 1 : chance(0.7) ? 1 : 0;
    for (let i = 0; i < tries; i++) {
      const ev = weightedPick(ALL_EVENTS.filter((e) => !used.has(e.id)).map((e) => ({ item: e, w: e.weight(p) })));
      if (ev) {
        used.add(ev.id);
        pending.push({ kind: "event", id: ev.id, data: ev.init ? ev.init(p) : {} });
      }
    }
    const autos = chance(0.55) ? 2 : 1;
    const taken = new Set<string>();
    for (let i = 0; i < autos; i++) {
      const au = weightedPick(ALL_AUTOS.filter((a) => !taken.has(a.id)).map((a) => ({ item: a, w: a.weight(p) })));
      if (au) {
        taken.add(au.id);
        lines.push(au.run(p));
      }
    }
  }

  // Debt, tax and illness interplay with death
  settle(p);
  if (chance(deathChance(p))) {
    p.alive = false;
    p.cause = p.age >= 66 ? "Old age" : pick(CAUSES);
  }

  p.traveled = false;
  for (const l of lines) addLog(p, l);
  if (lines.length === 0 && pending.length === 0) addLog(p, "Quiet year. No wahala.");
  g.queue = p.alive ? pending : [];
  prune(g);
  ensureRecorded(g);
  return g;
}

// ---------------------------------------------------------------------------
// Resolving events
// ---------------------------------------------------------------------------
/** Drop queued events that no longer make sense (e.g. re-election after you were ousted). */
function prune(g: Game) {
  g.queue = g.queue.filter((pe) => {
    if (pe.kind !== "event") return true;
    const def = EVENT_DEFS[pe.id];
    return Boolean(def) && (!def.valid || def.valid(g.p));
  });
}

export interface PendingView {
  title: string;
  text: string;
  choices: { label: string; sub?: string; disabled?: string }[];
}

export function describePending(g: Game): PendingView | null {
  const pe = g.queue[0];
  if (!pe || pe.kind !== "event") return null;
  const def = EVENT_DEFS[pe.id];
  if (!def) return null;
  return {
    title: def.title,
    text: def.text(g.p, pe.data),
    choices: def.choices(g.p, pe.data).map((c) => ({ label: c.label, sub: c.sub, disabled: c.disabled ? c.disabled : undefined })),
  };
}

export function choose(g0: Game, idx: number): { g: Game; text: string } {
  const g = structuredClone(g0);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "event") return { g: g0, text: "" };
  const def = EVENT_DEFS[pe.id];
  const choice = def.choices(g.p, pe.data)[idx];
  if (!choice || choice.disabled) return { g: g0, text: "" };
  g.queue.shift();
  const res = choice.run(g.p);
  const text = typeof res === "string" ? res : res.text;
  if (typeof res !== "string" && res.spawn) g.queue.unshift(...res.spawn);
  addLog(g.p, text);
  settle(g.p);
  prune(g);
  ensureRecorded(g);
  return { g, text };
}

export function kidnapAction(g0: Game, a: KidnapAction): Game {
  const g = structuredClone(g0);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "kidnap") return g0;
  kidnapStep(g.p, pe.k, a);
  settle(g.p);
  return g;
}

/** Called once the player has read the kidnap outcome. */
export function ackKidnap(g0: Game): Game {
  const g = structuredClone(g0);
  const pe = g.queue[0];
  if (!pe || pe.kind !== "kidnap" || pe.k.stage !== "over") return g0;
  g.queue.shift();
  addLog(g.p, `KIDNAPPED: ${pe.k.summary ?? ""}`);
  settle(g.p);
  ensureRecorded(g);
  return g;
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------
export type Action =
  | { t: "apply"; job: string; bribe?: boolean }
  | { t: "quit" }
  | { t: "expand" }
  | { t: "travel"; to: string }
  | { t: "build"; kind: HouseKind }
  | { t: "sell"; id: string }
  | { t: "use"; id: string; use: HouseUse }
  | { t: "send"; amount: number }
  | { t: "activity"; id: string }
  | { t: "japa" }
  | { t: "luxury"; id: string }
  | { t: "invest"; kind: HoldingKind; amount: number }
  | { t: "divest"; id: string }
  | { t: "joinPolitics" }
  | { t: "contest" }
  | { t: "gov"; id: string }
  | { t: "power"; id: string }
  | { t: "coup" };

export interface ActivityDef {
  id: string;
  label: string;
  desc: string;
  cost: number;
  minAge: number;
}
export const ACTIVITIES: ActivityDef[] = [
  { id: "study", label: "Study hard", desc: "Boost your smarts.", cost: 0, minAge: 6 },
  { id: "gym", label: "Exercise / play football", desc: "Health and a little happiness.", cost: 0, minAge: 6 },
  { id: "worship", label: "Go to church / mosque", desc: "Peace of mind and good reputation.", cost: 20_000, minAge: 8 },
  { id: "hawk", label: "Hawk after school", desc: "Small money, small stress.", cost: 0, minAge: 10 },
  { id: "network", label: "Network at an owambe", desc: "Meet useful people.", cost: 80_000, minAge: 16 },
  { id: "gig", label: "Do a side gig", desc: "Quick cash from odd jobs.", cost: 0, minAge: 16 },
  { id: "date", label: "Look for love", desc: "Meet someone special.", cost: 0, minAge: 18 },
  { id: "godfather", label: "Look for a godfather", desc: "Powerful backing, but scammers lurk.", cost: 500_000, minAge: 20 },
];

export function activityBlock(p: Player, a: ActivityDef): string | null {
  if (p.prison > 0) return "In prison";
  if (p.age < a.minAge) return `From age ${a.minAge}`;
  if (p.actionsLeft <= 0) return "No actions left this year";
  if (a.cost && p.money < I(p, a.cost)) return "Not enough cash";
  if (a.id === "date" && (p.spouse || p.flags.dating)) return "Already with someone";
  return null;
}

export function applyBlock(p: Player, jobId: string): string | null {
  const j = JOB_BY_ID[jobId];
  if (!j) return "Unknown job";
  if (p.prison > 0) return "In prison";
  if (p.actionsLeft <= 0) return "No actions left this year";
  if (j.selfEmployed && p.money < j.startCost * Math.pow(p.index, 0.85)) return `Needs ${naira(j.startCost * Math.pow(p.index, 0.85))} to start`;
  return null;
}

export const expandCost = expandCostFor;

export function buildCost(p: Player, kind: HouseKind): number {
  return Math.round(HOUSE_KINDS[kind].build * stateOf(p).cost * Math.pow(p.index, 0.95));
}

export function act(g0: Game, a: Action): { g: Game; msg: string } {
  const g = structuredClone(g0);
  const p = g.p;
  const out = (msg: string) => {
    addLog(p, msg);
    settle(p);
    ensureRecorded(g);
    return { g, msg };
  };
  if (!p.alive || g.queue.length > 0) return { g: g0, msg: "" };
  const st = stateOf(p);
  switch (a.t) {
    case "apply": {
      const j = JOB_BY_ID[a.job];
      const block = applyBlock(p, a.job);
      if (!j || block) return { g: g0, msg: block ?? "" };
      p.actionsLeft -= 1;
      if (j.selfEmployed) {
        p.money -= j.startCost * Math.pow(p.index, 0.85);
        p.job = { id: j.id, rank: 0, years: 0 };
        return out(`You started your own business: ${j.title}. ${j.ladder[0].title}.`);
      }
      let pr = j.group === "creative" ? 0.4 : j.group === "crime" ? 0.9 : 0.35 + p.stats.smarts / 250 + p.stats.connections / 150 + st.opp * 0.02;
      if (j.group === "petty") pr = Math.max(pr, 0.75);
      if (a.bribe) {
        const fee = I(p, 300_000);
        if (p.money < fee) return { g: g0, msg: "Not enough cash to bribe." };
        p.money -= fee;
        pr += 0.3;
        if (chance(0.15)) bump(p, "reputation", -10);
      }
      if (chance(clamp(pr, 0.05, 0.97))) {
        p.job = { id: j.id, rank: 0, years: 0 };
        return out(`You got the job: ${j.ladder[0].title}.`);
      }
      return out(`You applied for ${j.title} but did not get it.`);
    }
    case "quit": {
      if (!p.job) return { g: g0, msg: "" };
      const j = jobDef(p);
      p.job = null;
      return out(`You quit your ${j?.title ?? "job"}.`);
    }
    case "expand": {
      const cost = expandCost(p);
      const j = jobDef(p);
      if (cost === null || !p.job || !j || p.money < cost) return { g: g0, msg: "Cannot expand now." };
      p.money -= cost;
      p.job.rank += 1;
      p.job.years = 0;
      const title = j.ladder[p.job.rank].title;
      if (p.job.rank === j.ladder.length - 1 && !p.achievements.includes(`Top of ${j.title}`)) p.achievements.push(`Top of ${j.title}`);
      return out(`You invested ${naira(cost)} and expanded: ${title}.`);
    }
    case "travel": {
      const to = STATE_BY_ID[a.to];
      if (!to || a.to === p.state || p.prison > 0 || p.age < 16) return { g: g0, msg: "" };
      const cost = Math.round(travelCost(st, to) * p.index * (st.abroad ? 6 : 1));
      if (p.money < cost) return { g: g0, msg: `Need ${naira(cost)} for the trip.` };
      p.money -= cost;
      p.traveled = true;
      const note = moveTo(p, a.to);
      const oppNote = to.opp > st.opp ? "More opportunities here." : to.opp < st.opp ? "Fewer opportunities here." : "";
      bump(p, "stress", 3);
      return out(`You travelled to ${to.name} (${to.capital}). ${oppNote}${note}`);
    }
    case "build": {
      if (p.prison > 0 || st.abroad) return { g: g0, msg: "" };
      const cost = buildCost(p, a.kind);
      if (p.money < cost) return { g: g0, msg: `Need ${naira(cost)}.` };
      p.money -= cost;
      const hasOwner = p.houses.some((h) => h.state === p.state && h.use === "owner");
      const h: House = { id: uid(), state: p.state, kind: a.kind, value: Math.round(cost * 1.1), use: hasOwner ? "empty" : "owner" };
      p.houses.push(h);
      p.prestige += a.kind === "flats" ? 2 : 1;
      bump(p, "happiness", 6);
      return out(`You built a ${HOUSE_KINDS[a.kind].label.toLowerCase()} in ${st.name} for ${naira(cost)}.`);
    }
    case "sell": {
      const i = p.houses.findIndex((h) => h.id === a.id);
      if (i < 0) return { g: g0, msg: "" };
      const h = p.houses[i];
      p.money += h.value;
      p.houses.splice(i, 1);
      return out(`You sold your ${HOUSE_KINDS[h.kind].label.toLowerCase()} in ${STATE_BY_ID[h.state].name} for ${naira(h.value)}.`);
    }
    case "use": {
      const h = p.houses.find((x) => x.id === a.id);
      if (!h) return { g: g0, msg: "" };
      if (a.use === "family") {
        for (const o of p.houses) if (o.use === "family") o.use = "empty";
        p.family.state = h.state;
        p.family.happy = clamp(p.family.happy + 18);
        h.use = "family";
        return out(`Your family moved into your house in ${STATE_BY_ID[h.state].name}. They are overjoyed. More opportunities for them.`);
      }
      if (a.use === "owner") for (const o of p.houses) if (o.use === "owner" && o.state === h.state) o.use = "empty";
      h.use = a.use;
      return out(a.use === "rent" ? `You listed your house in ${STATE_BY_ID[h.state].name} for rent.` : a.use === "owner" ? `You moved into your house in ${STATE_BY_ID[h.state].name}.` : "You left the house empty.");
    }
    case "send": {
      if (a.amount <= 0 || p.money < a.amount) return { g: g0, msg: "" };
      p.money -= a.amount;
      const gain = clamp((a.amount / I(p, 200_000)) * 4, 1, 22);
      p.family.happy = clamp(p.family.happy + gain);
      bump(p, "reputation", 1);
      return out(`You sent ${naira(a.amount)} home to ${STATE_BY_ID[p.family.state].name}.`);
    }
    case "activity": {
      const def = ACTIVITIES.find((x) => x.id === a.id);
      if (!def || activityBlock(p, def)) return { g: g0, msg: activityBlock(p, def ?? ACTIVITIES[0]) ?? "" };
      p.actionsLeft -= 1;
      p.money -= I(p, def.cost);
      switch (def.id) {
        case "study": bump(p, "smarts", 3); bump(p, "stress", 2); return out("You studied hard. Knowledge is power.");
        case "gym": bump(p, "health", 5); bump(p, "happiness", 2); return out("You worked out. You feel stronger.");
        case "worship": bump(p, "happiness", 3); bump(p, "reputation", 2); return out(`You went to ${p.religion === "Muslim" ? "the mosque" : "church"}. Peace of mind.`);
        case "hawk": { const g2 = I(p, 40_000) * (0.5 + st.opp / 10); p.money += g2; bump(p, "stress", 3); bump(p, "health", -1); return out(`You hawked on the street and made ${naira(g2)}.`); }
        case "network": bump(p, "connections", 4); return out("You networked at an owambe and exchanged numbers.");
        case "gig": { const g2 = I(p, rand(150_000, 600_000)) * (0.5 + st.opp / 10); p.money += g2; bump(p, "stress", 2); return out(`You did odd jobs and earned ${naira(g2)}.`); }
        case "date": g.queue.unshift({ kind: "event", id: "love", data: EVENT_DEFS.love.init ? EVENT_DEFS.love.init(p) : {} }); return out("You went out looking for love...");
        case "godfather":
          if (chance(0.25)) return out("A 'godfather' collected your money and disappeared. You were scammed.");
          bump(p, "connections", 8);
          return out("A powerful man took a liking to you. Doors are starting to open.");
      }
      return { g: g0, msg: "" };
    }
    case "japa": {
      const cost = I(p, 8_000_000);
      if (p.age < 18 || p.money < cost || st.abroad || p.prison > 0) return { g: g0, msg: "" };
      p.money -= cost;
      const pr = 0.3 + (p.edu === "tertiary" ? 0.25 : p.edu === "secondary" ? 0.1 : 0) + p.stats.smarts / 300;
      if (chance(pr)) {
        moveTo(p, "abroad");
        p.family.happy = clamp(p.family.happy + 8);
        if (!p.achievements.includes("Japa success")) p.achievements.push("Japa success");
        return out("JAPA SUCCESSFUL! Your visa was approved. You flew out of Nigeria for a new life.");
      }
      bump(p, "stress", 10);
      p.money += cost * 0.15;
      return out("Your visa was refused. IELTS, flights and application fees gone. Maybe try again.");
    }
    case "luxury": {
      const block = luxuryBlock(p, a.id);
      if (block) return { g: g0, msg: block };
      return out(buyLuxury(p, a.id));
    }
    case "invest": {
      const block = investBlock(p, a.kind, a.amount);
      if (block) return { g: g0, msg: block };
      return out(invest(p, a.kind, a.amount));
    }
    case "divest": return out(divest(p, a.id));
    case "joinPolitics": {
      if (canJoinPolitics(p)) return { g: g0, msg: canJoinPolitics(p) ?? "" };
      return out(joinPolitics(p));
    }
    case "contest": {
      if (canContest(p)) return { g: g0, msg: canContest(p) ?? "" };
      const pe = contestPending(p);
      if (!pe) return { g: g0, msg: "" };
      g.queue.unshift(pe);
      return { g, msg: "" };
    }
    case "power": {
      const block = powerMoveBlock(p, a.id);
      if (block) return { g: g0, msg: block };
      return out(runPowerMove(p, a.id));
    }
    case "coup": {
      const block = canPlotCoup(p);
      if (block) return { g: g0, msg: block };
      p.actionsLeft = Math.max(0, p.actionsLeft - 1);
      const res = plotCoup(p);
      if (res.spawn) g.queue.unshift(...res.spawn);
      return out(res.text);
    }
    case "gov": {
      const def = GOV_ACTIONS.find((x) => x.id === a.id);
      const office = p.politics?.office ?? -1;
      if (!def || office < def.minOffice || p.actionsLeft <= 0) return { g: g0, msg: "" };
      p.actionsLeft -= 1;
      return out(runGov(p, a.id));
    }
  }
}
