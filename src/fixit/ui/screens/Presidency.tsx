"use client";
import { useState } from "react";
import { AlertTriangle, Banknote, BriefcaseBusiness, CalendarClock, Coins, Fuel, HeartHandshake, ShieldAlert, Target, TrendingUp, X } from "lucide-react";
import { useFix, useS, type Tab } from "../store";
import { Bar, Button, Card, EmptyState, Modal } from "../../../game/ui/kit";
import { computeChallenge } from "../../engine/challenge";
import { economyScore, fiscalCondition, headline, securityLabel, trendOf, monthsLeftInTerm, type Tone, type Layer } from "../../engine/views";
import { nb, monthLabel, monthShort } from "../../engine/util";
import { openEvents } from "../../engine/events";
import { upcoming } from "../../engine/forecast";
import { PROMISE_BY_ID } from "../../engine/promises";
import { reelectionChance } from "../../engine/legacy";
import { ChallengePanel, EventCard } from "../Decisions";
import { MapLegend, MapView } from "../MapView";
import { Trend, Word, bn } from "../parts";
import { CabinetCard } from "../Cabinet";
import { CampaignPanel, RivalCard } from "../Campaign";
import { streetVoices } from "../../engine/voices";
import { MessageCircle } from "lucide-react";

function Kpi({ icon, label, value, sub, tone, word, trend, go }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: Tone; word: string; trend?: React.ReactNode; go: Tab }) {
  const { setTab } = useFix();
  return (
    <button className="fx-kpi" data-tone={tone} onClick={() => setTab(go)} aria-label={`${label}: ${value}, ${word}. ${sub}. Open details.`}>
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
      <Kpi go="nation" icon={<Banknote size={14} />} label="Government cash" value={bn(s.fin.treasury)} tone={fc.tone} word={fc.label} sub={`${s.fin.deficit > 0 ? "Losing" : "Saving"} ${nb(Math.abs(s.fin.deficit))} a month`} trend={<Trend delta={trendOf(s, "treasury") / 1000} unit="tn" label="three-month change" />} />
      <Kpi go="nation" icon={<Coins size={14} />} label="Naira per $1" value={`₦${Math.round(s.eco.fx).toLocaleString()}`} tone={fxTone} word={fxTone === "good" ? "Stronger" : fxTone === "ok" ? "Holding" : "Weaker"} sub="Lower number = stronger naira" trend={<Trend delta={trendOf(s, "fx")} goodWhenDown digits={0} label="three-month change" />} />
      <Kpi go="nation" icon={<TrendingUp size={14} />} label="Prices rising" value={`${s.eco.inflation.toFixed(1)}%`} tone={infTone} word={infTone === "good" ? "Calm" : infTone === "ok" ? "Easing" : infTone === "warn" ? "High" : "Severe"} sub={`a year · food ${s.eco.foodInflation.toFixed(0)}%`} trend={<Trend delta={trendOf(s, "inflation")} goodWhenDown unit=" pts" label="three-month change" />} />
      <Kpi go="nation" icon={<HeartHandshake size={14} />} label="Happiness" value={`${Math.round(hap)}/100`} tone={hapTone} word={hapTone === "good" ? "Happy" : hapTone === "ok" ? "Patient" : hapTone === "warn" ? "Unhappy" : "Angry"} sub={`Approval ${Math.round(s.gov.approval)}%`} trend={<Trend delta={trendOf(s, "happiness")} digits={0} label="three-month change" />} />
      <Kpi go="nation" icon={<BriefcaseBusiness size={14} />} label="Jobs" value={`${un.toFixed(1)}%`} tone={unTone} word={unTone === "good" ? "Strong" : unTone === "ok" ? "Fair" : unTone === "warn" ? "Weak" : "Poor"} sub={`out of work · youth ${s.jobs.youth.toFixed(0)}%`} trend={<Trend delta={trendOf(s, "unemployment")} goodWhenDown unit=" pts" label="three-month change" />} />
      <Kpi go="map" icon={<ShieldAlert size={14} />} label="Security" value={sec.label} tone={sec.tone} word={`Risk ${Math.round(s.sec.index)}`} sub={`${Math.round(s.sec.displaced).toLocaleString()}k displaced`} trend={<Trend delta={trendOf(s, "insecurity")} goodWhenDown digits={0} label="three-month change" />} />
      <Kpi go="nation" icon={<TrendingUp size={14} />} label="Economy" value={`${ec.score}/100`} tone={ec.tone} word={ec.label} sub={`growing ${s.eco.growth.toFixed(1)}% a year`} trend={<Trend delta={trendOf(s, "growth")} unit=" pts" label="three-month change" />} />
      <Kpi go="policies" icon={<Fuel size={14} />} label="Petrol" value={`₦${Math.round(s.fuel.pump)}/L`} tone={fuelTone} word={s.fuel.coverage < 0.05 ? "Market price" : "Subsidised"} sub={s.fuel.coverage < 0.05 ? "No subsidy bill" : `Subsidy ${nb(s.fuel.costMonthly)}/month`} trend={<Trend delta={trendOf(s, "fuel")} goodWhenDown digits={0} label="three-month change" />} />
    </div>
  );
}

function StatusBar() {
  const s = useS();
  const odds = Math.round(reelectionChance(s) * 100);
  const left = monthsLeftInTerm(s);
  const onTrack = s.promises.filter((id) => PROMISE_BY_ID[id]?.kept(s)).length;
  return (
    <div className="fx-status" role="region" aria-label="Your standing">
      <div className="fx-odds" style={{ ["--p" as string]: odds }} aria-label={`Re-election chance if the vote were today: ${odds}%`}><span>{odds}%</span></div>
      <div>
        <div style={{ fontWeight: 800 }}>{s.term >= 2 ? "Final term" : "Re-election chance if the vote were today"}</div>
        <div className="g-small g-muted">{left} month{left === 1 ? "" : "s"} until {s.term >= 2 ? "you leave office" : "election day"}. It rises with happiness, trust and promises kept. Unkept promises start to count against you in the final year.</div>
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>Promises: {onTrack} of {s.promises.length} on target</div>
        <div className="g-small g-muted">{s.promises.map((id) => PROMISE_BY_ID[id]?.short).join(" · ")}</div>
      </div>
    </div>
  );
}

function ComingUp() {
  const s = useS();
  const items = upcoming(s, 7);
  return (
    <Card title="Coming up: what your decisions set in motion" icon={<CalendarClock size={16} />}>
      <div className="fx-timeline">
        {items.map((u, i) => (
          <div key={i} className="fx-tl">
            <span className="g-tiny g-muted" style={{ fontWeight: 700 }}>{u.month <= s.month ? "This month" : monthShort(u.month)}</span>
            <i data-t={u.tone} aria-hidden />
            <div><div className="g-small" style={{ fontWeight: 700 }}>{u.kind === "consequence" ? "Possible: " : ""}{u.label}</div>{u.detail && <div className="g-tiny g-muted">{u.detail}</div>}</div>
          </div>
        ))}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>● green = expected benefit · ● red = risk · ● amber = could go either way, depending on what you do before then.</div>
    </Card>
  );
}

function Voices() {
  const s = useS();
  const v = streetVoices(s, 3);
  const face = (m: string) => (m === "bad" ? "😟" : m === "good" ? "🙂" : "😐");
  return (
    <Card title="Voices from the street" icon={<MessageCircle size={16} />}>
      {v.map((x) => (
        <div key={x.who} className="fx-voice">
          <span className="fx-voice-av" style={{ background: x.mood === "bad" ? "#ffe4ea" : x.mood === "good" ? "#e3faf0" : "#eef2f6" }} aria-label={x.mood === "bad" ? "unhappy" : x.mood === "good" ? "happy" : "neutral"}>{face(x.mood)}</span>
          <div><div className="g-small" style={{ color: "#0f172a" }}>“{x.quote}”</div><div className="g-tiny g-muted">{x.who}, {x.place}</div></div>
        </div>
      ))}
      <div className="g-tiny g-muted" style={{ marginTop: 4 }}>Fictional people, reacting to this month&apos;s real numbers.</div>
    </Card>
  );
}

function Promises() {
  const s = useS();
  if (!s.promises.length) return null;
  return (
    <Card title="Your promises" icon={<Target size={16} />}>
      <div className="g-col" style={{ gap: 10 }}>
        {s.promises.map((id) => {
          const p = PROMISE_BY_ID[id];
          if (!p) return null;
          const pr = p.progress(s), kept = p.kept(s);
          return (
            <div key={id}>
              <div className="g-row g-between g-small"><b>{p.label}</b><Word tone={kept ? "good" : pr >= 0.5 ? "ok" : "warn"}>{kept ? "On target" : pr >= 0.5 ? "Getting there" : "Off track"}</Word></div>
              <Bar value={pr} tone={kept ? undefined : pr >= 0.5 ? "blue" : "amber"} label={`${p.label} progress`} />
              <div className="g-tiny g-muted">{p.status(s)}</div>
            </div>
          );
        })}
      </div>
    </Card>
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
  const showBrief = !s.flags.briefed && s.month === 0;
  return (
    <div className="g-col" style={{ gap: 14 }}>
      {showBrief && (
        <div className="g-card-flat g-row g-wrap" style={{ background: "#e3faf0", borderColor: "#86e3b9", gap: 14 }}>
          <div className="g-grow" style={{ minWidth: 220 }}>
            <b>Your first month.</b> <span className="g-small">Tip: pick your ministers in “Your cabinet” below (free for three months). ① Read the big card: it is the country&apos;s biggest problem. ② Pick an action. Green chips show what improves, red what gets worse, and the yellow “Later” box what it sets up for the future. ③ Press <b>End month</b>.</span>
          </div>
          <Button size="sm" onClick={() => act((x) => { x.flags.briefed = true; return { ok: true, message: "" }; }, { silent: true })}><X size={14} /> Got it</Button>
        </div>
      )}
      <StatusBar />
      <CampaignPanel />
      <Kpis />
      <ChallengePanel ch={ch} />
      <div className="fx-two">
        <ComingUp />
        <div className="g-col" style={{ gap: 14 }}>
          <Promises />
          <Card title="Situations on the ground" icon={<AlertTriangle size={16} />} action={<Button size="sm" onClick={() => setTab("map")}>Map</Button>}>
            {evs.length === 0 ? <EmptyState title="Nothing else urgent" body="New situations appear when conditions on the ground warrant them." /> : (
              <div className="g-col">
                {evs.slice(0, 4).map((e) => (
                  <div key={e.id} className="g-list-row" style={{ alignItems: "flex-start" }}>
                    <div className="g-grow"><b className="g-small">{e.title}</b><div className="g-tiny g-muted">{e.kind === "opportunity" ? "Opportunity" : e.deadline - s.month <= 0 ? "Answer now" : `${e.deadline - s.month} month(s) left`}</div></div>
                    <Button size="sm" variant="primary" onClick={() => setOpen(e.id)}>Respond</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <div className="fx-two">
        <CabinetCard />
        <div className="g-col" style={{ gap: 14 }}>
          <Voices />
          <RivalCard />
        </div>
      </div>
      <div className="fx-two">
        <Card title={last ? last.title : "Latest report"} action={<Button size="sm" onClick={() => setTab("news")}>All decisions</Button>}>
          {last ? <><div className="g-tiny g-muted">{monthLabel(last.month)}</div><ul className="fx-why" style={{ marginTop: 6 }}>{last.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></> : <div className="g-small g-muted">Your decisions and what they did will be explained here.</div>}
        </Card>
        <Card title="Where it is happening" action={<Button size="sm" onClick={() => setTab("map")}>Full map</Button>}>
          <div className="g-row g-wrap" style={{ gap: 6, marginBottom: 8 }} role="group" aria-label="Map layer">
            {(["overview", "food", "security", "unrest"] as Layer[]).map((l) => <button key={l} className="g-chip" aria-pressed={layer === l} onClick={() => setLayer(l)}>{l === "overview" ? "Overall" : l[0].toUpperCase() + l.slice(1)}</button>)}
          </div>
          <MapView s={s} layer={layer} selectedState={null} selectedLga={null} onSelectState={(id) => { setSelect({ state: id, lga: null }); setTab("map"); }} onSelectLga={() => undefined} height={320} labels={false} />
          <div style={{ marginTop: 8 }}><MapLegend layerLabel={layer === "overview" ? "Overall stress" : layer} /></div>
        </Card>
      </div>
      {open && <Modal title="Respond" wide onClose={() => setOpen(null)}>{s.events.filter((e) => e.id === open && e.status === "open").map((e) => <EventCard key={e.id} e={e} />)}{!s.events.some((e) => e.id === open && e.status === "open") && <div className="g-small">Dealt with. <Button size="sm" onClick={() => setOpen(null)}>Close</Button></div>}</Modal>}
    </div>
  );
}
