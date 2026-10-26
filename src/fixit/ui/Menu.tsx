"use client";
import { useEffect, useState } from "react";
import { useFix } from "./store";
import { Badge, Button, ConfirmDialog, Modal } from "../../game/ui/kit";
import { SLOTS, type Slot } from "../persistence";
import { About } from "./Title";

export function SaveSlots({ mode, onDone }: { mode: "load" | "both"; onDone: () => void }) {
  const { saves, loadSlot, saveSlot, toast } = useFix();
  const [list, setList] = useState<Awaited<ReturnType<typeof saves.list>>>([]);
  const refresh = () => saves.list().then(setList).catch(() => undefined);
  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const label = (s: Slot) => (s === "auto" ? "Autosave" : `Slot ${s}`);
  return (
    <div className="g-col">
      {SLOTS.map((slot) => {
        const info = list.find((x) => x.slot === slot);
        const sm = info?.summary;
        return (
          <div key={slot} className="g-list-row">
            <div className="g-grow">
              <b>{label(slot)}</b>
              <div className="g-small g-muted">{sm ? `${sm.label} · Term ${sm.term} · approval ${sm.approval}% · saved ${new Date(sm.savedAt).toLocaleString()}` : "Empty"}</div>
            </div>
            {mode === "both" && slot !== "auto" && <Button size="sm" onClick={async () => { if (await saveSlot(slot)) { toast("Saved."); void refresh(); } }}>Save</Button>}
            <Button size="sm" variant={sm ? "primary" : "default"} disabled={!sm} onClick={async () => { if (await loadSlot(slot)) onDone(); }}>Load</Button>
            {sm && slot !== "auto" && <Button size="sm" variant="ghost" onClick={async () => { await saves.remove(slot); void refresh(); }}>Delete</Button>}
          </div>
        );
      })}
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  const steps = [
    ["Read the red card", "The Presidency screen shows the country's biggest problem right now, and why."],
    ["Pick an action", "Each choice shows its cost, its trade-off and how uncertain it is. Money is limited: government funds are not the same as reserves, debt or your own wealth."],
    ["End the month", "Prices, the naira, jobs and security all move. Read what changed and what your choice did."],
    ["Build for later", "Policies and Projects take months to work. The Map shows where trouble is brewing, and where your projects are."],
  ];
  return (
    <Modal title="How to play (one minute)" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <div className="g-col">
        {steps.map(([t, b], i) => <div key={t} className="fx-step"><i>{i + 1}</i><div><b>{t}</b><div className="g-small g-muted">{b}</div></div></div>)}
        <div className="g-small g-muted">You have four years (48 months). At the end, voters decide whether you get a second term, and your legacy report shows what you really changed.</div>
      </div>
    </Modal>
  );
}

export function MenuModal({ onClose }: { onClose: () => void }) {
  const { state, quit, startNew, saveSlot, toast, act } = useFix();
  const [sub, setSub] = useState<"slots" | "about" | "how" | "new" | null>(null);
  if (!state) return null;
  return (
    <>
      <Modal title="Menu" onClose={onClose}>
        <div className="g-col">
          <div className="g-small g-muted">President {state.meta.president} · seed <code>{state.meta.seed}</code> (the same seed reproduces the same world and shocks)</div>
          <div className="g-row g-wrap">
            <Button variant="primary" onClick={async () => { if (await saveSlot("auto")) toast("Saved."); }}>Save now</Button>
            <Button onClick={() => setSub("slots")}>Save slots</Button>
            <Button onClick={() => setSub("how")}>How to play</Button>
            <Button onClick={() => setSub("about")}>About &amp; data</Button>
          </div>
          <label className="g-row g-small"><input type="checkbox" checked={state.settings.autosave} onChange={(e) => act((s) => { s.settings.autosave = e.target.checked; return { ok: true, message: "Setting saved." }; }, { silent: true })} /> Autosave after each month</label>
          <label className="g-row g-small"><input type="checkbox" checked={!!state.flags.noSummary} onChange={(e) => act((s) => { s.flags.noSummary = e.target.checked; return { ok: true, message: "" }; }, { silent: true })} /> Skip the end-of-month summary window</label>
          <div className="g-row g-wrap" style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
            <Button onClick={quit}>Save &amp; quit to title</Button>
            <Button variant="danger" onClick={() => setSub("new")}>New presidency…</Button>
          </div>
        </div>
      </Modal>
      {sub === "slots" && <Modal title="Save slots" onClose={() => setSub(null)}><SaveSlots mode="both" onDone={() => { setSub(null); onClose(); }} /></Modal>}
      {sub === "how" && <HowTo onClose={() => setSub(null)} />}
      {sub === "about" && <About onClose={() => setSub(null)} />}
      {sub === "new" && <ConfirmDialog title="Start a new presidency?" body={<>The current game is autosaved first. You can <Badge>replay this same world</Badge> from the legacy report after a term.</>} confirmLabel="Start new" tone="danger" onCancel={() => setSub(null)} onConfirm={async () => { await saveSlot("auto"); setSub(null); onClose(); startNew(); }} />}
    </>
  );
}
