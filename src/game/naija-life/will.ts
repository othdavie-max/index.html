import { bizValue } from "./business";
import { totalDebt } from "./loans";
import type { Player, WillShare } from "./types";
import { chance, clamp } from "./util";

export interface Beneficiary {
  id: string;
  label: string;
  kind: "spouse" | "kid" | "parent" | "sibling" | "charity";
}

/** Everyone the player could name in a will. */
export function beneficiaries(p: Player): Beneficiary[] {
  const out: Beneficiary[] = [];
  if (p.spouse) out.push({ id: "spouse", label: `${p.spouse.name} (spouse)`, kind: "spouse" });
  p.kids.forEach((k, i) => out.push({ id: `kid:${i}`, label: `${k.name} (${k.gender === "male" ? "son" : "daughter"}, ${k.age})`, kind: "kid" }));
  for (const n of Object.values(p.npcs)) {
    if (!n.alive) continue;
    if (["dad", "mom", "grandparent"].includes(n.role)) out.push({ id: `npc:${n.id}`, label: `${n.name} (parent)`, kind: "parent" });
    if (n.role === "sibling") out.push({ id: `npc:${n.id}`, label: `${n.name} (sibling)`, kind: "sibling" });
  }
  out.push({ id: "charity", label: "Charity and community", kind: "charity" });
  return out;
}

/** What happens with no will: the law favours spouse and children. */
export function intestateShares(p: Player): WillShare[] {
  const kids = p.kids.length;
  const shares: WillShare[] = [];
  if (p.spouse && kids > 0) {
    shares.push({ id: "spouse", pct: 33 });
    p.kids.forEach((_, i) => shares.push({ id: `kid:${i}`, pct: Math.round(67 / kids) }));
  } else if (p.spouse) {
    shares.push({ id: "spouse", pct: 100 });
  } else if (kids > 0) {
    p.kids.forEach((_, i) => shares.push({ id: `kid:${i}`, pct: Math.round(100 / kids) }));
  }
  return shares;
}

export function currentShares(p: Player): WillShare[] {
  return p.will?.shares ?? intestateShares(p);
}

export function defaultWillShares(p: Player): WillShare[] {
  return intestateShares(p);
}

export function setShare(p: Player, id: string, pct: number) {
  if (!p.will) p.will = { shares: intestateShares(p).map((s) => ({ ...s })), updatedAge: p.age };
  const w = p.will;
  const s = w.shares.find((x) => x.id === id);
  if (s) s.pct = clamp(pct, 0, 100);
  else w.shares.push({ id, pct: clamp(pct, 0, 100) });
  w.shares = w.shares.filter((x) => x.pct > 0);
  w.updatedAge = p.age;
}

export const totalPct = (shares: WillShare[]) => shares.reduce((s, x) => s + x.pct, 0);

export interface EstatePlan {
  heirFraction: number;
  disputeChance: number;
  others: { label: string; pct: number }[];
  hasWill: boolean;
  charityPct: number;
}

/** Share of the estate for the chosen heir, and how likely a family dispute is. */
export function planEstate(p: Player, heirKid: number): EstatePlan {
  const hasWill = Boolean(p.will) && totalPct(p.will!.shares) > 0;
  let shares = currentShares(p);
  const total = totalPct(shares) || 100;
  shares = shares.map((s) => ({ ...s, pct: (s.pct / total) * 100 }));
  const heirShare = shares.find((s) => s.id === `kid:${heirKid}`)?.pct ?? 0;
  const labels = Object.fromEntries(beneficiaries(p).map((b) => [b.id, b.label]));
  const others = shares.filter((s) => s.id !== `kid:${heirKid}`).map((s) => ({ label: labels[s.id] ?? s.id, pct: Math.round(s.pct) }));
  const charityPct = shares.find((s) => s.id === "charity")?.pct ?? 0;
  const kidShares = shares.filter((s) => s.id.startsWith("kid:")).map((s) => s.pct);
  const inequity = kidShares.length > 1 ? (Math.max(...kidShares) - Math.min(...kidShares)) / 100 : 0;
  const wealth = estateValue(p);
  const dispute = clamp(0.06 + (hasWill ? 0 : 0.22) + inequity * 0.4 + (wealth > 200_000_000 * p.index ? 0.1 : 0) + (p.kids.length > 2 ? 0.05 : 0), 0.03, 0.8);
  return { heirFraction: heirShare / 100, disputeChance: dispute, others, hasWill, charityPct };
}

export function estateValue(p: Player): number {
  const houses = p.houses.reduce((s, h) => s + h.value, 0);
  const hold = p.holdings.reduce((s, h) => s + h.value, 0);
  const cars = p.vehicles.reduce((s, v) => s + v.value, 0);
  return Math.max(0, p.money + houses + hold + cars + bizValue(p) - totalDebt(p));
}

export const willDispute = (plan: EstatePlan) => chance(plan.disputeChance);
