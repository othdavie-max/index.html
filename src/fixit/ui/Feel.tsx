"use client";
/** First-turns coach, "what changed" chips, the TV breaking-news banner with a street reaction, and the 12-month review. */
import { useEffect } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { yearReview } from "../engine/review";
import { monthLabel } from "../engine/util";
import { reaction } from "../engine/street";
import { sfx } from "./sound";
import type { NewsItem } from "../engine/types";

// ---------------------------------------------------------------- the coach: three nudges, then it gets out of the way
export const COACH: { text: string; target: "notes" | "next" | "govern" | "danger" }[] = [
  { text: "Welcome, Mr/Madam President! The notices on the left are decisions waiting for you. Tap one to see your options.", target: "notes" },
  { text: "Good. Now press the big gold NEXT TURN button to move one month. Prices, the naira and people's mood all change.", target: "next" },
  { text: "Open Govern to start projects, and check Advisers for honest advice. Different choices lead to very different Nigerias.", target: "govern" },
  { text: "Up here are your danger meters. If street anger, coup risk or world pressure climb, trouble comes. Tap them to see what to do.", target: "danger" },
];
export const coachStep = (flags: Record<string, unknown>) => (typeof flags.coach === "number" && (flags.coach as number) < COACH.length ? (flags.coach as number) : -1);
export function Coach({ step }: { step: number }) {
  const { act } = useFix();
  const c = COACH[step];
  if (!c) return null;
  return (
    <div className="fx-coach" role="status">
      <div className="fx-coach-face" aria-hidden>🧑🏾‍💼</div>
      <div className="g-grow"><b>Chief of Staff</b><p>{c.text}</p>
        <div className="g-row" style={{ gap: 8 }}>
          <Button size="sm" variant="primary" onClick={() => act((s) => { s.flags.coach = step + 1; return { ok: true, message: "" }; }, { silent: true })}>{step === COACH.length - 1 ? "Got it" : "Next tip"}</Button>
          <button className="fx-mg-skip" onClick={() => act((s) => { s.flags.coach = 99; return { ok: true, message: "" }; }, { silent: true })}>Skip tips</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- what changed since last turn
export function TurnChips() {
  const { summary, closeSummary } = useFix();
  useEffect(() => { if (!summary) return; const t = setTimeout(closeSummary, 7000); return () => clearTimeout(t); }, [summary, closeSummary]);
  if (!summary || !summary.changes.length) return null;
  return (
    <div className="fx-turnchips" aria-label="What changed this turn">
      <span className="g-tiny" style={{ color: "#9db3c9" }}>{summary.to}:</span>
      {summary.changes.slice(0, 4).map((c) => <span key={c.label} className="fx-chip2" data-tone={c.tone}>{c.tone === "good" ? "▲" : c.tone === "bad" ? "▼" : "•"} {c.label}: {c.from} → {c.to}</span>)}
    </div>
  );
}

// ---------------------------------------------------------------- TV breaking news
export function BreakingBanner({ item, onDone }: { item: NewsItem; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 7500); return () => clearTimeout(t); }, [item.id, onDone]);
  return (
    <div className="fx-breaking" data-tone={item.tone} role="status" onClick={onDone}>
      <div className="fx-breaking-tag"><span aria-hidden>🎙️</span> BREAKING</div>
      <div className="g-grow"><b>{item.headline}</b>{item.body && <div className="fx-breaking-body">{item.body.length > 150 ? `${item.body.slice(0, 147)}…` : item.body}</div>}<div className="fx-breaking-react">💬 {reaction(item.headline, item.tone === "good" ? "good" : "bad")}</div></div>
    </div>
  );
}

// ---------------------------------------------------------------- the 12-month review
export function YearReview({ onClose }: { onClose: () => void }) {
  const s = useS();
  const r = yearReview(s);
  useEffect(() => { sfx("gavel"); }, []);
  return (
    <Modal title={`Year ${r.year} in review`} wide onClose={onClose} footer={<Button variant="primary" onClick={onClose}>On to year {r.year + 1}</Button>}>
      <div className="g-col" style={{ gap: 12 }}>
        <div className="g-small" style={{ fontWeight: 700 }}>{r.line}</div>
        <div><div className="g-section-title">Your biggest decisions</div>
          {r.decisions.length === 0 ? <div className="g-small g-muted">A quiet year: you made few big decisions.</div> : r.decisions.map((d, i) => <div key={i} className="fx-tl" data-tone={d.tone} style={{ marginTop: 6 }}><div className="g-tiny g-muted">{monthLabel(d.month)}</div><b className="g-small">{d.title}</b><div className="g-small">{d.text}</div></div>)}
        </div>
        {r.echoes.length > 0 && <div><div className="g-section-title">What it led to</div>{r.echoes.map((d, i) => <div key={i} className="fx-tl" data-tone={d.tone} style={{ marginTop: 6 }}><div className="g-tiny g-muted">{monthLabel(d.month)}</div><b className="g-small">{d.title}</b><div className="g-small">{d.text}</div></div>)}</div>}
        <div><div className="g-section-title">What is now permanent</div>{r.permanent.length === 0 ? <div className="g-small g-muted">Nothing irreversible yet.</div> : <ul className="fx-why">{r.permanent.map((p, i) => <li key={i}>{p}</li>)}</ul>}</div>
      </div>
    </Modal>
  );
}
