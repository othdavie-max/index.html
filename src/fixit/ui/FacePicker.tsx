"use client";
/** Pick your face (twelve painted portraits), then your outfit or the colour of your top. */
import { useState } from "react";
import { Portrait } from "../../game/ui/kit";
import { FACES, OUTFITS, TOPS, hasOutfits } from "../../game/ui/photos";
import type { Portrait as PortraitT } from "../engine/types";

/** keeps the older numeric fields in step with the painted look, so groups still react to what you wear */
export function patchFor(p: PortraitT, patch: Partial<PortraitT>): PortraitT {
  const n = { ...p, ...patch };
  if (patch.face) { const f = FACES.find((x) => x.id === patch.face); if (f) { n.skin = f.tone; n.style = f.female ? 2 : 0; n.look = hasOutfits(f.id) ? (n.look && OUTFITS[f.id].some((o) => o.key === n.look) ? n.look : undefined) : undefined; n.glasses = 0; n.beard = 0; } }
  const set = n.face && n.look ? OUTFITS[n.face]?.find((o) => o.key === n.look) : undefined;
  if (set) { n.outfit = set.outfit; n.wear = set.wear; } else if (patch.face || patch.top) { n.outfit = 0; n.wear = 0; }
  return n;
}
export function FacePicker({ p, onChange }: { p: PortraitT; onChange: (n: PortraitT) => void }) {
  const face = p.face && FACES.some((f) => f.id === p.face) ? p.face : undefined;
  const cur = FACES.find((f) => f.id === face);
  const [fem, setFem] = useState<boolean>(cur ? cur.female : [2, 4, 6].includes(p.style % 8));
  const shown = FACES.filter((f) => f.female === fem);
  const flip = (f: boolean) => { setFem(f); if (!cur || cur.female !== f) { const first = FACES.find((x) => x.female === f && Math.abs(x.tone - (cur?.tone ?? p.skin)) <= 1) ?? FACES.find((x) => x.female === f); if (first) onChange(patchFor(p, { face: first.id })); } };
  const set = (patch: Partial<PortraitT>) => onChange(patchFor(p, patch));
  return (
    <div className="fx-facepick">
      <div className="g-row" style={{ gap: 6 }} role="group" aria-label="Gender">{([[false, "👨🏾 Male"], [true, "👩🏾 Female"]] as const).map(([f, l]) => <button key={l} className="fx-subtab" aria-pressed={fem === f} onClick={() => flip(f)}>{l}</button>)}</div>
      <div className="fx-faces" role="group" aria-label="Face">
        {shown.map((f) => <button key={f.id} className="fx-face" aria-pressed={face === f.id} title={f.name} onClick={() => set({ face: f.id })}><Portrait p={{ skin: f.tone, hair: 0, style: f.female ? 2 : 0, accent: 0, face: f.id, top: p.top ?? "t" }} size={56} name={f.name} /></button>)}
      </div>
      {face && hasOutfits(face) ? (
        <div><div className="g-tiny g-muted">Outfit</div><div className="g-row g-wrap" style={{ gap: 6 }}>{OUTFITS[face].map((o) => <button key={o.key} className="fx-subtab" aria-pressed={p.look === o.key} onClick={() => set({ look: o.key })}>{o.icon} {o.name}</button>)}</div></div>
      ) : (
        <div><div className="g-tiny g-muted">Top colour {face ? "· full outfits for this face are coming" : ""}</div><div className="g-row g-wrap" style={{ gap: 8 }}>{TOPS.map((c) => <button key={c.key} className="fx-swatch" aria-pressed={(p.top ?? "t") === c.key} aria-label={c.name} title={c.name} style={{ background: c.css }} onClick={() => set({ top: c.key, look: undefined })} />)}</div></div>
      )}
    </div>
  );
}
