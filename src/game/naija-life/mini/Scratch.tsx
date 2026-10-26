"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "../util";

/** Rub the silver panel to see the result the game already decided. */
export function Scratch({ reveal, onDone }: { reveal: string; onDone: () => void }) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [clear, setClear] = useState(false);
  const drawing = useRef(false);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, "#cbd5e1"); g.addColorStop(0.5, "#f1f5f9"); g.addColorStop(1, "#94a3b8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#475569"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center";
    ctx.fillText(T("SCRATCH HERE", "SCRATCH HERE"), c.width / 2, c.height / 2 + 8);
  }, []);
  const rub = (x: number, y: number) => {
    const c = cv.current; const ctx = c?.getContext("2d");
    if (!c || !ctx || clear) return;
    const r = c.getBoundingClientRect();
    const px = ((x - r.left) / r.width) * c.width, py = ((y - r.top) / r.height) * c.height;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.fill();
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let gone = 0; for (let i = 3; i < d.length; i += 64) if (d[i] === 0) gone++;
    if (gone / (d.length / 64) > 0.5) setClear(true);
  };
  const win = /win|JACKPOT/i.test(reveal);
  return (
    <div>
      <div className="relative h-40 overflow-hidden rounded-2xl border-4 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <span className="text-[34px]" aria-hidden>{win ? "🎉" : "🙃"}</span>
          <span className={`text-[16px] font-extrabold ${win ? "text-emerald-700" : "text-slate-600"}`}>{reveal}</span>
        </div>
        {!clear && <canvas ref={cv} width={360} height={160} className="absolute inset-0 h-full w-full touch-none" onPointerDown={(e) => { drawing.current = true; rub(e.clientX, e.clientY); }} onPointerMove={(e) => { if (drawing.current) rub(e.clientX, e.clientY); }} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} />}
      </div>
      <button type="button" onClick={() => (clear ? onDone() : setClear(true))} className="mt-3 w-full rounded-full bg-emerald-500 py-3 text-[16px] font-extrabold text-white active:scale-[0.98]">{clear ? T("Continue", "Continue") : T("Reveal all", "Show all")}</button>
    </div>
  );
}
