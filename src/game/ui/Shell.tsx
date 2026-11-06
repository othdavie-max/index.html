"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Home, User, Map as MapIcon, Landmark, Vote, Building2, TrendingUp, Newspaper, Settings, Bell, ChevronsLeft, ChevronsRight, MoreHorizontal, CalendarDays, FastForward, Save, X, HelpCircle } from "lucide-react";
import { useGame, useS, type Tab } from "./store";
import { Button, Modal, Badge, Spinner, cx } from "./kit";
import { formatMonth, playerAge } from "../engine/calendar";
import { execInfo } from "../engine/governance";
import { canAdvance } from "../engine/turn";
import { DecisionDialog } from "./DecisionDialog";
import { Tutorial } from "./Tutorial";

interface NavItem { id: Tab; label: string; icon: ReactNode }
const ICON = 20;
const ALL: NavItem[] = [
  { id: "home", label: "Home", icon: <Home size={ICON} /> },
  { id: "life", label: "My Life", icon: <User size={ICON} /> },
  { id: "map", label: "Nigeria Map", icon: <MapIcon size={ICON} /> },
  { id: "politics", label: "Politics", icon: <Landmark size={ICON} /> },
  { id: "elections", label: "Elections", icon: <Vote size={ICON} /> },
  { id: "government", label: "Government", icon: <Building2 size={ICON} /> },
  { id: "economy", label: "Economy", icon: <TrendingUp size={ICON} /> },
  { id: "news", label: "News", icon: <Newspaper size={ICON} /> },
  { id: "settings", label: "Settings", icon: <Settings size={ICON} /> },
];

export function useNav(): NavItem[] {
  const state = useS();
  return useMemo(() => {
    const hasGov = !!execInfo(state) || !!state.player.politics.seatId || !!state.player.politics.appointment;
    return ALL.filter((n) => n.id !== "government" || hasGov);
  }, [state]);
}

export function TimeControls({ compact }: { compact?: boolean }) {
  const { state, dispatch, busy } = useGame();
  if (!state) return null;
  const gate = canAdvance(state);
  return (
    <div className="g-row" style={{ gap: 8 }}>
      <button className="g-hero-btn" style={{ padding: compact ? "8px 14px" : undefined, fontSize: compact ? 14 : undefined, boxShadow: compact ? "0 3px 0 var(--g-emerald-d)" : undefined }} disabled={!gate.ok || busy} onClick={() => dispatch({ t: "advance" })} title={gate.reason ?? "Advance the calendar by one month"} aria-label="Advance one month">
        {busy ? <Spinner label="" /> : <CalendarDays size={compact ? 17 : 20} />}<span>{compact ? "Next month" : "Advance one month"}</span>
      </button>
      <Button variant="navy" disabled={!gate.ok || busy} onClick={() => dispatch({ t: "advanceToEvent" })} title={gate.reason ?? "Skip ahead until something needs your attention (up to 24 months)"} aria-label="Advance to next significant event">
        <FastForward size={17} />{!compact && <span>Next event</span>}
      </Button>
    </div>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const state = useS();
  const { dispatch, go } = useGame();
  const items = [...state.notifications].reverse().slice(0, 30);
  useEffect(() => { dispatch({ t: "markRead" }, { silent: true }); }, [dispatch]);
  return (
    <Modal title="Notifications" onClose={onClose}>
      {items.length === 0 ? <div className="g-small g-muted">Nothing yet.</div> : items.map((n) => (
        <div key={n.id} className="g-list-row">
          <Badge tone={n.level === "good" ? "green" : n.level === "bad" ? "red" : n.level === "warn" ? "amber" : "blue"}>{formatMonth(state, n.month)}</Badge>
          <div className="g-grow g-small">{n.text}</div>
          {n.link && <Button size="sm" onClick={() => { go(n.link as Tab); onClose(); }}>Open</Button>}
        </div>
      ))}
    </Modal>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const state = useS();
  const { tab, setTab, quitToTitle, lastSaved, version } = useGame();
  const nav = useNav();
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const [tour, setTour] = useState(() => { try { return typeof window !== "undefined" && !window.localStorage.getItem("nrtp-tour-seen") && state.clock.monthIndex === 0; } catch { return false; } });
  const closeTour = () => { setTour(false); try { window.localStorage.setItem("nrtp-tour-seen", "1"); } catch { /* storage blocked */ } };
  const unread = state.notifications.filter((n) => !n.read).length;
  void version;
  const primary: Tab[] = ["home", "life", "map", "politics"];
  const bottom = nav.filter((n) => primary.includes(n.id));
  const rest = nav.filter((n) => !primary.includes(n.id));
  const age = playerAge(state);

  return (
    <div className={cx("g-shell", collapsed && "collapsed")}>
      <aside className="g-side" aria-label="Main navigation">
        <div className="g-brand"><div className="g-brand-mark"><Landmark size={18} /></div><span>Road to Presidency</span></div>
        <nav className="g-col" style={{ gap: 2 }}>
          {nav.map((n) => (
            <button key={n.id} className="g-nav" aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)} title={n.label}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button className="g-nav" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronsRight size={ICON} /> : <><ChevronsLeft size={ICON} /><span>Collapse</span></>}</button>
        <button className="g-nav" onClick={quitToTitle} title="Save and return to the title screen"><Save size={ICON} /><span>Save &amp; quit</span></button>
      </aside>
      <div className="g-main">
        <header className="g-topbar">
          <div className="g-grow">
            <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{formatMonth(state, state.clock.monthIndex)}</div>
            <div className="g-tiny g-muted">{state.player.name}, age {age}{lastSaved ? ` · saved ${new Date(lastSaved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
          </div>
          <button className="g-btn g-btn-ghost" onClick={() => setTour(true)} aria-label="How to play" title="How to play" style={{ padding: 8 }}><HelpCircle size={20} /></button>
          <button className="g-btn g-btn-ghost" onClick={() => setNotifs(true)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} style={{ position: "relative", padding: 8 }}>
            <Bell size={20} />{unread > 0 && <span style={{ position: "absolute", top: 2, right: 2, background: "#e11d48", color: "#fff", borderRadius: 999, fontSize: 10, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontWeight: 700 }}>{unread > 9 ? "9+" : unread}</span>}
          </button>
          <TimeControls compact />
        </header>
        <main className="g-content" id="game-main">{children}</main>
      </div>
      <nav className="g-bottomnav" aria-label="Primary">
        {bottom.map((n) => <button key={n.id} className="g-bnav" aria-current={tab === n.id ? "page" : undefined} onClick={() => setTab(n.id)}>{n.icon}{n.label.replace("Nigeria ", "")}</button>)}
        <button className="g-bnav" aria-current={rest.some((r) => r.id === tab) ? "page" : undefined} onClick={() => setMore(true)}><MoreHorizontal size={ICON} />More</button>
      </nav>
      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <div className="g-grid g-grid-2 g-grid-keep2">
            {rest.map((n) => <Button key={n.id} onClick={() => { setTab(n.id); setMore(false); }}>{n.icon}{n.label}</Button>)}
            <Button onClick={() => { setMore(false); quitToTitle(); }}><X size={18} />Save &amp; quit</Button>
          </div>
        </Modal>
      )}
      {notifs && <NotificationsPanel onClose={() => setNotifs(false)} />}
      {tour && <Tutorial onClose={closeTour} />}
      {state.pending.length > 0 && <DecisionDialog />}
    </div>
  );
}
