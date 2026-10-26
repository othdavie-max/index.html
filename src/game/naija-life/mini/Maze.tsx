"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "../util";
import { shuffle } from "./hooks";

const N = 9;
const DUR = 30;
type Cell = { r: number; c: number };

/** Walls between cells: right[r][c] and down[r][c] are true when blocked. */
function makeMaze() {
  const right = Array.from({ length: N }, () => Array(N).fill(true));
  const down = Array.from({ length: N }, () => Array(N).fill(true));
  const seen = Array.from({ length: N }, () => Array(N).fill(false));
  const stack: Cell[] = [{ r: 0, c: 0 }];
  seen[0][0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nb = shuffle([[0, 1], [1, 0], [0, -1], [-1, 0]]).map(([dr, dc]) => ({ r: cur.r + dr, c: cur.c + dc })).filter((x) => x.r >= 0 && x.c >= 0 && x.r < N && x.c < N && !seen[x.r][x.c]);
    if (!nb.length) { stack.pop(); continue; }
    const n = nb[0];
    if (n.r === cur.r) right[cur.r][Math.min(cur.c, n.c)] = false; else down[Math.min(cur.r, n.r)][cur.c] = false;
    seen[n.r][n.c] = true;
    stack.push(n);
  }
  return { right, down };
}
const open = (m: ReturnType<typeof makeMaze>, a: Cell, b: Cell) => {
  if (b.r < 0 || b.c < 0 || b.r >= N || b.c >= N) return false;
  if (a.r === b.r) return !m.right[a.r][Math.min(a.c, b.c)];
  return !m.down[Math.min(a.r, b.r)][a.c];
};

/** From the cell to the gate, without meeting the warder. */
export function Maze({ onFinish }: { onFinish: (s: number) => void }) {
  const m = useMemo(() => makeMaze(), []);
  const [me, setMe] = useState<Cell>({ r: 0, c: 0 });
  const [guard, setGuard] = useState<Cell>({ r: 4, c: 4 });
  const [left, setLeft] = useState(DUR);
  const done = useRef(false);
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; }, [me]);
  const end = (s: number) => { if (done.current) return; done.current = true; setTimeout(() => onFinish(s), 500); };
  const progress = (c: Cell) => (c.r + c.c) / (2 * (N - 1));
  useEffect(() => {
    const t = setInterval(() => {
      if (done.current) return;
      setLeft((l) => { const nl = Math.max(0, l - 0.5); if (nl <= 0) end(progress(meRef.current) * 0.4); return nl; });
      setGuard((g) => {
        const opts = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dr, dc]) => ({ r: g.r + dr, c: g.c + dc })).filter((x) => open(m, g, x));
        const toward = opts.sort((a, b) => (Math.abs(a.r - meRef.current.r) + Math.abs(a.c - meRef.current.c)) - (Math.abs(b.r - meRef.current.r) + Math.abs(b.c - meRef.current.c)));
        const n = Math.random() < 0.45 ? toward[0] : toward[Math.floor(Math.random() * toward.length)];
        const ng = n ?? g;
        if (ng.r === meRef.current.r && ng.c === meRef.current.c) end(progress(meRef.current) * 0.3);
        return ng;
      });
    }, 500);
    return () => clearInterval(t);
  }, [m]);
  const go = (dr: number, dc: number) => {
    if (done.current) return;
    const n = { r: me.r + dr, c: me.c + dc };
    if (!open(m, me, n)) return;
    setMe(n);
    if (n.r === guard.r && n.c === guard.c) { end(progress(n) * 0.3); return; }
    if (n.r === N - 1 && n.c === N - 1) end(0.7 + 0.3 * (left / DUR));
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }; const v = d[e.key]; if (v) { e.preventDefault(); go(v[0], v[1]); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const caught = guard.r === me.r && guard.c === me.c;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>{caught ? T("Caught!", "Dem catch you!") : me.r === N - 1 && me.c === N - 1 ? T("Free!", "You don free!") : T("Reach the gate 🚪", "Reach the gate 🚪")}</span><span>⏱ {Math.ceil(left)}s</span></div>
      <div className="mx-auto grid aspect-square w-full max-w-[300px] rounded-xl border-2 border-slate-700 bg-slate-100" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {Array.from({ length: N * N }, (_, i) => {
          const r = Math.floor(i / N), c = i % N;
          const bR = c < N - 1 && m.right[r][c], bD = r < N - 1 && m.down[r][c];
          return (
            <div key={i} className="relative flex items-center justify-center text-[15px]" style={{ borderRight: bR ? "2px solid #334155" : undefined, borderBottom: bD ? "2px solid #334155" : undefined }}>
              {me.r === r && me.c === c ? "🏃🏾" : guard.r === r && guard.c === c ? "👮🏾" : r === N - 1 && c === N - 1 ? "🚪" : ""}
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-3 grid w-48 grid-cols-3 gap-1.5">
        <span /><button type="button" onClick={() => go(-1, 0)} className="rounded-xl bg-blue-600 py-2.5 text-white active:scale-95">▲</button><span />
        <button type="button" onClick={() => go(0, -1)} className="rounded-xl bg-blue-600 py-2.5 text-white active:scale-95">◀</button>
        <button type="button" onClick={() => go(1, 0)} className="rounded-xl bg-blue-600 py-2.5 text-white active:scale-95">▼</button>
        <button type="button" onClick={() => go(0, 1)} className="rounded-xl bg-blue-600 py-2.5 text-white active:scale-95">▶</button>
      </div>
    </div>
  );
}
