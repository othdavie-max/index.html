"use client";

import { useEffect, useMemo, useState } from "react";
import { T, getLang } from "../util";
import { BANK } from "./quizBank";
import { rint, shuffle } from "./hooks";

interface Item { q: string; a: string; opts: string[] }
const SECS = 10;

function mathQ(): Item {
  const k = rint(0, 2);
  if (k === 0) { const a = rint(120, 950), b = rint(80, 640); const ans = a + b; return { q: T(`₦${a} + ₦${b} = ?`, `₦${a} + ₦${b} = ?`), a: `₦${ans}`, opts: shuffle([ans, ans + 10, ans - 20, ans + 100].map((x) => `₦${x}`)) }; }
  if (k === 1) { const a = rint(6, 15), b = rint(3, 12); const ans = a * b; return { q: `${a} × ${b} = ?`, a: String(ans), opts: shuffle([ans, ans + a, ans - b, ans + 2].map(String)) }; }
  const total = rint(3, 9) * 1000, part = rint(1, 4) * 250; const ans = total - part;
  return { q: T(`You have ₦${total}. You spend ₦${part}. What is left?`, `You get ₦${total}. You spend ₦${part}. Wetin remain?`), a: `₦${ans}`, opts: shuffle([ans, ans + 250, ans - 250, ans + 500].map((x) => `₦${x}`)) };
}

export function Quiz({ onFinish }: { onFinish: (s: number) => void }) {
  const items = useMemo<Item[]>(() => {
    const en = getLang() === "en";
    const bank = shuffle(BANK).slice(0, 3).map((b) => ({ q: en ? b.q[0] : b.q[1], a: b.a, opts: shuffle([b.a, ...b.wrong]) }));
    return shuffle([...bank, mathQ(), mathQ()]);
  }, []);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(SECS);
  const [pts, setPts] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (picked) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 0.1)), 100);
    return () => clearInterval(t);
  }, [i, picked]);
  const it = items[i];
  const answer = (o: string | "") => {
    if (picked !== null) return;
    setPicked(o);
    const right = o === it.a;
    const gain = right ? 0.75 + 0.25 * (left / SECS) : 0;
    setTimeout(() => {
      const total = pts + gain;
      if (i + 1 >= items.length) onFinish(total / items.length);
      else { setPts(total); setI(i + 1); setLeft(SECS); setPicked(null); }
    }, 700);
  };
  useEffect(() => { if (left <= 0 && picked === null) answer(""); });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>{T(`Question ${i + 1} of ${items.length}`, `Question ${i + 1} of ${items.length}`)}</span><span>⏱ {Math.ceil(left)}s</span></div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(left / SECS) * 100}%` }} /></div>
      <p className="mb-3 min-h-[52px] text-[17px] font-extrabold leading-snug text-[#0b2a6b]">{it.q}</p>
      <div className="grid grid-cols-2 gap-2">
        {it.opts.map((o) => {
          const state = picked === null ? "" : o === it.a ? "bg-emerald-500 text-white" : o === picked ? "bg-rose-500 text-white" : "opacity-50";
          return <button key={o} type="button" onClick={() => answer(o)} className={`rounded-2xl border border-slate-200 bg-white px-2 py-3 text-[14px] font-bold text-[#0b2a6b] active:scale-95 ${state}`}>{o}</button>;
        })}
      </div>
    </div>
  );
}
