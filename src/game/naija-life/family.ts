import { STATE_BY_ID, TRAVEL_STATES, poolFor } from "./data";
import { transact } from "./ledger";
import { kidLook, parentLook, randomLook, type Look } from "./look";
import type { FamilyArchetype, FamilyBg, FamilyStructure, Gender, Loan, Npc, NpcRole, Player, StateInfo } from "./types";
import { chance, clamp, naira, pick, rand, randInt, uid, weightedPick } from "./util";

// ---------------------------------------------------------------------------
// Configurable family background distribution
// ---------------------------------------------------------------------------
export interface FamilyConfig {
  archetypes: Record<FamilyArchetype, number>;
  structures: Record<FamilyStructure, number>;
}

/** Sensible default: most families are ordinary; very rich and very poor are the minority. */
export const DEFAULT_FAMILY_CONFIG: FamilyConfig = {
  archetypes: { nepo: 4, strictRich: 4, upperMiddle: 9, newlyRich: 3, fallenRich: 4, middle: 24, struggling: 24, lapo: 28 },
  structures: { "two-parent": 56, "single-mother": 14, "single-father": 4, grandparents: 6, relatives: 5, divorced: 8, "parents-abroad": 5, orphan: 2 },
};

/** Ready-made family mixes for the start screen. */
export const FAMILY_PRESETS: { id: string; en: string; pcm: string; cfg?: FamilyConfig; force?: FamilyArchetype }[] = [
  { id: "real", en: "Realistic mix (default)", pcm: "Real life mix (default)" },
  { id: "rich", en: "Mostly wealthy families", pcm: "Mostly rich family", cfg: { archetypes: { nepo: 22, strictRich: 20, upperMiddle: 25, newlyRich: 12, fallenRich: 6, middle: 10, struggling: 3, lapo: 2 }, structures: DEFAULT_FAMILY_CONFIG.structures } },
  { id: "poor", en: "Mostly struggling families", pcm: "Mostly poor family", cfg: { archetypes: { nepo: 0, strictRich: 0, upperMiddle: 2, newlyRich: 1, fallenRich: 4, middle: 15, struggling: 38, lapo: 40 }, structures: DEFAULT_FAMILY_CONFIG.structures } },
  { id: "equal", en: "Equal chance of everything", pcm: "Everything get equal chance", cfg: { archetypes: { nepo: 12, strictRich: 12, upperMiddle: 12, newlyRich: 12, fallenRich: 12, middle: 12, struggling: 12, lapo: 12 }, structures: DEFAULT_FAMILY_CONFIG.structures } },
  { id: "nepo", en: "Born a nepo baby", pcm: "Born as nepo baby", force: "nepo" },
  { id: "lapo", en: "Born in a lapo family", pcm: "Born for lapo family", force: "lapo" },
  { id: "strict", en: "Rich but strict parents", pcm: "Rich but strict parents", force: "strictRich" },
  { id: "fallen", en: "A family that lost its money", pcm: "Family wey don lose money", force: "fallenRich" },
];

interface ArchSpec {
  label: string;
  income: [number, number];
  generosity: [number, number];
  strictness: [number, number];
  responsibility: [number, number];
  closeness: [number, number];
  trend: FamilyBg["trend"];
  debts: [number, number];
  connections: number;
  jobs: string[];
}

const ARCH: Record<FamilyArchetype, ArchSpec> = {
  nepo: { label: "Nepo baby", income: [80e6, 400e6], generosity: [55, 95], strictness: [10, 45], responsibility: [35, 80], closeness: [25, 85], trend: "steady", debts: [0, 0], connections: 0.95, jobs: ["Property developer", "Oil & gas executive", "Bank chairman", "Contractor", "Hotel owner", "Pharma distributor", "Entertainment mogul"] },
  strictRich: { label: "Wealthy, strict parents", income: [50e6, 250e6], generosity: [12, 40], strictness: [72, 96], responsibility: [80, 96], closeness: [35, 80], trend: "steady", debts: [0, 0], connections: 0.6, jobs: ["Surgeon", "Law firm partner", "Business owner", "Professor & consultant", "Senior civil servant", "Banker"] },
  upperMiddle: { label: "Comfortable family", income: [18e6, 50e6], generosity: [35, 78], strictness: [30, 70], responsibility: [50, 90], closeness: [35, 90], trend: "steady", debts: [0, 3e6], connections: 0.35, jobs: ["Engineer", "Doctor", "Lawyer", "Bank manager", "University lecturer", "Estate surveyor", "IT consultant"] },
  newlyRich: { label: "Newly rich", income: [40e6, 150e6], generosity: [50, 92], strictness: [15, 60], responsibility: [30, 75], closeness: [35, 85], trend: "rising", debts: [0, 8e6], connections: 0.5, jobs: ["Fresh contractor", "Crypto & import trader", "Rising entertainer", "Politician's aide", "Tech founder"] },
  fallenRich: { label: "Family fortunes falling", income: [5e6, 20e6], generosity: [25, 70], strictness: [35, 85], responsibility: [25, 70], closeness: [25, 80], trend: "falling", debts: [4e6, 25e6], connections: 0.4, jobs: ["Ex-contractor", "Retired banker", "Struggling hotelier", "Former politician's aide"] },
  middle: { label: "Middle-class family", income: [5e6, 15e6], generosity: [30, 72], strictness: [30, 78], responsibility: [45, 90], closeness: [35, 90], trend: "steady", debts: [0, 2e6], connections: 0.15, jobs: ["Teacher", "Civil servant", "Nurse", "Trader", "Accountant", "Police inspector", "Shop owner", "Pastor"] },
  struggling: { label: "Struggling family", income: [1.8e6, 4.5e6], generosity: [25, 78], strictness: [30, 82], responsibility: [35, 85], closeness: [35, 92], trend: "steady", debts: [0.2e6, 1.5e6], connections: 0.05, jobs: ["Trader", "Driver", "Tailor", "Farmer", "Security guard", "Mechanic", "Caterer", "Okada rider"] },
  lapo: { label: "Lapo baby", income: [0.6e6, 1.6e6], generosity: [20, 80], strictness: [30, 88], responsibility: [30, 80], closeness: [30, 95], trend: "steady", debts: [0.1e6, 1e6], connections: 0.02, jobs: ["Hawker", "Petty trader", "Labourer", "Cleaner", "Farmhand", "Roadside mechanic", "Bricklayer", "Mama put seller"] },
};

export function wealthTier(income: number): number {
  // 0-100 on a rough log scale: 0.6M -> ~5, 10M -> ~45, 100M -> ~75, 400M -> ~92
  return clamp(Math.round(Math.log10(Math.max(income, 3e5) / 3e5) * 36 + 4), 0, 100);
}

export function classOf(income: number): "struggling" | "middle" | "rich" {
  if (income >= 40e6) return "rich";
  if (income >= 4.8e6) return "middle";
  return "struggling";
}

function between(r: [number, number]): number {
  return Math.round(rand(r[0], r[1]));
}

// ---------------------------------------------------------------------------
// NPC creation
// ---------------------------------------------------------------------------
export interface NpcSeed {
  role: NpcRole;
  gender: Gender;
  ageDelta: number;
  name?: string;
  tribe: string;
  look?: Look;
  occupation?: string;
  stateId?: string;
  income?: number;
  generosity?: number;
  strictness?: number;
  responsibility?: number;
  closeness?: number;
  surname?: string;
}

export function makeNpc(s: NpcSeed): Npc {
  const pool = poolFor(s.tribe);
  const first = s.name ?? pick(pool[s.gender]);
  const surname = s.surname ?? pick(pool.surnames);
  const income = s.income ?? 3e6;
  return {
    id: uid(),
    name: s.name ? s.name : `${first} ${surname}`,
    gender: s.gender,
    role: s.role,
    look: s.look ?? randomLook(s.gender),
    ageDelta: s.ageDelta,
    alive: true,
    occupation: s.occupation ?? "Trader",
    stateId: s.stateId ?? "lagos",
    income,
    savings: income * rand(0.1, 1.2),
    generosity: s.generosity ?? randInt(25, 80),
    strictness: s.strictness ?? randInt(25, 80),
    responsibility: s.responsibility ?? randInt(35, 85),
    materialism: randInt(15, 85),
    closeness: s.closeness ?? randInt(35, 85),
    trust: randInt(45, 85),
    asks: 0,
    gaveThisYear: 0,
    traits: [],
    memories: [],
  };
}

export const npcAge = (p: Player, n: Npc) => Math.max(0, p.age + n.ageDelta);

export function remember(p: Player, n: Npc, text: string, tone: "good" | "bad") {
  n.memories.push({ age: p.age, text, tone });
  if (n.memories.length > 14) n.memories.shift();
}

export function npcsByRole(p: Player, ...roles: NpcRole[]): Npc[] {
  return Object.values(p.npcs).filter((n) => roles.includes(n.role));
}

export function addFriend(p: Player, ageDelta = randInt(-2, 3)): Npc {
  const gender: Gender = chance(0.5) ? "male" : "female";
  const spec = ARCH[pickFriendArch()];
  const f = makeNpc({
    role: "friend", gender, ageDelta, tribe: p.tribe, stateId: p.state, occupation: pick(spec.jobs),
    income: between(spec.income), look: randomLook(gender, { region: STATE_BY_ID[p.state].region, religion: p.religion }),
    generosity: randInt(10, 90), strictness: randInt(10, 60), responsibility: randInt(25, 90), closeness: randInt(40, 80),
  });
  f.traits = [pick(["funny", "loyal", "ambitious", "dramatic", "laid-back", "generous", "stingy", "flashy"])];
  p.npcs[f.id] = f;
  return f;
}

function pickFriendArch(): FamilyArchetype {
  return weightedPick((Object.keys(DEFAULT_FAMILY_CONFIG.archetypes) as FamilyArchetype[]).map((k) => ({ item: k, w: DEFAULT_FAMILY_CONFIG.archetypes[k] }))) ?? "middle";
}

// ---------------------------------------------------------------------------
// Family generation
// ---------------------------------------------------------------------------
function archetypeWeights(st: StateInfo, cfg: FamilyConfig) {
  // Bigger markets have more wealthy families; small towns have more struggling ones.
  const wealthy = Math.pow(st.opp / 6, 1.1);
  const poor = Math.pow(6 / st.opp, 0.7);
  const w = { ...cfg.archetypes };
  for (const k of ["nepo", "strictRich", "upperMiddle", "newlyRich"] as FamilyArchetype[]) w[k] = w[k] * wealthy;
  for (const k of ["struggling", "lapo"] as FamilyArchetype[]) w[k] = w[k] * poor;
  return w;
}

export interface GeneratedFamily {
  fam: FamilyBg;
  npcs: Npc[];
  dad?: Npc;
  mom?: Npc;
}

export function generateFamily(opts: { st: StateInfo; tribe: string; religion: string; playerLook: Look; surname: string; cfg?: FamilyConfig; forceArchetype?: FamilyArchetype }): GeneratedFamily {
  const cfg = opts.cfg ?? DEFAULT_FAMILY_CONFIG;
  const w = archetypeWeights(opts.st, cfg);
  const archetype = opts.forceArchetype ?? weightedPick((Object.keys(w) as FamilyArchetype[]).map((k) => ({ item: k, w: w[k] }))) ?? "middle";
  const spec = ARCH[archetype];
  const structure = weightedPick((Object.keys(cfg.structures) as FamilyStructure[]).map((k) => ({ item: k, w: cfg.structures[k] }))) ?? "two-parent";

  let income = between(spec.income);
  // Single-income households earn less; parents abroad send money home in dollars.
  if (structure === "single-mother" || structure === "single-father") income = Math.round(income * 0.72);
  if (structure === "grandparents" || structure === "relatives") income = Math.round(income * 0.6);
  if (structure === "parents-abroad") income = Math.round(income * 1.25);
  if (structure === "orphan") income = Math.round(income * 0.55);

  const closenessBase = between(spec.closeness);
  const fam: FamilyBg = {
    archetype,
    label: spec.label,
    structure,
    income,
    generosity: between(spec.generosity),
    strictness: between(spec.strictness),
    responsibility: between(spec.responsibility),
    closeness: structure === "orphan" ? randInt(25, 60) : closenessBase,
    trend: spec.trend === "steady" && chance(0.15) ? pick(["rising", "falling"] as const) : spec.trend,
    debts: between(spec.debts),
    connections: chance(spec.connections),
    siblings: weightedPick([{ item: 0, w: 8 }, { item: 1, w: 24 }, { item: 2, w: 28 }, { item: 3, w: 22 }, { item: 4, w: 12 }, { item: 5, w: 6 }]) ?? 2,
    tags: [],
    cutOff: [],
    given: [],
    providers: [],
    expectContribution: classOf(income) === "struggling" && chance(0.8),
  };
  if (structure === "single-mother") fam.tags.push("Raised by a single mother");
  if (structure === "single-father") fam.tags.push("Raised by a single father");
  if (structure === "grandparents") fam.tags.push("Raised by your grandparents");
  if (structure === "relatives") fam.tags.push("Raised by relatives");
  if (structure === "divorced") fam.tags.push("Parents separated");
  if (structure === "parents-abroad") fam.tags.push("Parents live abroad");
  if (structure === "orphan") fam.tags.push("Orphaned young");
  if (archetype === "nepo" || archetype === "strictRich") fam.tags.push("Wealthy family");
  if (archetype === "strictRich") fam.tags.push("Believes in earning your own way");
  if (fam.closeness < 30 && income > 20e6) fam.tags.push("Rich but emotionally distant");
  if (fam.debts > income * 0.6) fam.tags.push("Family in debt");
  if (fam.connections && income > 20e6) fam.tags.push("Well connected");

  const npcs: Npc[] = [];
  const region = opts.st.region;
  const common = { tribe: opts.tribe, stateId: opts.st.id, surname: opts.surname };
  const gen = (spread: number) => clamp(fam.generosity + randInt(-spread, spread), 3, 99);
  const str = (spread: number) => clamp(fam.strictness + randInt(-spread, spread), 3, 99);
  const res = (spread: number) => clamp(fam.responsibility + randInt(-spread, spread), 3, 99);
  const share = (s: number) => Math.round(income * s);

  const mkDad = (role: NpcRole = "dad", incomeShare = 0.62, ageDelta = randInt(26, 38)) =>
    makeNpc({ ...common, role, gender: "male", ageDelta, occupation: pick(spec.jobs), income: share(incomeShare), generosity: gen(18), strictness: str(16), responsibility: res(14), closeness: clamp(fam.closeness + randInt(-20, 20), 5, 98), look: parentLook(opts.playerLook, "male", region, opts.religion) });
  const mkMom = (role: NpcRole = "mom", incomeShare = 0.38, ageDelta = randInt(23, 34)) =>
    makeNpc({ ...common, role, gender: "female", ageDelta, occupation: pick(spec.jobs), income: share(incomeShare), generosity: gen(18), strictness: str(16), responsibility: res(14), closeness: clamp(fam.closeness + randInt(-15, 20), 5, 98), look: parentLook(opts.playerLook, "female", region, opts.religion) });

  let dad: Npc | undefined;
  let mom: Npc | undefined;
  switch (structure) {
    case "two-parent": dad = mkDad(); mom = mkMom(); fam.providers = [dad.id, mom.id]; break;
    case "single-mother": mom = mkMom("mom", 1); dad = mkDad("dad", 0.0); dad.closeness = randInt(5, 40); fam.providers = [mom.id]; break;
    case "single-father": dad = mkDad("dad", 1); mom = mkMom("mom", 0.0); mom.closeness = randInt(5, 40); fam.providers = [dad.id]; break;
    case "divorced": dad = mkDad("dad", 0.55); mom = mkMom("mom", 0.45); fam.providers = [pick([dad.id, mom.id])]; break;
    case "parents-abroad": dad = mkDad("dad", 0.6); mom = mkMom("mom", 0.4); dad.stateId = "abroad"; mom.stateId = "abroad"; fam.providers = [dad.id, mom.id]; break;
    case "grandparents": {
      dad = mkDad("dad", 0.15, 30); mom = mkMom("mom", 0.1, 27); dad.closeness = randInt(10, 50); mom.closeness = randInt(10, 50);
      const gma = makeNpc({ ...common, role: "grandparent", gender: "female", ageDelta: randInt(52, 62), occupation: "Retired trader", income: share(0.6), generosity: gen(20), strictness: str(15), responsibility: res(10), closeness: clamp(fam.closeness + 10, 10, 98), look: parentLook(opts.playerLook, "female", region, opts.religion) });
      const gpa = makeNpc({ ...common, role: "grandparent", gender: "male", ageDelta: randInt(55, 66), occupation: "Retired civil servant", income: share(0.4), generosity: gen(20), strictness: str(15), responsibility: res(10), closeness: clamp(fam.closeness + 5, 10, 98), look: parentLook(opts.playerLook, "male", region, opts.religion) });
      npcs.push(gma, gpa); fam.providers = [gma.id, gpa.id]; break;
    }
    case "relatives": {
      dad = mkDad("dad", 0.1, 30); mom = mkMom("mom", 0.1, 27);
      const aunt = makeNpc({ ...common, role: "guardian", gender: "female", ageDelta: randInt(28, 40), occupation: pick(spec.jobs), income: share(0.65), generosity: gen(20), strictness: str(18), responsibility: res(12), closeness: clamp(fam.closeness - 5, 10, 95), look: parentLook(opts.playerLook, "female", region, opts.religion) });
      const uncle = makeNpc({ ...common, role: "guardian", gender: "male", ageDelta: randInt(30, 44), occupation: pick(spec.jobs), income: share(0.35), generosity: gen(20), strictness: str(18), responsibility: res(12), closeness: clamp(fam.closeness - 5, 10, 95), look: parentLook(opts.playerLook, "male", region, opts.religion) });
      npcs.push(aunt, uncle); fam.providers = [aunt.id, uncle.id]; break;
    }
    case "orphan": {
      dad = mkDad("dad", 0.0); mom = mkMom("mom", 0.0); dad.alive = false; mom.alive = false;
      const aunt = makeNpc({ ...common, role: "guardian", gender: "female", ageDelta: randInt(28, 42), occupation: pick(spec.jobs), income, generosity: gen(25), strictness: str(20), responsibility: res(14), closeness: randInt(20, 70), look: parentLook(opts.playerLook, "female", region, opts.religion) });
      npcs.push(aunt); fam.providers = [aunt.id]; fam.tags.push("Guardian aunt");
      break;
    }
  }
  if (dad) { fam.dadId = dad.id; npcs.push(dad); }
  if (mom) { fam.momId = mom.id; npcs.push(mom); }

  // Siblings
  for (let i = 0; i < fam.siblings; i++) {
    const g: Gender = chance(0.5) ? "male" : "female";
    const s = makeNpc({ ...common, role: "sibling", gender: g, ageDelta: randInt(-9, 9) || 2, occupation: "Student", income: 0, look: kidLook(dad?.look, mom?.look, g), closeness: randInt(30, 90), generosity: randInt(15, 85), strictness: randInt(10, 50), responsibility: randInt(25, 85) });
    npcs.push(s);
  }
  // A couple of extended-family contacts
  const uncleOrAunt = makeNpc({ ...common, role: chance(0.5) ? "uncle" : "aunt", gender: "male", ageDelta: randInt(20, 35), occupation: pick(spec.jobs), income: Math.round(income * rand(0.2, 1.4)), generosity: randInt(15, 85), strictness: randInt(25, 80), responsibility: randInt(30, 85), closeness: randInt(25, 80), look: parentLook(opts.playerLook, "male", region, opts.religion) });
  uncleOrAunt.gender = uncleOrAunt.role === "aunt" ? "female" : "male";
  uncleOrAunt.look = parentLook(opts.playerLook, uncleOrAunt.gender, region, opts.religion);
  npcs.push(uncleOrAunt);
  return { fam, npcs, dad, mom };
}

/** Keep older code that still reads `p.family` in sync with the NPC family. */
export function syncLegacyFamily(p: Player) {
  const dad = p.fam.dadId ? p.npcs[p.fam.dadId] : undefined;
  const mom = p.fam.momId ? p.npcs[p.fam.momId] : undefined;
  if (dad) p.family.dad = dad.look;
  if (mom) p.family.mom = mom.look;
  const parents = [dad, mom].filter(Boolean) as Npc[];
  p.family.parentsAlive = parents.some((n) => n.alive) || npcsByRole(p, "guardian", "grandparent").some((n) => n.alive);
  p.classAtBirth = classOf(p.fam.income);
}

// ---------------------------------------------------------------------------
// Asking for money
// ---------------------------------------------------------------------------
export type SupportKind =
  | "pocket" | "transport" | "food" | "schoolFees" | "phone" | "laptop" | "rent" | "medical"
  | "date" | "car" | "startup" | "loan" | "debt" | "emergency";

interface KindSpec {
  label: string;
  /** Typical amount in base-year naira. */
  base: number;
  /** How reasonable parents consider this request (0-1). */
  need: number;
  minAge: number;
}

export const SUPPORT_KINDS: Record<SupportKind, KindSpec> = {
  pocket: { label: "Pocket money", base: 15_000, need: 0.55, minAge: 6 },
  transport: { label: "Transport money", base: 8_000, need: 0.75, minAge: 8 },
  food: { label: "Food money", base: 25_000, need: 0.85, minAge: 12 },
  schoolFees: { label: "School fees", base: 350_000, need: 0.92, minAge: 8 },
  phone: { label: "A phone", base: 180_000, need: 0.45, minAge: 11 },
  laptop: { label: "A laptop", base: 450_000, need: 0.5, minAge: 14 },
  rent: { label: "Help with rent", base: 600_000, need: 0.5, minAge: 18 },
  medical: { label: "Medical expenses", base: 250_000, need: 0.95, minAge: 3 },
  date: { label: "Money for a date", base: 30_000, need: 0.18, minAge: 15 },
  car: { label: "Help buying a car", base: 4_000_000, need: 0.15, minAge: 18 },
  startup: { label: "Startup capital", base: 2_500_000, need: 0.3, minAge: 18 },
  loan: { label: "A loan", base: 500_000, need: 0.4, minAge: 18 },
  debt: { label: "Settle a debt", base: 400_000, need: 0.35, minAge: 18 },
  emergency: { label: "Emergency help", base: 300_000, need: 0.9, minAge: 5 },
};

export function supportKindsFor(p: Player): SupportKind[] {
  return (Object.keys(SUPPORT_KINDS) as SupportKind[]).filter((k) => {
    const s = SUPPORT_KINDS[k];
    if (p.age < s.minAge) return false;
    if (k === "phone" && p.possessions.smartphone) return false;
    if (k === "laptop" && p.possessions.laptop) return false;
    if (k === "schoolFees" && !p.school) return false;
    if (k === "date" && p.age < 16) return false;
    if (k === "debt" && p.debt <= 0 && !p.loans.some((l) => l.direction === "owed" && l.status === "active")) return false;
    return true;
  });
}

export function defaultAmount(p: Player, kind: SupportKind): number {
  const s = SUPPORT_KINDS[kind];
  let amt = s.base * Math.pow(p.index, 0.92);
  if (p.age < 12 && (kind === "pocket" || kind === "transport")) amt *= 0.4;
  if (kind === "debt") amt = Math.min(Math.max(p.debt, 50_000 * p.index), amt * 2);
  return Math.round(amt / 500) * 500;
}

export type ReplyType = "full" | "partial" | "refuse" | "askPurpose" | "workForIt" | "loan" | "conditional" | "later";
export interface SupportReply {
  type: ReplyType;
  amount: number;
  text: string;
}

/** What a giver can comfortably spare this year, in nominal naira. */
export function capacityOf(p: Player, n: Npc): number {
  const idx = Math.pow(p.index, 0.9);
  const base = n.income * 0.14 + n.savings * 0.12;
  return Math.max(0, base * idx - n.gaveThisYear * p.index);
}

const PURPOSE: Record<SupportKind, string> = {
  pocket: "what you do with the money", transport: "where you are going", food: "what you want to eat", schoolFees: "your school report",
  phone: "why you need a new phone", laptop: "what you will use a laptop for", rent: "where you plan to stay", medical: "what the doctor said",
  date: "who you are taking out", car: "how you plan to maintain it", startup: "your business plan", loan: "how you will pay it back", debt: "how you got into debt",
  emergency: "what happened",
};

export function evaluateSupport(p: Player, n: Npc, kind: SupportKind, amount: number): SupportReply {
  const spec = SUPPORT_KINDS[kind];
  const cap = capacityOf(p, n);
  const isParent = ["dad", "mom", "guardian", "grandparent"].includes(n.role);
  const age = p.age;
  const ageFactor = !isParent ? -0.05 : age < 18 ? 0.15 : age < 24 ? 0.05 : age < 31 ? -0.1 : -0.25;
  const cutOff = isParent && p.fam.cutOff.includes(kind === "pocket" || kind === "food" || kind === "transport" ? "allowance" : kind);
  const w =
    0.14 + n.generosity * 0.0036 + n.closeness * 0.0025 + n.trust * 0.0012 + spec.need * 0.34 + ageFactor
    - n.strictness * 0.0036 * (1 - spec.need) - n.asks * 0.075 - (cutOff ? 0.35 : 0)
    - (n.responsibility > 70 && spec.need < 0.4 ? 0.1 : 0);
  const willing = clamp(w, 0.04, 0.95);
  const asked = amount;
  const name = n.name.split(" ")[0];
  const flavour = isParent ? (n.role === "mom" ? "Mama" : n.role === "dad" ? "Papa" : name) : name;

  if (cap < asked * 0.08) {
    return { type: chance(0.5) ? "later" : "refuse", amount: 0, text: `${flavour}: "Ah, I no get money now. Things are tight. Ask me again another time."` };
  }
  const roll = chance(willing);
  if (!roll) {
    if (isParent && n.strictness > 62 && spec.need < 0.7) return { type: "workForIt", amount: 0, text: `${flavour}: "You want money? Go and work for it. That's how you learn."` };
    if (n.asks >= 3) return { type: "refuse", amount: 0, text: `${flavour}: "Haba! You keep asking me for money. Please give me breathing space."` };
    return { type: chance(0.35) ? "later" : "refuse", amount: 0, text: `${flavour}: "${pick(["Not this time.", "I can't help with that one.", "Ask me again next month, let me see."])}"` };
  }
  const ratio = asked / Math.max(cap, 1);
  if (ratio > 3) return { type: "partial", amount: Math.round(cap * 0.5), text: `${flavour}: "That's too much. This is all I can do."` };
  if (ratio > 1) return { type: "partial", amount: Math.round(Math.min(asked, cap) * rand(0.55, 0.9)), text: `${flavour}: "I can't send everything. Take this one for now."` };
  // Asked within means
  if (isParent && n.strictness > 60 && n.responsibility > 55 && spec.need < 0.6 && asked > 400_000 * p.index && chance(0.55)) {
    return { type: "loan", amount: asked, text: `${flavour}: "I will give you this as a loan, not a gift. You will pay me back."` };
  }
  if (isParent && n.strictness > 55 && spec.need < 0.55 && asked > 200_000 * p.index && chance(0.35)) {
    return { type: "conditional", amount: Math.round(asked * 0.5), text: `${flavour}: "Here is half. The rest comes when you show me you can handle money."` };
  }
  if (spec.need < 0.7 && chance(0.18)) return { type: "askPurpose", amount: asked, text: `${flavour}: "First tell me ${PURPOSE[kind]}. Then I will decide."` };
  return { type: "full", amount: asked, text: `${flavour}: "${pick(["Okay, my dear. I have sent it.", "Alright. Use it well.", "No problem. Money is on the way."])}"` };
}

/** Applies the reply: moves money, creates loans, updates the giver's memory. Returns the message to show. */
export function applySupport(p: Player, n: Npc, kind: SupportKind, reply: SupportReply, opts: { accepted?: boolean } = {}): string {
  const spec = SUPPORT_KINDS[kind];
  n.asks += 1;
  const reason = `${spec.label} from ${n.name}`;
  switch (reply.type) {
    case "full":
    case "partial":
    case "conditional": {
      transact(p, { amount: reply.amount, reason, category: kind === "pocket" || kind === "food" || kind === "transport" ? "allowance" : "gift" });
      n.gaveThisYear += reply.amount / p.index;
      n.closeness = clamp(n.closeness + (reply.type === "full" ? 2 : 0));
      if (kind === "phone") p.possessions.phone = p.possessions.smartphone = true;
      if (kind === "laptop") p.possessions.laptop = true;
      remember(p, n, `Gave you ${naira(reply.amount)} for ${spec.label.toLowerCase()}.`, "good");
      break;
    }
    case "loan": {
      if (opts.accepted === false) return `${n.name.split(" ")[0]} shrugs: "Then manage yourself."`;
      const loan = newInformalLoan(p, n, reply.amount, 12, `${spec.label} (family loan)`);
      p.loans.push(loan);
      transact(p, { amount: reply.amount, reason: `Family loan from ${n.name}`, category: "loan" });
      n.gaveThisYear += reply.amount / p.index;
      break;
    }
    case "askPurpose": {
      transact(p, { amount: reply.amount, reason, category: kind === "pocket" ? "allowance" : "gift" });
      n.gaveThisYear += reply.amount / p.index;
      if (kind === "phone") p.possessions.phone = p.possessions.smartphone = true;
      if (kind === "laptop") p.possessions.laptop = true;
      break;
    }
    case "refuse":
    case "workForIt":
    case "later":
      n.closeness = clamp(n.closeness - (n.asks >= 3 ? 4 : 1));
      remember(p, n, `Refused to give you money for ${spec.label.toLowerCase()}.`, "bad");
      break;
  }
  return reply.text;
}

export function newInformalLoan(p: Player, n: Npc | null, amount: number, months: number, note: string, lenderType: Loan["lenderType"] = "friend"): Loan {
  const now = p.age * 12 + p.month;
  return {
    id: uid(),
    direction: "owed",
    lenderType: n && ["dad", "mom", "guardian", "grandparent"].includes(n.role) ? "parent" : n && ["uncle", "aunt", "sibling", "cousin"].includes(n.role) ? "relative" : lenderType,
    lenderId: n?.id,
    lenderName: n?.name ?? "Friend",
    principal: amount,
    balance: amount,
    apr: 0,
    fee: 0,
    termMonths: months,
    monthly: 0,
    startAge: p.age,
    startMonth: p.month,
    dueIndex: now + months,
    informal: true,
    missed: 0,
    status: "active",
    lastCharged: -1,
    note,
  };
}

/** Pick the NPC who would most naturally answer a support request. */
export function primaryProvider(p: Player): Npc | null {
  const ids = p.fam.providers.filter((id) => p.npcs[id]?.alive);
  if (ids.length === 0) return null;
  // The richer, more generous provider answers first.
  return ids.map((id) => p.npcs[id]).sort((a, b) => b.income + b.generosity * 1000 - (a.income + a.generosity * 1000))[0];
}

export function randomStateForFamily(): StateInfo {
  return pick(TRAVEL_STATES);
}
