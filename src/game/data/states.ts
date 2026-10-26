/**
 * State / FCT reference data.
 *
 * SOURCED (stable public facts): state names, capitals, ISO 3166-2:NG codes, geopolitical zones,
 *   number of House of Representatives seats, off-cycle governorship states.
 * APPROXIMATE: `pop2006m` — 2006 census population in millions, ROUNDED to 0.1m. Used only as a relative weight.
 *   Real current figures differ; the game scales it by POP_GROWTH_FACTOR and labels the result "simulated".
 * SIMULATION ASSUMPTIONS: urbanTier, and the qualitative `priors` in world.ts. They are scenario design
 *   choices, not statistics.
 */
export type ZoneId = "NC" | "NE" | "NW" | "SE" | "SS" | "SW";

export const ZONES: Record<ZoneId, string> = {
  NC: "North Central",
  NE: "North East",
  NW: "North West",
  SE: "South East",
  SS: "South South",
  SW: "South West",
};

export interface StateMeta {
  id: string; // ISO 3166-2:NG
  name: string;
  capital: string;
  zone: ZoneId;
  pop2006m: number;
  repsSeats: number;
  /** 1 = mostly rural/small-town, 2 = significant cities, 3 = megacity economy. Simulation assumption. */
  urbanTier: 1 | 2 | 3;
  /** Governorship election held off the general-election cycle: first year in the game & month. Cycle is 4 years. */
  offCycle?: { year: number; month: number };
  isFct?: boolean;
  /** LGA name (dataset spelling) treated as the state capital's LGA for urban weighting; best-effort, optional. */
  capitalLgaHint?: string;
}

const S = (
  id: string, name: string, capital: string, zone: ZoneId, pop2006m: number, repsSeats: number,
  urbanTier: 1 | 2 | 3, extra: Partial<StateMeta> = {},
): StateMeta => ({ id, name, capital, zone, pop2006m, repsSeats, urbanTier, ...extra });

export const STATES: StateMeta[] = [
  S("NG-AB", "Abia", "Umuahia", "SE", 2.8, 8, 2),
  S("NG-AD", "Adamawa", "Yola", "NE", 3.2, 8, 1),
  S("NG-AK", "Akwa Ibom", "Uyo", "SS", 3.9, 10, 2),
  S("NG-AN", "Anambra", "Awka", "SE", 4.2, 11, 2, { offCycle: { year: 2029, month: 11 } }),
  S("NG-BA", "Bauchi", "Bauchi", "NE", 4.7, 12, 1),
  S("NG-BY", "Bayelsa", "Yenagoa", "SS", 1.7, 5, 1, { offCycle: { year: 2027, month: 11 } }),
  S("NG-BE", "Benue", "Makurdi", "NC", 4.2, 11, 1),
  S("NG-BO", "Borno", "Maiduguri", "NE", 4.2, 10, 1),
  S("NG-CR", "Cross River", "Calabar", "SS", 2.9, 8, 1),
  S("NG-DE", "Delta", "Asaba", "SS", 4.1, 10, 2),
  S("NG-EB", "Ebonyi", "Abakaliki", "SE", 2.2, 6, 1),
  S("NG-ED", "Edo", "Benin City", "SS", 3.2, 9, 2, { offCycle: { year: 2028, month: 9 } }),
  S("NG-EK", "Ekiti", "Ado-Ekiti", "SW", 2.4, 6, 1, { offCycle: { year: 2026, month: 6 } }),
  S("NG-EN", "Enugu", "Enugu", "SE", 3.3, 8, 2),
  S("NG-GO", "Gombe", "Gombe", "NE", 2.4, 6, 1),
  S("NG-IM", "Imo", "Owerri", "SE", 3.9, 10, 2, { offCycle: { year: 2027, month: 11 } }),
  S("NG-JI", "Jigawa", "Dutse", "NW", 4.4, 11, 1),
  S("NG-KD", "Kaduna", "Kaduna", "NW", 6.1, 16, 2),
  S("NG-KN", "Kano", "Kano", "NW", 9.4, 24, 2),
  S("NG-KT", "Katsina", "Katsina", "NW", 5.8, 15, 1),
  S("NG-KE", "Kebbi", "Birnin Kebbi", "NW", 3.3, 8, 1),
  S("NG-KO", "Kogi", "Lokoja", "NC", 3.3, 9, 1, { offCycle: { year: 2027, month: 11 } }),
  S("NG-KW", "Kwara", "Ilorin", "NC", 2.4, 6, 2),
  S("NG-LA", "Lagos", "Ikeja", "SW", 9.1, 24, 3),
  S("NG-NA", "Nasarawa", "Lafia", "NC", 1.9, 5, 1),
  S("NG-NI", "Niger", "Minna", "NC", 4.0, 10, 1),
  S("NG-OG", "Ogun", "Abeokuta", "SW", 3.7, 9, 2),
  S("NG-ON", "Ondo", "Akure", "SW", 3.4, 9, 1, { offCycle: { year: 2028, month: 11 } }),
  S("NG-OS", "Osun", "Osogbo", "SW", 3.4, 9, 1, { offCycle: { year: 2026, month: 8 } }),
  S("NG-OY", "Oyo", "Ibadan", "SW", 5.6, 14, 2),
  S("NG-PL", "Plateau", "Jos", "NC", 3.2, 8, 1),
  S("NG-RI", "Rivers", "Port Harcourt", "SS", 5.2, 13, 3),
  S("NG-SO", "Sokoto", "Sokoto", "NW", 3.7, 11, 1),
  S("NG-TA", "Taraba", "Jalingo", "NE", 2.3, 6, 1),
  S("NG-YO", "Yobe", "Damaturu", "NE", 2.3, 6, 1),
  S("NG-ZA", "Zamfara", "Gusau", "NW", 3.3, 7, 1),
  S("NG-FC", "Federal Capital Territory", "Abuja", "NC", 1.4, 2, 3, { isFct: true }),
];

export const STATE_BY_ID: Record<string, StateMeta> = Object.fromEntries(STATES.map((s) => [s.id, s]));

/** Senate seats per state: 3, FCT: 1 (109 total). House of Representatives: 360. */
export const senateSeatsFor = (s: StateMeta) => (s.isFct ? 1 : 3);

/** State House of Assembly seats. Constitution s.91: not fewer than 24, not more than 40. The game derives
 * seats as clamp(3 × reps seats, 24, 40), which closely tracks (but may not exactly equal) the real counts. FCT has no Assembly. */
export const assemblySeatsFor = (s: StateMeta) => (s.isFct ? 0 : Math.min(40, Math.max(24, s.repsSeats * 3)));

/** Simulated growth factor applied to 2006 census figures to get an in-game "current" population. */
export const POP_GROWTH_FACTOR = 1.6;
/** Share of population registered to vote in the simulation (assumption). */
export const REGISTERED_SHARE = 0.42;
