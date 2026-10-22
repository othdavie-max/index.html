import { remember } from "./family";
import { transact } from "./ledger";
import type { Loan, Npc, Pending, Player } from "./types";
import { chance, clamp, naira, rand, uid } from "./util";

const idxNow = (p: Player) => p.age * 12 + p.month;

export function activeOwed(p: Player): Loan[] {
  return p.loans.filter((l) => l.direction === "owed" && l.status !== "paid");
}
export function activeOwedToMe(p: Player): Loan[] {
  return p.loans.filter((l) => l.direction === "owedToMe" && l.status === "active");
}
export const loanDebt = (p: Player) => activeOwed(p).reduce((s, l) => s + l.balance, 0);
export const totalDebt = (p: Player) => p.debt + loanDebt(p);
export const receivables = (p: Player) => activeOwedToMe(p).reduce((s, l) => s + l.balance, 0);

export function adjustCredit(p: Player, d: number) {
  p.credit = clamp(p.credit + d);
}

// ---------------------------------------------------------------------------
// Lender offers: terms are shown before anything is accepted.
// ---------------------------------------------------------------------------
export interface LoanOffer {
  id: string;
  name: string;
  type: "digital" | "bank";
  blurb: string;
  /** Monthly interest rate as a fraction. */
  monthlyRate: number;
  feePct: number;
  minTerm: number;
  maxTerm: number;
  limit: number;
  lateFeePct: number;
  eligible: string | null;
}

/** Rough annual income, used for lender limits. */
function annualIncome(p: Player): number {
  const pay = p.fin.length ? p.fin[p.fin.length - 1].income : 0;
  return pay;
}

export function lenderOffers(p: Player): LoanOffer[] {
  const idx = Math.pow(p.index, 0.92);
  const adult = p.age >= 18;
  const inc = Math.max(annualIncome(p), p.age >= 18 && p.job ? 0 : 0);
  const cr = p.credit / 100;
  const offers: LoanOffer[] = [
    {
      id: "pocketcash", name: "PocketCash", type: "digital", blurb: "Instant micro-loans in minutes. Short and expensive.",
      monthlyRate: 0.11, feePct: 0.05, minTerm: 1, maxTerm: 2, limit: clamp(30_000 + cr * 220_000, 20_000, 300_000) * idx, lateFeePct: 0.08,
      eligible: !adult ? "Adults only" : p.possessions.phone ? (p.credit < 12 ? "Credit too low" : null) : "You need a phone",
    },
    {
      id: "nairaflex", name: "NairaFlex", type: "digital", blurb: "Bigger loans over a few months. Lower rate, still pricey.",
      monthlyRate: 0.065, feePct: 0.03, minTerm: 3, maxTerm: 6, limit: clamp(80_000 + cr * 900_000, 80_000, 1_000_000) * idx, lateFeePct: 0.06,
      eligible: !adult ? "Adults only" : p.possessions.phone ? (p.credit < 30 ? "Credit score too low" : null) : "You need a phone",
    },
    {
      id: "bank", name: "Unity Bank personal loan", type: "bank", blurb: "Cheaper money, but they want proof of income and a good credit record.",
      monthlyRate: 0.025, feePct: 0.01, minTerm: 6, maxTerm: 24, limit: clamp(inc * 1.2, 0, 8_000_000 * idx), lateFeePct: 0.03,
      eligible: !adult ? "Adults only" : p.age < 21 ? "Must be 21+" : p.credit < 55 ? "Credit score too low (55+)" : inc < 800_000 * idx ? "Needs a steady income" : null,
    },
  ];
  return offers;
}

export interface LoanPreview {
  principal: number;
  fee: number;
  net: number;
  monthly: number;
  total: number;
  interest: number;
  term: number;
  firstDue: string;
}

export function previewLoan(p: Player, offer: LoanOffer, amount: number, term: number): LoanPreview {
  const fee = Math.round(amount * offer.feePct);
  const r = offer.monthlyRate;
  const n = Math.max(1, term);
  const monthly = Math.round((amount * r) / (1 - Math.pow(1 + r, -n)));
  const total = monthly * n;
  const m0 = p.month + 1 > 12 ? 1 : p.month + 1;
  return { principal: amount, fee, net: amount - fee, monthly, total, interest: total - amount, term: n, firstDue: `month ${m0}` };
}

export function loanBlock(p: Player, offer: LoanOffer, amount: number): string | null {
  if (offer.eligible) return offer.eligible;
  if (amount <= 0) return "Choose an amount";
  if (amount > offer.limit) return "Above your limit";
  if (activeOwed(p).filter((l) => l.lenderType === offer.type).length >= 2) return "You already have open loans with this lender";
  return null;
}

export function takeLoan(p: Player, offer: LoanOffer, amount: number, term: number): string {
  const pv = previewLoan(p, offer, amount, term);
  const loan: Loan = {
    id: uid(), direction: "owed", lenderType: offer.type, lenderName: offer.name, principal: amount, balance: amount,
    apr: offer.monthlyRate * 12, fee: pv.fee, termMonths: term, monthly: pv.monthly, startAge: p.age, startMonth: p.month,
    informal: false, missed: 0, status: "active", lastCharged: idxNow(p), note: `${offer.name} (${Math.round(offer.monthlyRate * 100 * 10) / 10}%/month)`,
  };
  p.loans.push(loan);
  transact(p, { amount, reason: `${offer.name} loan paid out`, category: "loan" });
  if (pv.fee > 0) transact(p, { amount: -pv.fee, reason: `${offer.name} processing fee`, category: "loan" });
  return `${offer.name} loan of ${naira(amount)} approved. You will repay ${naira(pv.monthly)} each month for ${term} month${term > 1 ? "s" : ""}.`;
}

/** Pay towards a loan now. Returns the amount actually paid. */
export function repayLoan(p: Player, loanId: string, amount: number): number {
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan || loan.direction !== "owed" || loan.status === "paid") return 0;
  const pay = Math.min(amount, loan.balance, Math.max(0, p.money));
  if (pay <= 0) return 0;
  transact(p, { amount: -pay, reason: `Repayment: ${loan.lenderName}`, category: "repayment" });
  loan.balance -= pay;
  if (loan.balance <= 0.5) {
    loan.balance = 0;
    loan.status = "paid";
    adjustCredit(p, loan.informal ? 1 : 4);
    const n = loan.lenderId ? p.npcs[loan.lenderId] : null;
    if (n) {
      n.trust = clamp(n.trust + 6);
      n.closeness = clamp(n.closeness + 2);
      remember(p, n, `You repaid ${naira(loan.principal)} on time.`, "good");
    }
  }
  return pay;
}

// ---------------------------------------------------------------------------
// Monthly processing
// ---------------------------------------------------------------------------
export function processLoansMonth(p: Player, lines: string[], pending: Pending[]) {
  const now = idxNow(p);
  for (const loan of p.loans) {
    if (loan.status !== "active") continue;
    if (loan.direction === "owed") {
      if (loan.informal) {
        // Informal loans fall due in one go. The player decides how to handle it.
        if (loan.dueIndex !== undefined && now >= loan.dueIndex && loan.lastCharged !== now) {
          loan.lastCharged = now;
          pending.push({ kind: "event", id: "loan_due", data: { loanId: loan.id, month: p.month } });
        }
        continue;
      }
      if (loan.lastCharged === now) continue; // never charge the same month twice
      loan.lastCharged = now;
      // Accrue this month's interest, then collect the instalment.
      const interest = loan.balance * (loan.apr / 12);
      loan.balance += interest;
      const due = Math.min(loan.monthly, loan.balance);
      if (p.money >= due) {
        transact(p, { amount: -due, reason: `Loan repayment: ${loan.lenderName}`, category: "repayment", recurring: loan.id });
        loan.balance -= due;
        loan.missed = Math.max(0, loan.missed - 1);
        if (loan.balance <= 0.5) {
          loan.balance = 0;
          loan.status = "paid";
          adjustCredit(p, 5);
          lines.push(`${loan.lenderName} loan fully repaid.`);
        }
      } else {
        loan.missed += 1;
        const late = Math.round(loan.monthly * (loan.lenderType === "bank" ? 0.03 : 0.07));
        loan.balance += late;
        adjustCredit(p, -5);
        if (loan.missed === 1) lines.push(`Missed payment: ${loan.lenderName} added a ${naira(late)} late fee. Reminders dey enter your phone.`);
        if (loan.missed === 3) lines.push(`${loan.lenderName} sent a final warning and threatened to call your contacts.`);
        if (loan.missed >= 4) {
          loan.status = "defaulted";
          adjustCredit(p, -20);
          p.stats.reputation = clamp(p.stats.reputation - 6);
          p.stats.stress = clamp(p.stats.stress + 12);
          p.debt += loan.balance;
          lines.push(`${loan.lenderName} marked you as a defaulter. ${naira(loan.balance)} moved to your overdue debts.`);
          loan.balance = 0;
          if (loan.houseId) {
            const hi = p.houses.findIndex((h) => h.id === loan.houseId);
            if (hi >= 0) { p.houses.splice(hi, 1); lines.push("The bank repossessed your house."); p.stats.happiness = clamp(p.stats.happiness - 15); }
          }
          for (const n of Object.values(p.npcs)) if (n.role === "friend" && chance(0.25)) { n.trust = clamp(n.trust - 4); }
        }
      }
    } else {
      // Money someone owes you.
      const n = loan.lenderId ? p.npcs[loan.lenderId] : null;
      if (loan.dueIndex !== undefined && now >= loan.dueIndex && loan.lastCharged !== now) {
        loan.lastCharged = now;
        const pr = clamp(0.3 + (n?.responsibility ?? 50) / 150 + (n?.trust ?? 50) / 400 - loan.missed * 0.2, 0.05, 0.92);
        if (chance(pr)) {
          transact(p, { amount: loan.balance, reason: `${n?.name ?? "Borrower"} repaid what you lent`, category: "repayment" });
          loan.status = "paid";
          if (n) { n.closeness = clamp(n.closeness + 3); remember(p, n, "Paid back what you lent.", "good"); }
          lines.push(`${n?.name ?? "Your borrower"} repaid ${naira(loan.principal)}.`);
        } else if (loan.missed < 1) {
          loan.missed += 1;
          loan.dueIndex = now + 6;
          lines.push(`${n?.name ?? "Your borrower"} asked for more time to repay you.`);
        } else {
          loan.status = "defaulted";
          if (n) { n.closeness = clamp(n.closeness - 10); remember(p, n, "Never paid back what you lent.", "bad"); }
          lines.push(`${n?.name ?? "Your borrower"} never paid back ${naira(loan.principal)}. Money gone.`);
        }
      }
    }
  }
}

/** The player's choice when an informal loan falls due. */
export function resolveInformalLoan(p: Player, loanId: string, choice: "pay" | "half" | "delay" | "explain" | "default"): string {
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "active") return "Nothing to settle.";
  const n = loan.lenderId ? p.npcs[loan.lenderId] : undefined;
  const name = n?.name.split(" ")[0] ?? loan.lenderName;
  const now = idxNow(p);
  switch (choice) {
    case "pay": {
      if (p.money < loan.balance) {
        const paid = repayLoan(p, loan.id, p.money);
        loan.dueIndex = now + 3;
        if (n) n.trust = clamp(n.trust - 2);
        return `You only had ${naira(paid)} to give. ${name} accepted it and expects the rest in three months.`;
      }
      repayLoan(p, loan.id, loan.balance);
      return `You repaid ${name} in full. Trust goes up.`;
    }
    case "half": {
      const part = Math.min(loan.balance / 2, Math.max(0, p.money));
      repayLoan(p, loan.id, part);
      loan.dueIndex = now + 4;
      if (n) { n.trust = clamp(n.trust - 3); }
      return `You paid ${naira(part)} and promised the rest soon. ${name} is not thrilled but accepts.`;
    }
    case "delay": {
      loan.dueIndex = now + 3;
      loan.missed += 1;
      if (n) { n.trust = clamp(n.trust - 8); n.closeness = clamp(n.closeness - 3); remember(p, n, "Delayed repaying you.", "bad"); }
      adjustCredit(p, -2);
      return `You asked ${name} for three more months. "Fine, but this na the last time."`;
    }
    case "explain": {
      const ok = n ? chance(clamp(0.35 + n.closeness / 200 + n.generosity / 300, 0.15, 0.85)) : chance(0.4);
      if (ok) {
        loan.dueIndex = now + 6;
        if (n) { n.trust = clamp(n.trust - 2); n.closeness = clamp(n.closeness + 1); }
        return `You explained your situation honestly. ${name} understands and gives you six more months.`;
      }
      loan.dueIndex = now + 2;
      if (n) { n.trust = clamp(n.trust - 6); remember(p, n, "Made excuses about repaying.", "bad"); }
      return `${name} no gree: "Excuses everywhere!" You get two more months, no more.`;
    }
    case "default": {
      loan.status = "defaulted";
      p.stats.reputation = clamp(p.stats.reputation - 6);
      adjustCredit(p, -12);
      p.debt += loan.balance;
      if (n) { n.trust = clamp(n.trust - 30); n.closeness = clamp(n.closeness - 25); remember(p, n, `Never repaid ${naira(loan.principal)}.`, "bad"); }
      const ret = `You ignored the debt. ${name} stopped talking to you, and people are starting to hear about it.`;
      loan.balance = 0;
      return ret;
    }
  }
}

/** Lend money to an NPC, creating a receivable. */
export function lendTo(p: Player, n: Npc, amount: number, months = 4): string {
  if (p.money < amount) return "Not enough cash.";
  const now = idxNow(p);
  transact(p, { amount: -amount, reason: `Loan to ${n.name}`, category: "family" });
  p.loans.push({
    id: uid(), direction: "owedToMe", lenderType: "friend", lenderId: n.id, lenderName: n.name, principal: amount, balance: amount, apr: 0, fee: 0,
    termMonths: months, monthly: 0, startAge: p.age, startMonth: p.month, dueIndex: now + months, informal: true, missed: 0, status: "active", lastCharged: -1,
    note: "Lent informally",
  });
  n.closeness = clamp(n.closeness + 3);
  return `You lent ${naira(amount)} to ${n.name.split(" ")[0]}. You expect it back in about ${months} months.`;
}

/** Give money to an NPC as a gift. */
export function giftTo(p: Player, n: Npc, amount: number): string {
  if (p.money < amount) return "Not enough cash.";
  transact(p, { amount: -amount, reason: `Gift to ${n.name}`, category: "family" });
  const rel = clamp((amount / Math.max(1, (n.income * p.index) / 20)) * 6, 1, 14);
  n.closeness = clamp(n.closeness + rel);
  n.trust = clamp(n.trust + 2);
  remember(p, n, `You gave them ${naira(amount)}.`, "good");
  return `You sent ${naira(amount)} to ${n.name.split(" ")[0]}. Appreciation level: high.`;
}

/** Borrow from a friend or relative. Becomes a recorded liability unless the amount is tiny and they call it a gift. */
export function borrowFrom(p: Player, n: Npc, amount: number, evaluate: (p: Player, n: Npc, amount: number) => { type: string; amount: number; text: string }): { text: string; loan?: Loan } {
  const r = evaluate(p, n, amount);
  n.asks += 1;
  const first = n.name.split(" ")[0];
  if (r.type === "refuse" || r.type === "later" || r.type === "workForIt" || r.amount <= 0) {
    n.closeness = clamp(n.closeness - (n.asks >= 3 ? 4 : 1));
    remember(p, n, "Turned you down when you asked to borrow.", "bad");
    return { text: r.text };
  }
  const give = Math.min(amount, Math.round(r.amount));
  const gift = give <= 8_000 * p.index && n.generosity > 60 && chance(0.5);
  if (gift) {
    transact(p, { amount: give, reason: `Gift from ${n.name}`, category: "gift" });
    remember(p, n, `Gave you ${naira(give)} outright.`, "good");
    return { text: `${first}: "Take am. No be loan." You received ${naira(give)} as a gift.` };
  }
  const months = n.strictness > 60 ? 2 : n.generosity > 60 ? 6 : 4;
  const loan: Loan = {
    id: uid(), direction: "owed", lenderType: ["uncle", "aunt", "sibling", "cousin"].includes(n.role) ? "relative" : "friend", lenderId: n.id, lenderName: n.name,
    principal: give, balance: give, apr: 0, fee: 0, termMonths: months, monthly: 0, startAge: p.age, startMonth: p.month,
    dueIndex: p.age * 12 + p.month + months, informal: true, missed: 0, status: "active", lastCharged: -1, note: "Informal loan",
  };
  p.loans.push(loan);
  transact(p, { amount: give, reason: `Borrowed from ${n.name}`, category: "loan" });
  remember(p, n, `Lent you ${naira(give)}. Due in ${months} months.`, "good");
  return { text: `${first} lent you ${naira(give)}. Due in about ${months} months.`, loan };
}

export const randomDelay = () => Math.round(rand(2, 6));
