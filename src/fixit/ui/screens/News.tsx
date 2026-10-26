"use client";
import { useMemo, useState } from "react";
import { Newspaper } from "lucide-react";
import { useS } from "../store";
import { Badge, Card, EmptyState } from "../../../game/ui/kit";
import { STATE_BY_ID } from "../../../game/data/states";
import { monthLabel } from "../../engine/util";

export function News() {
  const s = useS();
  const [tone, setTone] = useState<"all" | "good" | "bad">("all");
  const items = useMemo(() => [...s.news].reverse().filter((n) => tone === "all" || n.tone === tone).slice(0, 80), [s.news, tone, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-page-title">News</div>
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
      <div className="g-tiny g-muted">Fictional scenario. Headlines are generated from simulated changes and are not real reporting.</div>
    </div>
  );
}
