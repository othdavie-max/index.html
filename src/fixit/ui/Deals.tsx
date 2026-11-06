"use client";
/** Trade deals: who sells to Nigeria, who buys from it, on what terms. Start a deal, stop one, or take a quiet cut. */
import { useState } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { GOODS, GOOD_BY_ID, imp, localShare, nbUsd, importFlow } from "../engine/imports";
import { CRUDE_BUYERS, TERMS, agreements, coverage, embargoed, type Terms } from "../engine/agreements";
import { cancelAgreement, cancelGoodExport, crudeBlock, cutFor, importBlock, signCrude, signImport, suppliersOf } from "../engine/deals";
import { W } from "../engine/world";
import { mood, heatOf } from "../engine/feuds";
import { sfx } from "./sound";

type Draft = { dir: "in" | "out"; good: string } | null;

export function DealsPanel() {
  const s = useS(); const { act } = useFix();
  const w = W(s); const a = agreements(s); const st = imp(s);
  const [draft, setDraft] = useState<Draft>(null);
  const [terms, setTerms] = useState<Terms>("fair");
  const [cut, setCut] = useState(false);
  const flag = (id: string) => w.c.find((c) => c.id === id)?.flag ?? "🏳️";
  const name = (id: string) => w.c.find((c) => c.id === id)?.name ?? id;
  const chip = (id: string, extra?: string, onStop?: () => void, tone?: "warn") => (
    <span key={id} className="fx-dealchip" data-tone={tone}>
      <span aria-hidden>{flag(id.split(":").pop()!)}</span><b>{name(id.split(":").pop()!)}</b>{extra && <i>{extra}</i>}
      {onStop && <button aria-label={`Stop the deal with ${name(id.split(":").pop()!)}`} onClick={onStop}>✕</button>}
    </span>
  );
  const open = (d: Draft) => { setTerms("fair"); setCut(false); setDraft(d); };
  const candidates = draft ? (draft.dir === "in" ? suppliersOf(draft.good) : CRUDE_BUYERS).filter((c) => (draft.dir === "in" ? !importBlock(s, draft.good, c) : !crudeBlock(s, c))) : [];
  const blocked = draft ? (draft.dir === "in" ? suppliersOf(draft.good) : CRUDE_BUYERS).filter((c) => !candidates.includes(c)) : [];
  const sign = (c: string) => { sfx("gavel"); const r = act((g) => (draft!.dir === "in" ? signImport(g, draft!.good, c, terms, cut) : signCrude(g, c, terms, cut))); if (r.ok) setDraft(null); };
  const crude = a.filter((x) => x.dir === "out" && x.good === "crude");
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <div className="g-tiny g-muted">A ship or plane only sails where a deal says so. Stop buying and you may face shortages. Stop selling and a customer gets angry. The cheapest deal is not always the best one.</div>
      <div className="fx-dealgroup">
        <div className="fx-dealhead"><b>🛢️ Who buys our crude oil</b><Button size="sm" onClick={() => open({ dir: "out", good: "crude" })}>＋ New customer</Button></div>
        <div className="fx-dealrow">{crude.length ? crude.map((x) => chip(x.id, `${TERMS[x.terms].icon}${x.cut ? " 💰" : ""}${embargoed(s, x.with) ? " ⛔ frozen" : ""}`, () => act((g) => cancelAgreement(g, x.id)), embargoed(s, x.with) ? "warn" : undefined)) : <span className="g-small g-muted">No customers. Oil income has stopped.</span>}</div>
      </div>
      {GOODS.map((g) => {
        const ins = a.filter((x) => x.dir === "in" && x.good === g.id); const outs = st[g.id].exports; const cov = coverage(s, g.id); const l = localShare(s, g.id);
        return (
          <div key={g.id} className="fx-dealgroup">
            <div className="fx-dealhead"><b>{g.icon} {g.name}</b><span className="g-tiny g-muted">made here {Math.round(l * 100)}% · imports {nbUsd(importFlow(s, g.id))}/yr</span></div>
            <div className="g-tiny" style={{ color: "#92400e", display: cov < 1 ? "block" : "none" }}>{cov === 0 ? "⚠️ No supplier: shortages ahead" : "⚠️ Only one supplier: a squeeze if they turn on you"}</div>
            <div className="fx-dealrow"><span className="g-tiny">Buy from:</span>{ins.length ? ins.map((x) => chip(x.id, `${TERMS[x.terms].icon}${x.cut ? " 💰" : ""}${embargoed(s, x.with) ? " ⛔ frozen" : ""}`, () => act((g2) => cancelAgreement(g2, x.id)), embargoed(s, x.with) ? "warn" : undefined)) : <span className="g-tiny g-muted">nobody</span>}
              <Button size="sm" onClick={() => open({ dir: "in", good: g.id })}>＋ Supplier</Button></div>
            {outs.length > 0 && <div className="fx-dealrow"><span className="g-tiny">Sell to:</span>{outs.map((c) => chip(`out:${g.id}:${c}`, embargoed(s, c) ? "⛔ frozen" : undefined, () => act((g2) => cancelGoodExport(g2, g.id, c)), embargoed(s, c) ? "warn" : undefined))}</div>}
          </div>
        );
      })}
      {draft && (
        <Modal title={draft.dir === "in" ? `New supplier: ${GOOD_BY_ID[draft.good].name}` : "New customer for Nigerian crude"} onClose={() => setDraft(null)}>
          <div className="g-col" style={{ gap: 10 }}>
            <div className="fx-terms" role="group" aria-label="Terms">{(Object.keys(TERMS) as Terms[]).map((k) => <button key={k} aria-pressed={terms === k} onClick={() => setTerms(k)}><span aria-hidden>{TERMS[k].icon}</span><b>{TERMS[k].label}</b><i>{TERMS[k].blurb}</i></button>)}</div>
            <label className="fx-cutline"><input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} /><span>💰 Take a quiet cut <b>(₦{draft.dir === "in" ? cutFor(draft.good) : 220}m to you)</b><i>You overpay a little, and a leak could become a scandal.</i></span></label>
            <div className="g-col" style={{ gap: 6 }}>
              {candidates.map((c) => { const heat = heatOf(s, c); const mo = mood(heat); return <button key={c} className="fx-pick" onClick={() => sign(c)}><span aria-hidden>{flag(c)}</span><b>{name(c)}</b><i style={{ color: mo.col }}>{mo.icon} {mo.word}</i><em>Sign</em></button>; })}
              {candidates.length === 0 && <div className="g-small g-muted">Nobody available right now.</div>}
              {blocked.map((c) => <div key={c} className="g-tiny g-muted">{flag(c)} {name(c)}: {(draft.dir === "in" ? importBlock(s, draft.good, c) : crudeBlock(s, c)) ?? ""}</div>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
