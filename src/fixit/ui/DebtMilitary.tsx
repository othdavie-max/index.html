"use client";
/** National debt and the road to being debt-free, lending abroad, and the armed forces. */
import { useState } from "react";
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, Card, EmptyState, LineChart } from "../../game/ui/kit";
import { debtView, DEBT_FREE_AT, repayForeign } from "../engine/debt";
import { borrow } from "../engine/actions";
import { LEND_OPEN_AT, depositFund, earnedTotal, lendingOpen, outstanding, withdrawFund } from "../engine/lending";
import { MIL_PROGRAMMES, milLeak, milOn, regionalRank, strongestNeighbour, toggleMil } from "../engine/military";
import { statesCost, statesCreated } from "../engine/newstates";
import { DESTS, allocate } from "../engine/ledger";
import { monthLabel, monthShort, nb } from "../engine/util";
import { chips } from "../engine/forecast";
import { Chips } from "./parts";
import { sfx } from "./sound";

export function DebtPanel() {
  const s = useS();
  const { act } = useFix();
  const d = debtView(s);
  const [usd, setUsd] = useState(1);
  const [bn, setBn] = useState(500);
  const pts = s.history.map((h) => ({ x: h.month, y: h.debtGdp }));
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="Does Nigeria owe money?" icon={<span aria-hidden>💳</span>}>
        <div className="g-row g-between g-wrap"><div><div style={{ fontSize: 30, fontWeight: 900 }}>{d.pctGdp.toFixed(1)}%</div><div className="g-small g-muted">of the whole economy</div></div><Badge tone={d.tone === "good" ? "green" : d.tone === "bad" ? "red" : "amber"}>{d.label}</Badge></div>
        <div style={{ marginTop: 8 }}><div className="g-row g-between g-tiny"><span>Road to debt-free ({DEBT_FREE_AT}% of the economy)</span><b>{d.pctGdp <= DEBT_FREE_AT ? "Done" : `${Math.max(0, Math.round(((s.baseline.debtGdp - d.pctGdp) / Math.max(1, s.baseline.debtGdp - DEBT_FREE_AT)) * 100))}% of the way`}</b></div><Bar value={Math.max(0, Math.min(1, (s.baseline.debtGdp - d.pctGdp) / Math.max(1, s.baseline.debtGdp - DEBT_FREE_AT)))} label="Progress to debt-free" /></div>
        <div className="g-small" style={{ marginTop: 8 }}>{d.pctGdp <= DEBT_FREE_AT ? "🏆 You are debt-free. You can save the surplus, and lend to other countries." : d.yearsLeft ? `At this pace you will be debt-free in about ${d.yearsLeft} year${d.yearsLeft > 1 ? "s" : ""}.` : "Debt is not falling fast enough to give an estimate. Repay or borrow less."}</div>
      </Card>
      <Card title="Stolen and recovered" icon={<span aria-hidden>🔎</span>}>
        <div className="g-grid g-grid-2 g-grid-keep2" style={{ gap: 10 }}>
          <div><div className="g-tiny g-muted">Stolen so far</div><b style={{ fontSize: 22, color: "#b91c1c" }}>{nb(s.ledger.stolen)}</b></div>
          <div><div className="g-tiny g-muted">Recovered</div><b style={{ fontSize: 22, color: "#047857" }}>{nb(s.ledger.recovered)}</b></div>
        </div>
        <Bar value={s.ledger.stolen > 0 ? Math.min(1, s.ledger.recovered / s.ledger.stolen) : 0} label="Share of stolen money recovered" />
        {s.ledger.pending > 0 && <div className="g-card-flat" style={{ marginTop: 8, background: "#fffaf0", borderColor: "#f1d28a" }}><b>{nb(s.ledger.pending)} is waiting for your decision.</b><div className="g-tiny g-muted">Where should it go? If you do nothing, it goes to the treasury.</div><div className="g-row g-wrap" style={{ gap: 6, marginTop: 6 }}>{DESTS.map((x) => <Button key={x.id} size="sm" title={x.explain} onClick={() => { const r = act((st) => allocate(st, x.id)); sfx(r.ok ? "good" : "bad"); }}>{x.icon} {x.label}</Button>)}</div></div>}
        {s.ledger.log.length > 0 && <div className="g-col" style={{ gap: 4, marginTop: 8 }}>{[...s.ledger.log].reverse().slice(0, 5).map((l, i) => <div key={i} className="g-small"><span className="g-tiny g-muted">{monthLabel(l.month)}</span> {l.text} <b style={{ color: l.amount > 0 ? "#047857" : "#475569" }}>{l.amount > 0 ? "+" : "−"}{nb(Math.abs(l.amount))}</b></div>)}</div>}
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Lawmakers, ministers and governors who steal are counted here. Prosecute them under a strong law and the money comes back. You choose where it goes.</div>
      </Card>
      <Card title="What is owed">
        <div className="g-col" style={{ gap: 0 }}>
          {[["Total debt", nb(d.total)], ["Local debt (naira)", `${nb(d.domestic)} · about ${d.rate.toFixed(1)}% interest`], ["Foreign debt (dollars)", `$${d.foreignUsd.toFixed(1)}bn = ${nb(d.foreign)}`], ["Interest and repayments each month", nb(d.interest)], ["Share of revenue spent on debt", `${d.dsr.toFixed(0)}%`], ["Credit rating", `${Math.round(d.rating)}/100`]].map(([k, v]) => <div key={k} className="g-list-row"><div className="g-grow g-small">{k}</div><b className="g-num g-small">{v}</b></div>)}
        </div>
      </Card>
      <Card title="Debt over time (% of the economy)"><LineChart series={[{ label: "Debt as % of economy", color: "#b45309", points: pts }]} height={130} format={(v) => `${v.toFixed(0)}%`} xLabel={monthShort} /></Card>
      <Card title="Pay it down, or borrow more">
        <div className="g-col" style={{ gap: 10 }}>
          <div className="g-row g-wrap"><select className="g-select" style={{ width: 150 }} value={bn} onChange={(e) => setBn(Number(e.target.value))} aria-label="Local debt amount">{[500, 1000, 2000, 3000].map((n) => <option key={n} value={n}>{nb(n)}</option>)}</select><Button onClick={() => { const r = act((x) => borrow(x, "repay", bn)); sfx(r.ok ? "good" : "bad"); }}>Repay local debt</Button><Button onClick={() => { const r = act((x) => borrow(x, "domestic", bn)); sfx(r.ok ? "tap" : "bad"); }}>Borrow locally</Button></div>
          <div className="g-row g-wrap"><select className="g-select" style={{ width: 150 }} value={usd} onChange={(e) => setUsd(Number(e.target.value))} aria-label="Foreign debt amount">{[1, 2, 5, 10].map((n) => <option key={n} value={n}>${n}bn</option>)}</select><Button variant="primary" onClick={() => { const r = act((x) => repayForeign(x, usd)); sfx(r.ok ? "good" : "bad"); }}>Repay foreign debt</Button></div>
          <div className="g-tiny g-muted">Repaying keeps a cash buffer, so you cannot spend the last of the treasury. Inflation slowly erodes naira debt on its own; dollar debt does not shrink unless you repay it, and it costs more if the naira falls. Debt-free is {DEBT_FREE_AT}% of the economy or less.</div>
        </div>
      </Card>
    </div>
  );
}

export function LendingPanel() {
  const s = useS();
  const { act } = useFix();
  const open = lendingOpen(s), d = debtView(s);
  const [amt, setAmt] = useState(500);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      {!open && <Callout tone="info">🔒 Lending and a savings fund open when debt falls below {LEND_OPEN_AT}% of the economy. You are at {d.pctGdp.toFixed(1)}%. Pay down your debt first (Economy → Debt).</Callout>}
      <Card title="Savings fund" icon={<span aria-hidden>🏦</span>}>
        <div className="g-row g-between"><div><div style={{ fontSize: 26, fontWeight: 900 }}>{nb(s.lend.fund)}</div><div className="g-tiny g-muted">earns about 4% a year</div></div></div>
        <div className="g-row g-wrap" style={{ marginTop: 8 }}><select className="g-select" style={{ width: 150 }} value={amt} onChange={(e) => setAmt(Number(e.target.value))} aria-label="Amount">{[200, 500, 1000, 2000].map((n) => <option key={n} value={n}>{nb(n)}</option>)}</select><Button variant="primary" disabled={!open} onClick={() => act((x) => depositFund(x, amt))}>Save it</Button><Button onClick={() => act((x) => withdrawFund(x, amt))}>Withdraw</Button></div>
      </Card>
      <Card title="Loans to other countries" icon={<span aria-hidden>🤝</span>}>
        <div className="g-small">Lent out now: <b>${outstanding(s).toFixed(1)}bn</b> · interest earned so far: <b>${earnedTotal(s).toFixed(2)}bn</b></div>
        {s.lend.loans.length === 0 ? <EmptyState title="No loans yet" body="When you are nearly debt-free, neighbours come asking. A loan earns interest and influence, and can go bad." /> : (
          <div className="g-col" style={{ gap: 6, marginTop: 8 }}>{s.lend.loans.map((l) => { const n = s.mil.neighbours.find((x) => x.id === l.borrower); return <div key={l.id} className="g-list-row"><div className="g-grow g-small"><b>{n?.name ?? l.borrower}</b> · ${l.amountUsd}bn at {l.rate}%<div className="g-tiny g-muted">from {monthLabel(l.start)} · {l.term} months{l.strings === "votes" ? " · backs you at the AU" : ""}</div></div><Badge tone={l.status === "performing" ? "blue" : l.status === "repaid" ? "green" : "red"}>{l.status === "forgiven" ? "Written off" : l.status}</Badge></div>; })}</div>
        )}
      </Card>
    </div>
  );
}

export function MilitaryPanel() {
  const s = useS();
  const { act } = useFix();
  const M = s.mil, sn = strongestNeighbour(s), rank = regionalRank(s);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="The armed forces" icon={<span aria-hidden>🪖</span>}>
        <div className="g-row g-between g-wrap"><div><div style={{ fontSize: 30, fontWeight: 900 }}>{Math.round(M.strength)}/100</div><div className="g-small g-muted">strength · #{rank} of {M.neighbours.length + 1} in the region</div></div><Badge tone={rank === 1 ? "green" : "amber"}>{rank === 1 ? "Regional power" : `Behind ${M.neighbours.filter((n) => n.strength > M.strength).length} neighbour(s)`}</Badge></div>
        <Bar value={M.strength / 100} label={`Military strength ${Math.round(M.strength)}`} />
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Strongest neighbour: {sn.name} at {Math.round(sn.strength)}. A strong army is safer and wins you respect, but it costs money every month, makes generals more dangerous ({s.mil.strength > 55 ? `extra coup risk from strength ${Math.round(M.strength)}` : "not yet a worry"}), and alarms neighbours who arm themselves in return.</div>
      </Card>
      <Card title="Programmes">
        <div className="g-col" style={{ gap: 8 }}>
          {MIL_PROGRAMMES.map((p) => { const on = milOn(s, p.id); return (
            <div key={p.id} className="fx-rung" data-state={on ? "done" : "tool"}>
              <div className="g-grow"><b>{p.name}</b> <span className="g-tiny g-muted">· {nb(p.cost)} a month</span><div className="g-tiny g-muted">{p.blurb}</div><Chips chips={chips(p.effects, 4)} label="Effect" /></div>
              <Button size="sm" variant={on ? "default" : "primary"} onClick={() => act((x) => toggleMil(x, p.id))}>{on ? "Stop" : "Start"}</Button>
            </div>
          ); })}
        </div>
        {milLeak(s) < 0.85 && <div className="g-tiny" style={{ color: "#92400e", marginTop: 6 }}>Corruption is skimming about {Math.round((1 - milLeak(s)) * 100)}% of military spending.</div>}
      </Card>
      <Card title="Your neighbours (fictional)">
        <div className="g-col" style={{ gap: 8 }}>{M.neighbours.map((n) => <div key={n.id}><div className="g-row g-between g-small"><b>{n.name}</b><span className="g-muted">army {Math.round(n.strength)} · mood to you {Math.round(n.mood)} · stability {Math.round(n.stability)}</span></div><Bar value={n.strength / 100} tone={n.strength > M.strength ? "red" : undefined} label={`${n.name} strength ${Math.round(n.strength)}`} /></div>)}</div>
      </Card>
      {(statesCreated(s) > 0) && <Callout tone="info">You have created {statesCreated(s)} new state{statesCreated(s) > 1 ? "s" : ""}, costing about {nb(statesCost(s))} a month.</Callout>}
    </div>
  );
}
