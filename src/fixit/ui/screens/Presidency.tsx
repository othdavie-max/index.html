"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, BriefcaseBusiness, Coins, Fuel, HeartHandshake, ShieldAlert, TrendingUp, X } from "lucide-react";
import { useFix, useS, type Tab } from "../store";
import { Button, Card, EmptyState, Modal } from "../../../game/ui/kit";
import { computeChallenge } from "../../engine/challenge";
import { economyScore, fiscalCondition, headline, securityLabel, trendOf, type Tone, type Layer } from "../../engine/views";
import { nb, monthLabel } from "../../engine/util";
import { openEvents } from "../../engine/events";
import { ChallengePanel, EventCard } from "../Decisions";
import { MapLegend, MapView } from "../MapView";
import { Trend, Word, TONE_WORD, bn } from "../parts";

function Kpi({ icon, label, value, sub, tone, word, trend, go }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: React.ReactNode; tone: Tone; word: string; trend?: React.ReactNode; go: Tab }) {
  const { setTab } = useFix();
  return (
    <button className="fx-kpi" data-tone={tone} onClick={() => setTab(go)} aria-label={`${label}: ${typeof value === "string" ? value : ""} ${word}. Open details.`}>
      <span className="fx-k-label">{icon}{label}</span>
      <span className="fx-k-val">{value}</span>
      <span className="g-row g-wrap" style={{ gap: 6 }}><Word tone={tone}>{word}</Word>{trend}</span>
      <span className="fx-k-sub">{sub}</span>
    </button>
  );
}

export function Kpis() {
  const s = useS();
  const fc = fiscalCondition(s), ec = economyScore(s), sec = securityLabel(s), hl = headline(s);
  const fxTone: Tone = hl.fxChangePct < -3 ? "good" : hl.fxChangePct <= 5 ? "ok" : hl.fxChangePct <= 20 ? "warn" : "bad";
  const infTone: Tone = s.eco.inflation < 10 ? "good" : s.eco.inflation < 18 ? "ok" : s.eco.inflation < 28 ? "warn" : "bad";
  const hap = s.gov.happiness;
  const hapTone: Tone = hap >= 62 ? "good" : hap >= 48 ? "ok" : hap >= 35 ? "warn" : "bad";
  const un = s.jobs.unemployment;
  const unTone: Tone = un < 10 ? "good" : un < 16 ? "ok" : un < 22 ? "warn" : "bad";
  const fuelRatio = s.fuel.costMonthly / Math.max(1, s.fin.revenue);
  const fuelTone: Tone = s.fuel.coverage < 0.05 ? "ok" : fuelRatio < 0.1 ? "ok" : fuelRatio < 0.2 ? "warn" : "bad";
  return (
    <div className="fx-kpis">
      <Kpi go="nation" icon={<Banknote size={14} />} label="Government funds" value={bn(s.fin.treasury)} tone={fc.tone} word={fc.label} sub={`${s.fin.deficit > 0 ? "Deficit" : "Surplus"} ${nb(Math.abs(s.fin.deficit))}/month. ${fc.why}`} trend={<Trend delta={trendOf(s, "treasury") / 1000} unit="tn" label="Change in government funds over three months" />} />
      <Kpi go="nation" icon={<Coins size={14} />} label="Naira per US dollar" value={`₦${Math.round(s.eco.fx).toLocaleString()}`} tone={fxTone} word={fxTone === "good" ? "Stronger" : fxTone === "ok" ? "Holding" : "Weaker"} sub={`A lower number is a stronger naira. At start: ₦${s.baseline.fx.toLocaleString()} (${hl.fxChangePct >= 0 ? "+" : ""}${hl.fxChangePct}%).`} trend={<Trend delta={trendOf(s, "fx")} goodWhenDown digits={0} label="Change in the naira rate over three months" />} />
      <Kpi go="nation" icon={<TrendingUp size={14} />} label="Cost of living" value={`${s.eco.inflation.toFixed(1)}%`} tone={infTone} word={infTone === "good" ? "Calm" : infTone === "ok" ? "Easing" : infTone === "warn" ? "High" : "Severe"} sub={`Yearly price rise. Food ${s.eco.foodInflation.toFixed(0)}%. Real incomes at ${hl.realIncome} (start 100).`} trend={<Trend delta={trendOf(s, "inflation")} goodWhenDown unit=" pts" label="Change in inflation over three months" />} />
      <Kpi go="nation" icon={<HeartHandshake size={14} />} label="Public happiness" value={`${Math.round(hap)}/100`} tone={hapTone} word={TONE_WORD[hapTone === "good" ? "good" : hapTone === "ok" ? "ok" : hapTone === "warn" ? "warn" : "bad"]} sub={`Approval ${Math.round(s.gov.approval)}%. ${s.why.happiness?.[0] ?? ""}`} trend={<Trend delta={trendOf(s, "happiness")} digits={0} label="Change in happiness over three months" />} />
      <Kpi go="nation" icon={<BriefcaseBusiness size={14} />} label="Employment" value={`${(100 - un).toFixed(1)}% working`} tone={unTone} word={unTone === "good" ? "Strong" : unTone === "ok" ? "Fair" : unTone === "warn" ? "Weak" : "Poor"} sub={`Unemployment ${un.toFixed(1)}%; young people ${s.jobs.youth.toFixed(0)}%.`} trend={<Trend delta={trendOf(s, "unemployment")} goodWhenDown unit=" pts" label="Change in unemployment over three months" />} />
      <Kpi go="map" icon={<ShieldAlert size={14} />} label="Security" value={sec.label} tone={sec.tone} word={`Risk ${Math.round(s.sec.index)}`} sub={`${Math.round(s.sec.displaced).toLocaleString()}k people displaced. Lower risk is better.`} trend={<Trend delta={trendOf(s, "insecurity")} goodWhenDown digits={0} label="Change in security risk over three months" />} />
      <Kpi go="nation" icon={<TrendingUp size={14} />} label="Economy overall" value={`${ec.score}/100`} tone={ec.tone} word={ec.label} sub={`Growth ${s.eco.growth.toFixed(1)}% a year. Power ${Math.round((s.power.available / s.power.demand) * 100)}% of need.`} trend={<Trend delta={trendOf(s, "growth")} unit=" pts" label="Change in growth over three months" />} />
      <Kpi go="policies" icon={<Fuel size={14} />} label="Petrol price" value={`₦${Math.round(s.fuel.pump)}/L`} tone={fuelTone} word={s.fuel.coverage < 0.05 ? "Market price" : "Subsidised"} sub={`Subsidy bill ${nb(s.fuel.costMonthly)}/month (${Math.round(fuelRatio * 100)}% of revenue).`} trend={<Trend delta={trendOf(s, "fuel")} goodWhenDown digits={0} label="Change in petrol price over three months" />} />
    </div>
  );
}

export function Presidency() {
  const s = useS();
  const { setTab, setSelect, act } = useFix();
  const ch = computeChallenge(s);
  const evs = openEvents(s).filter((e) => `event:${e.id}` !== ch.id);
  const [layer, setLayer] = useState<Layer>("overview");
  const [open, setOpen] = useState<string | null>(null);
  const last = s.reports[s.reports.length - 1];
  const heads = useMemo(() => s.news.slice(-4).reverse(), [s.news.length, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const showBrief = !s.flags.briefed && s.month === 0;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      {showBrief && (
        <div className="g-card-flat g-row g-wrap" style={{ background: "#e3faf0", borderColor: "#86e3b9", gap: 14 }}>
          <div className="g-grow" style={{ minWidth: 220 }}>
            <b>Your first month.</b> <span className="g-small">① Look at the card below: it is the country&apos;s biggest problem. ② Pick an action (or hold steady). ③ Press <b>End month</b> at the top right and see what changed.</span>
          </div>
          <Button size="sm" onClick={() => act((x) => { x.flags.briefed = true; return { ok: true, message: "" }; }, { silent: true })}><X size={14} /> Got it</Button>
        </div>
      )}
      <Kpis />
      <ChallengePanel ch={ch} />
      <div className="fx-two">
        <div className="g-col" style={{ gap: 14 }}>
          <Card title="Situations on the ground" icon={<AlertTriangle size={16} />} action={<Button size="sm" onClick={() => setTab("map")}>Open map</Button>}>
            {evs.length === 0 ? <EmptyState title="Nothing urgent" body="No protests, attacks or crises are waiting. New situations appear when conditions on the ground warrant them." /> : (
              <div className="g-col">
                {evs.slice(0, 4).map((e) => (
                  <div key={e.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
                    <div className="g-grow"><b className="g-small">{e.title}</b><div className="g-tiny g-muted">{e.deadline - s.month <= 0 ? "Answer now" : `${e.deadline - s.month} month(s) left`} · scale {e.scale}/5</div></div>
                    <Button size="sm" variant="primary" onClick={() => setOpen(e.id)}>Respond</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title={last ? `Latest: ${last.title}` : "Latest report"}>
            {last ? <><div className="g-tiny g-muted">{monthLabel(last.month)}</div><ul className="fx-why" style={{ marginTop: 6 }}>{last.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></> : <div className="g-small g-muted">Your decisions and what they did will be explained here.</div>}
          </Card>
          <Card title="Headlines" action={<Button size="sm" onClick={() => setTab("news")}>All news</Button>}>
            {heads.map((n) => <div key={n.id} className="g-list-row"><div className="g-grow"><div className="g-small" style={{ fontWeight: 700 }}>{n.headline}</div><div className="g-tiny g-muted">{monthLabel(n.month)}</div></div></div>)}
          </Card>
        </div>
        <Card title="Where it is happening" action={<Button size="sm" onClick={() => setTab("map")}>Full map</Button>}>
          <div className="g-row g-wrap" style={{ gap: 6, marginBottom: 8 }} role="group" aria-label="Map layer">
            {(["overview", "food", "security", "unrest"] as Layer[]).map((l) => <button key={l} className="g-chip" aria-pressed={layer === l} onClick={() => setLayer(l)}>{l === "overview" ? "Overall" : l[0].toUpperCase() + l.slice(1)}</button>)}
          </div>
          <MapView s={s} layer={layer} selectedState={null} selectedLga={null} onSelectState={(id) => { setSelect({ state: id, lga: null }); setTab("map"); }} onSelectLga={() => undefined} height={340} labels={false} />
          <div style={{ marginTop: 8 }}><MapLegend layerLabel={layer === "overview" ? "Overall stress" : layer} /></div>
        </Card>
      </div>
      {open && <Modal title="Respond" wide onClose={() => setOpen(null)}>{s.events.filter((e) => e.id === open && e.status === "open").map((e) => <EventCard key={e.id} e={e} />)}{!s.events.some((e) => e.id === open && e.status === "open") && <div className="g-small">Dealt with. <Button size="sm" onClick={() => setOpen(null)}>Close</Button></div>}</Modal>}
    </div>
  );
}
