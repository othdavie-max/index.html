import { costData, cityTierMultiplier, accommodationMultiplier } from "@/data/cost-data";
import { toNaira } from "@/data/exchange-rates";
import type { CountryCode } from "@/types";

export interface CostCalculatorInput {
  country: CountryCode;
  courseType: "standard" | "premium";
  cityTier: keyof typeof cityTierMultiplier;
  durationYears: number;
  accommodationType: keyof typeof accommodationMultiplier;
  includeVisaFee: boolean;
  includeHealthCover: boolean;
  includeEnglishTest: boolean;
  includeFlight: boolean;
  includeSettlingIn: boolean;
}

export interface CostLineItem {
  label: string;
  perYearLocal: number;
  totalLocal: number;
  totalNgn: number;
}

export interface CostBreakdown {
  currency: string;
  lineItems: CostLineItem[];
  totalPerYearNgn: number;
  totalProgrammeNgn: number;
}

export function calculateCost(input: CostCalculatorInput): CostBreakdown {
  const base = costData[input.country];
  const cityMult = cityTierMultiplier[input.cityTier];
  const accomMult = accommodationMultiplier[input.accommodationType];
  const years = Math.max(1, input.durationYears);

  const tuitionPerYear = input.courseType === "premium" ? base.tuitionPremiumPerYear : base.tuitionStandardPerYear;
  const accommodationPerYear = base.accommodationPerYear * cityMult * accomMult;
  const foodPerYear = base.foodPerYear * cityMult;
  const transportPerYear = base.transportPerYear * cityMult;

  const lineItems: CostLineItem[] = [
    { label: "Tuition", perYearLocal: tuitionPerYear, totalLocal: tuitionPerYear * years, totalNgn: toNaira(tuitionPerYear * years, base.currency) },
    {
      label: "Accommodation",
      perYearLocal: accommodationPerYear,
      totalLocal: accommodationPerYear * years,
      totalNgn: toNaira(accommodationPerYear * years, base.currency),
    },
    { label: "Food", perYearLocal: foodPerYear, totalLocal: foodPerYear * years, totalNgn: toNaira(foodPerYear * years, base.currency) },
    {
      label: "Local Transport",
      perYearLocal: transportPerYear,
      totalLocal: transportPerYear * years,
      totalNgn: toNaira(transportPerYear * years, base.currency),
    },
  ];

  if (input.includeHealthCover) {
    lineItems.push({
      label: "Health Cover",
      perYearLocal: base.healthCoverPerYear,
      totalLocal: base.healthCoverPerYear * years,
      totalNgn: toNaira(base.healthCoverPerYear * years, base.currency),
    });
  }
  if (input.includeVisaFee) {
    lineItems.push({ label: "Visa Fee", perYearLocal: 0, totalLocal: base.visaFeeOneTime, totalNgn: toNaira(base.visaFeeOneTime, base.currency) });
  }
  if (input.includeEnglishTest) {
    lineItems.push({
      label: "English Test Fee",
      perYearLocal: 0,
      totalLocal: base.englishTestFeeOneTime,
      totalNgn: toNaira(base.englishTestFeeOneTime, base.currency),
    });
  }
  if (input.includeFlight) {
    lineItems.push({ label: "Flight (round trip)", perYearLocal: 0, totalLocal: 0, totalNgn: base.flightNgnOneTime });
  }
  if (input.includeSettlingIn) {
    lineItems.push({ label: "Settling-In Money", perYearLocal: 0, totalLocal: 0, totalNgn: base.settlingInNgnOneTime });
  }

  const totalProgrammeNgn = lineItems.reduce((sum, item) => sum + item.totalNgn, 0);
  const recurringNgnPerYear = lineItems
    .filter((i) => i.perYearLocal > 0)
    .reduce((sum, item) => sum + toNaira(item.perYearLocal, base.currency), 0);

  return { currency: base.currency, lineItems, totalPerYearNgn: recurringNgnPerYear, totalProgrammeNgn };
}
