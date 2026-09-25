import { toNaira } from "@/data/exchange-rates";
import type { StudyCountry } from "@/data/study-countries";

export type CostLevel = "foundation" | "undergraduate" | "masters" | "mba" | "medicine" | "phd";
export type UniversityTier = "budget" | "mid" | "top";
export type Accommodation = "halls" | "shared" | "solo" | "family";
export type Lifestyle = "frugal" | "moderate" | "comfortable";

export const LEVEL_LABELS: Record<CostLevel, string> = {
  foundation: "Foundation year",
  undergraduate: "Bachelor's degree",
  masters: "Master's degree",
  mba: "MBA",
  medicine: "Medicine / Dentistry",
  phd: "PhD",
};

/** Typical IELTS fee in Nigeria, in naira. */
export const ENGLISH_TEST_NGN = 390000;
/** Typical yearly rise in fees and living costs used for years 2+. */
export const ANNUAL_INCREASE = 0.03;

const ACCOMMODATION_FACTOR: Record<Accommodation, number> = { halls: 0.9, shared: 1, solo: 1.35, family: 0.25 };
const LIFESTYLE_FACTOR: Record<Lifestyle, number> = { frugal: 0.85, moderate: 1, comfortable: 1.3 };

export interface CostInput {
  country: StudyCountry;
  level: CostLevel;
  tier: UniversityTier;
  years: number;
  bigCity: boolean;
  accommodation: Accommodation;
  lifestyle: Lifestyle;
  scholarshipPct: number;
  applications: number;
  includeEnglishTest: boolean;
  includeFlight: boolean;
  includeSettlingIn: boolean;
  /** 1 = today's rate; 1.2 = naira 20% weaker. */
  rateAdjustment?: number;
}

export interface CostLine {
  id: string;
  label: string;
  note?: string;
  /** Year-one amount in local currency (0 for items priced in naira). */
  firstYearLocal: number;
  local: number;
  ngn: number;
}

export interface CostBreakdown {
  currency: string;
  yearly: CostLine[];
  oneOff: CostLine[];
  years: { year: number; local: number; ngn: number }[];
  firstYearNgn: number;
  totalNgn: number;
  totalLocal: number;
  averageYearNgn: number;
  monthlyLivingLocal: number;
  monthlyLivingNgn: number;
  /** Money typically needed before the visa is issued. */
  beforeVisaNgn: number;
  beforeVisaLines: { label: string; ngn: number }[];
}

export function defaultYears(country: StudyCountry, level: CostLevel) {
  switch (level) {
    case "foundation":
      return 1;
    case "undergraduate":
      return country.years.undergraduate;
    case "masters":
    case "mba":
      return country.years.masters;
    case "medicine":
      return country.years.medicine;
    case "phd":
      return country.years.phd;
  }
}

export function tuitionRange(country: StudyCountry, level: CostLevel): [number, number] {
  const t = country.tuition;
  switch (level) {
    case "foundation":
      return [Math.round(t.undergraduate[0] * 0.75), Math.round(t.undergraduate[1] * 0.75)];
    case "undergraduate":
      return t.undergraduate;
    case "masters":
      return t.masters;
    case "mba":
    case "medicine":
      return t.premium;
    case "phd":
      return t.phd;
  }
}

function pickFromRange([min, max]: [number, number], tier: UniversityTier, typical?: number) {
  if (tier === "budget") return min;
  if (tier === "top") return max;
  return typical ?? Math.round((min + max) / 2);
}

export function typicalTuition(country: StudyCountry, level: CostLevel) {
  if (level === "undergraduate" || level === "masters") return country.typicalTuition?.[level];
  if (level === "foundation" && country.typicalTuition?.undergraduate) return Math.round(country.typicalTuition.undergraduate * 0.75);
  return undefined;
}

/** Yearly living costs in local currency, before yearly increases. */
export function livingPerYear(country: StudyCountry, opts: Pick<CostInput, "bigCity" | "accommodation" | "lifestyle">) {
  const city = opts.bigCity ? country.bigCityFactor : 1;
  // Rent tracks the city fully; everyday costs only partly.
  const everyday = 1 + (city - 1) * 0.5;
  const style = LIFESTYLE_FACTOR[opts.lifestyle];
  return {
    rent: Math.round(country.living.rent * city * ACCOMMODATION_FACTOR[opts.accommodation]),
    food: Math.round(country.living.food * everyday * style),
    transport: Math.round(country.living.transport * everyday),
    personal: Math.round(country.living.personal * everyday * style),
  };
}

export function calculateStudyCost(input: CostInput): CostBreakdown {
  const { country } = input;
  const adj = input.rateAdjustment ?? 1;
  const cur = country.currency;
  const years = Math.max(1, Math.round(input.years));
  const ngn = (amount: number) => toNaira(amount, cur, adj);

  const tuitionFull = pickFromRange(tuitionRange(country, input.level), input.tier, typicalTuition(country, input.level));
  const tuition = Math.round(tuitionFull * (1 - input.scholarshipPct / 100));
  const living = livingPerYear(country, input);
  const health = country.healthPerYear;

  const yearlyBase = [
    {
      id: "tuition",
      label: "Tuition",
      note: input.scholarshipPct > 0 ? `After a ${input.scholarshipPct}% scholarship` : undefined,
      amount: tuition,
    },
    { id: "rent", label: "Accommodation", amount: living.rent },
    { id: "food", label: "Food & groceries", amount: living.food },
    { id: "transport", label: "Local transport", amount: living.transport },
    { id: "personal", label: "Phone, books & personal", amount: living.personal },
    { id: "health", label: "Health cover", note: country.healthUpfront ? "Paid upfront with the visa" : undefined, amount: health },
  ].filter((l) => l.amount > 0);

  // Years 2+ rise by ANNUAL_INCREASE; the "yearly" lines show year-one figures.
  const growth = (y: number) => Math.pow(1 + ANNUAL_INCREASE, y - 1);
  const yearOneLocal = yearlyBase.reduce((s, l) => s + l.amount, 0);

  const yearly: CostLine[] = yearlyBase.map((l) => {
    const totalLocal = Array.from({ length: years }, (_, i) => l.amount * growth(i + 1)).reduce((a, b) => a + b, 0);
    return { id: l.id, label: l.label, note: l.note, firstYearLocal: l.amount, local: Math.round(totalLocal), ngn: ngn(totalLocal) };
  });

  const oneOff: CostLine[] = [
    { id: "visa", label: `Visa fees (${country.visa.name})`, firstYearLocal: country.visa.fee, local: country.visa.fee, ngn: ngn(country.visa.fee) },
  ];
  if (input.applications > 0 && country.applicationFee > 0) {
    const local = country.applicationFee * input.applications;
    oneOff.push({
      id: "applications",
      label: `Application fees (${input.applications} ${input.applications === 1 ? "university" : "universities"})`,
      firstYearLocal: local,
      local,
      ngn: ngn(local),
    });
  }
  if (input.includeEnglishTest) {
    oneOff.push({ id: "english", label: "English test (IELTS in Nigeria)", firstYearLocal: 0, local: 0, ngn: Math.round(ENGLISH_TEST_NGN * adj) });
  }
  if (input.includeFlight) {
    oneOff.push({ id: "flight", label: "Flight from Nigeria (one-way)", firstYearLocal: 0, local: 0, ngn: Math.round(country.flightNgn * adj) });
  }
  if (input.includeSettlingIn) {
    oneOff.push({
      id: "settling",
      label: "Settling-in money",
      note: "Rent deposit, bedding, winter clothing, first weeks' shopping",
      firstYearLocal: 0,
      local: 0,
      ngn: Math.round(country.settlingInNgn * adj),
    });
  }

  const oneOffNgn = oneOff.reduce((s, l) => s + l.ngn, 0);
  const oneOffLocal = oneOff.reduce((s, l) => s + l.local, 0);

  const yearRows = Array.from({ length: years }, (_, i) => {
    const local = yearOneLocal * growth(i + 1);
    return { year: i + 1, local: Math.round(local), ngn: ngn(local) };
  });
  // One-off costs land in year one.
  yearRows[0] = { ...yearRows[0], ngn: yearRows[0].ngn + oneOffNgn, local: yearRows[0].local + oneOffLocal };

  const totalNgn = yearRows.reduce((s, r) => s + r.ngn, 0);
  const totalLocal = yearly.reduce((s, l) => s + l.local, 0) + oneOffLocal;
  const monthlyLivingLocal = Math.round((living.rent + living.food + living.transport + living.personal) / 12);

  const livingYearOne = living.rent + living.food + living.transport + living.personal;
  const beforeVisaLines = [
    { label: "First-year tuition (or the deposit your university asks for)", ngn: ngn(tuition) },
    {
      label: country.healthUpfront ? `Health cover for the whole course (${years} yr)` : "Health cover (first year)",
      ngn: ngn(country.healthUpfront ? health * years : health),
    },
    { label: "Visa fees", ngn: ngn(country.visa.fee) },
    { label: "Living-cost funds you must show (not spent, but must be available)", ngn: ngn(livingYearOne) },
  ].filter((l) => l.ngn > 0);

  return {
    currency: cur,
    yearly,
    oneOff,
    years: yearRows,
    firstYearNgn: yearRows[0].ngn,
    totalNgn,
    totalLocal: Math.round(totalLocal),
    averageYearNgn: Math.round(totalNgn / years),
    monthlyLivingLocal,
    monthlyLivingNgn: ngn(monthlyLivingLocal),
    beforeVisaNgn: beforeVisaLines.reduce((s, l) => s + l.ngn, 0),
    beforeVisaLines,
  };
}

/** Typical yearly cost in naira (mid-range university, standard city, shared housing). */
export function typicalAnnualCostNgn(country: StudyCountry, level: CostLevel, tier: UniversityTier = "mid") {
  const tuition = pickFromRange(tuitionRange(country, level), tier, typicalTuition(country, level));
  const living = livingPerYear(country, { bigCity: false, accommodation: "shared", lifestyle: tier === "budget" ? "frugal" : "moderate" });
  const local = tuition + living.rent + living.food + living.transport + living.personal + country.healthPerYear;
  return toNaira(local, country.currency);
}
