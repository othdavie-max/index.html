"use client";
import { useState, type ReactNode } from "react";
import { RATE_LABEL, rateLevel, setRate } from "../../engine/dials";
import { useFix, useS } from "../store";
import { Badge, Button, Callout, Card, LineChart, Meter, Tabs } from "../../../game/ui/kit";
import { borrow, setFxDefence, type BorrowKind } from "../../engine/actions";
import { annualGdpNgn, debtServiceRatio, debtToRevenue, debtTotalNgn, foodAffordIdx, infraScore, lever, monthShort, nb, powerRatio, realWage } from "../../engine/util";
import { fiscalCondition } from "../../engine/views";
import type { FixState, Snap } from "../../engine/types";

type Tab = "overview" | "money" | "oil" | "food" | "power" | "jobs" | "security" | "people";

function Why({ title, lines }: { title: string; lines?: string[] }) {
  if (!lines?.length) return null;
  return <Card title={title}><ul className="fx-why">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul></Card>;
}
function Table({ rows }: { rows: [string, ReactNode, string?][] }) {
  return <div className="g-col" style={{ gap: 0 }}>{rows.map(([k, v, h]) => <div key={k} className="g-list-row"><div className="g-grow g-small">{k}{h && <div className="g-tiny g-muted">{h}</div>}</div><b className="g-num">{v}</b></div>)}</div>;
}
const chart = (s: FixState, key: keyof Snap, label: string, color: string, fmt?: (v: number) => string) => (
  <Card title={label}><LineChart series={[{ label, color, points: s.history.map((h) => ({ x: h.month, y: h[key] as number })) }]} height={130} format={fmt} xLabel={monthShort} /></Card>
);

export function Nation() {
  const s = useS();
  const [tab, setTab] = useState<Tab>("overview");
  const fc = fiscalCondition(s);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">Nation &amp; Economy</div>
      <Tabs<Tab> tabs={[{ id: "overview", label: "Overview" }, { id: "money", label: "Money & debt" }, { id: "oil", label: "Oil & fuel" }, { id: "food", label: "Food" }, { id: "power", label: "Power & roads" }, { id: "jobs", label: "Jobs & industry" }, { id: "security", label: "Security" }, { id: "people", label: "People & government" }]} value={tab} onChange={setTab} />
      {tab === "overview" && (
        <>
          <div className="g-grid g-grid-2">
            {chart(s, "fx", "Naira per US dollar (lower = stronger)", "#0b1f36", (v) => `₦${Math.round(v)}`)}
            {chart(s, "inflation", "Inflation (% a year)", "#e11d48", (v) => `${v.toFixed(1)}%`)}
            {chart(s, "unemployment", "Unemployment (%)", "#d97706", (v) => `${v.toFixed(1)}%`)}
            {chart(s, "approval", "Presidential approval (%)", "#00a862", (v) => `${v.toFixed(0)}%`)}
          </div>
          <div className="g-grid g-grid-3"><Why title="Why the naira moved" lines={s.why.fx} /><Why title="Why prices are moving" lines={s.why.inflation} /><Why title="Why people feel this way" lines={s.why.happiness} /></div>
        </>
      )}
      {tab === "money" && <Money s={s} fcLabel={fc.label} />}
      {tab === "oil" && (
        <div className="g-grid g-grid-2">
          <Card title="Crude oil"><Table rows={[
            ["Oil price", `$${s.eco.oilPrice.toFixed(0)} a barrel`, "Set by world markets; a shock you cannot control"], ["Production", `${Math.round(s.oil.production).toLocaleString()} thousand barrels/day`, `Capacity ${Math.round(s.oil.crude + lever(s, "crude")).toLocaleString()}`],
            ["Lost to theft and sabotage", `${s.oil.theft.toFixed(1)}%`, "Rises with corruption and insecurity in the oil-producing states"], ["Oil revenue to government", nb(s.fin.oilRev) + "/month"]]} /></Card>
          <Card title="Refining and fuel"><Table rows={[
            ["Refineries working", `${Math.round(s.oil.refinery + lever(s, "refinery"))} of ${s.oil.refineryNameplate} thousand barrels/day`, "Nameplate capacity is far above what actually runs"], ["Fuel made at home", `${Math.round((1 - s.fuel.importShare) * 100)}%`, "The rest is imported and paid for in dollars"],
            ["Market price", `₦${Math.round(s.fuel.parity)} a litre`], ["Pump price", `₦${Math.round(s.fuel.pump)} a litre`], ["Subsidy cost", nb(s.fuel.costMonthly) + "/month"], ["Leakage and smuggling", `${Math.round(s.fuel.leak * 100)}%`]]} /></Card>
          <Why title="Why fuel costs what it does" lines={s.why.fuel} />
          <Callout tone="info">Subsidy decisions are on the Policies screen, with a preview of what each choice would do in today&apos;s conditions.</Callout>
        </div>
      )}
      {tab === "food" && (
        <div className="g-grid g-grid-2">
          <Card title="Supply and demand"><Table rows={[["Food reaching markets", `${s.agri.supply.toFixed(1)} (demand ${s.agri.demand.toFixed(1)})`, "Index; demand 100 at start"], ["Lost before it is eaten", `${s.agri.loss.toFixed(0)}%`, "Poor storage, roads and cold chains"], ["Imported", `${s.agri.imports.toFixed(1)} index points`, "Uses dollars and competes with farmers"], ["Rainy season", s.agri.weather > 0.3 ? "Wet" : s.agri.weather < -0.3 ? "Dry" : "Normal", "Weather is random each year"]]} /></Card>
          <Card title="Farm foundations"><div className="g-col"><Meter label="Fertiliser and seed use" value={s.agri.inputs + lever(s, "inputs")} tone="blue" /><Meter label="Irrigation" value={s.agri.irrigation + lever(s, "irrigation")} tone="blue" /><Meter label="Storage and cold chain" value={s.agri.storage + lever(s, "storage")} tone="blue" /></div></Card>
          <Card title="Prices"><Table rows={[["Food prices, yearly rise", `${s.eco.foodInflation.toFixed(1)}%`], ["Food affordability (start = 100)", String(foodAffordIdx(s)), "How much food a typical wage buys"], ["Insecurity on farmland", `${Math.round(s.sec.index)}/100 risk`, "Pushes farmers off land"]]} /></Card>
          <Why title="Why food prices are moving" lines={s.why.food} />
        </div>
      )}
      {tab === "power" && (
        <div className="g-grid g-grid-2">
          <Card title="Electricity"><Table rows={[["Installed capacity", `${s.power.installed.toLocaleString()} MW`, "On paper"], ["Actually delivered", `${Math.round(s.power.available).toLocaleString()} MW`, "Limited by gas, grid and maintenance"], ["Demand", `${Math.round(s.power.demand).toLocaleString()} MW`], ["Share of need met", `${Math.round(powerRatio(s) * 100)}%`]]} />
            <div className="g-col" style={{ marginTop: 8 }}><Meter label="Transmission grid" value={s.power.grid + lever(s, "grid")} tone="blue" /><Meter label="Gas supply to plants" value={s.power.gas + lever(s, "gas")} tone="blue" /><Meter label="Maintenance quality" value={s.infra.maint + lever(s, "maint")} tone="blue" /></div></Card>
          <Card title="Roads, rail and ports"><div className="g-col"><Meter label="Roads and bridges" value={s.infra.roads + lever(s, "roads")} tone="blue" /><Meter label="Rail" value={s.infra.rail + lever(s, "rail")} tone="blue" /><Meter label="Ports" value={s.infra.ports + lever(s, "ports")} tone="blue" /><div className="g-small">Overall infrastructure score: <b>{infraScore(s)}</b></div><div className="g-tiny g-muted">Without maintenance spending, infrastructure wears down every month.</div></div></Card>
        </div>
      )}
      {tab === "jobs" && (
        <div className="g-grid g-grid-2">
          <Card title="Work"><Table rows={[["Unemployment", `${s.jobs.unemployment.toFixed(1)}%`], ["Young people", `${s.jobs.youth.toFixed(1)}%`], ["Economic growth", `${s.eco.growth.toFixed(1)}% a year`], ["Productivity (start = 100)", String(s.jobs.productivity), "Held back by blackouts, poor roads, weak schools and health"]]} /></Card>
          <Card title="Industry"><div className="g-col"><Meter label="Small businesses" value={s.jobs.sme + lever(s, "sme")} tone="blue" /><Meter label="Manufacturing" value={s.jobs.manuf + lever(s, "manuf")} tone="blue" /><Meter label="Workforce skills" value={s.jobs.skills + lever(s, "skills")} tone="blue" /><div className="g-small">Non-oil exports: <b>${(s.jobs.exports + lever(s, "exports")).toFixed(2)}bn</b> a month</div></div></Card>
          <Callout tone="info">Jobs are not automatic. They follow growth, which follows reliable power, working roads, investor confidence ({Math.round(s.eco.investor)}/100), skills and security.</Callout>
        </div>
      )}
      {tab === "security" && (
        <div className="g-grid g-grid-2">
          <Card title="Threats (higher is worse)"><div className="g-col"><Meter label="Banditry and kidnapping" value={s.sec.banditry} tone="inverse" /><Meter label="Terrorism" value={s.sec.terror} tone="inverse" /><Meter label="Communal conflict" value={s.sec.communal} tone="inverse" /><div className="g-small">Displaced people: <b>{Math.round(s.sec.displaced).toLocaleString()}k</b></div></div></Card>
          <Card title="Capacity and limits"><div className="g-col"><Meter label="Security forces' capacity" value={s.sec.forces + lever(s, "forces")} tone="blue" /><Meter label="Respect for human rights and the law" value={s.sec.humanRights} tone="auto" /><div className="g-tiny g-muted">Heavy-handed operations can lower this, which costs trust and investor confidence.</div></div></Card>
        </div>
      )}
      {tab === "people" && (
        <div className="g-grid g-grid-2">
          <Card title="Services"><div className="g-col"><Meter label="Education" value={s.soc.education + lever(s, "education")} tone="blue" /><Meter label="Health" value={s.soc.health + lever(s, "health")} tone="blue" /><Meter label="Social support" value={s.soc.welfare + lever(s, "welfare")} tone="blue" /><div className="g-tiny g-muted">Cuts to schools and clinics save money now but lower productivity for years.</div></div></Card>
          <Card title="Government"><div className="g-col"><Meter label="Delivery capacity" value={s.gov.capacity + lever(s, "capacity")} tone="blue" /><Meter label="Procurement quality" value={s.gov.procurement + lever(s, "procurement")} tone="blue" /><Meter label="Transparency" value={s.gov.transparency + lever(s, "transparency")} tone="blue" /><Meter label="Corruption (higher is worse)" value={s.gov.corruption + lever(s, "corruption")} tone="inverse" /><Meter label="Public trust" value={s.gov.trust + lever(s, "trust")} tone="auto" /><Meter label="Opposition strength" value={s.gov.opposition} tone="amber" /></div></Card>
          <Card title="You, personally"><Table rows={[["Personal wealth", `₦${Math.round(s.me.wealth).toLocaleString()}m`, "Your own money: separate from government funds, reserves and debt"], ["Exposure to scandal", `${Math.round(s.me.evidence)}/100`, "Evidence of improper dealings that investigators or journalists could find"], ["Scandals so far", String(s.me.scandals)]]} /><div className="g-tiny g-muted" style={{ marginTop: 6 }}>Declining improper payments is not rewarded with money. It simply keeps your record clean.</div></Card>
        </div>
      )}
    </div>
  );
}

function Money({ s, fcLabel }: { s: FixState; fcLabel: string }) {
  const { act } = useFix();
  const [dom, setDom] = useState(1000);
  const [bond, setBond] = useState(1);
  const f = s.fin;
  const run = (k: BorrowKind, n: number) => act((x) => borrow(x, k, n));
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Callout tone="info">Four different things, often confused: <b>government funds</b> (cash in the treasury), <b>reserves</b> (dollars held by the central bank), <b>debt</b> (what is owed) and <b>personal wealth</b> (yours alone).</Callout>
      <DialsCard />
      <div className="g-grid g-grid-2">
        <Card title="Government funds" action={<Badge tone={fcLabel === "Healthy" ? "green" : fcLabel === "Tight" ? "blue" : "amber"}>{fcLabel}</Badge>}>
          <Table rows={[["Cash in the treasury", nb(f.treasury)], ["Revenue this month", nb(f.revenue), `Oil ${nb(f.oilRev)} · everything else ${nb(f.nonOilRev)}`], ["Spending this month", nb(f.spend), `Of which debt payments ${nb(f.debtService)} and the fuel subsidy ${nb(s.fuel.costMonthly)}`], ["Deficit (−) or surplus (+)", nb(-f.deficit)], ["Tax compliance", `${Math.round(f.taxCompl + lever(s, "taxCompl"))}%`, "Share of tax actually collected"], ["Unpaid bills to contractors", nb(f.arrears)]]} />
          <ul className="fx-why" style={{ marginTop: 8 }}>{(s.why.fiscal ?? []).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </Card>
        <Card title="Debt and reserves">
          <Table rows={[["Local debt", nb(f.domesticDebt), `Average interest ${f.domRate.toFixed(1)}%`], ["Foreign debt", `$${f.foreignDebt.toFixed(1)}bn`, `Repaid in dollars: a weaker naira makes it costlier (${nb(f.foreignDebt * s.eco.fx)} today)`], ["Total debt", nb(debtTotalNgn(s)), `${Math.round((debtTotalNgn(s) / annualGdpNgn(s)) * 100)}% of the economy, ${debtToRevenue(s).toFixed(1)}× a year's revenue`], ["Debt payments / revenue", `${Math.round(debtServiceRatio(s) * 100)}%`], ["Credit rating (0–100)", String(Math.round(f.creditRating)), "Lenders' view; falls with heavy debt and inflation"], ["Dollar reserves", `$${s.eco.reserves.toFixed(1)}bn`, "Central bank's dollars: not spendable on projects"], ["Naira per dollar", `₦${Math.round(s.eco.fx).toLocaleString()}`]]} />
        </Card>
        <Card title="Borrow or repay">
          <div className="g-col">
            <div className="g-small g-muted">Borrowing buys time but is not free. Local loans crowd out business lending; dollar bonds carry currency risk.</div>
            <div className="g-row g-wrap"><select className="g-select" style={{ width: 160 }} value={dom} onChange={(e) => setDom(Number(e.target.value))} aria-label="Amount to borrow locally">{[500, 1000, 2000, 3000].map((n) => <option key={n} value={n}>{nb(n)}</option>)}</select><Button onClick={() => run("domestic", dom)}>Borrow locally</Button><Button onClick={() => run("repay", dom)}>Repay local debt</Button></div>
            <div className="g-row g-wrap"><select className="g-select" style={{ width: 160 }} value={bond} onChange={(e) => setBond(Number(e.target.value))} aria-label="Dollar bond size">{[0.5, 1, 2, 3].map((n) => <option key={n} value={n}>${n}bn</option>)}</select><Button onClick={() => run("bond", bond)}>Issue dollar bonds</Button></div>
          </div>
        </Card>
        <Card title="Defending the naira">
          <div className="g-col">
            <div className="g-small g-muted">The central bank can sell dollars to slow a fall. That uses reserves, which cannot be spent twice, and only buys time if the underlying gap is fixed.</div>
            <input type="range" min={0} max={1} step={0.05} value={s.eco.fxDefence} onChange={(e) => act((x) => setFxDefence(x, Number(e.target.value)), { silent: true })} aria-label="How hard to defend the naira" />
            <div className="g-row g-between g-small"><span>Let it float</span><b>{s.eco.fxDefence < 0.05 ? "Float" : s.eco.fxDefence < 0.45 ? "Light defence" : s.eco.fxDefence < 0.8 ? "Strong defence" : "All-out defence"}</b><span>Defend hard</span></div>
            <div className="g-small"><b>Reserves:</b> ${s.eco.reserves.toFixed(1)}bn. <b>Real wage index:</b> {realWage(s).toFixed(0)}.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DialsCard() {
  const s = useS();
  const { act, setTab } = useFix();
  const lv = rateLevel(s);
  return (
    <Card title="🎛️ Your three dials">
      <div className="fx-dials">
        <div className="fx-dial"><b>Interest rate</b>
          <div className="g-row" style={{ gap: 4 }}>{([-1, 0, 1] as const).map((l) => <button key={l} className="fx-subtab" aria-pressed={lv === l} onClick={() => act((x) => setRate(x, l))}>{RATE_LABEL[l].name}</button>)}</div>
          <span className="g-tiny g-muted">{RATE_LABEL[lv].blurb}</span></div>
        <div className="fx-dial"><b>The naira</b>
          <span className="g-small">{s.eco.fxDefence < 0.05 ? "Floating" : s.eco.fxDefence < 0.45 ? "Light defence" : s.eco.fxDefence < 0.8 ? "Strong defence" : "All-out defence"}: ₦{Math.round(s.eco.fx).toLocaleString()}</span>
          <span className="g-tiny g-muted">Reserves ${s.eco.reserves.toFixed(1)}bn. Set how hard to defend it below.</span></div>
        <div className="fx-dial"><b>Fuel price</b>
          <span className="g-small">₦{Math.round(s.fuel.pump)} a litre · subsidy covers {Math.round(s.fuel.coverage * 100)}%</span>
          <button className="fx-subtab" onClick={() => setTab("policies")}>Change the fuel price</button></div>
      </div>
    </Card>
  );
}
