/**
 * Visiting other countries. Every country has a leader with a temperament. Whether they will even see you depends on how
 * strong Nigeria looks next to them ("come back when your economy is stronger"), and what they will agree to depends on
 * who they are. Strong countries start inviting you once you are doing well. Leaders are invented; countries are real, numbers simulated.
 */
import { subRng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import { addMod, clamp, clamp100, nb, pushNews } from "./util";
import { payPc } from "./meta";
import { W, league, myRank, saveW, type Country, type WorldState } from "./world";

export type Arch = "dealmaker" | "hawk" | "technocrat" | "nationalist" | "charmer" | "strongman" | "skeptic";
export const ARCH: Record<Arch, { label: string; icon: string; wants: string; refuse: string[]; yes: string[]; poor: string[] }> = {
  dealmaker: { label: "The dealmaker", icon: "🤝", wants: "Loves a good deal. Trade and investment get a warm hearing.", refuse: ["The numbers do not work for me yet.", "Interesting. Not at that price."], yes: ["Now we are talking. Draw up the papers.", "A fair deal is a good deal. Done."], poor: ["Let us talk again when you have something to sell."] },
  hawk: { label: "The hawk", icon: "🎖️", wants: "Respects strength. Defence ties and a strong army open doors.", refuse: ["I do not make promises to a weak army.", "Show me strength first."], yes: ["Our armies will understand each other.", "Agreed. Let our generals meet."], poor: ["I only meet people who can defend what they say."] },
  technocrat: { label: "The technocrat", icon: "🎓", wants: "Cares about competence and clean books. Technology deals go well.", refuse: ["Fix the governance and come back.", "My advisers say the data is not there."], yes: ["The data supports it. We will proceed.", "A sensible proposal, sensibly made."], poor: ["The data says it is too early. Come back with results."] },
  nationalist: { label: "The nationalist", icon: "🏴", wants: "Proud and hard to impress. Gives little and asks a lot.", refuse: ["My country does not take orders.", "We are not in the habit of favours."], yes: ["We will do this because it serves us. Understand that.", "Very well. On our terms."], poor: ["Why should my people care about yours?"] },
  charmer: { label: "The charmer", icon: "😄", wants: "Warm and flexible. Gifts and visits work wonders. Not always reliable.", refuse: ["My friend, not now, but never say never.", "Ah, you ask too much, too early."], yes: ["For you, anything within reason!", "Of course! We are practically family."], poor: ["You are charming, but charm needs a budget behind it."] },
  strongman: { label: "The strongman", icon: "🦁", wants: "Respects power and ignores lectures. Dislikes anyone who looks weak.", refuse: ["I deal with equals.", "Call me when you rule your own house."], yes: ["Strong leaders understand each other.", "We have an arrangement."], poor: ["I do not meet beggars."] },
  skeptic: { label: "The skeptic", icon: "🧐", wants: "Cold and cautious. Needs proof, and plenty of it.", refuse: ["I have heard this before.", "Prove it first."], yes: ["I am still doubtful, but I will try it.", "A cautious yes."], poor: ["I have been disappointed by your region before."] },
};
const ARCHS = Object.keys(ARCH) as Arch[];
const FIRST = { africa: ["Kwame", "Amina", "Tendai", "Zuri", "Jomo", "Selam"], europe: ["Lukas", "Elise", "Marek", "Ines", "Tobias", "Clara"], asia: ["Hiroshi", "Mei", "Arjun", "Soo-jin", "Dewi", "Rahul"], americas: ["Dana", "Marcus", "Camila", "Diego", "Claire", "Ethan"], mideast: ["Khalid", "Noura", "Omar", "Layla", "Zayed", "Rania"] } as const;
const LAST = ["Mensah", "Okafor", "Hartmann", "Silva", "Kapoor", "Tanaka", "Al-Rashid", "Moreau", "Brandt", "Lindqvist", "Novak", "Haddad", "Reyes", "Cheng", "Abara", "Dlamini"];
export interface Leader { name: string; title: string; arch: Arch }
export function leaderOf(s: FixState, c: Country): Leader {
  const rng = subRng(s.meta.seed, "leader", c.id, Math.floor(s.month / 60));
  const arch = ARCHS[Math.floor(rng.next() * ARCHS.length)];
  return { name: `${rng.pick(FIRST[c.region])} ${rng.pick(LAST)}`, title: ["us", "ng", "fr", "id", "br", "mx", "kr", "ke", "gh", "eg", "tr", "ru"].includes(c.id) ? "President" : ["gb", "jp", "ca", "au", "in", "de", "et", "za"].includes(c.id) ? "Prime Minister" : "Leader", arch };
}

/** how much a country respects you right now (0..1) */
export function respect(s: FixState, c: Country): number {
  const mine = league(s).find((r) => r.me)!.score; const theirs = league(s).find((r) => r.id === c.id)!.score;
  const a = leaderOf(s, c).arch;
  let r = 0.5 + (mine - theirs) / 75 + (c.rel - 50) / 120;
  if (a === "technocrat") r -= Math.max(0, s.gov.corruption - 55) / 250;
  if (a === "hawk" || a === "strongman") r += (s.mil.strength - 40) / 300;
  if (a === "skeptic") r -= 0.06;
  return clamp(r, 0, 1);
}
export const MEET_MIN = 0.2;
export const word = (r: number) => (r >= 0.75 ? "Looks up to you" : r >= 0.55 ? "Treats you as an equal" : r >= 0.35 ? "Polite, but unimpressed" : r >= MEET_MIN ? "Barely notices you" : "Will not see you");

const sizeOf = (c: Country) => clamp(Math.log10(c.gdp) / 4.5, 0.3, 1);
export interface Ask { id: string; icon: string; title: string; blurb: string; need: number; cost: (s: FixState, c: Country) => number; bonus: Partial<Record<Arch, number>>; cd: number; once?: boolean; gate?: (s: FixState, c: Country, w: WorldState) => string | null; run: (s: FixState, c: Country, w: WorldState) => string }
const mod = (s: FixState, c: Country, id: string, label: string, e: Effects) => addMod(s, `world:${c.id}:${id}`, label, e, { duration: null, ramp: 3 });
const boost = (s: FixState, k: "techBoost" | "milBoost" | "infBoost", v: number, cap: number) => { s.flags[k] = Math.min(cap, Number(s.flags[k] ?? 0) + v); };
export const ASKS: Ask[] = [
  { id: "friend", icon: "🎁", title: "Charm offensive", blurb: "Gifts, a banquet, a good photograph.", need: 0, cost: () => 3, bonus: { charmer: 0.25 }, cd: 3, run: (s, c) => { c.rel = clamp100(c.rel + (leaderOf(s, c).arch === "charmer" ? 11 : 7)); return `${c.name} warms to you.`; } },
  { id: "trade", icon: "📦", title: "Trade pact", blurb: "Lower tariffs both ways. More exports, more dollars.", need: 0.3, cost: () => 0, bonus: { dealmaker: 0.18, nationalist: -0.05 }, cd: 12, once: true, run: (s, c) => { c.rel = clamp100(c.rel + 6); mod(s, c, "trade", `Trade pact with ${c.name}`, { exports: 0.04 + 0.08 * sizeOf(c), fxSupply: 0.2 * sizeOf(c), investor: 0.5 }); return `Tariffs fall between Nigeria and ${c.name}. Exporters start counting.`; } },
  { id: "invest", icon: "🏭", title: "Ask them to invest", blurb: "Factories, offices and jobs built with their money.", need: 0.42, cost: () => 0, bonus: { dealmaker: 0.12, technocrat: 0.05 }, cd: 12, once: true, run: (s, c) => { c.rel = clamp100(c.rel + 3); mod(s, c, "invest", `${c.name} investment`, { investor: 1.2 * sizeOf(c), jobs: -0.3 * sizeOf(c), manuf: 1 * sizeOf(c) }); return `Companies from ${c.name} announce new plants in Nigeria.`; } },
  { id: "techlic", icon: "💡", title: "Buy technology licences", blurb: "Pay for their know-how: chips, machines, software.", need: 0.4, cost: (s, c) => 15 + 25 * sizeOf(c) * (0.6 + 0.4 * s.eco.priceLevel / 100), bonus: { technocrat: 0.2, nationalist: -0.1 }, cd: 10, run: (s, c) => { boost(s, "techBoost", 2.5, 25); c.rel = clamp100(c.rel + 2); return `Engineers from ${c.name} arrive with the paperwork. Nigeria's technology score climbs.`; } },
  { id: "defence", icon: "🛡️", title: "Defence pact", blurb: "Training, equipment and a promise to stand together. Their rivals will not like it.", need: 0.45, cost: () => 0, bonus: { hawk: 0.22, strongman: 0.1 }, cd: 14, once: true, run: (s, c, w) => { boost(s, "milBoost", 3, 25); c.rel = clamp100(c.rel + 5); addMod(s, `world:${c.id}:defence`, `Defence pact with ${c.name}`, { forces: 1.5 }, { duration: null, ramp: 3 }); const rivals: Record<string, string[]> = { us: ["cn", "ru"], cn: ["us", "in"], ru: ["us", "gb"], in: ["cn"], gb: ["ru"] }; for (const o of w.c) if (rivals[c.id]?.includes(o.id)) o.rel = clamp100(o.rel - 7); return `${c.name} and Nigeria sign a defence pact. Their rivals take note.`; } },
  { id: "stake", icon: "🏦", title: "Buy a stake in their ports and firms", blurb: "Own a piece of their economy. It pays you back every month.", need: 0.5, cost: (s, c) => 40 + 80 * sizeOf(c) * (0.6 + 0.4 * s.eco.priceLevel / 100), bonus: { dealmaker: 0.12, nationalist: -0.18 }, cd: 16, once: true, run: (s, c) => { boost(s, "infBoost", 1, 25); c.rel = clamp100(c.rel + 2); mod(s, c, "stake", `Stake in ${c.name}`, { revenue: 12 * sizeOf(c) }); return `Nigeria now owns a piece of ${c.name}'s harbours and firms. Dividends will follow.`; } },
  { id: "support", icon: "🗳️", title: "Ask for their vote in international bodies", blurb: "Seats, votes and statements of support.", need: 0.5, cost: () => 0, bonus: { charmer: 0.1, strongman: -0.05, skeptic: -0.05 }, cd: 12, once: true, run: (s, c) => { boost(s, "infBoost", 1.4, 25); c.rel = clamp100(c.rel + 3); return `${c.name} will back Nigeria when it counts.`; } },
  { id: "bloc", icon: "🌍", title: "Join the African Prosperity Zone", blurb: "A shared trading area with common rules. The first step toward a common currency.", need: 0.5, cost: () => 0, bonus: { dealmaker: 0.12, nationalist: -0.12 }, cd: 12, once: true, gate: (s) => (s.flags.africaFirst ? null : "Nigeria must be Africa's leading economy first."), run: (s, c, w) => { w.bloc.push(c.id); c.rel = clamp100(c.rel + 5); mod(s, c, "bloc", `Prosperity Zone: ${c.name}`, { exports: 0.04, investor: 0.4 }); return `${c.name} joins the African Prosperity Zone.`; } },
  { id: "naira", icon: "₦", title: "Trade with you in naira", blurb: "Their companies and central bank hold and use the naira instead of dollars.", need: 0.55, cost: () => 0, bonus: { dealmaker: 0.1, hawk: -0.05, skeptic: -0.1 }, cd: 12, once: true, gate: (s, c, w) => (!w.bloc.includes(c.id) ? "They must join the Prosperity Zone first." : myRank(s) > 10 ? "Nobody will use the naira unless Nigeria is a top-10 power." : null), run: (s, c, w) => { w.naira.push(c.id); c.rel = clamp100(c.rel + 4); return `${c.name} starts settling trade with Nigeria in naira. The dollar loses a customer.`; } },
];
export const ASK_BY_ID = Object.fromEntries(ASKS.map((a) => [a.id, a])) as Record<string, Ask>;
export const TRIP_PC = 2, TRIP_COST = 2, TRIP_GAP = 5;

const asked = (s: FixState): Record<string, number> => { try { return JSON.parse(String(s.flags.wasks ?? "{}")) as Record<string, number>; } catch { return {}; } };
export const chance = (s: FixState, c: Country, a: Ask) => clamp(0.12 + respect(s, c) * 0.7 + (a.bonus[leaderOf(s, c).arch] ?? 0) + (c.rel - 50) / 200, 0.05, 0.92);
export function askBlock(s: FixState, c: Country, a: Ask): string | null {
  const w = W(s); if (w.at !== c.id) return "You have to be there in person.";
  if (respect(s, c) < a.need) return "They do not take you seriously enough for this yet.";
  const g = a.gate?.(s, c, w); if (g) return g;
  const k = asked(s);
  if (a.once && k[`${c.id}:${a.id}!`] !== undefined) return "Already agreed.";
  const at = k[`${c.id}:${a.id}`]; if (at !== undefined && s.month - at < a.cd) return `Try again in ${a.cd - (s.month - at)} months.`;
  if (a.cost(s, c) > s.fin.treasury) return `Not enough cash (${nb(a.cost(s, c))}).`;
  return null;
}
export function tripBlock(s: FixState, id: string): string | null {
  const c = W(s).c.find((x) => x.id === id); if (!c) return "Unknown country.";
  const w = W(s); if (w.at === id) return "You are already there.";
  if (respect(s, c) < MEET_MIN && !w.invites.includes(id)) return null;
  const last = w.trips[id]; if (last !== undefined && s.month - last < TRIP_GAP && !w.invites.includes(id)) return `You were there ${s.month - last} month(s) ago. Wait ${TRIP_GAP - (s.month - last)} more.`;
  if (TRIP_COST > s.fin.treasury) return "Not enough cash for the trip.";
  return null;
}
export function travel(s: FixState, id: string): { ok: boolean; message: string } {
  const w = W(s); const c = w.c.find((x) => x.id === id); if (!c) return { ok: false, message: "Unknown country." };
  const b = tripBlock(s, id); if (b) return { ok: false, message: b };
  const invited = w.invites.includes(id);
  if (!invited) { const err = payPc(s, TRIP_PC, "make the trip"); if (err) return { ok: false, message: err }; }
  s.fin.treasury -= TRIP_COST; w.trips[id] = s.month; w.at = id; w.invites = w.invites.filter((x) => x !== id);
  s.rule.coupRisk = clamp100(s.rule.coupRisk + 0.8);
  const L = leaderOf(s, c); const r = respect(s, c);
  if (r < MEET_MIN) { w.at = null; c.rel = clamp100(c.rel - 2); saveW(s, w); return { ok: true, message: `${L.title} ${L.name} will not see you. ${ARCH[L.arch].poor[0]} Nigeria's delegation flies home.` }; }
  c.rel = clamp100(c.rel + (invited ? 5 : 2)); saveW(s, w);
  return { ok: true, message: `${L.title} ${L.name} receives you in ${c.name}. ${word(r)}.` };
}
export function flyHome(s: FixState): { ok: boolean; message: string } { const w = W(s); w.at = null; saveW(s, w); return { ok: true, message: "You fly home." }; }
export function negotiate(s: FixState, id: string, askId: string): { ok: boolean; message: string } {
  const w = W(s); const c = w.c.find((x) => x.id === id); const a = ASK_BY_ID[askId]; if (!c || !a) return { ok: false, message: "Unknown." };
  const b = askBlock(s, c, a); if (b) return { ok: false, message: b };
  const L = leaderOf(s, c); const p = chance(s, c, a);
  const roll = subRng(s.meta.seed, "wneg", id, askId, s.month).next();
  const ok = roll < p;
  const k = asked(s); k[`${c.id}:${a.id}`] = s.month; if (ok) k[`${c.id}:${a.id}!`] = s.month; s.flags.wasks = JSON.stringify(k);
  s.fin.treasury -= a.cost(s, c) * (ok ? 1 : 0.15);
  let msg: string;
  if (ok) msg = `"${ARCH[L.arch].yes[roll < p / 2 ? 0 : 1]}" ${a.run(s, c, w)}`;
  else { c.rel = clamp100(c.rel - (L.arch === "nationalist" || L.arch === "strongman" ? 5 : 3)); msg = `"${ARCH[L.arch].refuse[roll > 0.5 ? 0 : 1]}" ${c.name} says no, for now.`; }
  saveW(s, w);
  return { ok: true, message: msg };
}

/** every month: you come home, and good countries start calling */
export function diplomacyMonthly(s: FixState, rng: import("../../game/engine/rng").Rng) {
  const w = W(s); if (w.at) w.at = null;
  const rows = league(s); const me = rows.find((r) => r.me)!;
  if (w.invites.length < 2 && s.month >= 12 && rng.chance(0.07)) {
    const cand = w.c.filter((c) => !w.invites.includes(c.id) && c.rel >= 44 && me.score >= (rows.find((r) => r.id === c.id)!.score) * 0.78 && (w.trips[c.id] === undefined || s.month - w.trips[c.id] > 8));
    if (cand.length) {
      const c = rng.pick(cand); const L = leaderOf(s, c); w.invites.push(c.id);
      pushNews(s, { source: `winvite:${c.id}:${s.month}`, headline: `${L.title} ${L.name} invites Nigeria's president to ${c.name}`, body: `${c.flag} They want to talk business. Check the World league tab to accept.`, tone: "good" });
    }
  }
  saveW(s, w);
}
