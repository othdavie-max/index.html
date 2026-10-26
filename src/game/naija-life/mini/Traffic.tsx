"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "../util";
import { pickOne, rint, useFrame } from "./hooks";

interface Ob { id: number; lane: number; y: number; e: string; hit?: boolean }
const DUR = 18;
const OBS = ["🕳️", "🚌", "👮🏾", "🐐", "🚧", "🛺"];

/** Three lanes. Dodge what comes at you. */
export function Traffic({ onFinish }: { onFinish: (s: number) => void }) {
  const [lane, setLane] = useState(1);
  const laneRef = useRef(1);
  const obs = useRef<Ob[]>([]);
  const [view, setView] = useState<Ob[]>([]);
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState(0);
  const spawnAt = useRef(0.6);
  const idRef = useRef(1);
  const done = useRef(false);
  const hitsRef = useRef(0);
  useFrame((dt, el) => {
    if (done.current) return;
    setTime(el);
    const speed = 0.55 + el * 0.035;
    if (el >= spawnAt.current) {
      obs.current.push({ id: idRef.current++, lane: rint(0, 2), y: -0.1, e: pickOne(OBS) });
      spawnAt.current = el + Math.max(0.38, 0.85 - el * 0.025);
    }
    for (const o of obs.current) {
      o.y += speed * dt;
      if (!o.hit && o.lane === laneRef.current && o.y > 0.78 && o.y < 0.92) { o.hit = true; hitsRef.current += 1; setHits(hitsRef.current); try { navigator.vibrate?.(30); } catch { /* none */ } }
    }
    obs.current = obs.current.filter((o) => o.y < 1.1);
    setView(obs.current.map((o) => ({ ...o })));
    if (el >= DUR) { done.current = true; onFinish(Math.max(0, 1 - hitsRef.current / 5)); }
  });
  const move = (d: number) => { const l = Math.max(0, Math.min(2, laneRef.current + d)); laneRef.current = l; setLane(l); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") move(-1); if (e.key === "ArrowRight") move(1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>💥 {T("Hits", "Hits")}: {hits}</span><span>⏱ {Math.max(0, Math.ceil(DUR - time))}s</span></div>
      <div className="relative h-72 select-none overflow-hidden rounded-2xl bg-slate-700" onTouchStart={(e) => { const x = e.touches[0].clientX; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); move(x < r.left + r.width / 2 ? -1 : 1); }}>
        {[1, 2].map((i) => <div key={i} className="absolute inset-y-0 w-0.5 border-l-2 border-dashed border-yellow-300/60" style={{ left: `${(i / 3) * 100}%` }} />)}
        {view.map((o) => <span key={o.id} className={`absolute -translate-x-1/2 text-[30px] ${o.hit ? "opacity-40" : ""}`} style={{ left: `${(o.lane + 0.5) * 33.33}%`, top: `${o.y * 100}%` }}>{o.e}</span>)}
        <span className="absolute -translate-x-1/2 text-[38px] transition-[left] duration-100" style={{ left: `${(lane + 0.5) * 33.33}%`, top: "80%" }}>🛵</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => move(-1)} className="rounded-2xl bg-blue-600 py-3 text-[20px] font-black text-white active:scale-95">◀</button>
        <button type="button" onClick={() => move(1)} className="rounded-2xl bg-blue-600 py-3 text-[20px] font-black text-white active:scale-95">▶</button>
      </div>
    </div>
  );
}
