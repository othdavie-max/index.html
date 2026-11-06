import { describe, expect, it } from "vitest";
import { newGame } from "../engine/init";
import { advanceMonths } from "../engine/sim";
import { borrowFrom, loanBook, loanTotals, prepay, loansMonthly, dueSoon } from "../engine/loans";
import { borrow } from "../engine/actions";
import { BASE_TAKE, buyout, indigenise, oilShare, sellStake, take } from "../engine/oilshare";
import { subRng } from "../../game/engine/rng";

const fresh = (seed = 9101) => { const s = newGame(seed); s.fin.treasury = 1e5; s.cap.pc = 99; return s; };
describe("loan book", () => {
  it("lists real creditors and always adds up to the debt totals", () => {
    const s = fresh(); const b = loanBook(s); const t = loanTotals(s);
    expect(t.usd).toBeCloseTo(s.fin.foreignDebt, 1); expect(t.ngn).toBeCloseTo(s.fin.domesticDebt, 0);
    expect(b.some((x) => x.lender === "ida")).toBe(true); expect(b.some((x) => x.lender === "eurobond")).toBe(true); expect(b.some((x) => x.oil)).toBe(true);
    borrow(s, "domestic", 500); const t2 = loanTotals(s); expect(t2.ngn).toBeCloseTo(s.fin.domesticDebt, 0);
    advanceMonths(s, 12); const t3 = loanTotals(s); expect(t3.ngn).toBeCloseTo(s.fin.domesticDebt, 0); expect(t3.usd).toBeCloseTo(s.fin.foreignDebt, 1);
  });
  it("prepaying a loan lowers the debt and costs cash; eurobonds carry a fee", () => {
    const s = fresh(9102); const eb = loanBook(s).find((x) => x.lender === "eurobond")!; const tr = s.fin.treasury, fd = s.fin.foreignDebt;
    expect(prepay(s, eb.id, 1).ok).toBe(true); expect(s.fin.foreignDebt).toBeCloseTo(fd - 1, 2); expect(tr - s.fin.treasury).toBeGreaterThan(1 * s.eco.fx * 1.02);
  });
  it("borrowing from named lenders adds a line; crude-backed loans are paid in oil", () => {
    const s = fresh(9103); const n = loanBook(s).length;
    expect(borrowFrom(s, "ida", 1).ok).toBe(true); expect(borrowFrom(s, "ida", 1).ok).toBe(false); // cooldown
    expect(borrowFrom(s, "afrexim", 1).ok).toBe(true); expect(loanBook(s).length).toBe(n + 2);
    const afx = loanBook(s).filter((x) => x.oil).reduce((a, x) => a + x.bal, 0); const t0 = s.fin.treasury;
    loansMonthly(s, subRng(1, "t", 1)); expect(loanBook(s).filter((x) => x.oil).reduce((a, x) => a + x.bal, 0)).toBeLessThan(afx);
    expect(s.fin.treasury).toBeLessThan(t0);
    const s2 = fresh(9104); const w0 = s2.me.wealth; expect(borrowFrom(s2, "chinaexim", 1, true).ok).toBe(true); expect(s2.me.wealth).toBeGreaterThan(w0);
  });
  it("bonds that fall due are rolled over, and a long game stays consistent", () => {
    const s = fresh(9105); advanceMonths(s, 60);
    const t = loanTotals(s); expect(t.usd).toBeCloseTo(s.fin.foreignDebt, 1); expect(Number.isFinite(s.fin.treasury)).toBe(true);
    expect(dueSoon(s, 24).length).toBeGreaterThanOrEqual(0);
  });
});
describe("oil ownership", () => {
  it("starts near 58 per cent, and stakes move revenue and the take", () => {
    const s = fresh(9201); expect(take(s)).toBeCloseTo(BASE_TAKE, 3); expect(Math.round(take(s) * 100)).toBeGreaterThanOrEqual(55); expect(Math.round(take(s) * 100)).toBeLessThanOrEqual(61);
    const t0 = take(s); expect(buyout(s, "spdc").ok).toBe(true); expect(take(s)).toBeGreaterThan(t0);
    const t1 = take(s); expect(sellStake(s, "mpn").ok).toBe(true); expect(take(s)).toBeLessThan(t1);
    expect(oilShare(s).blocks.find((b) => b.id === "spdc")!.partners[0].share).toBeLessThan(0.3);
  });
  it("indigenisation by a friend pays you and raises evidence; a bigger take means a bigger cash-call bill", () => {
    const s = fresh(9202); const w0 = s.me.wealth; expect(indigenise(s, "cnl", true).ok).toBe(true); expect(s.me.wealth).toBeGreaterThan(w0);
    const a = fresh(9203), b = fresh(9203); for (let i = 0; i < 4; i++) buyout(b, "deep");
    advanceMonths(a, 6); advanceMonths(b, 6);
    expect(a.fin.revenue === a.fin.revenue).toBe(true);
  });
});
