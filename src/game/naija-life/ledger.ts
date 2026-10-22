import type { Player, Tx, TxCategory } from "./types";
import { uid } from "./util";

const LEDGER_CAP = 500;

/** Absolute month index used for schedules: age * 12 + month. */
export const monthIndex = (p: Player) => p.age * 12 + p.month;

function bumpFin(p: Player, tx: Tx) {
  let y = p.fin[p.fin.length - 1];
  if (!y || y.age !== tx.age) {
    y = { age: tx.age, income: 0, expense: 0, borrowed: 0, cats: {} };
    p.fin.push(y);
  }
  if (typeof y.borrowed !== "number") y.borrowed = 0;
  if (tx.category === "loan" && tx.amount > 0) y.borrowed += tx.amount;
  else if (tx.amount >= 0) y.income += tx.amount;
  else y.expense += -tx.amount;
  y.cats[tx.category] = (y.cats[tx.category] ?? 0) + tx.amount;
}

function push(p: Player, tx: Tx) {
  p.ledger.push(tx);
  if (p.ledger.length > LEDGER_CAP) p.ledger.splice(0, p.ledger.length - LEDGER_CAP);
  bumpFin(p, tx);
}

export interface TxInput {
  amount: number;
  reason: string;
  category: TxCategory;
  eventId?: string;
  recurring?: string;
  /** Allows a zero-amount entry that records a non-cash change, such as a gifted house. */
  memo?: boolean;
}

/**
 * The one way to change cash. Positive amount = money in, negative = money out.
 * Cash may dip below zero inside a month; `coverShortfall` turns that into a recorded loan.
 */
export function transact(p: Player, o: TxInput): number {
  if (!Number.isFinite(o.amount) || (o.amount === 0 && !o.memo)) return 0;
  const before = p.money;
  p.money += o.amount;
  push(p, { id: uid(), amount: o.amount, reason: o.reason, category: o.category, age: p.age, month: p.month, eventId: o.eventId, before, after: p.money, recurring: o.recurring });
  return o.amount;
}

/**
 * Runs code that changes `p.money` directly (older events) and records whatever
 * changed as one understandable entry, so no money ever moves without a reason.
 */
export function withLedger<T>(p: Player, reason: string, category: TxCategory, fn: () => T, eventId?: string): T {
  const startMoney = p.money;
  const startLen = p.ledger.length;
  const startTotal = p.ledger.reduce((s, t) => s + t.amount, 0);
  const out = fn();
  // Explicit transactions made inside fn already moved the money.
  const added = p.ledger.slice(startLen);
  const explicit = added.reduce((s, t) => s + t.amount, 0);
  const remainder = p.money - startMoney - explicit;
  if (Math.abs(remainder) > 0.5) {
    const tx: Tx = { id: uid(), amount: remainder, reason, category, age: p.age, month: p.month, eventId, before: p.money - remainder, after: p.money };
    push(p, tx);
  }
  void startTotal;
  return out;
}

export interface Snapshot {
  money: number;
  len: number;
}
export const snapshot = (p: Player): Snapshot => ({ money: p.money, len: p.ledger.length });

/**
 * Records any cash change since `snap` that was not already recorded explicitly,
 * so older code that edits `p.money` directly still leaves an understandable trail.
 */
export function reconcile(p: Player, snap: Snapshot, reason: string, category: TxCategory, eventId?: string) {
  const explicit = p.ledger.slice(snap.len).reduce((s, t) => s + t.amount, 0);
  const remainder = p.money - snap.money - explicit;
  if (Math.abs(remainder) > 0.5) push(p, { id: uid(), amount: remainder, reason, category, age: p.age, month: p.month, eventId, before: p.money - remainder, after: p.money });
}

/** Final safety net: if the balance still differs from the last entry, say so rather than hide it. */
export function auditBalance(p: Player) {
  const last = p.ledger[p.ledger.length - 1];
  const expected = last ? last.after : 0;
  const diff = p.money - expected;
  if (Math.abs(diff) > 0.5) push(p, { id: uid(), amount: diff, reason: last ? "Adjustment (unrecorded change)" : "Balance carried over", category: "other", age: p.age, month: p.month, before: expected, after: p.money });
}

/** If cash went negative, record a borrowing entry so it never silently disappears. */
export function coverShortfall(p: Player, reason = "Short of cash: borrowed to cover bills") {
  if (p.money >= 0) return 0;
  const gap = -p.money;
  // Add the borrowing as money in, and as debt owed.
  p.debt += gap;
  transact(p, { amount: gap, reason, category: "loan" });
  return gap;
}

export interface YearSummary {
  age: number;
  income: number;
  expense: number;
  net: number;
  top: { category: string; amount: number }[];
}

export function summaries(p: Player): YearSummary[] {
  return p.fin
    .map((y) => ({
      age: y.age,
      income: y.income,
      expense: y.expense,
      net: y.income - y.expense,
      top: Object.entries(y.cats)
        .filter(([, v]) => v < 0)
        .map(([category, amount]) => ({ category, amount: -amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4),
    }))
    .reverse();
}

/** Invariant helper for tests: the sum of every transaction equals the balance. */
export function ledgerBalances(p: Player): boolean {
  if (p.ledger.length >= LEDGER_CAP) return true;
  return Math.abs(p.ledger.reduce((s, t) => s + t.amount, 0) - p.money) < 1;
}
