"use client";
/** The world map: every country's shape (Natural Earth, public domain), coloured by the lens you pick. Tap a league country to visit. */
import { useMemo, useState } from "react";
import map from "../data/worldMap.json";
import { useS } from "./store";
import { NG, W, league } from "../engine/world";

type Lens = "rank" | "rel" | "bloc";
const LENSES: { id: Lens; label: string }[] = [{ id: "rank", label: "Power" }, { id: "rel", label: "Friendship" }, { id: "bloc", label: "Naira bloc" }];
const VIEWS = { world: "0 0 1000 520", africa: "400 170 260 250" } as const;
const ramp = (t: number) => { const c = [[239, 68, 68], [251, 191, 36], [163, 230, 53], [16, 185, 129]]; const x = Math.max(0, Math.min(0.999, t)) * 3; const i = Math.floor(x), f = x - i; const a = c[i], b = c[i + 1]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };

export function WorldMap({ onPick }: { onPick: (id: string) => void }) {
  const s = useS();
  const [lens, setLens] = useState<Lens>("rank");
  const [view, setView] = useState<keyof typeof VIEWS>("world");
  const w = W(s); const rows = league(s);
  const fill = useMemo(() => {
    const f: Record<string, string> = {};
    const max = rows[0].score, min = rows[rows.length - 1].score;
    for (const r of rows) {
      if (r.me) { f[NG] = "#facc15"; continue; }
      const c = w.c.find((x) => x.id === r.id)!;
      if (lens === "rank") f[r.id] = ramp((r.score - min) / Math.max(1, max - min));
      else if (lens === "rel") f[r.id] = ramp(c.rel / 100);
      else f[r.id] = w.naira.includes(r.id) ? "#10b981" : w.bloc.includes(r.id) ? "#6ee7b7" : "#cbd5e1";
    }
    return f;
  }, [rows, w, lens]);
  const label = lens === "rank" ? "Green countries are the strongest, red the weakest. Gold is Nigeria." : lens === "rel" ? "How much each country likes you: red hostile, green warm." : "Dark green trades in naira, light green is in the Prosperity Zone.";
  return (
    <div className="fx-wmap">
      <div className="g-row g-between g-wrap" style={{ gap: 6 }}>
        <div className="fx-subtabs" role="group" aria-label="Map colours">{LENSES.map((l) => <button key={l.id} className="fx-subtab" aria-pressed={lens === l.id} onClick={() => setLens(l.id)}>{l.label}</button>)}</div>
        <div className="fx-subtabs" role="group" aria-label="Zoom">{(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((v) => <button key={v} className="fx-subtab" aria-pressed={view === v} onClick={() => setView(v)}>{v === "world" ? "World" : "Africa"}</button>)}</div>
      </div>
      <svg viewBox={VIEWS[view]} className="fx-wmap-svg" role="img" aria-label="World map">
        <rect x="-50" y="-50" width="1100" height="620" fill="#0b2a47" />
        {map.c.map((c, i) => {
          const live = !!c.id && !!fill[c.id];
          return <path key={i} d={c.d} fill={live ? fill[c.id!] : "#334155"} stroke="#0b1f36" strokeWidth={view === "world" ? 0.4 : 0.25} style={{ cursor: live && c.id !== NG ? "pointer" : "default" }} onClick={() => live && c.id !== NG && onPick(c.id!)}><title>{c.n}{live && c.id !== NG ? ` · #${rows.find((r) => r.id === c.id)?.rank}` : ""}</title></path>;
        })}
        {map.c.filter((c) => c.id && fill[c.id]).map((c) => { const r = rows.find((x) => x.id === c.id)!; const sz = view === "world" ? 9 : 4; return <g key={c.id} style={{ pointerEvents: "none" }}><circle cx={c.c[0]} cy={c.c[1]} r={sz * 0.75} fill="#0b1f36" opacity={0.75} /><text x={c.c[0]} y={c.c[1] + sz * 0.32} textAnchor="middle" fontSize={sz * 0.85} fill="#fff" fontWeight={800}>{r.rank}</text></g>; })}
      </svg>
      <div className="g-tiny g-muted">{label} Grey countries are not in the league. Numbers are world ranks. Tap a coloured country to visit it.</div>
    </div>
  );
}
