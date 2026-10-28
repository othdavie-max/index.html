/**
 * NIGERIA: CAN YOU FIX IT? — state model.
 * Everything is plain JSON so a save is just the state. All numbers are SIMULATED game values for a fictional,
 * internally consistent scenario; they are not real statistics.
 */
export const FIX_VERSION = 1;
export const TERM_MONTHS = 48;
export const MAX_TERMS = 2;
/** even with no term limits, the story ends after this many terms (16 years) */
export const HARD_CAP_TERMS = 4;

/** Every long-lived effect of a policy, measure or project is expressed as an additive "lever". */
export type Lever =
  | "foodSupply" | "postHarvest" | "storage" | "irrigation" | "inputs" | "foodPrice" | "transport"
  | "refinery" | "oilTheft" | "crude" | "power" | "grid" | "gas" | "maint"
  | "roads" | "rail" | "ports"
  | "jobs" | "sme" | "manuf" | "exports" | "skills" | "wage"
  | "fxSupply" | "fxDemand" | "investor" | "inflation"
  | "revenue" | "taxCompl" | "corruption" | "procurement" | "capacity" | "transparency"
  | "trust" | "happiness" | "security" | "forces"
  | "education" | "health" | "welfare";

export type Effects = Partial<Record<Lever, number>>;

export interface Modifier {
  id: string;
  source: string; // policy:x | measure:x | project:x | event:x | shock:x
  label: string;
  start: number;
  /** null = permanent while source stays active */
  end: number | null;
  /** months to reach full strength */
  ramp: number;
  /** realised multiplier on the nominal effect (carries the outcome of uncertainty) */
  scale: number;
  effects: Effects;
  /** running cost in ₦bn per month at start-of-game prices (negative = saving) */
  monthly?: number;
}

export interface PolicyState { active: boolean; since: number; level: number }

export type ProjectStatus = "active" | "stalled" | "done" | "cancelled";
export type Funding = "treasury" | "domestic" | "concessional" | "ppp";
export interface Project {
  id: string;
  defId: string;
  name: string;
  stateId: string;
  lgaId?: string;
  funding: Funding;
  start: number;
  months: number; // planned duration
  delay: number; // extra months accumulated
  progress: number; // 0..1
  cost: number; // total budget ₦bn (already includes any overrun so far)
  baseCost: number;
  spent: number; // ₦bn
  leaked: number; // ₦bn lost to leakage
  quality: number; // contractor performance 0..1
  status: ProjectStatus;
  notes: string[];
  favour?: boolean;
  done?: number; // month completed
  /** realised fraction of the advertised benefit, fixed at completion */
  benefitScale?: number;
}

export type EventKind = "protest" | "strike" | "insecurity" | "flood" | "foodcrisis" | "grid" | "oilattack" | "opportunity" | "scandal" | "global" | "story" | "request" | "case" | "power" | "moment";
export interface EventOption {
  id: string; label: string; explain: string; cost: number; tradeoff: string; uncertainty: "low" | "medium" | "high";
}
export interface GameEvent {
  id: string;
  tpl: string;
  kind: EventKind;
  stateId: string;
  title: string;
  cause: string;
  scale: 1 | 2 | 3 | 4 | 5;
  born: number;
  deadline: number; // month by which it escalates if unanswered
  status: "open" | "resolved" | "expired";
  options: EventOption[];
  outcome?: string;
  chosen?: string;
}

export interface NewsItem { id: string; month: number; headline: string; body: string; tone: "good" | "bad" | "neutral"; source: string; stateId?: string }

export interface Region {
  food: number; // each 0..100, higher = worse
  insecurity: number;
  jobless: number;
  power: number;
  flood: number;
  unrest: number;
  /** persistent structural offsets so Borno stays different from Lagos */
  off: { food: number; insecurity: number; jobless: number; power: number; flood: number };
  /** where this state stood on day one, so progress can be shown */
  start?: { food: number; insecurity: number; jobless: number; power: number };
}

export interface Snap {
  month: number;
  fx: number; inflation: number; foodInflation: number; fuel: number; unemployment: number; youthUnemployment: number;
  happiness: number; approval: number; treasury: number; debt: number; reserves: number; power: number; insecurity: number;
  realIncome: number; growth: number; foodAfford: number; personalWealth: number; trust: number; infra: number; displaced: number; dsr: number; debtGdp: number;
}

/** A delayed consequence of an earlier decision. Scheduled when you act; resolved months later from the state at that time. */
export interface Echo {
  id: string;
  kind: string;
  cause: string;
  causeMonth: number;
  due: number;
  hint: string;
  tone: "good" | "bad" | "mixed";
  stateId?: string;
  status: "pending" | "done";
  outcome?: string;
  outTone?: "good" | "bad" | "neutral";
}
export type Portfolio = "finance" | "agriculture" | "power" | "security" | "cbn" | "works";
export type Faction = "technocrat" | "loyalist" | "heavyweight" | "crony";
export interface Minister { id: string; name: string; portfolio: Portfolio; skill: number; integrity: number; faction: Faction; trait: string; zone: string; since: number; mood: number;
  /** cronies: honesty is unknown until something happens */
  hidden?: boolean; bio?: string;
  /** month you warned them: "you are here to work, not to eat" */
  warned?: number }
export type AideKind = "friend" | "technocrat" | "chieftain" | "general" | "cleric" | "regional" | "loyalist" | "defector";
export interface Aide { id: string; kind: AideKind; name: string; bio: string; skill: number; loyalty: number; integrity: number; portrait: Portrait; revealed: boolean; since: number }
export interface Backer { id: string; name: string; title: string; zone: string; power: number; bio: string; mood: number; owed: number }
export interface Deal { id: string; name: string; sector: string; stateId: string; capex: number; jobs: number; start: number; months: number; progress: number; status: "building" | "open" | "stalled"; terms: "generous" | "fair"; benefit: string; effects: Effects; revenue: number; opened?: number }
export type EnemyPlan = "protests" | "leaks" | "rival" | "bandits" | "coup";
export interface Enemy { id: string; name: string; reason: string; portrait: Portrait; plan: EnemyPlan; power: number; grudge: number; zone: string; status: "active" | "bought" | "crushed" | "reconciled"; since: number; note?: string }
export interface TimelineItem { month: number; title: string; text: string; tone: "good" | "bad" | "neutral"; chain?: string }
export interface Gone { id: string; name: string; role: string; how: "executed" | "jailed" | "released"; month: number; releaseAt?: number; stateId?: string }
export interface Family { id: string; name: string; role: string; stateId: string; place: string; portrait: Portrait; mood: number; status: "thriving" | "ok" | "struggling" | "left"; high: number; low: number; stage: number; log: { month: number; text: string }[]; helped?: number }
export interface Foreign { rel: { imf: number; china: number; usa: number; ecowas: number }; imf: null | { since: number; tranches: number; breach: number; suspended: boolean }; china: null | { since: number }; usaAid: null | { since: number; suspended: boolean }; log: { month: number; text: string }[] }
export interface Party { north: number; south: number; youth: number; oldguard: number; vpAmbition: number; vpStage: number }
export interface Home { spouse: { name: string; portrait: Portrait }; kids: number; health: number; illness: null | { since: number; hidden: boolean; acting: boolean }; abroad: number }
export interface Neighbour { id: string; name: string; strength: number; mood: number; stability: number }
export interface Military { strength: number; neighbours: Neighbour[]; peace: number }
export interface Loan { id: string; borrower: string; amountUsd: number; rate: number; start: number; term: number; status: "performing" | "defaulted" | "repaid" | "forgiven"; strings: string; earned: number }
export interface Lending { loans: Loan[]; fund: number }
export interface Ledger { stolen: number; recovered: number; pending: number; used: Record<string, number>; log: { month: number; text: string; amount: number }[] }
export interface Staff { cos: Aide | null; vp?: Aide | null; picked: boolean }
export interface ElectionResult { month: number; national: number; states: Record<string, number>; statesOver25: number; won: boolean; runoff: boolean; chance: number; honest?: number; rigged?: boolean; stolen?: boolean }
export type Difficulty = "easy" | "normal" | "hard";
export interface Portrait { skin: number; hair: number; style: number; accent: number }
export type GroupId = "traders" | "farmers" | "youth" | "workers" | "business" | "military" | "faith";
export type Trait = "reformer" | "populist" | "strongman" | "clean" | "builder" | "borrower";
export type BudgetHead = "education" | "health" | "security" | "infrastructure" | "social";
export interface Governor { zone: string; name: string; party: "NPP" | "PRA"; relation: number; ambition: number }
export type Chamber = "senate" | "reps";
export type LmStatus = "active" | "exposed" | "jailed" | "executed" | "controlled" | "protected" | "released";
export interface Lawmaker {
  id: string; name: string; chamber: Chamber; stateId: string; party: "NPP" | "PRA"; loyalty: number; greed: number;
  /** ₦bn stolen so far (you may not know) */
  stolen: number;
  /** how much proof you hold (0-100) */
  evidence: number;
  status: LmStatus; portrait: Portrait; trait: string; since: number; note?: string; releaseAt?: number;
}
export interface PowerState {
  lawLevel: 0 | 1 | 2 | 3 | 4;
  deterrence: number;
  streetAnger: number; coupRisk: number; intlPressure: number; eliteLoyalty: number;
  pressFreedom: number; judiciary: number; inecControl: number; democracy: number;
  emergencyUntil: number; shutdownUntil: number;
  termExtra: number; maxTerms: number;
  acts: string[]; executions: number; convicted: number; wrongful: number;
  rigged: boolean; stolenElection: boolean; inecExposed: number;
  /** months in a row anger has been at revolutionary levels */
  uprising: number;
  /** recent abuse of power: rises with every authoritarian act, fades slowly; feeds anger and coup risk */
  abuse: number;
}
export interface Achievement { id: string; label: string; month: number }

export interface Report { id: string; month: number; title: string; lines: string[]; tone: "good" | "bad" | "neutral" }

export interface TermResult {
  term: number;
  result: "won" | "lost" | "removed" | "completed";
  start: Snap;
  end: Snap;
  title: string;
  months: number;
  ending?: string;
}

export interface AgendaPick { id: string; from: number; start: number }
export interface Inherit { name: string; fx: number; inflation: number; corruption: number; democracy: number; lawLevel: number; domesticDebt: number; foreignDebt: number; trust: number; approval: number; gen: number }
/** the meta layer: unlocks, political capital, yearly agenda, pacing director, and run options */
export interface Cap {
  pc: number;
  unlocked: string[];
  agenda: AgendaPick[];
  agendaDue: boolean;
  offer: string[];
  agendaLog: { year: number; id: string; ok: boolean; text: string }[];
  /** pacing director: how hot the last months were (0..100), calm streak, and the event-rate multiplier it set */
  tension: number; calm: number; rate: number;
  quick: boolean;
  /** legacy mode: no term limits, keep building one Nigeria */
  legacy: boolean;
  /** which president of this Nigeria (1 = the first) */
  era: number;
  perks: string[];
  dynasty: number;
  castPrev: Record<string, number>;
}

export interface FixState {
  version: number;
  meta: { seed: number; id: string; president: string; hard: boolean; scenario: string; difficulty: Difficulty; portrait: Portrait; archetype?: string; start?: string; daily?: string };
  month: number; // months elapsed since inauguration
  processed: number; // last month index fully processed (idempotency)
  term: number;
  termStart: number;
  ended: null | { kind: "term" | "removed"; text: string; cause?: "impeached" | "coup" | "uprising"; choice?: boolean; overstay?: boolean };
  done: boolean; // whole game finished (legacy shown)
  eco: {
    fx: number; reserves: number; inflation: number; foodInflation: number; emaDrift: number; priceLevel: number; foodPriceIdx: number;
    wageIdx: number; growth: number; gdpIdx: number; investor: number; oilPrice: number; oilTrend: number; fxGap: number; fxDefence: number;
  };
  oil: { crude: number; theft: number; production: number; refinery: number; refineryNameplate: number; demand: number; revenueUsd: number;
    /** refinery uptime 0..100: it decays unless maintained, theft and corruption hurt it */
    uptime: number; refined: number; scarcity: number };
  fuel: { coverage: number; targeting: number; transfers: boolean; pump: number; parity: number; costMonthly: number; leak: number; importShare: number; history: number[] };
  agri: { inputs: number; irrigation: number; storage: number; processing: number; weather: number; supply: number; demand: number; loss: number; imports: number };
  power: { installed: number; available: number; demand: number; grid: number; gas: number; losses: number; renew: number };
  infra: { roads: number; rail: number; ports: number; maint: number };
  jobs: { unemployment: number; youth: number; sme: number; manuf: number; skills: number; exports: number; productivity: number };
  fin: {
    treasury: number; domesticDebt: number; foreignDebt: number; domRate: number; forRate: number; revenue: number; oilRev: number; nonOilRev: number;
    spend: number; debtService: number; deficit: number; waysAndMeans: number; arrears: number; taxCompl: number; creditRating: number; lastBorrowed: number;
  };
  sec: { banditry: number; terror: number; communal: number; forces: number; displaced: number; humanRights: number; index: number };
  soc: { education: number; health: number; welfare: number };
  gov: { corruption: number; procurement: number; capacity: number; transparency: number; trust: number; approval: number; opposition: number; happiness: number };
  me: { wealth: number; evidence: number; scandals: number; acts: string[] };
  /** plain-language reasons behind this month's moves, rebuilt every month */
  why: Record<string, string[]>;
  regions: Record<string, Region>;
  policies: Record<string, PolicyState>;
  modifiers: Modifier[];
  projects: Project[];
  events: GameEvent[];
  news: NewsItem[];
  reports: Report[];
  history: Snap[];
  echoes: Echo[];
  /** campaign promises chosen at the start (ids from promises.ts) */
  promises: string[];
  achievements: Achievement[];
  cabinet: { members: Partial<Record<Portfolio, Minister>>; pool: Minister[]; reshuffles: number };
  rival: { name: string; party: string; zone: string; popularity: number };
  campaign: { rallies: Record<string, number>; debateShift: number; mobilise: number; attacks: number; actionsThisMonth: number; month: number };
  election: ElectionResult | null;
  lawmakers: Lawmaker[];
  /** power, corruption and the danger meters (named `rule` because `power` is electricity) */
  rule: PowerState;
  staff: Staff;
  backers: Backer[];
  deals: Deal[];
  enemies: Enemy[];
  gone: Gone[];
  families: Family[];
  foreign: Foreign;
  party: Party;
  home: Home;
  mil: Military;
  lend: Lending;
  ledger: Ledger;
  timeline: TimelineItem[];
  assembly: { support: number; lobby: Record<string, number>; passed: number; defeats: number };
  governors: Governor[];
  groups: Record<GroupId, number>;
  groupMood: Record<GroupId, number>;
  reputation: Record<Trait, number>;
  budget: { levels: Record<BudgetHead, number>; passedYear: number };
  speech: { last: number; moment: string | null };
  terms: TermResult[];
  baseline: Snap;
  flags: Record<string, number | string | boolean>;
  cap: Cap;
  settings: { autosave: boolean; reducedMotion: boolean };
}
