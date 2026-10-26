"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "../util";
import { pickOne } from "./hooks";

const MENU = ["🍛", "🍗", "🥤", "🍞"];
const DUR = 20;
const PATIENCE = 5;
interface Cust { id: number; want: string; face: string; left: number }

/** Serve the customer at the front before they walk out. */
export function Rush({ onFinish }: { onFinish: (s: number) => void }) {
  const mk = (id: number): Cust => ({ id, want: pickOne(MENU), face: pickOne(["🧑🏾", "👩🏾", "👨🏾‍🦱", "👵🏾", "🧔🏾", "👩🏾‍🦱"]), left: PATIENCE });
  const [q, setQ] = useState<Cust[]>(() => [mk(1), mk(2), mk(3)]);
  const [served, setServed] = useState(0);
  const [lost, setLost] = useState(0);
  const [time, setTime] = useState(DUR);
  const [msg, setMsg] = useState("");
  const id = useRef(4);
  const done = useRef(false);
  const stat = useRef({ s: 0, l: 0 });
  useEffect(() => {
    const t = setInterval(() => {
      if (done.current) return;
      setTime((x) => { const n = Math.max(0, x - 0.2); if (n <= 0 && !done.current) { done.current = true; const { s, l } = stat.current; setTimeout(() => onFinish(Math.min(1, s / 9) * (s / Math.max(1, s + l))), 300); } return n; });
      setQ((cur) => {
        const front = cur[0];
        if (!front) return cur;
        const left = front.left - 0.2;
        if (left <= 0) { stat.current.l += 1; setLost(stat.current.l); setMsg(T("😤 They walked out!", "😤 Dem waka comot!")); return [...cur.slice(1), mk(id.current++)]; }
        return [{ ...front, left }, ...cur.slice(1)];
      });
    }, 200);
    return () => clearInterval(t);
  }, []);
  const serve = (item: string) => {
    if (done.current) return;
    setQ((cur) => {
      const front = cur[0];
      if (!front) return cur;
      if (front.want === item) { stat.current.s += 1; setServed(stat.current.s); setMsg(T("😋 Happy customer!", "😋 Customer happy!")); return [...cur.slice(1), mk(id.current++)]; }
      setMsg(T("🙄 Wrong order!", "🙄 Wrong order!"));
      return [{ ...front, left: Math.max(0.2, front.left - 1.5) }, ...cur.slice(1)];
    });
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>✅ {served} · ❌ {lost}</span><span>⏱ {Math.ceil(time)}s</span></div>
      <div className="mb-2 flex items-end gap-2 rounded-2xl bg-orange-50 p-3">
        {q.map((c, i) => (
          <div key={c.id} className={`flex flex-1 flex-col items-center rounded-xl bg-white p-2 ${i === 0 ? "ring-2 ring-orange-400" : "opacity-60"}`}>
            <span className="text-[13px]" aria-hidden>💭 {c.want}</span>
            <span className="text-[34px]" aria-hidden>{c.face}</span>
            {i === 0 && <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(c.left / PATIENCE) * 100}%` }} /></div>}
          </div>
        ))}
      </div>
      <p className="mb-2 h-5 text-center text-[13px] font-bold text-slate-600">{msg}</p>
      <div className="grid grid-cols-4 gap-2">{MENU.map((m) => <button key={m} type="button" onClick={() => serve(m)} className="rounded-2xl bg-white py-3 text-[30px] shadow ring-1 ring-slate-200 active:scale-90">{m}</button>)}</div>
    </div>
  );
}
