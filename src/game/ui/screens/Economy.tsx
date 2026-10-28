"use client";
import { useMemo, useState } from "react";
import { TrendingUp, Fuel, Zap, Percent, Users, Banknote, ArrowLeftRight, Scale, ShieldCheck } from "lucide-react";
import { useS } from "../store";
import { Badge, Callout, Card, LineChart, Meter, Stat } from "../kit";
import { formatMonthShort } from "../../engine/calendar";
import { STATES } from "../../data/states";
import { INDICATORS, INDICATOR_LABEL, type Indicator } from "../../engine/types";
import { debtToGdp, subsidyCostAnnualBn } from "../../engine/economy";

export function EconomyScreen() {
  const state = useS();
  const e = state.economy;
  const h = state.history;
  const [ind, setInd] = useState<Indicator>("economy");
  const ser = (k: keyof typeof h[number]) => h.map((x) => ({ x: x.m, y: x[k] as number }));
  const rows = useMemo(() => STATES.map((s) => ({ s, st: state.states[s.id] })).sort((a, b) => b.st.indicators[ind] - a.st.indicators[ind]), [state, ind, state.clock.monthIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Economy</div><Badge tone="amber">Simulated game values — not official statistics</Badge></div>
      <div className="g-grid g-grid-4">
        <Stat icon={<Percent size={14} />} label="Inflation (annual)" value={`${e.inflation.toFixed(1)}%`} sub={`Prices ${((e.cpi / 100 - 1) * 100).toFixed(0)}% above game start`} />
        <Stat icon={<Users size={14} />} label="Unemployment" value={`${e.unemployment.toFixed(1)}%`} sub="Simulated measure" />
        <Stat icon={<TrendingUp size={14} />} label="GDP growth" value={`${e.gdpGrowth.toFixed(1)}%`} sub={`Business activity ${Math.round(e.businessActivity)}/100`} />
        <Stat icon={<ArrowLeftRight size={14} />} label="Exchange rate" value={`₦${Math.round(e.fxRate).toLocaleString()}/$`} sub={`Oil ≈ $${e.oilPrice.toFixed(0)}/bbl`} />
        <Stat icon={<Fuel size={14} />} label="Fuel price" value={`₦${Math.round(e.fuelPrice).toLocaleString()}/L`} sub={`Subsidy ${Math.round(e.fuelSubsidy * 100)}%`} />
        <Stat icon={<Zap size={14} />} label="Electricity reliability" value={`${Math.round(e.electricity)}/100`} sub="Population-weighted average of states" />
        <Stat icon={<Banknote size={14} />} label="Federal revenue" value={`₦${Math.round(e.revenueAnnualBn / 1000).toLocaleString()}tn/yr`} sub={`Spending ₦${Math.round(e.spendingAnnualBn / 1000).toLocaleString()}tn`} />
        <Stat icon={<Scale size={14} />} label="Public debt" value={`₦${Math.round(e.debtBn / 1000).toLocaleString()}tn`} sub={`${(debtToGdp(e) * 100).toFixed(0)}% of GDP · service ${e.debtServiceShare.toFixed(0)}% of revenue`} />
      </div>
      <div className="g-grid g-split-eq g-grid-2">
        <Card title="Inflation and unemployment (%)"><LineChart series={[{ label: "Inflation", color: "#e11d48", points: ser("inflation") }, { label: "Unemployment", color: "#2563eb", points: ser("unemployment") }]} xLabel={(x) => formatMonthShort(state, x)} /></Card>
        <Card title="Exchange rate (₦ per US$)"><LineChart series={[{ label: "₦/$", color: "#0b1f36", points: ser("fx") }]} format={(v) => Math.round(v).toLocaleString()} xLabel={(x) => formatMonthShort(state, x)} /></Card>
        <Card title="Public satisfaction and purchasing power"><LineChart series={[{ label: "Satisfaction", color: "#00a862", points: ser("satisfaction") }, { label: "Purchasing power (start = 100)", color: "#f59e0b", points: ser("purchasingPower") }]} xLabel={(x) => formatMonthShort(state, x)} /></Card>
        <Card title="Active economic shocks">
          {e.shocks.length === 0 ? <div className="g-small g-muted">No active shocks. Events such as fuel-price spikes, oil swings or reforms will appear here with their remaining duration.</div> : e.shocks.map((s) => <div key={s.id} className="g-list-row g-small"><div className="g-grow">{s.key} {s.amount > 0 ? "+" : ""}{s.amount}{s.mode === "pct" ? "%" : ""} <span className="g-muted">over {s.months} months</span></div><Badge>{s.remaining} left</Badge></div>)}
        </Card>
      </div>
      <Card title="How this economy works" icon={<ShieldCheck size={16} />}>
        <ul className="g-small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Oil prices and the exchange rate move government revenue, import costs and fuel prices; the naira drifts with the inflation gap, oil and debt-service pressure.</li>
          <li>Inflation is persistent: it blends structural pressure, exchange-rate and fuel pass-through, borrowing, and power costs.</li>
          <li>Growth depends on electricity, infrastructure, security, fiscal stimulus (if well spent) and drags from inflation and interest rates; jobs follow growth.</li>
          <li>Subsidising fuel costs ≈ ₦{Math.round(subsidyCostAnnualBn(e)).toLocaleString()}bn a year today; removing it saves revenue but lifts transport costs.</li>
          <li>Events change these variables for real: a blackout lowers state power scores, raises business costs, and dents satisfaction and votes.</li>
        </ul>
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Starting values are stylised and not official figures. Personal finances and government finances are separate accounts.</div>
      </Card>
      <Card title="States compared (simulated)" action={<select className="g-select" style={{ minHeight: 34, padding: "4px 8px", width: 190 }} aria-label="Indicator" value={ind} onChange={(ev) => setInd(ev.target.value as Indicator)}>{INDICATORS.map((k) => <option key={k} value={k}>{INDICATOR_LABEL[k]}</option>)}</select>}>
        <div className="g-grid g-grid-3" style={{ gap: "6px 20px" }}>
          {rows.map(({ s, st }) => <Meter key={s.id} label={s.isFct ? "FCT" : s.name} value={st.indicators[ind]} tone="auto" />)}
        </div>
      </Card>
      <Callout tone="info">Your own finances: see <b>My Life → Money</b>. Cost of living for you today is shown under <b>My Life → Family &amp; friends</b>.</Callout>
    </div>
  );
}
