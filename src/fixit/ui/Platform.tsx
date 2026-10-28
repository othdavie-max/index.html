"use client";
/** Your platform: the promises you make to Nigeria. Used when a new president takes over. */
import { useState } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { DEFAULT_PROMISES, PROMISES, setPromises } from "../engine/promises";
import { sfx } from "./sound";

export function PlatformModal() {
  const s = useS();
  const { act } = useFix();
  const [picked, setPicked] = useState<string[]>(DEFAULT_PROMISES);
  const toggle = (id: string) => { sfx("tap"); setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? [...p.slice(1), id] : [...p, id])); };
  return (
    <Modal title={`${s.meta.president}: your platform`} wide footer={<Button variant="primary" disabled={picked.length !== 3} onClick={() => { sfx("fanfare"); act((x) => { setPromises(x, picked); return { ok: true, message: "Your promises are on record." }; }, { silent: true }); }}>Make these promises ({picked.length}/3)</Button>}>
      <div className="g-col" style={{ gap: 10 }}>
        <div className="g-small">You are the new president of a country that carries on from where it was. Voters will judge you on what you promise now.</div>
        <div className="fx-promise-pick" role="group" aria-label="Promises">
          {PROMISES.map((p) => <button key={p.id} className="fx-pp" aria-pressed={picked.includes(p.id)} onClick={() => toggle(p.id)}><span className="fx-check" aria-hidden>{picked.includes(p.id) ? "✓" : ""}</span><span><b>{p.label}</b></span></button>)}
        </div>
      </div>
    </Modal>
  );
}
