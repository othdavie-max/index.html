"use client";
/**
 * The world as a lit 3D globe you can spin (it turns slowly on its own) or a flat 2D map you can pan.
 * Every country is drawn (Natural Earth 1:50m, public domain, via world-atlas; a lighter 1:110m copy while you drag),
 * on a canvas with sunlight shading, an atmosphere and named countries. On top: trade routes as arcs that lift off the
 * surface, container ships with wakes on the sea lanes and cargo planes casting shadows, and a card for any country
 * you tap that shows how it feels about Nigeria.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoCentroid, geoContains, geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, geoRotation, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import topo50 from "world-atlas/countries-50m.json";
import topo110 from "world-atlas/countries-110m.json";
import { useS } from "./store";
import { NG, W, league } from "../engine/world";
import { PORT, tradeRoutes } from "../engine/deals";
import { feudList, mood, measuresAgainst, MEASURE, repairFeud, repairCost, feudOf } from "../engine/feuds";
import { useFix } from "./store";

type F = Feature<Geometry, { name: string }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const feats = (t: any): F[] => (feature(t, t.objects.countries) as unknown as { features: F[] }).features.filter((f) => f.properties.name !== "Antarctica");
const HI = feats(topo50), LO = feats(topo110);
const IDS: Record<number, string> = { 840: "us", 156: "cn", 276: "de", 356: "in", 392: "jp", 826: "gb", 250: "fr", 76: "br", 643: "ru", 682: "sa", 792: "tr", 410: "kr", 360: "id", 484: "mx", 124: "ca", 36: "au", 784: "ae", 818: "eg", 710: "za", 231: "et", 404: "ke", 288: "gh", 566: NG };
export { PORT };
const ABUJA: [number, number] = [7.5, 9.06];
const VW = 600, VH = 420;
type Lens = "trade" | "power" | "friendship";
type RGB = [number, number, number];
const RAMP: RGB[] = [[220, 38, 38], [245, 158, 11], [132, 204, 22], [16, 185, 129]];
const ramp = (t: number): RGB => { const x = Math.max(0, Math.min(0.999, t)) * 3; const i = Math.floor(x), f = x - i; const a = RAMP[i], b = RAMP[i + 1]; return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as RGB; };
/** natural land tones for countries that are not part of the story, so the planet looks like a planet */
const EARTH: RGB[] = [[94, 122, 78], [116, 128, 82], [138, 124, 88], [104, 116, 74], [126, 136, 96], [150, 132, 96], [88, 112, 84]];
const toRad = Math.PI / 180;
/** a stable number for every country, even the few Natural Earth leaves without an id (Kosovo, Northern Cyprus…) */
const num = (f: F) => { const n = Number(f.id); if (Number.isFinite(n)) return n; let h = 0; for (const ch of f.properties.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return 1000 + (h % 997); };

// precomputed per country: centroid, size (for which names show first) and a stable land tone
interface Meta { c: [number, number]; area: number; tone: RGB; id?: string; name: string }
const META = new Map<F, Meta>();
for (const f of HI) { const n = num(f); META.set(f, { c: geoCentroid(f) as [number, number], area: geoArea(f), tone: EARTH[n % EARTH.length], id: IDS[n], name: f.properties.name }); }
const LO_META = new Map<F, Meta>();
for (const f of LO) { const n = num(f); const hi = HI.find((h) => num(h) === n); LO_META.set(f, hi ? META.get(hi)! : { c: geoCentroid(f) as [number, number], area: geoArea(f), tone: EARTH[n % EARTH.length], id: IDS[n], name: f.properties.name }); }
const CENTRE: Record<string, [number, number]> = {};
for (const f of HI) { const m = META.get(f)!; if (m.id) CENTRE[m.id] = m.c; }
const SHORT_NAME: Record<string, string> = { "United States of America": "USA", "Dem. Rep. Congo": "DR Congo", "Central African Rep.": "CAR", "United Kingdom": "UK", "Bosnia and Herz.": "Bosnia", "Dominican Rep.": "Dominican Rep.", "S. Sudan": "South Sudan", "W. Sahara": "W. Sahara", "Eq. Guinea": "Eq. Guinea", "eSwatini": "Eswatini" };
const LABEL_ORDER = [...HI].sort((a, b) => (META.get(b)!.id ? 1 : 0) - (META.get(a)!.id ? 1 : 0) || META.get(b)!.area - META.get(a)!.area);

/** the light comes from the upper left, slightly in front */
const LIGHT = (() => { const v = [-0.55, 0.6, 0.58]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
/** where a lon/lat sits in view space for the globe's current rotation: x right, y up, z towards you */
function view3(rot: [number, number], p: [number, number]): [number, number, number] {
  const [l, f] = geoRotation([rot[0], rot[1]])(p);
  const L = l * toRad, P = f * toRad;
  return [Math.cos(P) * Math.sin(L), Math.sin(P), Math.cos(P) * Math.cos(L)];
}

export function Globe({ lens: lens0 = "trade", onPick, compact }: { lens?: Lens; onPick?: (id: string) => void; compact?: boolean }) {
  const s = useS();
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [lens, setLens] = useState<Lens>(lens0);
  const [vs, setVs] = useState<{ rot: [number, number]; k: number; pan: [number, number]; t: number }>({ rot: [-8, -9], k: 1, pan: [0, 0], t: 0 });
  const [card, setCard] = useState<{ x: number; y: number; f: F } | null>(null);
  const rot = useRef<[number, number]>([-8, -9]);
  const k = useRef(1);
  const pan = useRef<[number, number]>([0, 0]);
  const vel = useRef<[number, number]>([0, 0]);
  const idleSince = useRef(0);
  const moving = useRef(false);
  const dirty = useRef(true);
  const spin = useRef(true);
  const spinLow = useRef(false);
  const [spinOn, setSpinOn] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; k: number } | null>(null);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const w = W(s); const rows = league(s); const feuds = feudList(s); const { act } = useFix();
  const routes = useMemo(() => tradeRoutes(s), [s, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const involved = useMemo(() => { const m = new Map<string, "in" | "out" | "both">(); for (const r of routes) { const prev = m.get(r.who); m.set(r.who, prev && prev !== (r.out ? "out" : "in") ? "both" : r.out ? "out" : "in"); } return m; }, [routes]);
  const colour = (m: Meta): RGB => {
    const id = m.id;
    if (id === NG) return [250, 204, 21];
    if (lens === "trade") { const v = id ? involved.get(id) : undefined; return v === "in" ? [249, 115, 22] : v === "out" ? [16, 185, 129] : v === "both" ? [163, 230, 53] : m.tone; }
    const c = id ? w.c.find((x) => x.id === id) : undefined; if (!c) return m.tone.map((x) => Math.round(x * 0.85)) as RGB;
    if (lens === "friendship") return ramp(c.rel / 100);
    const r = rows.find((x) => x.id === id)!; return ramp((r.score - rows[rows.length - 1].score) / Math.max(1, rows[0].score - rows[rows.length - 1].score));
  };
  const colourRef = useRef(colour);
  useEffect(() => { colourRef.current = colour; });
  useEffect(() => { dirty.current = true; }, [lens, mode, routes, s.month]);

  const projFor = (r: [number, number], kk: number, pn: [number, number]): GeoProjection => mode === "3d"
    ? geoOrthographic().scale(190 * kk).translate([VW / 2, VH / 2]).rotate([r[0], r[1]]).clipAngle(90).precision(0.6)
    : geoNaturalEarth1().scale(105 * kk).translate([VW / 2 + pn[0], VH / 2 + pn[1]]).rotate([r[0], 0]).precision(0.6);
  const projOf = () => projFor(rot.current, k.current, pan.current);

  // ---------------------------------------------------------------- the canvas: sea, land, light, air
  const draw = () => {
    const cv = canvas.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = cv.clientWidth || VW, ch = cv.clientHeight || VH;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    const sc = Math.min(cv.width / VW, cv.height / VH);
    ctx.setTransform(sc, 0, 0, sc, (cv.width - VW * sc) / 2, (cv.height - VH * sc) / 2);
    ctx.clearRect(-VW, -VH, VW * 3, VH * 3);
    const proj = projOf(); const path = geoPath(proj, ctx);
    const R = 190 * k.current, cx = VW / 2, cy = VH / 2;
    const lo = moving.current || spinLow.current; const list = lo ? LO : HI, meta = lo ? LO_META : META;
    if (mode === "3d") {
      // atmosphere
      const atm = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
      atm.addColorStop(0, "rgba(125,211,252,0.55)"); atm.addColorStop(0.35, "rgba(56,189,248,0.18)"); atm.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2); ctx.fill();
      // deep sea, lit from the upper left
      const sea = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      sea.addColorStop(0, "#2f7fb8"); sea.addColorStop(0.55, "#164e7e"); sea.addColorStop(1, "#071d36");
      ctx.fillStyle = sea; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
    } else {
      const sea = ctx.createLinearGradient(0, 0, 0, VH); sea.addColorStop(0, "#164e7e"); sea.addColorStop(1, "#0a2a4c");
      ctx.fillStyle = sea; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
    }
    ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 0.5 / sc * sc; ctx.stroke();
    // land: each country in its colour, shaded by how much sunlight reaches it
    for (const f of list) {
      const m = meta.get(f)!; const base = colourRef.current(m);
      let shade = 1;
      if (mode === "3d") { const v = view3(rot.current, m.c); if (v[2] < -0.25) continue; const lam = Math.max(0, v[0] * LIGHT[0] + v[1] * LIGHT[1] + v[2] * LIGHT[2]); shade = 0.5 + 0.62 * lam; }
      else shade = 0.92 + 0.08 * Math.cos(m.c[1] * toRad);
      const [r, g, b] = base.map((x) => Math.min(255, Math.round(x * shade)));
      ctx.beginPath(); path(f);
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fill();
      ctx.strokeStyle = m.id === NG ? "#fff7cc" : "rgba(8,20,38,0.55)"; ctx.lineWidth = m.id === NG ? 1.4 : 0.45; ctx.stroke();
    }
    if (mode === "3d") {
      // night side and a soft shine
      const night = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.2, cx, cy, R * 1.02);
      night.addColorStop(0, "rgba(255,255,255,0.10)"); night.addColorStop(0.5, "rgba(255,255,255,0)"); night.addColorStop(0.82, "rgba(2,6,23,0.28)"); night.addColorStop(1, "rgba(2,6,23,0.7)");
      ctx.fillStyle = night; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
      ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = "rgba(186,230,253,0.55)"; ctx.lineWidth = 1; ctx.stroke();
    }
  };

  // ---------------------------------------------------------------- one loop: spin, inertia, redraw, move the ships
  useEffect(() => {
    let raf = 0, last = performance.now(), lastTick = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    if (wrap.current) io.observe(wrap.current);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !document.hidden) {
        if (!drag.current && !pinch.current) {
          const [vx, vy] = vel.current;
          if (Math.abs(vx) + Math.abs(vy) > 0.5) {
            if (mode === "3d") rot.current = [rot.current[0] + vx * dt, Math.max(-80, Math.min(80, rot.current[1] + vy * dt))]; else pan.current = [pan.current[0] + vx * dt, pan.current[1] + vy * dt];
            vel.current = [vx * 0.93, vy * 0.93]; dirty.current = true; moving.current = true;
          } else if (moving.current) { moving.current = false; dirty.current = true; }
          const spinning = mode === "3d" && !reduce && spin.current && k.current < 1.6 && now - idleSince.current > 4000;
          if (spinning) { rot.current = [rot.current[0] + 5 * dt, rot.current[1]]; dirty.current = true; spinLow.current = true; } else if (spinLow.current) { spinLow.current = false; dirty.current = true; }
        }
        if (dirty.current) { draw(); dirty.current = false; }
        if (now - lastTick > 55) { lastTick = now; setVs({ rot: [rot.current[0], rot.current[1]], k: k.current, pan: [pan.current[0], pan.current[1]], t: now / 1000 }); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => { dirty.current = true; });
    if (canvas.current) ro.observe(canvas.current);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- pointer: drag to spin, pinch/scroll to zoom, tap for a country
  const point = (e: { clientX: number; clientY: number }) => { const b = wrap.current!.getBoundingClientRect(); const sc = Math.min(b.width / VW, b.height / VH); return { x: (e.clientX - b.left - (b.width - VW * sc) / 2) / sc, y: (e.clientY - b.top - (b.height - VH * sc) / 2) / sc }; };
  const touch = () => { idleSince.current = performance.now(); };
  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); touch(); vel.current = [0, 0]; const p = point(e); pts.current.set(e.pointerId, p); if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: k.current }; drag.current = null; } else drag.current = { x: p.x, y: p.y, t: performance.now(), moved: false }; };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return; touch(); const p = point(e); pts.current.set(e.pointerId, p);
    if (pinch.current && pts.current.size === 2) { const [a, b] = [...pts.current.values()]; k.current = Math.max(0.8, Math.min(8, pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d)); moving.current = true; dirty.current = true; return; }
    const d = drag.current; if (!d) return; const dx = p.x - d.x, dy = p.y - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    const dt = Math.max(0.008, (performance.now() - d.t) / 1000);
    if (mode === "3d") { const f = 0.42 / k.current; rot.current = [rot.current[0] + dx * f, Math.max(-80, Math.min(80, rot.current[1] - dy * f))]; vel.current = [dx * f / dt, -dy * f / dt]; }
    else { pan.current = [pan.current[0] + dx, pan.current[1] + dy]; vel.current = [dx / dt, dy / dt]; }
    d.x = p.x; d.y = p.y; d.t = performance.now(); moving.current = true; dirty.current = true;
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; touch();
    if (d && !d.moved) { vel.current = [0, 0]; const p = point(e); const ll = projOf().invert?.([p.x, p.y]); const f = ll ? LO.find((x) => geoContains(x, ll)) : undefined; setCard(f ? { x: p.x, y: p.y, f } : null); }
    else if (d && performance.now() - d.t > 90) vel.current = [0, 0];
    drag.current = null; dirty.current = true;
  };
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); touch(); k.current = Math.max(0.8, Math.min(8, k.current * (e.deltaY < 0 ? 1.12 : 0.89))); dirty.current = true; };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const zoomBy = (f: number) => { touch(); k.current = Math.max(0.8, Math.min(8, k.current * f)); dirty.current = true; };
  const home = () => { touch(); vel.current = [0, 0]; rot.current = [-8, -9]; k.current = mode === "3d" ? 1.7 : 2.6; pan.current = mode === "2d" ? [-30, -40] : [0, 0]; dirty.current = true; setCard(null); };

  // ---------------------------------------------------------------- the overlay: names, routes, ships, planes
  const proj = projFor(vs.rot, vs.k, vs.pan);
  const R = 190 * vs.k;
  /** screen position of a lon/lat lifted h (fraction of the radius) above the ground; null when hidden behind the globe */
  const lifted = (p: [number, number], h: number): [number, number, number] | null => {
    if (mode === "2d") { const xy = proj(p); return xy ? [xy[0], xy[1] - h * 260 * vs.k, 1] : null; }
    const v = view3(vs.rot, p);
    const vis = v[2] > 0 || Math.sqrt(Math.max(0, 1 - v[2] * v[2])) * (1 + h) > 1.015;
    if (!vis) return null;
    return [VW / 2 + R * (1 + h) * v[0], VH / 2 - R * (1 + h) * v[1], v[2]];
  };
  const labels: { x: number; y: number; t: string; size: number; me: boolean }[] = [];
  {
    const boxes: [number, number, number, number][] = [];
    const max = mode === "3d" ? Math.round(16 + 26 * (vs.k - 1)) : Math.round(26 + 40 * (vs.k - 1));
    for (const f of LABEL_ORDER) {
      if (labels.length >= max) break;
      const m = META.get(f)!; if (!m.id && m.area < 0.0015) continue; const p = lifted(m.c, 0); if (!p || (mode === "3d" && p[2] < 0.25)) continue;
      if (p[0] < 10 || p[0] > VW - 10 || p[1] < 10 || p[1] > VH - 10) continue;
      const t = SHORT_NAME[m.name] ?? m.name; const big = m.area > 0.05 || !!m.id; const size = m.id === NG ? 11.5 : big ? 9.5 : 8;
      const wdt = t.length * size * 0.56, hgt = size * 1.2; const bx: [number, number, number, number] = [p[0] - wdt / 2, p[1] - hgt / 2, p[0] + wdt / 2, p[1] + hgt / 2];
      if (boxes.some((b) => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) continue;
      boxes.push(bx); labels.push({ x: p[0], y: p[1], t, size, me: m.id === NG });
    }
  }
  const tNow = vs.t;
  const hub = lifted(ABUJA, 0);
  const iconScale = Math.min(1.6, 0.85 + 0.25 * vs.k);
  const cardInfo = card ? (() => { const m = LO_META.get(card.f)!; const c = m.id ? w.c.find((x) => x.id === m.id) : undefined; const row = m.id ? rows.find((x) => x.id === m.id) : undefined; const trade = routes.filter((r) => r.who === m.id); return { m, c, row, trade }; })() : null;
  const feel = (rel: number) => rel >= 70 ? ["🤝", "Close ally", "#047857"] : rel >= 52 ? ["🙂", "Friendly", "#65a30d"] : rel >= 35 ? ["😐", "Cool", "#b45309"] : ["😠", "Hostile", "#b91c1c"];

  return (
    <div className="fx-globe">
      <div className="g-row g-between g-wrap" style={{ gap: 6 }}>
        <div className="fx-subtabs" role="group" aria-label="Map colours">{(["trade", "power", "friendship"] as Lens[]).map((l) => <button key={l} className="fx-subtab" aria-pressed={lens === l} onClick={() => setLens(l)}>{l === "trade" ? "🚢 Trade" : l === "power" ? "🏆 Power" : "🤝 Friendship"}</button>)}</div>
        <div className="fx-subtabs" role="group" aria-label="View">
          <button className="fx-subtab" aria-pressed={mode === "3d"} onClick={() => { setMode("3d"); pan.current = [0, 0]; k.current = 1; dirty.current = true; setCard(null); }}>🌍 3D</button>
          <button className="fx-subtab" aria-pressed={mode === "2d"} onClick={() => { setMode("2d"); k.current = 1; pan.current = [0, 0]; dirty.current = true; setCard(null); }}>🗺️ 2D</button>
          <button className="fx-subtab" onClick={home} aria-label="Back to Nigeria">🏠 Nigeria</button>
        </div>
      </div>
      <div className="fx-globe-wrap fx-globe-stage" ref={wrap} style={compact ? { maxHeight: 300 } : undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        role="application" aria-label="World globe with trade routes. Drag to spin, pinch or scroll to zoom, tap a country to see how it feels about Nigeria.">
        <canvas ref={canvas} className="fx-globe-canvas" />
        <svg viewBox={`0 0 ${VW} ${VH}`} className="fx-globe-svg fx-globe-over" aria-hidden>
          <defs>
            <linearGradient id="fxarcOut" x1="0" x2="1"><stop offset="0" stopColor="#34d399" stopOpacity=".2" /><stop offset="1" stopColor="#6ee7b7" /></linearGradient>
            <radialGradient id="fxglow"><stop offset="0" stopColor="rgba(250,204,21,.6)" /><stop offset="1" stopColor="rgba(250,204,21,0)" /></radialGradient>
          </defs>
          {/* routes: sea lanes hug the surface, flights arc up into the sky */}
          {routes.map((r, i) => {
            const interp = geoInterpolate(r.from, r.to); const dist = geoDistance(r.from, r.to); const H = r.plane ? 0.06 + 0.16 * dist / Math.PI : 0.012;
            const seg: string[] = []; let cur = "";
            for (let j = 0; j <= 40; j++) { const u = j / 40; const p = lifted(interp(u) as [number, number], H * Math.sin(Math.PI * u)); if (!p) { if (cur) { seg.push(cur); cur = ""; } continue; } cur += `${cur ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`; }
            if (cur) seg.push(cur);
            return seg.map((d, j) => <path key={`${i}-${j}`} d={d} fill="none" stroke={r.state === "blocked" ? "#f87171" : r.out ? "#6ee7b7" : "#fdba74"} strokeOpacity={r.state === "blocked" ? 0.9 : r.plane ? 0.85 : 0.6} strokeWidth={Math.min(2.6, 0.7 + r.vol * 0.7)} strokeDasharray={r.state === "blocked" ? "2 5" : r.plane ? "1 3.5" : undefined} strokeLinecap="round" />);
          })}
          {/* the ships and planes themselves */}
          {routes.flatMap((r, i) => {
            const interp = geoInterpolate(r.from, r.to); const dist = geoDistance(r.from, r.to); const H = r.plane ? 0.06 + 0.16 * dist / Math.PI : 0.012; const n = r.vol > 1 ? 2 : 1;
            if (r.state === "blocked") return [];
            return Array.from({ length: n }, (_, j) => {
              const u = reduce ? 0.45 : ((tNow * (r.plane ? 0.06 : 0.022) + i * 0.137 + j / n) % 1);
              const h = H * Math.sin(Math.PI * u);
              const a = lifted(interp(u) as [number, number], h), b = lifted(interp(Math.min(1, u + 0.01)) as [number, number], H * Math.sin(Math.PI * Math.min(1, u + 0.01)));
              if (!a || !b || (mode === "3d" && a[2] < 0.05)) return null;
              const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
              if (r.plane) {
                const g = lifted(interp(u) as [number, number], 0);
                return (
                  <g key={`m${i}${j}`}>
                    {g && <ellipse cx={g[0]} cy={g[1]} rx={4 * iconScale} ry={2 * iconScale} fill="#020617" opacity={0.28} />}
                    <g transform={`translate(${a[0]} ${a[1]}) rotate(${ang}) scale(${iconScale})`}>
                      <path d="M9,0 L3,-1.1 L-1,-7 L-3,-7 L-0.6,-1.2 L-6,-1.2 L-8,-3.6 L-9.3,-3.6 L-8.2,0 L-9.3,3.6 L-8,3.6 L-6,1.2 L-0.6,1.2 L-3,7 L-1,7 L3,1.1 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth={0.7} />
                    </g>
                  </g>
                );
              }
              const tail = [0.012, 0.024, 0.036].map((d) => lifted(interp(Math.max(0, u - d)) as [number, number], 0)).filter(Boolean) as [number, number, number][];
              const crate = r.out ? ["#10b981", "#f59e0b", "#2563eb"] : ["#ef4444", "#f97316", "#facc15"];
              return (
                <g key={`m${i}${j}`}>
                  {tail.length > 0 && <polyline points={[a, ...tail].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")} fill="none" stroke="#e0f2fe" strokeOpacity={0.55} strokeWidth={1.6 * iconScale} strokeLinecap="round" />}
                  <g transform={`translate(${a[0]} ${a[1]}) rotate(${ang}) scale(${iconScale})`}>
                    <path d="M-8.5,-2.8 L5.5,-2.8 Q9.5,-2.4 10,0 Q9.5,2.4 5.5,2.8 L-8.5,2.8 Z" fill="#7f1d1d" stroke="#0f172a" strokeWidth={0.6} />
                    <rect x={-8} y={-2.2} width={2.6} height={4.4} rx={0.4} fill="#f8fafc" />
                    {crate.map((c, q) => <rect key={q} x={-4.8 + q * 3.1} y={-2} width={2.8} height={4} fill={c} stroke="#0f172a" strokeWidth={0.3} />)}
                  </g>
                </g>
              );
            });
          })}
          {/* grudges: a red pulse over any country that is angry with Nigeria, and a red line home */}
          {feuds.map((fd) => { const c = CENTRE[fd.id]; if (!c) return null; const p = lifted(c, 0); if (!p || (mode === "3d" && p[2] < 0.1)) return null; const interp = geoInterpolate(c, [7.5, 9.06]); let d = ""; for (let j = 0; j <= 24; j++) { const q = lifted(interp(j / 24) as [number, number], 0.02 * Math.sin(Math.PI * j / 24)); if (!q) { d += ""; continue; } d += `${d ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`; } const strong = fd.heat >= 50; return (
            <g key={`fd${fd.id}`}>
              {d && <path d={d} fill="none" stroke="#ef4444" strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="4 4" />}
              <circle cx={p[0]} cy={p[1]} r={(strong ? 15 : 11) * Math.min(1.5, vs.k)} fill="none" stroke="#ef4444" strokeWidth={2} className="fx-globe-pulse" />
              <text x={p[0]} y={p[1] - 14 * Math.min(1.4, vs.k)} textAnchor="middle" fontSize={13} aria-hidden>{strong ? "🔥" : "⚡"}</text>
            </g>
          ); })}
          {/* country names */}
          {labels.map((l, i) => <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize={l.size} fontWeight={l.me ? 900 : 700} fill={l.me ? "#fff7cc" : "#f1f5f9"} fillOpacity={l.me ? 1 : 0.86} stroke="#0b1f36" strokeOpacity={0.75} strokeWidth={2.4} paintOrder="stroke" letterSpacing={l.size < 9 ? 0 : 0.3}>{l.me ? "NIGERIA" : l.t}</text>)}
          {hub && <g><circle cx={hub[0]} cy={hub[1]} r={22 * Math.min(1.6, vs.k)} fill="url(#fxglow)" className="fx-globe-pulse" /><circle cx={hub[0]} cy={hub[1]} r={3.6} fill="#facc15" stroke="#0b1f36" strokeWidth={1.2} /></g>}
          {card && <circle cx={card.x} cy={card.y} r={5} fill="none" stroke="#fff" strokeWidth={2} />}
        </svg>
        {cardInfo && card && (
          <div className="fx-ccard" style={{ left: `${Math.min(64, Math.max(2, (card.x / VW) * 100))}%`, top: `${Math.min(56, Math.max(2, (card.y / VH) * 100 - 6))}%` }} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
            <div className="fx-ccard-h"><b>{cardInfo.c?.flag ?? (cardInfo.m.id === NG ? "🇳🇬" : "🏳️")} {cardInfo.m.id === NG ? "Nigeria" : cardInfo.c?.name ?? cardInfo.m.name}</b><button aria-label="Close" onClick={() => setCard(null)}>✕</button></div>
            {cardInfo.m.id === NG ? <div className="g-small">Home. Everything on this globe starts and ends here.</div> : cardInfo.c ? (
              <>
                {(() => { const [ic, word, col] = feel(cardInfo.c.rel); return <div className="fx-ccard-feel" style={{ color: col }}><span>{ic}</span> <b>{word}</b> toward Nigeria · {Math.round(cardInfo.c.rel)}/100</div>; })()}
                <div className="fx-ccard-bar"><i style={{ width: `${cardInfo.c.rel}%`, background: `rgb(${ramp(cardInfo.c.rel / 100).join(",")})` }} /></div>
                <div className="g-tiny g-muted">World rank #{cardInfo.row?.rank} · stability {Math.round(cardInfo.c.stab)}/100</div>
                <div className="g-small" style={{ marginTop: 4 }}>{cardInfo.c.blurb}</div>
                {(() => { const fd = feudOf(s, cardInfo.m.id!); const ms = measuresAgainst(s, cardInfo.m.id!); if (fd.heat < 12 && !ms.length) return null; const mo = mood(fd.heat); return (
                  <div className="fx-ccard-feud">
                    <div style={{ color: mo.col }}><b>{mo.icon} {mo.word}</b> · grudge {Math.round(fd.heat)}/100</div>
                    {fd.why.slice(-2).map((x, i) => <div key={i} className="g-tiny g-muted">• {x.text}</div>)}
                    {ms.map((x) => <div key={x.id} className="g-tiny" style={{ color: "#b91c1c" }}>{MEASURE[x.kind].icon} {MEASURE[x.kind].label} until month {x.until}</div>)}
                    <div className="g-row g-wrap" style={{ gap: 6, marginTop: 4 }}>
                      <button className="g-btn g-btn-sm" onClick={() => act((g2) => repairFeud(g2, cardInfo.m.id!, "apologise"))}>🕊️ Apologise ⚡3</button>
                      <button className="g-btn g-btn-sm" onClick={() => act((g2) => repairFeud(g2, cardInfo.m.id!, "sweeten"))}>🎁 Sweeten · ₦{repairCost(s, cardInfo.c!)}bn</button>
                    </div>
                  </div>); })()}
                {cardInfo.trade.length > 0 && <div className="g-tiny" style={{ marginTop: 4 }}>{cardInfo.trade.slice(0, 3).map((r) => `${r.icon} ${r.label}`).join(" · ")}</div>}
                {onPick && <button className="g-btn g-btn-primary g-btn-sm" style={{ marginTop: 8 }} onClick={() => { setCard(null); onPick(cardInfo.m.id!); }}>Visit · talk · trade</button>}
              </>
            ) : <div className="g-small g-muted">Not one of the twenty powers Nigeria is racing yet. Trade still flows here.</div>}
          </div>
        )}
        <div className="fx-globe-zoom">{mode === "3d" && <button onClick={() => { spin.current = !spinOn; setSpinOn(!spinOn); dirty.current = true; }} aria-label={spinOn ? "Stop the globe turning" : "Let the globe turn"} title={spinOn ? "Stop turning" : "Turn slowly"}>{spinOn ? "⏸" : "▶"}</button>}<button onClick={() => zoomBy(1.25)} aria-label="Zoom in">＋</button><button onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">－</button></div>
      </div>
      <div className="fx-globe-legend g-tiny">
        {lens === "trade" ? <><span><i style={{ background: "#f97316" }} />We buy from them</span><span><i style={{ background: "#10b981" }} />We sell to them</span><span><i style={{ background: "#facc15" }} />Nigeria</span><span>🚢 ships on sea lanes · ✈️ cargo flights</span></> : <><span><i style={{ background: "#dc2626" }} />{lens === "power" ? "Weaker" : "Hostile"}</span><span><i style={{ background: "#f59e0b" }} />{lens === "power" ? "Middle" : "Cool"}</span><span><i style={{ background: "#10b981" }} />{lens === "power" ? "Stronger" : "Friendly"}</span></>}
        <span className="g-muted">Drag to {mode === "3d" ? "spin" : "move"} · pinch or scroll to zoom · tap any country</span>
      </div>
    </div>
  );
}
void geoDistance; // (kept for route maths above)
