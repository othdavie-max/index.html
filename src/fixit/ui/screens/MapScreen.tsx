"use client";
import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useFix, useS } from "../store";
import { Badge, Bar, Button, Card, EmptyState, Field, Modal } from "../../../game/ui/kit";
import { STATE_BY_ID, STATES, ZONES } from "../../../game/data/states";
import { LGA_BY_ID, searchPlaces } from "../../../game/engine/admin";
import { LAYERS, lgaLayerValue, stateLayerValue, stressWord, type Layer } from "../../engine/views";
import { PROJECTS, PROJECT_BY_ID } from "../../data/catalogue";
import { performRef } from "../../engine/actions";
import { monthLabel } from "../../engine/util";
import { EventCard, StartProjectModal } from "../Decisions";
import { MapLegend, MapView, SymbolIcon, EVENT_SYMBOL } from "../MapView";
import type { FixState } from "../../engine/types";

const METRICS: { id: Layer; label: string }[] = [
  { id: "food", label: "Food stress" }, { id: "security", label: "Insecurity" }, { id: "jobs", label: "Joblessness" }, { id: "power", label: "Blackouts" }, { id: "flood", label: "Flood exposure" }, { id: "unrest", label: "Unrest" },
];
const QUICK: Record<string, { id: string; label: string }> = {
  food: { id: "grainReserve", label: "Release grain reserves" }, security: { id: "securityPush", label: "Rapid security deployment" }, jobs: { id: "jobsBlitz", label: "Youth jobs blitz" },
  power: { id: "overtimeGrid", label: "Emergency grid repairs" }, unrest: { id: "dialogue", label: "National dialogue drive" }, flood: { id: "dieselRelief", label: "" },
};

function Gauge({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="g-row g-between g-small"><span>{label}</span><b>{Math.round(v)} · {stressWord(v)}</b></div>
      <Bar value={v / 100} tone={v >= 65 ? "red" : v >= 45 ? "amber" : undefined} label={`${label} ${Math.round(v)} out of 100`} />
    </div>
  );
}

function StatePanel({ s, id, lga }: { s: FixState; id: string; lga: string | null }) {
  const { act, setSelect } = useFix();
  const meta = STATE_BY_ID[id];
  const [picker, setPicker] = useState(false);
  const [defId, setDefId] = useState<string | null>(null);
  const [respond, setRespond] = useState<string | null>(null);
  const events = s.events.filter((e) => e.stateId === id && e.status === "open");
  const projects = s.projects.filter((p) => p.stateId === id && p.status !== "cancelled" && (!lga || !p.lgaId || p.lgaId === lga));
  const keys: Layer[] = ["food", "security", "jobs", "power", "flood", "unrest"];
  const vals = keys.map((k) => ({ k, v: lga ? lgaLayerValue(s, lga, k) : stateLayerValue(s, id, k) })).sort((a, b) => b.v - a.v);
  const worst = vals.filter((x) => x.k !== "flood")[0];
  const lg = lga ? LGA_BY_ID[lga] : null;
  const q = QUICK[worst.k];
  const cause: Record<string, string> = {
    food: "Food prices, poor storage and weak roads make it hard for families to eat well.", security: "Armed groups and weak policing hurt farming and daily life.", jobs: "Few jobs for young people; businesses are held back by power, roads and credit.",
    power: "Blackouts hit homes and businesses; the local grid is weak.", unrest: "Anger over prices and jobs could turn into protests.", flood: "Seasonal rivers threaten homes and farmland.",
  };
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <div>
        <div className="g-row g-between"><h3 style={{ fontSize: 19, fontWeight: 800 }}>{lg ? lg.name : meta.name}</h3><Button size="sm" variant="ghost" onClick={() => setSelect({ state: lga ? id : null, lga: null })} aria-label="Close"><X size={16} /></Button></div>
        <div className="g-small g-muted">{lg ? `${lg.name} local government, ${meta.name} state · ${Math.round(lg.areaKm2).toLocaleString()} km²` : `${meta.isFct ? "Federal Capital Territory" : "State"} · capital ${meta.capital} · ${ZONES[meta.zone]}`}</div>
        {lg && <div className="g-tiny g-muted">Local conditions are simulated around the state picture.</div>}
        {(() => { const g = s.governors.find((x) => x.zone === meta.zone); return g ? <div className="g-small" style={{ marginTop: 4 }}>Zone governor: <b>{g.name}</b> ({g.party}) · {g.relation >= 65 ? "an ally" : g.relation >= 45 ? "neutral" : g.relation >= 25 ? "cool towards you" : "hostile"} ({Math.round(g.relation)}/100)</div> : null; })()}
      </div>
      <div className="g-col" style={{ gap: 8 }}>{vals.map((x) => <Gauge key={x.k} label={METRICS.find((m) => m.id === x.k)!.label} v={x.v} />)}</div>
      <div className="g-small"><b>Biggest pressure here:</b> {METRICS.find((m) => m.id === worst.k)!.label.toLowerCase()}. <span className="g-muted">{cause[worst.k]}</span></div>
      {events.length > 0 && <div className="g-col" style={{ gap: 6 }}><div className="g-section-title">Happening now</div>{events.map((e) => <div key={e.id} className="g-row"><SymbolIcon k={e.kind} size={20} /><span className="g-small g-grow"><b>{e.title}</b></span><Button size="sm" variant="primary" onClick={() => setRespond(e.id)}>Respond</Button></div>)}</div>}
      {projects.length > 0 && <div className="g-col" style={{ gap: 6 }}><div className="g-section-title">Projects here</div>{projects.map((p) => <div key={p.id}><div className="g-row g-between g-small"><b>{p.name}</b><Badge tone={p.status === "done" ? "green" : p.status === "stalled" ? "amber" : "blue"}>{p.status === "done" ? "Done" : p.status === "stalled" ? "Stalled" : `${Math.round(p.progress * 100)}%`}</Badge></div><Bar value={p.progress} tone={p.status === "stalled" ? "amber" : undefined} label={`${p.name} progress`} /></div>)}</div>}
      <div className="g-col" style={{ gap: 6 }}>
        <div className="g-section-title">Actions</div>
        <Button variant="primary" onClick={() => setPicker(true)}>Start a project {lg ? "in this area" : "here"}</Button>
        {q && q.label && <Button onClick={() => act((x) => performRef(x, { type: "measure", id: q.id }))}>{q.label} (national)</Button>}
      </div>
      {picker && (
        <Modal title="Which project?" onClose={() => setPicker(false)}>
          <div className="g-col" style={{ gap: 4 }}>
            {PROJECTS.filter((d) => !d.sites || d.sites.includes(id)).map((d) => <button key={d.id} className="g-btn" style={{ justifyContent: "space-between" }} onClick={() => { setDefId(d.id); setPicker(false); }}><span>{d.name}</span><span className="g-tiny g-muted">{d.cat}</span></button>)}
          </div>
        </Modal>
      )}
      {defId && <StartProjectModal defId={defId} stateId={id} lgaId={lga ?? undefined} onClose={() => setDefId(null)} />}
      {respond && <Modal title="Respond" wide onClose={() => setRespond(null)}>{s.events.filter((e) => e.id === respond && e.status === "open").map((e) => <EventCard key={e.id} e={e} />)}</Modal>}
    </div>
  );
}

export function MapScreen() {
  const s = useS();
  const { select, setSelect, setTab } = useFix();
  const [layer, setLayer] = useState<Layer>("overview");
  const [showE, setShowE] = useState(true);
  const [showP, setShowP] = useState(true);
  const [q, setQ] = useState("");
  const results = useMemo(() => (q.trim().length >= 2 ? searchPlaces(q, 8) : []), [q]);
  const L = LAYERS.find((x) => x.id === layer)!;
  const ranked = useMemo(() => STATES.map((x) => ({ id: x.id, v: stateLayerValue(s, x.id, layer) })).sort((a, b) => b.v - a.v).slice(0, 6), [s, layer, s.month]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = s.events.filter((e) => e.status === "open");
  const pick = (r: { kind: string; id: string }) => { if (r.kind === "state") setSelect({ state: r.id, lga: null }); else { setSelect({ state: LGA_BY_ID[r.id].stateId, lga: r.id }); } setQ(""); };
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Nigeria Map</div><div className="g-small g-muted">{monthLabel(s.month)} · 36 states, the FCT and 774 local governments</div></div>
      <div className="g-row g-wrap" style={{ gap: 8 }}>
        <div className="g-row g-wrap g-chip-row" style={{ gap: 6 }} role="group" aria-label="What to show on the map">
          {LAYERS.map((l) => <button key={l.id} className="g-chip" aria-pressed={layer === l.id} onClick={() => setLayer(l.id)} title={l.blurb}>{l.label}</button>)}
        </div>
        <label className="g-row g-small"><input type="checkbox" checked={showE} onChange={(e) => setShowE(e.target.checked)} /> Events</label>
        <label className="g-row g-small"><input type="checkbox" checked={showP} onChange={(e) => setShowP(e.target.checked)} /> Projects</label>
      </div>
      <div style={{ position: "relative", maxWidth: 420 }}>
        <Field label="Find a state or local government">{(id) => <div style={{ position: "relative" }}><Search size={16} style={{ position: "absolute", left: 12, top: 14, color: "#64748b" }} /><input id={id} className="g-input" style={{ paddingLeft: 36 }} placeholder="e.g. Kano, Ikeja, Maiduguri…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}</Field>
        {results.length > 0 && <div className="g-card" style={{ position: "absolute", zIndex: 40, left: 0, right: 0, top: 70, padding: 4 }}>{results.map((r) => <button key={r.kind + r.id} className="g-btn g-btn-ghost g-btn-block" style={{ justifyContent: "space-between" }} onClick={() => pick(r)}><span>{r.label}</span><span className="g-tiny g-muted">{r.kind === "lga" ? "Local govt · " + (r.parent ?? "") : "State"}</span></button>)}</div>}
      </div>
      <div className="fx-map-layout">
        <div className="g-col" style={{ gap: 8 }}>
          <MapView s={s} layer={layer} selectedState={select.state} selectedLga={select.lga} onSelectState={(id) => setSelect({ state: id, lga: null })} onSelectLga={(id) => setSelect({ state: select.state, lga: id })} showEvents={showE} showProjects={showP} height="min(70vh, 660px)" />
          <MapLegend layerLabel={L.label} />
          <div className="g-tiny g-muted">{L.blurb}. Colours are always paired with a number and a word in the panel. Conditions are simulated.</div>
        </div>
        <div className="fx-side">
          <Card>
            {select.state ? <StatePanel s={s} id={select.state} lga={select.lga} /> : (
              <div className="g-col" style={{ gap: 12 }}>
                <div><b>Pick a state</b><div className="g-small g-muted">Click a state on the map (or search) to see its conditions, projects and what you can do there. Click again inside to inspect local governments.</div></div>
                <div className="g-section-title">Most stressed: {L.label.toLowerCase()}</div>
                {ranked.map((r) => <button key={r.id} className="g-list-row" style={{ background: "none", border: 0, textAlign: "left", width: "100%" }} onClick={() => setSelect({ state: r.id, lga: null })}><MapPin size={15} className="g-muted" /><span className="g-grow g-small"><b>{STATE_BY_ID[r.id].name}</b></span><Badge tone={r.v >= 65 ? "red" : r.v >= 45 ? "amber" : undefined}>{Math.round(r.v)} · {stressWord(r.v)}</Badge></button>)}
                <div className="g-section-title">Open situations ({open.length})</div>
                {open.length === 0 ? <EmptyState title="All quiet" /> : open.map((e) => <button key={e.id} className="g-list-row" style={{ background: "none", border: 0, textAlign: "left", width: "100%" }} onClick={() => setSelect({ state: e.stateId, lga: null })}><SymbolIcon k={e.kind} size={20} /><span className="g-grow g-small"><b>{e.title}</b><div className="g-tiny g-muted">{EVENT_SYMBOL[e.kind].label}, scale {e.scale}/5</div></span></button>)}
                <Button size="sm" onClick={() => setTab("projects")}>Manage projects</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
void PROJECT_BY_ID;
