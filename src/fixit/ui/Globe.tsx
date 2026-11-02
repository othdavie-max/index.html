"use client";
/**
 * The world, as a 3D globe you can spin or a flat 2D map you can pan, always starting on Nigeria.
 * Ships and planes carry imports in and exports out along real great-circle routes. Country shapes: Natural Earth
 * (public domain) via world-atlas.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import topo from "world-atlas/countries-110m.json";
import { useS } from "./store";
import { NG, W, league } from "../engine/world";
import { GOODS, imp, importFlow, exportFlow } from "../engine/imports";
import { dealsOf } from "../engine/trade";
import type { FixState } from "../engine/types";

type F = Feature<Geometry, { name: string }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = topo as any;
const WORLD: F[] = (feature(T, T.objects.countries) as unknown as { features: F[] }).features.filter((f) => f.properties.name !== "Antarctica");
const IDS: Record<number, string> = { 840: "us", 156: "cn", 276: "de", 356: "in", 392: "jp", 826: "gb", 250: "fr", 76: "br", 643: "ru", 682: "sa", 792: "tr", 410: "kr", 360: "id", 484: "mx", 124: "ca", 36: "au", 784: "ae", 818: "eg", 710: "za", 231: "et", 404: "ke", 288: "gh", 566: NG };
/** where ships and planes leave from: the main port or airport of each country */
export const PORT: Record<string, [number, number]> = { us: [-74, 40.6], cn: [121.5, 31.2], in: [72.8, 18.9], br: [-46.3, -23.9], ru: [30.2, 59.9], ca: [-79.4, 43.6], gb: [0.4, 51.5], fr: [0.1, 49.5], de: [9.9, 53.5], jp: [139.8, 35.6], kr: [129, 35.1], au: [151.2, -33.9], sa: [39.2, 21.5], ae: [55.1, 25], tr: [28.9, 41], eg: [32.3, 31.2], za: [18.4, -33.9], ke: [39.7, -4], gh: [0, 5.6], et: [38.8, 9], id: [106.8, -6.1], mx: [-96.1, 19.2] };
const LAGOS: [number, number] = [3.4, 6.45], ABUJA: [number, number] = [7.5, 9.06];
const VW = 600, VH = 420;

export interface Route { from: [number, number]; to: [number, number]; out: boolean; plane: boolean; icon: string; vol: number; label: string; who: string }
export function tradeRoutes(s: FixState): Route[] {
  const r: Route[] = []; const st = imp(s);
  for (const g of GOODS) {
    const f = importFlow(s, g.id); if (f < 0.05) continue;
    const sup = g.suppliers.filter((x) => PORT[x]).slice(0, 2);
    for (const c of sup) r.push({ from: PORT[c], to: LAGOS, out: false, plane: !!g.plane, icon: g.icon, vol: f / sup.length, label: `${g.name} in`, who: c });
    for (const b of st[g.id].exports) if (PORT[b]) r.push({ from: LAGOS, to: PORT[b], out: true, plane: false, icon: g.icon, vol: exportFlow(s, g.id) / Math.max(1, st[g.id].exports.length), label: `${g.name} out`, who: b });
  }
  const MAP: Record<string, string> = { china: "cn", usa: "us", eu: "de", india: "in", ecowas: "gh" };
  for (const d of dealsOf(s)) { const to = MAP[d.partner]; if (to && PORT[to] && !d.suspended) r.push({ from: LAGOS, to: PORT[to], out: true, plane: false, icon: d.product === "crude" ? "🛢️" : "📦", vol: 0.8, label: `${d.product} out`, who: to }); }
  if (!r.some((x) => x.out)) r.push({ from: LAGOS, to: PORT.in, out: true, plane: false, icon: "🛢️", vol: 1.2, label: "Crude oil out", who: "in" }, { from: LAGOS, to: PORT.fr, out: true, plane: false, icon: "🛢️", vol: 0.8, label: "Crude oil out", who: "fr" });
  return r.sort((a, b) => b.vol - a.vol).slice(0, 18);
}

type Lens = "trade" | "power" | "friendship";
const ramp = (t: number) => { const c = [[239, 68, 68], [251, 191, 36], [163, 230, 53], [16, 185, 129]]; const x = Math.max(0, Math.min(0.999, t)) * 3; const i = Math.floor(x), f = x - i; const a = c[i], b = c[i + 1]; return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`; };

function Movers({ routes, proj, mode, center }: { routes: Route[]; proj: GeoProjection; mode: "3d" | "2d"; center: [number, number] }) {
  const [t, setT] = useState(0);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (reduce) return;
    let raf = 0, last = 0;
    const loop = (ms: number) => { if (ms - last > 50) { setT(ms / 1000); last = ms; } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  return (
    <g style={{ pointerEvents: "none" }}>
      {routes.flatMap((r, i) => {
        const interp = geoInterpolate(r.from, r.to); const n = r.vol > 1 ? 2 : 1;
        return Array.from({ length: n }, (_, k) => {
          const u = reduce ? 0.5 : ((t * (r.plane ? 0.09 : 0.045) + i * 0.137 + k / n) % 1);
          const p = interp(u) as [number, number];
          if (mode === "3d" && geoDistance(p, center) > 1.5) return null;
          const xy = proj(p); if (!xy) return null;
          return <text key={`${i}-${k}`} x={xy[0]} y={xy[1]} fontSize={r.plane ? 13 : 14} textAnchor="middle" dominantBaseline="middle">{r.plane ? "✈️" : "🚢"}</text>;
        });
      })}
    </g>
  );
}

export function Globe({ lens: lens0 = "trade", onPick, compact }: { lens?: Lens; onPick?: (id: string) => void; compact?: boolean }) {
  const s = useS();
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [lens, setLens] = useState<Lens>(lens0);
  const [rot, setRot] = useState<[number, number]>([-8, -9]);
  const [k, setK] = useState(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const drag = useRef<{ x: number; y: number; rot: [number, number]; pan: [number, number]; moved: boolean } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const proj = useMemo(() => mode === "3d"
    ? geoOrthographic().scale(195 * k).translate([VW / 2, VH / 2]).rotate([rot[0], rot[1]]).clipAngle(90).precision(0.5)
    : geoNaturalEarth1().scale(105 * k).translate([VW / 2 + pan[0], VH / 2 + pan[1]]).rotate([rot[0], 0]).precision(0.5), [mode, k, rot, pan]);
  const path = useMemo(() => geoPath(proj), [proj]);
  const w = W(s); const rows = league(s); const routes = useMemo(() => tradeRoutes(s), [s, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const involved = useMemo(() => { const m = new Map<string, "in" | "out" | "both">(); for (const r of routes) { const prev = m.get(r.who); m.set(r.who, prev && prev !== (r.out ? "out" : "in") ? "both" : r.out ? "out" : "in"); } return m; }, [routes]);
  const fill = (id: string | undefined): string => {
    if (id === NG) return "#facc15";
    if (!id) return lens === "trade" ? "#3b4a5e" : "#334155";
    if (lens === "trade") { const v = involved.get(id); return v === "in" ? "#f97316" : v === "out" ? "#10b981" : v === "both" ? "#a3e635" : "#64748b"; }
    const c = w.c.find((x) => x.id === id); if (!c) return "#334155";
    if (lens === "friendship") return ramp(c.rel / 100);
    const r = rows.find((x) => x.id === id)!; return ramp((r.score - rows[rows.length - 1].score) / Math.max(1, rows[0].score - rows[rows.length - 1].score));
  };
  const center: [number, number] = [-rot[0], -rot[1]];
  const point = (e: React.PointerEvent) => { const b = svg.current!.getBoundingClientRect(); return { x: (e.clientX - b.left) * (VW / b.width), y: (e.clientY - b.top) * (VH / b.height) }; };
  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); const p = point(e); pts.current.set(e.pointerId, p); if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k }; drag.current = null; } else drag.current = { x: p.x, y: p.y, rot, pan, moved: false }; };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return; const p = point(e); pts.current.set(e.pointerId, p);
    if (pinch.current && pts.current.size === 2) { const [a, b] = [...pts.current.values()]; setK(Math.max(0.8, Math.min(6, pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d))); return; }
    const d = drag.current; if (!d) return; const dx = p.x - d.x, dy = p.y - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (mode === "3d") setRot([d.rot[0] + dx * 0.4 / k, Math.max(-80, Math.min(80, d.rot[1] - dy * 0.4 / k))]);
    else setPan([d.pan[0] + dx, d.pan[1] + dy]);
  };
  const up = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; setTimeout(() => { drag.current = null; }, 0); };
  const wheel = (e: React.WheelEvent) => { setK((x) => Math.max(0.8, Math.min(6, x * (e.deltaY < 0 ? 1.12 : 0.89)))); };
  const home = () => { setRot([-8, -9]); setK(mode === "3d" ? 1.6 : 2.4); setPan(mode === "2d" ? [-30, -20] : [0, 0]); };
  const hub = proj(ABUJA); const hubVisible = mode === "2d" || geoDistance(ABUJA, center) < 1.5;
  return (
    <div className="fx-globe">
      <div className="g-row g-between g-wrap" style={{ gap: 6 }}>
        <div className="fx-subtabs" role="group" aria-label="Map colours">{(["trade", "power", "friendship"] as Lens[]).map((l) => <button key={l} className="fx-subtab" aria-pressed={lens === l} onClick={() => setLens(l)}>{l === "trade" ? "Trade" : l === "power" ? "Power" : "Friendship"}</button>)}</div>
        <div className="fx-subtabs" role="group" aria-label="View">
          <button className="fx-subtab" aria-pressed={mode === "3d"} onClick={() => { setMode("3d"); setPan([0, 0]); setK(1); }}>🌍 3D</button>
          <button className="fx-subtab" aria-pressed={mode === "2d"} onClick={() => { setMode("2d"); setK(1); setPan([0, 0]); }}>🗺️ 2D</button>
          <button className="fx-subtab" onClick={home} aria-label="Back to Nigeria">🏠 Nigeria</button>
        </div>
      </div>
      <div className="fx-globe-wrap">
        <svg ref={svg} viewBox={`0 0 ${VW} ${VH}`} className="fx-globe-svg" style={compact ? { maxHeight: 300 } : undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} role="img" aria-label="World map with trade routes. Drag to move, pinch or scroll to zoom.">
          <defs>
            <radialGradient id="fxsea" cx="40%" cy="35%"><stop offset="0" stopColor="#1e5a8a" /><stop offset="1" stopColor="#0b2a47" /></radialGradient>
            <radialGradient id="fxglow"><stop offset="0" stopColor="rgba(250,204,21,.55)" /><stop offset="1" stopColor="rgba(250,204,21,0)" /></radialGradient>
          </defs>
          {mode === "3d" ? <path d={path({ type: "Sphere" }) ?? ""} fill="url(#fxsea)" stroke="#5fa8d3" strokeWidth={1} /> : <rect width={VW} height={VH} fill="#0b2a47" />}
          <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#ffffff" strokeOpacity={0.07} />
          {WORLD.map((f, i) => { const id = IDS[Number(f.id)]; const d = path(f); if (!d) return null; const pick = !!id && id !== NG && !!onPick; return <path key={i} d={d} fill={fill(id)} stroke={id === NG ? "#fff7cc" : "#0b1f36"} strokeWidth={id === NG ? 1.4 : 0.4} style={{ cursor: pick ? "pointer" : "default" }} onClick={() => { if (pick && !drag.current?.moved) onPick!(id!); }}><title>{f.properties.name}{id && id !== NG ? ` · world rank #${rows.find((r) => r.id === id)?.rank}` : id === NG ? " · home" : ""}</title></path>; })}
          {routes.map((r, i) => { const d = path({ type: "LineString", coordinates: [r.from, r.to] }); return d ? <path key={i} d={d} fill="none" stroke={r.out ? "#34d399" : "#fb923c"} strokeOpacity={0.75} strokeWidth={Math.min(3, 0.8 + r.vol * 0.8)} strokeDasharray={r.plane ? "2 4" : "6 4"} style={{ pointerEvents: "none" }} /> : null; })}
          {hub && hubVisible && <g style={{ pointerEvents: "none" }}><circle cx={hub[0]} cy={hub[1]} r={26 * Math.min(1.6, k)} fill="url(#fxglow)" className="fx-globe-pulse" /><circle cx={hub[0]} cy={hub[1]} r={4} fill="#facc15" stroke="#0b1f36" /><text x={hub[0]} y={hub[1] - 10} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff7cc" stroke="#0b1f36" strokeWidth={3} paintOrder="stroke">NIGERIA</text></g>}
          <Movers routes={routes} proj={proj} mode={mode} center={center} />
        </svg>
        <div className="fx-globe-zoom"><button onClick={() => setK((x) => Math.min(6, x * 1.25))} aria-label="Zoom in">＋</button><button onClick={() => setK((x) => Math.max(0.8, x / 1.25))} aria-label="Zoom out">－</button></div>
      </div>
      <div className="fx-globe-legend g-tiny">
        {lens === "trade" ? <><span><i style={{ background: "#f97316" }} />We buy from them</span><span><i style={{ background: "#10b981" }} />We sell to them</span><span><i style={{ background: "#facc15" }} />Nigeria</span><span>🚢 sea cargo · ✈️ air cargo</span></> : <><span><i style={{ background: "#ef4444" }} />{lens === "power" ? "Weaker" : "Hostile"}</span><span><i style={{ background: "#10b981" }} />{lens === "power" ? "Stronger" : "Warm"}</span><span><i style={{ background: "#facc15" }} />Nigeria</span></>}
        <span className="g-muted">Drag to {mode === "3d" ? "spin" : "move"} · pinch or scroll to zoom{onPick ? " · tap a coloured country to visit" : ""}</span>
      </div>
    </div>
  );
}
