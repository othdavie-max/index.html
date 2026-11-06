/**
 * Candidate eligibility. Every rule comes from the data-driven ruleset (data/rules.ts); nothing is hard-coded here.
 * The checker returns each condition separately so the UI can explain exactly what is missing.
 */
import type { GameState, Character, Seat } from "./types";
import { EDUCATION_RANK, EDUCATION_LABEL, type OfficeId } from "../data/rules";
import { ruleOf } from "./world";
import { ageAt } from "./calendar";
import { dateOf } from "./calendar";

export interface Check { id: string; ok: boolean; text: string }
export interface Eligibility { eligible: boolean; checks: Check[] }

export function checkPlayerEligibility(state: GameState, office: OfficeId, electionMonth: number): Eligibility {
  const rule = ruleOf(state);
  const o = rule.offices[office];
  const p = state.player;
  const checks: Check[] = [];
  const age = ageAt(p.birthMonth, electionMonth);
  checks.push({ id: "age", ok: age >= o.minAge, text: `Minimum age ${o.minAge} on election day (you will be ${age})` });
  checks.push({ id: "education", ok: EDUCATION_RANK[p.education.level] >= EDUCATION_RANK[o.minEducation], text: `Education: at least ${EDUCATION_LABEL[o.minEducation]} (you have ${EDUCATION_LABEL[p.education.level]})` });
  checks.push({ id: "citizen", ok: !o.citizenshipByBirth || p.flags["citizenByBirth"] !== false, text: o.citizenshipByBirth ? "Citizen of Nigeria by birth" : "Citizen of Nigeria" });
  const m = p.politics.membership;
  const memberMonths = m ? state.clock.monthIndex - m.since : 0;
  checks.push({ id: "party", ok: !!m && memberMonths >= rule.eligibility.minPartyMembershipMonths, text: `Sponsored by a political party (member for ≥ ${rule.eligibility.minPartyMembershipMonths} months)` });
  const barYears = rule.eligibility.dishonestyConvictionBarYears;
  const recentConviction = p.integrity.convictions.some((c) => c.dishonesty && electionMonth - c.m < barYears * 12);
  checks.push({ id: "conviction", ok: !recentConviction, text: `No conviction for dishonesty or fraud in the last ${barYears} years` });
  const jailedUntil = p.flags["jailedUntil"];
  checks.push({ id: "custody", ok: !(typeof jailedUntil === "number" && jailedUntil > state.clock.monthIndex), text: "Not currently in custody" });
  const served = p.politics.termsServed[office] ?? 0;
  checks.push({ id: "terms", ok: o.termLimit === null || served < o.termLimit, text: o.termLimit === null ? "No term limit for this office" : `Term limit: ${o.termLimit} terms (you have served ${served})` });
  checks.push({ id: "appointee", ok: !p.politics.appointment, text: "Political appointees must resign before contesting" });
  const other = p.politics.candidacies.find((c) => c.stage === "aspirant" || c.stage === "nominee");
  checks.push({ id: "single", ok: !other, text: "Only one candidacy at a time" });
  return { eligible: checks.every((c) => c.ok), checks };
}

/** Eligibility for AI characters (used when forming primaries). */
export function aiEligible(state: GameState, c: Character, office: OfficeId, electionMonth: number, seat?: Seat): boolean {
  const rule = ruleOf(state);
  const o = rule.offices[office];
  if (c.status !== "active") return false;
  const d = dateOf(electionMonth, rule.startYear, rule.startMonth);
  if (d.year - c.birthYear < o.minAge) return false;
  if (d.year - c.birthYear > 80) return false;
  if (c.convictedYear !== undefined && d.year - c.convictedYear < rule.eligibility.dishonestyConvictionBarYears) return false;
  if (o.termLimit !== null && c.seatId && seat && seat.id === c.seatId && seat.termsServed >= o.termLimit) return false;
  return true;
}
