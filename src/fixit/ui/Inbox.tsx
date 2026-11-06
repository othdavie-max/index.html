"use client";
/** Messages from other countries: requests to answer, calls, returned favours. */
import { useState } from "react";
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { answer, inbox, markRead } from "../engine/worldlife";
import { monthLabel } from "../engine/util";
import { sfx } from "./sound";

export function InboxCard() {
  const s = useS();
  const { act, tx } = useFix();
  const [all, setAll] = useState(false);
  const list = [...inbox(s)].reverse();
  const open = list.filter((m) => !m.done && m.options);
  const shown = all ? list : [...open, ...list.filter((m) => !(m.options && !m.done))].slice(0, 6);
  return (
    <Card title={`Diplomatic inbox${open.length ? ` (${open.length} waiting)` : ""}`} icon={<span aria-hidden>📨</span>}>
      {list.length === 0 && <div className="g-small g-muted">No messages yet. As Nigeria grows, other countries will start asking for things, and calling.</div>}
      <div className="g-col" style={{ gap: 8 }}>
        {shown.map((m) => (
          <div key={m.id} className="fx-msg" data-open={!m.done && m.options ? "1" : undefined}>
            <div className="g-row g-between"><b className="g-small">{tx(m.title)}</b><span className="g-tiny g-muted">{monthLabel(m.month)}</span></div>
            <div className="g-small">{tx(m.text)}</div>
            {!m.done && m.options && <div className="g-row g-wrap" style={{ gap: 6, marginTop: 6 }}>{m.options.map((o) => <Button key={o.id} size="sm" variant={o.id === "give" ? "primary" : "default"} title={o.hint} onClick={() => { sfx("tap"); act((g) => answer(g, m.id, o.id)); }}>{o.label}</Button>)}</div>}
            {!m.done && m.options && m.due !== undefined && <div className="g-tiny g-muted">Reply by {monthLabel(m.due)} or they will take silence as an answer.</div>}
            {m.done && m.outcome && m.options && <div className="g-tiny" style={{ color: "#475569" }}>↳ {tx(m.outcome)}</div>}
          </div>
        ))}
      </div>
      {list.length > 6 && <button className="fx-link" style={{ paddingLeft: 0 }} onClick={() => { setAll(!all); act(markRead, { silent: true }); }}>{all ? "Show fewer" : `Show all ${list.length}`}</button>}
    </Card>
  );
}
