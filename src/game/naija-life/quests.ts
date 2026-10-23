import { netWorthReal } from "./finance";
import { I, bump } from "./helpers";
import { transact } from "./ledger";
import { ownsPersonalCar } from "./vehicles";
import { rivalOf } from "./rival";
import type { EventDef, Pending, Player } from "./types";
import { T, clamp, dual, naira, pick, randInt } from "./util";

// ---------------------------------------------------------------------------
// Yearly quests: three small goals to chase
// ---------------------------------------------------------------------------
export interface QuestDef {
  id: string;
  emoji: string;
  en: string;
  pcm: string;
  ages: [number, number];
  base: (p: Player) => number;
  check: (p: Player, base: number) => boolean;
  /** Where the player stands, shown as progress. */
  progress?: (p: Player, base: number) => string;
  reward: { happy?: number; stat?: "smarts" | "connections" | "reputation" | "fitness" | "looks"; statBy?: number; cash?: number };
}
const friends = (p: Player) => Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive).length;
const income = (p: Player) => (p.fin.length ? p.fin[p.fin.length - 1].income / p.index : 0);

export const QUESTS: QuestDef[] = [
  { id: "save", emoji: "🏦", en: "Grow your savings by 25%", pcm: "Grow your savings by 25%", ages: [16, 90], base: (p) => Math.max(1, p.money / p.index), check: (p, b) => p.money / p.index >= b * 1.25, progress: (p, b) => `${Math.round((p.money / p.index / b) * 100)}%`, reward: { happy: 4, cash: 60_000 } },
  { id: "smart", emoji: "🧠", en: "Raise your Smarts by 3", pcm: "Raise your Smarts by 3", ages: [6, 30], base: (p) => p.stats.smarts, check: (p, b) => p.stats.smarts >= b + 3, reward: { happy: 3, stat: "connections", statBy: 1 } },
  { id: "friend", emoji: "🧑🏾‍🤝‍🧑🏾", en: "Make a new friend", pcm: "Make new friend", ages: [5, 90], base: friends, check: (p, b) => friends(p) > b, reward: { happy: 4 } },
  { id: "family", emoji: "🏠", en: "Make your family prouder", pcm: "Make your family proud pass", ages: [10, 80], base: (p) => p.family.happy, check: (p, b) => p.family.happy >= Math.min(95, b + 8), reward: { happy: 3, stat: "reputation", statBy: 1 } },
  { id: "fit", emoji: "💪", en: "Get fitter", pcm: "Get fit", ages: [8, 70], base: (p) => p.stats.fitness, check: (p, b) => p.stats.fitness >= b + 5, reward: { happy: 2, stat: "looks", statBy: 1 } },
  { id: "job", emoji: "💼", en: "Find a job", pcm: "Find job", ages: [18, 40], base: (p) => Number(Boolean(p.job)), check: (p) => Boolean(p.job), reward: { happy: 5, cash: 80_000 } },
  { id: "earn", emoji: "💰", en: "Earn 10% more than last year", pcm: "Earn 10% pass last year", ages: [17, 65], base: income, check: (p, b) => b > 0 && income(p) >= b * 1.1 || b === 0 && income(p) > 0, reward: { happy: 3, cash: 100_000 } },
  { id: "biz", emoji: "🏪", en: "Start a business", pcm: "Start business", ages: [18, 60], base: (p) => p.businesses.length, check: (p, b) => p.businesses.length > b, reward: { happy: 5, stat: "reputation", statBy: 2 } },
  { id: "clean", emoji: "🕊️", en: "Stay out of trouble all year", pcm: "No enter wahala all year", ages: [14, 70], base: (p) => p.crime.record.length, check: (p, b) => p.crime.record.length === b && p.prison <= 0, reward: { happy: 2, stat: "reputation", statBy: 1 } },
  { id: "rival", emoji: "🥊", en: "Be richer than your cousin", pcm: "Be richer pass your cousin", ages: [20, 70], base: () => 0, check: (p) => { const r = rivalOf(p); return Boolean(r) && netWorthReal(p) > (r?.wealth ?? 0); }, reward: { happy: 6, stat: "reputation", statBy: 2 } },
  { id: "date", emoji: "💘", en: "Go on a date", pcm: "Go date", ages: [18, 45], base: (p) => p.rel.partners.length, check: (p, b) => p.rel.partners.length > b, reward: { happy: 4 } },
  { id: "invest", emoji: "📈", en: "Invest in something", pcm: "Invest for something", ages: [20, 80], base: (p) => p.holdings.length, check: (p, b) => p.holdings.length > b, reward: { happy: 3, stat: "smarts", statBy: 1 } },
  { id: "car", emoji: "🚗", en: "Buy your first car", pcm: "Buy your first motor", ages: [20, 60], base: (p) => Number(ownsPersonalCar(p)), check: (p) => ownsPersonalCar(p), reward: { happy: 7, stat: "reputation", statBy: 2 } },
  { id: "house", emoji: "🏡", en: "Own a house or plot", pcm: "Own house or plot", ages: [24, 70], base: (p) => p.houses.length, check: (p, b) => p.houses.length > b, reward: { happy: 8, stat: "reputation", statBy: 3 } },
];
export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q])) as Record<string, QuestDef>;

export interface QuestState { id: string; base: number; done: boolean }
export const questsOf = (p: Player): QuestState[] => { try { return JSON.parse(String(p.flags.quests ?? "[]")) as QuestState[]; } catch { return []; } };

/** Closes last year's quests and hands out three new ones. */
export function questsYear(p: Player, lines: string[]) {
  const old = questsOf(p);
  for (const q of old) {
    const def = QUEST_BY_ID[q.id];
    if (!def || q.done) continue;
    if (def.check(p, q.base)) {
      q.done = true;
      const r = def.reward;
      if (r.happy) bump(p, "happiness", r.happy);
      if (r.stat) bump(p, r.stat, r.statBy ?? 1);
      if (r.cash) transact(p, { amount: Math.round(I(p, r.cash)), reason: T("Goal reward", "Goal reward"), category: "event" });
      p.flags.questsDone = Number(p.flags.questsDone ?? 0) + 1;
      lines.push(T(`✅ Goal achieved: ${def.en}.`, `✅ Goal don reach: ${def.pcm}.`));
    }
  }
  const pool = QUESTS.filter((d) => p.age >= d.ages[0] && p.age <= d.ages[1] && !(d.id === "job" && p.job) && !(d.id === "car" && ownsPersonalCar(p)) && !(d.id === "rival" && !rivalOf(p)));
  const chosen: QuestDef[] = [];
  while (chosen.length < 3 && pool.length) { const d = pick(pool); pool.splice(pool.indexOf(d), 1); chosen.push(d); }
  p.flags.quests = JSON.stringify(chosen.map((d) => ({ id: d.id, base: d.base(p), done: false })));
}
export const questDone = (p: Player, q: QuestState) => q.done || Boolean(QUEST_BY_ID[q.id]?.check(p, q.base));

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export interface Milestone { id: string; emoji: string; en: string; pcm: string; check: (p: Player) => boolean }
export const MILESTONES: Milestone[] = [
  { id: "m1", emoji: "💵", en: "First ₦1 million", pcm: "First ₦1 million", check: (p) => netWorthReal(p) >= 1e6 },
  { id: "m10", emoji: "💰", en: "₦10 million net worth", pcm: "₦10 million net worth", check: (p) => netWorthReal(p) >= 1e7 },
  { id: "m100", emoji: "🏆", en: "₦100 million net worth", pcm: "₦100 million net worth", check: (p) => netWorthReal(p) >= 1e8 },
  { id: "b1", emoji: "💎", en: "First ₦1 billion", pcm: "First ₦1 billion", check: (p) => netWorthReal(p) >= 1e9 },
  { id: "b10", emoji: "👑", en: "₦10 billion net worth", pcm: "₦10 billion net worth", check: (p) => netWorthReal(p) >= 1e10 },
  { id: "car", emoji: "🚗", en: "First car", pcm: "First motor", check: (p) => ownsPersonalCar(p) },
  { id: "house", emoji: "🏡", en: "First house", pcm: "First house", check: (p) => p.houses.length > 0 },
  { id: "biz", emoji: "🏪", en: "First business", pcm: "First business", check: (p) => p.businesses.length > 0 },
  { id: "degree", emoji: "🎓", en: "First degree", pcm: "First degree", check: (p) => p.edu === "tertiary" && !p.school },
  { id: "job", emoji: "💼", en: "First real job", pcm: "First real job", check: (p) => Boolean(p.job) && p.age >= 18 },
  { id: "married", emoji: "💍", en: "Got married", pcm: "You marry", check: (p) => Boolean(p.spouse) },
  { id: "child", emoji: "🍼", en: "First child", pcm: "First pikin", check: (p) => p.kids.length > 0 },
];
export const doneMilestones = (p: Player): { m: Milestone; age: number }[] => MILESTONES.filter((m) => p.flags[`mile_${m.id}`] !== undefined).map((m) => ({ m, age: Number(p.flags[`mile_${m.id}`]) }));

export function milestonesYear(p: Player, pending: Pending[]) {
  for (const m of MILESTONES) {
    if (p.flags[`mile_${m.id}`] !== undefined) continue;
    if (!m.check(p)) continue;
    p.flags[`mile_${m.id}`] = p.age;
    if (p.age >= 14) { pending.push({ kind: "event", id: "milestone", data: { mid: m.id, month: randInt(1, 12) } }); break; }
  }
}

export const QUEST_EVENTS: EventDef[] = [
  {
    id: "milestone", title: dual("A milestone", "Milestone"),
    weight: () => 0,
    text: (p, d) => { const m = MILESTONES.find((x) => x.id === String(d.mid)); return m ? T(`${m.emoji} ${m.en}. You remember where you started. Not everyone gets here.`, `${m.emoji} ${m.pcm}. You remember where you start from. Not everybody reach here.`) : ""; },
    choices: (p) => [
      { label: T("Celebrate with family", "Celebrate with family"), sub: naira(I(p, 120_000)), disabled: p.money < I(p, 120_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -Math.round(I(q, 120_000)), reason: T("Milestone celebration", "Milestone celebration"), category: "social" }); bump(q, "happiness", 8); q.family.happy = clamp(q.family.happy + 5); return T("Jollof, music and your mother crying happily. Worth it.", "Jollof, music and mama dey cry for joy. E worth am."); } },
      { label: T("Quiet thanks", "Quiet thanks"), run: (q) => { bump(q, "happiness", 4); return T("You say a small prayer and carry on.", "You pray small and continue."); } },
    ],
  },
];
