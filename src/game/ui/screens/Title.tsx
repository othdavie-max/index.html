"use client";
import { useEffect, useState } from "react";
import { Play, FolderOpen, Info, Plus, WifiOff, Trash2 } from "lucide-react";
import { useGame } from "../store";
import { Button, ConfirmDialog, Modal, Callout } from "../kit";
import { loadGeo, type GeoData } from "../geoData";
import type { SlotId } from "../../persistence/saveSystem";

export function SlotsModal({ mode, onClose }: { mode: "load" | "save" | "both"; onClose: () => void }) {
  const { slots, loadSlot, saveSlot, deleteSlot, refreshSlots, toast, state } = useGame();
  const [confirm, setConfirm] = useState<{ slot: SlotId; kind: "delete" | "overwrite" } | null>(null);
  useEffect(() => { void refreshSlots(); }, [refreshSlots]);
  const label = (s: SlotId) => (s === "auto" ? "Autosave" : `Slot ${s}`);
  return (
    <Modal title={mode === "load" ? "Load game" : mode === "save" ? "Save game" : "Saved games"} onClose={onClose}>
      <div className="g-col">
        {slots.map((s) => (
          <div key={s.slot} className="g-card-flat g-row g-wrap g-between">
            <div className="g-grow">
              <div style={{ fontWeight: 700 }}>{label(s.slot)}</div>
              {s.empty ? <div className="g-small g-muted">Empty</div> : s.problem ? <div className="g-small" style={{ color: "#be123c" }}>{s.problem}</div> : (
                <div className="g-small g-muted">{s.summary?.name}, age {s.summary?.age} · {s.summary?.dateLabel} · {s.summary?.office}
                  <br />Saved {s.savedAt ? new Date(s.savedAt).toLocaleString() : ""}</div>
              )}
            </div>
            <div className="g-row g-wrap">
              {!s.empty && mode !== "save" && <Button size="sm" variant="primary" onClick={async () => { if (await loadSlot(s.slot)) onClose(); }}>Load</Button>}
              {mode !== "load" && state && s.slot !== "auto" && <Button size="sm" onClick={async () => { if (!s.empty) setConfirm({ slot: s.slot, kind: "overwrite" }); else { if (await saveSlot(s.slot)) toast("Game saved."); } }}>Save here</Button>}
              {!s.empty && <Button size="sm" variant="ghost" aria-label={`Delete ${label(s.slot)}`} onClick={() => setConfirm({ slot: s.slot, kind: "delete" })}><Trash2 size={16} /></Button>}
            </div>
          </div>
        ))}
        <div className="g-help"><WifiOff size={12} style={{ verticalAlign: -1 }} /> Saves live in this browser on your device. Nothing is uploaded.</div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "delete" ? "Delete this save?" : "Overwrite this save?"}
          body={confirm.kind === "delete" ? "This permanently removes the save from this device. It cannot be undone." : "The existing save in this slot will be replaced."}
          confirmLabel={confirm.kind === "delete" ? "Delete" : "Overwrite"} tone={confirm.kind === "delete" ? "danger" : "primary"}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { const c = confirm; setConfirm(null); if (c.kind === "delete") { await deleteSlot(c.slot); toast("Save deleted."); } else if (await saveSlot(c.slot)) toast("Game saved."); }}
        />
      )}
    </Modal>
  );
}

export function AboutModal({ onClose }: { onClose: () => void }) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  useEffect(() => { void loadGeo().then(setGeo).catch(() => undefined); }, []);
  const a = geo?.attribution;
  return (
    <Modal title="About this game" onClose={onClose} wide>
      <p className="g-small">Nigeria: The Road to Presidency is a single-player political life simulation. Everything runs on your device and works offline once loaded.</p>
      <Callout tone="warn"><b>Fiction and simulation.</b> All political parties, politicians and events are fictional or fictionalised. Starting values for the economy, indicators and populations are simulated game values, not official statistics. Events marked “inspired by” are modelled on documented real-world patterns but are not historical records.</Callout>
      <div className="g-section-title">Map data and licence</div>
      {a ? (
        <div className="g-small g-col" style={{ gap: 6 }}>
          <div><b>{a.title}</b></div>
          <div>Underlying source: {a.underlyingSource}</div>
          <div>Licence: <a href={a.licenceUrl} target="_blank" rel="noreferrer" style={{ color: "#0b6bcb" }}>{a.licence}</a>. Attribution is required and retained here.</div>
          <div>Upstream: {a.upstream}</div>
          <div>{a.citation}</div>
          <div className="g-muted">{a.processing}</div>
          <div className="g-muted">{a.verification}</div>
        </div>
      ) : <div className="g-small g-muted">Loading attribution…</div>}
    </Modal>
  );
}

export function Title() {
  const { setScreen, slots, loadSlot, busy } = useGame();
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [modal, setModal] = useState<"load" | "about" | null>(null);
  useEffect(() => { void loadGeo().then(setGeo).catch(() => undefined); }, []);
  const hasAuto = slots.find((s) => s.slot === "auto" && !s.empty && !s.problem);
  const any = slots.some((s) => !s.empty);
  return (
    <div className="g-title">
      {geo && (
        <svg className="g-title-map" viewBox={`0 0 ${geo.projection.width * geo.projection.scale} ${geo.projection.height * geo.projection.scale}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          {geo.states.map((s) => <path key={s.id} d={s.d} fill="rgba(0,200,117,.10)" stroke="rgba(0,200,117,.5)" strokeWidth={14} />)}
        </svg>
      )}
      <div className="g-title-inner">
        <div style={{ display: "flex", justifyContent: "center" }}><span className="g-flag" aria-hidden><i /><i /><i /></span></div>
        <h1>NIGERIA<small>ROAD TO PRESIDENCY</small></h1>
        <p style={{ color: "#b7c7d9" }}>Your choices. Your journey. A simulated Nigeria — 36 states, the FCT and 774 local governments.</p>
        <div className="g-col" style={{ marginTop: 6 }}>
          {hasAuto && <Button variant="primary" block disabled={busy} onClick={() => void loadSlot("auto")}><Play size={18} /> Continue — {hasAuto.summary?.name}, {hasAuto.summary?.dateLabel}</Button>}
          <Button variant={hasAuto ? "light" : "primary"} block onClick={() => setScreen("create")}><Plus size={18} /> New game</Button>
          <div className="g-row">
            <Button variant="light" className="g-grow" disabled={!any} onClick={() => setModal("load")}><FolderOpen size={17} /> Load</Button>
            <Button variant="light" className="g-grow" onClick={() => setModal("about")}><Info size={17} /> About</Button>
          </div>
        </div>
        <div className="g-tiny" style={{ color: "#8da3bb", display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}><WifiOff size={13} /> Plays offline · no account · saves stay on your device</div>
      </div>
      {modal === "load" && <SlotsModal mode="load" onClose={() => setModal(null)} />}
      {modal === "about" && <AboutModal onClose={() => setModal(null)} />}
    </div>
  );
}
