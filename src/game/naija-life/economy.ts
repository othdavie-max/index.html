import { I, bump, luckBonus } from "./helpers";
import { netWorthReal } from "./finance";
import { transact } from "./ledger";
import { modActive } from "./news";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, dual, naira, rand, randInt } from "./util";

// ---------------------------------------------------------------------------
// The state of the economy
// ---------------------------------------------------------------------------
export type MoodId = "steady" | "boom" | "recession" | "subsidy" | "crash" | "election";
export interface Mood { id: MoodId; emoji: string; en: string; pcm: string; tone: "good" | "bad" | "neutral"; note: [string, string] }

const MOODS: Record<MoodId, Mood> = {
  steady: { id: "steady", emoji: "⚖️", en: "Steady", pcm: "Steady", tone: "neutral", note: ["Prices and pay move slowly.", "Price and pay dey move slowly."] },
  boom: { id: "boom", emoji: "📈", en: "Boom", pcm: "Boom", tone: "good", note: ["Pay, business and property are all up.", "Pay, business and property all dey up."] },
  recession: { id: "recession", emoji: "📉", en: "Recession", pcm: "Recession", tone: "bad", note: ["Pay is flat, shops are quiet and property is soft.", "Pay no dey move, shop quiet and property soft."] },
  subsidy: { id: "subsidy", emoji: "⛽", en: "Subsidy removal", pcm: "Subsidy removal", tone: "bad", note: ["Fuel, transport and food cost more.", "Fuel, transport and food don cost more."] },
  crash: { id: "crash", emoji: "💥", en: "Naira crash", pcm: "Naira crash", tone: "bad", note: ["Prices jump. Dollars are king.", "Price jump. Dollar na king."] },
  election: { id: "election", emoji: "🗳️", en: "Election year", pcm: "Election year", tone: "neutral", note: ["Campaign money flows, and so does uncertainty.", "Campaign money dey flow, and uncertainty too."] },
};
export const isElectionYear = (p: Player) => (p.birthYear + p.age) % 4 === 3;

/** The loudest national condition right now. */
export function econMood(p: Player): Mood {
  if (modActive(p, "crash")) return MOODS.crash;
  if (modActive(p, "recession")) return MOODS.recession;
  if (modActive(p, "fuel")) return MOODS.subsidy;
  if (modActive(p, "boom")) return MOODS.boom;
  if (isElectionYear(p)) return MOODS.election;
  return MOODS.steady;
}
/** Effect on the yearly price movement of property. */
export function propertyEcon(p: Player): number {
  return (modActive(p, "boom") ? 0.02 : 0) - (modActive(p, "recession") ? 0.03 : 0) - (modActive(p, "crash") ? 0.015 : 0);
}

// ---------------------------------------------------------------------------
// Naira and dollar
// ---------------------------------------------------------------------------
export function fxRate(p: Player): number {
  if (typeof p.flags.fxRate !== "number") p.flags.fxRate = Math.round(900 * p.index);
  return Number(p.flags.fxRate);
}
/** A sudden move in the dollar: the naira buys less, and dollar savings gain. */
export function shockFx(p: Player, frac: number) {
  p.flags.fxRate = Math.round(fxRate(p) * (1 + frac));
  for (const h of p.holdings) if (h.kind === "usd") { h.value = Math.round(h.value * (1 + frac)); if (h.units !== undefined) h.units *= 1 + frac; }
}
export const fxHistory = (p: Player): number[] => { try { return JSON.parse(String(p.flags.fxHist ?? "[]")) as number[]; } catch { return []; } };

export function yearlyEcon(p: Player, inflation: number, lines: string[]) {
  const prev = fxRate(p);
  const shock = Number(p.flags.fxShock ?? 0);
  p.flags.fxShock = 0;
  const move = clamp(shock + inflation * 0.9 + rand(-0.05, 0.07) + (modActive(p, "crash") ? 0.1 : 0) - (modActive(p, "boom") ? 0.03 : 0), -0.1, 0.5);
  p.flags.fxRate = Math.round(prev * (1 + move));
  for (const h of p.holdings) if (h.kind === "usd") { h.value = Math.round(h.value * (1 + move)); if (h.units !== undefined) h.units *= 1 + move; }
  p.flags.fxHist = JSON.stringify([...fxHistory(p), Number(p.flags.fxRate)].slice(-10));
  if (move > 0.2) lines.push(T(`The dollar jumps to ₦${Number(p.flags.fxRate).toLocaleString()}. Imported goods cost a lot more.`, `Dollar jump reach ₦${Number(p.flags.fxRate).toLocaleString()}. Imported things don dear.`));
  else if (move < -0.04) lines.push(T(`The naira recovers a little: ₦${Number(p.flags.fxRate).toLocaleString()} to the dollar.`, `Naira recover small: ₦${Number(p.flags.fxRate).toLocaleString()} to one dollar.`));
}

// ---------------------------------------------------------------------------
// Social standing: lifestyle creep
// ---------------------------------------------------------------------------
export const statusOf = (p: Player) => Math.round(Number(p.flags.status ?? 20));
/** What people around you expect, given how much money you are known to have. */
export function expectedStatus(p: Player): number {
  return Math.round(clamp(8 + 11 * Math.log10(1 + Math.max(0, netWorthReal(p)) / 1_000_000), 5, 90));
}
export function statusYear(p: Player, lines: string[]) {
  if (p.age < 18) return;
  const cars = p.vehicles.reduce((s, v) => s + (v.luxury ? v.value * 1.4 : v.value * 0.6), 0) / p.index;
  const houses = p.houses.reduce((s, h) => s + h.value, 0) / p.index;
  const visible = cars + houses * 0.45;
  const fy = p.fin.find((f) => f.age === p.age) ?? p.fin[p.fin.length - 1];
  const flash = fy ? -((fy.cats.social ?? 0) + (fy.cats.vehicle ?? 0) * 0.3 + (fy.cats.personal ?? 0) * 0.05) / p.index : 0;
  const incomeReal = fy ? Math.max(1, fy.income / p.index) : 1;
  const target = clamp(8 + 11 * Math.log10(1 + visible / 1_000_000) + p.prestige * 1.2, 5, 95);
  const spendBonus = clamp((flash / incomeReal) * 40, 0, 22);
  const prev = Number(p.flags.status ?? 20);
  const status = clamp(prev * 0.62 + target * 0.38 + spendBonus, 0, 100);
  p.flags.status = status;
  const expect = expectedStatus(p);
  const thin = p.money < I(p, 1_200_000);
  if (status >= expect + 14 && thin) {
    bump(p, "stress", 5); bump(p, "happiness", -3);
    lines.push(T("You are living bigger than your account. Everyone thinks you are rich; your bank knows better.", "You dey live bigger than your account. Everybody think you rich; your bank know better."));
  } else if (status <= expect - 22 && netWorthReal(p) > 15_000_000) {
    bump(p, "reputation", -2);
    lines.push(T("People say you have 'fallen off'. With your money, you should look the part.", "People dey talk say you 'don fall off'. With your money, you suppose look am."));
  } else if (status >= 60) {
    bump(p, "reputation", 1); bump(p, "connections", 1);
  }
}

// ---------------------------------------------------------------------------
// Black tax: the family claims a share
// ---------------------------------------------------------------------------
const REASONS: [string, string][] = [
  ["your younger sibling's school fees", "your small sibling school fees"], ["your father's hospital bill", "your papa hospital bill"],
  ["a village development levy", "village development levy"], ["your mother's shop stock", "your mama shop stock"],
  ["a cousin's wedding contribution", "cousin wedding contribution"], ["roofing the family house", "to roof family house"],
  ["a funeral in the village", "funeral for village"], ["a brother who needs 'a small capital'", "brother wey need 'small capital'"],
];
export function blackTaxDemand(p: Player): number {
  const fy = p.fin.find((f) => f.age === p.age - 1) ?? p.fin[p.fin.length - 1];
  const income = fy?.income ?? 0;
  const dependents = Object.values(p.npcs).filter((n) => n.alive && ["dad", "mom", "sibling", "guardian", "grandparent"].includes(n.role)).length;
  const poorRoots = p.fam.archetype === "struggling" || p.fam.archetype === "lapo" ? 1.5 : p.fam.archetype === "middle" ? 1 : 0.5;
  const pct = clamp((0.025 + dependents * 0.012) * poorRoots, 0.02, 0.2);
  return Math.round(income * pct);
}

export const MONEY_EVENTS: EventDef[] = [
  {
    id: "black_tax", title: dual("Black tax", "Black tax"),
    weight: () => 0,
    init: (p) => ({ amount: blackTaxDemand(p), why: randInt(0, REASONS.length - 1) }),
    text: (p, d) => { const r = REASONS[Number(d.why)] ?? REASONS[0]; return T(`The family calls again: they need ${naira(Number(d.amount))} for ${r[0]}. 'You are the one who made it.'`, `Family call again: dem need ${naira(Number(d.amount))} for ${r[1]}. 'Na you make am.'`); },
    choices: (p, d) => {
      const amt = Number(d.amount);
      return [
        { label: T("Pay it in full", "Pay am full"), sub: naira(amt), disabled: p.money < amt ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -amt, reason: T("Black tax to the family", "Black tax for family"), category: "family" }); q.family.happy = clamp(q.family.happy + 8); q.luck = clamp(q.luck + 2); bump(q, "reputation", 1); return T("Mama prays for you for ten minutes. Maybe it helps.", "Mama pray for you for ten minutes. Maybe e go help."); } },
        { label: T("Pay half and explain", "Pay half and explain"), sub: naira(Math.round(amt / 2)), disabled: p.money < amt / 2 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -Math.round(amt / 2), reason: T("Part of the black tax", "Part of black tax"), category: "family" }); q.family.happy = clamp(q.family.happy + 2); return T("They accept, with a sigh and a long lecture.", "Dem gree, with sigh and long lecture."); } },
        { label: T("Tell them you cannot", "Tell dem say you no fit"), run: (q) => { q.family.happy = clamp(q.family.happy - 9); q.luck = clamp(q.luck - 2); bump(q, "stress", 4); return T("The family WhatsApp group goes cold. 'Success has changed you.'", "Family WhatsApp group go cold. 'Success don change you.'"); } },
      ];
    },
  },
];

/** Once a year, if you are earning, the family comes asking. */
export function blackTaxYear(p: Player, pending: import("./types").Pending[]) {
  if (p.age < 21 || p.prison > 0) return;
  const amt = blackTaxDemand(p);
  if (amt < I(p, 40_000)) return;
  if (!chance(0.75)) return;
  pending.push({ kind: "event", id: "black_tax", data: { amount: amt, why: randInt(0, REASONS.length - 1), month: randInt(1, 12) } });
}

// ---------------------------------------------------------------------------
// Politics feeds the economy: governors and presidents set the weather
// ---------------------------------------------------------------------------
export const POLICY_EVENTS: EventDef[] = [
  {
    id: "policy_choice", title: dual("A policy decision", "Policy decision"),
    weight: (p) => ((p.politics?.office ?? -1) >= 4 ? 2.4 : 0),
    text: (p) => T(`As ${(p.politics?.office ?? 0) >= 5 ? "President" : "Governor"}, your advisers lay out three options for the economy. Whatever you choose will be felt in every market, shop and pay packet, including yours.`, `As ${(p.politics?.office ?? 0) >= 5 ? "President" : "Governor"}, your advisers show you three options for the economy. Wetin you choose go reach every market, shop and pay, even yours.`),
    choices: (p) => [
      { label: T("Remove the fuel subsidy", "Remove fuel subsidy"), sub: T("Pain now, growth later", "Pain now, growth later"), run: (q) => { q.world ??= { until: {}, news: [] }; q.world.until.fuel = q.age + 2; bump(q, "reputation", -5); q.flags.reformBoom = q.age + 3; return T("Protests, queues and furious headlines. The treasury breathes.", "Protest, queue and angry headline. Treasury breathe."); } },
      { label: T("Invest in power and roads", "Invest for power and roads"), sub: naira(I(p, 20_000_000)), disabled: p.money < I(p, 20_000_000) ? T("Not enough cash", "Cash no reach") : false, run: (q) => { q.world ??= { until: {}, news: [] }; transact(q, { amount: -Math.round(I(q, 20_000_000)), reason: T("Public investment", "Public investment"), category: "other" }); q.world.until.grid = -1; if (chance(0.65)) q.flags.reformBoom = q.age + 2; bump(q, "reputation", 4); return T("Better light, better roads, slowly better business.", "Better light, better road, slowly better business."); } },
      { label: T("Print money and spend", "Print money and spend"), sub: T("A quick boom, an expensive hangover", "Quick boom, expensive hangover"), run: (q) => { q.world ??= { until: {}, news: [] }; q.world.until.boom = q.age + 1; q.index *= 1.03; if (chance(0.5)) q.flags.reformBust = q.age + 2; bump(q, "reputation", 1); return T("Salaries rise, prices rise faster. Everyone is happy for about a year.", "Salary go up, price go up faster. Everybody happy for like one year."); } },
      { label: T("Do nothing", "Do nothing"), run: (q) => { bump(q, "reputation", -1); return T("Drift is also a decision.", "To drift na decision too."); } },
    ],
  },
];

/** Called once a year after inflation is known. */
function policyAftermath(p: Player, lines: string[]) {
  p.world ??= { until: {}, news: [] };
  if (p.flags.reformBoom === p.age) { p.world.until.boom = p.age + 3; lines.push(T("The reforms start to pay off: the economy picks up.", "The reforms start to work: economy dey pick up.")); delete p.flags.reformBoom; }
  if (p.flags.reformBust === p.age) { p.world.until.recession = p.age + 2; lines.push(T("The spending binge catches up with the economy: a recession begins.", "The spending binge catch up with economy: recession don start.")); delete p.flags.reformBust; }
}
function cityYear(p: Player) {
  if (p.age < 20 || p.age > 62) return;
  if (p.state === "abuja" && (p.job || p.politics)) bump(p, "connections", 1);
  if (p.state === "lagos") bump(p, "stress", 1);
}

/** Called once a year after inflation is known. */
export function econYear(p: Player, inflation: number, lines: string[], pending: import("./types").Pending[]) {
  yearlyEcon(p, inflation, lines);
  statusYear(p, lines);
  blackTaxYear(p, pending);
  policyAftermath(p, lines);
  cityYear(p);
  void luckBonus;
}
