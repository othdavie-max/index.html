import { ALL_RIBBONS } from "./ribbons";
import { netWorthReal } from "./finance";
import { rivalOf } from "./rival";
import type { Game, Player } from "./types";
import { T } from "./util";

/** What carries across lives on this device: the ribbon book, challenge badges and starting perks. */
const BOOK = "naija-life-ribbons-v1";
const BADGES = "naija-life-badges-v1";
const PERK = "naija-life-perk-v1";
const read = (k: string): Record<string, number> => { try { return JSON.parse(localStorage.getItem(k) ?? "{}") as Record<string, number>; } catch { return {}; } };
const write = (k: string, v: Record<string, number>) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export const ribbonBook = () => read(BOOK);
/** Adds ribbons to the book. Returns the ones that are new. */
export function collectRibbons(ids: string[]): string[] {
  const b = read(BOOK);
  const fresh = ids.filter((i) => !b[i]);
  if (fresh.length) { for (const i of fresh) b[i] = Date.now(); write(BOOK, b); }
  return fresh;
}

export interface ChallengeDef { id: string; emoji: string; en: string; pcm: string; check: (p: Player) => boolean }
export const CHALLENGES: ChallengeDef[] = [
  { id: "lapo_billion", emoji: "🚀", en: "Born Lapo, died a billionaire", pcm: "Born Lapo, die billionaire", check: (p) => (p.fam.archetype === "lapo" || p.fam.archetype === "struggling") && netWorthReal(p) >= 1e9 },
  { id: "gov50", emoji: "🏛️", en: "Become Governor before 50", pcm: "Become Governor before 50", check: (p) => (p.politics?.highest ?? -1) >= 4 && p.age < 50 },
  { id: "president", emoji: "🇳🇬", en: "Become President", pcm: "Become President", check: (p) => (p.politics?.highest ?? -1) >= 5 },
  { id: "big_family", emoji: "👨‍👩‍👧‍👦", en: "Have five children", pcm: "Get five pikin", check: (p) => p.kids.length >= 5 },
  { id: "ninety", emoji: "🎂", en: "Live to 90", pcm: "Live reach 90", check: (p) => p.age >= 90 },
  { id: "clean", emoji: "🕊️", en: "Reach 70 with a clean record", pcm: "Reach 70 with clean record", check: (p) => p.age >= 70 && p.crime.record.length === 0 },
  { id: "landlord5", emoji: "🏘️", en: "Own five properties", pcm: "Own five property", check: (p) => p.houses.length >= 5 },
  { id: "star", emoji: "🌟", en: "Land your big break", pcm: "Land your big break", check: (p) => Boolean(p.flags.bigBreak) },
  { id: "beat_cousin", emoji: "🥊", en: "Beat your rival cousin", pcm: "Beat your rival cousin", check: (p) => (rivalOf(p)?.beaten ?? 0) >= 1 },
  { id: "mogul3", emoji: "🏢", en: "Run three businesses at once", pcm: "Run three business at once", check: (p) => p.businesses.filter((b) => b.status === "open").length >= 3 },
  { id: "escape", emoji: "🏃🏾", en: "Escape from prison", pcm: "Escape from prison", check: (p) => Boolean(p.flags.fugitive || p.flags.wanted) },
  { id: "golden", emoji: "✨", en: "Live through a golden event", pcm: "Experience golden event", check: (p) => Number(p.flags.golds ?? 0) >= 1 },
  { id: "arcs3", emoji: "📖", en: "Finish three story arcs in one life", pcm: "Finish three story arcs for one life", check: (p) => String(p.flags.arcsDone ?? "").split(",").filter(Boolean).length >= 3 },
  { id: "streak7", emoji: "🔥", en: "A seven-day streak", pcm: "Seven-day streak", check: (p) => Number(p.flags.dailyStreak ?? 0) >= 7 },
];
export const badges = () => read(BADGES);
export function checkChallenges(p: Player): ChallengeDef[] {
  const b = read(BADGES);
  const fresh = CHALLENGES.filter((c) => !b[c.id]).filter((c) => { try { return c.check(p); } catch { return false; } });
  if (fresh.length) { for (const c of fresh) b[c.id] = Date.now(); write(BADGES, b); }
  return fresh;
}

export interface PerkDef { id: string; emoji: string; en: string; pcm: string; needs: string[]; apply: (p: Player) => void }
export const PERKS: PerkDef[] = [
  { id: "spoon", emoji: "🥄", en: "Silver spoon: start with extra savings", pcm: "Silver spoon: start with extra savings", needs: ["millionaire", "billionaire"], apply: (p) => { p.money += 300_000 * p.index; } },
  { id: "brains", emoji: "🧠", en: "Book smart: +12 Smarts", pcm: "Book smart: +12 Smarts", needs: ["scholar"], apply: (p) => { p.stats.smarts = Math.min(100, p.stats.smarts + 12); } },
  { id: "face", emoji: "✨", en: "Fine face: +12 Looks", pcm: "Fine face: +12 Looks", needs: ["famous", "bigbreak"], apply: (p) => { p.stats.looks = Math.min(100, p.stats.looks + 12); } },
  { id: "street", emoji: "🧢", en: "Street smart: +12 Connections", pcm: "Street smart: +12 Connections", needs: ["group", "yahoo", "criminal"], apply: (p) => { p.stats.connections = Math.min(100, p.stats.connections + 12); } },
  { id: "strong", emoji: "💪🏾", en: "Strong body: +12 Health", pcm: "Strong body: +12 Health", needs: ["elder"], apply: (p) => { p.stats.health = Math.min(100, p.stats.health + 12); } },
  { id: "lucky", emoji: "🍀", en: "Lucky star: more luck", pcm: "Lucky star: more luck", needs: ["jackpot"], apply: (p) => { p.luck = Math.min(95, p.luck + 15); } },
  { id: "name", emoji: "🏛️", en: "Known name: a stronger family name", pcm: "Known name: family name strong pass", needs: ["president", "politician", "landlord"], apply: (p) => { p.flags.famName = Math.min(95, Number(p.flags.famName ?? 45) + 15); } },
];
export const perkUnlocked = (d: PerkDef, book = ribbonBook()) => d.needs.some((n) => book[n]);
export function chosenPerk(): string { try { return localStorage.getItem(PERK) ?? ""; } catch { return ""; } }
export function choosePerk(id: string) { try { localStorage.setItem(PERK, id); } catch { /* storage unavailable */ } }
/** Applies the chosen starting perk to a brand-new life, if it is unlocked. */
export function applyPerk(g: Game): Game {
  const d = PERKS.find((x) => x.id === chosenPerk());
  if (!d || !perkUnlocked(d)) return g;
  d.apply(g.p);
  g.p.flags.perk = d.id;
  return g;
}
export const ribbonTotal = () => ALL_RIBBONS.length;
void T;
