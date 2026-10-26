"use client";
/** Election night: states declare one by one on the map, with a running tally, then the result. */
import { useEffect, useMemo, useState } from "react";
import { useFix, useS } from "./store";
import { Bar, Button } from "../../game/ui/kit";
import { STATES, STATE_BY_ID } from "../../game/data/states";
import { RIVAL_PARTY, YOUR_PARTY } from "../engine/rival";
import { MapView } from "./MapView";
import { voteColor } from "./Campaign";

export function ElectionNight() {
  const s = useS();
  const { act } = useFix();
  const r = s.election!;
  // a stable, deterministic declaration order (smaller states first, Lagos and Kano late for drama)
  const order = useMemo(() => [...STATES].sort((a, b) => a.pop2006m - b.pop2006m + ((a.id.charCodeAt(4) % 3) - (b.id.charCodeAt(4) % 3)) * 0.4).map((x) => x.id), []);
  const [n, setN] = useState(s.settings.reducedMotion ? order.length : 0);
  useEffect(() => {
    if (n >= order.length) return;
    const t = setTimeout(() => setN((x) => x + 1), n < 5 ? 420 : 200);
    return () => clearTimeout(t);
  }, [n, order.length]);
  const declared = order.slice(0, n);
  let num = 0, den = 0, carried = 0;
  for (const id of declared) { const p = STATE_BY_ID[id].pop2006m; num += r.states[id] * p; den += p; if (r.states[id] >= 50) carried++; }
  const running = den ? num / den : 50;
  const done = n >= order.length;
  const last = declared[declared.length - 1];
  return (
    <div role="dialog" aria-modal="true" aria-label="Election night" style={{ position: "fixed", inset: 0, zIndex: 115, background: "#0b1f36", color: "#fff", overflow: "auto", padding: "18px 12px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }} className="g-col">
        <div className="g-row g-between g-wrap">
          <div><div className="g-tiny" style={{ letterSpacing: ".16em", color: "#9db3c9", fontWeight: 800 }}>ELECTION NIGHT</div><h2 style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 900 }}>{done ? (r.won ? "You have been re-elected!" : `${s.rival.name} wins`) : "Results are coming in…"}</h2></div>
          {!done && <Button variant="light" onClick={() => setN(order.length)}>Skip to result</Button>}
        </div>
        <div className="g-card" style={{ background: "#12304f", borderColor: "transparent", color: "#fff" }}>
          <div className="g-row g-between g-small"><b>{YOUR_PARTY.abbr} (you) {running.toFixed(1)}%</b><span style={{ color: "#9db3c9" }}>{n}/37 declared · you carried {carried}</span><b>{RIVAL_PARTY.abbr} {(100 - running).toFixed(1)}%</b></div>
          <div style={{ marginTop: 8 }}><Bar value={running / 100} label="Your share of the declared vote" /></div>
          <div className="g-tiny" style={{ color: "#9db3c9", marginTop: 6 }} aria-live="polite">{last ? `${STATE_BY_ID[last].name}: ${r.states[last].toFixed(1)}% for you, ${(100 - r.states[last]).toFixed(1)}% for ${RIVAL_PARTY.abbr}.` : "Polls have closed."}</div>
        </div>
        <div style={{ background: "#f4f7fa", borderRadius: 16, padding: 8 }}>
          <MapView s={s} layer="overview" fill={(id) => (declared.includes(id) ? voteColor(r.states[id]) : "#cbd5e1")} selectedState={null} selectedLga={null} onSelectState={() => undefined} onSelectLga={() => undefined} height="min(56vh, 520px)" showEvents={false} showProjects={false} />
          <div className="fx-legend" style={{ padding: "6px 8px" }}><span><span style={{ display: "inline-block", width: 14, height: 10, background: voteColor(62) }} /> Won by {YOUR_PARTY.abbr}</span><span><span style={{ display: "inline-block", width: 14, height: 10, background: voteColor(38) }} /> Won by {RIVAL_PARTY.abbr}</span><span><span style={{ display: "inline-block", width: 14, height: 10, background: "#cbd5e1" }} /> Not declared yet</span></div>
        </div>
        {done && (
          <div className="g-card" style={{ background: r.won ? "#04432d" : "#4c0519", borderColor: "transparent", color: "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Final: {r.national}% nationally; at least 25% in {r.statesOver25} of 37 states (24 needed){r.runoff ? ". The spread rule was not met, so a run-off decided it" : ""}.</div>
            <div className="g-small" style={{ color: "#dbe6f1", marginTop: 4 }}>Going in, you had about a {Math.round(r.chance * 100)}% chance.</div>
            <div style={{ marginTop: 10 }}><Button variant="primary" onClick={() => act((x) => { x.flags[`electionSeen:${r.month}`] = true; return { ok: true, message: "" }; }, { silent: true })}>See your legacy report</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
