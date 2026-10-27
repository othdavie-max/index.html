"use client";
/** Panels that make the country feel alive: fuel and refineries, investor deals, enemies, and what your decisions caused. */
import { useFix, useS } from "./store";
import { Badge, Bar, Button, Callout, Card, EmptyState, Portrait } from "../../game/ui/kit";
import { STATE_BY_ID } from "../../game/data/states";
import { dealsBuilding, dealsOpen } from "../engine/investors";
import { ENEMY_ACTIONS, activeEnemies, dealWithEnemy } from "../engine/ripples";
import { monthLabel, nb } from "../engine/util";
import { sfx } from "./sound";

const queueWord = (v: number) => (v < 25 ? "No queues" : v < 45 ? "Short queues" : v < 65 ? "Long queues" : "Severe shortages");

export function FuelPanel() {
  const s = useS();
  const O = s.oil;
  const capacity = Math.max(20, O.refinery);
  const saving = Math.round(((s.eco.oilPrice * s.eco.fx) / 159 * 1.35 - s.fuel.parity) * (1 - 0.5 * s.fuel.coverage));
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="Refineries: what you built, and whether it works" icon={<span aria-hidden>🛢️</span>}>
        <div className="g-col" style={{ gap: 10 }}>
          <div><div className="g-row g-between g-small"><span>Uptime (how much of the capacity actually runs)</span><b>{Math.round(O.uptime)}%</b></div><Bar value={O.uptime / 100} tone={O.uptime < 40 ? "red" : O.uptime < 60 ? "amber" : undefined} label={`Refinery uptime ${Math.round(O.uptime)} percent`} /></div>
          <div className="g-row g-between g-small"><span>Capacity you have restored</span><b>{Math.round(capacity)}k barrels/day</b></div>
          <div className="g-row g-between g-small"><span>Fuel actually made at home</span><b>{Math.round(O.refined)}k barrels/day</b></div>
          <div className="g-row g-between g-small"><span>Still imported</span><b>{Math.round(s.fuel.importShare * 100)}% of demand</b></div>
          <div className="g-row g-between g-small"><span>Local fuel saves you about</span><b>{saving > 0 ? `₦${saving} per litre` : "nothing yet"}</b></div>
          <div className="g-row g-between g-small"><span>Petrol at the pump</span><b>₦{Math.round(s.fuel.pump)}</b></div>
        </div>
        {O.uptime < 55 && <Callout tone="warn">Your refineries are running below 55%. They break down without maintenance, and theft and corruption make it worse. Raise road and maintenance spending, and tackle oil theft.</Callout>}
      </Card>
      <Card title="Queues and shortages" icon={<span aria-hidden>⛽</span>}>
        <div className="g-row g-between g-small"><b>{queueWord(O.scarcity)}</b><span className="g-muted">{Math.round(O.scarcity)}/100</span></div>
        <Bar value={O.scarcity / 100} tone={O.scarcity >= 60 ? "red" : O.scarcity >= 40 ? "amber" : undefined} label={`Fuel scarcity ${Math.round(O.scarcity)} out of 100`} />
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Queues come from depending on imports, thin dollar reserves, an unpaid subsidy bill and oil theft. Every refinery you restore and keep running reduces them, and the mood improves.</div>
      </Card>
    </div>
  );
}

export function InvestorsPanel() {
  const s = useS();
  const building = dealsBuilding(s), open = dealsOpen(s);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="Investor confidence" icon={<span aria-hidden>🏦</span>}>
        <div className="g-row g-between g-small"><b>{s.eco.investor >= 60 ? "Investors are keen" : s.eco.investor >= 45 ? "Investors are watching" : "Investors are staying away"}</b><span className="g-muted">{Math.round(s.eco.investor)}/100</span></div>
        <Bar value={s.eco.investor / 100} tone={s.eco.investor < 35 ? "red" : s.eco.investor < 45 ? "amber" : undefined} label={`Investor confidence ${Math.round(s.eco.investor)}`} />
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Above about 40, real offers start arriving: refineries, solar parks, factories. A stable naira, honest government and safe roads bring them. Coups, rigged elections and dictatorship scare them off.</div>
      </Card>
      {building.length + open.length === 0 && <EmptyState title="No deals yet" body="When investors trust the country, named offers arrive on your desk." />}
      {[...building, ...open].map((d) => (
        <Card key={d.id}>
          <div className="g-row g-between g-wrap"><b>{d.name}</b><Badge tone={d.status === "open" ? "green" : d.status === "stalled" ? "amber" : "blue"}>{d.status === "open" ? `Open since ${monthLabel(d.opened ?? 0)}` : d.status === "stalled" ? "Stalled" : `${Math.round(d.progress * 100)}% built`}</Badge></div>
          <div className="g-small g-muted">{STATE_BY_ID[d.stateId]?.name} · {d.sector} · {d.terms === "generous" ? "tax holiday" : "fair terms"}</div>
          {d.status !== "open" && <Bar value={d.progress} tone={d.status === "stalled" ? "amber" : undefined} label={`${d.name} progress`} />}
          <div className="g-small" style={{ marginTop: 4 }}>{d.benefit}</div>
          <div className="g-tiny g-muted">{d.jobs.toLocaleString()} jobs · pays about {nb(d.revenue)} a year{d.status === "stalled" ? " · stalled: low confidence, insecurity or dictatorship" : ""}</div>
        </Card>
      ))}
    </div>
  );
}

const PLAN: Record<string, string> = { protests: "Paying for protests", leaks: "Leaking documents", rival: "Backing your rival", bandits: "Stirring trouble in his region", coup: "Plotting with officers" };
export function EnemiesPanel() {
  const s = useS();
  const { act } = useFix();
  const on = activeEnemies(s), off = s.enemies.filter((e) => e.status !== "active");
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Callout tone="info">People you wrong do not disappear. Each one has a grudge and a plan. You can buy them off, make peace, or crush them, and every option has a cost.</Callout>
      {on.length === 0 && <EmptyState title="No active enemies" body="Executions, arrests, sackings and rigged elections create them. Be careful what you do." />}
      {on.map((e) => (
        <Card key={e.id}>
          <div className="g-row" style={{ gap: 10, alignItems: "flex-start" }}>
            <Portrait p={e.portrait} size={46} name={e.name} />
            <div className="g-grow">
              <b>{e.name}</b><div className="g-small g-muted">{e.reason}</div>
              <div className="g-small"><b>Plan:</b> {PLAN[e.plan]}</div>
              <div className="g-row g-between g-tiny"><span>Power {Math.round(e.power)}</span><span>Grudge {Math.round(e.grudge)}</span></div>
              <Bar value={e.power / 100} tone={e.power >= 55 ? "red" : e.power >= 35 ? "amber" : undefined} label={`${e.name} power ${Math.round(e.power)}`} />
            </div>
          </div>
          <div className="g-row g-wrap" style={{ gap: 6, marginTop: 8 }}>
            {ENEMY_ACTIONS.map((a) => <Button key={a.id} size="sm" variant={a.id === "crush" ? "danger" : "default"} title={a.explain} onClick={() => { const r = act((x) => dealWithEnemy(x, e.id, a.id)); sfx(r.ok ? "good" : "bad"); }}>{a.label} · {nb(a.cost(e))}</Button>)}
          </div>
        </Card>
      ))}
      {off.length > 0 && <Card title="Dealt with"><div className="g-col" style={{ gap: 6 }}>{off.map((e) => <div key={e.id} className="g-row g-between g-small"><span>{e.name}</span><Badge tone={e.status === "reconciled" ? "green" : e.status === "crushed" ? "red" : "amber"}>{e.status === "reconciled" ? "Made peace" : e.status === "crushed" ? "Crushed" : "Bought off"}</Badge></div>)}</div></Card>}
    </div>
  );
}

export function TimelinePanel() {
  const s = useS();
  const items = [...s.timeline].reverse().slice(0, 60);
  return (
    <div className="g-col" style={{ gap: 8 }}>
      <Callout tone="info">Every big decision sets off reactions that arrive over months. This is the trail of what you caused.</Callout>
      {items.length === 0 && <EmptyState title="Nothing yet" body="Execute, arrest, sack, rig or crack down, and the reactions will appear here." />}
      {items.map((t, i) => (
        <div key={i} className="fx-tl" data-tone={t.tone}>
          <div className="g-tiny g-muted">{monthLabel(t.month)}{t.chain ? ` · ${t.chain === "enemy" ? "enemy" : "after " + t.chain}` : ""}</div>
          <b className="g-small">{t.title}</b>
          <div className="g-small">{t.text}</div>
        </div>
      ))}
    </div>
  );
}
