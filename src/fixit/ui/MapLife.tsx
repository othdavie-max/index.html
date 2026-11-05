"use client";
/**
 * What makes the home map feel like a living country: the land around Nigeria, the sea, rivers and lakes, trunk roads
 * with lorries that thin out when the roads are unsafe, railways that appear as you build them, city lights that grow
 * with electricity, capitals, and a rich card when you hover a state. All in the same grid units as public/game/geo.json.
 */
import { useEffect, useMemo, useState } from "react";
import ctx from "../data/ngContext.json";
import type { FixState } from "../engine/types";
import { STATE_BY_ID } from "../../game/data/states";
import { govGrade } from "./Governors";

type Pt = [number, number];
const CTX = ctx as unknown as {
  neighbours: { name: string; d: string; at: Pt | null }[]; sea: Pt; seaName: string; atlantic: Pt;
  rivers: { name: string; d: string; at: Pt | null }[]; lakes: { name: string; d: string; at: Pt | null }[];
  capitals: { state: string; name: string; at: Pt }[]; cities: { name: string; pop: number; at: Pt }[];
  roads: { id: string; pts: Pt[] }[]; rails: { id: string; built: boolean; d: string }[];
};

/** under the states: neighbouring countries and the names of the seas */
export function MapUnder({ px }: { px: number }) {
  const f = 1 / px;
  return (
    <g pointerEvents="none" aria-hidden>
      {CTX.neighbours.map((n) => <path key={n.name} d={n.d} fill="#efe4c6" stroke="#c8b58a" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.9} />)}
      {CTX.neighbours.map((n) => n.at && <text key={`t${n.name}`} x={n.at[0]} y={n.at[1]} textAnchor="middle" fontSize={12 * f} fill="#8a7a58" fontWeight={700} letterSpacing={3 * f} style={{ textTransform: "uppercase" }}>{n.name}</text>)}
      <text x={CTX.sea[0]} y={CTX.sea[1]} textAnchor="middle" fontSize={15 * f} fill="#dff3ff" fillOpacity={0.85} fontStyle="italic" fontWeight={700} letterSpacing={4 * f}>{CTX.seaName}</text>
      <text x={CTX.atlantic[0]} y={CTX.atlantic[1]} textAnchor="middle" fontSize={11 * f} fill="#dff3ff" fillOpacity={0.6} fontStyle="italic" letterSpacing={3 * f}>Atlantic Ocean</text>
    </g>
  );
}

const done = (s: FixState, defId: string) => s.projects.filter((p) => p.defId === defId && p.status === "done").length;

/** a lorry moving along a road: position and heading at fraction u of the polyline */
function along(pts: Pt[], len: number[], total: number, u: number): { x: number; y: number; a: number } {
  let d = u * total, i = 0;
  while (i < len.length - 1 && d > len[i]) { d -= len[i]; i++; }
  const [a, b] = [pts[i], pts[i + 1]], t = len[i] ? d / len[i] : 0;
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
}

function Traffic({ s, px }: { s: FixState; px: number }) {
  const [t, setT] = useState(0);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (reduce) return;
    let raf = 0, last = 0;
    const loop = (ms: number) => { if (ms - last > 60) { setT(ms / 1000); last = ms; } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  const roads = useMemo(() => CTX.roads.map((r) => { const len = r.pts.slice(1).map((p, i) => Math.hypot(p[0] - r.pts[i][0], p[1] - r.pts[i][1])); return { ...r, len, total: len.reduce((a, b) => a + b, 0) }; }), []);
  // busier and faster roads when the country is safe, the economy moves and highways are built
  const safety = Math.max(0, 1 - s.sec.index / 100);
  const quality = Math.min(1, 0.35 + 0.22 * done(s, "highway") + (s.infra?.roads ?? 40) / 250);
  const per = Math.max(1, Math.round(1 + 3 * safety * quality));
  const f = 1 / px;
  return (
    <g pointerEvents="none" aria-hidden>
      {roads.flatMap((r, ri) => Array.from({ length: per }, (_, k) => {
        const dir = k % 2 === 0 ? 1 : -1;
        const speed = (0.012 + 0.02 * quality) * (12000 / Math.max(3000, r.total));
        const u0 = ((t * speed + ri * 0.173 + k / per) % 1 + 1) % 1, u = dir > 0 ? u0 : 1 - u0;
        const p = along(r.pts, r.len, r.total, u);
        const colour = ["#f59e0b", "#e11d48", "#2563eb", "#10b981", "#f8fafc"][(ri + k) % 5];
        return (
          <g key={`${r.id}${k}`} transform={`translate(${p.x} ${p.y}) rotate(${p.a + (dir < 0 ? 180 : 0)}) scale(${f})`}>
            <rect x={-6} y={-2.4 + (dir > 0 ? -1.6 : 1.6)} width={9} height={4.2} rx={1} fill={colour} stroke="#1f2937" strokeWidth={0.6} />
            <rect x={3} y={-2 + (dir > 0 ? -1.6 : 1.6)} width={3} height={3.4} rx={0.8} fill="#1f2937" />
          </g>
        );
      }))}
    </g>
  );
}

/** on top of the states: water, roads, rail, lights and capitals (drawn under the event markers) */
export function MapOver({ s, px, zoom, power }: { s: FixState; px: number; zoom: number; power: boolean }) {
  const f = 1 / px;
  const hw = done(s, "highway") > 0, railBuilt = done(s, "rail");
  return (
    <g aria-hidden>
      <g pointerEvents="none">
        {CTX.lakes.map((l) => <path key={l.name} d={l.d} fill="#4fb3e8" stroke="#2b8fc7" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {CTX.rivers.map((r, i) => <path key={r.name} d={r.d} fill="none" stroke="#3aa3dc" strokeWidth={i < 2 ? 3.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.95} />)}
        {CTX.rivers.map((r) => r.at && zoom >= 1.15 && <text key={`rt${r.name}`} x={r.at[0]} y={r.at[1]} fontSize={10 * f} fill="#1a6fa0" fontStyle="italic" fontWeight={700} stroke="#ffffffcc" strokeWidth={2.5 * f} paintOrder="stroke">{r.name}</text>)}
        {CTX.lakes.map((l) => l.at && <text key={`lt${l.name}`} x={l.at[0]} y={l.at[1]} textAnchor="middle" fontSize={9 * f} fill="#0f5a85" fontStyle="italic" fontWeight={700}>{l.name}</text>)}
        {/* trunk roads: brown, turning gold once you build highways */}
        {CTX.roads.map((r) => <polyline key={r.id} points={r.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={hw ? "#b8860b" : "#7c6a4a"} strokeOpacity={0.75} strokeWidth={hw ? 2.6 : 1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
        {/* rail: the lines that exist today, plus one more for each rail project you finish */}
        {CTX.rails.filter((r, i) => r.built || i < 3 + railBuilt).map((r) => <g key={r.id}><path d={r.d} fill="none" stroke="#1f2937" strokeWidth={2.4} vectorEffect="non-scaling-stroke" /><path d={r.d} fill="none" stroke="#f8fafc" strokeWidth={1.2} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /></g>)}
      </g>
      <Traffic s={s} px={px} />
      {/* city lights: bright where the power is on (Electricity lens) */}
      {power && <rect x={-100000} y={-100000} width={300000} height={300000} fill="#0b1433" opacity={0.42} pointerEvents="none" />}
      {power && (
        <g pointerEvents="none" style={{ mixBlendMode: "screen" }}>
          <defs><radialGradient id="fxlight"><stop offset="0" stopColor="#fffbe0" /><stop offset=".35" stopColor="#facc15" stopOpacity=".85" /><stop offset="1" stopColor="#f59e0b" stopOpacity="0" /></radialGradient></defs>
          {CTX.capitals.map((c) => { const on = 1 - (s.regions[c.state]?.power ?? 60) / 100; const big = CTX.cities.find((x) => x.name === c.name)?.pop ?? 0.6; return <circle key={`l${c.state}`} cx={c.at[0]} cy={c.at[1]} r={(10 + 9 * Math.sqrt(big)) * f * (0.35 + on)} fill="url(#fxlight)" opacity={0.25 + on * 0.75} />; })}
          {CTX.cities.filter((c) => !CTX.capitals.some((x) => x.name === c.name)).map((c) => <circle key={`lc${c.name}`} cx={c.at[0]} cy={c.at[1]} r={(10 + 9 * Math.sqrt(c.pop)) * f * 0.8} fill="url(#fxlight)" opacity={0.6} />)}
        </g>
      )}
      {/* capitals and the big cities */}
      <g pointerEvents="none">
        {CTX.capitals.map((c) => c.state === "NG-FC"
          ? <g key={c.state} transform={`translate(${c.at[0]} ${c.at[1]}) scale(${f})`}><path d="M0,-9 2.6,-2.8 9,-2.8 3.9,1.2 5.8,7.6 0,3.8 -5.8,7.6 -3.9,1.2 -9,-2.8 -2.6,-2.8Z" fill="#facc15" stroke="#0b1f36" strokeWidth={1.4} /><text y={-12} textAnchor="middle" fontSize={11} fontWeight={900} fill="#0b1f36" stroke="#fff" strokeWidth={3} paintOrder="stroke">Abuja</text></g>
          : zoom >= 1.4 && <g key={c.state} transform={`translate(${c.at[0]} ${c.at[1]}) scale(${f})`}><rect x={-3} y={-3} width={6} height={6} fill="#fff" stroke="#0b1f36" strokeWidth={1.4} transform="rotate(45)" />{zoom >= 2.1 && <text y={-7} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#0b1f36" stroke="#fff" strokeWidth={2.6} paintOrder="stroke">{c.name}</text>}</g>)}
        {zoom >= 1.3 && zoom < 2.1 && CTX.cities.filter((c) => c.pop >= 3 && c.name !== "Abuja" && !Object.values(STATE_BY_ID).some((x) => x.name === c.name)).map((c) => <g key={`c${c.name}`} transform={`translate(${c.at[0]} ${c.at[1]}) scale(${f})`}><circle r={4} fill="#0b1f36" stroke="#fff" strokeWidth={1.5} /><text x={6} y={4} fontSize={10.5} fontWeight={800} fill="#0b1f36" stroke="#fff" strokeWidth={3} paintOrder="stroke">{c.name}</text></g>)}
      </g>
    </g>
  );
}

const BAR = (label: string, icon: string, bad: number) => { const v = Math.round(100 - bad); return <div className="g-map-card-bar" key={label}><span>{icon} {label}</span><i><b style={{ width: `${v}%`, background: v >= 60 ? "#10b981" : v >= 40 ? "#f59e0b" : "#e11d48" }} /></i><em>{v}</em></div>; };

/** the card that follows the pointer over a state */
export function StateCard({ s, id, face }: { s: FixState; id: string; face?: string | null }) {
  const st = STATE_BY_ID[id], r = s.regions[id], g = s.govs.find((x) => x.stateId === id);
  const cap = CTX.capitals.find((c) => c.state === id)?.name;
  const evs = s.events.filter((e) => e.status === "open" && e.stateId === id).length;
  const pj = s.projects.filter((p) => p.stateId === id && (p.status === "active" || p.status === "stalled")).length;
  const built = s.projects.filter((p) => p.stateId === id && p.status === "done").length;
  if (!st || !r) return <b>{st?.name ?? id}</b>;
  return (
    <div className="g-map-card-in">
      <div className="g-map-card-h"><b>{st.name}</b>{face && <span aria-hidden>{face}</span>}</div>
      <div className="g-map-card-sub">{cap ? `Capital ${cap}` : ""}{g ? ` · Gov. ${g.name.replace("Gov. ", "")} (${govGrade(g)})` : ""}</div>
      {BAR("Food", "🌾", r.food)}{BAR("Safety", "🛡️", r.insecurity)}{BAR("Jobs", "💼", r.jobless)}{BAR("Power", "💡", r.power)}
      <div className="g-map-card-f">{evs > 0 && <span>⚠️ {evs} to handle</span>}{pj > 0 && <span>🏗️ {pj} building</span>}{built > 0 && <span>✅ {built} built</span>}{r.unrest >= 60 && <span>🔥 angry streets</span>}</div>
      <div className="g-map-card-tap">Tap for the full story</div>
    </div>
  );
}
