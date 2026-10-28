/** Declarative schema for the offline event library. Content lives in events.ts; evaluation lives in engine/events.ts. */
import type { AttrKey, Indicator, EconKey } from "../engine/types";

export type Cmp = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type Cond =
  | { k: "num"; path: string; op: Cmp; value: number }
  | { k: "all"; of: Cond[] }
  | { k: "any"; of: Cond[] }
  | { k: "not"; of: Cond }
  | { k: "month"; in: number[] };

export const num = (path: string, op: Cmp, value: number): Cond => ({ k: "num", path, op, value });
export const all = (...of: Cond[]): Cond => ({ k: "all", of });
export const any = (...of: Cond[]): Cond => ({ k: "any", of });
export const not = (of: Cond): Cond => ({ k: "not", of });
export const inMonths = (...m: number[]): Cond => ({ k: "month", in: m });

export type Effect =
  | { t: "econ"; key: EconKey; amount: number; months: number; mode: "pct" | "abs" }
  | { t: "ind"; stat: Indicator; delta: number; over?: number; target?: "scope" | "all" }
  | { t: "sat"; delta: number; over?: number; target?: "scope" | "all" }
  | { t: "player"; stat: AttrKey | "fame" | "capital" | "trust"; delta: number }
  | { t: "cash"; amount: number; label: string }
  | { t: "govcost"; amountM: number; label: string }
  | { t: "flag"; name: string; months: number }
  | { t: "incidents"; delta: number }
  | { t: "momentum"; who: "ruling" | "opposition"; delta: number }
  | { t: "edu_delay"; months: number }
  | { t: "layoff" }
  | { t: "relation"; who: "party_leader" | "local_chair" | "governor"; delta: number }
  | { t: "approval"; delta: number }
  | { t: "support"; delta: number };

export interface Choice {
  id: string;
  label: string;
  desc: string;
  cost?: { cash?: number; capital?: number; campaignFund?: number };
  effects?: Effect[];
  requires?: Cond;
  /** opens a corruption scheme, with traceable consequences */
  scheme?: { kind: string; gain: number; category: "criminal" | "campaign_finance" | "conflict_of_interest"; evidence: number; witnesses: number };
  check?: { attr: AttrKey; difficulty: number; success: Effect[]; fail: Effect[]; successText: string; failText: string };
  resultText?: string;
}

export interface AiRule {
  by: "governor" | "president" | "lg_chair";
  if?: Cond;
  /** probability the official responds (scaled by their competence at runtime) */
  p: number;
  effects: Effect[];
  text: string; // news text with {name}
}

export type EventCategory = "economy" | "power" | "labour" | "disaster" | "security" | "politics" | "court" | "health" | "education" | "party" | "personal" | "international" | "business" | "infrastructure";
export type EventScope = "national" | "state" | "lga" | "personal";

export interface EventDef {
  id: string;
  category: EventCategory;
  scope: EventScope;
  title: string;
  text: string;
  headline: string;
  topic: "national" | "state" | "local" | "economy" | "services" | "security" | "party" | "personal" | "corruption";
  severity: 1 | 2 | 3 | 4 | 5;
  provenance: { kind: "historical-inspired" | "fictional" | "recurring-reality"; note: string };
  when?: Cond;
  weight: number; // base monthly probability per scope instance
  weightMods?: { cond: Cond; mult: number }[];
  cooldown: number;
  duration: number;
  immediate: Effect[];
  longTerm?: Effect[];
  responsible?: "governor" | "president" | "lg_chair";
  choices?: Choice[];
  defaultChoice?: string;
  aiResponse?: AiRule[];
  /** personal events only fire for players in these situations */
  personalFor?: Cond;
}
