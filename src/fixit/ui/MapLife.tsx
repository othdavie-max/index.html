"use client";
/**
 * What makes the home map feel like a living country: the land around Nigeria, the sea, rivers and lakes, trunk roads
 * with lorries that thin out when the roads are unsafe, railways that appear as you build them, city lights that grow
 * with electricity, capitals, and a rich card when you hover a state. All in the same grid units as public/game/geo.json.
 */
import ctx from "../data/ngContext.json";
import type { FixState } from "../engine/types";
import { STATE_BY_ID } from "../../game/data/states";
import { stateLayerValue } from "../engine/views";
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

/** on top of the states: water, roads, rail, lights and capitals (drawn under the event markers) */
export function MapOver({ s, px, zoom, power, lens }: { s: FixState; px: number; zoom: number; power: boolean; lens?: string }) {
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
      {/* security: a dim map with red glows where it is unsafe, and a warning sign where it is worst */}
      {lens === "security" && (
        <g pointerEvents="none">
          <rect x={-100000} y={-100000} width={300000} height={300000} fill="#1a0a0a" opacity={0.25} />
          <defs><radialGradient id="fxdanger"><stop offset="0" stopColor="#ff4d4d" stopOpacity=".95" /><stop offset=".45" stopColor="#e11d48" stopOpacity=".55" /><stop offset="1" stopColor="#7f1d1d" stopOpacity="0" /></radialGradient></defs>
          {CTX.capitals.map((c) => { const v = stateLayerValue(s, c.state, "security"); if (v < 48) return null; const r = (10 + 0.32 * v) * f * 1.15; return <circle key={`d${c.state}`} cx={c.at[0]} cy={c.at[1]} r={r} fill="url(#fxdanger)" opacity={Math.min(1, (v - 44) / 36)} />; })}
          {CTX.capitals.map((c) => { const v = stateLayerValue(s, c.state, "security"); if (v < 66) return null; return <text key={`w${c.state}`} x={c.at[0]} y={c.at[1] + 5 * f} textAnchor="middle" fontSize={16 * f} stroke="#fff" strokeWidth={2 * f} paintOrder="stroke">⚠️</text>; })}
        </g>
      )}
      {/* politics: a party flag on every state, ringed if the governor has turned against you */}
      {lens === "politics" && (
        <g pointerEvents="none">
          {CTX.capitals.map((c) => {
            const zone = STATE_BY_ID[c.state]?.zone; const g = s.governors.find((x) => x.zone === zone); if (!g) return null;
            const mine = g.party === "NPP"; const hostile = g.relation < 35;
            return (
              <g key={`p${c.state}`} transform={`translate(${c.at[0]} ${c.at[1]}) scale(${f})`}>
                <circle r={9} fill={mine ? "#16a34a" : "#dc2626"} stroke={hostile ? "#facc15" : "#fff"} strokeWidth={hostile ? 3 : 1.6} />
                <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{mine ? "✓" : "✗"}</text>
              </g>
            );
          })}
        </g>
      )}
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
