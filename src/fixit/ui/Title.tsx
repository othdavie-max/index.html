"use client";
import { useState } from "react";
import { BookOpen, FolderOpen, Info, Landmark, CalendarDays } from "lucide-react";
import { useFix } from "./store";
import { Modal } from "../../game/ui/kit";
import { HowTo, SaveSlots } from "./Menu";
import { DEFAULT_PROMISES } from "../engine/promises";
import { PRESIDENTS } from "../engine/setup";
import { Hall } from "./Hall";
import { Setup } from "./Setup";
import { Button } from "../../game/ui/kit";

export function Title() {
  const { startNew, hasAuto, loadSlot } = useFix();
  const [slots, setSlots] = useState(false);
  const [about, setAbout] = useState(false);
  const [how, setHow] = useState(false);
  const [setup, setSetup] = useState(false);
  const [hall, setHall] = useState(false);
  if (setup) return <Setup onBack={() => setSetup(false)} />;
  const daily = () => { const d = new Date(); const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; const seed = Number(key); startNew(seed, DEFAULT_PROMISES, { difficulty: "normal", portrait: { skin: 3, hair: 0, style: 0, accent: 0 }, president: "Madam/Mr President", archetype: PRESIDENTS[seed % PRESIDENTS.length].id, start: ["normal", "normal", "coup", "recession"][seed % 4], daily: key }); };
  return (
    <div className="fx-hero">
      <div className="fx-hero-center">
        <div className="fx-hero-kicker">A PRESIDENTIAL STRATEGY GAME</div>
        <h1 className="fx-hero-title">NIGERIA:<br /><em>CAN YOU FIX IT?</em></h1>
        <p className="fx-hero-tag">Four years. One country. Every choice counts.</p>
        <button className="fx-big-btn fx-hero-go" onClick={() => setSetup(true)}>Start your presidency</button>
        {hasAuto && <button className="fx-hero-sub" onClick={() => void loadSlot("auto")}>Continue your last game</button>}
      </div>
      <nav className="fx-hero-icons" aria-label="More">
        <button onClick={() => setSlots(true)}><FolderOpen size={20} /><span>Load</span></button>
        <button onClick={daily}><CalendarDays size={20} /><span>Daily</span></button>
        <button onClick={() => setHall(true)}><Landmark size={20} /><span>Hall</span></button>
        <button onClick={() => setHow(true)}><BookOpen size={20} /><span>How to play</span></button>
        <button onClick={() => setAbout(true)}><Info size={20} /><span>About</span></button>
      </nav>
      <div className="fx-hero-fine">Fictional and simulated. Every figure is a game value, not real data.</div>
      {slots && <Modal title="Load a game" onClose={() => setSlots(false)}><SaveSlots mode="load" onDone={() => setSlots(false)} /></Modal>}
      {about && <About onClose={() => setAbout(false)} />}
      {how && <HowTo onClose={() => setHow(false)} />}
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
