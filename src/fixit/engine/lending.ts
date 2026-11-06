/**
 * Lending abroad. Once the country is nearly debt-free, other countries come to Nigeria for money. A loan earns
 * interest, buys influence, and can go bad. A savings fund keeps the surplus safe. All countries are fictional.
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState, Loan } from "./types";
import { clamp100, nb, pushNews } from "./util";
import { createEvent } from "./spawn";
import { debtView } from "./debt";

export const LEND_OPEN_AT = 10;
export const lendingOpen = (s: FixState) => debtView(s).pctGdp < LEND_OPEN_AT;
export const outstanding = (s: FixState) => s.lend.loans.filter((l) => l.status === "performing" || l.status === "defaulted").reduce((a, l) => a + l.amountUsd, 0);
export const earnedTotal = (s: FixState) => s.lend.loans.reduce((a, l) => a + l.earned, 0);
const borrowerOf = (s: FixState, id: string) => s.mil.neighbours.find((n) => n.id === id);

export function depositFund(s: FixState, bn: number): { ok: boolean; message: string } {
  if (!lendingOpen(s)) return { ok: false, message: "A savings fund opens when debt is below 10% of the economy." };
  const room = Math.max(0, s.fin.treasury - 400 * (0.6 + 0.4 * s.eco.priceLevel / 100));
  if (!(bn > 0) || bn > room) return { ok: false, message: `You can spare at most ${nb(room)}.` };
  s.fin.treasury -= bn; s.lend.fund += bn; return { ok: true, message: `${nb(bn)} moved into the savings fund.` };
}
export function withdrawFund(s: FixState, bn: number): { ok: boolean; message: string } {
  if (!(bn > 0) || bn > s.lend.fund) return { ok: false, message: "The fund does not have that much." };
  s.lend.fund -= bn; s.fin.treasury += bn; return { ok: true, message: `${nb(bn)} returned to the treasury.` };
}

export function lendingMonthly(s: FixState, rng: Rng) {
  s.lend.fund *= 1 + 0.0033; // about 4% a year
  for (const l of s.lend.loans) {
    if (l.status !== "performing") continue;
    const income = (l.amountUsd * l.rate / 1200) * s.eco.fx; s.fin.treasury += income; l.earned += income / s.eco.fx;
    const b = borrowerOf(s, l.borrower);
    if (s.month >= l.start + l.term) { l.status = "repaid"; s.fin.treasury += l.amountUsd * s.eco.fx; s.eco.reserves += l.amountUsd * 0.5; pushNews(s, { source: `loanpaid:${l.id}`, headline: `${b?.name ?? l.borrower} repays its $${l.amountUsd}bn loan in full`, body: "Nigeria has earned interest and goodwill.", tone: "good" }); continue; }
    if (b && rng.chance(0.002 + 0.00012 * Math.max(0, 55 - b.stability)) && !s.events.some((e) => e.tpl === "loanDefault" && e.status === "open")) { l.status = "defaulted"; s.flags.defLoan = l.id; createEvent(s, "loanDefault", "NG-FC"); }
  }
  const open = (t: string) => s.events.some((e) => e.tpl === t && e.status === "open");
  if (lendingOpen(s) && !open("lendOffer") && s.month - Number(s.flags.lastLend ?? -99) >= 9 && s.mil.neighbours.length && rng.chance(0.14)) { s.flags.lastLend = s.month; s.flags.lendBorrower = rng.pick(s.mil.neighbours).id; s.flags.lendAmt = rng.int(1, 4); s.flags.lendRate = 4 + rng.int(0, 5); createEvent(s, "lendOffer", "NG-FC"); }
}
const loan = (s: FixState) => s.lend.loans.find((l) => l.id === s.flags.defLoan);
const addLoan = (s: FixState, rate: number, strings: string) => {
  const amt = Number(s.flags.lendAmt ?? 2), b = String(s.flags.lendBorrower);
  const l: Loan = { id: `ln${s.lend.loans.length + 1}`, borrower: b, amountUsd: amt, rate, start: s.month, term: 36, status: "performing", strings, earned: 0 };
  s.fin.treasury -= amt * s.eco.fx; s.lend.loans.push(l);
  const n = borrowerOf(s, b); if (n) { n.mood = clamp100(n.mood + 12); n.stability = clamp100(n.stability + 6); }
  s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 4);
  return l;
};
export const LEND_TEMPLATES = [
  {
    id: "lendOffer", kind: "opportunity" as const, urgency: 4,
    title: (s: FixState) => `${borrowerOf(s, String(s.flags.lendBorrower))?.name ?? "A neighbour"} asks Nigeria for a loan`,
    cause: (s: FixState) => { const n = borrowerOf(s, String(s.flags.lendBorrower)); return `Nigeria is nearly debt-free, so ${n?.name ?? "a neighbour"} has come to Abuja asking for $${s.flags.lendAmt}bn over three years at ${s.flags.lendRate}%. Their stability is ${Math.round(n?.stability ?? 50)}/100. A loan earns interest and influence, and ${(n?.stability ?? 50) < 45 ? "this one is risky" : "they look like a decent borrower"}.`; },
    options: [
      { id: "lend", label: "Lend on their terms", explain: "Interest income and friendship.", cost: 0, tradeoff: "If they default, you lose money.", unc: "medium" as const, chance: () => 0.97, win: { run: (s: FixState) => { const l = addLoan(s, Number(s.flags.lendRate ?? 5), "none"); return `Signed: $${l.amountUsd}bn at ${l.rate}%. Their president thanked you on live TV.`; } }, lose: {}, winText: "", loseText: "" },
      { id: "terms", label: "Lend at a higher rate with a condition: they back you at the AU", explain: "Drive a harder bargain.", cost: 0, tradeoff: "They may walk away.", unc: "high" as const, chance: () => 0.55, win: { run: (s: FixState) => { const l = addLoan(s, Number(s.flags.lendRate ?? 5) + 3, "votes"); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 3); return `They accepted: $${l.amountUsd}bn at ${l.rate}%, and a seat at your side in every AU vote.`; } }, lose: { run: (s: FixState) => { const n = borrowerOf(s, String(s.flags.lendBorrower)); if (n) n.mood = clamp100(n.mood - 6); return "They left, offended, and found another lender."; } }, winText: "", loseText: "" },
      { id: "no", label: "Decline politely", explain: "Keep the money at home.", cost: 0, tradeoff: "A missed chance at influence.", unc: "low" as const, chance: () => 1, win: { run: () => "They thanked you and left for another capital." }, lose: {}, winText: "", loseText: "" },
    ],
    expire: {}, expireText: () => "",
  },
  {
    id: "loanDefault", kind: "case" as const, urgency: 2,
    title: (s: FixState) => `${borrowerOf(s, loan(s)?.borrower ?? "")?.name ?? "A borrower"} cannot repay its loan to Nigeria`,
    cause: (s: FixState) => { const l = loan(s); return `${borrowerOf(s, l?.borrower ?? "")?.name ?? "The borrower"} says it cannot pay back $${l?.amountUsd ?? 0}bn. The treasury is waiting, and every other country is watching what Nigeria does.`; },
    options: [
      { id: "forgive", label: "Forgive the debt", explain: "Generosity as foreign policy.", cost: 0, tradeoff: "You lose the money.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { const l = loan(s); if (l) l.status = "forgiven"; s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 8); s.gov.trust = clamp100(s.gov.trust - 1); return "The AU hailed your 'African solidarity'. Your finance minister quietly wept."; } }, lose: {}, winText: "", loseText: "" },
      { id: "restructure", label: "Restructure: longer term, lower rate", explain: "Get some of it back.", cost: 0, tradeoff: "May still fail.", unc: "medium" as const, chance: () => 0.6, win: { run: (s: FixState) => { const l = loan(s); if (l) { l.status = "performing"; l.rate = Math.max(2, l.rate - 2); l.term += 24; } return "A new schedule was agreed. The borrower promised to pay."; } }, lose: { run: (s: FixState) => { const l = loan(s); if (l) l.status = "forgiven"; s.gov.trust = clamp100(s.gov.trust - 2); return "The talks failed and the loan was written off quietly."; } }, winText: "", loseText: "" },
      { id: "seize", label: "Seize collateral", explain: "Take assets as payment.", cost: 0, tradeoff: "Bitter relations, and the world notices.", unc: "high" as const, chance: () => 0.7, win: { run: (s: FixState) => { const l = loan(s); if (l) { l.status = "repaid"; s.fin.treasury += l.amountUsd * 0.6 * s.eco.fx; } s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 12); s.rule.intlPressure = clamp100(s.rule.intlPressure + 4); const n = borrowerOf(s, loan(s)?.borrower ?? ""); if (n) n.mood = clamp100(n.mood - 20); return "Port revenues were taken as payment. Their president called it colonialism."; } }, lose: { run: (s: FixState) => { const l = loan(s); if (l) l.status = "forgiven"; s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 8); return "Collateral seizure failed and became a diplomatic crisis."; } }, winText: "", loseText: "" },
    ],
    expire: { trust: -1 }, expireText: () => "The default was left unresolved.",
  },
];
