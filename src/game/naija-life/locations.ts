import type { HouseKind } from "./types";
import { T } from "./util";

export interface Location {
  id: string;
  state: string;
  name: string;
  /** 1 = cheap and rough, 5 = the most expensive addresses in the country. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Price range for each kind of property, in today's naira. */
  kinds: Partial<Record<HouseKind, [number, number]>>;
  /** Annual rent as a share of value. */
  yield: number;
  /** Price growth each year above inflation. */
  growth: number;
  /** How wildly the price swings from year to year. */
  vol: number;
  /** Yearly chance of a shock (insecurity, flooding, a bad deal) that knocks value down. */
  risk: number;
  blurb: () => string;
}

const L = (l: Omit<Location, "blurb"> & { en: string; pcm: string }): Location => ({ ...l, blurb: () => T(l.en, l.pcm) });
const M = 1_000_000;
const B = 1_000_000_000;

export const LOCATIONS: Location[] = [
  // Abuja
  L({ id: "maitama", state: "abuja", name: "Maitama, Abuja", tier: 5, kinds: { apartment: [180 * M, 450 * M], duplex: [450 * M, 1.6 * B], mansion: [1.2 * B, 4 * B], land: [350 * M, 900 * M] }, yield: 0.055, growth: 0.04, vol: 0.05, risk: 0.01, en: "Embassies, ministers and old money. Prices rarely fall.", pcm: "Embassies, ministers and old money dey here. Price rarely fall." }),
  L({ id: "asokoro", state: "abuja", name: "Asokoro, Abuja", tier: 5, kinds: { apartment: [150 * M, 380 * M], duplex: [380 * M, 1.3 * B], mansion: [1 * B, 3.5 * B], land: [300 * M, 800 * M] }, yield: 0.055, growth: 0.035, vol: 0.05, risk: 0.01, en: "Quiet, guarded and close to Aso Rock.", pcm: "Quiet, dem dey guard am, and e near Aso Rock." }),
  L({ id: "wuse2", state: "abuja", name: "Wuse 2, Abuja", tier: 4, kinds: { apartment: [90 * M, 250 * M], duplex: [220 * M, 600 * M], plaza: [800 * M, 2.5 * B], land: [150 * M, 400 * M] }, yield: 0.07, growth: 0.03, vol: 0.06, risk: 0.015, en: "Offices, hotels and restaurants. Great for rent.", pcm: "Offices, hotels and restaurants. E good for rent." }),
  L({ id: "gwarinpa", state: "abuja", name: "Gwarinpa, Abuja", tier: 3, kinds: { apartment: [40 * M, 90 * M], bungalow: [45 * M, 110 * M], duplex: [90 * M, 250 * M], land: [40 * M, 120 * M] }, yield: 0.07, growth: 0.03, vol: 0.06, risk: 0.02, en: "Big estate city of civil servants and young families.", pcm: "Big estate city for civil servants and young families." }),
  L({ id: "lugbe", state: "abuja", name: "Lugbe, Abuja", tier: 2, kinds: { shack: [1.2 * M, 4 * M], apartment: [15 * M, 35 * M], bungalow: [18 * M, 45 * M], land: [8 * M, 25 * M] }, yield: 0.08, growth: 0.035, vol: 0.09, risk: 0.03, en: "Affordable and growing along the airport road.", pcm: "E cheap and e dey grow for airport road." }),
  // Lagos
  L({ id: "banana-island", state: "lagos", name: "Banana Island, Lagos", tier: 5, kinds: { apartment: [700 * M, 1.8 * B], duplex: [1.5 * B, 4 * B], mansion: [3 * B, 15 * B], land: [1.5 * B, 4 * B] }, yield: 0.035, growth: 0.03, vol: 0.05, risk: 0.008, en: "The most exclusive address in Nigeria. Billionaires, jetties and private security.", pcm: "Number one address for Naija. Billionaires, jetty and private security." }),
  L({ id: "ikoyi", state: "lagos", name: "Ikoyi, Lagos", tier: 5, kinds: { apartment: [300 * M, 900 * M], duplex: [700 * M, 3 * B], mansion: [1.5 * B, 6 * B], land: [600 * M, 2 * B] }, yield: 0.045, growth: 0.035, vol: 0.06, risk: 0.01, en: "Old colonial streets turned prime real estate.", pcm: "Old colonial streets wey don turn prime property." }),
  L({ id: "vi", state: "lagos", name: "Victoria Island, Lagos", tier: 4, kinds: { apartment: [200 * M, 600 * M], duplex: [500 * M, 1.8 * B], plaza: [1.5 * B, 6 * B], land: [500 * M, 1.5 * B] }, yield: 0.06, growth: 0.03, vol: 0.06, risk: 0.015, en: "Banks, oil companies and nightlife. Strong rents.", pcm: "Banks, oil companies and nightlife. Rent strong." }),
  L({ id: "lekki1", state: "lagos", name: "Lekki Phase 1, Lagos", tier: 4, kinds: { apartment: [120 * M, 350 * M], duplex: [280 * M, 900 * M], mansion: [700 * M, 2 * B], land: [250 * M, 700 * M] }, yield: 0.06, growth: 0.04, vol: 0.07, risk: 0.02, en: "Young money, malls and traffic. Always in demand.", pcm: "Young money, malls and traffic. Person always dey want am." }),
  L({ id: "ajah", state: "lagos", name: "Ajah / Lekki Extension, Lagos", tier: 3, kinds: { apartment: [40 * M, 110 * M], bungalow: [60 * M, 140 * M], duplex: [90 * M, 260 * M], land: [25 * M, 120 * M] }, yield: 0.07, growth: 0.05, vol: 0.09, risk: 0.03, en: "Where Lagos is growing next. Cheaper, riskier, with big upside.", pcm: "Where Lagos dey grow go next. E cheap, e risky, but upside big." }),
  L({ id: "ikeja-gra", state: "lagos", name: "Ikeja GRA, Lagos", tier: 4, kinds: { bungalow: [150 * M, 450 * M], duplex: [250 * M, 800 * M], apartment: [80 * M, 200 * M], land: [150 * M, 450 * M] }, yield: 0.05, growth: 0.02, vol: 0.05, risk: 0.01, en: "Leafy and close to the airport. Steady and safe.", pcm: "Green and near airport. Steady and safe." }),
  L({ id: "surulere", state: "lagos", name: "Surulere, Lagos", tier: 3, kinds: { apartment: [30 * M, 80 * M], bungalow: [50 * M, 140 * M], flats: [120 * M, 350 * M], land: [35 * M, 120 * M] }, yield: 0.07, growth: 0.02, vol: 0.06, risk: 0.02, en: "Dense, busy and full of tenants.", pcm: "Dense, busy and tenants plenty." }),
  L({ id: "ikorodu", state: "lagos", name: "Ikorodu, Lagos", tier: 2, kinds: { shack: [1.2 * M, 4 * M], apartment: [18 * M, 45 * M], bungalow: [20 * M, 60 * M], land: [8 * M, 35 * M] }, yield: 0.08, growth: 0.045, vol: 0.09, risk: 0.03, en: "Affordable and growing fast as Lagos spills over.", pcm: "E cheap and e dey grow fast as Lagos dey overflow." }),
  // Port Harcourt
  L({ id: "phc-gra", state: "rivers", name: "GRA, Port Harcourt", tier: 4, kinds: { apartment: [80 * M, 200 * M], duplex: [200 * M, 600 * M], mansion: [450 * M, 1.4 * B], land: [120 * M, 350 * M] }, yield: 0.06, growth: 0.015, vol: 0.08, risk: 0.04, en: "Oil money neighbourhood. Prices follow the oil price.", pcm: "Oil money area. Price dey follow oil price." }),
  L({ id: "phc-rumuola", state: "rivers", name: "Rumuola, Port Harcourt", tier: 2, kinds: { shack: [1.2 * M, 4 * M], apartment: [20 * M, 50 * M], bungalow: [30 * M, 90 * M], land: [15 * M, 60 * M] }, yield: 0.08, growth: 0.02, vol: 0.09, risk: 0.04, en: "Busy middle-class suburb.", pcm: "Busy middle-class area." }),
  // Other cities
  L({ id: "bodija", state: "oyo", name: "Bodija, Ibadan", tier: 3, kinds: { bungalow: [40 * M, 120 * M], duplex: [80 * M, 220 * M], land: [30 * M, 90 * M] }, yield: 0.065, growth: 0.02, vol: 0.06, risk: 0.02, en: "Ibadan's comfortable middle-class heart.", pcm: "Heart of Ibadan comfortable people." }),
  L({ id: "enugu-gra", state: "enugu", name: "GRA, Enugu", tier: 3, kinds: { bungalow: [40 * M, 110 * M], duplex: [60 * M, 180 * M], land: [25 * M, 80 * M] }, yield: 0.065, growth: 0.02, vol: 0.06, risk: 0.02, en: "Cool, calm and well planned.", pcm: "Cool, calm and well planned." }),
  L({ id: "nassarawa-gra", state: "kano", name: "Nassarawa GRA, Kano", tier: 3, kinds: { bungalow: [35 * M, 100 * M], duplex: [55 * M, 170 * M], land: [20 * M, 70 * M] }, yield: 0.07, growth: 0.025, vol: 0.08, risk: 0.04, en: "Kano's trade money buys quietly here.", pcm: "Kano trade money dey buy quiet quiet here." }),
  L({ id: "kaduna-barnawa", state: "kaduna", name: "Barnawa, Kaduna", tier: 2, kinds: { shack: [1.2 * M, 4 * M], bungalow: [20 * M, 60 * M], land: [8 * M, 30 * M] }, yield: 0.08, growth: 0.02, vol: 0.1, risk: 0.05, en: "Old Kaduna with steady tenants and some insecurity.", pcm: "Old Kaduna with steady tenants and small insecurity." }),
  L({ id: "maiduguri", state: "borno", name: "Maiduguri, Borno", tier: 1, kinds: { shack: [1.2 * M, 4 * M], apartment: [10 * M, 30 * M], bungalow: [12 * M, 40 * M], flats: [40 * M, 120 * M], land: [4 * M, 18 * M] }, yield: 0.11, growth: 0.04, vol: 0.16, risk: 0.08, en: "Very cheap with huge rental yields as the city rebuilds, but insecurity can hit values hard.", pcm: "E cheap well well with big rent as the city dey rebuild, but insecurity fit knock value down." }),
  L({ id: "minna", state: "niger", name: "Minna, Niger State", tier: 1, kinds: { shack: [1.2 * M, 4 * M], apartment: [10 * M, 28 * M], bungalow: [12 * M, 38 * M], land: [3 * M, 15 * M] }, yield: 0.1, growth: 0.045, vol: 0.1, risk: 0.04, en: "Close to Abuja with cheap land and a growing rental market.", pcm: "Near Abuja, land cheap, and rent market dey grow." }),
  L({ id: "jos", state: "plateau", name: "Jos, Plateau", tier: 2, kinds: { bungalow: [18 * M, 55 * M], land: [6 * M, 22 * M] }, yield: 0.09, growth: 0.02, vol: 0.1, risk: 0.05, en: "Cool weather and cheap land, with occasional tension.", pcm: "Cool weather and cheap land, with small tension sometimes." }),
  L({ id: "ilorin", state: "kwara", name: "Ilorin, Kwara", tier: 2, kinds: { bungalow: [20 * M, 55 * M], land: [6 * M, 25 * M] }, yield: 0.09, growth: 0.035, vol: 0.07, risk: 0.02, en: "Calm, affordable and quietly growing.", pcm: "Calm, cheap and e dey grow quietly." }),
  L({ id: "abeokuta", state: "ogun", name: "Abeokuta, Ogun", tier: 2, kinds: { bungalow: [20 * M, 60 * M], land: [8 * M, 40 * M] }, yield: 0.08, growth: 0.045, vol: 0.08, risk: 0.02, en: "On the Lagos growth corridor.", pcm: "For the Lagos growth corridor." }),
  L({ id: "calabar", state: "cross-river", name: "Calabar, Cross River", tier: 2, kinds: { bungalow: [20 * M, 65 * M], land: [8 * M, 30 * M] }, yield: 0.08, growth: 0.025, vol: 0.07, risk: 0.02, en: "Clean, calm and tourist friendly.", pcm: "Clean, calm and tourist dey like am." }),
  L({ id: "owerri", state: "imo", name: "Owerri, Imo", tier: 3, kinds: { bungalow: [25 * M, 80 * M], duplex: [50 * M, 150 * M], land: [12 * M, 50 * M] }, yield: 0.075, growth: 0.02, vol: 0.07, risk: 0.03, en: "Big on events, hotels and returning Diaspora money.", pcm: "Events, hotels and Diaspora money dey plenty." }),
];

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<string, Location>;
export const locationOf = (id: string | undefined) => (id ? LOCATION_BY_ID[id] : undefined);
export const defaultLocationFor = (stateId: string): Location | undefined => LOCATIONS.find((l) => l.state === stateId && l.tier <= 3) ?? LOCATIONS.find((l) => l.state === stateId);

export const TIER_LABEL: Record<number, () => string> = {
  1: () => T("Budget", "Budget"),
  2: () => T("Affordable", "Affordable"),
  3: () => T("Comfortable", "Comfortable"),
  4: () => T("Upmarket", "Upmarket"),
  5: () => T("Ultra-luxury", "Ultra-luxury"),
};

/** A midpoint price for a kind of property at a location, in today's naira. */
export function marketMid(l: Location, kind: HouseKind): number | null {
  const r = l.kinds[kind];
  return r ? Math.sqrt(r[0] * r[1]) : null;
}
