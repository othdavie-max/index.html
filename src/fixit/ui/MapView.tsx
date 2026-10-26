"use client";
/** The interactive Nigeria map: stress layers, event symbols (shape + letter, never colour alone) and project markers. */
import { useEffect, useMemo, useState } from "react";
import { GeoMap } from "../../game/ui/GeoMap";
import { loadGeo, type GeoData } from "../../game/ui/geoData";
import { Spinner, ErrorState } from "../../game/ui/kit";
import type { EventKind, FixState } from "../engine/types";
import { lgaLayerValue, stateLayerValue, stressColor, type Layer } from "../engine/views";

export interface Sym { shape: "triangle" | "square" | "diamond" | "circle" | "hex" | "bolt" | "pent" | "star"; letter: string; color: string; label: string }
export const EVENT_SYMBOL: Record<EventKind, Sym> = {
  protest: { shape: "triangle", letter: "P", color: "#e11d48", label: "Protest" },
  strike: { shape: "square", letter: "S", color: "#c2410c", label: "Strike" },
  insecurity: { shape: "diamond", letter: "!", color: "#7f1d1d", label: "Insecurity" },
  flood: { shape: "circle", letter: "~", color: "#1d4ed8", label: "Flooding" },
  foodcrisis: { shape: "hex", letter: "F", color: "#b45309", label: "Food crisis" },
  grid: { shape: "bolt", letter: "⚡", color: "#4338ca", label: "Power failure" },
  oilattack: { shape: "pent", letter: "O", color: "#0f766e", label: "Oil attack" },
  opportunity: { shape: "star", letter: "★", color: "#047857", label: "Opportunity" },
  scandal: { shape: "diamond", letter: "?", color: "#6b21a8", label: "Integrity issue" },
  global: { shape: "circle", letter: "G", color: "#475569", label: "Global shock" },
};
export function shapePath(shape: Sym["shape"], r: number): string {
  const pts = (n: number, rot: number, rr = r) => Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`; }).join(" ");
  switch (shape) {
    case "triangle": return `M${pts(3, -Math.PI / 2, r * 1.15).replace(/ /g, "L")}Z`;
    case "square": return `M${-r * 0.85},${-r * 0.85}H${r * 0.85}V${r * 0.85}H${-r * 0.85}Z`;
    case "diamond": return `M0,${-r * 1.2}L${r * 1.2},0L0,${r * 1.2}L${-r * 1.2},0Z`;
    case "hex": return `M${pts(6, 0).replace(/ /g, "L")}Z`;
    case "pent": return `M${pts(5, -Math.PI / 2).replace(/ /g, "L")}Z`;
    case "star": { const o: string[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.55 : r * 1.2; o.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`); } return `M${o.join("L")}Z`; }
    case "bolt": return `M${-r * 0.2},${-r * 1.2}L${-r * 0.9},${r * 0.2}H${-r * 0.1}L${-r * 0.3},${r * 1.2}L${r * 0.9},${-r * 0.3}H${r * 0.1}L${r * 0.3},${-r * 1.2}Z`;
    default: return `M${-r},0A${r},${r} 0 1,0 ${r},0A${r},${r} 0 1,0 ${-r},0Z`;
  }
}

export function SymbolIcon({ k, size = 18 }: { k: EventKind; size?: number }) {
  const sym = EVENT_SYMBOL[k];
  return <svg width={size} height={size} viewBox="-14 -14 28 28" aria-hidden><path d={shapePath(sym.shape, 11)} fill={sym.color} stroke="#fff" strokeWidth={1.5} /><text textAnchor="middle" y={4} fontSize={11} fontWeight={800} fill="#fff">{sym.letter}</text></svg>;
}
export function ProjectIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="-14 -14 28 28" aria-hidden><circle r={10} fill="#fff" stroke="#0b1f36" strokeWidth={3} /><path d="M-4,4V-4H3L4,0H0V4Z" fill="#0b1f36" /></svg>;
}

export function MapView({ s, layer, fill, selectedState, selectedLga, onSelectState, onSelectLga, height, showEvents = true, showProjects = true, labels = true }: {
  s: FixState; layer: Layer; fill?: (id: string) => string; selectedState: string | null; selectedLga: string | null; onSelectState: (id: string | null) => void; onSelectLga: (id: string | null) => void;
  height?: number | string; showEvents?: boolean; showProjects?: boolean; labels?: boolean;
}) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadGeo().then(setGeo).catch((e: Error) => setErr(e.message)); }, []);
  const centroid = useMemo(() => (geo ? Object.fromEntries(geo.states.map((x) => [x.id, x.c])) as Record<string, [number, number]> : {}), [geo]);
  const lgaC = useMemo(() => (geo ? Object.fromEntries(geo.lgas.map((x) => [x.id, x.c])) as Record<string, [number, number]> : {}), [geo]);
  if (err) return <ErrorState message={err} onRetry={() => { setErr(null); loadGeo().then(setGeo).catch((e: Error) => setErr(e.message)); }} />;
  if (!geo) return <div style={{ height: height ?? 420, display: "grid", placeItems: "center" }}><Spinner label="Loading the map…" /></div>;

  const evs = showEvents ? s.events.filter((e) => e.status === "open") : [];
  const projs = showProjects ? s.projects.filter((p) => p.status === "active" || p.status === "stalled" || (p.status === "done" && s.month - (p.done ?? 0) < 18)) : [];
  const slots: Record<string, { type: "e" | "p"; id: string }[]> = {};
  for (const e of evs) (slots[e.stateId] ??= []).push({ type: "e", id: e.id });
  for (const p of projs) (slots[p.lgaId && selectedState === p.stateId ? `lga:${p.lgaId}` : p.stateId] ??= []).push({ type: "p", id: p.id });

  return (
    <GeoMap
      geo={geo}
      selectedState={selectedState}
      selectedLga={selectedLga}
      onSelectState={onSelectState}
      onSelectLga={onSelectLga}
      fillState={fill ?? ((id) => stressColor(stateLayerValue(s, id, layer)))}
      fillLga={(id) => stressColor(lgaLayerValue(s, id, layer))}
      showLabels={labels}
      height={height}
      ariaLabel="Map of Nigeria coloured by the chosen pressure. Symbols mark protests, attacks, floods and projects. Use arrow keys to pan, plus and minus to zoom."
      overlay={({ pxPerUnit }) => (
        <g>
          {Object.entries(slots).flatMap(([key, items]) => {
            const base = key.startsWith("lga:") ? lgaC[key.slice(4)] : centroid[key];
            if (!base) return [];
            return items.map((it, i) => {
              const gap = 25 / pxPerUnit;
              const x = base[0] + (i - (items.length - 1) / 2) * gap;
              const y = base[1] - 14 / pxPerUnit;
              const k = 1 / pxPerUnit;
              if (it.type === "e") {
                const e = s.events.find((z) => z.id === it.id)!;
                const sym = EVENT_SYMBOL[e.kind];
                return (
                  <g key={`e${it.id}`} className="fx-marker" transform={`translate(${x},${y}) scale(${k})`} tabIndex={0} role="button" aria-label={`${sym.label}: ${e.title}`}
                    onClick={(ev) => { ev.stopPropagation(); onSelectState(e.stateId); }} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelectState(e.stateId); } }}>
                    <path className="fx-ring" d={shapePath(sym.shape, 12 + e.scale)} fill={sym.color} stroke="#fff" strokeWidth={2} />
                    <text textAnchor="middle" y={4.5} fontSize={12} fontWeight={800} fill="#fff" pointerEvents="none">{sym.letter}</text>
                    <title>{`${sym.label}: ${e.title}`}</title>
                  </g>
                );
              }
              const p = s.projects.find((z) => z.id === it.id)!;
              const R = 11, C = 2 * Math.PI * R;
              return (
                <g key={`p${it.id}`} className="fx-marker" transform={`translate(${x},${y}) scale(${k})`} tabIndex={0} role="button" aria-label={`Project: ${p.name}, ${Math.round(p.progress * 100)}% complete${p.status === "stalled" ? ", stalled" : ""}`}
                  onClick={(ev) => { ev.stopPropagation(); onSelectState(p.stateId); }} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelectState(p.stateId); } }}>
                  <circle className="fx-ring" r={R + 2} fill="#fff" stroke="#fff" strokeWidth={2} />
                  <circle r={R} fill="#fff" stroke="#cbd5e1" strokeWidth={4} />
                  <circle r={R} fill="none" stroke={p.status === "done" ? "#00a862" : p.status === "stalled" ? "#f59e0b" : "#0b1f36"} strokeWidth={4} strokeDasharray={`${C * p.progress} ${C}`} transform="rotate(-90)" />
                  <text textAnchor="middle" y={4} fontSize={11} fontWeight={800} fill="#0b1f36" pointerEvents="none">{p.status === "done" ? "✓" : p.status === "stalled" ? "‖" : "▲"}</text>
                  <title>{`${p.name} — ${Math.round(p.progress * 100)}%${p.status === "stalled" ? " (stalled)" : ""}`}</title>
                </g>
              );
            });
          })}
        </g>
      )}
    />
  );
}

export function MapLegend({ layerLabel }: { layerLabel: string }) {
  const kinds: EventKind[] = ["protest", "strike", "insecurity", "flood", "foodcrisis", "grid", "oilattack", "opportunity"];
  return (
    <div className="fx-legend" aria-label="Map legend">
      <span><b>{layerLabel}:</b> low <span className="fx-ramp" /> severe</span>
      {kinds.map((k) => <span key={k}><SymbolIcon k={k} size={16} /> {EVENT_SYMBOL[k].label}</span>)}
      <span><ProjectIcon size={16} /> Project (ring = progress)</span>
    </div>
  );
}
