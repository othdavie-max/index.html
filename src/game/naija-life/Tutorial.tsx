"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Tab } from "./Shell";
import { T } from "./util";

const KEY = "naija-life-tutorial-v1";
export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch {
    return true;
  }
}
export function markTutorialSeen() {
  try {
    localStorage.setItem(KEY, "done");
  } catch {
    /* storage unavailable */
  }
}

interface Step {
  target?: string;
  tab?: Tab;
  title: () => string;
  body: () => string[];
}

const STEPS: Step[] = [
  {
    tab: "life",
    title: () => T("Welcome to Naija Life", "Welcome to Naija Life"),
    body: () => [
      T("Live a whole Nigerian life, from birth to old age. You make the choices: study, hustle, fall in love, build wealth, face wahala, and leave a legacy your children inherit.", "Live full Naija life, from birth reach old age. Na you go choose: read book, hustle, fall in love, build money, face wahala, and leave legacy wey your pikin go inherit."),
      T("This quick tour takes about a minute and shows you where everything is.", "This short tour go take like one minute, and e go show you where everything dey."),
    ],
  },
  {
    target: "avatar",
    tab: "life",
    title: () => T("This is you", "Na you be this"),
    body: () => [T("Your name, age, life stage and where you live are at the top. Your parents, partner and children are drawn to look like family.", "Your name, age, life stage and where you dey stay dey for top. Your parents, partner and pikin go look like family.")],
  },
  {
    target: "stats",
    tab: "life",
    title: () => T("Your stats", "Your stats"),
    body: () => [
      T("Health, Happiness, Smarts, Looks, Stress, Connections, Reputation and Family. They move with your choices.", "Health, Happiness, Smarts, Looks, Stress, Connections, Reputation and Family. Dem dey change as you dey choose."),
      T("Keep Health up and Stress down. Red numbers mean trouble. Smarts help in school and work, and Connections open doors.", "Make Health high and Stress low. Red number mean wahala. Smarts dey help for school and work, and Connections dey open door."),
    ],
  },
  {
    target: "wallet",
    tab: "life",
    title: () => T("Your wallet", "Your wallet"),
    body: () => [T("This is your cash. Tap it to open Money: your history of every naira in and out, loans, houses, investments and bills. Prices rise every year, so cash slowly loses value.", "Na your cash be this. Tap am to open Money: record of every naira wey enter or comot, loans, houses, investments and bills. Price dey rise every year, so cash dey lose value small small.")],
  },
  {
    target: "menu",
    tab: "life",
    title: () => T("Menu and alerts", "Menu and alerts"),
    body: () => [T("Open the menu for alerts (bills due, missed payments, health, news), your save slots, language, and to replay this tour. A red number means something needs your attention.", "Open menu for alerts (bills wey don due, missed payment, health, news), your save slots, language, and to run this tour again. Red number mean something need your attention.")],
  },
  {
    target: "activities",
    tab: "life",
    title: () => T("Activities", "Activities"),
    body: () => [T("Tap here to open what you can do this year: study, exercise, network, side gigs and more. You only get a few actions a year, so choose well. They come back when you grow up.", "Tap here to see wetin you fit do this year: read book, exercise, network, side gig and more. Na only few actions you get every year, so choose well. Dem go come back when you grow up.")],
  },
  {
    target: "timeline",
    tab: "life",
    title: () => T("Your life story", "Your life story"),
    body: () => [T("Every year gets a card that tells you what happened. The newest year is on top.", "Every year get one card wey tell you wetin happen. The newest year dey for top.")],
  },
  {
    target: "grow",
    tab: "life",
    title: () => T("Grow Up", "Grow Up"),
    body: () => [
      T("This is the main button. Tap it to move to the next year.", "Na the main button be this. Tap am to move go next year."),
      T("When something important happens, a window pops up and asks you to choose. Read it carefully: there is no undo.", "If something big happen, window go pop up make you choose. Read am well: no undo dey."),
    ],
  },
  {
    target: "tab-work",
    tab: "life",
    title: () => T("The bottom tabs", "The bottom tabs"),
    body: () => [
      T("Your life story stays on the main screen. Work holds your jobs, businesses and skills. Money holds your wallet, assets, loans and history. Family is for your parents, partner, children, relationships and will.", "Life dey show your story. Money get your wallet, assets, loans and history. Family na for your parents, partner, pikin, relationships and will."),
      T("You can ask your parents for help when you are young, and date, marry and have children when you are older.", "You fit ask your parents for help when you small, and date, marry and born pikin when you don grow."),
    ],
  },
  {
    target: "tab-explore",
    tab: "explore",
    title: () => T("Explore", "Explore"),
    body: () => [T("Everything else lives here: Phone (loans, dating, social media, betting), Health, Law, Map (travel), Power (politics) and Legacy (your family line).", "Everything remain dey here: Phone (loans, dating, social media, betting), Work (job, school, business, skills), Health, Law, Map (travel), Power (politics) and Legacy (your family line).")],
  },
  {
    tab: "life",
    title: () => T("A few tips", "Small small tips"),
    body: () => [
      T("• Borrow carefully: loans have interest and unpaid debts follow you.", "• Borrow with sense: loan get interest and debt wey you no pay go follow you."),
      T("• Look after your health: see a doctor when you are sick.", "• Look after your health: go see doctor when you sick."),
      T("• Crime can pay fast, but police and prison are real.", "• Crime fit pay quick, but police and prison real."),
      T("• When you die you can continue as your child. Your will decides who gets what.", "• When you die you fit continue as your pikin. Your will go decide who go get wetin."),
    ],
  },
  {
    tab: "life",
    title: () => T("You are ready", "You don ready"),
    body: () => [T("You can replay this tour any time from the menu. Good luck, and enjoy your life.", "You fit run this tour again any time from menu. Wish you luck, enjoy your life.")],
  },
];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Tutorial({ setTab, onClose }: { setTab: (t: Tab) => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step.target) { setBox(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [step.target]);

  useEffect(() => {
    if (step.tab) setTab(step.tab);
    const t = setTimeout(() => {
      const el = step.target ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null) : null;
      el?.scrollIntoView({ block: "center", behavior: "auto" });
      measure();
    }, 90);
    return () => clearTimeout(t);
  }, [i, step.tab, step.target, setTab, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [measure]);

  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); }, [i, box]);

  const vw = typeof window === "undefined" ? 400 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const cardW = Math.min(360, vw - 24);
  let top: number;
  if (!box) top = Math.max(16, (vh - cardH) / 2);
  else if (box.y + box.h + 14 + cardH < vh - 8) top = box.y + box.h + 14;
  else top = Math.max(8, box.y - cardH - 14);
  const left = Math.max(12, Math.min(vw - cardW - 12, (vw - cardW) / 2));

  const finish = () => { markTutorialSeen(); setTab("life"); onClose(); };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={T("How to play", "How to play")}>
      {box ? (
        <div className="pointer-events-none absolute rounded-2xl border-2 border-white transition-all duration-200" style={{ left: box.x - 4, top: box.y - 4, width: box.w + 8, height: box.h + 8, boxShadow: "0 0 0 9999px rgba(11,42,107,0.72)" }} />
      ) : (
        <div className="absolute inset-0 bg-[#0b2a6b]/72" style={{ background: "rgba(11,42,107,0.72)" }} />
      )}
      <div ref={cardRef} className="absolute rounded-2xl bg-white p-4 text-slate-800 shadow-2xl" style={{ top, left, width: cardW }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{i + 1} / {STEPS.length}</span>
          {!last && <button type="button" onClick={finish} className="text-[12px] font-semibold text-slate-400 underline">{T("Skip tutorial", "Skip tutorial")}</button>}
        </div>
        <h2 className="mt-1 text-[17px] font-extrabold tracking-tight text-[#0b2a6b]">{step.title()}</h2>
        <div className="mt-1.5 space-y-1.5">
          {step.body().map((line, k) => <p key={k} className="text-[13.5px] leading-snug text-slate-600">{line}</p>)}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((_, k) => <span key={k} className={k === i ? "h-1.5 w-4 rounded-full bg-blue-600" : "h-1.5 w-1.5 rounded-full bg-slate-200"} />)}
          </div>
          <div className="flex gap-2">
            {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-700">{T("Back", "Back")}</button>}
            <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-600/30">{last ? T("Start my life", "Start my life") : i === 0 ? T("Show me around", "Show me around") : T("Next", "Next")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
