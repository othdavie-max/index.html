import { HOUSE_KINDS } from "./data";
import { monthIndex, transact } from "./ledger";
import { previewLoan, takeLoan, type LoanOffer, type LoanPreview } from "./loans";
import { stateOf, bump } from "./helpers";
import { primaryProvider, remember } from "./family";
import type { House, HouseKind, Player } from "./types";
import { T, naira, uid } from "./util";

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
export interface PurchaseOpts {
  /** Agreed price when buying an existing listing. */
  price?: number;
  /** A parent co-signs the loan. */
  cosign?: boolean;
}

export function mortgageQuote(p: Player, kind: HouseKind, years: number, opts: PurchaseOpts = {}): MortgageQuote {
  const pr = opts.price ?? price(p, kind);
  const cosigner = opts.cosign ? primaryProvider(p) : null;
  const down = Math.round(pr * (cosigner ? 0.1 : p.credit >= 75 ? 0.2 : 0.3));
  const principal = pr - down;
  const term = Math.min(Math.max(years * 12, OFFER.minTerm), OFFER.maxTerm);
  const prev = previewLoan(p, OFFER, principal, term);
  const income = p.fin.length ? p.fin[p.fin.length - 1].income : 0;
  let block: string | null = null;
  if (opts.cosign) {
    if (!cosigner) block = T("No parent or guardian available to co-sign", "Nobody dey to co-sign for you");
    else if (cosigner.closeness < 40 || cosigner.trust < 40) block = T(`${cosigner.name.split(" ")[0]} does not trust you enough to co-sign`, `${cosigner.name.split(" ")[0]} no trust you enough to co-sign`);
    else if (cosigner.income * p.index * 0.45 < prev.monthly * 12) block = T(`${cosigner.name.split(" ")[0]}'s income is too low to back this loan`, `${cosigner.name.split(" ")[0]} income no reach to back this loan`);
    else if (p.age < 18) block = T("Mortgages start at age 18 with a co-signer", "Mortgage start from age 18 with co-signer");
    else if (p.money < down + prev.fee) block = T(`You need ${naira(down + prev.fee)} for the deposit and fee`, `You need ${naira(down + prev.fee)} for deposit and fee`);
    else if (p.loans.some((l) => l.direction === "owed" && l.status === "active" && l.houseId)) block = T("You already have a mortgage", "You don get mortgage already");
    return { ...prev, kind, price: pr, down, years: term / 12, apr: OFFER.monthlyRate * 12, block };
  }
  if (p.age < 21) block = T("Mortgages start at age 21", "Mortgage start from age 21");
  else if (kind === "land") block = T("Banks do not give mortgages for bare land", "Bank no dey give mortgage for bare land");
  else if (stateOf(p).abroad) block = T("Not available abroad", "No dey available abroad");
  else if (p.prison > 0) block = T("Not from prison", "No fit from prison");
  else if (p.credit < 60) block = T("Credit score too low (60+)", "Credit score low too much (60+)");
  else if (p.loans.some((l) => l.direction === "owed" && l.status === "active" && l.houseId)) block = T("You already have a mortgage", "You don get mortgage already");
  else if (p.money < down + prev.fee) block = T(`You need ${naira(down + prev.fee)} for the deposit and fee`, `You need ${naira(down + prev.fee)} for deposit and fee`);
  else if (prev.monthly * 12 > income * 0.45) block = T("Repayments are too high for your income", "Repayment too high for your income");
  return { ...prev, kind, price: pr, down, years: term / 12, apr: OFFER.monthlyRate * 12, block };
}

export function takeMortgage(p: Player, kind: HouseKind, years: number, opts: PurchaseOpts & { value?: number } = {}): string {
  const q = mortgageQuote(p, kind, years, opts);
  if (q.block) return q.block;
  transact(p, { amount: -q.down, reason: T(`Deposit on a ${HOUSE_KINDS[kind].label.toLowerCase()}`, `Deposit for ${HOUSE_KINDS[kind].label.toLowerCase()}`), category: "asset" });
  takeLoan(p, OFFER, q.principal, Math.round(q.years * 12));
  const loan = p.loans[p.loans.length - 1];
  transact(p, { amount: -q.principal, reason: T(`Bank paid the seller for your ${HOUSE_KINDS[kind].label.toLowerCase()}`, `Bank pay the seller for your ${HOUSE_KINDS[kind].label.toLowerCase()}`), category: "asset" });
  loan.note = T(`Mortgage on a ${HOUSE_KINDS[kind].label.toLowerCase()}`, `Mortgage for ${HOUSE_KINDS[kind].label.toLowerCase()}`);
  const hasOwner = p.houses.some((h) => h.state === p.state && h.use === "owner");
  const h: House = { id: uid(), state: p.state, kind, value: opts.value ?? Math.round(q.price * 1.1), use: hasOwner ? "empty" : "owner", loanId: loan.id };
  loan.houseId = h.id;
  if (opts.cosign) {
    const c = primaryProvider(p);
    if (c) { loan.cosignerId = c.id; remember(p, c, T("Co-signed your mortgage.", "Co-sign your mortgage for you."), "good"); c.closeness = Math.min(100, c.closeness + 3); }
  }
  p.houses.push(h);
  p.prestige += kind === "flats" ? 2 : 1;
  bump(p, "happiness", 6);
  return T(`Mortgage approved. You bought a ${HOUSE_KINDS[kind].label.toLowerCase()} with ${naira(q.down)} down and ${naira(q.monthly)} a month for ${q.years} years.`, `Dem approve your mortgage. You buy ${HOUSE_KINDS[kind].label.toLowerCase()} with ${naira(q.down)} deposit and ${naira(q.monthly)} every month for ${q.years} years.`);
}

/** Settle a mortgage when the house is sold. The bank is paid first. */
export function settleHouseLoan(p: Player, h: House, salePrice: number): string {
  const loan = h.loanId ? p.loans.find((l) => l.id === h.loanId && l.status === "active") : undefined;
  transact(p, { amount: salePrice, reason: T(`Sold a ${HOUSE_KINDS[h.kind].label.toLowerCase()}`, `Sell ${HOUSE_KINDS[h.kind].label.toLowerCase()}`), category: "asset" });
  if (!loan) return "";
  const pay = Math.min(loan.balance, salePrice);
  transact(p, { amount: -pay, reason: T("Mortgage paid off from the sale", "Mortgage clear from the sale"), category: "repayment" });
  loan.balance -= pay;
  if (loan.balance <= 0.5) { loan.balance = 0; loan.status = "paid"; return T(` The mortgage (${naira(pay)}) was cleared from the sale.`, ` Dem clear the mortgage (${naira(pay)}) from the sale.`); }
  loan.houseId = undefined;
  return T(` The sale did not cover the mortgage; ${naira(loan.balance)} is still owed.`, ` The sale no cover the mortgage; ${naira(loan.balance)} still remain to pay.`);
}

export const mortgageBalance = (p: Player, h: House) => p.loans.find((l) => l.id === h.loanId && l.status === "active")?.balance ?? 0;
void monthIndex;
