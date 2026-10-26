/**
 * NIGERIA: CAN YOU FIX IT? — state model.
 * Everything is plain JSON so a save is just the state. All numbers are SIMULATED game values for a fictional,
 * internally consistent scenario; they are not real statistics.
 */
export const FIX_VERSION = 1;
export const TERM_MONTHS = 48;
export const MAX_TERMS = 2;

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

export type EventKind = "protest" | "strike" | "insecurity" | "flood" | "foodcrisis" | "grid" | "oilattack" | "opportunity" | "scandal" | "global";
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
}

export interface Snap {
  month: number;
  fx: number; inflation: number; foodInflation: number; fuel: number; unemployment: number; youthUnemployment: number;
  happiness: number; approval: number; treasury: number; debt: number; reserves: number; power: number; insecurity: number;
  realIncome: number; growth: number; foodAfford: number; personalWealth: number; trust: number; infra: number; displaced: number; dsr: number; debtGdp: number;
}

export interface Report { id: string; month: number; title: string; lines: string[]; tone: "good" | "bad" | "neutral" }

export interface TermResult {
  term: number;
  result: "won" | "lost" | "removed" | "completed";
  start: Snap;
  end: Snap;
  title: string;
  months: number;
}

export interface FixState {
  version: number;
  meta: { seed: number; id: string; president: string; hard: boolean };
  month: number; // months elapsed since inauguration
  processed: number; // last month index fully processed (idempotency)
  term: number;
  termStart: number;
  ended: null | { kind: "term" | "removed"; text: string };
  done: boolean; // whole game finished (legacy shown)
  eco: {
    fx: number; reserves: number; inflation: number; foodInflation: number; emaDrift: number; priceLevel: number; foodPriceIdx: number;
    wageIdx: number; growth: number; gdpIdx: number; investor: number; oilPrice: number; oilTrend: number; fxGap: number; fxDefence: number;
  };
  oil: { crude: number; theft: number; production: number; refinery: number; refineryNameplate: number; demand: number; revenueUsd: number };
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
  terms: TermResult[];
  baseline: Snap;
  flags: Record<string, number | string | boolean>;
  settings: { autosave: boolean; reducedMotion: boolean };
}
