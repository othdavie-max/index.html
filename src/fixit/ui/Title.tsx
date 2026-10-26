"use client";
import { useState } from "react";
import { Play, FolderOpen, Info, RotateCcw } from "lucide-react";
import { useFix } from "./store";
import { Button, Modal } from "../../game/ui/kit";
import { SaveSlots } from "./Menu";

export function Title() {
  const { startNew, hasAuto, loadSlot } = useFix();
  const [slots, setSlots] = useState(false);
  const [about, setAbout] = useState(false);
  return (
    <div className="fx-title-screen">
      <div className="fx-title-card">
        <div>
          <div className="g-tiny" style={{ letterSpacing: ".18em", color: "#9db3c9", fontWeight: 800 }}>A PRESIDENTIAL STRATEGY SIMULATION</div>
          <h1 className="fx-title-h" style={{ marginTop: 8 }}>NIGERIA:<br /><em>CAN YOU FIX IT?</em></h1>
          <p style={{ fontSize: 20, marginTop: 10, color: "#cfe0ee", fontWeight: 600 }}>Your country. Your decisions. Your legacy.</p>
        </div>
        <div className="fx-intro">
          <div><b>The scenario.</b> You have just been sworn in as President. Prices are rising, the naira is weak, fuel is subsidised at a cost the treasury can barely bear, the lights keep going out, and many families are going hungry. You have four years, a limited budget and no easy answers.</div>
          <div><b>How it works.</b> Each month, the game shows you the country&apos;s biggest problem and a few real choices, each with a cost, a trade-off and an honest uncertainty. Choose, end the month, and see what changes. Nothing is faked: every number comes from the simulation.</div>
          <div className="g-tiny" style={{ color: "#9db3c9" }}>This is a fictional, internally consistent scenario. All figures are simulated game values, not real data or forecasts. Map boundaries are real (geoBoundaries, CC BY 4.0).</div>
        </div>
        <div className="g-row g-wrap" style={{ gap: 12 }}>
          <button className="fx-big-btn" onClick={() => startNew()}><Play size={22} /> Start Presidency</button>
          {hasAuto && <Button variant="light" onClick={() => void loadSlot("auto")}><RotateCcw size={17} /> Continue</Button>}
          <Button variant="light" onClick={() => setSlots(true)}><FolderOpen size={17} /> Load game</Button>
          <Button variant="light" onClick={() => setAbout(true)}><Info size={17} /> About</Button>
        </div>
      </div>
      {slots && <Modal title="Load a game" onClose={() => setSlots(false)}><SaveSlots mode="load" onDone={() => setSlots(false)} /></Modal>}
      {about && <About onClose={() => setAbout(false)} />}
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
