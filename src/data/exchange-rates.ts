// PLACEHOLDER exchange rates (NGN per 1 unit of foreign currency). Verify
// and update regularly — these move fast and this file is not live data.
// In production this is admin-editable via the `exchange_rates` Supabase table.
export const exchangeRates: Record<string, number> = {
  GBP: 2000,
  EUR: 1700,
  CAD: 1100,
  USD: 1550,
  AUD: 1000,
};

export function toNaira(amount: number, currency: string) {
  const rate = exchangeRates[currency] ?? 1;
  return Math.round(amount * rate);
}
