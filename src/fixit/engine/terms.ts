/** Term limits, in a leaf module so both elections and the end-of-term logic can read them. */
import { HARD_CAP_TERMS, type FixState } from "./types";
/** how many terms this president may serve: legacy mode has no limit, a quick game has one */
export const termCap = (s: FixState): number => (s.cap?.legacy ? 99 : s.cap?.quick ? 1 : Math.min(s.rule?.maxTerms ?? 2, HARD_CAP_TERMS));
