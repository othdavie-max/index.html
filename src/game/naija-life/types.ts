import type { Look } from "./look";

export type Gender = "male" | "female";
export type Edu = "none" | "primary" | "secondary" | "tertiary";
export type WealthClass = "struggling" | "middle" | "rich";
export type Region = "North Central" | "North East" | "North West" | "South East" | "South South" | "South West";

export interface StateInfo {
  id: string;
  name: string;
  region: Region;
  capital: string;
  /** Opportunity 1-10: job market, salaries, business growth. */
  opp: number;
  /** Cost of living multiplier. */
  cost: number;
  /** Insecurity 1-10: drives kidnapping and robbery odds. */
  risk: number;
  abroad?: boolean;
}

export interface Stats {
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  stress: number;
  /** "Who you know" meter. */
  connections: number;
  reputation: number;
  fitness: number;
}

export type HouseKind = "land" | "apartment" | "bungalow" | "duplex" | "flats";
export type HouseUse = "owner" | "family" | "rent" | "empty";
export interface House {
  id: string;
  state: string;
  kind: HouseKind;
  value: number;
  use: HouseUse;
}

export type HoldingKind = "usd" | "stocks" | "crypto" | "oil" | "school" | "farm" | "bank";
export interface Holding {
  id: string;
  kind: HoldingKind;
  label: string;
  invested: number;
  value: number;
}

export interface JobState {
  id: string;
  rank: number;
  years: number;
}

export interface Nation {
  economy: number;
  security: number;
  welfare: number;
  approval: number;
  /** EFCC / coup heat. */
  heat: number;
  projects: string[];
}

export interface Politics {
  /** Index into OFFICES the player currently holds, or -1 for none (but in politics). */
  office: number;
  yearsLeft: number;
  terms: number;
  godfather: boolean;
  /** Highest office ever held (-1 none). */
  highest: number;
  /** Power bases, 0-100. */
  machine: number;
  umpire: number;
  courts: number;
  military: number;
  kingmaker: number;
  vp: boolean;
  vpYears: number;
  anointed: boolean;
  hero: boolean;
  militaryRuler: boolean;
  defected: boolean;
}

export interface Kid {
  name: string;
  age: number;
  gender: Gender;
  look?: Look;
}

export interface LogEntry {
  age: number;
  year: number;
  lines: string[];
}

export interface Player {
  id: string;
  name: string;
  surname: string;
  gender: Gender;
  tribe: string;
  religion: string;
  birthState: string;
  state: string;
  age: number;
  birthYear: number;
  generation: number;
  alive: boolean;
  cause: string;
  classAtBirth: WealthClass;
  stats: Stats;
  money: number;
  debt: number;
  /** Cumulative price index. 1 at the start of the first life. */
  index: number;
  edu: Edu;
  course: string | null;
  school: { stage: "primary" | "secondary" | "tertiary"; yearsLeft: number; type: string } | null;
  job: JobState | null;
  houses: House[];
  holdings: Holding[];
  look: Look;
  /** Hidden fortune stat, 0-100. Shapes windfalls and disasters. */
  luck: number;
  /** Month within the current age year, 1-12. */
  month: number;
  ledger: Tx[];
  fin: FinYear[];
  npcs: Record<string, Npc>;
  fam: FamilyBg;
  loans: Loan[];
  /** 0-100. Affects digital loans and bank eligibility. */
  credit: number;
  housing: Housing;
  subs: Sub[];
  possessions: Possessions;
  skills: Record<string, number>;
  vehicles: Vehicle[];
  family: { state: string; happy: number; parentsAlive: boolean; dad?: Look; mom?: Look };
  spouse: { name: string; happy: number; look?: Look } | null;
  kids: Kid[];
  traveled: boolean;
  actionsLeft: number;
  prison: number;
  politics: Politics | null;
  nation: Nation;
  loot: number;
  goodDeeds: number;
  prestige: number;
  kidnaps: number;
  flags: Record<string, boolean | number | string>;
  achievements: string[];
  peakWorth: number;
  log: LogEntry[];
}

// ---------------------------------------------------------------------------
// Money records
// ---------------------------------------------------------------------------
export type TxCategory =
  | "salary" | "business" | "gift" | "allowance" | "loan" | "repayment" | "interest" | "rent" | "food" | "transport"
  | "utilities" | "airtime" | "education" | "health" | "dating" | "family" | "vehicle" | "tax" | "betting"
  | "investment" | "legal" | "emergency" | "asset" | "social" | "inheritance" | "personal" | "event" | "crime" | "other";

export interface Tx {
  id: string;
  /** Positive = money in, negative = money out. */
  amount: number;
  reason: string;
  category: TxCategory;
  age: number;
  month: number;
  eventId?: string;
  before: number;
  after: number;
  recurring?: string;
}

export interface FinYear {
  age: number;
  income: number;
  expense: number;
  /** Money borrowed this year (loan proceeds are not income). */
  borrowed: number;
  cats: Record<string, number>;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export type NpcRole = "dad" | "mom" | "guardian" | "sibling" | "friend" | "cousin" | "uncle" | "aunt" | "grandparent" | "partner" | "ex" | "match" | "colleague";

export interface NpcMemory {
  age: number;
  text: string;
  tone: "good" | "bad";
}

export interface Npc {
  id: string;
  name: string;
  gender: Gender;
  role: NpcRole;
  look: Look;
  /** NPC age = player's age + ageDelta (so parents stay older). */
  ageDelta: number;
  alive: boolean;
  occupation: string;
  stateId: string;
  /** Annual income in base-year naira (inflated by the price index when used). */
  income: number;
  /** Savings cushion in base-year naira. */
  savings: number;
  generosity: number;
  strictness: number;
  responsibility: number;
  materialism: number;
  /** How close you are, 0-100. */
  closeness: number;
  /** Whether they trust you with money, 0-100. */
  trust: number;
  /** How many times you asked recently. Decays yearly. */
  asks: number;
  /** Total they gave you this year, base-year naira. */
  gaveThisYear: number;
  traits: string[];
  memories: NpcMemory[];
}

export type FamilyArchetype = "nepo" | "upperMiddle" | "middle" | "strictRich" | "struggling" | "lapo" | "newlyRich" | "fallenRich";
export type FamilyStructure = "two-parent" | "single-mother" | "single-father" | "grandparents" | "relatives" | "divorced" | "parents-abroad" | "orphan";

export interface FamilyBg {
  archetype: FamilyArchetype;
  label: string;
  structure: FamilyStructure;
  /** Household income in base-year naira per year. */
  income: number;
  generosity: number;
  strictness: number;
  responsibility: number;
  closeness: number;
  trend: "rising" | "steady" | "falling";
  debts: number;
  connections: boolean;
  siblings: number;
  tags: string[];
  /** Support the family has stopped giving (e.g. "pocketMoney", "rent"). */
  cutOff: string[];
  /** Support already given once (e.g. "graduationGift"). */
  given: string[];
  /** NPC ids of the adults who provide for you. */
  providers: string[];
  dadId?: string;
  momId?: string;
  /** Parents expect you to contribute to household costs once you earn. */
  expectContribution: boolean;
}

export interface Loan {
  id: string;
  direction: "owed" | "owedToMe";
  lenderType: "friend" | "relative" | "parent" | "digital" | "bank" | "cooperative" | "other";
  lenderId?: string;
  lenderName: string;
  principal: number;
  balance: number;
  /** Annual rate used for interest on installment loans. */
  apr: number;
  fee: number;
  termMonths: number;
  monthly: number;
  startAge: number;
  startMonth: number;
  /** Informal loans are due in one go at this absolute month index (age*12+month). */
  dueIndex?: number;
  informal: boolean;
  missed: number;
  status: "active" | "paid" | "defaulted";
  /** Prevents charging the same month twice. */
  lastCharged: number;
  note?: string;
}

export interface Housing {
  type: "family" | "rented" | "owned" | "hostel" | "shared";
  stateId: string;
  annualRent: number;
  /** Rent is paid until this absolute month index (age*12+month). */
  paidUntil: number;
  arrears: number;
  landlord: string;
}

export interface Sub {
  id: string;
  label: string;
  monthly: number;
  category: TxCategory;
  /** Absolute month index it started. */
  since: number;
}

export interface Vehicle {
  id: string;
  modelId: string;
  name: string;
  kind: "used" | "new";
  value: number;
  condition: number;
  role: "personal" | "taxi" | "ridehail";
  insuredUntil: number;
  bought: number;
  luxury: boolean;
  loanId?: string;
}

export interface Possessions {
  phone: boolean;
  smartphone: boolean;
  laptop: boolean;
}

export type EventData = Record<string, string | number | boolean>;

export type ChoiceResult = string | { text: string; spawn?: Pending[] };

export interface Choice {
  label: string;
  sub?: string;
  /** If set, the choice is shown but disabled with this reason. */
  disabled?: string | false;
  run: (p: Player) => ChoiceResult;
}

export interface EventDef {
  id: string;
  title: string;
  weight: (p: Player) => number;
  /** Queued events are dropped before showing if this returns false. */
  valid?: (p: Player) => boolean;
  init?: (p: Player) => EventData;
  text: (p: Player, d: EventData) => string;
  choices: (p: Player, d: EventData) => Choice[];
}

export interface AutoDef {
  id: string;
  weight: (p: Player) => number;
  run: (p: Player) => string;
}

export interface KidnapState {
  demand: number;
  floor: number;
  patience: number;
  round: number;
  pool: number;
  poolBase: number;
  borrowed: number;
  savingsPut: number;
  sold: number;
  usedSavings: boolean;
  fundraised: boolean;
  borrowedOnce: boolean;
  stage: "raise" | "negotiate" | "over";
  history: string[];
  captors: string;
  outcome?: "freed" | "rescued" | "escaped" | "dead";
  summary?: string;
}

export type Pending = { kind: "event"; id: string; data: EventData } | { kind: "kidnap"; k: KidnapState };

export interface LineageEntry {
  name: string;
  generation: number;
  born: number;
  died: number;
  ageAtDeath: number;
  cause: string;
  worth: number;
  peakWorth: number;
  highestOffice: string;
  state: string;
  prestige: number;
  loot: number;
  goodDeeds: number;
  epitaph: string;
}

export interface Dynasty {
  surname: string;
  lineage: LineageEntry[];
}

export interface Game {
  p: Player;
  queue: Pending[];
  dynasty: Dynasty;
}
