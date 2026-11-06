/**
 * Personal finance ledger. Every naira that enters or leaves a personal account goes through here with a category
 * and a label, so the UI can always show WHY money was earned or spent. Government and party treasuries are
 * separate numbers on other objects and are never touched by these functions.
 */
import type { GameState, LedgerCat, Finances } from "./types";
import { newId } from "./ids";

const LEDGER_CAP = 500;
const INFORMAL_LOAN = "Informal loans (borrowed to cover essentials)";

export function emptyFinances(): Finances {
  return { cash: 0, savings: 0, campaignFund: 0, illicit: 0, debts: [], assets: [], ledger: [], monthly: [], thisMonth: { income: 0, expense: 0 }, lifetimeDonationsByDonor: {} };
}

function log(state: GameState, cat: LedgerCat, amount: number, label: string, account: "cash" | "campaign" | "illicit") {
  const f = state.player.finances;
  f.ledger.push({ m: state.clock.monthIndex, cat, amount: Math.round(amount), label, account });
  if (f.ledger.length > LEDGER_CAP) f.ledger.splice(0, f.ledger.length - LEDGER_CAP);
  if (account === "cash") {
    if (amount >= 0) f.thisMonth.income += amount;
    else f.thisMonth.expense += -amount;
  }
}

/** Money in to the lawful cash account. */
export function credit(state: GameState, cat: LedgerCat, amount: number, label: string): void {
  if (amount <= 0) return;
  state.player.finances.cash += amount;
  log(state, cat, amount, label, "cash");
}

/** Money in to the (separately tracked) campaign fund. */
export function creditCampaign(state: GameState, cat: LedgerCat, amount: number, label: string): void {
  if (amount <= 0) return;
  state.player.finances.campaignFund += amount;
  log(state, cat, amount, label, "campaign");
}

/** Undeclared/illicit gain. Kept apart from lawful accounts; only explicit, consequential actions create it. */
export function creditIllicit(state: GameState, amount: number, label: string): void {
  if (amount <= 0) return;
  state.player.finances.illicit += amount;
  log(state, "illicit", amount, label, "illicit");
}

export const liquid = (f: Finances) => f.cash + f.savings;

/**
 * Pay from cash, then savings. Returns the amount actually paid. If `mandatory` and funds are short, the
 * shortfall becomes an informal loan (with stress), because food and rent cannot simply be skipped.
 */
export function debit(state: GameState, cat: LedgerCat, amount: number, label: string, opts: { mandatory?: boolean } = {}): number {
  if (amount <= 0) return 0;
  const f = state.player.finances;
  let remaining = amount;
  const fromCash = Math.min(f.cash, remaining);
  f.cash -= fromCash;
  remaining -= fromCash;
  const fromSavings = Math.min(f.savings, remaining);
  f.savings -= fromSavings;
  remaining -= fromSavings;
  let paid = fromCash + fromSavings;
  if (remaining > 0 && opts.mandatory) {
    // shortfalls become one running informal loan (high interest) rather than a pile of tiny debts
    const existing = f.debts.find((d) => d.label === INFORMAL_LOAN);
    if (existing) {
      existing.principal += remaining;
      existing.monthlyPayment = Math.ceil(existing.principal / 6);
      existing.remainingMonths = Math.max(existing.remainingMonths, 8);
    } else f.debts.push({ id: newId(state, "d"), label: INFORMAL_LOAN, principal: remaining, rate: 36, monthlyPayment: Math.ceil(remaining / 6), remainingMonths: 8 });
    state.player.attrs.stress = Math.min(100, state.player.attrs.stress + 3);
    // loan proceeds are recorded in the ledger (but are not "income") so cash changes always reconcile
    f.ledger.push({ m: state.clock.monthIndex, cat: "debt", amount: Math.round(remaining), label: `Loan proceeds: ${label.toLowerCase()}`, account: "cash" });
    paid += remaining;
    remaining = 0;
  }
  if (paid > 0) log(state, cat, -paid, label, "cash");
  return paid;
}

export function canAfford(state: GameState, amount: number): boolean {
  return liquid(state.player.finances) >= amount;
}

/** Spend from the campaign fund (separate account). */
export function debitCampaign(state: GameState, amount: number, label: string): number {
  const f = state.player.finances;
  const paid = Math.min(f.campaignFund, amount);
  if (paid <= 0) return 0;
  f.campaignFund -= paid;
  log(state, "campaign", -paid, label, "campaign");
  return paid;
}

export function transferToCampaign(state: GameState, amount: number): boolean {
  const f = state.player.finances;
  if (amount <= 0 || liquid(f) < amount) return false;
  const paid = debit(state, "campaign", amount, "Transfer to campaign fund");
  f.campaignFund += paid;
  log(state, "campaign", paid, "Received from personal funds", "campaign");
  return true;
}

export function netWorth(f: Finances): number {
  return f.cash + f.savings + f.campaignFund + f.assets.reduce((t, a) => t + a.value, 0) - f.debts.reduce((t, d) => t + d.principal, 0);
}

/** Close the month's books for charts and reset the monthly counters. */
export function closeMonth(state: GameState): void {
  const f = state.player.finances;
  f.monthly.push({ m: state.clock.monthIndex, income: Math.round(f.thisMonth.income), expense: Math.round(f.thisMonth.expense), net: Math.round(f.thisMonth.income - f.thisMonth.expense), cash: Math.round(f.cash + f.savings), wealth: Math.round(netWorth(f)) });
  if (f.monthly.length > 600) f.monthly.shift();
  f.thisMonth = { income: 0, expense: 0 };
}

export function addAsset(state: GameState, label: string, value: number, kind: "property" | "vehicle" | "land" | "equity" | "other"): void {
  state.player.finances.assets.push({ id: newId(state, "a"), label, value, kind });
}

/** Service debts (interest + repayments). */
export function serviceDebts(state: GameState): void {
  const f = state.player.finances;
  for (const d of [...f.debts]) {
    const interest = (d.principal * d.rate) / 1200;
    const principalPart = Math.min(d.principal, Math.max(0, d.monthlyPayment - interest));
    const pay = Math.min(d.monthlyPayment, d.principal + interest);
    const paid = debit(state, "debt", pay, `Repayment: ${d.label}`, { mandatory: false });
    if (paid >= pay - 1) {
      d.principal -= principalPart;
      d.remainingMonths -= 1;
    } else {
      d.principal += interest; // unpaid interest compounds
      state.player.attrs.stress = Math.min(100, state.player.attrs.stress + 2);
    }
    if (d.principal <= 1) f.debts = f.debts.filter((x) => x.id !== d.id);
    else if (d.remainingMonths <= 0) {
      // term over but balance remains: it is rolled over with a fresh schedule
      d.remainingMonths = 6;
      d.monthlyPayment = Math.ceil(d.principal / 6 + (d.principal * d.rate) / 1200);
    }
  }
}
