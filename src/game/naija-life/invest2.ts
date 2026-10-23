import { I, bump, luckBonus } from "./helpers";
import { transact } from "./ledger";
import { LOCATIONS, locationOf } from "./locations";
import type { EventDef, House, Pending, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt, uid } from "./util";

/** Nigerian ways to put money to work, with the traps. Stored in flags so older saves keep working. */
export type PosKind = "agric" | "land" | "offplan" | "ponzi" | "ajo";
export interface Pos {
  id: string;
  kind: PosKind;
  name: string;
  put: number;
  value: number;
  since: number;
  /** Years held. */
  yrs: number;
  dead?: boolean;
  note?: string;
  meta?: Record<string, number | string | boolean>;
}
export const positions = (p: Player): Pos[] => { try { return JSON.parse(String(p.flags.inv2 ?? "[]")) as Pos[]; } catch { return []; } };
const save = (p: Player, a: Pos[]) => { p.flags.inv2 = JSON.stringify(a); };

export interface Offer { id: string; kind: PosKind; emoji: string; en: string; pcm: string; min: number; blurb: [string, string] }
export const OFFERS: Offer[] = [
  { id: "agric", kind: "agric", emoji: "🌾", en: "Agric crowdfunding", pcm: "Agric crowdfunding", min: 100_000, blurb: ["Fund a farm for a year. Most pay 20-45%, some fail, a few are fake.", "Fund farm for one year. Most pay 20-45%, some fail, few na fake."] },
  { id: "land", kind: "land", emoji: "🗺️", en: "Land in an emerging area", pcm: "Land for developing area", min: 2_000_000, blurb: ["Cheap now. If the road or estate arrives, it multiplies. If land grabbers arrive, it halves.", "Cheap now. If road or estate reach there, e go multiply. If land grabber come, e go half."] },
  { id: "offplan", kind: "offplan", emoji: "🏗️", en: "Off-plan house", pcm: "Off-plan house", min: 8_000_000, blurb: ["Pay now, collect the house in 2-4 years. Delays are common. Some developers disappear.", "Pay now, collect house after 2-4 years. Delay dey common. Some developer dey disappear."] },
  { id: "ponzi", kind: "ponzi", emoji: "🪙", en: "High-yield platform", pcm: "High-yield platform", min: 200_000, blurb: ["Pays 40% a year on paper. Everyone is cashing out. Until nobody can.", "E dey pay 40% a year for paper. Everybody dey cash out. Until nobody fit."] },
  { id: "ajo", kind: "ajo", emoji: "🤲🏾", en: "Ajo / esusu group", pcm: "Ajo / esusu group", min: 20_000, blurb: ["Pay monthly into a pot. Each month one member collects. Trust the collector.", "Pay monthly for pot. Every month one person go collect. Trust the collector."] },
];
export const PLATFORM_NAMES = ["NairaDouble", "AlphaYield", "GoldenMonth", "CryptoBeeX", "PrimeFlow", "SureBank Club", "TripleUp"];
const AREAS = () => LOCATIONS.filter((l) => l.tier <= 3 && l.kinds.land);

export function invBlock(p: Player, kind: PosKind, amount: number): string | null {
  const o = OFFERS.find((x) => x.kind === kind)!;
  if (p.age < 18) return T("Adults only", "Na only grown-ups");
  if (p.prison > 0) return T("Not from prison", "No fit from prison");
  const min = Math.round(I(p, o.min));
  if (amount < min) return T(`Minimum ${naira(min)}`, `Minimum ${naira(min)}`);
  if (p.money < amount) return T("Not enough cash", "Cash no reach");
  if (kind === "ajo" && positions(p).filter((x) => x.kind === "ajo" && !x.dead).length >= 2) return T("Two groups is enough", "Two group don enough");
  return null;
}

export function buyPosition(p: Player, kind: PosKind, amount: number): string {
  const b = invBlock(p, kind, amount);
  if (b) return b;
  const list = positions(p);
  const o = OFFERS.find((x) => x.kind === kind)!;
  const base: Pos = { id: uid(), kind, name: T(o.en, o.pcm), put: amount, value: amount, since: p.age, yrs: 0 };
  if (kind === "ajo") {
    const members = randInt(6, 12);
    base.meta = { monthly: amount, members, turn: randInt(1, members), paid: 0 };
    base.name = T(`Ajo group (${members} members)`, `Ajo group (${members} people)`);
    base.value = 0; base.put = 0;
    list.push(base); save(p, list);
    return T(`You join an ajo of ${members} people at ${naira(amount)} a month. Your turn comes in month ${base.meta.turn}.`, `You join ajo of ${members} people, ${naira(amount)} every month. Your turn na month ${base.meta.turn}.`);
  }
  transact(p, { amount: -amount, reason: T(`Put money into: ${o.en}`, `Put money inside: ${o.pcm}`), category: "investment" });
  if (kind === "land") {
    const a = pick(AREAS());
    base.name = T(`Plot in ${a.name}`, `Plot for ${a.name}`);
    base.meta = { loc: a.id, phase: "quiet", left: 0 };
  } else if (kind === "ponzi") {
    base.name = pick(PLATFORM_NAMES);
    base.meta = { rate: 0.4, cap: randInt(2, 6) };
  } else if (kind === "offplan") {
    base.name = T(`Off-plan house (${pick(["Lekki", "Abuja", "Ibadan", "Enugu", "Port Harcourt"])})`, `Off-plan house (${pick(["Lekki", "Abuja", "Ibadan", "Enugu", "Port Harcourt"])})`);
    base.meta = { due: randInt(2, 4), delays: 0 };
  } else if (kind === "agric") {
    base.name = pick([T("Cassava farm project", "Cassava farm project"), T("Rice out-growers scheme", "Rice out-growers scheme"), T("Poultry and eggs", "Poultry and eggs"), T("Cocoa plantation", "Cocoa plantation"), T("Maize cooperative", "Maize cooperative")]);
    base.meta = { fake: chance(0.16) };
  }
  list.push(base); save(p, list);
  return T(`You put ${naira(amount)} into ${base.name}.`, `You put ${naira(amount)} inside ${base.name}.`);
}

export function sellPosition(p: Player, id: string): string {
  const list = positions(p);
  const x = list.find((q) => q.id === id);
  if (!x) return "";
  if (x.kind === "ajo") {
    const m = x.meta as { paid: number; members: number };
    if (m.paid < m.members) { p.stats.reputation = clamp(p.stats.reputation - 8); save(p, list.filter((q) => q.id !== id)); return T("You walk out of the ajo group. You lose what you paid and the members will remember.", "You comot from ajo group. You lose wetin you pay and members go remember."); }
    save(p, list.filter((q) => q.id !== id)); return T("The ajo cycle is complete.", "The ajo cycle don complete.");
  }
  if (x.kind === "offplan") return T("You cannot sell an off-plan house until it is delivered.", "You no fit sell off-plan house till dem deliver am.");
  if (x.kind === "agric") return T("Your money is tied up in the farm until harvest.", "Your money dey tie for farm till harvest.");
  if (x.dead || x.value <= 0) { save(p, list.filter((q) => q.id !== id)); return T("You write it off.", "You write am off."); }
  const fee = x.kind === "land" ? 0.06 : 0;
  const amt = Math.round(x.value * (1 - fee));
  transact(p, { amount: amt, reason: T(`Sold: ${x.name}`, `Sold: ${x.name}`), category: "investment" });
  save(p, list.filter((q) => q.id !== id));
  return x.kind === "ponzi" ? T(`You cash out ${naira(amt)} from ${x.name} while it is still paying. Smart, or lucky.`, `You cash out ${naira(amt)} from ${x.name} while e still dey pay. Smart, or lucky.`) : T(`You sell for ${naira(amt)}.`, `You sell for ${naira(amt)}.`);
}

/** Monthly: ajo contributions and payouts. */
export function inv2Month(p: Player, lines: string[]) {
  const list = positions(p);
  let changed = false;
  for (const x of list) {
    if (x.kind !== "ajo" || x.dead) continue;
    const m = x.meta as { monthly: number; members: number; turn: number; paid: number };
    if (m.paid >= m.members) { x.dead = true; changed = true; continue; }
    const c = Math.round(m.monthly);
    if (p.money < c) { p.stats.reputation = clamp(p.stats.reputation - 3); lines.push(T("You miss an ajo contribution. The group is not happy.", "You miss ajo contribution. The group no happy.")); continue; }
    transact(p, { amount: -c, reason: T(`Ajo contribution (${x.name})`, `Ajo contribution (${x.name})`), category: "investment" });
    m.paid += 1; x.put += c; changed = true;
    if (m.paid === m.turn) {
      const pot = Math.round(m.monthly * m.members * 0.97);
      transact(p, { amount: pot, reason: T("Ajo payout: your turn", "Ajo payout: your turn"), category: "investment" });
      x.value = 0;
      lines.push(T(`It is your turn in the ajo: ${naira(pot)} lands in your account.`, `Na your turn for ajo: ${naira(pot)} enter your account.`));
    }
    // The collector may run before everyone has collected.
    if (m.paid < m.turn && chance(0.012)) {
      x.dead = true; changed = true;
      lines.push(T(`The ajo collector has disappeared with the pot. You lost ${naira(x.put)}.`, `Ajo collector don disappear with the pot. You lose ${naira(x.put)}.`));
      p.stats.stress = clamp(p.stats.stress + 8);
    }
  }
  if (changed) save(p, list.filter((q) => !(q.kind === "ajo" && q.dead && (q.meta as { paid: number; members: number }).paid >= (q.meta as { members: number }).members)));
}

function giveHouse(p: Player, x: Pos, mult: number): House {
  const loc = pick(LOCATIONS.filter((l) => l.tier >= 2 && l.tier <= 4 && l.kinds.duplex));
  const h: House = { id: uid(), state: loc.state, kind: "duplex", value: Math.round(x.put * mult), use: p.houses.some((q) => q.use === "owner" && q.state === loc.state) ? "empty" : "owner", loc: loc.id };
  p.houses.push(h);
  return h;
}

/** Yearly: things pay out, stall or collapse. */
export function inv2Year(p: Player, rate: number, lines: string[], pending: Pending[]) {
  const list = positions(p);
  const keep: Pos[] = [];
  for (const x of list) {
    x.yrs += 1;
    if (x.kind === "agric") {
      const m = x.meta as { fake: boolean };
      if (m.fake) { lines.push(T(`The agric platform '${x.name}' was a scam. ${naira(x.put)} is gone and the founders' phones are off.`, `The agric platform '${x.name}' na scam. ${naira(x.put)} don go and the founders phones off.`)); bump(p, "stress", 6); continue; }
      const r = rand(0, 1) - luckBonus(p) * 0.3;
      const mult = r < 0.2 ? 0.4 : rand(1.2, 1.45) + rate * 0.2;
      const back = Math.round(x.put * mult);
      transact(p, { amount: back, reason: T(`Harvest: ${x.name}`, `Harvest: ${x.name}`), category: "investment" });
      lines.push(mult < 1 ? T(`${x.name}: floods and bandits hit the farm. You get back only ${naira(back)}.`, `${x.name}: flood and bandits hit farm. You collect only ${naira(back)}.`) : T(`${x.name} harvest pays out: ${naira(back)}.`, `${x.name} harvest don pay: ${naira(back)}.`));
      continue;
    }
    if (x.kind === "land" && !x.dead) {
      const m = x.meta as { loc: string; phase: string; left: number };
      const loc = locationOf(m.loc);
      if (m.phase === "boom") { x.value = Math.round(x.value * (1 + rand(0.25, 0.5))); m.left -= 1; if (m.left <= 0) m.phase = "mature"; lines.push(T(`The estate near your plot in ${loc?.name ?? "the area"} is booming. Land value up.`, `Estate near your plot for ${loc?.name ?? "the area"} dey boom. Land value up.`)); }
      else if (m.phase === "quiet" && chance(0.25)) { m.phase = "boom"; m.left = randInt(2, 4); x.value = Math.round(x.value * 1.25); lines.push(T(`Good news: a road and a new estate are coming near your plot in ${loc?.name ?? "the area"}.`, `Good news: road and new estate dey come near your plot for ${loc?.name ?? "the area"}.`)); }
      else x.value = Math.round(x.value * (1 + rate * 0.8 + rand(0, 0.06)));
      if (chance(0.05)) { x.value = Math.round(x.value * 0.55); lines.push(T(`Land grabbers ('omo onile') claim your plot in ${loc?.name ?? "the area"}. Its value collapses until you settle them.`, `Omo onile claim your plot for ${loc?.name ?? "the area"}. Value fall until you settle them.`)); pending.push({ kind: "event", id: "land_grabbers", data: { posId: x.id, month: randInt(1, 12) } }); }
    }
    if (x.kind === "ponzi" && !x.dead) {
      const m = x.meta as { rate: number; cap: number };
      x.value = Math.round(x.value * (1 + m.rate));
      if (x.yrs >= m.cap || chance(0.12 + x.yrs * 0.05)) {
        x.dead = true; x.value = 0;
        lines.push(T(`${x.name} has collapsed. Withdrawals are 'temporarily suspended' and the founder is nowhere to be found.`, `${x.name} don collapse. Dem say withdrawal 'temporarily suspended' and the founder no dey anywhere.`));
        bump(p, "stress", 10); bump(p, "happiness", -8);
        if (x.meta && x.meta.referred) { for (const n of Object.values(p.npcs).filter((q) => q.alive && q.role === "friend").slice(0, 3)) n.closeness = clamp(n.closeness - 20); bump(p, "reputation", -6); lines.push(T("The friends you brought in blame you.", "The friends wey you bring in dey blame you.")); }
      } else if (chance(0.5)) lines.push(T(`Your friends are bragging about ${x.name} on WhatsApp: "Everybody is cashing out!"`, `Your padi dey brag about ${x.name} for WhatsApp: "Everybody dey cash out!"`));
    }
    if (x.kind === "offplan" && !x.dead) {
      const m = x.meta as { due: number; delays: number };
      if (chance(0.1)) { x.dead = true; x.value = 0; lines.push(T(`The developer of ${x.name} has vanished with the money.`, `The developer of ${x.name} don disappear with the money.`)); bump(p, "stress", 10); }
      else if (x.yrs >= m.due + m.delays) {
        if (chance(0.35) && m.delays < 3) { m.delays += 1; lines.push(T(`${x.name}: delivery delayed again. 'Because of the cost of cement.'`, `${x.name}: dem delay delivery again. 'Because of cement price.'`)); }
        else { const h = giveHouse(p, x, rand(1.4, 2.1)); lines.push(T(`Your off-plan house is delivered! Worth about ${naira(h.value)}.`, `Dem don deliver your off-plan house! E worth like ${naira(h.value)}.`)); bump(p, "happiness", 8); p.prestige += 1; continue; }
      }
    }
    keep.push(x);
  }
  save(p, keep.filter((x) => !(x.dead && x.kind !== "ajo" && x.yrs > 3)));
}

export const totalInv2 = (p: Player) => positions(p).filter((x) => !x.dead && x.kind !== "ajo").reduce((s, x) => s + x.value, 0);

export const INV2_EVENTS: EventDef[] = [
  {
    id: "land_grabbers", title: dual("Omo onile at your plot", "Omo onile for your plot"),
    weight: () => 0,
    text: () => T("Young men with machetes stand on your plot: 'Pay your own fee, or this land is not yours.' A neighbour says a lawyer can sort it, slowly.", "Young men with matchet dey stand for your plot: 'Pay your own fee, or this land no be your own.' Neighbour say lawyer fit settle am, slowly."),
    choices: (p, d) => {
      const x = positions(p).find((q) => q.id === String(d.posId));
      const fee = Math.round((x?.put ?? 2_000_000) * 0.08);
      const fix = (q: Player, mult: number) => { const l = positions(q); const y = l.find((z) => z.id === String(d.posId)); if (y) { y.value = Math.round(y.value * mult); save(q, l); } };
      return [
        { label: T("Pay them off", "Pay dem"), sub: naira(fee), disabled: p.money < fee ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -fee, reason: T("Settling omo onile", "Settle omo onile"), category: "investment" }); fix(q, 1.5); return T("They collect the money, shake your hand and vanish. Your land recovers.", "Dem collect money, shake your hand and vanish. Your land recover."); } },
        { label: T("Hire a lawyer", "Hire lawyer"), sub: naira(Math.round(fee * 0.6)), disabled: p.money < fee * 0.6 ? T("Not enough cash", "Cash no reach") : false, run: (q) => { transact(q, { amount: -Math.round(fee * 0.6), reason: T("Lawyer for a land dispute", "Lawyer for land dispute"), category: "legal" }); if (chance(0.6)) { fix(q, 1.6); return T("The court confirms your title. It takes a year, but it works.", "Court confirm your title. E take one year, but e work."); } q.stats.stress = clamp(q.stats.stress + 6); return T("The case drags on. The land is stuck.", "Case dey drag. The land don stuck."); } },
        { label: T("Ignore it", "Ignore am"), run: () => T("You hope the problem goes away. It does not.", "You hope say the problem go go. E no go.") },
      ];
    },
  },
  {
    id: "ponzi_referral", title: dual("Bring your friends", "Bring your padi"),
    weight: (p) => (positions(p).some((x) => x.kind === "ponzi" && !x.dead && !x.meta?.referred) ? 3 : 0),
    text: (p) => T(`${positions(p).find((x) => x.kind === "ponzi" && !x.dead)?.name ?? "The platform"} sends a message: 'Refer 3 friends and get 25% more on your balance!' Your friends keep asking how to join.`, `${positions(p).find((x) => x.kind === "ponzi" && !x.dead)?.name ?? "The platform"} send message: 'Refer 3 friends and get 25% more for your balance!' Your padi dey ask how to join.`),
    choices: () => [
      { label: T("Refer your friends", "Refer your padi"), sub: T("+25% on paper, but they lose if it collapses", "+25% for paper, but dem go lose if e collapse"), run: (q) => { const l = positions(q); const x = l.find((z) => z.kind === "ponzi" && !z.dead && !z.meta?.referred); if (x) { x.value = Math.round(x.value * 1.25); x.meta = { ...(x.meta ?? {}), referred: true }; save(q, l); } q.stats.connections = clamp(q.stats.connections + 2); return T("Your balance jumps. Your friends say thank you, for now.", "Your balance jump. Your padi say thank you, for now."); } },
      { label: T("Keep it to yourself", "Keep am for yourself"), run: (q) => { q.stats.reputation = clamp(q.stats.reputation + 1); return T("You do not drag anyone in. Your conscience is clean.", "You no drag anybody enter. Your conscience clean."); } },
      { label: T("Cash out now", "Cash out now"), run: (q) => { const l = positions(q); const x = l.find((z) => z.kind === "ponzi" && !z.dead); if (x) return sellPosition(q, x.id); return ""; } },
    ],
  },
];
