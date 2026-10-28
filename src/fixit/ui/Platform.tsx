"use client";
/** Your platform: three big promises to Nigeria, with numbers and a deadline. */
import { useState } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { PLEDGE_DEADLINE, PLEDGE_META, PROMISES, setPromises } from "../engine/promises";
import { monthLabel } from "../engine/util";
import type { FixState } from "../engine/types";
import { sfx } from "./sound";

const HARD_COLOR = { Realistic: "#34d399", Ambitious: "#fbbf24", Moonshot: "#fb7185" } as const;

export function PledgePicker({ value, onChange, s }: { value: string[]; onChange: (v: string[]) => void; s?: FixState }) {
  const toggle = (id: string) => { sfx("tap"); onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= 3 ? [...value.slice(1), id] : [...value, id]); };
  const by = monthLabel(PLEDGE_DEADLINE);
  return (
    <div className="fx-pledges" role="group" aria-label="Choose three promises">
      {PROMISES.map((p) => {
        const m = PLEDGE_META[p.id] ?? { icon: "⭐", hard: "Ambitious" as const };
        const done = !!s && p.kept(s);
        return (
          <button key={p.id} className="fx-pledge" aria-pressed={value.includes(p.id)} disabled={done} onClick={() => toggle(p.id)}>
            <span className="fx-pledge-ic" aria-hidden>{m.icon}</span>
            <b>{p.label}</b>
            <span className="fx-pledge-foot"><i style={{ color: HARD_COLOR[m.hard] }}>● {m.hard}</i><i>by {by}</i></span>
            {done && <span className="fx-pledge-done">Already true</span>}
            <span className="fx-pledge-check" aria-hidden>{value.includes(p.id) ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PlatformModal() {
  const s = useS();
  const { act } = useFix();
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <Modal title={`${s.meta.president}: your platform`} wide footer={<Button variant="primary" disabled={picked.length !== 3} onClick={() => { sfx("fanfare"); act((x) => { setPromises(x, picked); return { ok: true, message: "Your promises are on record." }; }, { silent: true }); }}>Make these promises ({picked.length}/3)</Button>}>
      <div className="g-col" style={{ gap: 10 }}>
        <div className="g-small">You take over a country that carries on from where it was. Pick three promises. Voters, the opposition and Naija X will quote them back to you, and you will be judged at the end of year three.</div>
        <PledgePicker value={picked} onChange={setPicked} s={s} />
      </div>
    </Modal>
  );
}
