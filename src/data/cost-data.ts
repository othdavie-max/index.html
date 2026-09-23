import type { CountryCode } from "@/types";

// PLACEHOLDER estimates in each country's local currency, per year unless
// noted. Verify against current university/government sources before
// launch — see README checklist. In production this mirrors the
// admin-editable `cost_items` + `exchange_rates` Supabase tables.
export interface CostBase {
  currency: string;
  tuitionStandardPerYear: number;
  tuitionPremiumPerYear: number; // medicine, MBA, and similar premium programmes
  accommodationPerYear: number;
  foodPerYear: number;
  transportPerYear: number;
  healthCoverPerYear: number;
  visaFeeOneTime: number;
  englishTestFeeOneTime: number;
  flightNgnOneTime: number; // priced in naira, booked from Nigeria
  settlingInNgnOneTime: number;
}

export const costData: Record<CountryCode, CostBase> = {
  uk: {
    currency: "GBP",
    tuitionStandardPerYear: 14000,
    tuitionPremiumPerYear: 26000,
    accommodationPerYear: 9000,
    foodPerYear: 3000,
    transportPerYear: 1000,
    healthCoverPerYear: 776,
    visaFeeOneTime: 490,
    englishTestFeeOneTime: 180,
    flightNgnOneTime: 1100000,
    settlingInNgnOneTime: 500000,
  },
  ireland: {
    currency: "EUR",
    tuitionStandardPerYear: 12000,
    tuitionPremiumPerYear: 20000,
    accommodationPerYear: 8000,
    foodPerYear: 3000,
    transportPerYear: 1000,
    healthCoverPerYear: 800,
    visaFeeOneTime: 60,
    englishTestFeeOneTime: 180,
    flightNgnOneTime: 1150000,
    settlingInNgnOneTime: 500000,
  },
  germany: {
    currency: "EUR",
    tuitionStandardPerYear: 1500,
    tuitionPremiumPerYear: 9000,
    accommodationPerYear: 6000,
    foodPerYear: 2800,
    transportPerYear: 800,
    healthCoverPerYear: 1200,
    visaFeeOneTime: 75,
    englishTestFeeOneTime: 180,
    flightNgnOneTime: 1050000,
    settlingInNgnOneTime: 500000,
  },
  canada: {
    currency: "CAD",
    tuitionStandardPerYear: 18000,
    tuitionPremiumPerYear: 32000,
    accommodationPerYear: 10000,
    foodPerYear: 4000,
    transportPerYear: 1200,
    healthCoverPerYear: 800,
    visaFeeOneTime: 150,
    englishTestFeeOneTime: 300,
    flightNgnOneTime: 1300000,
    settlingInNgnOneTime: 550000,
  },
  usa: {
    currency: "USD",
    tuitionStandardPerYear: 22000,
    tuitionPremiumPerYear: 48000,
    accommodationPerYear: 12000,
    foodPerYear: 5000,
    transportPerYear: 1200,
    healthCoverPerYear: 2000,
    visaFeeOneTime: 350,
    englishTestFeeOneTime: 250,
    flightNgnOneTime: 1400000,
    settlingInNgnOneTime: 600000,
  },
  australia: {
    currency: "AUD",
    tuitionStandardPerYear: 24000,
    tuitionPremiumPerYear: 42000,
    accommodationPerYear: 12000,
    foodPerYear: 4500,
    transportPerYear: 1500,
    healthCoverPerYear: 700,
    visaFeeOneTime: 710,
    englishTestFeeOneTime: 340,
    flightNgnOneTime: 1250000,
    settlingInNgnOneTime: 550000,
  },
};

export const cityTierMultiplier = { standard: 1, "major-city": 1.28 } as const;
export const accommodationMultiplier = { "university-halls": 0.85, "private-shared": 1, "private-solo": 1.35 } as const;
