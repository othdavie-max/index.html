"use client";

import { useEffect, useState } from "react";
import { T } from "../util";

/** The family WhatsApp group, for black tax requests. Messages pop in one by one. */
export function FamilyChat({ text }: { text: string }) {
  const msgs: { who: string; c: string; t: string }[] = [
    { who: T("Mama", "Mama"), c: "text-rose-600", t: T("Good morning my child. God bless your work 🙏🏾", "Good morning my pikin. God bless your work 🙏🏾") },
    { who: T("Uncle Femi", "Uncle Femi"), c: "text-blue-700", t: T("Our big man/woman! We are proud of you o.", "Our big man/woman! We dey proud of you o.") },
    { who: T("Your sister", "Your sister"), c: "text-emerald-700", t: text },
    { who: T("Mama", "Mama"), c: "text-rose-600", t: T("Don't forget where you came from 😌", "No forget where you come from 😌") },
  ];
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= msgs.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [shown, msgs.length]);
  return (
    <div className="rounded-2xl bg-[#e5ddd5] p-2.5">
      <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#075e54] px-3 py-2 text-white"><span aria-hidden>👨‍👩‍👧‍👦</span><span className="text-[13.5px] font-bold">{T("Family Group 🏠❤️", "Family Group 🏠❤️")}</span><span className="ml-auto text-[11px] opacity-80">{T("23 members", "23 members")}</span></div>
      <div className="space-y-1.5">
        {msgs.slice(0, shown).map((m, i) => (
          <div key={i} className="nl-line max-w-[90%] rounded-2xl rounded-tl-sm bg-white px-3 py-1.5 shadow-sm">
            <div className={`text-[11.5px] font-bold ${m.c}`}>{m.who}</div>
            <div className="text-[13.5px] leading-snug text-slate-800">{m.t}</div>
          </div>
        ))}
        {shown < msgs.length && <div className="w-14 rounded-2xl bg-white px-3 py-1.5 text-[13px] text-slate-400 shadow-sm">•••</div>}
      </div>
    </div>
  );
}
