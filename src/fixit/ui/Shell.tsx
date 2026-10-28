"use client";
import { useFix, useS } from "./store";
import { Button, Modal } from "../../game/ui/kit";
import { monthLabel } from "../engine/util";

export function MonthSummaryModal() {
  const { summary, closeSummary } = useFix();
  const s = useS();
  if (!summary || s.flags.noSummary) return null;
  return (
    <Modal title={`${summary.from} → ${summary.to}`} onClose={closeSummary} footer={<Button variant="primary" onClick={closeSummary}>Continue</Button>}>
      <div className="g-col">
        {summary.headline && <div className="g-card-flat" style={{ background: summary.headline.tone === "bad" ? "#fff5f6" : summary.headline.tone === "good" ? "#effcf6" : "#f8fafc" }}><div className="g-section-title">Headline of the {summary.months > 1 ? "period" : "month"}</div><div style={{ fontWeight: 800, marginTop: 2 }}>{summary.headline.headline}</div></div>}
        {summary.echoes.length > 0 && <div><div className="g-section-title">Your earlier decisions came back</div>{summary.echoes.map((e) => <div key={e.id} className="fx-later" style={{ marginTop: 6, background: e.outTone === "good" ? "#effcf6" : e.outTone === "bad" ? "#fff5f6" : "#f8fafc", borderColor: e.outTone === "good" ? "#86e3b9" : e.outTone === "bad" ? "#fda4af" : "#cbd5e1", color: "#0f172a" }}><span><b>{e.cause}</b> ({monthLabel(e.causeMonth)}): {e.outcome}</span></div>)}</div>}
        {summary.achievements.length > 0 && <div><div className="g-section-title">Milestones</div>{summary.achievements.map((a) => <div key={a.id} className="g-small" style={{ marginTop: 4 }}>🏅 <b>{a.label}</b></div>)}</div>}
        {summary.changes.length === 0 ? <div className="g-small g-muted">A quiet {summary.months > 1 ? `${summary.months} months` : "month"}: nothing moved much.</div> : (
          <div className="g-col" style={{ gap: 0 }}>
            {summary.changes.map((c) => <div key={c.label} className="g-list-row"><div className="g-grow g-small"><b>{c.label}</b>{c.because?.length ? <div className="g-tiny g-muted fx-because">{c.because.join(" ")}</div> : null}</div><span className="g-small g-muted g-num">{c.from}</span><span aria-hidden>→</span><b className={`g-small g-num ${c.tone === "good" ? "fx-delta-good" : c.tone === "bad" ? "fx-delta-bad" : ""}`}>{c.to} {c.tone === "good" ? "▲" : c.tone === "bad" ? "▼" : ""}</b></div>)}
          </div>
        )}
        {summary.events.length > 0 && <div><div className="g-section-title">New on your desk</div>{summary.events.map((e) => <div key={e.id} className="g-small" style={{ marginTop: 4 }}>• <b>{e.title}</b></div>)}</div>}
        {summary.news.filter((n) => n.id !== summary.headline?.id).length > 0 && <div><div className="g-section-title">Also reported</div>{summary.news.filter((n) => n.id !== summary.headline?.id).map((n) => <div key={n.id} className="g-small" style={{ marginTop: 4 }}>• {n.headline}</div>)}</div>}
        <div className="g-tiny g-muted">▲ better for the country, ▼ worse. Every change comes from the simulation.</div>
      </div>
    </Modal>
  );
}

export function Ticker() {
  const s = useS();
  const items = s.news.slice(-8).reverse();
  if (!items.length) return null;
  const text = items.map((n) => `${n.tone === "bad" ? "▼" : n.tone === "good" ? "▲" : "●"} ${n.headline}`).join("     ");
  return (
    <div className="fx-ticker" aria-label="Latest headlines">
      <span className="fx-ticker-tag">BREAKING</span>
      <div className="fx-ticker-track"><div className="fx-ticker-move"><span>{text}</span><span aria-hidden>{text}</span></div></div>
    </div>
  );
}

