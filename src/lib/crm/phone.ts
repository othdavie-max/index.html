import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Normalise any phone input to E.164 (+2348031234567). Local formats such as
 * 0803 123 4567 are resolved with `defaultCountry`. Returns null when the number
 * is not a plausible phone number — never guesses.
 */
export function normalizePhone(raw: string | null | undefined, defaultCountry: CountryCode = "NG"): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2); // 00234… → +234…
  const parsed = parsePhoneNumberFromString(s, s.startsWith("+") ? undefined : defaultCountry);
  return parsed && parsed.isValid() ? parsed.number : null;
}
