"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, MapPin, Home as HomeIcon, X, Landmark } from "lucide-react";
import { useGame, useS } from "../store";
import { Badge, Button, Card, EmptyState, ErrorState, Meter, Spinner, ResultsBar, ConfirmDialog, naira } from "../kit";
import { GeoMap } from "../GeoMap";
import { loadGeo, type GeoData } from "../geoData";
import { STATES, STATE_BY_ID, ZONES, POP_GROWTH_FACTOR } from "../../data/states";
import { LGA_BY_ID, LGAS_BY_STATE, searchPlaces, stateName } from "../../engine/admin";
import { INDICATORS, INDICATOR_LABEL, type GameState, type Indicator } from "../../engine/types";
import { partyAbbr, partyColor, partyDefOf, holderOf } from "../../engine/queries";
import { ISSUES, ISSUE_LABEL } from "../../data/parties";
import { formatMonth } from "../../engine/calendar";
import { availableRaces } from "../../engine/campaign";
import { stateAffinity } from "../../engine/world";

type Layer = "party" | "lean" | "result" | "satisfaction" | "population" | Indicator;
const LAYERS: { id: Layer; label: string }[] = [
  { id: "party", label: "Party in power" }, { id: "lean", label: "Voter lean" }, { id: "result", label: "Last presidential result" },
  { id: "economy", label: "Economy" }, { id: "infrastructure", label: "Infrastructure" }, { id: "security", label: "Security" }, { id: "health", label: "Health" },
  { id: "education", label: "Education" }, { id: "power", label: "Electricity" }, { id: "satisfaction", label: "Public satisfaction" }, { id: "population", label: "Population (sim.)" },
];
const RAMP = ["#d73027", "#fc8d59", "#fee08b", "#91cf60", "#1a9850"];
const BLUES = ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"];
const bin = (v: number, ramp: string[], lo = 0, hi = 100) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(((v - lo) / (hi - lo)) * ramp.length)))];

function useGeo() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => { setErr(null); loadGeo().then(setGeo).catch((e: Error) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  return { geo, err, retry: load };
}

function colorers(state: GameState, layer: Layer) {
  const pops = Object.values(state.states).map((s) => s.pop);
  const maxPop = Math.max(...pops);
  const lgaPops = Object.values(state.lgas).map((l) => l.pop);
  const maxLga = Math.max(...lgaPops);
  const govParty = (sid: string) => state.seats[`gov:${sid}`]?.partyId ?? state.seats["pres"].partyId; // FCT is administered by the federal government
  const leanOf = (aff: Record<string, number>) => Object.entries(aff).sort((a, b) => b[1] - a[1])[0][0];
  const fillState = (id: string): string => {
    const st = state.states[id];
    switch (layer) {
      case "party": return partyColor(state, govParty(id));
      case "lean": return partyColor(state, leanOf(stateAffinity(state, id)));
      case "result": return state.lastPresidential ? partyColor(state, state.lastPresidential.byState[id] ?? null) : "#cbd5e1";
      case "satisfaction": return bin(st.satisfaction, RAMP);
      case "population": return bin(st.pop, BLUES, 0, maxPop);
      default: return bin(st.indicators[layer], RAMP);
    }
  };
  const fillLga = (id: string): string => {
    const l = state.lgas[id];
    switch (layer) {
      case "party": return partyColor(state, state.seats[l.chairSeatId]?.partyId ?? null);
      case "lean": return partyColor(state, leanOf(l.affinity));
      case "result": return state.lastPresidential ? partyColor(state, state.lastPresidential.byLga[id] ?? null) : "#cbd5e1";
      case "satisfaction": return bin(20 + 0.6 * (INDICATORS.reduce((t, k) => t + l.indicators[k], 0) / INDICATORS.length), RAMP);
      case "population": return bin(l.pop, BLUES, 0, maxLga * 0.6);
      default: return bin(l.indicators[layer], RAMP);
    }
  };
  return { fillState, fillLga };
}

function Legend({ state, layer }: { state: GameState; layer: Layer }) {
  if (layer === "party" || layer === "lean" || layer === "result") {
    const ids = Object.values(state.parties).filter((p) => p.exists).map((p) => p.id);
    return <div className="g-legend">{ids.map((id) => <span key={id}><i style={{ background: partyColor(state, id) }} />{partyAbbr(state, id)}</span>)}{layer === "result" && !state.lastPresidential && <span className="g-muted">No presidential election held yet — the first is scheduled for {formatMonth(state, state.seats.pres.nextElection)}.</span>}</div>;
  }
  const ramp = layer === "population" ? BLUES : RAMP;
  return <div className="g-legend">{ramp.map((c, i) => <span key={c}><i style={{ background: c }} />{layer === "population" ? ["lowest", "", "", "", "highest"][i] : ["very poor", "poor", "fair", "good", "very good"][i]}</span>)}</div>;
}

export function MapScreen() {
  const state = useS();
  const { dispatch, go } = useGame();
  const { geo, err, retry } = useGeo();
  const [layer, setLayer] = useState<Layer>("party");
  const [selState, setSelState] = useState<string | null>(null);
  const [selLga, setSelLga] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const p = state.player;
  const { fillState, fillLga } = useMemo(() => colorers(state, layer), [state, layer, state.clock.monthIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => searchPlaces(q).map((r) => ({ kind: r.kind === "state" ? ("s" as const) : ("l" as const), id: r.id, label: r.label, sub: r.parent ?? "State" })), [q]);

  const highlightLgas = useMemo(() => {
    const out = new Set<string>([p.birthLgaId, p.residenceLgaId]);
    const seat = p.politics.seatId ? state.seats[p.politics.seatId] : null;
    seat?.lgaIds.forEach((l) => out.add(l));
    return [...out];
  }, [p.birthLgaId, p.residenceLgaId, p.politics.seatId, state.seats]);

  const pickState = (id: string | null) => { setSelState(id); if (!id) setSelLga(null); };
  const pickLga = (id: string | null) => { setSelLga(id); if (id) setSelState(LGA_BY_ID[id].stateId); };

  return (
    <div className="g-col" style={{ gap: 14 }}>
      <div className="g-row g-between g-wrap"><div className="g-page-title">Nigeria Map</div>
        <div className="g-row g-wrap g-chip-row" style={{ gap: 6 }} role="group" aria-label="Map layer">
          {LAYERS.map((l) => <button key={l.id} className="g-chip" aria-pressed={layer === l.id} onClick={() => setLayer(l.id)}>{l.label}</button>)}
        </div>
      </div>
      <div className="g-grid g-split-side">
        <div className="g-col">
          <div style={{ position: "relative" }}>
            <div className="g-row" style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, color: "#64748b" }} />
              <input className="g-input" style={{ paddingLeft: 36 }} placeholder="Search any state or local government…" aria-label="Search states and LGAs" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && <button className="g-btn g-btn-ghost g-btn-sm" style={{ position: "absolute", right: 4 }} aria-label="Clear search" onClick={() => setQ("")}><X size={16} /></button>}
            </div>
            {results.length > 0 && (
              <div className="g-card" style={{ position: "absolute", zIndex: 10, left: 0, right: 0, top: 48, padding: 6, maxHeight: 320, overflow: "auto" }} role="listbox" aria-label="Search results">
                {results.map((r) => (
                  <button key={`${r.kind}${r.id}`} role="option" aria-selected="false" className="g-btn g-btn-ghost g-btn-block" style={{ justifyContent: "space-between" }} onClick={() => { if (r.kind === "s") { pickState(r.id); setSelLga(null); } else pickLga(r.id); setQ(""); }}>
                    <span>{r.label}</span><span className="g-tiny g-muted">{r.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {err ? <ErrorState message={err} onRetry={retry} /> : !geo ? <div className="g-skeleton" style={{ height: 460 }}><Spinner label="Loading the map…" /></div> : (
            <GeoMap geo={geo} selectedState={selState} selectedLga={selLga} onSelectState={pickState} onSelectLga={pickLga} fillState={fillState} fillLga={fillLga} highlightLgas={highlightLgas} />
          )}
          <Legend state={state} layer={layer} />
          <div className="g-tiny g-muted">Green dashed outline: your home and constituency. Boundaries are real (GRID3 via geoBoundaries, CC BY 4.0, simplified for display); populations, indicators and party strengths are <b>simulated game values</b>.</div>
        </div>
        <div className="g-col">
          {selLga ? <LgaPanel id={selLga} onBack={() => setSelLga(null)} onMove={() => setMoveTo(selLga)} /> : selState ? <StatePanel id={selState} onClose={() => pickState(null)} onLga={pickLga} /> : <NationalPanel onState={pickState} />}
        </div>
      </div>
      {moveTo && <ConfirmDialog title={`Move to ${LGA_BY_ID[moveTo].name}?`} confirmLabel="Move" onCancel={() => setMoveTo(null)} onConfirm={() => { const l = moveTo; setMoveTo(null); dispatch({ t: "relocate", lgaId: l }); }} body="Moving costs money and resets your local name recognition. It also changes which local elections you can contest." />}
      {go === undefined && null}
    </div>
  );
}

function NationalPanel({ onState }: { onState: (id: string) => void }) {
  const state = useS();
  const e = state.economy;
  const byZone = Object.entries(ZONES).map(([z, name]) => ({ z, name, n: STATES.filter((s) => s.zone === z).length }));
  const pres = state.seats["pres"];
  const hold = holderOf(state, "pres");
  return (
    <Card title="Federal Republic of Nigeria" icon={<Landmark size={16} />}>
      <div className="g-small g-col" style={{ gap: 6 }}>
        <div>36 states, the Federal Capital Territory, and 774 local government areas.</div>
        <div><b>President:</b> {pres.holderId === "player" ? "You" : hold?.name ?? "—"} <Badge tone="navy">{partyAbbr(state, pres.partyId)}</Badge></div>
        <div><b>Next presidential election:</b> {formatMonth(state, pres.nextElection)}</div>
        <Meter label="National public satisfaction (sim.)" value={e.satisfaction} tone="auto" />
      </div>
      <div className="g-section-title" style={{ margin: "14px 0 6px" }}>Pick a state</div>
      <div className="g-row g-wrap" style={{ gap: 6 }}>{STATES.map((s) => <button key={s.id} className="g-chip" onClick={() => onState(s.id)} style={{ fontSize: 12, padding: "4px 9px" }}>{s.isFct ? "FCT" : s.name}</button>)}</div>
      <p className="g-help" style={{ marginTop: 10 }}>Click the map or use this list. Zones: {byZone.map((z) => `${z.name} (${z.n})`).join(", ")}.</p>
    </Card>
  );
}

function StatePanel({ id, onClose, onLga }: { id: string; onClose: () => void; onLga: (id: string) => void }) {
  const state = useS();
  const meta = STATE_BY_ID[id];
  const st = state.states[id];
  const gov = st.governorSeatId ? state.seats[st.governorSeatId] : null;
  const gh = gov ? (gov.holderId === "player" ? null : state.chars[gov.holderId ?? ""]) : null;
  const [lq, setLq] = useState("");
  const lgas = LGAS_BY_STATE[id].filter((l) => l.name.toLowerCase().includes(lq.toLowerCase()));
  const chairParties: Record<string, number> = {};
  for (const l of LGAS_BY_STATE[id]) { const pid = state.seats[`lgc:${l.id}`]?.partyId; if (pid) chairParties[pid] = (chairParties[pid] ?? 0) + 1; }
  const hist = state.electionLog.filter((x) => x.stateId === id && x.office === "governor").slice(-3).reverse();
  const news = state.news.filter((n) => n.stateId === id).slice(-4).reverse();
  const races = availableRaces(state, { stateId: id }).filter((r) => r.seat.office === "governor" || r.seat.office === "senate").slice(0, 4);
  const pres = state.lastPresidential;
  return (
    <Card title={meta.name} icon={<MapPin size={16} />} action={<Button size="sm" variant="ghost" onClick={onClose} aria-label="Clear selection"><X size={16} /></Button>}>
      <div className="g-col" style={{ gap: 12 }}>
        <div className="g-small g-col" style={{ gap: 4 }}>
          <div><b>Capital:</b> {meta.capital} · <b>Zone:</b> {ZONES[meta.zone]}</div>
          <div><b>{meta.isFct ? "Administered by" : "Governor"}:</b> {meta.isFct ? "the Federal Government (Minister of the FCT); six Area Councils" : gov?.holderId === "player" ? "You" : gh?.name ?? "—"} {gov && <Badge tone="navy">{partyAbbr(state, gov.partyId)}</Badge>}</div>
          <div><b>Population (simulated):</b> ≈ {(st.pop / 1e6).toFixed(1)}m — from the 2006 census figure of ≈{meta.pop2006m}m (rounded) × {POP_GROWTH_FACTOR} growth factor. Registered voters ≈ {(st.registered / 1e6).toFixed(1)}m (assumption).</div>
          <div><b>LGAs:</b> {st.lgaIds.length}</div>
        </div>
        <div className="g-section-title">Local government control</div>
        <ResultsBar items={Object.entries(chairParties).map(([p, v]) => ({ label: partyAbbr(state, p), value: v, color: partyColor(state, p) }))} />
        <div className="g-legend">{Object.entries(chairParties).sort((a, b) => b[1] - a[1]).map(([p, v]) => <span key={p}><i style={{ background: partyColor(state, p) }} />{partyAbbr(state, p)} {v}</span>)}</div>
        <div className="g-section-title">Indicators (simulated)</div>
        {INDICATORS.map((k) => <Meter key={k} label={INDICATOR_LABEL[k]} value={st.indicators[k]} tone="auto" />)}
        <Meter label="Public satisfaction with state government" value={st.satisfaction} tone="auto" />
        {pres && <div className="g-small"><b>Last presidential result here:</b> {partyAbbr(state, pres.byState[id])} won · turnout {((pres.turnout[id] ?? 0) * 100).toFixed(0)}%</div>}
        {hist.length > 0 && <div className="g-small"><b>Governorship history:</b> {hist.map((h) => `${formatMonth(state, h.month)}: ${h.winnerName} (${partyAbbr(state, h.winnerPartyId)})`).join("; ")}</div>}
        {races.length > 0 && <div className="g-small"><b>Opportunities:</b>{races.map((r) => <div key={r.seat.id} className="g-row" style={{ marginTop: 4 }}><Badge tone={r.open ? "green" : undefined}>{formatMonth(state, r.electionMonth)}</Badge><span>{r.seat.label}{r.eligibility.eligible ? "" : " — not yet eligible"}</span></div>)}</div>}
        {news.length > 0 && <div><div className="g-section-title">Local news</div>{news.map((n) => <div key={n.id} className="g-list-row g-small">{n.headline}</div>)}</div>}
        <div className="g-section-title">Local governments</div>
        <input className="g-input" placeholder="Filter LGAs…" aria-label="Filter LGAs" value={lq} onChange={(e) => setLq(e.target.value)} />
        <div style={{ maxHeight: 220, overflow: "auto" }}>
          {lgas.map((l) => <button key={l.id} className="g-btn g-btn-ghost g-btn-block g-btn-sm" style={{ justifyContent: "space-between" }} onClick={() => onLga(l.id)}><span>{l.name}</span><span className="g-tiny g-muted">{partyAbbr(state, state.seats[`lgc:${l.id}`]?.partyId ?? null)}</span></button>)}
          {lgas.length === 0 && <EmptyState title="No match" />}
        </div>
      </div>
    </Card>
  );
}

function LgaPanel({ id, onBack, onMove }: { id: string; onBack: () => void; onMove: () => void }) {
  const state = useS();
  const { go } = useGame();
  const l = state.lgas[id];
  const meta = LGA_BY_ID[id];
  const sid = meta.stateId;
  const chairSeat = state.seats[l.chairSeatId];
  const chair = chairSeat.holderId === "player" ? null : holderOf(state, chairSeat.id);
  const st = state.states[sid];
  const rep = st.repsSeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(id));
  const sha = st.assemblySeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(id));
  const sen = st.senateSeatIds.map((s) => state.seats[s]).find((s) => s.lgaIds.includes(id));
  const name = (seatId?: string) => { const s = seatId ? state.seats[seatId] : null; if (!s) return "—"; const h = s.holderId === "player" ? "You" : holderOf(state, s.id)?.name ?? "—"; return `${h} (${partyAbbr(state, s.partyId)})`; };
  const aff = Object.entries(l.affinity).sort((a, b) => b[1] - a[1]);
  const top = ISSUES.map((i) => [i, l.salience[i]] as const).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const isHome = state.player.residenceLgaId === id;
  return (
    <Card title={meta.name} icon={<MapPin size={16} />} action={<Button size="sm" variant="ghost" onClick={onBack}>Back to {stateName(sid)}</Button>}>
      <div className="g-col" style={{ gap: 12 }}>
        <div className="g-small g-col" style={{ gap: 4 }}>
          <div><b>{stateName(sid)}</b> · {sid === "NG-FC" ? "Area Council" : "Local Government Area"} · {meta.areaKm2.toLocaleString()} km²</div>
          <div><b>Population (simulated):</b> ≈ {Math.round(l.pop / 1000).toLocaleString()}k · registered ≈ {Math.round(l.registered / 1000).toLocaleString()}k · ≈ {l.wards} wards (assumption)</div>
          <div><b>{sid === "NG-FC" ? "Council Chairman" : "LGA Chairman"}:</b> {chairSeat.holderId === "player" ? "You" : chair?.name ?? "—"} <Badge tone="navy">{partyAbbr(state, chairSeat.partyId)}</Badge></div>
          <div><b>Federal constituency:</b> {rep?.label ?? "—"} — {name(rep?.id)}</div>
          {sha && <div><b>State constituency:</b> {sha.label} — {name(sha.id)}</div>}
          <div><b>Senatorial district:</b> {sen?.label ?? "—"} — {name(sen?.id)}</div>
          <div className="g-tiny g-muted">Constituency boundaries are a simulated delimitation, not INEC's.</div>
          <div><b>Next LGA election:</b> {formatMonth(state, chairSeat.nextElection)}</div>
        </div>
        <div className="g-section-title">Voter lean (simulated)</div>
        <ResultsBar items={aff.map(([p, v]) => ({ label: partyAbbr(state, p), value: v, color: partyColor(state, p) }))} />
        <div className="g-legend">{aff.slice(0, 5).map(([p, v]) => <span key={p}><i style={{ background: partyColor(state, p) }} />{partyAbbr(state, p)} {(v * 100).toFixed(0)}%</span>)}</div>
        <div className="g-small"><b>Top local concerns:</b> {top.map(([i]) => ISSUE_LABEL[i]).join(", ")}</div>
        <div className="g-section-title">Local indicators</div>
        {INDICATORS.map((k) => <Meter key={k} label={INDICATOR_LABEL[k]} value={l.indicators[k]} tone="auto" />)}
        <div className="g-row g-wrap">
          {isHome ? <Badge tone="green"><HomeIcon size={12} /> Your home</Badge> : <Button size="sm" onClick={onMove}><HomeIcon size={14} /> Move here</Button>}
          <Button size="sm" onClick={() => go("elections", "constituency")}>My constituency</Button>
        </div>
      </div>
    </Card>
  );
}
void naira; void partyDefOf;
