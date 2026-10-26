"use client";
import { useState, type ReactNode } from "react";
import { Building2, CalendarDays, FastForward, HelpCircle, Hammer, Landmark, Map as MapIcon, Menu as MenuIcon, Newspaper, ScrollText, TrendingUp } from "lucide-react";
import { useFix, useS, type Tab } from "./store";
import { Badge, Button, Modal } from "../../game/ui/kit";
import { monthLabel } from "../engine/util";
import { monthsLeftInTerm } from "../engine/views";
import { TERM_MONTHS } from "../engine/types";
import { HowTo, MenuModal } from "./Menu";
import { Legacy } from "./Legacy";

const ICON = 20;
const NAV: { id: Tab; label: string; short: string; icon: ReactNode }[] = [
  { id: "presidency", label: "Presidency", short: "Presidency", icon: <Landmark size={ICON} /> },
  { id: "map", label: "Nigeria Map", short: "Map", icon: <MapIcon size={ICON} /> },
  { id: "policies", label: "Policies", short: "Policies", icon: <ScrollText size={ICON} /> },
  { id: "projects", label: "Projects", short: "Projects", icon: <Hammer size={ICON} /> },
  { id: "nation", label: "Nation & Economy", short: "Economy", icon: <TrendingUp size={ICON} /> },
  { id: "news", label: "News", short: "News", icon: <Newspaper size={ICON} /> },
];

function MonthSummaryModal() {
  const { summary, closeSummary } = useFix();
  const s = useS();
  if (!summary || s.flags.noSummary) return null;
  return (
    <Modal title={`${summary.from} → ${summary.to}`} onClose={closeSummary} footer={<Button variant="primary" onClick={closeSummary}>Continue</Button>}>
      <div className="g-col">
        {summary.changes.length === 0 ? <div className="g-small g-muted">A quiet {summary.months > 1 ? `${summary.months} months` : "month"}: nothing moved much.</div> : (
          <div className="g-col" style={{ gap: 0 }}>
            {summary.changes.map((c) => <div key={c.label} className="g-list-row"><div className="g-grow g-small"><b>{c.label}</b></div><span className="g-small g-muted g-num">{c.from}</span><span aria-hidden>→</span><b className={`g-small g-num ${c.tone === "good" ? "fx-delta-good" : c.tone === "bad" ? "fx-delta-bad" : ""}`}>{c.to} {c.tone === "good" ? "▲" : c.tone === "bad" ? "▼" : ""}</b></div>)}
          </div>
        )}
        {summary.events.length > 0 && <div><div className="g-section-title">New on your desk</div>{summary.events.map((e) => <div key={e.id} className="g-small" style={{ marginTop: 4 }}>• <b>{e.title}</b></div>)}</div>}
        {summary.news.length > 0 && <div><div className="g-section-title">What was reported</div>{summary.news.map((n) => <div key={n.id} className="g-small" style={{ marginTop: 4 }}>• {n.headline}</div>)}</div>}
        <div className="g-tiny g-muted">▲ better for the country, ▼ worse. Every change comes from the simulation.</div>
      </div>
    </Modal>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const s = useS();
  const { tab, setTab, advance, lastSaved } = useFix();
  const [menu, setMenu] = useState(false);
  const [how, setHow] = useState(false);
  const left = monthsLeftInTerm(s);
  const pct = ((TERM_MONTHS - left) / TERM_MONTHS) * 100;
  const open = s.events.filter((e) => e.status === "open").length;
  const blocked = !!s.ended;
  return (
    <div className="g-shell">
      <aside className="g-side" aria-label="Main navigation">
        <div className="g-brand"><div className="g-brand-mark"><Building2 size={18} /></div><span>Can You Fix It?</span></div>
        <nav className="g-col" style={{ gap: 2 }}>
          {NAV.map((n) => (
            <button key={n.id} className="g-nav" aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)}>
              {n.icon}<span>{n.label}</span>{n.id === "presidency" && open > 0 && <Badge tone="red">{open}</Badge>}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button className="g-nav" onClick={() => setHow(true)}><HelpCircle size={ICON} /><span>How to play</span></button>
        <button className="g-nav" onClick={() => setMenu(true)}><MenuIcon size={ICON} /><span>Menu &amp; saves</span></button>
      </aside>
      <div className="g-main">
        <header className="g-topbar">
          <div className="g-grow">
            <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{monthLabel(s.month)}</div>
            <div className="g-row g-tiny g-muted" style={{ gap: 8 }}>
              <span>Term {s.term} · month {Math.min(TERM_MONTHS, s.month - s.termStart + 1)} of {TERM_MONTHS}</span>
              <span className="fx-term" role="progressbar" aria-label="Progress through the term" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></span>
              <span className="g-muted" style={{ display: "none" }}>{lastSaved}</span>
            </div>
          </div>
          <button className="g-btn g-btn-ghost" onClick={() => setHow(true)} aria-label="How to play" style={{ padding: 8 }}><HelpCircle size={20} /></button>
          <button className="g-btn g-btn-ghost" onClick={() => setMenu(true)} aria-label="Menu and saves" style={{ padding: 8 }}><MenuIcon size={20} /></button>
          <Button variant="navy" disabled={blocked} onClick={() => advance(3)} title="Skip ahead up to three months; stops early if something needs a decision" aria-label="Skip three months"><FastForward size={17} /><span className="g-small" style={{ color: "inherit" }}>+3</span></Button>
          <button className="g-hero-btn" style={{ padding: "8px 16px", fontSize: 15, boxShadow: "0 3px 0 var(--g-emerald-d)" }} disabled={blocked} onClick={() => advance(1)} aria-label="End month: move on to the next month"><CalendarDays size={18} /><span>End month</span></button>
        </header>
        <main className="g-content" id="main">{children}</main>
      </div>
      <nav className="g-bottomnav fx-bottomnav" aria-label="Primary">
        {NAV.map((n) => <button key={n.id} className="g-bnav" aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)}>{n.icon}{n.short}</button>)}
      </nav>
      {menu && <MenuModal onClose={() => setMenu(false)} />}
      {how && <HowTo onClose={() => setHow(false)} />}
      <MonthSummaryModal />
      {s.ended && <Legacy />}
    </div>
  );
}
