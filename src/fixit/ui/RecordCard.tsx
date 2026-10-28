"use client";
/** A "never happened since…" card: full-screen celebration (or warning) when Nigeria hits a historic number. */
import { useEffect } from "react";
import { Button } from "../../game/ui/kit";
import { useS } from "./store";
import { sfx } from "./sound";
import type { RecordDef } from "../engine/history";

const COLORS = ["#00c875", "#f5d57a", "#ffffff", "#0b1f36", "#e11d48", "#3b82f6"];
export function Confetti() {
  const s = useS();
  if (s.settings.reducedMotion) return null;
  return (
    <div className="fx-confetti" aria-hidden>
      {Array.from({ length: 46 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 12) * 0.12}s`, animationDuration: `${2.6 + (i % 5) * 0.4}s`, transform: `rotate(${i * 29}deg)` }} />)}
    </div>
  );
}

export function RecordCard({ r, label, onClose }: { r: RecordDef; label?: string; onClose: () => void }) {
  useEffect(() => { sfx(r.tone === "good" ? "fanfare" : "doom"); }, [r.id, r.tone]);
  return (
    <div className="fx-record" data-tone={r.tone} role="dialog" aria-modal="true" aria-label={r.title}>
      {r.tone === "good" && <Confetti />}
      <div className="fx-record-card">
        <div className="fx-record-icon" aria-hidden>{r.icon}</div>
        <div className="fx-record-big">{r.big}</div>
        <h2>{r.title}</h2>
        <p>{r.body}</p>
        {label && <div className="g-tiny" style={{ opacity: .8 }}>{label}</div>}
        <Button variant={r.tone === "good" ? "primary" : "danger"} onClick={onClose}>{r.tone === "good" ? "Nigerians are dancing! Continue" : "Understood. Continue"}</Button>
      </div>
    </div>
  );
}
