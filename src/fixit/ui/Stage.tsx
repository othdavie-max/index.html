"use client";
/** The world stage: victory paths, seats you can campaign for, and resolutions you can put to the UN. */
import { useState } from "react";
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { BODIES, PATHS, RESOLUTIONS, bodyBlock, campaign, holds, propose, resBlock, supporters } from "../engine/un";
import { W } from "../engine/world";
import { monthLabel } from "../engine/util";
import { sfx } from "./sound";

export function VictoryCard() {
  const s = useS();
  return (
    <Card title="Ways to win" icon={<span aria-hidden>🏆</span>}>
      <div className="g-col" style={{ gap: 8 }}>
        {PATHS.map((p) => { const v = Math.round(p.progress(s)); const won = s.flags[`victory:${p.id}`]; return (
          <div key={p.id} className="fx-path" data-won={won !== undefined ? "1" : undefined}>
            <span className="fx-path-icon" aria-hidden>{p.icon}</span>
            <div className="g-grow"><div className="g-row g-between"><b className="g-small">{p.name}</b><span className="g-tiny">{won !== undefined ? `✅ Won ${monthLabel(Number(won))}` : `${v}%`}</span></div><div className="fx-bar"><i style={{ width: `${v}%` }} /></div><div className="g-tiny g-muted">{p.goal}</div></div>
          </div>); })}
      </div>
      <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Winning a path is celebrated, and the game goes on. Try to win them all.</div>
    </Card>
  );
}

export function StageCard() {
  const s = useS();
  const { act, tx } = useFix();
  const [tally, setTally] = useState<{ yes: string[]; no: string[] } | null>(null);
  const sup = supporters(s); const n = W(s).c.length;
  return (
    <>
      <Card title="Seats and clubs" icon={<span aria-hidden>🏛️</span>}>
        <div className="g-small g-muted" style={{ marginBottom: 6 }}>Seats are won by votes. Right now <b>{sup} of {n}</b> countries would back Nigeria. Visits, aid, favours and trade pacts win more friends.</div>
        <div className="fx-powers">
          {BODIES.map((b) => { const bl = bodyBlock(s, b); const have = holds(s, b.id); return (
            <div key={b.id} className="fx-power" data-blocked={bl && !have ? "1" : undefined}>
              <div className="g-row" style={{ gap: 8 }}><span style={{ fontSize: 22 }} aria-hidden>{b.icon}</span><b className="g-small">{b.name}</b></div>
              <div className="g-tiny g-muted">{tx(b.blurb)} {b.effect}</div>
              <div className="g-tiny">Needs {b.votes} votes{b.term ? ` · ${b.term / 12} years` : " · permanent"}</div>
              {have ? <div className="g-tiny" style={{ color: "#047857" }}>✅ {bl}</div> : bl ? <div className="g-tiny" style={{ color: "#92400e" }}>{bl}</div> : <Button size="sm" onClick={() => { sfx("tap"); act((g) => campaign(g, b.id)); }}>Campaign ⚡{b.pc}</Button>}
            </div>); })}
        </div>
      </Card>
      <Card title="Resolutions at the UN" icon={<span aria-hidden>🗳️</span>}>
        <div className="g-col" style={{ gap: 6 }}>
          {RESOLUTIONS.map((r) => { const bl = resBlock(s, r); return (
            <div key={r.id} className="fx-ask" data-blocked={bl ? "1" : undefined}>
              <span style={{ fontSize: 22 }} aria-hidden>{r.icon}</span>
              <div className="g-grow"><b className="g-small">{r.name}</b><div className="g-tiny g-muted">{tx(r.blurb)}</div>{bl && <div className="g-tiny" style={{ color: "#92400e" }}>{bl}</div>}</div>
              <Button size="sm" disabled={!!bl} onClick={() => { sfx("tap"); const res = act((g) => propose(g, r.id)) as { tally?: { yes: string[]; no: string[] } }; setTally(res.tally ?? null); }}>Table it ⚡4</Button>
            </div>); })}
          {tally && <div className="fx-tally"><div><b>For ({tally.yes.length})</b><span>{tally.yes.join(" ")}</span></div><div><b>Against ({tally.no.length})</b><span>{tally.no.join(" ")}</span></div></div>}
        </div>
      </Card>
    </>
  );
}
