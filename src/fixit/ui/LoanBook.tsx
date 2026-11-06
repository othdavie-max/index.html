"use client";
/** Every loan Nigeria owes, one row each: who, how much, the rate, when it falls due. Pay any of them back, or borrow from a named lender. */
import { useState } from "react";
import { Badge, Button, Card, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { LENDERS, LENDER_BY_ID, borrowBlock, borrowFrom, dueSoon, loanBook, loanRate, loanTotals, monthYear, monthsLeft, prepay, prepayCost, type Loan } from "../engine/loans";
import { nb } from "../engine/util";
import { sfx } from "./sound";

const money = (x: Loan, v: number) => (x.cur === "usd" ? `$${v >= 10 ? v.toFixed(1) : v.toFixed(2)}bn` : nb(v));
export function LoanBookCard() {
  const s = useS(); const { act } = useFix();
  const book = loanBook(s); const t = loanTotals(s); const soon = dueSoon(s, 18);
  const [pay, setPay] = useState<Loan | null>(null); const [frac, setFrac] = useState(0.25);
  const groups: { cur: "usd" | "ngn"; title: string; icon: string }[] = [{ cur: "usd", title: "Dollar debts", icon: "💵" }, { cur: "ngn", title: "Naira debts", icon: "₦" }];
  const amt = pay ? Math.min(pay.bal, pay.bal * frac) : 0;
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <div className="fx-loan-sum">
        <div><span>💵 We owe in dollars</span><b>${t.usd.toFixed(1)}bn</b><i>= {nb(t.usd * s.eco.fx)}</i></div>
        <div><span>₦ We owe in naira</span><b>{nb(t.ngn)}</b><i>{s.fin.domRate.toFixed(1)}% market rate</i></div>
      </div>
      {soon.length > 0 && <div className="fx-loan-soon"><b>⏰ Falling due soon</b>{soon.slice(0, 3).map((x) => <span key={x.id}>{LENDER_BY_ID[x.lender].icon} {x.label.replace(/ \(.*\)/, "")}: {money(x, x.bal)} in {monthsLeft(s, x)} mo</span>)}<i>Bonds are rolled over if lenders still trust you. A weak rating makes it dear, or impossible.</i></div>}
      {groups.map((g) => (
        <Card key={g.cur} title={g.title} icon={<span aria-hidden>{g.icon}</span>}>
          <div className="g-col" style={{ gap: 8 }}>
            {book.filter((x) => x.cur === g.cur).sort((a, b) => b.bal * (g.cur === "usd" ? s.eco.fx : 1) - a.bal * (g.cur === "usd" ? s.eco.fx : 1)).map((x) => {
              const L = LENDER_BY_ID[x.lender]; const r = loanRate(s, x); const left = monthsLeft(s, x); const dear = r >= (g.cur === "usd" ? 8 : 16);
              const bpd = x.oil ? Number(s.flags[`crude:${x.id}`] ?? 0) : 0;
              return (
                <div key={x.id} className="fx-loan" data-dear={dear ? "1" : undefined}>
                  <span className="fx-loan-ic" aria-hidden>{L.icon}</span>
                  <div className="g-grow">
                    <div className="g-row g-between"><b className="g-small">{x.label}</b><b className="g-small">{money(x, x.bal)}</b></div>
                    <div className="g-row g-wrap" style={{ gap: 6, marginTop: 2 }}>
                      <Badge tone={dear ? "red" : "navy"}>{r.toFixed(1)}%{x.float ? " floating" : ""}</Badge>
                      <span className="g-tiny g-muted">{x.oil ? `🛢️ paid in crude${bpd ? `: about ${(bpd / 1000).toFixed(0)}k barrels a day` : ""}` : left <= 0 ? "due now" : `due ${monthYear(x.maturity)}`}</span>
                      {x.cut ? <span className="g-tiny" style={{ color: "#b45309" }}>💰 commission taken</span> : null}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => { setFrac(0.25); setPay(x); }}>Pay</Button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="g-tiny g-muted">Simplified from Nigeria's public debt data. Clearing the dearest loans first saves the most interest. Early repayment of Eurobonds costs a 3% fee.</div>
      {pay && (
        <Modal title={`Pay back: ${pay.label}`} onClose={() => setPay(null)}>
          <div className="g-col" style={{ gap: 10 }}>
            <div className="g-small">You owe <b>{money(pay, pay.bal)}</b> at {loanRate(s, pay).toFixed(1)}%.</div>
            <div className="g-row g-wrap" style={{ gap: 6 }}>{[0.1, 0.25, 0.5, 1].map((k) => <button key={k} className="fx-subtab" aria-pressed={frac === k} onClick={() => setFrac(k)}>{k === 1 ? "All of it" : `${k * 100}%`}</button>)}</div>
            <div className="g-card-flat"><div>Pay <b>{money(pay, amt)}</b></div><div className="g-small">Costs <b>{nb(prepayCost(s, pay, amt))}</b> from the treasury{pay.cur === "usd" ? " (dollars bought at today's rate)" : ""}.</div><div className="g-tiny g-muted">Saves about {nb((amt * (pay.cur === "usd" ? s.eco.fx : 1) * loanRate(s, pay)) / 1200)} a month in interest. Cash on hand: {nb(s.fin.treasury)}.</div></div>
            <Button variant="primary" onClick={() => { sfx("gavel"); const r = act((g) => prepay(g, pay.id, amt)); if (r.ok) setPay(null); }}>Pay it back</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function BorrowCard() {
  const s = useS(); const { act } = useFix();
  const [pick, setPick] = useState<string | null>(null); const [frac, setFrac] = useState(0.5); const [cut, setCut] = useState(false);
  const L = pick ? LENDER_BY_ID[pick as keyof typeof LENDER_BY_ID] : null;
  const amount = L ? (L.cur === "usd" ? Math.max(0.1, Math.round(L.max * frac * 10) / 10) : Math.max(100, Math.round((L.max * frac) / 100) * 100)) : 0;
  return (
    <div className="g-col" style={{ gap: 10 }}>
      <div className="g-tiny g-muted">Pick a lender. Each charges a different price and wants something different in return.</div>
      {LENDERS.filter((l) => l.id !== "other").map((l) => { const b = borrowBlock(s, l.id); return (
        <button key={l.id} className="fx-lender" data-blocked={b ? "1" : undefined} onClick={() => { setPick(l.id); setFrac(0.5); setCut(false); }}>
          <span className="fx-loan-ic" aria-hidden>{l.icon}</span>
          <span className="g-grow"><b className="g-small">{l.name}</b><span className="g-tiny g-muted" style={{ display: "block" }}>{b ?? l.blurb}</span><span className="g-tiny" style={{ color: "#0f7a52" }}>{l.rate(s).toFixed(1)}% · up to {l.cur === "usd" ? `$${l.max}bn` : nb(l.max)} · {l.termYears >= 2 ? `${l.termYears} years` : "1 year"}{l.oil ? " · paid in crude" : ""}</span></span>
          <span aria-hidden>›</span>
        </button>); })}
      {L && (
        <Modal title={`Borrow from ${L.name.replace(/ \(.*\)/, "")}`} onClose={() => setPick(null)}>
          <div className="g-col" style={{ gap: 10 }}>
            <div className="g-small">{L.blurb}</div>
            <div className="g-card-flat" style={{ background: "#fff7ed", borderColor: "#fdba74" }}><b className="g-small">What they want:</b> <span className="g-small">{L.strings}</span></div>
            <div className="g-row g-wrap" style={{ gap: 6 }}>{[0.25, 0.5, 1].map((k) => <button key={k} className="fx-subtab" aria-pressed={frac === k} onClick={() => setFrac(k)}>{k === 1 ? "The most" : `${k * 100}%`}</button>)}</div>
            <div className="g-card-flat"><div>Borrow <b>{L.cur === "usd" ? `$${amount}bn` : nb(amount)}</b> at <b>{L.rate(s).toFixed(1)}%</b>, due {monthYear(s.month + L.termYears * 12)}</div>
              <div className="g-tiny g-muted">You get {nb(L.cur === "usd" ? amount * s.eco.fx : amount)} now. Interest each month: about {nb(((L.cur === "usd" ? amount * s.eco.fx : amount) * L.rate(s)) / 1200)}. Costs 2 political capital.</div></div>
            {L.kickback && <label className="fx-cutline"><input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} /><span>💰 Take a quiet commission<i>It lands in your private account. A leak would be a scandal.</i></span></label>}
            <Button variant="primary" disabled={!!borrowBlock(s, L.id)} onClick={() => { sfx("gavel"); const r = act((g) => borrowFrom(g, L.id, amount, cut)); if (r.ok) setPick(null); }}>Sign the loan</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
