"use client";

import { useState } from "react";
import type { Action } from "./engine";
import { OFFERS, invBlock, positions, type Offer } from "./invest2";
import { ActionSheet, ListGroup, ListRow } from "./ui";
import { I } from "./helpers";
import type { Player } from "./types";
import { T, naira } from "./util";

type Run = (a: Action) => void;

export function Invest2Card({ p, run }: { p: Player; run: Run }) {
  const [pick, setPick] = useState<Offer | null>(null);
  const pos = positions(p);
  if (p.age < 18) return null;
  const amounts = (o: Offer) => [1, 3, 10, 30].map((m) => Math.round(I(p, o.min) * m));
  return (
    <>
      <ListGroup title={T("Local opportunities", "Local opportunities")} sub={T("Real Nigerian money moves, with real traps. Some pay, some collapse.", "Real Naija money moves, with real traps. Some dey pay, some dey collapse.")}>
        {OFFERS.map((o) => <ListRow key={o.id} emoji={o.emoji} tile="bg-orange-100" name={T(o.en, o.pcm)} desc={T(o.blurb[0], o.blurb[1])} right={`${T("from", "from")} ${naira(Math.round(I(p, o.min)))}`} onClick={() => setPick(o)} wrap />)}
      </ListGroup>
      {pos.length > 0 && (
        <ListGroup title={T("Your local investments", "Your local investments")}>
          {pos.map((x) => {
            const o = OFFERS.find((q) => q.kind === x.kind);
            const m = x.meta as Record<string, number | string | boolean> | undefined;
            const status = x.dead ? T("Collapsed or finished", "E don collapse or finish") : x.kind === "ajo" && m ? T(`Month ${m.paid}/${m.members} · your turn: month ${m.turn}`, `Month ${m.paid}/${m.members} · your turn: month ${m.turn}`) : x.kind === "land" && m ? (m.phase === "boom" ? T("Booming", "E dey boom") : T("Quiet for now", "E quiet for now")) : x.kind === "offplan" && m ? T(`Delivery due in about ${Math.max(0, Number(m.due) + Number(m.delays) - x.yrs)} year(s)`, `Delivery fit come in like ${Math.max(0, Number(m.due) + Number(m.delays) - x.yrs)} year(s)`) : x.kind === "ponzi" ? T("Paying on paper", "E dey pay for paper") : T("Until harvest", "Till harvest");
            return <ListRow key={x.id} emoji={o?.emoji ?? "💼"} tile={x.dead ? "bg-slate-100" : "bg-emerald-100"} name={x.name} desc={status} right={x.kind === "ajo" ? undefined : naira(x.value)} onClick={() => run({ t: "inv2", op: "sell", id: x.id })} note={x.kind === "ponzi" && !x.dead ? T("Tap to cash out", "Tap to cash out") : x.kind === "land" && !x.dead ? T("Tap to sell", "Tap to sell") : undefined} wrap />;
          })}
        </ListGroup>
      )}
      {pick && (
        <ActionSheet emoji={pick.emoji} tile="bg-orange-100" title={T(pick.en, pick.pcm)} sub={T(pick.blurb[0], pick.blurb[1])} onClose={() => setPick(null)}>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {amounts(pick).map((a) => {
              const b = invBlock(p, pick.kind, a);
              return <ListRow key={a} emoji={pick.kind === "ajo" ? "📅" : "💰"} tile="bg-emerald-100" name={pick.kind === "ajo" ? T(`${naira(a)} a month`, `${naira(a)} every month`) : naira(a)} note={b} disabled={Boolean(b)} onClick={() => { run({ t: "inv2", op: "buy", kind: pick.kind, amount: a }); setPick(null); }} />;
            })}
          </div>
        </ActionSheet>
      )}
    </>
  );
}
