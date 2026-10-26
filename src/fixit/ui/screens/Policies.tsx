"use client";
import { useState } from "react";
import { Fuel } from "lucide-react";
import { useFix, useS } from "../store";
import { Badge, Button, Callout, Card } from "../../../game/ui/kit";
import { CATEGORIES, POLICIES, type Category } from "../../data/catalogue";
import { applyFuel, enactPolicy, previewFuel, repealPolicy, priceMult, type FuelAction } from "../../engine/actions";
import { monthLabel, nb } from "../../engine/util";
import { Word } from "../parts";

const FUEL_OPTS: { id: FuelAction | "hold"; label: string; blurb: string }[] = [
  { id: "increase", label: "Increase subsidy", blurb: "Cheaper petrol, bigger bill" },
  { id: "reduce", label: "Halve it", blurb: "Gradual cut" },
  { id: "remove", label: "Remove it", blurb: "Market price, big saving, big shock" },
  { id: "reform", label: "Reform: targeted transfers", blurb: "Cash for the poor instead of cheap petrol for everyone" },
];

export function FuelPanel() {
  const s = useS();
  const { act } = useFix();
  const [pick, setPick] = useState<FuelAction>("reform");
  const f = s.fuel;
  const pv = previewFuel(s, pick);
  const share = f.costMonthly / Math.max(1, s.fin.revenue);
  return (
    <Card title="Fuel subsidy" icon={<Fuel size={16} />}>
      <div className="g-col" style={{ gap: 10 }}>
        <div className="g-grid g-grid-4" style={{ gap: 10 }}>
          <div className="g-card-flat"><div className="g-tiny g-muted">Pump price</div><b className="g-num" style={{ fontSize: 20 }}>₦{Math.round(f.pump)}</b><div className="g-tiny g-muted">Market price ₦{Math.round(f.parity)}</div></div>
          <div className="g-card-flat"><div className="g-tiny g-muted">Monthly cost</div><b className="g-num" style={{ fontSize: 20 }}>{nb(f.costMonthly)}</b><div className="g-tiny g-muted">{Math.round(share * 100)}% of revenue</div></div>
          <div className="g-card-flat"><div className="g-tiny g-muted">Leakage &amp; smuggling</div><b className="g-num" style={{ fontSize: 20 }}>{Math.round(f.leak * 100)}%</b><div className="g-tiny g-muted">{f.transfers ? "Targeted transfers in place" : "Blanket subsidy"}</div></div>
          <div className="g-card-flat"><div className="g-tiny g-muted">Made at home</div><b className="g-num" style={{ fontSize: 20 }}>{Math.round((1 - f.importShare) * 100)}%</b><div className="g-tiny g-muted">The rest is imported with dollars</div></div>
        </div>
        <div className="g-small g-muted">The right move depends on the situation: how much room the budget has, the debt burden, the naira, how much fuel comes from abroad, inflation, households&apos; purchasing power, how well transfers can be targeted and leakage. Pick an option to see what it would do <i>today</i>.</div>
        <div className="g-row g-wrap" role="group" aria-label="Subsidy option" style={{ gap: 6 }}>
          {FUEL_OPTS.map((o) => <button key={o.id} className="g-chip" aria-pressed={pick === o.id} onClick={() => setPick(o.id as FuelAction)} title={o.blurb}>{o.label}</button>)}
        </div>
        <div className="g-card-flat g-col" style={{ gap: 6, background: "#f8fafc" }}>
          <div className="g-row g-between g-wrap"><b>If you choose: {FUEL_OPTS.find((o) => o.id === pick)?.label}</b><span className="g-row" style={{ gap: 6 }}>Protest risk <Word tone={pv.risk === "low" ? "good" : pv.risk === "medium" ? "warn" : "bad"}>{pv.risk}</Word></span></div>
          <div className="g-small"><b>Pump price:</b> ₦{Math.round(pv.pumpNow)} → about ₦{Math.round(pv.pumpTarget)} ({pv.changePct >= 0 ? "+" : ""}{pv.changePct.toFixed(0)}%) over a few months</div>
          <div className="g-small"><b>Monthly bill:</b> {nb(pv.costBefore)} → {nb(pv.costAfter)}; saving {nb(pv.saving)} ({Math.round(pv.savingShareOfDeficit * 100)}% of the deficit)</div>
          <ul className="fx-why">{pv.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          <div><Button variant="primary" onClick={() => act((x) => applyFuel(x, pick))}>Apply{pv.setup ? ` (${nb(pv.setup)} setup)` : ""}</Button></div>
        </div>
      </div>
    </Card>
  );
}

export function Policies() {
  const s = useS();
  const { act } = useFix();
  const [cat, setCat] = useState<Category | "all">("all");
  const list = POLICIES.filter((p) => cat === "all" || p.cat === cat);
  const active = POLICIES.filter((p) => s.policies[p.id]?.active);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Policies</div><div className="g-small g-muted">{active.length} in force · most take months to reach full effect</div></div>
      <FuelPanel />
      <div className="g-row g-wrap g-chip-row" style={{ gap: 6 }} role="group" aria-label="Policy area">
        <button className="g-chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All areas</button>
        {CATEGORIES.map((c) => <button key={c.id} className="g-chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}
      </div>
      <div className="g-grid g-grid-2">
        {list.map((p) => {
          const st = s.policies[p.id];
          const on = !!st?.active;
          const cost = p.setup * priceMult(s);
          return (
            <Card key={p.id} className="g-col">
              <div className="g-row g-between g-wrap"><b>{p.name}</b>{on ? <Badge tone="green">In force since {monthLabel(st.since)}</Badge> : <Badge>{CATEGORIES.find((c) => c.id === p.cat)?.label}</Badge>}</div>
              <div className="g-small">{p.what}</div>
              <div className="fx-act-meta">
                <span><b>Cost:</b> {nb(cost)} setup{p.monthly ? `, then ${p.monthly > 0 ? nb(p.monthly * priceMult(s)) + "/month" : "saves " + nb(-p.monthly * priceMult(s)) + "/month"}` : ""}</span>
                <span><b>Short term:</b> {p.short}</span>
                <span><b>Long term:</b> {p.long}</span>
                <span><b>Risks:</b> {p.risks}</span>
                <span><b>Takes about:</b> {p.delay <= 1 ? "effect is immediate" : `${p.delay} months to reach full effect`}</span>
              </div>
              <div>{on ? <Button size="sm" onClick={() => act((x) => repealPolicy(x, p.id))}>End this policy</Button> : <Button size="sm" variant="primary" disabled={cost > s.fin.treasury} onClick={() => act((x) => enactPolicy(x, p.id))}>{cost > s.fin.treasury ? "Not enough cash" : "Start policy"}</Button>}</div>
            </Card>
          );
        })}
      </div>
      <Callout tone="info">Effects are scaled by how well government can deliver (capacity {Math.round(s.gov.capacity)}/100). Honest, capable institutions make every policy work better.</Callout>
    </div>
  );
}
