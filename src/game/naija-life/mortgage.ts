import { HOUSE_KINDS } from "./data";
import { monthIndex, transact } from "./ledger";
import { previewLoan, takeLoan, type LoanOffer, type LoanPreview } from "./loans";
import { stateOf, bump } from "./helpers";
import type { House, HouseKind, Player } from "./types";
import { naira, uid } from "./util";

const price = (p: Player, kind: HouseKind) => Math.round(HOUSE_KINDS[kind].build * stateOf(p).cost * Math.pow(p.index, 0.95));

const OFFER: LoanOffer = {
  id: "mortgage", name: "Unity Bank mortgage", type: "bank", blurb: "", monthlyRate: 0.0165, feePct: 0.01,
  minTerm: 60, maxTerm: 240, limit: Infinity, lateFeePct: 0.03, eligible: null,
};

export interface MortgageQuote extends LoanPreview {
  kind: HouseKind;
  price: number;
  down: number;
  years: number;
  apr: number;
  block: string | null;
}

/** Terms shown to the player before they commit. */
export function mortgageQuote(p: Player, kind: HouseKind, years: number): MortgageQuote {
  const pr = price(p, kind);
  const down = Math.round(pr * (p.credit >= 75 ? 0.2 : 0.3));
  const principal = pr - down;
  const term = Math.min(Math.max(years * 12, OFFER.minTerm), OFFER.maxTerm);
  const prev = previewLoan(p, OFFER, principal, term);
  const income = p.fin.length ? p.fin[p.fin.length - 1].income : 0;
  let block: string | null = null;
  if (p.age < 21) block = "Mortgages start at age 21";
  else if (kind === "land") block = "Banks do not give mortgages for bare land";
  else if (stateOf(p).abroad) block = "Not available abroad";
  else if (p.prison > 0) block = "Not from prison";
  else if (p.credit < 60) block = "Credit score too low (60+)";
  else if (p.loans.some((l) => l.direction === "owed" && l.status === "active" && l.houseId)) block = "You already have a mortgage";
  else if (p.money < down + prev.fee) block = `You need ${naira(down + prev.fee)} for the deposit and fee`;
  else if (prev.monthly * 12 > income * 0.45) block = "Repayments are too high for your income";
  return { ...prev, kind, price: pr, down, years: term / 12, apr: OFFER.monthlyRate * 12, block };
}

export function takeMortgage(p: Player, kind: HouseKind, years: number): string {
  const q = mortgageQuote(p, kind, years);
  if (q.block) return q.block;
  transact(p, { amount: -q.down, reason: `Deposit on a ${HOUSE_KINDS[kind].label.toLowerCase()}`, category: "asset" });
  takeLoan(p, OFFER, q.principal, Math.round(q.years * 12));
  const loan = p.loans[p.loans.length - 1];
  transact(p, { amount: -q.principal, reason: `Bank paid the seller for your ${HOUSE_KINDS[kind].label.toLowerCase()}`, category: "asset" });
  loan.note = `Mortgage on a ${HOUSE_KINDS[kind].label.toLowerCase()}`;
  const hasOwner = p.houses.some((h) => h.state === p.state && h.use === "owner");
  const h: House = { id: uid(), state: p.state, kind, value: Math.round(q.price * 1.1), use: hasOwner ? "empty" : "owner", loanId: loan.id };
  loan.houseId = h.id;
  p.houses.push(h);
  p.prestige += kind === "flats" ? 2 : 1;
  bump(p, "happiness", 6);
  return `Mortgage approved. You bought a ${HOUSE_KINDS[kind].label.toLowerCase()} with ${naira(q.down)} down and ${naira(q.monthly)} a month for ${q.years} years.`;
}

/** Settle a mortgage when the house is sold. The bank is paid first. */
export function settleHouseLoan(p: Player, h: House, salePrice: number): string {
  const loan = h.loanId ? p.loans.find((l) => l.id === h.loanId && l.status === "active") : undefined;
  transact(p, { amount: salePrice, reason: `Sold a ${HOUSE_KINDS[h.kind].label.toLowerCase()}`, category: "asset" });
  if (!loan) return "";
  const pay = Math.min(loan.balance, salePrice);
  transact(p, { amount: -pay, reason: "Mortgage paid off from the sale", category: "repayment" });
  loan.balance -= pay;
  if (loan.balance <= 0.5) { loan.balance = 0; loan.status = "paid"; return ` The mortgage (${naira(pay)}) was cleared from the sale.`; }
  loan.houseId = undefined;
  return ` The sale did not cover the mortgage; ${naira(loan.balance)} is still owed.`;
}

export const mortgageBalance = (p: Player, h: House) => p.loans.find((l) => l.id === h.loanId && l.status === "active")?.balance ?? 0;
void monthIndex;
