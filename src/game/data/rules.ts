/**
 * Versioned, data-driven ruleset. Every eligibility rule, election rule, fee and limit lives here — the engine
 * reads from this object and never hard-codes office rules, so a new scenario can ship its own ruleset.
 *
 * Legal basis (simplified for gameplay; players should consult the primary texts):
 *   - Constitution of the Federal Republic of Nigeria 1999 (as amended): ss. 65, 66, 106, 107, 131, 134, 137,
 *     177, 179, 182 (qualification, disqualification, election thresholds, term limits).
 *   - Constitution (Fourth Alteration) — "Not Too Young To Run" Act 2018: minimum age 25 for House of
 *     Representatives and State Houses of Assembly.
 *   - Electoral Act 2022: campaign-period length, campaign-spending limits, individual donation limit.
 * Items marked `simulated: true` are design assumptions (e.g. party nomination fees, LGA term lengths, which vary
 * by state law and by party). Spending limits and fees are expressed in naira at game start and are NOT inflated
 * automatically; verify against current law before treating them as authoritative.
 */

export type OfficeId = "councillor" | "lg_chair" | "state_assembly" | "reps" | "senate" | "governor" | "president";
export type EducationLevel = "none" | "primary" | "secondary" | "nd" | "bachelor" | "masters" | "doctorate";
export const EDUCATION_RANK: Record<EducationLevel, number> = {
  none: 0, primary: 1, secondary: 2, nd: 3, bachelor: 4, masters: 5, doctorate: 6,
};
export const EDUCATION_LABEL: Record<EducationLevel, string> = {
  none: "No formal schooling", primary: "Primary school", secondary: "Secondary (SSCE)", nd: "National Diploma / OND",
  bachelor: "Bachelor's degree / HND", masters: "Master's degree", doctorate: "Doctorate",
};

export type OfficeLevel = "ward" | "local" | "state" | "federal";
/** Which election cycle an office follows. */
export type CycleKind = "general-fed" | "general-state" | "state-offcycle" | "local";
export type ElectionMethod = "plurality" | "governorship" | "presidential";

export interface OfficeRule {
  id: OfficeId;
  label: string;
  short: string;
  level: OfficeLevel;
  minAge: number;
  termMonths: number;
  termLimit: number | null;
  minEducation: EducationLevel;
  citizenshipByBirth: boolean;
  cycle: CycleKind;
  method: ElectionMethod;
  /** months the INEC/SIEC election falls after the base election month of its cycle */
  electionOffsetMonths: number;
  nominationFee: number; // party nomination-form fee (simulated)
  campaignLimit: number; // lawful campaign spending limit per candidate
  /** monthly official remuneration, simulated */
  salaryMonthly: number;
  legalBasis: string;
  simulated?: string;
}

export interface Ruleset {
  id: string;
  version: number;
  title: string;
  startYear: number;
  startMonth: number;
  baseGeneralElection: { year: number; month: number; cycleYears: number };
  offices: Record<OfficeId, OfficeRule>;
  timeline: {
    aspirantWindowOpens: number; // months before election
    primaryMonth: number;
    nominationDeadline: number;
    campaignStarts: number;
    inaugurationMonth: Record<OfficeId, number>; // calendar month of inauguration
  };
  eligibility: {
    minPartyMembershipMonths: number;
    dishonestyConvictionBarYears: number;
    defectionCooldownMonths: number;
  };
  finance: {
    individualDonationLimit: number;
    unlawfulSpendingThresholdMultiplier: number;
  };
  presidential: { minUnitShare: number; requiredStates: number; fctRequired: boolean; runoffSecond: "mostStatesWon" };
  governorship: { minUnitShare: number; requiredLgaFraction: number };
  newParty: { minStateOffices: number; registrationFee: number; minFoundingMembers: number; simulated: string };
  notes: string[];
}

const note = (s: string) => s;

export const RULESET_NG_2026: Ruleset = {
  id: "ng-2026-sim",
  version: 1,
  title: "Nigeria — 2026 scenario ruleset (simplified legal framework)",
  startYear: 2026,
  startMonth: 1,
  baseGeneralElection: { year: 2027, month: 2, cycleYears: 4 },
  offices: {
    councillor: {
      id: "councillor", label: "Ward Councillor", short: "Councillor", level: "ward", minAge: 21, termMonths: 36,
      termLimit: null, minEducation: "secondary", citizenshipByBirth: false, cycle: "local", method: "plurality",
      electionOffsetMonths: 0, nominationFee: 50_000, campaignLimit: 5_000_000, salaryMonthly: 150_000,
      legalBasis: "State local government laws; Electoral Act 2022 s.88 (spending limit).",
      simulated: "Minimum age and term length vary by state law; 21 and 3 years are simulation defaults.",
    },
    lg_chair: {
      id: "lg_chair", label: "Local Government Chairman", short: "LG Chairman", level: "local", minAge: 25, termMonths: 36,
      termLimit: 2, minEducation: "secondary", citizenshipByBirth: false, cycle: "local", method: "plurality",
      electionOffsetMonths: 0, nominationFee: 1_000_000, campaignLimit: 30_000_000, salaryMonthly: 1_200_000,
      legalBasis: "State local government laws; Electoral Act 2022 s.88.",
      simulated: "Minimum age, term length and term limit vary by state law; defaults are simulated.",
    },
    state_assembly: {
      id: "state_assembly", label: "State House of Assembly Member", short: "State Assembly", level: "state", minAge: 25, termMonths: 48,
      termLimit: null, minEducation: "secondary", citizenshipByBirth: false, cycle: "general-state", method: "plurality",
      electionOffsetMonths: 1, nominationFee: 3_000_000, campaignLimit: 30_000_000, salaryMonthly: 2_000_000,
      legalBasis: "Constitution ss.106–107; Not Too Young To Run Act 2018 (age 25); Electoral Act 2022 s.88.",
      simulated: "Nomination fee and salary are simulated.",
    },
    reps: {
      id: "reps", label: "Member, House of Representatives", short: "House of Reps", level: "federal", minAge: 25, termMonths: 48,
      termLimit: null, minEducation: "secondary", citizenshipByBirth: false, cycle: "general-fed", method: "plurality",
      electionOffsetMonths: 0, nominationFee: 10_000_000, campaignLimit: 100_000_000, salaryMonthly: 4_000_000,
      legalBasis: "Constitution ss.65–66; Not Too Young To Run Act 2018 (age 25); Electoral Act 2022 s.88.",
      simulated: "Nomination fee and salary are simulated.",
    },
    senate: {
      id: "senate", label: "Senator", short: "Senate", level: "federal", minAge: 35, termMonths: 48,
      termLimit: null, minEducation: "secondary", citizenshipByBirth: false, cycle: "general-fed", method: "plurality",
      electionOffsetMonths: 0, nominationFee: 25_000_000, campaignLimit: 300_000_000, salaryMonthly: 6_000_000,
      legalBasis: "Constitution ss.65–66 (age 35); Electoral Act 2022 s.88.",
      simulated: "Nomination fee and salary are simulated.",
    },
    governor: {
      id: "governor", label: "Governor", short: "Governor", level: "state", minAge: 35, termMonths: 48,
      termLimit: 2, minEducation: "secondary", citizenshipByBirth: true, cycle: "general-state", method: "governorship",
      electionOffsetMonths: 1, nominationFee: 50_000_000, campaignLimit: 1_000_000_000, salaryMonthly: 5_000_000,
      legalBasis: "Constitution ss.177, 179, 182 (age 35, 25% in two-thirds of LGAs, two-term limit); Electoral Act 2022 s.88.",
      simulated: "Nomination fee and salary are simulated.",
    },
    president: {
      id: "president", label: "President of the Federal Republic of Nigeria", short: "President", level: "federal", minAge: 35, termMonths: 48,
      termLimit: 2, minEducation: "secondary", citizenshipByBirth: true, cycle: "general-fed", method: "presidential",
      electionOffsetMonths: 0, nominationFee: 100_000_000, campaignLimit: 5_000_000_000, salaryMonthly: 8_000_000,
      legalBasis: "Constitution ss.131, 134, 137 (age 35, spread requirement, two-term limit); Electoral Act 2022 s.88.",
      simulated: "Nomination fee and salary are simulated.",
    },
  },
  timeline: {
    aspirantWindowOpens: 11,
    primaryMonth: 8,
    nominationDeadline: 7,
    campaignStarts: 5,
    inaugurationMonth: { councillor: 0, lg_chair: 0, state_assembly: 6, reps: 6, senate: 6, governor: 5, president: 5 },
  },
  eligibility: {
    minPartyMembershipMonths: 2,
    dishonestyConvictionBarYears: 10,
    defectionCooldownMonths: 3,
  },
  finance: {
    individualDonationLimit: 50_000_000,
    unlawfulSpendingThresholdMultiplier: 1.0,
  },
  presidential: { minUnitShare: 0.25, requiredStates: 24, fctRequired: false, runoffSecond: "mostStatesWon" },
  governorship: { minUnitShare: 0.25, requiredLgaFraction: 2 / 3 },
  newParty: {
    minStateOffices: 24,
    registrationFee: 500_000_000,
    minFoundingMembers: 400,
    simulated: note("Simplified from INEC registration requirements; thresholds and fee are simulated."),
  },
  notes: [
    "Presidential spread rule is configurable: the legal reading of whether the FCT must be won separately has been litigated.",
    "Runoff winners are decided by simple majority in this simplified ruleset.",
    "Off-cycle governorship states follow their own 4-year cycles (see data/states.ts).",
    "LGA election timing is staggered by state in the simulation; real state electoral commissions set their own dates.",
  ],
};

export const RULESETS: Record<string, Ruleset> = { [RULESET_NG_2026.id]: RULESET_NG_2026 };
export const OFFICE_ORDER: OfficeId[] = ["councillor", "lg_chair", "state_assembly", "reps", "senate", "governor", "president"];
