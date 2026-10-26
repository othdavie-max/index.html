import type { Player } from "./types";
import { T } from "./util";

export interface Ribbon { id: string; emoji: string; en: string; pcm: string; blurb: [string, string] }
type Def = Ribbon & { check: (p: Player) => boolean };

const worth = (p: Player) => p.peakWorth / Math.max(1, p.index);
const high = (p: Player) => p.politics?.highest ?? -1;
const flag = (p: Player, k: string) => Number(p.flags[k] ?? 0);

const R: Def[] = [
  { id: "billionaire", emoji: "💎", en: "Billionaire", pcm: "Billionaire", blurb: ["Peaked above ₦1 billion.", "You reach ₦1 billion."], check: (p) => worth(p) >= 1_000_000_000 },
  { id: "millionaire", emoji: "💵", en: "Millionaire", pcm: "Millionaire", blurb: ["Peaked above ₦50 million.", "You reach ₦50 million."], check: (p) => worth(p) >= 50_000_000 && worth(p) < 1_000_000_000 },
  { id: "broke", emoji: "🪙", en: "Broke but happy", pcm: "Broke but happy", blurb: ["Little money, plenty of peace.", "Small money, plenty peace."], check: (p) => worth(p) < 2_000_000 && p.stats.happiness >= 65 },
  { id: "president", emoji: "🇳🇬", en: "Mr/Madam President", pcm: "Mr/Madam President", blurb: ["Sat in Aso Rock.", "You sit for Aso Rock."], check: (p) => p.achievements.includes("Became President") || high(p) >= 5 },
  { id: "politician", emoji: "🏛️", en: "Public servant", pcm: "Public servant", blurb: ["Held political office.", "You hold political office."], check: (p) => high(p) >= 1 && high(p) < 5 },
  { id: "famous", emoji: "🌟", en: "Famous", pcm: "Famous", blurb: ["Everybody knew your name.", "Everybody sabi your name."], check: (p) => p.stats.reputation >= 85 || p.achievements.includes("Went viral") },
  { id: "bigbreak", emoji: "🎤", en: "Big break", pcm: "Big break", blurb: ["Your talent paid off.", "Your talent pay."], check: (p) => Boolean(p.flags.bigBreak) },
  { id: "scandal", emoji: "🕶️", en: "Scandalous", pcm: "Scandalous", blurb: ["A past full of gist.", "Your past full gist."], check: (p) => flag(p, "hookups") >= 3 || p.stats.reputation <= 15 },
  { id: "criminal", emoji: "⛓️", en: "Wanted", pcm: "Wanted", blurb: ["A criminal record.", "You get criminal record."], check: (p) => p.crime.record.length >= 1 },
  { id: "yahoo", emoji: "💻", en: "Yahoo boy", pcm: "Yahoo boy", blurb: ["Fast money, faster heat.", "Fast money, faster heat."], check: (p) => flag(p, "yahooEarned") > 0 },
  { id: "jackpot", emoji: "🎰", en: "Lucky", pcm: "Lucky", blurb: ["Hit the jackpot.", "You hit jackpot."], check: (p) => Boolean(p.flags.jackpotAge) },
  { id: "family", emoji: "👨‍👩‍👧‍👦", en: "Family person", pcm: "Family person", blurb: ["A big, happy family.", "Big, happy family."], check: (p) => p.kids.length >= 3 && p.family.happy >= 60 },
  { id: "married", emoji: "💍", en: "Happily married", pcm: "Happy marriage", blurb: ["Married until the end.", "Marry reach end."], check: (p) => Boolean(p.spouse) && (p.spouse?.happy ?? 0) >= 60 },
  { id: "lonely", emoji: "🕯️", en: "Lone wolf", pcm: "Lone wolf", blurb: ["Lived and died on your own terms.", "You live and die your way."], check: (p) => !p.spouse && p.kids.length === 0 && p.age >= 40 },
  { id: "scholar", emoji: "🎓", en: "Scholar", pcm: "Scholar", blurb: ["Chased every degree.", "You chase every degree."], check: (p) => p.edu === "tertiary" && p.stats.smarts >= 80 },
  { id: "elder", emoji: "👴🏾", en: "Long life", pcm: "Long life", blurb: ["Lived past 85.", "You live pass 85."], check: (p) => p.age >= 85 },
  { id: "young", emoji: "🌱", en: "Gone too soon", pcm: "Gone too soon", blurb: ["Died before 30.", "You die before 30."], check: (p) => p.age < 30 },
  { id: "pet", emoji: "🐕", en: "Animal lover", pcm: "Animal lover", blurb: ["Never lived without a pet.", "You no dey live without pet."], check: (p) => Boolean(p.flags.pets) && String(p.flags.pets).length > 4 },
  { id: "tattoo", emoji: "🖋️", en: "Inked", pcm: "Inked", blurb: ["Covered in tattoos.", "Tattoo cover you."], check: (p) => flag(p, "tattoos") >= 2 },
  { id: "dna", emoji: "🧬", en: "Roots", pcm: "Roots", blurb: ["Traced your ancestry.", "You trace your roots."], check: (p) => Boolean(p.flags.dnaText) },
  { id: "group", emoji: "🧢", en: "Street life", pcm: "Street life", blurb: ["Ran with the boys.", "You run with the boys."], check: (p) => Boolean(p.flags.group) },
  { id: "generous", emoji: "🤲🏾", en: "Generous", pcm: "Generous", blurb: ["Gave plenty to others.", "You give plenty."], check: (p) => p.goodDeeds >= 4 },
  { id: "nysc", emoji: "🟢", en: "Corper", pcm: "Corper", blurb: ["Served the nation.", "You serve the nation."], check: (p) => Boolean(p.flags.nysc) && !p.flags.nyscSkipped && !p.flags.nyscExempt },
  { id: "landlord", emoji: "🏠", en: "Landlord", pcm: "Landlord", blurb: ["Owned several houses.", "You own several houses."], check: (p) => p.houses.length >= 3 },
  { id: "mogul", emoji: "🏢", en: "Business owner", pcm: "Business owner", blurb: ["Built businesses.", "You build business."], check: (p) => p.businesses.length >= 2 },
];

export function ribbonsOf(p: Player): Ribbon[] {
  return R.filter((r) => { try { return r.check(p); } catch { return false; } }).map(({ check, ...r }) => { void check; return r; }).slice(0, 8);
}
export const ribbonTitle = (r: Ribbon) => T(r.en, r.pcm);

/** Every ribbon, for the collection book. */
export const ALL_RIBBONS: Ribbon[] = R.map(({ check, ...x }) => { void check; return x; });
const DEATH_ONLY = new Set(["young", "lonely", "broke"]);
/** Ribbons that can be earned while still alive, for the live "unlocked!" pop-up. */
export function liveRibbons(p: Player): Ribbon[] {
  return R.filter((r) => !DEATH_ONLY.has(r.id)).filter((r) => { try { return r.check(p); } catch { return false; } }).map(({ check, ...x }) => { void check; return x; });
}
