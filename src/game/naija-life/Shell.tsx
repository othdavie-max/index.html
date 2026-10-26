"use client";

import { TONE_STYLE, toneOf } from "./tone";
import { EconStrip } from "./EconUI";
import { DailyCard, ProgressCard } from "./LifeUI";
import { useMemo, useState } from "react";
import type React from "react";
import {
  Baby, Backpack, Brain, Briefcase, Flag as FlagIcon, GraduationCap, School, ChevronRight, Compass, Crown, Gavel, Heart, HeartPulse, Hourglass, Map as MapIcon, MapPin, Menu as MenuIcon,
  ShieldCheck, Smartphone, Smile, Sparkles, Trophy, TrendingUp, User, Users, Wallet, Zap,
} from "lucide-react";
import { ACTIVITIES, activityBlock, type Action } from "./engine";
import { Avatar } from "./Avatar";
import { STATE_BY_ID } from "./data";
import { jobTitle } from "./helpers";
import { displayLook, type Look } from "./look";
import { officeTitle } from "./politics";
import type { Game, Player } from "./types";
import { cx } from "./ui";
import { T, naira } from "./util";

export type Tab = "life" | "phone" | "work" | "money" | "family" | "health" | "law" | "map" | "power" | "legacy" | "explore";
export const EXPLORE_TABS: Tab[] = ["phone", "health", "law", "map", "power", "legacy"];

const SECTION: Record<string, { label: () => string; blurb: () => string; icon: typeof Hourglass; tint: string; ink: string }> = {
  phone: { label: () => T("Phone", "Phone"), blurb: () => T("Wallet, dating, social, betting", "Wallet, dating, social, betting"), icon: Smartphone, tint: "bg-sky-100", ink: "text-sky-600" },
  work: { label: () => T("Work", "Work"), blurb: () => T("Jobs, businesses, school, skills", "Job, business, school, skills"), icon: Briefcase, tint: "bg-indigo-100", ink: "text-indigo-600" },
  health: { label: () => T("Health", "Health"), blurb: () => T("Doctors, insurance, fitness", "Doctor, insurance, fitness"), icon: HeartPulse, tint: "bg-rose-100", ink: "text-rose-500" },
  law: { label: () => T("Law", "Law"), blurb: () => T("Police, courts, your record", "Police, court, your record"), icon: Gavel, tint: "bg-amber-100", ink: "text-amber-600" },
  map: { label: () => T("Map", "Map"), blurb: () => T("Travel and move states", "Travel and change state"), icon: MapIcon, tint: "bg-emerald-100", ink: "text-emerald-600" },
  power: { label: () => T("Power", "Power"), blurb: () => T("Politics and government", "Politics and government"), icon: Crown, tint: "bg-violet-100", ink: "text-violet-600" },
  legacy: { label: () => T("Legacy", "Legacy"), blurb: () => T("Your family line and awards", "Your family line and awards"), icon: Trophy, tint: "bg-teal-100", ink: "text-teal-600" },
};

/** The part of life you are in. */
export function stageLabel(p: Player): string {
  if (!p.alive) return T("Passed away", "Don die");
  if (p.prison > 0) return T("In prison", "For prison");
  const a = p.age;
  if (a < 3) return T("Baby", "Baby");
  if (a < 13) return T("Child", "Pikin");
  if (a < 20) return T("Teen", "Teenager");
  if (a < 60) return T("Adult", "Adult");
  return T("Elder", "Elder");
}

function shownLook(p: Player): Look {
  return displayLook(p.look, {
    age: p.age,
    student: Boolean(p.school) && p.school?.stage !== "tertiary",
    soldier: p.job?.id === "soldier",
    office: p.politics?.office,
    military: p.politics?.militaryRuler,
  });
}

const Flag = () => (
  <span className="inline-flex h-4 w-6 overflow-hidden rounded-[3px] shadow-sm" aria-hidden>
    <span className="flex-1 bg-[#1f9d55]" /><span className="flex-1 bg-white" /><span className="flex-1 bg-[#1f9d55]" />
  </span>
);

export function GameHeader({ p, onMenu, onWallet, alerts }: { p: Player; onMenu: () => void; onWallet: () => void; alerts: number }) {
  const st = STATE_BY_ID[p.state];
  const title = officeTitle(p) ?? jobTitle(p);
  return (
    <header className="px-4 pb-1.5 pt-1.5">
      <div className="flex items-center gap-2">
        <div data-tour="avatar" className="shrink-0 rounded-full bg-sky-100 p-px">
          <Avatar look={shownLook(p)} gender={p.gender} age={p.age} mood={p.stats.happiness} size={28} dim={!p.alive} round />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-extrabold leading-tight tracking-tight text-[#0b2a6b]">{p.name} {p.surname}</h1>
            <Flag />
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <User size={11} strokeWidth={2.6} />
            {stageLabel(p)}
          </div>
        </div>
        <button data-tour="wallet" type="button" onClick={onWallet} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/80 px-2.5 py-1.5 text-left" aria-label={T("Wallet", "Wallet")}>
          <Wallet size={16} className="shrink-0 text-blue-600" strokeWidth={2.2} />
          <span className="block">
            <span className="block max-w-[84px] truncate text-[13px] font-extrabold leading-tight text-[#0b2a6b]">{naira(p.money)}</span>
            <span className="block text-[9.5px] leading-tight text-slate-500">{T("Wallet", "Wallet")}</span>
          </span>
          <ChevronRight size={13} className="shrink-0 text-slate-400" />
        </button>
        <button data-tour="menu" type="button" onClick={onMenu} className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-[#0b2a6b] shadow-sm" aria-label={T("Menu", "Menu")}>
          <MenuIcon size={18} strokeWidth={2.5} />
          {alerts > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{alerts}</span>}
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
        <MapPin size={12} className="shrink-0 text-red-500" fill="currentColor" />
        <span className="truncate">{st.name}, {T("Nigeria", "Naija")} · {title} · {T("Age", "Age")} {p.age}</span>
      </div>
    </header>
  );
}

function StatCell({ icon: Icon, label, value, tint, ink, bar, invert }: { icon: typeof Heart; label: string; value: number; tint: string; ink: string; bar: string; invert?: boolean }) {
  const v = Math.round(value);
  const low = invert ? v > 70 : v < 30;
  return (
    <div className="min-w-0 px-2 py-2">
      <div className="flex items-center justify-between gap-1">
        <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", tint)}><Icon size={12} className={ink} strokeWidth={2.4} fill={Icon === Heart ? "currentColor" : "none"} /></span>
        <span className={cx("text-[12px] font-extrabold tabular-nums", low ? "text-red-500" : "text-[#0b2a6b]")}>{v}%</span>
      </div>
      <div className="mt-1 text-[10.5px] font-semibold leading-tight text-slate-600">{label}</div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, v))}%`, background: bar }} />
      </div>
    </div>
  );
}

export function StatsCard({ p, compact, onOpen }: { p: Player; compact?: boolean; onOpen?: () => void }) {
  const s = p.stats;
  if (compact) {
    const items: [typeof Heart, number, string, boolean?][] = [[Heart, s.health, "text-rose-500"], [Smile, s.happiness, "text-amber-500"], [Brain, s.smarts, "text-violet-600"], [Sparkles, s.looks, "text-pink-500"], [Zap, s.stress, "text-orange-500", true], [Users, s.connections, "text-teal-600"], [ShieldCheck, s.reputation, "text-blue-600"]];
    return (
      <button type="button" data-tour="stats" onClick={onOpen} className="mx-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl border border-slate-100 bg-white px-2.5 py-1.5 shadow-[0_6px_20px_-12px_rgba(30,64,175,0.3)]" aria-label={T("Your stats. Tap for your life story.", "Your stats. Tap for your life story.")}>
        {items.map(([Icon, v, ink, inv], i) => { const val = Math.round(v); const low = inv ? val > 70 : val < 30; return (
          <span key={i} className="flex items-center gap-0.5"><Icon size={12} className={ink} strokeWidth={2.4} fill={Icon === Heart ? "currentColor" : "none"} /><span className={cx("text-[11.5px] font-extrabold tabular-nums", low ? "text-red-500" : "text-[#0b2a6b]")}>{val}</span></span>
        ); })}
      </button>
    );
  }
  return (
    <section data-tour="stats" className="mx-4 grid grid-cols-4 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-[0_6px_20px_-12px_rgba(30,64,175,0.3)]" aria-label={T("Your stats", "Your stats")}>
      <StatCell icon={Heart} label={T("Health", "Health")} value={s.health} tint="bg-rose-100" ink="text-rose-500" bar="#22c55e" />
      <StatCell icon={Smile} label={T("Happiness", "Happiness")} value={s.happiness} tint="bg-amber-100" ink="text-amber-500" bar="#fbbf24" />
      <StatCell icon={Brain} label={T("Smarts", "Smarts")} value={s.smarts} tint="bg-violet-100" ink="text-violet-600" bar="#8b5cf6" />
      <StatCell icon={Sparkles} label={T("Looks", "Looks")} value={s.looks} tint="bg-pink-100" ink="text-pink-500" bar="#ec4899" />
      <div className="col-span-4 border-t border-slate-100" />
      <StatCell icon={Zap} label={T("Stress", "Stress")} value={s.stress} tint="bg-orange-100" ink="text-orange-500" bar="#f97316" invert />
      <StatCell icon={Users} label={T("Connections", "Connections")} value={s.connections} tint="bg-teal-100" ink="text-teal-600" bar="#14b8a6" />
      <StatCell icon={ShieldCheck} label={T("Reputation", "Reputation")} value={s.reputation} tint="bg-blue-100" ink="text-blue-600" bar="#3b82f6" />
      <StatCell icon={Users} label={T("Family", "Family")} value={p.family.happy} tint="bg-indigo-100" ink="text-indigo-600" bar="#6366f1" />
    </section>
  );
}

/** The sections that are not on the bottom bar. */
const EXPLORE_EMOJI: Partial<Record<Tab, string>> = { phone: "📱", work: "💼", health: "🏥", law: "⚖️", map: "🗺️", power: "🏛️", legacy: "🕯️" };
const EXPLORE_GROUPS: { title: () => string; ids: Tab[] }[] = [
  { title: () => T("Everyday", "Everyday"), ids: ["phone", "health"] },
  { title: () => T("Big moves", "Big moves"), ids: ["law", "map", "power", "legacy"] },
];
const EXPLORE_TILE: Partial<Record<Tab, string>> = { phone: "bg-sky-100", work: "bg-amber-100", health: "bg-rose-100", law: "bg-indigo-100", map: "bg-emerald-100", power: "bg-yellow-100", legacy: "bg-violet-100" };

export function ExploreHub({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <div className="space-y-4">
      {EXPLORE_GROUPS.map((g) => (
        <section key={g.title()}>
          <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{g.title()}</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
            {g.ids.map((id) => {
              const s = SECTION[id];
              return (
                <button key={id} type="button" onClick={() => setTab(id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-slate-50">
                  <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[24px]", EXPLORE_TILE[id])}>{EXPLORE_EMOJI[id]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold leading-tight text-[#0b2a6b]">{s.label()}</span>
                    <span className="block text-[12px] leading-snug text-slate-500">{s.blurb()}</span>
                  </span>
                  <span className="shrink-0 text-xl font-black text-blue-500">›</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ExploreChips({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={T("Sections", "Sections")}>
      {EXPLORE_TABS.map((id) => (
        <button key={id} type="button" onClick={() => setTab(id)} className={cx("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition", tab === id ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200")}>
          {SECTION[id].label()}
        </button>
      ))}
    </div>
  );
}

/** What the first tab is called depends on where you are in life. */
export type WorkStage = "infant" | "nursery" | "primary" | "secondary" | "admission" | "university" | "trade" | "nysc" | "work";
export function workStage(p: Player): WorkStage {
  if (p.flags.nyscServing === true) return "nysc";
  const sc = p.school;
  if (sc?.stage === "primary") return "primary";
  if (sc?.stage === "secondary") return "secondary";
  if (sc?.stage === "tertiary") return sc.type === "university" || sc.type === "postgrad" || sc.type === "polytechnic" ? "university" : "trade";
  if (p.flags.admOpen) return "admission";
  if (p.age < 3) return "infant";
  if (p.age < 6) return "nursery";
  return "work";
}
const STAGE_TAB: Record<WorkStage, { label: () => string; icon: typeof Hourglass }> = {
  infant: { label: () => T("Infant", "Infant"), icon: Baby },
  nursery: { label: () => T("Nursery", "Nursery"), icon: Baby },
  primary: { label: () => T("Primary", "Primary"), icon: Backpack },
  secondary: { label: () => T("Secondary", "Secondary"), icon: School },
  admission: { label: () => T("University", "University"), icon: GraduationCap },
  university: { label: () => T("University", "University"), icon: GraduationCap },
  trade: { label: () => T("Training", "Training"), icon: GraduationCap },
  nysc: { label: () => T("NYSC", "NYSC"), icon: FlagIcon },
  work: { label: () => T("Work", "Work"), icon: Briefcase },
};
const NAV: { id: Tab; label: () => string; icon: typeof Hourglass }[] = [
  { id: "work", label: () => T("Work", "Work"), icon: Briefcase },
  { id: "money", label: () => T("Money", "Money"), icon: Wallet },
  { id: "family", label: () => T("Family", "Family"), icon: Users },
  { id: "explore", label: () => T("Explore", "Explore"), icon: Compass },
];

export function BottomBar({ tab, setTab, p, busy, onGrow }: { tab: Tab; setTab: (t: Tab) => void; p: Player; busy: boolean; onGrow: () => void }) {
  const group = EXPLORE_TABS.includes(tab) || tab === "explore" ? "explore" : tab;
  // The life story is the home screen: tapping the open section closes it.
  const toggle = (id: Tab) => setTab(id === "explore" ? (tab === "explore" ? "life" : "explore") : tab === id ? "life" : id);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[24px] border-t border-slate-100 bg-white/95 px-4 pt-2.5 shadow-[0_-12px_30px_-14px_rgba(30,64,175,0.3)] backdrop-blur">
      <button
        type="button"
        disabled={busy || !p.alive}
        onClick={onGrow}
        data-sfx="grow" data-tour="grow" className="flex h-11 w-full items-center rounded-full bg-gradient-to-b from-[#2f86ff] to-[#1263e8] px-5 text-white shadow-[0_10px_22px_-8px_rgba(18,99,232,0.75)] transition active:scale-[0.99] disabled:opacity-50"
      >
        <TrendingUp size={18} strokeWidth={2.6} />
        <span className="mx-2.5 h-5 w-px bg-white/35" />
        <span className="flex-1 text-left text-[15px] font-extrabold tracking-tight">{T("Grow Up", "Grow Up")}<span className="ml-2 text-[12px] font-semibold text-white/75">→ {p.age + 1}</span></span>
        <ChevronRight size={18} strokeWidth={2.8} />
      </button>
      <nav data-tour="nav" className="mt-1.5 flex items-start justify-around pb-2" aria-label="Game sections">
        {NAV.map((t0) => {
          const t = t0.id === "work" ? { ...t0, ...STAGE_TAB[workStage(p)] } : t0;
          const Icon = t.icon;
          const on = group === t.id;
          return (
            <button key={t.id} data-sfx="page" data-tour={`tab-${t.id}`} type="button" onClick={() => toggle(t.id)} className="flex flex-col items-center gap-0.5 outline-none" aria-current={on ? "page" : undefined}>
              <span className={cx("flex min-w-[64px] flex-col items-center gap-0.5 rounded-2xl px-3 py-1 text-[11px] font-bold transition", on ? "bg-blue-50 text-blue-600" : "text-slate-400")}>
                <Icon size={19} strokeWidth={on ? 2.5 : 2} />
                {t.label()}
              </span>
              <span className={cx("h-1 w-6 rounded-full", on ? "bg-blue-600" : "bg-transparent")} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const DOTS = [
  { dot: "#10b981", chip: "bg-emerald-100 text-emerald-700" },
  { dot: "#3b82f6", chip: "bg-blue-100 text-blue-700" },
  { dot: "#8b5cf6", chip: "bg-violet-100 text-violet-700" },
  { dot: "#ec4899", chip: "bg-pink-100 text-pink-600" },
  { dot: "#f59e0b", chip: "bg-amber-100 text-amber-700" },
];

function stageOf(age: number): string {
  if (age < 3) return T("Baby", "Baby");
  if (age < 13) return T("Child", "Pikin");
  if (age < 20) return T("Teen", "Teenager");
  if (age < 60) return T("Adult", "Adult");
  return T("Elder", "Elder");
}

/** Activities (collapsible) and the life story as a timeline. */
const ACT_EMOJI: Record<string, string> = { study: "📚", gym: "⚽", worship: "🙏", hawk: "🛍️", network: "🥂", gig: "💵", date: "❤️", godfather: "🤝" };
const ACT_SHORT: Record<string, () => string> = {
  study: () => T("Study", "Read"), gym: () => T("Exercise", "Exercise"), worship: () => T("Worship", "Worship"), hawk: () => T("Hawk", "Hawk"),
  network: () => T("Network", "Network"), gig: () => T("Side gig", "Side gig"), date: () => T("Love", "Love"), godfather: () => T("Godfather", "Godfather"),
};
const ACT_HINT: Record<string, () => string> = {
  study: () => T("Better grades", "Better grade"), gym: () => T("Get fit", "Get fit"), worship: () => T("Peace of mind", "Peace of mind"), hawk: () => T("Small money", "Small money"),
  network: () => T("Meet people", "Meet people"), gig: () => T("Quick cash", "Quick cash"), date: () => T("Find love", "Find love"), godfather: () => T("Powerful backer", "Powerful backer"),
};
const ACT_TILE: Record<string, string> = { study: "bg-violet-100", gym: "bg-emerald-100", worship: "bg-amber-100", hawk: "bg-orange-100", network: "bg-pink-100", gig: "bg-green-100", date: "bg-rose-100", godfather: "bg-sky-100" };

const MONEY_LINE = /^(Money this year|Money for this year)/i;

/** One year of the story. The newest year is the hero card; older years fold away. */
function YearLines({ lines, animate }: { lines: string[]; animate?: boolean }) {
  const main = lines.filter((l) => !MONEY_LINE.test(l));
  const money = lines.find((l) => MONEY_LINE.test(l));
  return (
    <>
      <ul className="space-y-1.5">
        {main.map((l, i) => { const tn = TONE_STYLE[toneOf(l)]; return (
          <li key={i} className={cx("flex gap-2 rounded-xl px-2 py-1.5 text-[13.5px] leading-snug", tn.text, tn.bg || "bg-slate-50", animate && "nl-line")} style={animate ? { animationDelay: `${120 + i * 140}ms` } : undefined}>
            <span className={cx("my-0.5 w-1 shrink-0 rounded-full", tn.bar)} aria-hidden />
            <span className="min-w-0 flex-1">{l}</span>
          </li>
        ); })}
      </ul>
      {money && <p className={cx("mt-2 rounded-xl bg-blue-50/70 px-2.5 py-1.5 text-[11.5px] font-semibold text-blue-900", animate && "nl-line")} style={animate ? { animationDelay: `${120 + main.length * 140}ms` } : undefined}>💰 {money}</p>}
    </>
  );
}

function headline(lines: string[]): string {
  const main = lines.filter((l) => !MONEY_LINE.test(l));
  return main.find((l) => toneOf(l) !== "neutral") ?? main[0] ?? lines[0] ?? "";
}

export function LifeFeed({ g, run, afterYear }: { g: Game; run: (a: Action) => void; afterYear?: React.ReactNode }) {
  const p = g.p;
  const [open, setOpen] = useState(true);
  const [openAge, setOpenAge] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const logs = useMemo(() => [...p.log].reverse(), [p.log]);
  const latest = logs[0];
  const older = logs.slice(1);
  const shown = showAll ? older : older.slice(0, 6);
  return (
    <div className="space-y-3">
      <style>{`@keyframes nlline{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.nl-line{animation:nlline .45s ease-out both}@keyframes nlcard{0%{transform:scale(.97);box-shadow:0 0 0 0 rgba(37,99,235,.35)}60%{transform:scale(1.01)}100%{transform:none;box-shadow:0 0 0 10px rgba(37,99,235,0)}}.nl-card{animation:nlcard .6s ease-out both}`}</style>
      {latest && (
        <section data-tour="timeline" key={`year-${latest.age}-${p.log.length}`} className="nl-card rounded-3xl border border-blue-100 bg-white p-3.5 shadow-[0_14px_30px_-18px_rgba(30,64,175,0.55)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-black leading-none tracking-tight text-[#0b2a6b]">{T("Age", "Age")} {latest.age}</span>
              <span className="text-[12px] font-semibold text-slate-400">{p.birthYear + latest.age}</span>
            </div>
            <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold", DOTS[(latest.age + 5) % DOTS.length].chip)}>{stageOf(latest.age)}</span>
          </div>
          <YearLines lines={latest.lines} animate />
        </section>
      )}
      {afterYear}
      <section>
        <button type="button" onClick={() => setOpen(!open)} data-tour="activities" className="mb-1.5 flex w-full items-center justify-between px-1" aria-expanded={open}>
          <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Do something this year", "Do something this year")}{p.actionsLeft > 0 && p.alive && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" /></span>}</span>
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-slate-500">{T(`${p.actionsLeft} left`, `${p.actionsLeft} remain`)}<ChevronRight size={15} className={cx("transition-transform", open && "rotate-90")} /></span>
        </button>
        {open && (
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIVITIES.filter((a) => p.age >= a.minAge - 2).map((a) => {
              const block = activityBlock(p, a);
              return (
                <button key={a.id} type="button" disabled={Boolean(block)} title={block ?? a.desc} onClick={() => run({ t: "activity", id: a.id })} className="flex flex-col items-center gap-0.5 rounded-2xl border border-slate-100 bg-white px-1 py-2 shadow-[0_6px_16px_-12px_rgba(30,64,175,0.4)] transition active:scale-[0.95] disabled:opacity-45">
                  <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl text-[20px]", ACT_TILE[a.id] ?? "bg-slate-100")}>{ACT_EMOJI[a.id] ?? "✨"}</span>
                  <span className="w-full truncate text-center text-[12px] font-extrabold leading-tight text-[#0b2a6b]">{ACT_SHORT[a.id]?.() ?? a.label}</span>
                  <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-slate-500">{block ? (a.cost && p.money < a.cost * p.index ? T("Needs ", "Need ") + naira(a.cost * p.index) : block) : a.cost ? naira(a.cost * p.index) : ACT_HINT[a.id]?.() ?? ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <ProgressCard p={p} />
      <DailyCard p={p} run={run} />
      <EconStrip p={p} />
      {older.length > 0 && (
        <section>
          <h2 className="mb-1.5 px-1 text-[12px] font-extrabold uppercase tracking-wide text-slate-500">{T("Earlier years", "Earlier years")}</h2>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)]">
            {shown.map((e, idx) => {
              const isOpen = openAge === e.age;
              const h = headline(e.lines);
              const tn = TONE_STYLE[toneOf(h)];
              return (
                <div key={`${e.age}-${idx}`}>
                  <button type="button" onClick={() => setOpenAge(isOpen ? null : e.age)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:bg-slate-50" aria-expanded={isOpen}>
                    <span className={cx("flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-bold leading-none", DOTS[(e.age + 5) % DOTS.length].chip)}><span className="text-[15px] font-black">{e.age}</span>{T("yrs", "yrs")}</span>
                    <span className={cx("my-1 w-1 shrink-0 self-stretch rounded-full", tn.bar)} aria-hidden />
                    <span className={cx("min-w-0 flex-1 text-[12.5px] leading-snug text-slate-700", !isOpen && "line-clamp-2")}>{h}</span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">{e.lines.length > 1 && !isOpen ? `+${e.lines.length - 1}` : ""}</span>
                    <ChevronRight size={15} className={cx("shrink-0 text-slate-400 transition-transform", isOpen && "rotate-90")} />
                  </button>
                  {isOpen && <div className="px-3 pb-3"><YearLines lines={e.lines.filter((l) => l !== h)} /></div>}
                </div>
              );
            })}
          </div>
          {older.length > 6 && <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 w-full rounded-full bg-white py-2 text-[12.5px] font-bold text-blue-700 shadow-sm ring-1 ring-slate-200">{showAll ? T("Show fewer years", "Show small years") : T(`Show all ${older.length} years`, `Show all ${older.length} years`)}</button>}
        </section>
      )}
    </div>
  );
}
