import { I, bump } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, randInt } from "./util";

/** Rare golden moments: roughly once in fifty years, something huge happens. */
type G = { id: string; emoji: string; title: [string, string]; text: [string, string]; ages: [number, number]; when?: (p: Player) => boolean; cash: number; keep: [string, string]; share: [string, string] };
const GOLD: G[] = [
  { id: "gold_contract", emoji: "🛢️", title: ["A contract of a lifetime", "Contract of a lifetime"], ages: [28, 70], when: (p) => p.stats.connections >= 55, cash: 60_000_000,
    text: ["An old contact calls: a huge supply contract needs a trusted name. Yours came up first.", "One old contact call: big supply contract need person wey dem trust. Na your name come first."],
    keep: ["You sign. The money that lands in your account makes your hands shake.", "You sign. The money wey enter your account make your hand shake."], share: ["You bring your siblings in on the deal. The family name grows.", "You carry your siblings join the deal. Family name grow."] },
  { id: "gold_skit", emoji: "🎬", title: ["You blew up online", "You don blow"], ages: [15, 45], cash: 8_000_000,
    text: ["Your skit hits ten million views overnight. Celebrities are reposting it. Brands are in your DMs.", "Your skit reach ten million views overnight. Celebrities dey repost am. Brands full your DM."],
    keep: ["You sign three endorsements in one week.", "You sign three endorsement for one week."], share: ["You bring your friends into the next skit. The squad goes viral.", "You carry your friends enter the next skit. The squad blow."] },
  { id: "gold_mentor", emoji: "🧑🏾‍💼", title: ["A billionaire mentor", "Billionaire mentor"], ages: [18, 40], cash: 5_000_000,
    text: ["At an event, a famous billionaire hears you speak and hands you a card: 'Come and see me on Monday.'", "For one event, one popular billionaire hear you talk and give you card: 'Come see me Monday.'"],
    keep: ["Monday changes your life: advice, introductions and a cheque.", "Monday change your life: advice, introductions and cheque."], share: ["You ask him to fund your community too. He agrees, impressed.", "You beg am make e fund your community too. E gree, e impress."] },
  { id: "gold_land", emoji: "💎", title: ["Treasure on family land", "Treasure for family land"], ages: [25, 80], cash: 30_000_000,
    text: ["Surveyors find valuable minerals under the family's old plot. A company wants to buy the rights.", "Surveyors find valuable minerals under the family old plot. One company wan buy the rights."],
    keep: ["You negotiate hard and walk away very rich.", "You negotiate well and you comot very rich."], share: ["You split it with the extended family. Your name is sung in the village.", "You share am with the whole family. Dem dey sing your name for village."] },
  { id: "gold_scholarship", emoji: "🎓", title: ["A full scholarship", "Full scholarship"], ages: [15, 26], when: (p) => p.stats.smarts >= 55, cash: 3_000_000,
    text: ["A foundation picks you for a full scholarship: fees, a laptop and a monthly stipend.", "One foundation pick you for full scholarship: fees, laptop and monthly allowance."],
    keep: ["You accept and study like your life depends on it.", "You accept and you read like your life depend on am."], share: ["You mentor two younger students with part of your stipend.", "You use part of the allowance mentor two small students."] },
  { id: "gold_ticket", emoji: "🎟️", title: ["The forgotten ticket", "Ticket wey you forget"], ages: [18, 85], cash: 25_000_000,
    text: ["Cleaning out an old bag, you find a lottery ticket from last month. You check the numbers. Then you check again.", "As you dey clear old bag, you see lottery ticket from last month. You check the number. You check am again."],
    keep: ["You cash it quietly and tell no one. Yet.", "You cash am quietly and you no tell anybody. Yet."], share: ["You throw a party for the whole street.", "You do party for the whole street."] },
];

export const isGold = (id: string) => id.startsWith("gold_");

export const GOLD_EVENTS: EventDef[] = GOLD.map((g) => ({
  id: g.id,
  title: dual(`${g.emoji} ${g.title[0]}`, `${g.emoji} ${g.title[1]}`),
  weight: () => 0,
  text: () => T(g.text[0], g.text[1]),
  choices: () => [
    { label: T("Take it all", "Collect everything"), run: (q) => { const amt = Math.round(I(q, g.cash)); transact(q, { amount: amt, reason: T(g.title[0], g.title[1]), category: "event" }); bump(q, "happiness", 15); q.flags.golds = Number(q.flags.golds ?? 0) + 1; return `${T(g.keep[0], g.keep[1])} +${naira(amt)}`; } },
    { label: T("Share the blessing", "Share the blessing"), run: (q) => { const amt = Math.round(I(q, g.cash * 0.6)); transact(q, { amount: amt, reason: T(g.title[0], g.title[1]), category: "event" }); bump(q, "happiness", 12); bump(q, "reputation", 8); q.family.happy = clamp(q.family.happy + 10); q.flags.golds = Number(q.flags.golds ?? 0) + 1; return `${T(g.share[0], g.share[1])} +${naira(amt)}`; } },
  ],
}));

export function goldYear(p: Player, pending: Pending[]) {
  if (p.prison > 0 || p.age < 15 || !chance(0.02)) return;
  const pool = GOLD.filter((g) => p.age >= g.ages[0] && p.age <= g.ages[1] && (!g.when || g.when(p)));
  if (pool.length) pending.push({ kind: "event", id: pick(pool).id, data: { month: randInt(1, 12) } });
}
