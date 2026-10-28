"use client";
/** State of the States: every governor, how good they are and how their state is doing. */
import { useState } from "react";
import { Portrait } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { STATE_BY_ID } from "../../game/data/states";
import { stateProgress } from "../engine/progress";
import type { StateGov } from "../engine/types";

export const govGrade = (g: StateGov) => { const v = (g.skill * 1.2 + g.integrity) / 2.2; return v >= 72 ? "A" : v >= 60 ? "B" : v >= 48 ? "C" : v >= 36 ? "D" : "F"; };
const GRADE_COLOR: Record<string, string> = { A: "#047857", B: "#0f766e", C: "#a16207", D: "#c2410c", F: "#be123c" };
const VERDICT: Record<string, string> = { thriving: "🌟", improving: "📈", flat: "➖", slipping: "📉" };

export function GovernorsPanel() {
  const s = useS();
  const { setSelect } = useFix();
  const [sort, setSort] = useState<"grade" | "state" | "progress">("grade");
  const rows = s.govs.map((g) => ({ g, p: stateProgress(s, g.stateId) }));
  const order = { thriving: 0, improving: 1, flat: 2, slipping: 3 } as const;
  rows.sort((a, b) => sort === "state" ? (STATE_BY_ID[a.g.stateId]?.name ?? "").localeCompare(STATE_BY_ID[b.g.stateId]?.name ?? "") : sort === "progress" ? order[a.p?.verdict ?? "flat"] - order[b.p?.verdict ?? "flat"] : (b.g.skill * 1.2 + b.g.integrity) - (a.g.skill * 1.2 + a.g.integrity));
  return (
    <div className="g-col" style={{ gap: 10 }}>
      <div className="g-small g-muted">Each state has its own governor. A good one makes every project you build there work better; a weak or corrupt one wastes it. Tap a row to open the state on the map.</div>
      <div className="g-row g-wrap" style={{ gap: 6 }} role="group" aria-label="Sort governors">
        {([["grade", "Best first"], ["progress", "By progress"], ["state", "A to Z"]] as const).map(([k, l]) => <button key={k} className="fx-subtab" aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
      </div>
      <div className="g-col" style={{ gap: 6 }}>
        {rows.map(({ g, p }) => (
          <button key={g.stateId} className="fx-govrow" onClick={() => setSelect({ state: g.stateId, lga: null })}>
            <Portrait p={g.portrait} size={38} name={g.name} />
            <span className="g-grow"><b className="g-small">{g.name.replace("Gov. ", "")}</b> <span className="g-tiny g-muted">· {STATE_BY_ID[g.stateId]?.name} · {g.party}{g.backed ? " · you backed them" : ""}</span>
              <span className="g-tiny g-muted" style={{ display: "block" }}>Skill {g.skill} · Honesty {g.integrity} · Loyal to you {Math.round(g.loyalty)}</span></span>
            <span title={p?.verdict}>{p ? VERDICT[p.verdict] : ""}</span>
            <span className="fx-grade" style={{ background: GRADE_COLOR[govGrade(g)] }}>{govGrade(g)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
