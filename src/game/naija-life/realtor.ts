import { HOUSE_KINDS } from "./data";
import { I, bump, randomName } from "./helpers";
import { transact } from "./ledger";
import { LOCATION_BY_ID } from "./locations";
import type { HouseKind, Listing, Player, RealtorClient } from "./types";
import { T, chance, clamp, naira, pick, rand, randInt, uid } from "./util";

/** Real estate agents earn commission by matching clients to properties. */
export const isRealtor = (p: Player) => p.job?.id === "realtor" || p.businesses.some((b) => b.status === "open" && b.kind === "realestate");

const WANTS: { want: RealtorClient["want"]; kinds: HouseKind[] }[] = [
  { want: "buy", kinds: ["land", "land", "bungalow", "apartment", "duplex", "flats", "mansion"] },
  { want: "rent", kinds: ["apartment", "bungalow", "duplex", "apartment"] },
];

function newClient(p: Player): RealtorClient {
  const w = pick(WANTS);
  const kind = pick(w.kinds);
  const base = HOUSE_KINDS[kind].build * 0.9;
  const budget = Math.round(base * rand(0.6, 1.5) * Math.pow(p.index, 0.95));
  const male = chance(0.5);
  return { id: uid(), name: randomName(p.tribe, male ? "male" : "female"), want: w.want, kind, budget: w.want === "rent" ? Math.round(HOUSE_KINDS[kind].rent * rand(0.7, 1.4) * Math.pow(p.index, 0.95)) : budget, patience: randInt(1, 3), mood: randInt(40, 75) };
}

/** New clients each year, and the impatient ones leave. */
export function realtorYear(p: Player, lines: string[]) {
  if (!isRealtor(p)) { p.clients = undefined; return; }
  const list = (p.clients ?? []).map((c) => ({ ...c, patience: c.patience - 1 })).filter((c) => c.patience > 0);
  const fame = (p.stats.reputation + p.stats.connections) / 200;
  const incoming = randInt(1, 3) + (chance(fame) ? 1 : 0);
  for (let i = 0; i < incoming && list.length < 8; i++) list.push(newClient(p));
  p.clients = list;
  if (incoming > 0) lines.push(T(`${incoming} new client${incoming === 1 ? "" : "s"} contact you about property.`, `${incoming} new client contact you for property.`));
}

/** Properties to show a client, best fits first. */
export function candidatesFor(p: Player, c: RealtorClient): { l: Listing; fit: number }[] {
  return (p.listings ?? [])
    .map((l) => {
      const price = c.want === "rent" ? Math.round(l.value * (LOCATION_BY_ID[l.loc ?? ""]?.yield ?? 0.07)) : l.price;
      const budgetFit = price <= c.budget ? 1 - Math.max(0, (c.budget - price) / c.budget) * 0.3 : Math.max(0, 1 - (price - c.budget) / c.budget * 2.5);
      const kindFit = l.kind === c.kind ? 1 : 0.35;
      const condFit = l.condition === "good" ? 1 : l.condition === "fair" ? 0.85 : 0.6;
      return { l, fit: Math.round(budgetFit * kindFit * condFit * 100) };
    })
    .filter((x) => x.fit > 5)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 5);
}

export function realtorBlock(p: Player): string | null {
  if (p.prison > 0) return T("In prison", "You dey prison");
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain this year");
  if (!isRealtor(p)) return T("You are not an estate agent", "You no be estate agent");
  return null;
}

export function showProperty(p: Player, clientId: string, listingId: string): string {
  const block = realtorBlock(p);
  if (block) return block;
  const c = p.clients?.find((x) => x.id === clientId);
  const hit = c ? candidatesFor(p, c).find((x) => x.l.id === listingId) : undefined;
  if (!c || !hit) return "";
  p.actionsLeft -= 1;
  const odds = clamp(0.1 + hit.fit / 140 + (p.skills.sales ?? 0) / 250 + p.stats.reputation / 400 + p.stats.connections / 500 + (c.mood - 50) / 300, 0.05, 0.92);
  if (chance(odds)) {
    const rate = c.want === "buy" ? 0.03 : 0.1;
    const base = c.want === "buy" ? hit.l.price : Math.round(hit.l.value * (LOCATION_BY_ID[hit.l.loc ?? ""]?.yield ?? 0.07));
    const commission = Math.round(base * rate);
    transact(p, { amount: commission, reason: T(`Commission: ${c.name}'s ${HOUSE_KINDS[hit.l.kind].label.toLowerCase()}`, `Commission: ${c.name} ${HOUSE_KINDS[hit.l.kind].label.toLowerCase()}`), category: "business" });
    bump(p, "reputation", 1);
    bump(p, "connections", 1);
    p.clients = p.clients!.filter((x) => x.id !== c.id);
    p.dealsClosed = (p.dealsClosed ?? 0) + 1;
    if (p.job?.id === "realtor") {
      const next = p.dealsClosed >= 25 ? 3 : p.dealsClosed >= 10 ? 2 : p.dealsClosed >= 3 ? 1 : 0;
      if (p.job.rank < next) p.job.rank = next;
    }
    return T(`${c.name} signs. Your commission: ${naira(commission)}.`, `${c.name} don sign. Your commission: ${naira(commission)}.`);
  }
  c.mood = clamp(c.mood - 14);
  if (c.mood < 20 || chance(0.25)) { p.clients = p.clients!.filter((x) => x.id !== c.id); return T(`${c.name} is not impressed and goes to another agent.`, `${c.name} no impress and go find another agent.`); }
  return T(`${c.name} is not sold on it: 'Show me something else.'`, `${c.name} no gree: 'Show me another one.'`);
}

/** Pay to hunt for new clients. */
export function findClients(p: Player): string {
  const block = realtorBlock(p);
  if (block) return block;
  const cost = I(p, 25_000);
  if (p.money < cost) return T(`Needs ${naira(cost)} for adverts and transport.`, `E need ${naira(cost)} for advert and transport.`);
  transact(p, { amount: -cost, reason: T("Property adverts and site visits", "Property advert and site visit"), category: "business" });
  p.actionsLeft -= 1;
  const list = p.clients ?? [];
  const add = Math.min(8 - list.length, randInt(1, 3));
  for (let i = 0; i < add; i++) list.push(newClient(p));
  p.clients = list;
  return add > 0 ? T(`${add} new client${add === 1 ? "" : "s"} call after your adverts.`, `${add} new client call after your advert.`) : T("Your client list is full.", "Your client list don full.");
}
