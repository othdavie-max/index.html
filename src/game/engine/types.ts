/**
 * Core serialisable game-state types. The whole game is one plain JSON object (`GameState`) — no class instances,
 * no functions — so it can be saved, loaded, diffed, tested and (in future) held authoritatively on a server.
 */
import type { OfficeId, EducationLevel } from "../data/rules";
import type { Issue } from "../data/parties";
import type { ZoneId } from "../data/states";
import type { PartyDef } from "../data/parties";

export const SIM_VERSION = 1;

export type StateId = string;
export type LgaId = string;
export type PartyId = string;
export type CharId = string;
export type SeatId = string;
export type ContestId = string;
export type Difficulty = "standard" | "challenging" | "sandbox";

export const INDICATORS = ["economy", "infrastructure", "security", "health", "education", "power"] as const;
export type Indicator = (typeof INDICATORS)[number];
export const INDICATOR_LABEL: Record<Indicator, string> = {
  economy: "Economy & jobs", infrastructure: "Infrastructure & transport", security: "Security", health: "Healthcare",
  education: "Education", power: "Electricity reliability",
};
export type Indicators = Record<Indicator, number>;

export const BUDGET_LINES = ["infrastructure", "health", "education", "security", "power", "welfare", "agriculture", "admin"] as const;
export type BudgetLine = (typeof BUDGET_LINES)[number];
export const BUDGET_LABEL: Record<BudgetLine, string> = {
  infrastructure: "Roads, transport & works", health: "Health", education: "Education", security: "Security & policing",
  power: "Power & energy", welfare: "Social welfare & jobs", agriculture: "Agriculture & rural development", admin: "Administration (recurrent)",
};

// ------------------------------------------------------------------ calendar
export interface GameDate { year: number; month: number } // month 1..12

// ------------------------------------------------------------------ characters
export interface CharAttrs {
  competence: number; // 0..100
  charisma: number;
  integrity: number;
  ambition: number;
  connections: number;
  popularity: number;
}
export interface Character {
  id: CharId;
  name: string;
  female: boolean;
  birthYear: number;
  stateId: StateId; // state of origin / base
  lgaId: LgaId;
  partyId: PartyId | null;
  factionId: string | null;
  attrs: CharAttrs;
  wealthM: number; // ₦ millions (simulated)
  status: "active" | "retired" | "deceased" | "jailed" | "banned";
  /** the seat currently held, if any */
  seatId: SeatId | null;
  /** career goal for AI decisions */
  goal: OfficeId | null;
  /** past decisions / record, newest last, capped */
  record: { m: number; text: string }[];
  /** corruption evidence file (0 = none) */
  evidence: number;
  /** minister/role label for appointed posts */
  role?: string;
  education: EducationLevel;
  /** private persons (relatives, associates) are `kind: 'private'` and never hold seats */
  kind: "politician" | "private";
  /** last month the character defected, for cooldown */
  lastDefection?: number;
  convictedYear?: number; // dishonesty conviction year (election bar)
  /** contest currently being aspired to (a person can only chase one seat per cycle) */
  runningIn?: string;
}

export interface Seat {
  id: SeatId;
  office: OfficeId;
  label: string; // "Ikeja Federal Constituency"
  stateId: StateId | null; // null = national
  lgaIds: LgaId[];
  /** weight of each lga in this seat (sub-constituency share), same order as lgaIds */
  lgaWeights: number[];
  holderId: CharId | null;
  partyId: PartyId | null;
  termStart: number;
  /** month index at which the current term ends and the successor is inaugurated */
  termEnd: number;
  termsServed: number;
  /** month of the next election for this seat */
  nextElection: number;
  /** electoral rounds contested since game start (history) */
  lastResult?: { month: number; winnerPartyId: PartyId; margin: number; turnout: number };
}

// ------------------------------------------------------------------ world
export interface LgaSim {
  id: LgaId;
  pop: number; // simulated
  registered: number;
  urban: number; // 0..1 simulated urbanness
  affinity: Record<PartyId, number>; // sums to 1
  indicators: Indicators;
  turnoutBase: number; // 0..1
  salience: Record<Issue, number>; // 0..1 each, derived from needs
  wards: number;
  chairSeatId: SeatId;
}
export interface StateSim {
  id: StateId;
  pop: number;
  registered: number;
  indicators: Indicators;
  satisfaction: number; // 0..100 public satisfaction with state government
  treasuryM: number; // ₦ millions
  revenueMonthlyM: number;
  allocations: Record<BudgetLine, number>; // shares summing to 1
  debtM: number;
  governorSeatId: SeatId | null;
  assemblySeatIds: SeatId[];
  senateSeatIds: SeatId[];
  repsSeatIds: SeatId[];
  lgaIds: LgaId[];
  /** months until the state electoral commission next holds LGA elections (fixed schedule) */
  lgNextElection: number;
  incidents: number; // recent security incident pressure 0..100
  floodRisk: number; // 0..1
}

export interface Economy {
  cpi: number;
  inflation: number; // annual %
  fxRate: number; // ₦ per US$ (simulated)
  oilPrice: number; // US$/bbl (simulated)
  fuelPrice: number; // ₦/litre (simulated)
  fuelSubsidy: number; // 0..1 share of import cost the government pays
  gdpGrowth: number; // annual %
  unemployment: number; // %
  businessActivity: number; // 0..100 (50 neutral)
  wageIndex: number;
  purchasingPower: number; // wage/cpi, 100 = start
  electricity: number; // 0..100 national average
  revenueAnnualBn: number; // ₦ billion / yr
  spendingAnnualBn: number;
  debtBn: number;
  debtServiceShare: number; // % of revenue
  interestRate: number; // %
  satisfaction: number; // national 0..100
  allocations: Record<BudgetLine, number>;
  shocks: Shock[];
  treasuryBn: number;
}
export type EconKey = "oilPrice" | "fxRate" | "fuelPrice" | "inflation" | "gdpGrowth" | "unemployment" | "businessActivity" | "electricity" | "revenue";
export interface Shock {
  id: string;
  key: EconKey;
  amount: number; // total relative effect applied linearly over `months`, multiplicative % for prices, absolute for rates
  months: number;
  remaining: number;
  source: string;
  mode: "pct" | "abs";
}

// ------------------------------------------------------------------ parties
export interface PartyState {
  id: PartyId;
  fundsM: number;
  reputation: number;
  orgStrength: number;
  chairId: CharId | null;
  secretaryId: CharId | null;
  memberCount: number; // simulated, in thousands
  /** factional balance 0..100 per faction */
  factionPower: Record<string, number>;
  /** national swing popularity relative to baseline, -1..1 (updated from events & performance) */
  momentum: number;
  /** presidency nominee when chosen */
  presidentialNomineeId?: CharId | null;
  exists: boolean;
  founderId?: CharId;
  inPower: boolean;
}

// ------------------------------------------------------------------ player
export interface Relative { id: CharId; role: "father" | "mother" | "sibling" | "spouse" | "child" }
export interface Relationship {
  id: CharId;
  kind: "family" | "friend" | "mentor" | "rival" | "ally" | "party" | "colleague" | "patron" | "associate";
  affinity: number; // -100..100
  /** favours the character owes the player (+) or the player owes them (-) */
  favours: number;
  since: number;
  last: number;
  note?: string;
}

export interface PlayerAttrs {
  intelligence: number;
  communication: number;
  leadership: number;
  negotiation: number;
  financialMgmt: number;
  integrity: number;
  ambition: number;
  stress: number; // higher is worse
  health: number; // wellbeing 0..100
  politicalExperience: number; // accrues from activity
  reputation: number; // public reputation (character) 0..100
  charisma: number;
}
export type AttrKey = keyof PlayerAttrs;

export type OccupationKind = "student" | "employed" | "civil_service" | "business" | "unemployed" | "politician" | "freelance" | "retired";
export interface Occupation {
  kind: OccupationKind;
  jobId: string | null;
  title: string;
  /** monthly gross income in naira at start-of-game prices; adjusted by wageIndex at runtime */
  baseSalary: number;
  since: number;
  grade: number; // civil-service grade level / seniority
  timePct: number;
  employerStateId?: StateId;
}

export interface Business {
  typeId: string;
  name: string;
  stateId: StateId;
  lgaId: LgaId;
  capital: number; // owner equity
  employees: number;
  monthlyRevenue: number;
  monthlyCosts: number;
  quality: number; // 0..100 management / product quality
  since: number;
  /** months of losses in a row */
  lossStreak: number;
  contractsWon: number;
}

export interface Education {
  level: EducationLevel;
  field: string | null;
  institution: string | null;
  institutionType: "federal" | "state" | "private" | "polytechnic" | null;
  certificates: string[]; // e.g. "SSCE", "BSc Law", "Call to Bar"
  enrolled: null | {
    programmeId: string;
    startedMonth: number;
    monthsRemaining: number;
    monthlyCost: number; // tuition + upkeep
    delayed: number; // months lost to strikes
  };
  nysc: "na" | "pending" | "serving" | "done" | "exempt";
  nyscStateId?: StateId;
  graduated: number | null;
}

export type LedgerCat =
  | "salary" | "business" | "interest" | "family" | "rent" | "food" | "transport" | "utilities" | "health" | "education"
  | "tax" | "donation_in" | "donation_out" | "campaign" | "party" | "fees" | "office_pay" | "gift" | "debt" | "asset"
  | "legal" | "patronage" | "illicit" | "penalty" | "other" | "community";
export interface LedgerEntry { m: number; cat: LedgerCat; amount: number; label: string; account: "cash" | "campaign" | "illicit" }
export interface Debt { id: string; label: string; principal: number; rate: number; monthlyPayment: number; remainingMonths: number }
export interface Asset { id: string; label: string; value: number; kind: "property" | "vehicle" | "land" | "equity" | "other" }
export interface Finances {
  cash: number;
  savings: number;
  campaignFund: number;
  illicit: number; // undeclared wealth, tracked separately and never mixed with lawful accounts
  debts: Debt[];
  assets: Asset[];
  ledger: LedgerEntry[]; // recent, capped
  /** per-month totals for charts */
  monthly: { m: number; income: number; expense: number; net: number; cash: number; wealth: number }[];
  thisMonth: { income: number; expense: number };
  lifetimeDonationsByDonor: Record<string, number>;
}

export interface PartyMembership {
  partyId: PartyId;
  since: number;
  factionId: string | null;
  office: null | { level: "ward" | "lga" | "state" | "national"; post: string; scopeId: string; since: number };
  /** how much the party leadership trusts the player, 0..100 */
  standing: number;
  /** cards for history */
  history: { m: number; text: string }[];
}

export interface Candidacy {
  contestId: ContestId;
  office: OfficeId;
  seatId: SeatId;
  stage: "aspirant" | "nominee" | "lost_primary" | "withdrawn" | "disqualified" | "done";
  formPaid: boolean;
  runningMateId?: CharId | null;
  campaign: CampaignState;
  declaredMonth: number;
  /** lawful mobilisation spend aimed at primary delegates */
  primarySpend: number;
  /** unlawful inducements (traceable scheme) */
  delegatesBought: number;
  primaryResult?: { won: boolean; score: number; rivalScore: number; text: string };
  debatePrepared: boolean;
}
export interface CampaignState {
  activities: Record<CampaignActivity, number>; // ₦ monthly budget allocation
  spentTotal: number;
  organisation: number; // volunteers / structure strength 0..100
  momentum: number; // -1..1
  rallies: number;
  debatePerformance: number | null;
  endorsements: CharId[];
  /** lawful vs unlawful financing flags (traceable) */
  unlawfulSpending: number;
  concealedDonations: number;
  pendingMonthlySpend: number;
}
export type CampaignActivity = "rallies" | "media" | "grassroots" | "logistics" | "digital";

export interface IntegrityModel {
  /** documented-evidence strength against the player 0..100 across all schemes */
  exposure: number;
  /** legal risk once investigation opens 0..100 */
  legalRisk: number;
  /** political influence (power to move things) 0..100 */
  influence: number;
  /** public trust 0..100 */
  publicTrust: number;
  /** schemes still hiding evidence */
  schemes: CorruptionScheme[];
  /** open investigations/cases */
  cases: LegalCase[];
  convictions: { m: number; text: string; dishonesty: boolean }[];
  /** campaign-finance or conflict-of-interest violations on record */
  violations: { m: number; kind: string; text: string }[];
}
export interface CorruptionScheme {
  id: string;
  kind: string; // action id
  label: string;
  month: number;
  gain: number;
  /** evidence strength 0..100 — grows with witnesses, paper trail; decays slowly */
  evidence: number;
  /** who knows */
  witnesses: number;
  officeId: SeatId | null;
  /** detected & escalated flag */
  stage: "hidden" | "rumour" | "story" | "audit" | "investigation" | "charged" | "closed";
  /** true when the scheme is a campaign-finance / conflict-of-interest issue rather than criminal corruption */
  category: "criminal" | "campaign_finance" | "conflict_of_interest";
}
export interface LegalCase {
  id: string;
  schemeId: string;
  stage: "audit" | "investigation" | "charged" | "trial" | "verdict";
  openedMonth: number;
  nextStepMonth: number;
  strength: number; // evidence strength at charge time
  outcome?: "convicted" | "acquitted" | "withdrawn";
  title: string;
}

export interface PlayerPolitics {
  membership: PartyMembership | null;
  capital: number; // political capital 0..100
  candidacies: Candidacy[];
  /** seats presently held by the player */
  seatId: SeatId | null;
  appointment: null | { id: string; label: string; office: string; since: number; level: "local" | "state" | "federal"; stateId: StateId | null };
  pastOffices: { office: OfficeId; label: string; from: number; to: number | null; terms: number; reason?: string }[];
  electionHistory: ElectionRecordPlayer[];
  termsServed: Partial<Record<OfficeId, number>>;
  defections: number;
  /** supporters/backers per party relations for coalition negotiation */
  coalitions: { id: string; partners: PartyId[]; month: number; text: string }[];
  /** the player's own registered party, if the player founded one */
  foundedPartyId?: PartyId;
  /** nomination window flags the player has already been warned about */
  warned: string[];
}
export interface ElectionRecordPlayer {
  month: number;
  office: OfficeId;
  label: string;
  partyId: PartyId;
  won: boolean;
  share: number;
  position: number;
  turnout: number;
  contestId: ContestId;
}

export interface Commitments {
  volunteering: boolean;
  organising: boolean;
  partyWork: boolean;
  studentUnion: boolean;
  professionalBody: boolean;
  selfStudy: boolean;
  constituencyWork: boolean;
  family: boolean;
}

export interface Player {
  id: "player";
  name: string;
  female: boolean;
  portrait: { skin: number; hair: number; style: number; accent: number };
  birthMonth: number; // month index at birth (negative: before game start)
  birthStateId: StateId;
  birthLgaId: LgaId;
  residenceLgaId: LgaId;
  residenceStateId: StateId;
  backgroundId: string;
  family: {
    wealthTier: number; // 0..4
    politicalTies: number; // 0..4
    fatherJob: string;
    motherJob: string;
    relatives: Relative[];
    /** monthly obligation to family at game-start prices */
    obligation: number;
    notes: string[];
  };
  attrs: PlayerAttrs;
  /** local fame: name-recognition in each area 0..100 — sparse */
  fame: { national: number; states: Record<StateId, number>; lgas: Record<LgaId, number> };
  education: Education;
  occupation: Occupation;
  business: Business | null;
  career: { m: number; text: string }[];
  commitments: Commitments;
  finances: Finances;
  politics: PlayerPolitics;
  integrity: IntegrityModel;
  relationships: Record<CharId, Relationship>;
  flags: Record<string, number | string | boolean>;
  alive: boolean;
  retiredFromPolitics: boolean;
}

// ------------------------------------------------------------------ elections
/** serialisable candidate record kept on the contest */
export interface CandidateRecord {
  key: string;
  charId: CharId | null;
  isPlayer: boolean;
  name: string;
  partyId: PartyId;
  homeLgaId: LgaId | null;
  homeStateId: StateId | null;
  incumbent: boolean;
  runningMateStateId?: StateId | null;
  runningMateName?: string;
}

export interface Aspirant { charId: CharId | null; isPlayer: boolean; partyId: PartyId; score?: number }
export interface ContestResultState {
  stateId: StateId;
  turnout: number;
  votes: Record<string, number>; // candidate key → votes
  winnerKey: string;
  registered: number;
}
export interface ContestResult {
  winnerKey: string;
  winnerPartyId: PartyId;
  round: 1 | 2;
  totalVotes: number;
  registered: number;
  turnout: number;
  votes: Record<string, number>;
  shares: Record<string, number>;
  byState?: ContestResultState[];
  /** per-LGA winner & turnout for map layers (presidential / governorship / player contests) */
  byLga?: Record<LgaId, { w: string; t: number }>;
  /** spread rule outcome for presidential / governorship */
  spread?: { required: string; achieved: boolean; unitsMet: number; unitsNeeded: number; note: string };
  needsRunoff?: boolean;
  finalists?: [string, string];
  /** explanation: weighted contribution of each factor to each candidate's utility (vote-weighted mean) */
  factors: Record<string, Record<string, number>>;
  /** noteworthy local issues */
  notes: string[];
  electionDayEvents: string[];
}
export interface Contest {
  id: ContestId;
  office: OfficeId;
  seatId: SeatId;
  label: string;
  stateId: StateId | null;
  electionMonth: number;
  phase: "window" | "primaries" | "nominated" | "campaign" | "voting" | "runoff" | "done";
  aspirants: Record<PartyId, Aspirant[]>;
  /** nominees chosen in primaries (party → candidate) */
  nominees: Record<PartyId, CandidateRecord>;
  result?: ContestResult;
  /** first-round result kept when a runoff decides the winner */
  firstRound?: ContestResult;
  /** presidential/governorship candidates may go to a runoff */
  runoffMonth?: number;
  incumbentSeeking: boolean;
  petition?: { filedMonth: number; byKey: string; decisionMonth: number; outcome?: "upheld" | "dismissed" };
  /** primary results for display */
  primaryNotes: Record<PartyId, string>;
}
export interface ElectionLogEntry {
  month: number;
  contestId: ContestId;
  office: OfficeId;
  label: string;
  stateId: StateId | null;
  winnerPartyId: PartyId;
  winnerName: string;
  turnout: number;
  margin: number;
}

// ------------------------------------------------------------------ events & news
export interface ActiveEffect {
  id: string;
  eventId: string;
  occurrenceId: string;
  target: "national" | "state" | "player" | "economy";
  targetId?: string;
  stat: string;
  perMonth: number;
  remaining: number;
  label: string;
}
export interface EventOccurrence {
  id: string; // `${defId}@${month}@${scope}` stable & unique
  defId: string;
  month: number;
  scopeId: string | null;
  title: string;
  text: string;
  severity: 1 | 2 | 3 | 4 | 5;
  resolved: boolean;
  choiceId?: string;
}
export interface PendingDecision {
  occurrenceId: string;
  defId: string;
  title: string;
  text: string;
  scopeId: string | null;
  choices: { id: string; label: string; desc: string; costText?: string; disabledReason?: string; risk?: string }[];
  deadline: number; // month by which the default applies
  defaultChoiceId: string;
}
export type NewsTopic =
  | "national" | "state" | "local" | "elections" | "economy" | "services" | "security" | "corruption" | "party" | "personal";
export interface NewsItem {
  id: string;
  month: number;
  headline: string;
  body: string;
  topic: NewsTopic;
  importance: 1 | 2 | 3; // 3 = major
  stateId: StateId | null;
  partyId: PartyId | null;
  /** id of the event occurrence / log row / contest that produced this item */
  source: string;
  /** concerns the player's career/constituency/party */
  personal: boolean;
}
export interface Notification { id: string; month: number; text: string; level: "info" | "good" | "warn" | "bad"; read: boolean; link?: string }

// ------------------------------------------------------------------ government
export interface PolicyProject {
  id: string;
  defId: string;
  level: "local" | "state" | "federal";
  scopeId: string; // lga id / state id / "NG"
  label: string;
  startedMonth: number;
  durationMonths: number;
  progress: number; // 0..1
  costTotal: number; // ₦ million
  spent: number;
  funding: "budget" | "borrowing" | "partnership" | "donor";
  delays: number;
  status: "active" | "complete" | "cancelled";
  effects: Partial<Record<Indicator, number>>;
  institution: string;
  maintenancePerMonth: number;
  applied: Partial<Record<Indicator, number>>;
  corruptionLeak: number; // ₦m diverted by deliberate action
  completedMonth?: number;
}
export interface Appointee { id: CharId; post: string; competence: number; loyalty: number }
export interface GovernmentState {
  projects: PolicyProject[];
  appointees: Appointee[];
  /** legislative support 0..100 for the executive */
  legislativeSupport: number;
  approval: number; // 0..100 approval of the player's administration
  lastBudgetMonth: number;
  pendingBill: null | { id: string; label: string; month: number; support: number };
  /** player's allocations when in executive office (replaces AI default) */
  allocations: Record<BudgetLine, number> | null;
  /** ledger of government actions (separate from personal finances) */
  actions: { m: number; text: string }[];
  /** local-government treasury (₦ million) used when the player is an LGA chairman */
  localTreasuryM: number;
  /** borrowing taken on by the player's jurisdiction (₦ million) */
  borrowedM: number;
  /** ticks of lawful patronage vs merit appointments, for faction relations */
  factionSatisfaction: Record<string, number>;
}

// ------------------------------------------------------------------ top-level state
export interface GameMeta {
  id: string;
  name: string;
  seed: number;
  difficulty: Difficulty;
  rulesetId: string;
  scenarioId: string;
  simVersion: number;
  sandbox: { startingCash: number; fixedWorld: boolean; noScandals: boolean } | null;
}
export interface Clock { monthIndex: number; processedThrough: number }
export interface Settings { autoSave: boolean; reducedMotion: boolean; showTooltips: boolean }
export interface HistoryPoint {
  m: number;
  inflation: number; unemployment: number; gdpGrowth: number; satisfaction: number; fx: number; purchasingPower: number;
  wealth: number; popularity: number;
}

export interface GameState {
  meta: GameMeta;
  clock: Clock;
  rngState: number;
  player: Player;
  chars: Record<CharId, Character>;
  seats: Record<SeatId, Seat>;
  states: Record<StateId, StateSim>;
  lgas: Record<LgaId, LgaSim>;
  economy: Economy;
  parties: Record<PartyId, PartyState>;
  /** parties founded during play (static parties live in data/parties.ts) */
  customParties: Record<PartyId, PartyDef>;
  contests: Record<ContestId, Contest>;
  electionLog: ElectionLogEntry[];
  /** last presidential result per LGA/state for map layers */
  lastPresidential: null | { month: number; winnerPartyId: PartyId; byState: Record<StateId, PartyId>; byLga: Record<LgaId, PartyId>; turnout: Record<StateId, number> };
  eventLog: EventOccurrence[];
  activeEffects: ActiveEffect[];
  eventCooldowns: Record<string, number>;
  flags: Record<string, number | string | boolean>;
  pending: PendingDecision[];
  news: NewsItem[];
  notifications: Notification[];
  government: GovernmentState;
  history: HistoryPoint[];
  settings: Settings;
  nextId: number;
  /** processed-key set so a month's one-off work can never run twice (stable ids) */
  processed: Record<string, true>;
  gameOver: null | { month: number; kind: "died" | "retired" | "presidency_ended" | "imprisoned"; text: string };
}

export const ZONE_ORDER: ZoneId[] = ["NW", "NE", "NC", "SW", "SE", "SS"];
