"use client";
/** Adviser comments: portraits, a stance chip and what they think. Used on events, big moves, laws and strongman tools. */
import { useState } from "react";
import { Button, Portrait } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { advisers } from "../engine/dayone";
import { isAuto, propLog, setAuto } from "../engine/proposals";
import { adviceFor, briefing, eventAdvice, type Advice } from "../engine/advice";
import { AIDE_KINDS } from "../engine/dayone";
import type { GameEvent } from "../engine/types";

const STANCE = { go: { t: "Go for it", c: "#047857", bg: "#ecfdf5" }, caution: { t: "Careful", c: "#92400e", bg: "#fffbeb" }, stop: { t: "Advises against", c: "#9f1239", bg: "#fff1f2" } };

export function AdviceLine({ a, role }: { a: Advice; role?: string }) {
  const { tx } = useFix();
  const st = STANCE[a.stance];
  return (
    <div className="fx-advice" style={{ background: st.bg, borderColor: st.c }}>
      <Portrait p={a.by.portrait} size={34} name={a.by.name} />
      <div className="g-grow">
        <div className="g-row g-wrap" style={{ gap: 6 }}><b className="g-small">{a.by.name}</b><span className="g-tiny g-muted">{role ?? AIDE_KINDS[a.by.kind].tag}</span><span className="g-tiny" style={{ color: st.c, fontWeight: 800 }}>{st.t}</span></div>
        <div className="g-small" style={{ color: "#0f172a" }}>{tx(a.text)}</div>
      </div>
    </div>
  );
}
const roleOf = (s: ReturnType<typeof useS>, a: Advice) => (s.staff.vp?.id === a.by.id ? "Vice President" : "Chief of Staff");

/** a small "Ask my advisers" toggle for an action */
export function AskAdvisers({ k }: { k: string }) {
  const s = useS();
  const [open, setOpen] = useState(false);
  const list = open ? adviceFor(s, k) : [];
  if (!s.staff.cos && !s.staff.vp) return null;
  return (
    <div className="g-col" style={{ gap: 6, marginTop: 4 }}>
      <button className="fx-ask" onClick={() => setOpen(!open)} aria-expanded={open}>🧑🏾‍💼 {open ? "Hide advisers" : "Ask my advisers"}</button>
      {list.map((a) => <AdviceLine key={a.by.id} a={a} role={roleOf(s, a)} />)}
    </div>
  );
}

export function EventAdvisers({ e }: { e: GameEvent }) {
  const s = useS();
  const [open, setOpen] = useState(false);
  if (!s.staff.cos && !s.staff.vp) return null;
  const list = open ? eventAdvice(s, e) : [];
  return (
    <div className="g-col" style={{ gap: 6 }}>
      <button className="fx-ask" onClick={() => setOpen(!open)} aria-expanded={open}>🧑🏾‍💼 {open ? "Hide advisers" : "What do my advisers say?"}</button>
      {list.map((x) => (
        <div key={x.by.id} className="fx-advice" style={{ background: "#f8fafc", borderColor: "#94a3b8" }}>
          <Portrait p={x.by.portrait} size={34} name={x.by.name} />
          <div className="g-grow"><div className="g-row g-wrap" style={{ gap: 6 }}><b className="g-small">{x.by.name}</b><span className="g-tiny g-muted">{roleOf(s, { by: x.by } as Advice)}</span></div><div className="g-small">{x.text}</div></div>
        </div>
      ))}
    </div>
  );
}

export function BriefingPanel() {
  const s = useS();
  const list = briefing(s);
  return (
    <div className="g-col" style={{ gap: 10 }}>
      {list.length === 0 && <div className="g-small g-muted">You have no advisers. Pick a Chief of Staff and a Vice President to get briefings.</div>}
      {list.map((a) => <AdviceLine key={a.by.id} a={a} role={roleOf(s, a)} />)}
      <ProposalsCard />
      <div className="g-tiny g-muted">Advisers are only as good as they are skilled and honest. A flatterer will tell you everything is fine. A clever one warns you with real numbers. Different people notice different problems, so a team with different strengths sees more.</div>
    </div>
  );
}

function ProposalsCard() {
  const s = useS();
  const { act } = useFix();
  const team = advisers(s);
  const log = propLog(s).slice().reverse();
  if (!team.length) return null;
  return (
    <div className="g-card-flat g-col" style={{ gap: 8 }}>
      <b>Ideas from your advisers</b>
      <div className="g-small g-muted">Every month or two a smart adviser may bring you something to build. Say yes and you run it; tell them to handle it and their skill, honesty and loyalty decide how it goes. Switch on &quot;acts on their own&quot; to stop being asked.</div>
      {team.map((a) => (
        <div key={a.id} className="g-row g-between g-wrap" style={{ gap: 8 }}>
          <span className="g-small"><b>{a.name}</b> <span className="g-muted">{a.revealed || s.month - a.since >= 6 ? `skill ${a.skill}, honesty ${a.integrity}, loyalty ${a.loyalty}` : "(you do not know them well yet)"}</span></span>
          <Button size="sm" variant={isAuto(s, a.id) ? "primary" : "default"} onClick={() => act((x) => { setAuto(x, a.id, !isAuto(x, a.id)); return { ok: true, message: isAuto(x, a.id) ? `${a.name} will now act on good ideas without asking.` : `${a.name} will ask you first.` }; })}>{isAuto(s, a.id) ? "Acts on their own: ON" : "Asks me first"}</Button>
        </div>
      ))}
      {log.length > 0 && <div className="g-col" style={{ gap: 4 }}><div className="g-section-title">Recently</div>{log.slice(0, 6).map((l, i) => <div key={i} className="g-small">• <b>{l.by}</b> · {l.what} <span className="g-muted">({l.mode === "own" ? "you built it" : l.mode === "deleg" ? "you told them to handle it" : "on their own"})</span>: {l.text}</div>)}</div>}
    </div>
  );
}
