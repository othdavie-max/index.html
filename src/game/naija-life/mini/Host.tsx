"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { T } from "../util";
import type { Action } from "../engine";
import { Haggle } from "./Haggle";
import { Quiz } from "./Quiz";
import { Traffic } from "./Traffic";
import { Penalty } from "./Penalty";
import { Rhythm } from "./Rhythm";
import { Scratch } from "./Scratch";
import { Spray } from "./Spray";
import { Maze } from "./Maze";
import { Rush } from "./Rush";
import { YahooChat } from "./YahooChat";

export type MiniKind = "haggle" | "quiz" | "traffic" | "penalty" | "rhythm" | "scratch" | "spray" | "maze" | "rush" | "yahoo";
export interface MiniReq {
  kind: MiniKind;
  /** Called with a 0-1 score, or null if the player skipped. */
  onDone: (score: number | null) => void;
  /** For the scratch card: the result to reveal. */
  reveal?: string;
  /** Extra flavour, for example the client's name in the Yahoo chat. */
  label?: string;
}

const INFO: Record<MiniKind, { emoji: string; title: [string, string]; how: [string, string] }> = {
  haggle: { emoji: "🛍️", title: ["Market haggle", "Market price"], how: ["Three customers. Ask for more, but not so much that they walk away. Decide before the timer runs out.", "Three customers. Ask for more, but no too cost make dem waka. Decide before time finish."] },
  quiz: { emoji: "📝", title: ["Quick test", "Quick test"], how: ["Five questions, ten seconds each. Your score decides how much you learn.", "Five questions, ten seconds each. Your score go decide how much you learn."] },
  traffic: { emoji: "🛵", title: ["Lagos traffic run", "Lagos traffic run"], how: ["Deliver on your okada. Tap left or right to dodge potholes, danfos and checkpoints.", "Deliver with okada. Tap left or right to dodge pothole, danfo and checkpoint."] },
  penalty: { emoji: "⚽", title: ["Penalty shootout", "Penalty shootout"], how: ["Five kicks. Tap Shoot when the ball is aimed where the keeper is not. Do not shoot wide.", "Five kicks. Tap Shoot when the ball dey aim where keeper no dey. No shoot wide."] },
  rhythm: { emoji: "🎶", title: ["Find the rhythm", "Catch the rhythm"], how: ["Tap when each beat reaches the line. Hit them on time for a great session.", "Tap when each beat reach the line. Hit am on time for better session."] },
  scratch: { emoji: "🎫", title: ["Scratch card", "Scratch card"], how: ["Rub the silver panel with your finger.", "Rub the silver part with your finger."] },
  spray: { emoji: "💸", title: ["Spray money", "Spray money"], how: ["The celebrants are dancing! Tap the notes to spray them before the band stops.", "Celebrant dey dance! Tap the notes to spray before band stop."] },
  maze: { emoji: "🏃🏾", title: ["The escape", "The escape"], how: ["Get from your cell to the gate. Avoid the warder. You have 30 seconds.", "Comot from your cell reach the gate. Avoid the warder. You get 30 seconds."] },
  rush: { emoji: "🍛", title: ["Rush hour", "Rush hour"], how: ["Serve each customer what they want before they lose patience. Wrong orders cost time.", "Serve each customer wetin dem want before dem vex. Wrong order go waste time."] },
  yahoo: { emoji: "💬", title: ["The chat", "The chat"], how: ["Pick the smoothest reply. Too pushy and they get suspicious.", "Pick the smoothest reply. If you push too much, dem go suspect."] },
};

const OFF_KEY = "naija-life-mini-off";
export function miniOff(): boolean { try { return localStorage.getItem(OFF_KEY) === "1"; } catch { return false; } }
function setMiniOff(v: boolean) { try { localStorage.setItem(OFF_KEY, v ? "1" : "0"); } catch { /* storage unavailable */ } }

const Ctx = createContext<(r: MiniReq) => void>((r) => r.onDone(null));
export const useMini = () => useContext(Ctx);
const RunCtx = createContext<(a: Action, quiet?: boolean) => string>(() => "");
/** Runs an action and returns its message, optionally without the usual pop-up. */
export const useRunMsg = () => useContext(RunCtx);

export function MiniHost({ children, runMsg }: { children: ReactNode; runMsg: (a: Action, quiet?: boolean) => string }) {
  const [req, setReq] = useState<MiniReq | null>(null);
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [score, setScore] = useState(0);
  const [skipAll, setSkipAll] = useState(false);
  const play = useCallback((r: MiniReq) => {
    if (r.kind !== "scratch" && miniOff()) { r.onDone(null); return; }
    setReq(r); setScore(0); setSkipAll(false); setPhase(r.kind === "scratch" ? "play" : "intro");
  }, []);
  const close = (s: number | null) => { const r = req; setReq(null); if (skipAll) setMiniOff(true); r?.onDone(s); };
  const finish = (s: number) => { setScore(Math.max(0, Math.min(1, s))); setPhase("done"); };
  const info = req ? INFO[req.kind] : null;
  const stars = score >= 0.85 ? 3 : score >= 0.55 ? 2 : score >= 0.25 ? 1 : 0;
  return (
    <RunCtx.Provider value={runMsg}>
    <Ctx.Provider value={play}>
      {children}
      {req && info && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-t-[28px] bg-white px-4 pb-6 pt-3 shadow-2xl sm:rounded-3xl">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-[22px]" aria-hidden>{info.emoji}</span>
              <div className="min-w-0 flex-1 text-[17px] font-extrabold text-[#0b2a6b]">{T(info.title[0], info.title[1])}{req.label ? <span className="block truncate text-[12px] font-semibold text-slate-500">{req.label}</span> : null}</div>
              {phase !== "done" && <button type="button" onClick={() => close(null)} className="rounded-full bg-slate-100 px-3.5 py-1.5 text-[13px] font-extrabold text-slate-600">{req.kind === "scratch" ? T("Close", "Close") : T("Skip", "Skip")}</button>}
            </div>
            {phase === "intro" && (
              <div>
                <p className="mb-4 text-[14.5px] leading-relaxed text-slate-700">{T(info.how[0], info.how[1])}</p>
                <button type="button" onClick={() => setPhase("play")} className="w-full rounded-full bg-gradient-to-b from-[#2f86ff] to-[#1263e8] py-3 text-[16px] font-extrabold text-white shadow-lg active:scale-[0.98]">{T("Start", "Start")} ▶</button>
                <label className="mt-3 flex items-center justify-center gap-2 text-[12px] text-slate-500"><input type="checkbox" checked={skipAll} onChange={(e) => setSkipAll(e.target.checked)} /> {T("Always skip mini-games", "Always skip mini-games")}</label>
              </div>
            )}
            {phase === "play" && (
              <div>
                {req.kind === "haggle" && <Haggle onFinish={finish} />}
                {req.kind === "quiz" && <Quiz onFinish={finish} />}
                {req.kind === "traffic" && <Traffic onFinish={finish} />}
                {req.kind === "penalty" && <Penalty onFinish={finish} />}
                {req.kind === "rhythm" && <Rhythm onFinish={finish} />}
                {req.kind === "spray" && <Spray onFinish={finish} />}
                {req.kind === "maze" && <Maze onFinish={finish} />}
                {req.kind === "rush" && <Rush onFinish={finish} />}
                {req.kind === "yahoo" && <YahooChat onFinish={finish} />}
                {req.kind === "scratch" && <Scratch reveal={req.reveal ?? ""} onDone={() => close(null)} />}
              </div>
            )}
            {phase === "done" && (
              <div className="text-center">
                <div className="text-[40px] leading-none" aria-hidden>{["😬", "🙂", "😃", "🤩"][stars]}</div>
                <div className="mt-2 text-[28px] font-black text-[#0b2a6b]">{Math.round(score * 100)}%</div>
                <div className="text-[22px] tracking-widest" aria-label={`${stars} stars`}>{"★".repeat(stars)}<span className="text-slate-200">{"★".repeat(3 - stars)}</span></div>
                <p className="mt-1 text-[13px] text-slate-500">{stars >= 3 ? T("Perfect! Maximum reward.", "Perfect! Full reward.") : stars === 2 ? T("Nice one.", "Nice one.") : stars === 1 ? T("Not bad. Practice makes perfect.", "E no bad. Practice dey make perfect.") : T("Tough one. You still get something.", "E hard. You still get something.")}</p>
                <button type="button" onClick={() => close(score)} className="mt-4 w-full rounded-full bg-emerald-500 py-3 text-[16px] font-extrabold text-white shadow-lg active:scale-[0.98]">{T("Continue", "Continue")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
    </RunCtx.Provider>
  );
}
