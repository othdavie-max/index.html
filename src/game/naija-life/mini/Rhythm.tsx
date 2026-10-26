"use client";

import { useMemo, useRef, useState } from "react";
import { T } from "../util";
import { rnd, useFrame } from "./hooks";

const TRAVEL = 1.5;
const N = 12;

/** Tap when each beat reaches the line. */
export function Rhythm({ onFinish }: { onFinish: (s: number) => void }) {
  const times = useMemo(() => { const t: number[] = []; let c = 1.6; for (let i = 0; i < N; i++) { t.push(c); c += rnd(0.55, 0.95); } return t; }, []);
  const state = useRef<("wait" | "perfect" | "good" | "miss")[]>(times.map(() => "wait"));
  const [now, setNow] = useState(0);
  const [flash, setFlash] = useState("");
  const [marks, setMarks] = useState<("wait" | "perfect" | "good" | "miss")[]>(() => times.map(() => "wait"));
  const done = useRef(false);
  const nowRef = useRef(0);
  useFrame((_, el) => {
    if (done.current) return;
    nowRef.current = el;
    setNow(el);
    times.forEach((t, i) => { if (state.current[i] === "wait" && el - t > 0.25) state.current[i] = "miss"; });
    setMarks([...state.current]);
    if (el > times[N - 1] + 0.6) {
      done.current = true;
      const s = state.current.reduce((a, x) => a + (x === "perfect" ? 1 : x === "good" ? 0.6 : 0), 0) / N;
      onFinish(s);
    }
  });
  const tap = () => {
    const el = nowRef.current;
    let best = -1, bd = 9;
    times.forEach((t, i) => { const d = Math.abs(el - t); if (state.current[i] === "wait" && d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 0.22) { state.current[best] = bd < 0.08 ? "perfect" : "good"; setFlash(bd < 0.08 ? T("Perfect!", "Perfect!") : T("Good", "Good")); }
    else setFlash(T("Off beat", "Off beat"));
    setTimeout(() => setFlash(""), 350);
  };
  const hits = marks.filter((x) => x === "perfect" || x === "good").length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>🎵 {hits}/{N}</span><span className="text-violet-600">{flash}</span></div>
      <div className="relative h-60 overflow-hidden rounded-2xl bg-gradient-to-b from-violet-900 to-fuchsia-800" onPointerDown={tap}>
        <div className="absolute inset-x-0 top-[80%] h-1 bg-white/80" />
        {times.map((t, i) => {
          const y = 1 - (t - now) / TRAVEL;
          if (y < -0.1 || y > 1.15 || marks[i] === "perfect" || marks[i] === "good") return null;
          return <span key={i} className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30px] ${marks[i] === "miss" ? "opacity-30" : ""}`} style={{ top: `${y * 80}%` }}>🥁</span>;
        })}
      </div>
      <button type="button" onPointerDown={(e) => { e.stopPropagation(); tap(); }} className="mt-3 w-full rounded-2xl bg-fuchsia-600 py-3.5 text-[17px] font-black text-white active:scale-95">{T("Tap!", "Tap!")}</button>
    </div>
  );
}
