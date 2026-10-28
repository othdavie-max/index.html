"use client";
/** The President's Office: intelligence briefings (some of it true) and the things a president can simply do. */
import { useState } from "react";
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { POWERS, RUMOUR_ACTIONS, actOnRumour, powerBlock, rumours, applyPower } from "../engine/office";
import { SpeechButton } from "./Politics";
import { nb } from "../engine/util";
import { sfx } from "./sound";

const KIND_ICON = { coup: "🎖️", minister: "💼", vp: "🤝", leak: "📰" } as const;

export function OfficePanel() {
  const s = useS();
  const { act } = useFix();
  const [pick, setPick] = useState<Record<string, string>>({});
  const live = rumours(s).filter((r) => !r.done);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="🕵️ The briefing room">
        <div className="g-col" style={{ gap: 8 }}>
          <div className="g-small g-muted">The intelligence service brings you whispers. Some are true and some are not, and acting on a false one does real harm. Dig deeper before you move, or call the National Security Council to sharpen the service.</div>
          {live.length === 0 && <div className="g-small g-muted">Nothing on the table this month.</div>}
          {live.map((r) => (
            <div key={r.id} className="fx-rumour" data-real={r.revealed ? (r.real ? "1" : "0") : undefined}>
              <div className="g-row" style={{ gap: 8 }}><span style={{ fontSize: 22 }} aria-hidden>{KIND_ICON[r.kind]}</span><div className="g-grow"><b className="g-small">{r.text}</b><div className="g-tiny g-muted">{r.hint ?? "Unverified."}</div></div></div>
              <div className="g-row g-wrap" style={{ gap: 6 }}>
                {RUMOUR_ACTIONS[r.kind].map((a) => <Button key={a.id} size="sm" variant={a.id === "investigate" ? "primary" : "default"} onClick={() => { sfx("tap"); act((x) => actOnRumour(x, r.id, a.id)); }}>{a.label}{a.pc ? ` ⚡${a.pc}` : ""}</Button>)}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="🏛️ What a president can do">
        <div className="fx-powers">
          {POWERS.map((p) => {
            const block = powerBlock(s, p);
            return (
              <div key={p.id} className="fx-power" data-blocked={block ? "1" : undefined}>
                <div className="g-row" style={{ gap: 8 }}><span style={{ fontSize: 24 }} aria-hidden>{p.icon}</span><b>{p.title}</b></div>
                <div className="g-small g-muted">{p.blurb}</div>
                {p.choices && <div className="g-row g-wrap" style={{ gap: 4 }}>{p.choices.map((c) => <button key={c.id} className="fx-subtab" aria-pressed={pick[p.id] === c.id} onClick={() => setPick({ ...pick, [p.id]: c.id })}>{c.label}</button>)}</div>}
                <div className="g-row g-between"><span className="g-tiny g-muted">⚡{p.pc}{p.cost ? ` · ${nb(p.cost)}` : ""}</span>
                  <Button size="sm" variant="primary" disabled={!!block || (!!p.choices && !pick[p.id])} title={block ?? undefined} onClick={() => { sfx("gavel"); act((x) => applyPower(x, p.id, pick[p.id])); }}>{block ?? "Do it"}</Button></div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10 }}><SpeechButton /></div>
      </Card>
      <div className="fx-dark">☠️ The dark side: powers a democrat should hesitate to use</div>
    </div>
  );
}
