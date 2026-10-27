"use client";
/** "When I become president, I will…": big promises you can actually do, and what really happens. */
import { useState } from "react";
import { PC_COST } from "../engine/meta";
import { useFix, useS } from "./store";
import { Button, Callout, ConfirmDialog, Modal } from "../../game/ui/kit";
import { MOVES, moveBlock, doMove, pegged, shadowFx, type Move } from "../engine/bigmoves";
import { nb } from "../engine/util";
import { sfx } from "./sound";
import { AskAdvisers } from "./AdvisorStrip";

export function MovesPanel() {
  const s = useS();
  const { act } = useFix();
  const [ask, setAsk] = useState<Move | null>(null);
  const [ok, setOk] = useState<Move | null>(null);
  const [val, setVal] = useState(800);
  const run = (m: Move, arg?: number) => { const r = act((x) => doMove(x, m.id, arg)); sfx(r.ok ? (m.id === "peg" ? "doom" : "good") : "bad"); };
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Callout tone="info">Everyone in Nigeria has said "if I were president, I would…". Now you are. Each of these really happens in the game, and some of them do not end the way the beer parlour thinks.</Callout>
      {pegged(s) && <Callout tone="warn">Naira peg in force at ₦{Math.round(Number(s.flags.peg)).toLocaleString()}. Without the peg the rate would be about ₦{Math.round(shadowFx(s)).toLocaleString()}. Reserves: ${s.eco.reserves.toFixed(1)}bn.</Callout>}
      {MOVES.map((m) => {
        const block = moveBlock(s, m);
        return (
          <div key={m.id} className="fx-move">
            <div className="fx-move-ic" aria-hidden>{m.icon}</div>
            <div className="g-grow">
              <div className="fx-move-quote">{m.quote}</div>
              <b>{m.title}</b>
              <div className="g-small g-muted">{m.blurb}</div>
              <div className="g-tiny" style={{ color: "#9f1239", marginTop: 2 }}>Risk: {m.risk}</div>
              {block && <div className="g-tiny g-muted">⛔ {block}</div>}
              <AskAdvisers k={`move:${m.id}`} />
              {!block && <div className="g-tiny g-muted">Cost: {m.cost > 0 ? `${nb(m.cost)} and ` : ""}⚡{PC_COST.move} political capital</div>}
            </div>
            <Button size="sm" variant="primary" disabled={!!block} onClick={() => { if (m.ask) { setVal(m.ask.def(s)); setAsk(m); } else setOk(m); }}>Do it</Button>
          </div>
        );
      })}
      {ask?.ask && (
        <Modal title={ask.title} onClose={() => setAsk(null)} footer={<><Button onClick={() => setAsk(null)}>Cancel</Button><Button variant="danger" onClick={() => { run(ask, val); setAsk(null); }}>Fix the rate at ₦{val.toLocaleString()}</Button></>}>
          <div className="g-col">
            <div className="g-small">The naira is now ₦{Math.round(s.eco.fx).toLocaleString()} to the dollar. Choose the official rate. Try something bold.</div>
            <label className="g-small" htmlFor="pegv"><b>{ask.ask.label}: ₦{val.toLocaleString()}</b></label>
            <input id="pegv" type="range" min={ask.ask.min} max={ask.ask.max} step={ask.ask.step} value={val} onChange={(e) => setVal(Number(e.target.value))} />
            <div className="g-row g-wrap" style={{ gap: 6 }}>{[1, 100, 500, 1000, 1400].map((v) => <Button key={v} size="sm" onClick={() => setVal(v)}>₦{v.toLocaleString()}</Button>)}</div>
            <div className="g-tiny g-muted">{ask.risk}</div>
          </div>
        </Modal>
      )}
      {ok && <ConfirmDialog title={ok.title} body={<><p className="g-small">{ok.blurb}</p><p className="g-small" style={{ color: "#9f1239", marginTop: 6 }}><b>Risk:</b> {ok.risk}</p></>} confirmLabel="Announce it" onCancel={() => setOk(null)} onConfirm={() => { run(ok); setOk(null); }} />}
    </div>
  );
}
