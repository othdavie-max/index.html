"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Briefcase, Wallet, Landmark, Vote, Building2, Map as MapIcon, Lightbulb, PartyPopper } from "lucide-react";
import { useGame } from "./store";
import { Button, Modal } from "./kit";
import type { Tab } from "../engine/insights";

interface Step { icon: React.ReactNode; title: string; lines: string[]; tab?: Tab; sub?: string; go?: string }
const STEPS: Step[] = [
  { icon: <PartyPopper size={28} />, title: "Welcome! Here is the idea", lines: [
    "You are an ordinary person living in Nigeria. Your goal is simple: become influential, and maybe one day President.",
    "There is no single right way. You can study, work, run a business, or go into politics. Every choice has a cost and a result.",
    "This quick tour takes about two minutes. You can open it again any time with the ? button at the top.",
  ] },
  { icon: <CalendarDays size={28} />, title: "Time moves one month at a time", lines: [
    "Look at the green “Next month” button at the top of the screen. Time only moves when you press it.",
    "Take as long as you like to look around first. Nothing happens while you read.",
    "The dark button next to it, “Next event”, skips ahead until something needs your attention.",
    "Sometimes a decision pops up. Read the choices, pick one and confirm. The game never decides important things without you.",
  ], tab: "home", go: "Go to Home" },
  { icon: <Briefcase size={28} />, title: "Build your life first (My Life)", lines: [
    "You start with little. Open My Life to go to school, get a job or start a business.",
    "Studying and working give you skills, money and contacts. You also pay for food, rent and transport every month.",
    "“Time & community” lets you volunteer or organise. This makes people in your area know your name, which you need later.",
  ], tab: "life", sub: "education", go: "Open My Life" },
  { icon: <Wallet size={28} />, title: "Watch your money", lines: [
    "Your cash and savings are on the Home screen. If you run out, you borrow at high interest and get stressed.",
    "My Life → Money lists every naira that came in or went out, and why.",
    "Your personal money is separate from government money. You can never spend public funds as your own.",
  ], tab: "life", sub: "money", go: "See my money" },
  { icon: <Landmark size={28} />, title: "Politics starts with a party", lines: [
    "In Nigeria you cannot run for office alone. You need a party. Open Politics to compare the parties and join one.",
    "The parties and politicians in this game are made up. They are inspired by real life, but they are not real people.",
    "In a party you can build relationships, take party posts and later win your party's ticket in a primary.",
  ], tab: "politics", sub: "parties", go: "See the parties" },
  { icon: <Vote size={28} />, title: "Elections: win the party, then win the voters", lines: [
    "Open Elections to see races near you. Each shows what you need: a minimum age, a party, money for the form.",
    "First you win your party's primary. Then you campaign: set a monthly budget, raise money lawfully, speak in debates.",
    "Money helps, but it is not enough. Being known, being organised and what voters care about matter too. After each election the game explains why you won or lost.",
    "Presidents and governors must also win enough votes across many places, not just the most votes.",
  ], tab: "elections", sub: "races", go: "See the races" },
  { icon: <Building2 size={28} />, title: "If you win: governing", lines: [
    "When you hold office, a Government section appears. You can set budgets and start projects.",
    "Projects take months to finish and can be delayed. A new road is not built overnight.",
    "Corruption can pay in the short run, but it leaves evidence. Journalists, auditors and courts can eventually catch up. The choice is yours.",
  ] },
  { icon: <MapIcon size={28} />, title: "Explore the map and the news", lines: [
    "Nigeria Map shows every state and local government. Click one to zoom in. Use the layers to see parties, jobs, security and more.",
    "The News screen explains what is happening in the country. Every story comes from something that really happened in your game.",
  ], tab: "map", go: "Open the map" },
  { icon: <Lightbulb size={28} />, title: "Tips to get started", lines: [
    "1. Press “Next month” once and see what changes.",
    "2. Choose study or work in My Life.",
    "3. Volunteer so people know you.",
    "4. Join a party.",
    "5. Check Elections now and then to see when you can run.",
    "The Home screen has a Getting started list that ticks itself off. The game saves automatically. Good luck!",
  ], tab: "home", go: "Start playing" },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const { go } = useGame();
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <Modal title={`How to play · ${i + 1} of ${STEPS.length}`} onClose={onClose} wide>
      <div className="g-row" style={{ gap: 6 }} aria-hidden>
        {STEPS.map((_, k) => <span key={k} style={{ flex: 1, height: 5, borderRadius: 9, background: k <= i ? "var(--g-emerald)" : "#e2e8f0" }} />)}
      </div>
      <div className="g-row" style={{ gap: 14, alignItems: "flex-start", marginTop: 6 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--g-navy)", color: "var(--g-emerald)", display: "grid", placeItems: "center", flex: "none" }}>{s.icon}</div>
        <div className="g-col" style={{ gap: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{s.title}</div>
          {s.lines.map((l) => <p key={l} style={{ fontSize: 15, lineHeight: 1.55, color: "#1e293b" }}>{l}</p>)}
          {s.tab && <div><Button variant="navy" size="sm" onClick={() => { go(s.tab!, s.sub); onClose(); }}>{s.go}</Button></div>}
        </div>
      </div>
      <div className="g-row g-between" style={{ marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose}>Skip tour</Button>
        <div className="g-row">
          <Button disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={16} /> Back</Button>
          {last ? <Button variant="primary" onClick={onClose}>Got it</Button> : <Button variant="primary" onClick={() => setI(i + 1)}>Next <ArrowRight size={16} /></Button>}
        </div>
      </div>
    </Modal>
  );
}
