"use client";

import { useState } from "react";
import { econMood, expectedStatus, fxHistory, fxRate, statusOf } from "./economy";
import { ActionSheet, Bar, ListGroup, ListRow, cx } from "./ui";
import type { Player } from "./types";
import { T } from "./util";

/** A slim strip on the life screen: the state of the economy, the dollar and your standing. */
export function EconStrip({ p }: { p: Player }) {
  const [open, setOpen] = useState(false);
  if (p.age < 12) return null;
  const mood = econMood(p);
  const rate = fxRate(p);
  const tone = mood.tone === "good" ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : mood.tone === "bad" ? "bg-rose-50 text-rose-800 ring-rose-100" : "bg-slate-50 text-slate-700 ring-slate-100";
  const hist = fxHistory(p);
  const max = Math.max(1, ...hist);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx("flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-[12px] font-bold ring-1", tone)}>
        <span className="text-base" aria-hidden>{mood.emoji}</span>
        <span className="min-w-0 flex-1 truncate">{T("Economy", "Economy")}: {T(mood.en, mood.pcm)}</span>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5">₦{rate.toLocaleString()}/$</span>
        {p.age >= 18 && <span className="shrink-0 text-slate-500">{T("Standing", "Standing")} {statusOf(p)}</span>}
      </button>
      {open && (
        <ActionSheet emoji={mood.emoji} tile="bg-blue-100" title={T(`Economy: ${mood.en}`, `Economy: ${mood.pcm}`)} sub={T(mood.note[0], mood.note[1])} onClose={() => setOpen(false)}>
          <ListGroup title={T("The dollar", "The dollar")}>
            <ListRow emoji="💵" tile="bg-emerald-100" name={T("Naira per dollar", "Naira per dollar")} right={`₦${rate.toLocaleString()}`} />
            {hist.length > 1 && (
              <div className="px-3.5 py-3">
                <div className="flex h-12 items-end gap-1">{hist.map((v, i) => <div key={i} className="flex-1 rounded-t bg-blue-300" style={{ height: `${Math.max(10, (v / max) * 100)}%` }} title={`₦${v.toLocaleString()}`} />)}</div>
                <div className="mt-1 text-[11px] text-slate-500">{T("Last years: the naira keeps losing value, so cash sitting idle shrinks.", "Last years: naira dey lose value, so idle cash dey shrink.")}</div>
              </div>
            )}
          </ListGroup>
          {p.age >= 18 && (
            <ListGroup title={T("Social standing", "Social standing")} sub={T("Respect fades unless you keep it up. But living above your account hurts.", "Respect dey fade unless you keep am up. But to live above your account dey pain.")}>
              <div className="grid grid-cols-2 gap-3 px-3.5 py-3"><Bar label={T("Your standing", "Your standing")} value={statusOf(p)} tone="gold" /><Bar label={T("Expected of you", "Wetin dem expect")} value={expectedStatus(p)} tone="blue" /></div>
            </ListGroup>
          )}
        </ActionSheet>
      )}
    </>
  );
}
