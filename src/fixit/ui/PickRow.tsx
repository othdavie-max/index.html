"use client";
/**
 * One slim row for choosing a person: face, name, one-line tag, three tiny stat bars and a tick. Tap anywhere on the row
 * to choose; tap the arrow to read the full story. Used for governors, Chief of Staff, VP, ministers and cabinet picks,
 * so a whole choice fits on one screen with no scrolling.
 */
import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Portrait } from "../../game/ui/kit";
import type { Portrait as PortraitT } from "../engine/types";

export interface MiniStat { label: string; v: number; shown?: boolean }
const tone = (v: number) => (v >= 66 ? "#10b981" : v >= 45 ? "#f59e0b" : "#e11d48");
export function PickRow({ portrait, name, tag, sub, stats, hidden, selected, onPick, detail, badge, hint, cta }: {
  portrait?: PortraitT; name: string; tag?: ReactNode; sub?: ReactNode; stats?: MiniStat[]; hidden?: string; selected: boolean; onPick: () => void; detail?: ReactNode; badge?: ReactNode; hint?: ReactNode; cta?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fx-pr" data-on={selected ? "1" : undefined}>
      <div className="fx-pr-row" role="button" tabIndex={0} aria-pressed={selected} onClick={onPick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(); } }}>
        {portrait && <span className="fx-pr-pic"><Portrait p={portrait} size={44} name={name} />{badge && <i>{badge}</i>}</span>}
        <span className="fx-pr-main">
          <b>{name}</b>
          {tag && <span className="fx-pr-tag">{tag}</span>}
          {sub && <span className="fx-pr-sub">{sub}</span>}
        </span>
        {stats && stats.length > 0 && (
          <span className="fx-pr-stats" aria-label={stats.map((x) => `${x.label} ${x.shown === false ? "unknown" : x.v}`).join(", ")}>
            {stats.map((x) => <span key={x.label} title={x.label}><em>{x.label[0]}</em><span className="fx-pr-bar"><i style={{ width: x.shown === false ? "0%" : `${x.v}%`, background: tone(x.v) }} /></span><b>{x.shown === false ? "?" : x.v}</b></span>)}
          </span>
        )}
        {!stats && hidden && <span className="fx-pr-hid">🔒 {hidden}</span>}
        <span className="fx-pr-tick" aria-hidden>{selected ? <Check size={18} /> : <span>{cta ?? "Pick"}</span>}</span>
      </div>
      {(detail || hint) && (
        <>
          <button className="fx-pr-more" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined }} /> {open ? "Less" : "More about them"}{hint ? <span className="fx-pr-hint">{hint}</span> : null}</button>
          {open && <div className="fx-pr-detail">{detail}</div>}
        </>
      )}
    </div>
  );
}
