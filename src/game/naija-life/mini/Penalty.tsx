"use client";

import { useState } from "react";
import { T } from "../util";
import { rint, useFrame } from "./hooks";

/** Five kicks. Aim away from the keeper and inside the posts. */
export function Penalty({ onFinish }: { onFinish: (s: number) => void }) {
  const [kick, setKick] = useState(0);
  const [goals, setGoals] = useState(0);
  const [x, setX] = useState(50);
  const [shot, setShot] = useState<{ x: number; keeper: number; goal: boolean } | null>(null);
  useFrame((_, el) => {
    if (shot) return;
    const speed = 1.6 + kick * 0.45;
    setX(50 + Math.sin(el * speed * Math.PI) * 50);
  }, !shot);
  const shoot = () => {
    if (shot) return;
    const keeper = rint(0, 2);
    const zone = x < 33.3 ? 0 : x < 66.6 ? 1 : 2;
    const wide = x < 6 || x > 94;
    const goal = !wide && zone !== keeper;
    setShot({ x, keeper, goal });
    if (goal) setGoals((g) => g + 1);
    setTimeout(() => {
      if (kick + 1 >= 5) onFinish((goals + (goal ? 1 : 0)) / 5);
      else { setKick(kick + 1); setShot(null); }
    }, 900);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[12px] font-bold text-slate-500"><span>{T(`Kick ${kick + 1} of 5`, `Kick ${kick + 1} of 5`)}</span><span>⚽ {goals}</span></div>
      <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700">
        <div className="absolute inset-x-[4%] top-3 h-20 rounded-t-lg border-4 border-b-0 border-white/90" />
        <span className="absolute top-8 -translate-x-1/2 text-[34px] transition-all duration-300" style={{ left: `${shot ? (shot.keeper + 0.5) * 33.3 : 50}%` }}>🧤</span>
        <span className="absolute -translate-x-1/2 text-[26px] transition-all duration-300" style={{ left: `${shot ? shot.x : x}%`, top: shot ? "28px" : "112px" }}>⚽</span>
        {!shot && <div className="absolute top-[100px] h-1 w-full"><div className="absolute h-3 w-1 -translate-x-1/2 bg-yellow-300" style={{ left: `${x}%` }} /></div>}
        {shot && <div className="absolute inset-x-0 bottom-2 text-center text-[18px] font-black text-white drop-shadow">{shot.goal ? T("GOAL!!!", "GOAL!!!") : shot.x < 6 || shot.x > 94 ? T("Wide!", "E comot outside!") : T("Saved!", "Keeper catch am!")}</div>}
      </div>
      <button type="button" onClick={shoot} disabled={Boolean(shot)} className="mt-3 w-full rounded-2xl bg-blue-600 py-3.5 text-[17px] font-black text-white active:scale-95 disabled:opacity-50">{T("Shoot!", "Shoot!")}</button>
    </div>
  );
}
