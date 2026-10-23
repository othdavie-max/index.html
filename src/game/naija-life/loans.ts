import { remember } from "./family";
import { transact } from "./ledger";
import type { Loan, Npc, Pending, Player } from "./types";
import { T, chance, clamp, naira, rand, uid } from "./util";

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
      id: "pocketcash", name: "PocketCash", type: "digital", blurb: T("Instant micro-loans in minutes. Short and expensive.", "Quick small loan for minutes. E short and e cost well well."),
      monthlyRate: 0.11, feePct: 0.05, minTerm: 1, maxTerm: 2, limit: clamp(30_000 + cr * 220_000, 20_000, 300_000) * idx, lateFeePct: 0.08,
      eligible: !adult ? T("Adults only", "Na only grown-ups") : p.possessions.phone ? (p.credit < 12 ? T("Credit too low", "Credit too low") : null) : T("You need a phone", "You need phone"),
    },
    {
      id: "nairaflex", name: "NairaFlex", type: "digital", blurb: T("Bigger loans over a few months. Lower rate, still pricey.", "Bigger loan for some months. Rate small pass, but e still dear."),
      monthlyRate: 0.065, feePct: 0.03, minTerm: 3, maxTerm: 6, limit: clamp(80_000 + cr * 900_000, 80_000, 1_000_000) * idx, lateFeePct: 0.06,
      eligible: !adult ? T("Adults only", "Na only grown-ups") : p.possessions.phone ? (p.credit < 30 ? T("Credit score too low", "Credit score too low") : null) : T("You need a phone", "You need phone"),
    },
    {
      id: "bank", name: "Unity Bank personal loan", type: "bank", blurb: T("Cheaper money, but they want proof of income and a good credit record.", "Cheaper money, but dem go want proof say you dey earn and good credit record."),
      monthlyRate: 0.025, feePct: 0.01, minTerm: 6, maxTerm: 24, limit: clamp(inc * 1.2, 0, 8_000_000 * idx), lateFeePct: 0.03,
      eligible: !adult ? T("Adults only", "Na only grown-ups") : p.age < 21 ? T("Must be 21+", "Must be 21 and above") : p.credit < 55 ? T("Credit score too low (55+)", "Credit score too low (55+)") : inc < 800_000 * idx ? T("Needs a steady income", "You need steady income") : null,
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
  return { principal: amount, fee, net: amount - fee, monthly, total, interest: total - amount, term: n, firstDue: T(`month ${m0}`, `month ${m0}`) };
}

export function loanBlock(p: Player, offer: LoanOffer, amount: number): string | null {
  if (offer.eligible) return offer.eligible;
  if (amount <= 0) return T("Choose an amount", "Choose amount");
  if (amount > offer.limit) return T("Above your limit", "E pass your limit");
  if (activeOwed(p).filter((l) => l.lenderType === offer.type).length >= 2) return T("You already have open loans with this lender", "You don get open loans with this lender already");
  return null;
}

export function takeLoan(p: Player, offer: LoanOffer, amount: number, term: number): string {
  const pv = previewLoan(p, offer, amount, term);
  const loan: Loan = {
    id: uid(), direction: "owed", lenderType: offer.type, lenderName: offer.name, principal: amount, balance: amount,
    apr: offer.monthlyRate * 12, fee: pv.fee, termMonths: term, monthly: pv.monthly, startAge: p.age, startMonth: p.month,
    informal: false, missed: 0, status: "active", lastCharged: idxNow(p), note: T(`${offer.name} (${Math.round(offer.monthlyRate * 100 * 10) / 10}%/month)`, `${offer.name} (${Math.round(offer.monthlyRate * 100 * 10) / 10}%/month)`),
  };
  p.loans.push(loan);
  transact(p, { amount, reason: T(`${offer.name} loan paid out`, `${offer.name} loan don enter`), category: "loan" });
  if (pv.fee > 0) transact(p, { amount: -pv.fee, reason: T(`${offer.name} processing fee`, `${offer.name} processing fee`), category: "loan" });
  return T(`${offer.name} loan of ${naira(amount)} approved. You will repay ${naira(pv.monthly)} each month for ${term} month${term > 1 ? "s" : ""}.`, `${offer.name} don approve ${naira(amount)} loan. You go pay ${naira(pv.monthly)} every month for ${term} month${term > 1 ? "s" : ""}.`);
}

/** Pay towards a loan now. Returns the amount actually paid. */
export function repayLoan(p: Player, loanId: string, amount: number): number {
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan || loan.direction !== "owed" || loan.status === "paid") return 0;
  const pay = Math.min(amount, loan.balance, Math.max(0, p.money));
  if (pay <= 0) return 0;
  transact(p, { amount: -pay, reason: T(`Repayment: ${loan.lenderName}`, `Repayment: ${loan.lenderName}`), category: "repayment" });
  loan.balance -= pay;
  if (loan.balance <= 0.5) {
    loan.balance = 0;
    loan.status = "paid";
    adjustCredit(p, loan.informal ? 1 : 4);
    const n = loan.lenderId ? p.npcs[loan.lenderId] : null;
    if (n) {
      n.trust = clamp(n.trust + 6);
      n.closeness = clamp(n.closeness + 2);
      remember(p, n, T(`You repaid ${naira(loan.principal)} on time.`, `You pay back ${naira(loan.principal)} for correct time.`), "good");
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
        transact(p, { amount: -due, reason: T(`Loan repayment: ${loan.lenderName}`, `Loan repayment: ${loan.lenderName}`), category: "repayment", recurring: loan.id });
        loan.balance -= due;
        loan.missed = Math.max(0, loan.missed - 1);
        if (loan.balance <= 0.5) {
          loan.balance = 0;
          loan.status = "paid";
          adjustCredit(p, 5);
          lines.push(T(`${loan.lenderName} loan fully repaid.`, `You don finish to pay ${loan.lenderName} loan.`));
        }
      } else {
        loan.missed += 1;
        const late = Math.round(loan.monthly * (loan.lenderType === "bank" ? 0.03 : 0.07));
        loan.balance += late;
        adjustCredit(p, -5);
        if (loan.missed === 1) lines.push(T(`Missed payment: ${loan.lenderName} added a ${naira(late)} late fee. Reminders keep flooding your phone.`, `You miss payment: ${loan.lenderName} add ${naira(late)} late fee. Reminders dey enter your phone.`));
        if (loan.missed === 3 && loan.lenderType !== "bank") {
          for (const n of Object.values(p.npcs).filter((x) => x.alive && ["friend", "mom", "dad", "sibling", "cousin"].includes(x.role)).slice(0, 4)) n.closeness = clamp(n.closeness - 8);
          p.stats.reputation = clamp(p.stats.reputation - 4);
          lines.push(T("The loan app texts your contacts: 'Your friend owes us money.' Your phone does not stop ringing.", "Loan app text your contacts: 'Your friend dey owe us money.' Your phone no stop to ring."));
        }
        if (loan.missed === 3) lines.push(T(`${loan.lenderName} sent a final warning and threatened to call your contacts.`, `${loan.lenderName} send final warning and threaten say dem go call your contacts.`));
        if (loan.missed >= 4) {
          loan.status = "defaulted";
          adjustCredit(p, -20);
          p.stats.reputation = clamp(p.stats.reputation - 6);
          p.stats.stress = clamp(p.stats.stress + 12);
          p.debt += loan.balance;
          lines.push(T(`${loan.lenderName} marked you as a defaulter. ${naira(loan.balance)} moved to your overdue debts.`, `${loan.lenderName} mark you as defaulter. ${naira(loan.balance)} don move go your overdue debts.`));
          loan.balance = 0;
          if (loan.houseId) {
            const hi = p.houses.findIndex((h) => h.id === loan.houseId);
            if (hi >= 0) { p.houses.splice(hi, 1); lines.push(T("The bank repossessed your house.", "Bank don take your house.")); p.stats.happiness = clamp(p.stats.happiness - 15); }
            const cs = loan.cosignerId ? p.npcs[loan.cosignerId] : null;
            if (cs) { cs.closeness = clamp(cs.closeness - 30); cs.trust = clamp(cs.trust - 30); remember(p, cs, T("Was left to deal with the bank after you defaulted on a loan they co-signed.", "Bank come meet dem after you default for the loan wey dem co-sign."), "bad"); lines.push(T(`${cs.name.split(" ")[0]} was dragged into your default and is furious.`, `${cs.name.split(" ")[0]} enter your default wahala and e vex well well.`)); }
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
          transact(p, { amount: loan.balance, reason: T(`${n?.name ?? "Borrower"} repaid what you lent`, `${n?.name ?? "Borrower"} don pay back wetin you lend`), category: "repayment" });
          loan.status = "paid";
          if (n) { n.closeness = clamp(n.closeness + 3); remember(p, n, T("Paid back what you lent.", "Pay back wetin you lend."), "good"); }
          lines.push(T(`${n?.name ?? "Your borrower"} repaid ${naira(loan.principal)}.`, `${n?.name ?? "Person wey borrow you"} don pay back ${naira(loan.principal)}.`));
        } else if (loan.missed < 1) {
          loan.missed += 1;
          loan.dueIndex = now + 6;
          lines.push(T(`${n?.name ?? "Your borrower"} asked for more time to repay you.`, `${n?.name ?? "Person wey borrow you"} beg for more time to pay you back.`));
        } else {
          loan.status = "defaulted";
          if (n) { n.closeness = clamp(n.closeness - 10); remember(p, n, T("Never paid back what you lent.", "Never pay back wetin you lend."), "bad"); }
          lines.push(T(`${n?.name ?? "Your borrower"} never paid back ${naira(loan.principal)}. Money gone.`, `${n?.name ?? "Person wey borrow you"} never pay back ${naira(loan.principal)}. Money don go.`));
        }
      }
    }
  }
}

/** The player's choice when an informal loan falls due. */
export function resolveInformalLoan(p: Player, loanId: string, choice: "pay" | "half" | "delay" | "explain" | "default"): string {
  const loan = p.loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "active") return T("Nothing to settle.", "Nothing to settle.");
  const n = loan.lenderId ? p.npcs[loan.lenderId] : undefined;
  const name = n?.name.split(" ")[0] ?? loan.lenderName;
  const now = idxNow(p);
  switch (choice) {
    case "pay": {
      if (p.money < loan.balance) {
        const paid = repayLoan(p, loan.id, p.money);
        loan.dueIndex = now + 3;
        if (n) n.trust = clamp(n.trust - 2);
        return T(`You only had ${naira(paid)} to give. ${name} accepted it and expects the rest in three months.`, `Na only ${naira(paid)} you get to give. ${name} collect am and dey expect the rest after three months.`);
      }
      repayLoan(p, loan.id, loan.balance);
      return T(`You repaid ${name} in full. Trust goes up.`, `You pay ${name} finish. Trust don increase.`);
    }
    case "half": {
      const part = Math.min(loan.balance / 2, Math.max(0, p.money));
      repayLoan(p, loan.id, part);
      loan.dueIndex = now + 4;
      if (n) { n.trust = clamp(n.trust - 3); }
      return T(`You paid ${naira(part)} and promised the rest soon. ${name} is not thrilled but accepts.`, `You pay ${naira(part)} and promise say the rest go come soon. ${name} no happy but e gree.`);
    }
    case "delay": {
      loan.dueIndex = now + 3;
      loan.missed += 1;
      if (n) { n.trust = clamp(n.trust - 8); n.closeness = clamp(n.closeness - 3); remember(p, n, T("Delayed repaying you.", "Delay to pay you back."), "bad"); }
      adjustCredit(p, -2);
      return T(`You asked ${name} for three more months. "Fine, but this is the last time."`, `You beg ${name} for three more months. "Fine, but na this one be the last."`);
    }
    case "explain": {
      const ok = n ? chance(clamp(0.35 + n.closeness / 200 + n.generosity / 300, 0.15, 0.85)) : chance(0.4);
      if (ok) {
        loan.dueIndex = now + 6;
        if (n) { n.trust = clamp(n.trust - 2); n.closeness = clamp(n.closeness + 1); }
        return T(`You explained your situation honestly. ${name} understands and gives you six more months.`, `You explain your wahala well well. ${name} understand and give you six more months.`);
      }
      loan.dueIndex = now + 2;
      if (n) { n.trust = clamp(n.trust - 6); remember(p, n, T("Made excuses about repaying.", "Dey give excuse about to pay back."), "bad"); }
      return T(`${name} refuses: "Excuses everywhere!" You get two more months, no more.`, `${name} no gree: "Excuses everywhere!" You get two more months, no more.`);
    }
    case "default": {
      loan.status = "defaulted";
      p.stats.reputation = clamp(p.stats.reputation - 6);
      adjustCredit(p, -12);
      p.debt += loan.balance;
      if (n) { n.trust = clamp(n.trust - 30); n.closeness = clamp(n.closeness - 25); remember(p, n, T(`Never repaid ${naira(loan.principal)}.`, `Never pay back ${naira(loan.principal)}.`), "bad"); }
      const ret = T(`You ignored the debt. ${name} stopped talking to you, and people are starting to hear about it.`, `You ignore the debt. ${name} don stop to talk to you, and people don start to hear am.`);
      loan.balance = 0;
      return ret;
    }
  }
}

/** Lend money to an NPC, creating a receivable. */
export function lendTo(p: Player, n: Npc, amount: number, months = 4): string {
  if (p.money < amount) return T("Not enough cash.", "Cash no reach.");
  const now = idxNow(p);
  transact(p, { amount: -amount, reason: T(`Loan to ${n.name}`, `Loan to ${n.name}`), category: "family" });
  p.loans.push({
    id: uid(), direction: "owedToMe", lenderType: "friend", lenderId: n.id, lenderName: n.name, principal: amount, balance: amount, apr: 0, fee: 0,
    termMonths: months, monthly: 0, startAge: p.age, startMonth: p.month, dueIndex: now + months, informal: true, missed: 0, status: "active", lastCharged: -1,
    note: T("Lent informally", "Lend am for ground"),
  });
  n.closeness = clamp(n.closeness + 3);
  return T(`You lent ${naira(amount)} to ${n.name.split(" ")[0]}. You expect it back in about ${months} months.`, `You lend ${n.name.split(" ")[0]} ${naira(amount)}. You dey expect am back after like ${months} months.`);
}

/** Give money to an NPC as a gift. */
export function giftTo(p: Player, n: Npc, amount: number): string {
  if (p.money < amount) return T("Not enough cash.", "Cash no reach.");
  transact(p, { amount: -amount, reason: T(`Gift to ${n.name}`, `Gift to ${n.name}`), category: "family" });
  const rel = clamp((amount / Math.max(1, (n.income * p.index) / 20)) * 6, 1, 14);
  n.closeness = clamp(n.closeness + rel);
  n.trust = clamp(n.trust + 2);
  if (amount >= 20_000 * p.index) n.owes = Math.min(5, (n.owes ?? 0) + 1);
  remember(p, n, T(`You gave them ${naira(amount)}.`, `You give dem ${naira(amount)}.`), "good");
  return T(`You sent ${naira(amount)} to ${n.name.split(" ")[0]}. Appreciation level: high.`, `You send ${naira(amount)} to ${n.name.split(" ")[0]}. Appreciation dey high.`);
}

/** Borrow from a friend or relative. Becomes a recorded liability unless the amount is tiny and they call it a gift. */
export function borrowFrom(p: Player, n: Npc, amount: number, evaluate: (p: Player, n: Npc, amount: number) => { type: string; amount: number; text: string }): { text: string; loan?: Loan } {
  const r = evaluate(p, n, amount);
  n.asks += 1;
  const first = n.name.split(" ")[0];
  if (r.type === "refuse" || r.type === "later" || r.type === "workForIt" || r.amount <= 0) {
    n.closeness = clamp(n.closeness - (n.asks >= 3 ? 4 : 1));
    remember(p, n, T("Turned you down when you asked to borrow.", "Reject you when you ask to borrow."), "bad");
    return { text: r.text };
  }
  const give = Math.min(amount, Math.round(r.amount));
  const gift = give <= 8_000 * p.index && n.generosity > 60 && chance(0.5);
  if (gift) {
    transact(p, { amount: give, reason: T(`Gift from ${n.name}`, `Gift from ${n.name}`), category: "gift" });
    remember(p, n, T(`Gave you ${naira(give)} outright.`, `Give you ${naira(give)} as gift.`), "good");
    return { text: T(`${first}: "Take it. It is not a loan." You received ${naira(give)} as a gift.`, `${first}: "Take am. No be loan." You receive ${naira(give)} as gift.`) };
  }
  const months = n.strictness > 60 ? 2 : n.generosity > 60 ? 6 : 4;
  const loan: Loan = {
    id: uid(), direction: "owed", lenderType: ["uncle", "aunt", "sibling", "cousin"].includes(n.role) ? "relative" : "friend", lenderId: n.id, lenderName: n.name,
    principal: give, balance: give, apr: 0, fee: 0, termMonths: months, monthly: 0, startAge: p.age, startMonth: p.month,
    dueIndex: p.age * 12 + p.month + months, informal: true, missed: 0, status: "active", lastCharged: -1, note: T("Informal loan", "Loan for ground"),
  };
  p.loans.push(loan);
  transact(p, { amount: give, reason: T(`Borrowed from ${n.name}`, `Borrow from ${n.name}`), category: "loan" });
  remember(p, n, T(`Lent you ${naira(give)}. Due in ${months} months.`, `Lend you ${naira(give)}. E go due after ${months} months.`), "good");
  return { text: T(`${first} lent you ${naira(give)}. Due in about ${months} months.`, `${first} lend you ${naira(give)}. E go due after like ${months} months.`), loan };
}

export const randomDelay = () => Math.round(rand(2, 6));
