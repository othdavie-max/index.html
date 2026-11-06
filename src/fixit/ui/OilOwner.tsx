"use client";
/** Who owns Nigeria's oil: the state's stake in each block, the partners, and what you can do about it. */
import { useState } from "react";
import { Bar, Button, Card, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { BASE_TAKE, buyout, buyoutBlock, cashCallMonthly, indigenise, oilShare, renegotiate, sellStake, stepCost, take, type Block } from "../engine/oilshare";
import { nb } from "../engine/util";
import { sfx } from "./sound";

const KIND: Record<Block["kind"], { icon: string; label: string }> = { jv: { icon: "🤝", label: "Joint venture" }, psc: { icon: "🚢", label: "Production sharing" }, local: { icon: "🇳🇬", label: "Nigerian firms" } };
export function OilOwnerCard() {
  const s = useS(); const { act } = useFix();
  const o = oilShare(s); const t = take(s); const [pick, setPick] = useState<string | null>(null);
  const b = o.blocks.find((x) => x.id === pick);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <Card title="How much of our oil is ours?" icon={<span aria-hidden>🛢️</span>}>
        <div className="fx-emp-stats">
          <div><span>Nigeria keeps</span><b>{Math.round(t * 100)}¢</b><i>of every barrel's value (start: {Math.round(BASE_TAKE * 100)}¢)</i></div>
          <div><span>Share of costs we pay</span><b>{nb(cashCallMonthly(s))}</b><i>a month to the partners</i></div>
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 8 }}>Most crude comes from joint ventures where the state oil company (NNPC) holds about 55 to 60 per cent and companies like Shell, TotalEnergies and Eni hold the rest. Deep-water fields run on contracts where the state takes about 60 per cent of profit oil. A bigger stake means more oil money, but you must pay your share of the costs, and investors worry. Shares are simplified from public reporting.</div>
      </Card>
      {o.blocks.map((x) => {
        const K = KIND[x.kind]; const prod = Math.round(x.prod * 100);
        return (
          <div key={x.id} className="fx-block">
            <div className="g-row g-between"><b className="g-small">{K.icon} {x.name}</b><span className="g-tiny g-muted">{prod}% of output · {K.label}</span></div>
            <Bar value={x.state} label={`State share ${Math.round(x.state * 100)}%`} />
            <div className="g-row g-between g-tiny"><span><b>Nigeria {Math.round(x.state * 100)}%</b>{x.kind === "psc" ? " of profit oil" : ""}</span><span className="g-muted">{x.partners.map((p) => `${p.who} ${Math.round(p.share * 100)}%`).join(" · ") || "no partner left"}</span></div>
            <div className="g-tiny g-muted">{x.blurb}</div>
            <Button size="sm" onClick={() => setPick(x.id)}>Options</Button>
          </div>
        );
      })}
      {b && (
        <Modal title={b.name} onClose={() => setPick(null)}>
          <div className="g-col" style={{ gap: 8 }}>
            <div className="g-small">{b.blurb}</div>
            <div className="g-tiny g-muted">State {Math.round(b.state * 100)}% · {b.partners.map((p) => `${p.who} ${Math.round(p.share * 100)}%`).join(", ") || "no partners"}</div>
            {b.kind !== "local" && <Button disabled={!!buyoutBlock(s, b.id)} onClick={() => { sfx("gavel"); act((g) => buyout(g, b.id)); }}>🏦 Buy 5 more points · ${stepCost(s, b).toFixed(2)}bn{buyoutBlock(s, b.id) ? ` (${buyoutBlock(s, b.id)})` : ""}</Button>}
            {b.kind === "psc" && <Button onClick={() => { sfx("gavel"); act((g) => renegotiate(g, b.id)); }}>📜 Tighten the contract terms (risky)</Button>}
            {b.kind !== "local" && <Button onClick={() => { sfx("gavel"); act((g) => indigenise(g, b.id, false)); }}>🇳🇬 Hand 10 points to a Nigerian firm: open bidding</Button>}
            {b.kind !== "local" && <Button onClick={() => { sfx("gavel"); act((g) => indigenise(g, b.id, true)); }}>🤫 Hand 10 points to a friend: no bidding (₦420m to you)</Button>}
            <Button onClick={() => { sfx("gavel"); act((g) => sellStake(g, b.id)); }}>💵 Sell 5 points for cash</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
