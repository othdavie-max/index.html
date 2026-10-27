"use client";
import { useState } from "react";
import { Play, FolderOpen, Info, RotateCcw } from "lucide-react";
import { useFix } from "./store";
import { Button, Modal } from "../../game/ui/kit";
import { SaveSlots } from "./Menu";
import { DEFAULT_PROMISES, PROMISES } from "../engine/promises";
import { DIFFICULTY, PRESIDENTS, STARTS } from "../engine/setup";
import type { Difficulty, Portrait as PortraitT } from "../engine/types";
import { Portrait, PORTRAIT_OPTIONS } from "../../game/ui/kit";
import { Hall } from "./Hall";

export function Title() {
  const { startNew, hasAuto, loadSlot } = useFix();
  const [slots, setSlots] = useState(false);
  const [about, setAbout] = useState(false);
  const [step, setStep] = useState<"intro" | "setup" | "promises">("intro");
  const [hall, setHall] = useState(false);
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [archetype, setArchetype] = useState("career");
  const [start, setStart] = useState("normal");
  const [portrait, setPortrait] = useState<PortraitT>({ skin: 3, hair: 0, style: 0, accent: 0 });
  const cycle = (k: keyof PortraitT) => setPortrait((p) => ({ ...p, [k]: (p[k] + 1) % (PORTRAIT_OPTIONS as unknown as Record<string, number>)[k] }));
  const [picked, setPicked] = useState<string[]>(DEFAULT_PROMISES);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? [...p.slice(1), id] : [...p, id]));
  if (step === "setup") return (
    <div className="fx-title-screen">
      <div className="fx-title-card">
        <div>
          <div className="g-tiny" style={{ letterSpacing: ".18em", color: "#9db3c9", fontWeight: 800 }}>STEP 1 OF 2</div>
          <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>Who are you?</h1>
        </div>
        <div className="g-row g-wrap" style={{ gap: 18, alignItems: "flex-start" }}>
          <div className="g-col" style={{ alignItems: "center", gap: 8 }}>
            <Portrait p={portrait} size={110} name={name || "the President"} />
            <div className="g-row g-wrap" style={{ gap: 4, justifyContent: "center", maxWidth: 220 }}>
              {(["skin", "hair", "style", "accent"] as const).map((k) => <Button key={k} size="sm" variant="light" onClick={() => cycle(k)}>{k === "style" ? "Hair style" : k === "accent" ? "Outfit" : k === "skin" ? "Skin" : "Hair colour"}</Button>)}
            </div>
          </div>
          <div className="g-col g-grow" style={{ minWidth: 260, gap: 8 }}>
            <label className="g-small" htmlFor="pres-name" style={{ fontWeight: 700 }}>Your name</label>
            <input id="pres-name" className="g-input" style={{ background: "rgba(255,255,255,.95)" }} placeholder="e.g. Adaora Bello" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="g-small" style={{ fontWeight: 700, marginTop: 6 }}>Difficulty</div>
            <div className="g-row g-wrap" style={{ gap: 6 }} role="group" aria-label="Difficulty">{(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => <button key={d} className="fx-pp" style={{ padding: "8px 12px" }} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}><span><b>{DIFFICULTY[d].label}</b><div className="g-tiny" style={{ color: "#cfe0ee" }}>{DIFFICULTY[d].blurb}</div></span></button>)}</div>
          </div>
        </div>
        <div className="g-col" style={{ gap: 6 }}>
          <div className="g-small" style={{ fontWeight: 700 }}>Who were you before the villa?</div>
          <div className="fx-cand-grid fx-cand-5" role="group" aria-label="President type">{PRESIDENTS.map((p) => <button key={p.id} className="fx-pp" style={{ padding: "8px 10px", alignItems: "flex-start" }} aria-pressed={archetype === p.id} onClick={() => setArchetype(p.id)}><span><b>{p.icon} {p.name}</b><div className="g-tiny" style={{ color: "#a7f3d0" }}>+ {p.perk}</div><div className="g-tiny" style={{ color: "#fecaca" }}>− {p.weak}</div></span></button>)}</div>
          <div className="g-small" style={{ fontWeight: 700, marginTop: 4 }}>How do you take over?</div>
          <div className="g-row g-wrap" style={{ gap: 6 }} role="group" aria-label="Starting situation">{STARTS.map((x) => <button key={x.id} className="fx-pp" style={{ padding: "8px 12px" }} aria-pressed={start === x.id} onClick={() => setStart(x.id)}><span><b>{x.icon} {x.name}</b><div className="g-tiny" style={{ color: "#cfe0ee" }}>{x.blurb}</div></span></button>)}</div>
        </div>
        <div className="fx-intro" style={{ fontSize: 14 }}>
          <div><b>🎲 A different Nigeria every time.</b> When you take the oath, the game rolls what you inherit: maybe a collapsing naira and a looming strike, maybe banditry in the North West, a looted treasury or a bumper harvest. You will only find out on day one.</div>
        </div>
        <div className="g-row g-wrap" style={{ gap: 12 }}>
          <button className="fx-big-btn" onClick={() => setStep("promises")}>Next: your promises</button>
          <Button variant="light" onClick={() => setStep("intro")}>Back</Button>
        </div>
      </div>
    </div>
  );
  if (step === "promises") return (
    <div className="fx-title-screen">
      <div className="fx-title-card">
        <div>
          <div className="g-tiny" style={{ letterSpacing: ".18em", color: "#9db3c9", fontWeight: 800 }}>STEP 2 OF 2 · BEFORE YOU TAKE THE OATH</div>
          <h1 style={{ fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, lineHeight: 1.1, marginTop: 6 }}>Make three promises to Nigeria</h1>
          <p style={{ color: "#cfe0ee", marginTop: 8 }}>Voters will remember. Each promise you keep raises your re-election chances; each one you break lowers them. Pick the ones you believe you can deliver.</p>
        </div>
        <div className="fx-promise-pick" role="group" aria-label="Campaign promises">
          {PROMISES.map((p) => (
            <button key={p.id} className="fx-pp" aria-pressed={picked.includes(p.id)} onClick={() => toggle(p.id)}>
              <span className="fx-check" aria-hidden>{picked.includes(p.id) ? "✓" : ""}</span>
              <span><b>{p.label}</b></span>
            </button>
          ))}
        </div>
        <div className="g-row g-wrap" style={{ gap: 12 }}>
          <button className="fx-big-btn" disabled={picked.length !== 3} onClick={() => startNew(undefined, picked, { difficulty, portrait, president: name.trim() || "Madam/Mr President", archetype, start })}><Play size={22} /> Take the oath ({picked.length}/3)</button>
          <Button variant="light" onClick={() => setStep("setup")}>Back</Button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="fx-title-screen">
      <div className="fx-title-card">
        <div>
          <div className="g-tiny" style={{ letterSpacing: ".18em", color: "#9db3c9", fontWeight: 800 }}>A PRESIDENTIAL STRATEGY SIMULATION</div>
          <h1 className="fx-title-h" style={{ marginTop: 8 }}>NIGERIA:<br /><em>CAN YOU FIX IT?</em></h1>
          <p style={{ fontSize: 20, marginTop: 10, color: "#cfe0ee", fontWeight: 600 }}>Your country. Your decisions. Your legacy.</p>
        </div>
        <div className="fx-intro">
          <div><b>The job.</b> You have just been sworn in as President. Every presidency inherits a different Nigeria: a weak naira, food prices, fuel queues, blackouts, banditry, angry unions or a looted treasury. You never know which until you take office. You have four years, a limited budget and no easy answers.</div>
          <div><b>How it works.</b> Each month, the game shows you the country&apos;s biggest problem and a few real choices, each with a cost, a trade-off and an honest uncertainty. Choose, end the month, and see what changes. Nothing is faked: every number comes from the simulation.</div>
          <div className="g-tiny" style={{ color: "#9db3c9" }}>This is a fictional, internally consistent scenario. All figures are simulated game values, not real data or forecasts. Map boundaries are real (geoBoundaries, CC BY 4.0).</div>
        </div>
        <div className="g-row g-wrap" style={{ gap: 12 }}>
          <button className="fx-big-btn" onClick={() => setStep("setup")}><Play size={22} /> Start Presidency</button>
          <Button variant="light" onClick={() => { const d = new Date(); const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; const seed = Number(key); startNew(seed, DEFAULT_PROMISES, { difficulty: "normal", portrait, president: name.trim() || "Madam/Mr President", archetype: PRESIDENTS[seed % PRESIDENTS.length].id, start: ["normal", "normal", "coup", "recession"][seed % 4], daily: key }); }}>📅 Daily challenge</Button>
          {hasAuto && <Button variant="light" onClick={() => void loadSlot("auto")}><RotateCcw size={17} /> Continue</Button>}
          <Button variant="light" onClick={() => setSlots(true)}><FolderOpen size={17} /> Load game</Button>
          <Button variant="light" onClick={() => setHall(true)}>🏛️ Hall of Presidents</Button>
          <Button variant="light" onClick={() => setAbout(true)}><Info size={17} /> About</Button>
        </div>
      </div>
      {slots && <Modal title="Load a game" onClose={() => setSlots(false)}><SaveSlots mode="load" onDone={() => setSlots(false)} /></Modal>}
      {about && <About onClose={() => setAbout(false)} />}
      {hall && <Hall onClose={() => setHall(false)} />}
    </div>
  );
}

export function About({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About this game" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="g-col g-small" style={{ gap: 8 }}>
        <p><b>Fictional and simulated.</b> The scenario, politicians, events, prices, statistics and outcomes are invented for gameplay. They are not real data and not predictions about Nigeria.</p>
        <p><b>Real geography.</b> The map shows Nigeria&apos;s 36 states, the FCT and 774 local government areas using geoBoundaries (GRID3 / CC BY 4.0). Local conditions inside the map are simulated.</p>
        <p><b>Offline and private.</b> The game runs entirely in your browser and saves on your device. No accounts, no tracking, no paid services.</p>
      </div>
    </Modal>
  );
}
