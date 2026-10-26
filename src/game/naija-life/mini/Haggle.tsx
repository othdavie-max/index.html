"use client";

import { useEffect, useState } from "react";
import { T } from "../util";
import { pickOne, rnd } from "./hooks";

const ITEMS: [string, string, string, number][] = [["🥤", "Zobo", "Zobo", 500], ["🍞", "Agege bread", "Agege bread", 1200], ["🍌", "Plantain chips", "Plantain chips", 700], ["🥜", "Groundnut", "Groundnut", 400], ["🍩", "Puff-puff", "Puff-puff", 600], ["💧", "Pure water (bag)", "Pure water (bag)", 900]];
const TURN = 5;

/** Three customers. Ask for more and risk them walking away. */
export function Haggle({ onFinish }: { onFinish: (s: number) => void }) {
  const [cust, setCust] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [item] = useState(() => [pickOne(ITEMS), pickOne(ITEMS), pickOne(ITEMS)]);
  const [limit, setLimit] = useState(() => rnd(0.66, 0.97));
  const [offer, setOffer] = useState(() => rnd(0.45, 0.6));
  const [patience, setPatience] = useState(3);
  const [left, setLeft] = useState(TURN);
  const [say, setSay] = useState(() => T("\"How much for this one?\"", "\"How much be this one?\""));
  const [busy, setBusy] = useState(false);
  const it = item[cust];
  const price = (f: number) => `₦${Math.round((it[3] * f) / 50) * 50}`;
  const next = (got: number) => {
    const r = [...results, got];
    setResults(r);
    if (r.length >= 3) { setTimeout(() => onFinish(r.reduce((s, x) => s + x, 0) / 3), 700); return; }
    setTimeout(() => { setCust(cust + 1); setLimit(rnd(0.66, 0.97)); setOffer(rnd(0.45, 0.6)); setPatience(3); setLeft(TURN); setSay(T("\"Customer! How much?\"", "\"Customer! How much?\"")); setBusy(false); }, 900);
  };
  const decide = (ask: number | null) => {
    if (busy) return;
    if (ask === null || ask <= offer) { setBusy(true); setSay(T(`"Deal!" Sold for ${price(offer)}.`, `"Deal!" You sell am ${price(offer)}.`)); next(offer); return; }
    if (ask <= limit) { setBusy(true); setSay(T(`"Ehen, okay. Bring am." Sold for ${price(ask)}!`, `"Ehen, okay. Bring am." You sell am ${price(ask)}!`)); next(ask); return; }
    const p2 = patience - 1;
    if (p2 <= 0) { setBusy(true); setSay(T("\"You dey whine me? I'm going.\" They walk away.", "\"You dey whine me? I dey go.\" Dem waka.")); next(0.1); return; }
    setPatience(p2);
    setOffer(Math.min(limit - 0.02, offer + (limit - offer) * rnd(0.35, 0.6)));
    setLeft(TURN);
    setSay(pickOne([T("\"Ah! Too cost. Reduce am.\"", "\"Ah! E too cost. Reduce am.\""), T("\"Last price na?\"", "\"Last price na?\""), T("\"My sister sells it cheaper.\"", "\"My sister dey sell am cheaper.\"")]));
  };
  useEffect(() => {
    if (busy) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 0.1)), 100);
    return () => clearInterval(t);
  }, [busy, cust]);
  useEffect(() => { if (left <= 0 && !busy) decide(null); });
  const asks = [Math.min(1, offer + 0.4), Math.min(1, offer + 0.22)].map((x) => Math.round(x * 100) / 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>{T(`Customer ${cust + 1} of 3`, `Customer ${cust + 1} of 3`)}</span><span>{"❤️".repeat(patience)}<span className="opacity-25">{"❤️".repeat(3 - patience)}</span></span></div>
      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-amber-50 p-3">
        <span className="text-[40px]" aria-hidden>{it[0]}</span>
        <div className="min-w-0 flex-1"><div className="text-[15px] font-extrabold text-[#0b2a6b]">{T(it[1], it[2])}</div><div className="text-[12px] text-slate-500">{T("List price", "List price")} {price(1)} · {T("they offer", "dem offer")} <b>{price(offer)}</b></div></div>
      </div>
      <p className="mb-3 min-h-[44px] rounded-2xl bg-slate-50 px-3 py-2 text-[14px] font-semibold text-slate-700">🧕🏾 {say}</p>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400 transition-[width] duration-100" style={{ width: `${(left / TURN) * 100}%` }} /></div>
      <div className="grid grid-cols-3 gap-2">
        {asks.map((a, i) => <button key={i} type="button" disabled={busy} onClick={() => decide(a)} className="rounded-2xl bg-blue-600 px-2 py-3 text-[14px] font-extrabold text-white active:scale-95 disabled:opacity-50">{i === 0 ? T("Ask", "Ask") : T("Ask", "Ask")} {price(a)}</button>)}
        <button type="button" disabled={busy} onClick={() => decide(null)} className="rounded-2xl bg-emerald-500 px-2 py-3 text-[14px] font-extrabold text-white active:scale-95 disabled:opacity-50">{T("Take", "Take")} {price(offer)}</button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">{T("Tip: their real limit is hidden. Each 'no' costs a heart.", "Tip: their real limit dey hide. Every 'no' cost one heart.")}</p>
    </div>
  );
}
