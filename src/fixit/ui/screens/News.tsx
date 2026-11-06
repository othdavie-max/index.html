"use client";
import { useMemo, useState } from "react";
import { Newspaper } from "lucide-react";
import { useS } from "../store";
import { Badge, Card, EmptyState, Tabs } from "../../../game/ui/kit";
import { STATE_BY_ID } from "../../../game/data/states";
import { monthLabel } from "../../engine/util";

export function News() {
  const s = useS();
  const [tone, setTone] = useState<"all" | "good" | "bad">("all");
  const [view, setView] = useState<"news" | "decisions">("news");
  const reports = useMemo(() => [...s.reports].reverse().slice(0, 80), [s.reports.length, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = s.echoes.filter((e) => e.status === "pending").sort((a, b) => a.due - b.due);
  const items = useMemo(() => [...s.news].reverse().filter((n) => tone === "all" || n.tone === tone).slice(0, 80), [s.news, tone, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">News &amp; your decisions</div>
      <Tabs tabs={[{ id: "news", label: "Headlines" }, { id: "decisions", label: `Your decisions (${s.reports.length})` }]} value={view} onChange={setView} />
      {view === "decisions" && (
        <div className="g-col" style={{ gap: 12 }}>
          {pending.length > 0 && <Card title="Still to come from your decisions">{pending.map((e) => <div key={e.id} className="g-list-row"><Badge tone={e.tone === "good" ? "green" : e.tone === "bad" ? "red" : "amber"}>{monthLabel(e.due)}</Badge><div className="g-grow g-small"><b>{e.hint}</b><div className="g-tiny g-muted">{e.cause} in {monthLabel(e.causeMonth)}</div></div></div>)}</Card>}
          {reports.length === 0 ? <Card><EmptyState title="No decisions yet" body="Everything you decide, and what came of it, is recorded here." /></Card> : reports.map((r) => (
            <Card key={r.id} className="g-col">
              <div className="g-row g-wrap" style={{ gap: 6 }}><Badge tone={r.tone === "good" ? "green" : r.tone === "bad" ? "red" : undefined}>{r.title.startsWith("Consequence") ? "Consequence" : r.tone === "good" ? "Went well" : r.tone === "bad" ? "Went badly" : "Decision"}</Badge><span className="g-tiny g-muted">{monthLabel(r.month)}</span></div>
              <b>{r.title}</b>
              <ul className="fx-why">{r.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </Card>
          ))}
        </div>
      )}
      {view === "news" && <>
      <div className="g-row g-wrap" style={{ gap: 6 }} role="group" aria-label="Filter">
        {([["all", "All"], ["good", "Good news"], ["bad", "Bad news"]] as const).map(([k, l]) => <button key={k} className="g-chip" aria-pressed={tone === k} onClick={() => setTone(k)}>{l}</button>)}
      </div>
      {items.length === 0 ? <Card><EmptyState icon={<Newspaper size={30} />} title="No stories yet" body="Every headline is written from something that actually changed in the simulation. End a month to see the first ones." /></Card> : (
        <div className="g-grid g-grid-2">
          {items.map((n) => (
            <Card key={n.id} className="g-col">
              <div className="g-row g-wrap" style={{ gap: 6 }}><Badge tone={n.tone === "good" ? "green" : n.tone === "bad" ? "red" : undefined}>{n.tone === "good" ? "Good news" : n.tone === "bad" ? "Bad news" : "News"}</Badge>{n.stateId && <Badge>{STATE_BY_ID[n.stateId]?.name}</Badge>}<span className="g-tiny g-muted">{monthLabel(n.month)}</span></div>
              <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{n.headline}</div>
              {n.body && <div className="g-small g-muted">{n.body}</div>}
            </Card>
          ))}
        </div>
      )}
      </>}
      <div className="g-tiny g-muted">Fictional scenario. Headlines are generated from simulated changes and are not real reporting.</div>
    </div>
  );
}
