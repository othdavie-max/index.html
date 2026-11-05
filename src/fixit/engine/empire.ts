/**
 * The dark side, as a game of its own. Money you take lands as cash that investigators can freeze. You can move it
 * offshore (for a fee), spend it on things that make you rich and powerful, bury evidence, throw parties for the
 * elite, and climb Africa's rich list. Opportunities to steal turn up as events with real risk. Everything is a
 * trade-off: lifestyle draws attention, lawyers can botch the job, offshore money is safe but slow.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState } from "./types";
import type { Tpl } from "./events";
import { addMod, clamp, clamp100, jflag, pushNews, removeMods } from "./util";
import { createEvent } from "./spawn";
import { noteStolen } from "./ledger";

export interface Empire { hidden: number; assets: string[]; peak: number }
export const empire = (s: FixState): Empire => jflag<Empire>(s, "empire", { hidden: 0, assets: [], peak: 0 });
const save = (s: FixState, e: Empire) => { s.flags.empire = JSON.stringify(e); };
export interface Asset { id: string; icon: string; name: string; cost: number; blurb: string; perk: string; offshore?: boolean; heat: number; eff?: Effects; yield?: number }
export const ASSETS: Asset[] = [
  { id: "mansion", icon: "🏠", name: "Maitama mansion", cost: 400, blurb: "Marble, generators, and a gate nobody walks past unnoticed.", perk: "Elite loyalty +3", heat: 0.12 },
  { id: "club", icon: "⚽", name: "A football club", cost: 900, blurb: "The fans sing your name. Nobody asks where the money came from.", perk: "Happiness up, approval up", heat: 0.1, eff: { happiness: 0.5, trust: 0.2 } },
  { id: "media", icon: "📺", name: "A media house", cost: 1100, blurb: "The evening news is suddenly very kind to you.", perk: "Scandals hurt trust less", heat: 0.08 },
  { id: "hotel", icon: "🏨", name: "Dubai hotel", cost: 700, blurb: "A tower by the sea, in a country that does not ask.", perk: "Earns ₦10m a month, offshore", heat: 0, offshore: true, yield: 10 },
  { id: "villa", icon: "🏰", name: "London townhouse", cost: 1500, blurb: "Mayfair, and a very polite estate agent.", perk: "Safe from freezes and a place to flee to", heat: 0, offshore: true },
  { id: "bank", icon: "🏦", name: "A private bank", cost: 2500, blurb: "Your own money, moving through your own bank.", perk: "Cheaper offshore transfers and ₦25m a month", heat: 0.05, yield: 25 },
  { id: "jet", icon: "🛩️", name: "Private jet", cost: 1800, blurb: "Fuelled, crewed, and always facing the runway.", perk: "A guaranteed escape if the regime falls", heat: 0.1 },
];
export const ASSET_BY_ID = Object.fromEntries(ASSETS.map((a) => [a.id, a])) as Record<string, Asset>;
export const FEE = (s: FixState) => (empire(s).assets.includes("bank") ? 0.04 : 0.1);
export const netWorth = (s: FixState) => Math.round(s.me.wealth + empire(s).hidden + empire(s).assets.reduce((a, id) => a + (ASSET_BY_ID[id]?.cost ?? 0) * 0.9, 0));

// ---- Africa's rich list (invented people)
const RICH0: [string, number][] = [["Chief Obi Anyanwu", 9000], ["Alhaji Garba Danlami", 7600], ["Mrs Folasade Ogunbiyi", 5400], ["Dr Kwabena Tetteh", 4300], ["Eng. Sipho Mkhize", 3500], ["Hajiya Amina Bello-Sule", 2900], ["Chief Emeka Nwosu", 2300], ["Mr Tariq Haddad", 1900], ["Dr Chiamaka Eze", 1500], ["Alhaji Yusuf Maikudi", 1200]];
export function richList(s: FixState): { name: string; worth: number; me?: boolean }[] {
  const grow = Math.pow(1.006, s.month);
  const rows = RICH0.map(([name, w]) => ({ name, worth: Math.round(w * grow) }));
  rows.push({ name: `${s.meta.president} (you)`, worth: netWorth(s), me: true } as never);
  return rows.sort((a, b) => b.worth - a.worth);
}
export const richRank = (s: FixState) => richList(s).findIndex((r) => (r as { me?: boolean }).me) + 1;

// ---- actions
type R = { ok: boolean; message: string };
export function moveOffshore(s: FixState, amt: number): R {
  const e = empire(s); amt = Math.min(amt, s.me.wealth); if (amt < 10) return { ok: false, message: "You have no cash to move." };
  const net = Math.round(amt * (1 - FEE(s))); s.me.wealth -= amt; e.hidden += net; e.peak = Math.max(e.peak, netWorth(s)); save(s, e);
  s.me.evidence = clamp(s.me.evidence + 0.8, 0, 100);
  return { ok: true, message: `₦${Math.round(amt)}m wired abroad. After fees ₦${net}m is safe where investigators cannot freeze it.` };
}
export function buyAsset(s: FixState, id: string): R {
  const a = ASSET_BY_ID[id]; const e = empire(s); if (!a) return { ok: false, message: "Unknown." };
  if (e.assets.includes(id)) return { ok: false, message: "You already own it." };
  const from = a.offshore ? e.hidden : s.me.wealth;
  if (from < a.cost) return { ok: false, message: a.offshore ? `You need ₦${a.cost}m offshore first (you have ₦${Math.round(e.hidden)}m).` : `You need ₦${a.cost}m in cash (you have ₦${Math.round(s.me.wealth)}m).` };
  if (a.offshore) e.hidden -= a.cost; else s.me.wealth -= a.cost;
  e.assets.push(id); save(s, e);
  if (a.id === "mansion") s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty + 3);
  applyAssets(s);
  pushNews(s, { source: `asset:${id}`, headline: a.id === "club" ? "The President's friend buys a football club" : a.id === "media" ? "A media house changes hands, quietly" : a.id === "jet" ? "A new private jet is spotted at Abuja airport" : `Rumours of a new ${a.name.toLowerCase()}`, body: a.heat > 0 ? "Reporters wonder how it was paid for." : "Nobody can say who the owner is.", tone: "neutral" });
  return { ok: true, message: `${a.icon} ${a.name} is yours. ${a.perk}.` };
}
export function buryEvidence(s: FixState): R {
  if (s.me.wealth < 150) return { ok: false, message: "Lawyers want ₦150m in cash first." };
  s.me.wealth -= 150;
  if (Math.random() < 0.0 || ((s.month * 7919 + Math.round(s.me.wealth)) % 100) / 100 < 0.28) { s.me.evidence = clamp(s.me.evidence + 8, 0, 100); s.me.scandals += 1; s.gov.trust = clamp(s.gov.trust - 2, 0, 100); return { ok: false, message: "The lawyer was talking to a journalist. The paper trail is now a front page." }; }
  s.me.evidence = clamp(s.me.evidence - 14, 0, 100); return { ok: true, message: "Files vanish, witnesses remember less. The paper trail is thinner." };
}
export function lavishParty(s: FixState): R {
  if (s.me.wealth < 120) return { ok: false, message: "A party like that costs ₦120m in cash." };
  s.me.wealth -= 120; s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty + 5); s.me.evidence = clamp(s.me.evidence + 1.5, 0, 100); s.gov.approval = clamp(s.gov.approval - 0.6, 0, 100);
  return { ok: true, message: "Generals, governors and billionaires dance until sunrise at the Villa. Loyalty up. Some of the public are not amused." };
}
function applyAssets(s: FixState) {
  removeMods(s, "empire"); const e = empire(s); const eff: Effects = {};
  for (const id of e.assets) for (const [k, v] of Object.entries(ASSET_BY_ID[id]?.eff ?? {})) eff[k as keyof Effects] = (eff[k as keyof Effects] ?? 0) + (v as number);
  if (Object.keys(eff).length) addMod(s, "empire", "Your business empire", eff, { duration: null, ramp: 1 });
}
export const ownsMedia = (s: FixState) => empire(s).assets.includes("media");
export const hasEscape = (s: FixState) => empire(s).assets.includes("jet") || empire(s).assets.includes("villa");

// ---- the month
export function empireMonthly(s: FixState, rng: Rng) {
  const e = empire(s); let changed = false;
  for (const id of e.assets) { const a = ASSET_BY_ID[id]; if (a.yield) { e.hidden += a.yield; changed = true; } if (a.heat) s.me.evidence = clamp(s.me.evidence + a.heat, 0, 100); }
  const nw = netWorth(s); if (nw > e.peak) { e.peak = nw; changed = true; }
  if (changed) save(s, e);
  // lifestyle audits, and freezes of what you keep in cash
  if (s.me.evidence >= 70 && s.me.wealth > 100 && rng.chance(0.05)) {
    const frozen = Math.round(s.me.wealth * 0.55); s.me.wealth -= frozen;
    pushNews(s, { source: `freeze:${s.month}`, headline: "Court freezes accounts linked to the presidency", body: `About ₦${frozen}m in local accounts is locked. Offshore holdings are untouched.`, tone: "bad" });
    s.gov.trust = clamp(s.gov.trust - 1.5, 0, 100);
  }
  if (richRank(s) === 1 && s.flags.richest === undefined && nw > 3000) { s.flags.richest = s.month; pushNews(s, { source: "richest", headline: "President now Africa's richest person, says rich list", body: "The ranking says what the speeches never would.", tone: "neutral" }); s.me.evidence = clamp(s.me.evidence + 6, 0, 100); }
  // chances to steal: more of them once you have started
  const greedy = s.me.wealth > 0 || s.me.acts.includes("kickback");
  if (s.month >= 5 && !s.events.some((x) => x.status === "open" && x.tpl.startsWith("heist")) && rng.chance(greedy ? 0.075 : 0.035)) {
    const pick = HEIST_TEMPLATES[Math.floor(rng.next() * HEIST_TEMPLATES.length)]; createEvent(s, pick.id, "NG-FC");
  }
}

// ---- heists (events)
const op = (id: string, label: string, explain: string, tradeoff: string, unc: "low" | "medium" | "high", chance: (s: FixState) => number, win: object, lose: object, winText: string, loseText: string) => ({ id, label, explain, cost: 0, tradeoff, unc, chance, win, lose, winText, loseText });
const take = (m: number) => (s: FixState) => { s.me.wealth += m; noteStolen(s, m / 1000); return undefined; };
void take;
export const HEIST_TEMPLATES: Tpl[] = [
  {
    id: "heistGhost", kind: "scandal", urgency: 2,
    title: () => "The ghost workers on the payroll",
    cause: () => "Your accountant-general quietly shows you the payroll: 40,000 salaries go to people who do not exist. Redirecting them would be easy, and nobody would count the missing names for a year.",
    options: [
      op("skim", "Redirect the ghost salaries", "A steady flow, if nobody looks.", "Leaves a trail, and the unions will notice eventually.", "medium", (s) => 0.68 - s.gov.transparency / 400, { wealth: 380, evidence: 9, corruption: 1.5, actTag: "kickback" }, { evidence: 16, scandal: 1, trust: -3 }, "The salaries land in a company you do not officially own.", "A union leader finds the pattern. The papers get it by morning."),
      op("clean", "Purge the ghosts and keep the savings", "The honest option.", "Some officials will never forgive you.", "low", () => 0.9, { trust: 2, corruption: -1.2, treasury: 30 }, { trust: 0 }, "40,000 names disappear. The treasury smiles.", "The purge stalls in court."),
      op("ignore", "Look away", "Not your problem today.", "Someone else will eat it.", "low", () => 1, {}, {}, "You pretend not to have seen the file.", ""),
    ], expire: {}, expireText: () => "The file went back in the drawer.",
  },
  {
    id: "heistBunker", kind: "scandal", urgency: 2,
    title: () => "A bunkering partner in the Delta",
    cause: () => "A colonel and a businessman offer you a share of oil siphoned from a pipeline each night. Ten per cent for protection, they say. It would also keep the creeks quiet.",
    options: [
      op("share", "Take the ten per cent", "Big money and a calm Delta.", "If it leaks, the whole world will have a view.", "high", (s) => 0.58 - s.gov.transparency / 500, { wealth: 700, evidence: 14, corruption: 2.2, intl: 3, actTag: "kickback" }, { evidence: 22, scandal: 1, trust: -5, intl: 4 }, "The barrels move and nobody asks. The colonel salutes you.", "A tanker is seized in Rotterdam. The paper trail leads home."),
      op("raid", "Raid the camp and take credit", "Looks great on television.", "Dangerous men have long memories.", "medium", () => 0.62, { trust: 3, insecurity: -2, actTag: "" }, { insecurity: 3, trust: -1 }, "Troops destroy the refinery camp. The cameras are there.", "The raid finds an empty camp and an ambush."),
    ], expire: {}, expireText: () => "The offer went to someone else.",
  },
  {
    id: "heistContract", kind: "scandal", urgency: 2,
    title: () => "The ₦40 billion bridge that costs ₦90 billion",
    cause: () => "A minister's contractor friend proposes a bridge at twice the price. The difference would be split three ways: him, the minister, and you.",
    options: [
      op("inflate", "Approve the inflated contract", "Big, clean-looking money.", "The bridge may never be finished.", "medium", (s) => 0.65 - s.gov.transparency / 450, { wealth: 520, evidence: 10, corruption: 2, treasury: -45, actTag: "kickback" }, { evidence: 18, scandal: 1, trust: -3, treasury: -45 }, "The contract is approved in four days. Foundations are poured in one.", "An auditor leaks the quotation. Engineers say the bridge is worth half."),
      op("tender", "Open it to a proper tender", "Slower, cheaper, honest.", "Your friend is offended.", "low", () => 0.9, { corruption: -0.8, trust: 1.5, treasury: 20 }, {}, "Three firms bid. The winner is a third cheaper.", ""),
    ], expire: {}, expireText: () => "The contractor took his proposal to a governor.",
  },
  {
    id: "heistPension", kind: "scandal", urgency: 2,
    title: () => "The pension fund has a spare ₦1 trillion",
    cause: () => "A fund manager says pension money is idle. A 'temporary loan' to a company you like would pay you well, and the pensioners would never know.",
    options: [
      op("loan", "Direct the 'loan'", "The biggest payday on offer.", "If it fails, old people pay and everyone knows.", "high", (s) => 0.52 - s.gov.transparency / 600, { wealth: 950, evidence: 16, corruption: 2.8, anger: 2, actTag: "kickback" }, { evidence: 25, scandal: 2, trust: -7, anger: 6 }, "The money moves quietly. The company renames itself.", "Pensioners picket the Villa. The books are leaked, line by line."),
      op("safe", "Insist it goes into government bonds", "The responsible option.", "Nothing for you.", "low", () => 0.95, { trust: 1, treasury: 15 }, {}, "The fund buys bonds. Investors like the discipline.", ""),
    ], expire: {}, expireText: () => "The fund manager found another patron.",
  },
] as unknown as Tpl[];
export { clamp100 };
