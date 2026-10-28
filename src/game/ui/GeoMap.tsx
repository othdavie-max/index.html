"use client";
/**
 * Interactive SVG map. Pure presentation: geometry and colours come in through props, so data and styling can change
 * without touching this component. Supports mouse (drag, wheel), touch (drag, pinch), keyboard (arrows, +/-, 0,
 * Enter on focused regions) and on-screen zoom buttons. Stroke widths are non-scaling so borders stay crisp at any zoom.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import type { GeoData } from "./geoData";
import { lgasByState } from "./geoData";
import { STATE_BY_ID } from "../data/states";
import { LGA_BY_ID } from "../engine/admin";

interface View { x: number; y: number; w: number; h: number }
export interface GeoMapProps {
  geo: GeoData;
  selectedState: string | null;
  selectedLga: string | null;
  onSelectState: (id: string | null) => void;
  onSelectLga: (id: string | null) => void;
  fillState: (id: string) => string;
  fillLga: (id: string) => string;
  /** areas outlined in emerald, e.g. birthplace and current constituency */
  highlightLgas?: string[];
  highlightStates?: string[];
  showLabels?: boolean;
  height?: number | string;
  ariaLabel?: string;
  /** extra SVG drawn on top (markers, symbols); coordinates are the same as the geometry's */
  overlay?: (ctx: { pxPerUnit: number; zoom: number }) => ReactNode;
}

const pad = (bb: [number, number, number, number], f = 0.12): View => {
  const w = bb[2] - bb[0], h = bb[3] - bb[1];
  return { x: bb[0] - w * f, y: bb[1] - h * f, w: w * (1 + 2 * f), h: h * (1 + 2 * f) };
};

export function GeoMap(p: GeoMapProps) {
  const { geo } = p;
  const full = useMemo<View>(() => ({ x: 0, y: 0, w: geo.projection.width * geo.projection.scale, h: geo.projection.height * geo.projection.scale }), [geo]);
  const byState = useMemo(() => lgasByState(geo), [geo]);
  const stateBB = useMemo(() => Object.fromEntries(geo.states.map((s) => [s.id, s.bb])) as Record<string, [number, number, number, number]>, [geo]);
  const [view, setView] = useState<View>(full);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [hover, setHover] = useState<{ id: string; kind: "s" | "l"; x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const last = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 560 }));
    ro.observe(el);
    setSize({ w: el.clientWidth || 800, h: el.clientHeight || 560 });
    return () => ro.disconnect();
  }, []);

  // fit view to the selected state / lga
  useEffect(() => {
    if (p.selectedLga) {
      const l = geo.lgas.find((x) => x.id === p.selectedLga);
      if (l) { setView(fitAspect(pad(l.bb, 0.9), size)); return; }
    }
    if (p.selectedState && stateBB[p.selectedState]) setView(fitAspect(pad(stateBB[p.selectedState], 0.1), size));
    else setView(fitAspect(full, size));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.selectedState, p.selectedLga, geo, stateBB, full]);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const nw = Math.min(full.w * 1.05, Math.max(full.w / 60, v.w * factor));
      const k = nw / v.w;
      const nh = v.h * k;
      return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, w: nw, h: nh };
    });
  }, [full]);

  const toUser = useCallback((clientX: number, clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    // preserveAspectRatio meet: compute the scale and offset
    const s = Math.min(r.width / view.w, r.height / view.h);
    const ox = (r.width - view.w * s) / 2, oy = (r.height - view.h * s) / 2;
    return { x: view.x + (clientX - r.left - ox) / s, y: view.y + (clientY - r.top - oy) / s, s };
  }, [view]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const u = toUser(e.clientX, e.clientY);
      zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, u.x, u.y);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [toUser, zoomAt]);

  const onDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    last.current = null;
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 1) {
      const dx = cur.x - prev.x, dy = cur.y - prev.y;
      if (!dragged.current && Math.hypot(dx, dy) < 5) return;
      dragged.current = true;
      pointers.current.set(e.pointerId, cur);
      const r = svg.current!.getBoundingClientRect();
      const s = Math.min(r.width / view.w, r.height / view.h);
      setView((v) => ({ ...v, x: v.x - dx / s, y: v.y - dy / s }));
    } else if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, cur);
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (last.current && last.current.dist > 0) {
        const u = toUser(cx, cy);
        zoomAt(last.current.dist / dist, u.x, u.y);
      }
      last.current = { dist, cx, cy };
      dragged.current = true;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    last.current = null;
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = view.w * 0.1;
    if (e.key === "ArrowLeft") { setView((v) => ({ ...v, x: v.x - step })); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setView((v) => ({ ...v, x: v.x + step })); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setView((v) => ({ ...v, y: v.y - step })); e.preventDefault(); }
    else if (e.key === "ArrowDown") { setView((v) => ({ ...v, y: v.y + step })); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") zoomAt(1 / 1.3, view.x + view.w / 2, view.y + view.h / 2);
    else if (e.key === "-") zoomAt(1.3, view.x + view.w / 2, view.y + view.h / 2);
    else if (e.key === "0") reset();
  };

  const reset = () => { p.onSelectLga(null); p.onSelectState(null); setView(fitAspect(full, size)); };

  const clickState = (id: string) => { if (dragged.current) return; if (p.selectedState === id && !p.selectedLga) return; p.onSelectLga(null); p.onSelectState(id); };
  const clickLga = (id: string) => { if (dragged.current) return; p.onSelectLga(id); };

  const pxPerUnit = Math.min(size.w / view.w, size.h / view.h);
  const zoom = full.w / view.w;
  const selLgas = p.selectedState ? byState[p.selectedState] ?? [] : [];
  const showStateLabels = p.showLabels !== false;
  const lgaLabelsOn = selLgas.length > 0;

  const hoverText = hover ? (hover.kind === "s" ? STATE_BY_ID[hover.id]?.name : `${LGA_BY_ID[hover.id]?.name} — ${STATE_BY_ID[LGA_BY_ID[hover.id]?.stateId]?.name}`) : null;

  return (
    <div className="g-map-wrap" ref={wrap} style={{ height: p.height ?? "min(68vh, 640px)" }} onKeyDown={onKey} tabIndex={0} role="application" aria-label={p.ariaLabel ?? "Map of Nigeria. Use arrow keys to pan, plus and minus to zoom, zero to reset."}>
      <svg ref={svg} className="g-map-svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerLeave={() => setHover(null)} onClick={(e) => { if ((e.target as Element).tagName === "svg" && !dragged.current && p.selectedState) { /* background click keeps selection */ } }}>
        <g>
          {geo.states.map((s) => {
            const dim = p.selectedState && p.selectedState !== s.id;
            const sel = p.selectedState === s.id;
            return (
              <path key={s.id} d={s.d} className="g-map-path" fill={dim ? "#dde5ee" : p.fillState(s.id)} style={sel && selLgas.length ? { fill: "#dbe5ef" } : undefined}
                tabIndex={p.selectedState ? -1 : 0} role="button" aria-label={`${STATE_BY_ID[s.id]?.name}${sel ? " (selected)" : ""}`}
                onClick={() => clickState(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickState(s.id); } }}
                onPointerMove={(e) => !pointers.current.size && setHover({ id: s.id, kind: "s", x: e.clientX, y: e.clientY })} />
            );
          })}
          {selLgas.map((l) => (
            <path key={l.id} d={l.d} className="g-map-path" fill={p.fillLga(l.id)} stroke={p.selectedLga === l.id ? "#0b1f36" : "#fff"} strokeWidth={p.selectedLga === l.id ? 3 : 1}
              tabIndex={0} role="button" aria-label={`${LGA_BY_ID[l.id]?.name} local government area${p.selectedLga === l.id ? " (selected)" : ""}`}
              onClick={() => clickLga(l.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickLga(l.id); } }}
              onPointerMove={(e) => !pointers.current.size && setHover({ id: l.id, kind: "l", x: e.clientX, y: e.clientY })} />
          ))}
          {/* state outline on top when drilled in */}
          {p.selectedState && geo.states.filter((s) => s.id === p.selectedState).map((s) => <path key={`o${s.id}`} d={s.d} fill="none" stroke="#0b1f36" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
          {/* highlights */}
          {(p.highlightStates ?? []).map((id) => { const s = geo.states.find((x) => x.id === id); return s ? <path key={`hs${id}`} d={s.d} fill="none" stroke="#00c875" strokeWidth={3} vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null; })}
          {(p.highlightLgas ?? []).map((id) => { const l = geo.lgas.find((x) => x.id === id); return l && (zoom > 1.6 || p.selectedState === l.s) ? <path key={`hl${id}`} d={l.d} fill="none" stroke="#00c875" strokeWidth={3.5} strokeDasharray="6 3" vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null; })}
          {/* labels */}
          {showStateLabels && !lgaLabelsOn && geo.states.map((s) => {
            const w = (s.bb[2] - s.bb[0]) * pxPerUnit;
            const name = STATE_BY_ID[s.id]?.name ?? s.id;
            const short = s.id === "NG-FC" ? "FCT" : name;
            if (w < short.length * 5.2 && zoom < 1.8) return null;
            return <text key={`t${s.id}`} x={s.c[0]} y={s.c[1]} textAnchor="middle" className="g-map-label" fontSize={(w < short.length * 6 ? 9 : 11) / pxPerUnit} strokeWidth={3 / pxPerUnit}>{short}</text>;
          })}
          {lgaLabelsOn && selLgas.map((l) => {
            const w = (l.bb[2] - l.bb[0]) * pxPerUnit;
            const name = LGA_BY_ID[l.id]?.name ?? "";
            if (w < name.length * 5 && p.selectedLga !== l.id) return null;
            return <text key={`tl${l.id}`} x={l.c[0]} y={l.c[1]} textAnchor="middle" className="g-map-label" fontSize={9.5 / pxPerUnit} strokeWidth={3 / pxPerUnit}>{name}</text>;
          })}
        </g>
        {p.overlay?.({ pxPerUnit, zoom })}
      </svg>
      <div className="g-map-ctl">
        <button aria-label="Zoom in" onClick={() => zoomAt(1 / 1.4, view.x + view.w / 2, view.y + view.h / 2)}><Plus size={18} /></button>
        <button aria-label="Zoom out" onClick={() => zoomAt(1.4, view.x + view.w / 2, view.y + view.h / 2)}><Minus size={18} /></button>
        <button aria-label="Reset view to all of Nigeria" onClick={reset}><Maximize2 size={17} /></button>
      </div>
      {hover && hoverText && (
        <div style={{ position: "fixed", left: hover.x + 12, top: hover.y + 12, background: "#0b1f36", color: "#fff", padding: "5px 9px", borderRadius: 8, fontSize: 12, fontWeight: 600, pointerEvents: "none", zIndex: 60 }}>{hoverText}</div>
      )}
    </div>
  );
}

function fitAspect(v: View, size: { w: number; h: number }): View {
  const ar = size.w / size.h;
  const cur = v.w / v.h;
  if (cur > ar) { const nh = v.w / ar; return { x: v.x, y: v.y - (nh - v.h) / 2, w: v.w, h: nh }; }
  const nw = v.h * ar;
  return { x: v.x - (nw - v.w) / 2, y: v.y, w: nw, h: v.h };
}
