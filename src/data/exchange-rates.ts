// Naira per 1 unit of foreign currency, set a little above the CBN official
// rate because families usually buy nearer the market rate. These move
// fast: review regularly (admin-editable via the `exchange_rates` table).
export const RATES_UPDATED = "September 2026";

export const exchangeRates: Record<string, number> = {
  USD: 1390,
  GBP: 1870,
  EUR: 1580,
  CAD: 1010,
  AUD: 915,
  NZD: 820,
  CHF: 1690,
  SEK: 144,
  DKK: 212,
  NOK: 136,
  AED: 378,
  MYR: 331,
  CNY: 196,
  JPY: 9.4,
  KRW: 1,
  SGD: 1080,
  ZAR: 79,
};

export function toNaira(amount: number, currency: string, rateAdjustment = 1) {
  const rate = (exchangeRates[currency] ?? exchangeRates.USD) * rateAdjustment;
  return Math.round(amount * rate);
}
