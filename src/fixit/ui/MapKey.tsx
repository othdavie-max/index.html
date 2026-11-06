import { useState } from "react";
import { Info, X } from "lucide-react";
import { EVENT_SYMBOL, SymbolIcon } from "./MapView";
import type { EventKind } from "../engine/types";

const FACES: [string, string][] = [["😄", "Happy"], ["🙂", "Fine"], ["😐", "Worried"], ["😟", "Unhappy"], ["😠", "Angry"]];
const THINGS: [string, string][] = [["🔥", "Angry crowds"], ["🌊", "Flooding"], ["🏗️", "Finished project"], ["🏭", "Investor project"]];

/** A small "what am I looking at?" card for the map: faces, coloured shapes and symbols. */
export function MapKey() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="fx-mapkey-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Map key: what the symbols mean" title="What am I looking at?">{open ? <X size={18} /> : <Info size={18} />}</button>
      {open && (
        <div className="fx-mapkey" role="dialog" aria-label="Map key">
          <div className="fx-mapkey-h">🗺️ What you are looking at</div>
          <p className="fx-mapkey-p">Each state shows how its people feel. Tap a state for details.</p>
          <div className="fx-mapkey-row">{FACES.map(([f, l]) => <span key={l}>{f}<i>{l}</i></span>)}</div>
          <div className="fx-mapkey-h">Things happening</div>
          <div className="fx-mapkey-grid">
            {(Object.keys(EVENT_SYMBOL) as EventKind[]).map((k) => <span key={k}><SymbolIcon k={k} size={20} /><i>{EVENT_SYMBOL[k].label}</i></span>)}
            {THINGS.map(([g, l]) => <span key={l}><b aria-hidden>{g}</b><i>{l}</i></span>)}
          </div>
          <p className="fx-mapkey-p">Tap a notice on the left to deal with it.</p>
        </div>
      )}
    </>
  );
}
