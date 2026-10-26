"use client";
import { Award, RotateCcw, Play } from "lucide-react";
import { useFix, useS } from "./store";
import { Button, Card } from "../../game/ui/kit";
import { buildLegacy } from "../engine/legacy";
import { snap } from "../engine/util";
import type { TermResult } from "../engine/types";

export function Legacy() {
  const s = useS();
  const { continueTerm, startNew, quit } = useFix();
  const last: TermResult | undefined = s.terms[s.terms.length - 1];
  if (!last || !s.ended) return null;
  const lg = buildLegacy(s, last.start, last.end, last.result);
  const won = last.result === "won";
  return (
    <div role="dialog" aria-modal="true" aria-label="Legacy report" style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(8,20,36,.86)", overflow: "auto", padding: "20px 12px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }} className="g-col">
        <div className="g-card-dark g-card" style={{ background: "#0b1f36", color: "#fff" }}>
          <div className="g-tiny" style={{ letterSpacing: ".14em", color: "#9db3c9", fontWeight: 800 }}>{s.done ? "YOUR LEGACY" : `END OF TERM ${last.term}`}</div>
          <div className="g-row" style={{ gap: 14, marginTop: 6, alignItems: "flex-start" }}>
            <Award size={44} color="#00c875" aria-hidden />
            <div>
              <h2 style={{ fontSize: "clamp(26px,5vw,38px)", fontWeight: 900, lineHeight: 1.05 }}>{lg.title}</h2>
              <div style={{ color: "#cfe0ee", marginTop: 6 }}>{lg.titleWhy}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontWeight: 700 }}>{s.ended.text}</div>
        </div>

        <Card title={`Where you started and where you left it (${Math.round(lg.months / 12 * 10) / 10} years)`}>
          <div className="g-col" style={{ gap: 0 }}>
            {lg.rows.map((r) => (
              <div key={r.label} className="g-list-row">
                <div className="g-grow g-small"><b>{r.label}</b></div>
                <div className="g-small g-muted g-num">{r.start}</div><span aria-hidden>→</span><div className="g-small g-num"><b>{r.end}</b></div>
                <div className={`g-small g-num ${r.better === null ? "g-muted" : r.better ? "fx-delta-good" : "fx-delta-bad"}`} style={{ minWidth: 76, textAlign: "right" }}>{r.delta} {r.better === null ? "" : r.better ? "▲ better" : "▼ worse"}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="fx-two">
          <Card title="What went well">{lg.achievements.length ? <ul className="fx-why">{lg.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul> : <div className="g-small g-muted">Little to celebrate.</div>}</Card>
          <Card title="What went badly">{lg.failures.length ? <ul className="fx-why">{lg.failures.map((a, i) => <li key={i}>{a}</li>)}</ul> : <div className="g-small g-muted">No major failures.</div>}</Card>
          <Card title="Crises you faced">{lg.crises.length ? <ul className="fx-why">{lg.crises.map((a, i) => <li key={i}>{a}</li>)}</ul> : <div className="g-small g-muted">A calm term.</div>}</Card>
          <Card title="Why it turned out this way">{lg.causes.length ? <ul className="fx-why">{lg.causes.map((a, i) => <li key={i}>{a}</li>)}</ul> : <div className="g-small g-muted">Few strong forces stood out.</div>}</Card>
        </div>
        {s.achievements.length > 0 && <Card title={`Milestones (${s.achievements.length})`}><div className="fx-pills">{s.achievements.map((a) => <span key={a.id} className="g-badge g-badge-green">🏅 {a.label}</span>)}</div></Card>}
        <div className="g-row g-wrap" style={{ gap: 10 }}>
          {won && <Button variant="primary" onClick={continueTerm}><Play size={16} /> Begin your second term</Button>}
          <Button variant={won ? "default" : "primary"} onClick={() => startNew(s.meta.seed)}><RotateCcw size={16} /> Replay this same world</Button>
          <Button onClick={() => startNew()}>New presidency</Button>
          <Button variant="light" onClick={quit} style={{ background: "#12304f", color: "#fff" }}>Back to title</Button>
        </div>
        <div className="g-tiny" style={{ color: "#9db3c9" }}>Your title comes from what actually happened: prices, the naira, jobs, projects delivered, debt and your own wealth. Simulated game values.</div>
      </div>
    </div>
  );
}
void snap;
