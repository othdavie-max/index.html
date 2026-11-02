"use client";
/** Trade and the world: what we import, what we can make ourselves, and who will buy from us. */
import { Button, Card } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { Globe } from "./Globe";
import { GOODS, buildFactory, canExport, exportBlock, factoryBlock, factoryCost, imp, importFlow, exportFlow, localShare, nbUsd, setPolicy, signExport, totalExports, totalImports, type Policy } from "../engine/imports";
import { W } from "../engine/world";
import { nb } from "../engine/util";
import { sfx } from "./sound";

const P_LABEL: Record<Policy, string> = { open: "Open", tariff: "Tariff", ban: "Ban" };
export function TradePanel() {
  const s = useS();
  const { act, tx } = useFix();
  const st = imp(s); const w = W(s);
  const bill = totalImports(s), ex = totalExports(s);
  return (
    <div className="g-col" style={{ gap: 14 }}>
      <Card title="Nigeria and the world" icon={<span aria-hidden>🌍</span>}>
        <Globe lens="trade" />
      </Card>
      <Card title="The trade balance" icon={<span aria-hidden>⚖️</span>}>
        <div className="fx-tradesum">
          <div><span className="g-tiny g-muted">Still importing</span><b style={{ color: "#c2410c" }}>{nbUsd(bill)}</b><i>a year</i></div>
          <div><span className="g-tiny g-muted">Exporting (made in Nigeria, besides crude oil)</span><b style={{ color: "#047857" }}>{nbUsd(ex)}</b><i>a year</i></div>
        </div>
        <div className="g-tiny g-muted" style={{ marginTop: 6 }}>Every dollar of imports you replace with a Nigerian factory strengthens the naira and creates jobs. Ban or tax an import before home production is ready, and prices rise and smugglers get rich.</div>
      </Card>
      <Card title="What we import, and what we could make" icon={<span aria-hidden>🏭</span>}>
        <div className="g-col" style={{ gap: 10 }}>
          {GOODS.map((g) => {
            const x = st[g.id]; const l = localShare(s, g.id); const f = importFlow(s, g.id); const fb = factoryBlock(s, g.id);
            return (
              <div key={g.id} className="fx-good">
                <div className="g-row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <span className="fx-good-ic" aria-hidden>{g.icon}</span>
                  <div className="g-grow">
                    <div className="g-row g-between"><b className="g-small">{g.name}</b><span className="g-tiny" style={{ color: "#c2410c" }}>{f >= 0.05 ? `${nbUsd(f)} a year in imports` : "No longer imported"}</span></div>
                    <div className="g-tiny g-muted">{tx(g.blurb)}</div>
                    <div className="fx-good-bar" aria-label={`Made in Nigeria: ${Math.round(l * 100)}%`}><i style={{ width: `${l * 100}%` }} /><span>Made in Nigeria {Math.round(l * 100)}%</span></div>
                  </div>
                </div>
                {!g.fixed && (
                  <div className="g-row g-wrap" style={{ gap: 6, marginTop: 6 }}>
                    <div className="fx-pol" role="group" aria-label={`${g.name} import policy`}>{(["open", "tariff", "ban"] as Policy[]).map((p) => <button key={p} aria-pressed={x.policy === p} data-p={p} onClick={() => { sfx("tap"); act((g2) => setPolicy(g2, g.id, p)); }}>{P_LABEL[p]}{p === "ban" ? " ⚡3" : ""}</button>)}</div>
                    <Button size="sm" disabled={!!fb} title={fb ?? undefined} onClick={() => { sfx("tap"); act((g2) => buildFactory(g2, g.id)); }}>🏭 Build factory {x.factory > 0 ? `(level ${x.factory + 1})` : ""} · {nb(factoryCost(s, g.id))}</Button>
                    {fb && <span className="g-tiny" style={{ color: "#92400e" }}>{fb}</span>}
                  </div>
                )}
                {canExport(s, g.id) && (
                  <div className="fx-buyers">
                    <span className="g-tiny"><b>Buyers want Nigerian {g.name.toLowerCase()}:</b>{x.exports.length ? ` selling ${nbUsd(exportFlow(s, g.id))} a year` : ""}</span>
                    <div className="g-row g-wrap" style={{ gap: 6 }}>{g.buyers.map((b) => { const c = w.c.find((y) => y.id === b); if (!c) return null; const eb = exportBlock(s, g.id, b); const done = x.exports.includes(b); return <Button key={b} size="sm" variant={done ? "primary" : "default"} disabled={!!eb && !done} title={eb ?? undefined} onClick={() => { sfx("tap"); act((g2) => signExport(g2, g.id, b)); }}>{c.flag} {c.name}{done ? " ✓" : ""}</Button>; })}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
