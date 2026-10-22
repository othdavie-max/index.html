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
}

export type HouseKind = "bungalow" | "duplex" | "flats";
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
}

export interface Kid {
  name: string;
  age: number;
  gender: Gender;
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
  family: { state: string; happy: number; parentsAlive: boolean };
  spouse: { name: string; happy: number } | null;
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
