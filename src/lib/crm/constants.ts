export const STAGES = [
  "New", "Contacted", "Qualified", "Meeting Booked", "Meeting Held",
  "Proposal Sent", "Negotiation", "Won", "Lost", "Nurture",
] as const;
export type Stage = (typeof STAGES)[number];

/** Stages that may be saved without a next follow-up date. */
export const NO_FOLLOW_UP_STAGES: readonly Stage[] = ["Lost", "Nurture", "Won"];

export const INTERACTION_TYPES = ["call", "whatsapp", "instagram dm", "email", "meeting", "note"] as const;
export const PAYMENT_PREFERENCES = ["cash", "payment plan", "mortgage"] as const;
export const PURCHASE_PURPOSES = ["investment", "golden visa", "residence", "capital preservation"] as const;
export const LIST_ORIGINS = ["purchased", "partner", "own"] as const;

/** Call outcomes the telemarketer cockpit will build on (step 6). */
export const CALL_OUTCOMES = [
  "no answer", "wrong number", "not interested", "interested + WhatsApp consent",
  "callback requested", "meeting booked",
] as const;

export const DEFAULT_COUNTRY = "NG";
export const STALE_LEAD_DAYS = 3;

/** Countries the team dials from/into; used to resolve local phone formats. */
export const PHONE_COUNTRIES = [
  { code: "NG", label: "Nigeria (+234)" },
  { code: "GH", label: "Ghana (+233)" },
  { code: "KE", label: "Kenya (+254)" },
  { code: "ZA", label: "South Africa (+27)" },
  { code: "AE", label: "UAE (+971)" },
  { code: "GB", label: "United Kingdom (+44)" },
  { code: "US", label: "USA / Canada (+1)" },
] as const;
