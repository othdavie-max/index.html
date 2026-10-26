"use client";

import { useEffect, useState } from "react";
import { ALL_RIBBONS } from "./ribbons";
import { CHALLENGES, PERKS, badges, choosePerk, chosenPerk, perkUnlocked, ribbonBook } from "./replay";
import { ListGroup, ListRow, cx } from "./ui";
import { T } from "./util";

function useStored<X>(read: () => X, init: X): X {
  const [v, setV] = useState<X>(init);
  useEffect(() => { setV(read()); }, [read]);
  return v;
}

/** All ribbons; the ones you have never earned show as a locked silhouette. */
export function RibbonBookCard() {
  const book = useStored(ribbonBook, {} as Record<string, number>);
  const have = ALL_RIBBONS.filter((r) => book[r.id]).length;
  return (
    <ListGroup title={T(`Ribbon book · ${have}/${ALL_RIBBONS.length}`, `Ribbon book · ${have}/${ALL_RIBBONS.length}`)} sub={T("Collected across all your lives on this phone. Earn them all.", "Na all your lives for this phone. Collect all of dem.")}>
      <div className="grid grid-cols-3 gap-2 px-3 py-3">
        {ALL_RIBBONS.map((r) => {
          const ok = Boolean(book[r.id]);
          return (
            <div key={r.id} className={cx("flex flex-col items-center rounded-2xl px-1.5 py-2 text-center ring-1", ok ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-100")}>
              <span className={cx("text-[26px] leading-none", !ok && "opacity-25 grayscale")} aria-hidden>{ok ? r.emoji : "❔"}</span>
              <span className={cx("mt-1 text-[10.5px] font-extrabold leading-tight", ok ? "text-[#0b2a6b]" : "text-slate-400")}>{ok ? T(r.en, r.pcm) : "???"}</span>
              {!ok && <span className="mt-0.5 text-[9.5px] leading-tight text-slate-400">{T(r.blurb[0], r.blurb[1])}</span>}
            </div>
          );
        })}
      </div>
    </ListGroup>
  );
}

export function ChallengesCard() {
  const b = useStored(badges, {} as Record<string, number>);
  const have = CHALLENGES.filter((c) => b[c.id]).length;
  return (
    <ListGroup title={T(`Challenges · ${have}/${CHALLENGES.length}`, `Challenges · ${have}/${CHALLENGES.length}`)} sub={T("Big goals for any life. Each one earns a badge forever.", "Big goals for any life. Each one go give you badge forever.")}>
      {CHALLENGES.map((c) => <ListRow key={c.id} emoji={b[c.id] ? c.emoji : "🔒"} tile={b[c.id] ? "bg-emerald-100" : "bg-slate-100"} name={T(c.en, c.pcm)} right={b[c.id] ? "✅" : undefined} />)}
    </ListGroup>
  );
}

/** Pick a starting perk you have unlocked with ribbons from earlier lives. */
export function PerkPicker() {
  const book = useStored(ribbonBook, {} as Record<string, number>);
  const [sel, setSel] = useState("");
  useEffect(() => { setSel(chosenPerk()); }, []);
  const pick = (id: string) => { const v = sel === id ? "" : id; setSel(v); choosePerk(v); };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <div className="mb-2 text-[13px] font-extrabold text-[#0b2a6b]">{T("Starting perk", "Starting perk")} <span className="font-semibold text-slate-400">· {T("unlocked by ribbons", "ribbons dey unlock am")}</span></div>
      <div className="flex flex-wrap gap-1.5">
        {PERKS.map((d) => {
          const ok = perkUnlocked(d, book);
          return (
            <button key={d.id} type="button" disabled={!ok} onClick={() => pick(d.id)} className={cx("rounded-full px-3 py-1.5 text-[12px] font-bold ring-1", !ok ? "bg-slate-50 text-slate-300 ring-slate-100" : sel === d.id ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-700 ring-slate-200")} title={T(d.en, d.pcm)}>
              {ok ? d.emoji : "🔒"} {ok ? T(d.en.split(":")[0], d.pcm.split(":")[0]) : T(d.en.split(":")[0], d.pcm.split(":")[0])}
            </button>
          );
        })}
      </div>
      {sel && <p className="mt-2 text-[11.5px] text-blue-700">{T(PERKS.find((d) => d.id === sel)?.en ?? "", PERKS.find((d) => d.id === sel)?.pcm ?? "")}</p>}
    </div>
  );
}

/** A big celebration pop when a ribbon or challenge is earned. */
export function UnlockPop({ item, onDone }: { item: { emoji: string; title: string; kind: string } | null; onDone: () => void }) {
  useEffect(() => { if (!item) return; const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [item, onDone]);
  if (!item) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[30%] z-[55] flex justify-center px-6">
      <style>{`@keyframes nlunlock{0%{opacity:0;transform:scale(.4) rotate(-8deg)}15%{opacity:1;transform:scale(1.12) rotate(2deg)}25%{transform:scale(1) rotate(0)}85%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}`}</style>
      <div className="rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 p-[3px] shadow-2xl" style={{ animation: "nlunlock 3.2s ease-out both" }}>
        <div className="rounded-[22px] bg-white px-6 py-4 text-center">
          <div className="text-[44px] leading-none" aria-hidden>{item.emoji}</div>
          <div className="mt-1 text-[11px] font-black uppercase tracking-widest text-amber-600">{item.kind}</div>
          <div className="text-[18px] font-extrabold text-[#0b2a6b]">{item.title}</div>
        </div>
      </div>
    </div>
  );
}
