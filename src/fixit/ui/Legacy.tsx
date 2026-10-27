"use client";
import { Award, RotateCcw, Play } from "lucide-react";
import { useFix, useS } from "./store";
import { Button, Card } from "../../game/ui/kit";
import { buildLegacy, chooseExit, refuseToLeave } from "../engine/legacy";
import { computeEnding } from "../engine/endings";
import { democracyLabel } from "../engine/power";
import { sfx } from "./sound";
import { useEffect } from "react";
import { presidentName, snap } from "../engine/util";
import type { TermResult } from "../engine/types";
import { ShareButton } from "./ShareCard";
import { Portrait } from "../../game/ui/kit";
import { hallEntry } from "../persistence";
import { GROUPS, TRAITS, dominantTrait } from "../engine/society";

export function Legacy() {
  const s = useS();
  const { continueTerm, startNew, quit, act, saves, toast } = useFix();
  const last: TermResult | undefined = s.terms[s.terms.length - 1];
  const choosing = !!s.ended?.choice;
  const ending = s.done && !choosing ? computeEnding(s) : null;
  useEffect(() => { if (ending) void saves.addEnding(ending.id).catch(() => undefined); }, [ending?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (choosing) sfx("doom"); else if (ending) sfx(ending.tone === "good" ? "fanfare" : ending.tone === "bad" ? "doom" : "gavel"); }, [choosing, ending?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!last || !s.ended) return null;
  if (choosing) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Your fall" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(8,12,24,.94)", overflow: "auto", padding: "24px 12px", display: "grid", placeItems: "center" }}>
        <div className="g-col" style={{ maxWidth: 560, gap: 14, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 54 }} aria-hidden>{s.ended.cause === "coup" ? "🪖" : s.ended.cause === "uprising" ? "✊" : "🗳️"}</div>
          <h2 style={{ fontSize: "clamp(26px,5vw,38px)", fontWeight: 900 }}>You have fallen.</h2>
          <div style={{ color: "#cfe0ee" }}>{s.ended.text}</div>
          <div className="g-card" style={{ background: "#12304f", color: "#fff", borderColor: "#c8a24a" }}>
            <div>Your accounts abroad hold about <b>₦{Math.round(s.me.wealth).toLocaleString()}m</b>. A jet is fuelled at the airport.<br />Your record: {s.me.evidence >= 35 ? "a paper trail of corruption" : "abuses of power"}.</div>
          </div>
          <div className="g-row g-wrap" style={{ justifyContent: "center", gap: 10 }}>
            <Button variant="danger" onClick={() => { sfx("doom"); act((x) => ({ ok: chooseExit(x, "flee"), message: "You boarded the plane." }), { silent: true }); }}>✈️ Flee with the money</Button>
            <Button variant="primary" onClick={() => { sfx("gavel"); act((x) => ({ ok: chooseExit(x, "stay"), message: "You stayed." }), { silent: true }); }}>🏠 Stay and face the music</Button>
          </div>
          <div className="g-tiny" style={{ color: "#9db3c9" }}>Fleeing keeps your fortune and ends your name in this country. Staying risks the courts but leaves the door open for history to be kinder.</div>
        </div>
      </div>
    );
  }
  const lg = buildLegacy(s, last.start, last.end, last.result);
  const won = last.result === "won";
  return (
    <div role="dialog" aria-modal="true" aria-label="Legacy report" style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(8,20,36,.86)", overflow: "auto", padding: "20px 12px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }} className="g-col">
        {ending && s.meta.daily && (() => {
          const h = hallEntry(s);
          const text = `Nigeria: Can You Fix It? Daily ${s.meta.daily.slice(0, 4)}-${s.meta.daily.slice(4, 6)}-${s.meta.daily.slice(6)}: ${ending.name} · score ${h?.score ?? 0} · approval ${h?.approval ?? 0}%`;
          return <div className="g-card-flat" style={{ background: "#0b1f36", color: "#fff", borderColor: "#c8a24a" }}><b>📅 Daily challenge result</b><div className="g-small" style={{ color: "#cfe0ee", marginTop: 4 }}>{text}</div><Button size="sm" variant="primary" style={{ marginTop: 6 }} onClick={() => { try { void navigator.clipboard.writeText(text); toast("Result copied. Paste it to challenge a friend."); } catch { toast("Could not copy. Select the text above.", true); } }}>Copy result to share</Button></div>;
        })()}
        {ending && (
          <div className="g-card fx-ending" data-tone={ending.tone}>
            <div style={{ fontSize: 56 }} aria-hidden>{ending.icon}</div>
            <div className="g-tiny" style={{ letterSpacing: ".16em", fontWeight: 800 }}>YOUR ENDING</div>
            <h2 style={{ fontSize: "clamp(28px,6vw,44px)", fontWeight: 900, lineHeight: 1.05 }}>{ending.name}</h2>
            <p style={{ marginTop: 8, maxWidth: 640 }}>{ending.epilogue}</p>
            <div className="g-tiny" style={{ marginTop: 6, opacity: .8 }}>{democracyLabel(s)} · {s.rule.executions ? `${s.rule.executions} executed · ` : ""}{s.rule.wrongful ? `${s.rule.wrongful} wrongly convicted · ` : ""}{s.rule.stolenElection ? "A stolen election · " : ""}Wealth ₦{Math.round(s.me.wealth).toLocaleString()}m</div>
          </div>
        )}
        <div className="g-card-dark g-card" style={{ background: "#0b1f36", color: "#fff" }}>
          <div className="g-tiny" style={{ letterSpacing: ".14em", color: "#9db3c9", fontWeight: 800 }}>{s.done ? "YOUR LEGACY" : `END OF TERM ${last.term}`}</div>
          <div className="g-row" style={{ gap: 14, marginTop: 6, alignItems: "flex-start" }}>
            <Portrait p={s.meta.portrait} size={64} name={s.meta.president} />
            <div>
              <h2 style={{ fontSize: "clamp(26px,5vw,38px)", fontWeight: 900, lineHeight: 1.05 }}>{lg.title}</h2>
              <div style={{ color: "#cfe0ee", marginTop: 6 }}>{presidentName(s)}. {lg.titleWhy}</div>
              {dominantTrait(s) && <div style={{ color: "#86efac", marginTop: 4, fontWeight: 700 }}><Award size={15} style={{ verticalAlign: "-2px" }} /> Remembered as {TRAITS[dominantTrait(s)!].title}</div>}
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
        <Card title="How each group judged you">
          <div className="fx-pills">{GROUPS.map((g) => <span key={g.id} className={`g-badge ${s.groups[g.id] >= 55 ? "g-badge-green" : s.groups[g.id] < 35 ? "g-badge-red" : ""}`}>{g.icon} {g.label}: {s.groups[g.id]}</span>)}</div>
          <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Assembly: {s.assembly.passed} bills passed, {s.assembly.defeats} defeated.</div>
        </Card>
        {s.achievements.length > 0 && <Card title={`Milestones (${s.achievements.length})`}><div className="fx-pills">{s.achievements.map((a) => <span key={a.id} className="g-badge g-badge-green">🏅 {a.label}</span>)}</div></Card>}
        <div className="g-row g-wrap" style={{ gap: 10 }}>
          {s.ended.overstay && <div className="g-card-flat" style={{ background: "#3b0a14", borderColor: "#e11d48", color: "#fff", flex: "1 1 100%" }}><b>⚖️ Refuse to leave office?</b><div className="g-small" style={{ color: "#fecdd3", marginTop: 4 }}>The constitution says your time is up. You can stay anyway. There is no vote and no law, only the army and your word. Expect: ECOWAS suspending Nigeria, a Supreme Court ruling against you, governors refusing to recognise you, officers meeting in secret, a general strike. Each time you do it, it gets worse.</div><Button variant="danger" size="sm" style={{ marginTop: 8 }} onClick={() => act((x) => refuseToLeave(x))}>Refuse to leave</Button></div>}
          {won && <Button variant="primary" onClick={continueTerm}><Play size={16} /> Begin your second term</Button>}
          <ShareButton s={s} title={lg.title} a={last.start} b={last.end} verdict={lg.titleWhy} />
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
