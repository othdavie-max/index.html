"use client";
/** The meta layer's screens: political capital, "why did that move?", the yearly agenda, the inner circle, legacy perks. */
import { useEffect, useState } from "react";
import { Button, Card, Modal, Portrait } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { AGENDA_BY_ID, AGENDA_PICKS, MAX_PERKS, PERKS, agendaProgress, cast, directorMood, pickAgenda, whyChain, type WhyKey } from "../engine/meta";
import { sfx } from "./sound";
import type { LegacyMeta } from "../persistence";
import { EMPTY_LEGACY } from "../persistence";

const TONE: Record<string, string> = { good: "#047857", bad: "#be123c", neutral: "#475569" };

export function WhyModal({ k, onClose, onOpen }: { k: WhyKey; onClose: () => void; onOpen?: () => void }) {
  const s = useS();
  const w = whyChain(s, k);
  const mood = directorMood(s);
  return (
    <Modal title={`Why? ${w.title}`} onClose={onClose} footer={<>{onOpen && <Button variant="primary" onClick={onOpen}>Open the panel</Button>}<Button onClick={onClose}>Close</Button></>}>
      <div className="g-col" style={{ gap: 12 }}>
        <div className="fx-why-head">
          <b style={{ fontSize: 26 }}>{w.now}</b>
          <span style={{ color: TONE[w.tone], fontWeight: 800 }}>{w.change}</span>
        </div>
        {w.reasons.length > 0 && <div><div className="g-section-title">What is driving it</div><ul className="fx-chain">{w.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul></div>}
        {w.levers.length > 0 && <div><div className="g-section-title">What you have in play</div><ul className="fx-chain fx-chain-b">{w.levers.map((l, i) => <li key={i} data-good={l.good ? "1" : "0"}><b>{l.label}</b><span>{l.text}</span></li>)}</ul></div>}
        {w.moves.length > 0 && <div><div className="g-section-title">Your recent big moves</div><ul className="fx-chain fx-chain-c">{w.moves.map((m, i) => <li key={i}>{m.title}</li>)}</ul></div>}
        {k === "capital" && <div className="g-small">The country feels: <b>{mood.label}</b>. {mood.label === "Storm" ? "The game gives you breathing room after hard months." : mood.label === "Too quiet" ? "A calm spell never lasts. Use it." : "A normal rhythm of crises."}</div>}
        <div className="g-small g-muted">{w.tip}</div>
      </div>
    </Modal>
  );
}

export function AgendaModal({ onClose }: { onClose: () => void }) {
  const s = useS();
  const { act } = useFix();
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => { sfx("tap"); setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : x.length >= AGENDA_PICKS ? [...x.slice(1), id] : [...x, id])); };
  const year = Math.floor(s.month / 12) + 1;
  const last = s.cap.agendaLog.filter((l) => l.year === year - 1);
  const confirm = () => { act((x) => { pickAgenda(x, sel); return { ok: true, message: sel.length ? "Your agenda is set. Finish the year and you will be judged on it." : "No agenda this year." }; }, { silent: true }); sfx("fanfare"); onClose(); };
  return (
    <Modal title={`Year ${year}: set your agenda`} wide footer={<><Button variant="primary" disabled={sel.length === 0} onClick={confirm}>Set my agenda ({sel.length}/{AGENDA_PICKS})</Button><Button onClick={() => { act((x) => { x.cap.agendaDue = false; return { ok: true, message: "" }; }, { silent: true }); onClose(); }}>Skip this year</Button></>}>
      <div className="g-col" style={{ gap: 10 }}>
        <div className="g-small">Pick up to {AGENDA_PICKS} priorities for the next 12 months. Each gives a small boost in its area. At the year-end review you are judged: <b>keep it for +12 political capital and a bump in approval</b>, miss it and lose some trust.</div>
        {last.length > 0 && <div className="g-card-flat g-small">Last year: {last.map((l) => `${AGENDA_BY_ID[l.id].icon} ${AGENDA_BY_ID[l.id].name} ${l.ok ? "✅ kept" : "❌ missed"}`).join(" · ")}</div>}
        <div className="fx-agenda-grid" role="group" aria-label="Agenda cards">
          {s.cap.offer.map((id) => { const d = AGENDA_BY_ID[id]; return (
            <button key={id} className="fx-agenda" aria-pressed={sel.includes(id)} onClick={() => toggle(id)}>
              <span className="fx-agenda-ic" aria-hidden>{d.icon}</span>
              <b>{d.name}</b>
              <i>{d.blurb}</i>
              <span className="g-tiny"><b>Goal:</b> {d.goal}</span>
              <span className="g-tiny" style={{ color: "#047857" }}><b>Boost:</b> {d.bonusText}</span>
            </button>
          ); })}
        </div>
      </div>
    </Modal>
  );
}

export function AgendaProgress() {
  const s = useS();
  const rows = agendaProgress(s);
  if (!rows.length) return null;
  return (
    <Card title="Your agenda this year">
      <div className="g-col" style={{ gap: 8 }}>
        {rows.map((r) => (
          <div key={r.def.id} className="g-row" style={{ gap: 10 }}>
            <span style={{ fontSize: 24 }} aria-hidden>{r.def.icon}</span>
            <div className="g-grow"><b>{r.def.name}</b><div className="g-tiny g-muted">{r.def.goal}</div></div>
            <span style={{ fontWeight: 800, color: r.ok ? "#047857" : "#be123c" }}>{r.ok ? "✅ on track" : "⏳"} <span className="g-tiny g-muted">{r.text}</span></span>
          </div>
        ))}
        <div className="g-tiny g-muted">Judged at the end of the year. Kept: +12 political capital and approval. Missed: lose some trust.</div>
      </div>
    </Card>
  );
}

export function CastPanel() {
  const s = useS();
  const { tx } = useFix();
  const faces = cast(s);
  return (
    <Card title="Your inner circle">
      <div className="fx-cast">
        {faces.map((f) => (
          <div key={f.id} className="fx-face" data-mood={f.mood >= 62 ? "good" : f.mood >= 36 ? "mid" : "bad"}>
            <div className="fx-face-pic"><Portrait p={f.portrait} size={52} name={f.name} /><span className="fx-face-em" aria-label={`Feeling: ${f.emotion}`}>{f.emotion}</span></div>
            <div className="fx-face-body">
              <b>{f.name}</b><span className="g-tiny g-muted">{f.icon} {f.role}</span>
              <div className="fx-face-bar" role="progressbar" aria-label={`${f.name}'s feelings about you`} aria-valuenow={f.mood} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${f.mood}%` }} /></div>
              <div className="g-tiny g-muted">{f.mood}/100 {f.trend > 1 ? `▲ +${f.trend}` : f.trend < -1 ? `▼ ${f.trend}` : ""}</div>
              <q>{tx(f.line)}</q>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Between games: legacy points buy perks; the title screen equips up to two. */
export function PerksCard({ onChange }: { onChange?: (equipped: string[]) => void }) {
  const { saves, toast } = useFix();
  const [m, setM] = useState<LegacyMeta>({ ...EMPTY_LEGACY });
  useEffect(() => { saves.legacy().then((x) => { setM(x); onChange?.(x.equipped); }).catch(() => undefined); }, [saves]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (n: LegacyMeta) => { setM(n); onChange?.(n.equipped); void saves.saveLegacy(n).catch(() => undefined); };
  const buy = (id: string) => { const p = PERKS.find((x) => x.id === id)!; if (m.points < p.cost) { toast(`You need ${p.cost} legacy points.`, true); return; } sfx("good"); save({ ...m, points: m.points - p.cost, owned: [...m.owned, id], equipped: m.equipped.length < MAX_PERKS ? [...m.equipped, id] : m.equipped }); };
  const equip = (id: string) => save({ ...m, equipped: m.equipped.includes(id) ? m.equipped.filter((x) => x !== id) : m.equipped.length >= MAX_PERKS ? [...m.equipped.slice(1), id] : [...m.equipped, id] });
  return (
    <div className="g-col" style={{ gap: 8 }}>
      <div className="g-small" style={{ color: "#cfe0ee" }}>Legacy points: <b style={{ color: "#ffd873" }}>{m.points}</b> · games finished: {m.games}{m.bestDynasty > 1 ? ` · longest dynasty: ${m.bestDynasty}` : ""}. Finish a game to earn more. Equip up to {MAX_PERKS} perks for your next presidency.</div>
      <div className="fx-perks">
        {PERKS.map((p) => { const own = m.owned.includes(p.id), on = m.equipped.includes(p.id); return (
          <button key={p.id} className="fx-pp" style={{ alignItems: "flex-start", padding: "8px 10px" }} aria-pressed={on} onClick={() => (own ? equip(p.id) : buy(p.id))}>
            <span><b>{p.icon} {p.name}</b> <span className="g-tiny" style={{ color: own ? "#a7f3d0" : "#ffd873" }}>{own ? (on ? "equipped" : "owned") : `${p.cost} pts`}</span><div className="g-tiny" style={{ color: "#cfe0ee" }}>{p.blurb}</div></span>
          </button>
        ); })}
      </div>
    </div>
  );
}
