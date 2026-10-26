"use client";

import { useRef, useState } from "react";
import { T } from "../util";
import { pickOne, rnd, useFrame } from "./hooks";

interface Note { id: number; x: number; y: number; born: number; e: string; gone?: boolean }
const DUR = 12;
const TARGET = 18;

/** Tap the notes to spray them on the dancing celebrants. */
export function Spray({ onFinish }: { onFinish: (s: number) => void }) {
  const notes = useRef<Note[]>([]);
  const [view, setView] = useState<Note[]>([]);
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(0);
  const next = useRef(0.2);
  const id = useRef(1);
  const done = useRef(false);
  const cnt = useRef(0);
  useFrame((_, el) => {
    if (done.current) return;
    setTime(el);
    if (el > next.current) { notes.current.push({ id: id.current++, x: rnd(8, 82), y: rnd(8, 70), born: el, e: pickOne(["💵", "💴", "💶", "🪙"]) }); next.current = el + rnd(0.28, 0.5); }
    notes.current = notes.current.filter((n) => !n.gone && el - n.born < 1.15);
    setView(notes.current.map((n) => ({ ...n })));
    if (el >= DUR) { done.current = true; onFinish(Math.min(1, cnt.current / TARGET)); }
  });
  const hit = (nid: number) => { const n = notes.current.find((x) => x.id === nid); if (!n || n.gone) return; n.gone = true; cnt.current += 1; setCount(cnt.current); try { navigator.vibrate?.(8); } catch { /* none */ } };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>💸 {count}/{TARGET}</span><span>⏱ {Math.max(0, Math.ceil(DUR - time))}s</span></div>
      <div className="relative h-64 select-none overflow-hidden rounded-2xl bg-gradient-to-b from-amber-200 via-orange-200 to-rose-200">
        <div className="absolute inset-x-0 bottom-2 text-center text-[42px] leading-none" aria-hidden><span className="inline-block animate-bounce">💃🏾</span><span className="inline-block animate-bounce [animation-delay:150ms]">🕺🏾</span></div>
        {view.map((n) => <button key={n.id} type="button" onPointerDown={() => hit(n.id)} className="absolute text-[34px] transition-transform active:scale-75" style={{ left: `${n.x}%`, top: `${n.y}%` }} aria-label="note">{n.e}</button>)}
      </div>
      <p className="mt-2 text-center text-[11.5px] text-slate-500">{T("The more you spray, the more the room remembers you.", "The more you spray, the more people go remember you.")}</p>
    </div>
  );
}
