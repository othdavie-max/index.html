"use client";
/** Your platform: three big promises to Nigeria, with numbers and a deadline. */
import { useState } from "react";
import { Button, Modal } from "../../game/ui/kit";
import { useFix, useS } from "./store";
import { PLEDGE_DEADLINE, PLEDGE_META, PROMISES, setPromises } from "../engine/promises";
import { monthLabel } from "../engine/util";
import type { FixState } from "../engine/types";
import { sfx } from "./sound";
import { newGame } from "../engine/init";

const HARD_COLOR = { Realistic: "#34d399", Ambitious: "#fbbf24", Moonshot: "#fb7185" } as const;

const GROUPS: { name: string; icon: string; ids: string[] }[] = [
  { name: "Money and prices", icon: "💰", ids: ["inflation", "naira", "fuel", "subsidy", "debt", "exports"] },
  { name: "Daily life", icon: "🏠", ids: ["food", "jobs", "power", "schools"] },
  { name: "Safety and honesty", icon: "🛡️", ids: ["security", "clean", "build"] },
];
const SLOGAN: Record<string, string> = { inflation: "Stable Prices", naira: "A Strong Naira", power: "Light for All", jobs: "Jobs for Our Youth", food: "Food on Every Table", security: "Safe Roads, Safe Farms", build: "Build Nigeria", clean: "Clean Hands", subsidy: "Brave Reform", debt: "No More Debt Trap", fuel: "Cheaper Petrol", exports: "Made in Nigeria", schools: "Schools and Clinics" };
const STAKE: Record<string, string> = { Realistic: "Voters expect it. Deliver it and nobody claps; miss it and everybody notices.", Ambitious: "A real stretch. Keep it and it wins votes on election day.", Moonshot: "Few believe you can. Deliver and you become a legend; miss and you become a meme." };
const WEIGHT = { Realistic: 1, Ambitious: 2, Moonshot: 3 } as const;
let previewState: FixState | null = null;
/** a sample Nigeria, so the cards can say where things stand today before the game begins */
const preview = (): FixState => (previewState ??= newGame(20270529));

export function PledgePicker({ value, onChange, s }: { value: string[]; onChange: (v: string[]) => void; s?: FixState }) {
  const toggle = (id: string) => { sfx("tap"); onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length >= 3 ? [...value.slice(1), id] : [...value, id]); };
  const by = monthLabel(PLEDGE_DEADLINE);
  const now = s ?? preview();
  const bold = value.reduce((a, id) => a + WEIGHT[(PLEDGE_META[id]?.hard ?? "Ambitious")], 0);
  const mood = value.length < 3 ? null : bold <= 4 ? { label: "Safe", text: "Voters shrug. Nobody will call you a liar, and nobody will dance either.", c: "#34d399" } : bold <= 6 ? { label: "Bold", text: "The crowds are excited. This is a platform people will remember.", c: "#fbbf24" } : { label: "Reckless", text: "You will be a legend or a joke. Naija X is already making the memes.", c: "#fb7185" };
  const slogan = value.map((id) => SLOGAN[id]).filter(Boolean);
  return (
    <div className="g-col" style={{ gap: 12 }}>
      <div className="fx-mandate">
        <div className="fx-mandate-slots">{[0, 1, 2].map((i) => { const id = value[i]; const p = id ? PROMISES.find((x) => x.id === id) : null; return (
          <button key={i} className="fx-slot" data-on={p ? "1" : undefined} onClick={() => p && toggle(p.id)} aria-label={p ? `Remove ${p.short}` : `Promise ${i + 1}: empty`}>
            <span aria-hidden>{p ? PLEDGE_META[p.id]?.icon : i + 1}</span><b>{p ? p.short : "Pick a promise"}</b>{p && <i>tap to remove</i>}
          </button>); })}</div>
        {slogan.length > 0 && <div className="fx-slogan">&ldquo;{slogan.join(". ")}.&rdquo;</div>}
        {mood && <div className="fx-boldness"><span style={{ color: mood.c }}>● {mood.label} platform</span><div className="fx-bold-bar"><i style={{ width: `${(bold / 9) * 100}%`, background: mood.c }} /></div><small>{mood.text}</small></div>}
      </div>
      {GROUPS.map((g) => (
        <div key={g.name}>
          <div className="fx-wiz-label" style={{ marginBottom: 6 }}>{g.icon} {g.name}</div>
          <div className="fx-pledges" role="group" aria-label={g.name}>
            {g.ids.map((id) => PROMISES.find((p) => p.id === id)).filter((p): p is (typeof PROMISES)[number] => !!p).map((p) => {
              const m = PLEDGE_META[p.id] ?? { icon: "⭐", hard: "Ambitious" as const };
              const done = !!s && p.kept(s);
              let today = ""; try { today = p.status(now).replace(/^Now /, ""); if (!s) today = today.replace(/\s*\((start|day one)[^)]*\)/i, ""); } catch { today = ""; }
              return (
                <button key={p.id} className="fx-pledge" data-hard={m.hard} aria-pressed={value.includes(p.id)} disabled={done} onClick={() => toggle(p.id)}>
                  <span className="fx-pledge-ic" aria-hidden>{m.icon}</span>
                  <b>{p.label}</b>
                  {today && <span className="fx-pledge-today">Today: <b>{s ? today : `about ${today}`}</b></span>}
                  <span className="fx-pledge-stake">{STAKE[m.hard]}</span>
                  <span className="fx-pledge-foot"><i style={{ color: HARD_COLOR[m.hard] }}>● {m.hard}</i><i>by {by}</i></span>
                  {done && <span className="fx-pledge-done">Already true</span>}
                  <span className="fx-pledge-check" aria-hidden>{value.includes(p.id) ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
