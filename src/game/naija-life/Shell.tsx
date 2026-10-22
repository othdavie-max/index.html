"use client";

import { useMemo, useState } from "react";
import {
  Brain, Briefcase, ChevronRight, ClipboardList, Compass, Crown, Gavel, Heart, HeartPulse, Hourglass, Map as MapIcon, MapPin, Menu as MenuIcon,
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
export const EXPLORE_TABS: Tab[] = ["phone", "work", "health", "law", "map", "power", "legacy"];

const SECTION: Record<string, { label: () => string; blurb: () => string; icon: typeof Hourglass; tint: string; ink: string }> = {
  phone: { label: () => T("Phone", "Phone"), blurb: () => T("Wallet, dating, social, betting", "Wallet, dating, social, betting"), icon: Smartphone, tint: "bg-sky-100", ink: "text-sky-600" },
  work: { label: () => T("Work", "Work"), blurb: () => T("Jobs, school, business, skills", "Job, school, business, skills"), icon: Briefcase, tint: "bg-indigo-100", ink: "text-indigo-600" },
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
    <header className="px-4 pb-3 pt-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-full bg-sky-100 p-1 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.45)]">
          <Avatar look={shownLook(p)} gender={p.gender} age={p.age} mood={p.stats.happiness} size={64} dim={!p.alive} round />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[21px] font-extrabold leading-tight tracking-tight text-[#0b2a6b]">{p.name} {p.surname}</h1>
            <Flag />
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[13px] font-bold text-emerald-700">
            <User size={14} strokeWidth={2.6} />
            {stageLabel(p)}
            <ChevronRight size={14} strokeWidth={2.6} />
          </div>
          <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-slate-600">
            <MapPin size={14} className="shrink-0 text-red-500" fill="currentColor" />
            <span className="truncate">{st.name}, {T("Nigeria", "Naija")} · {title}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <button type="button" onClick={onWallet} className="flex flex-1 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-3.5 py-2.5 text-left shadow-[0_6px_18px_-12px_rgba(37,99,235,0.6)]" aria-label={T("Wallet", "Wallet")}>
          <Wallet size={26} className="shrink-0 text-blue-600" strokeWidth={2.2} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[19px] font-extrabold leading-tight text-[#0b2a6b]">{naira(p.money)}</span>
            <span className="block text-[11.5px] font-medium text-slate-500">{T("Wallet Balance", "Wallet Balance")}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-400" />
        </button>
        <button type="button" onClick={onMenu} className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-[#0b2a6b] shadow-[0_6px_18px_-12px_rgba(30,64,175,0.5)]" aria-label={T("Menu", "Menu")}>
          <MenuIcon size={24} strokeWidth={2.6} />
          {alerts > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{alerts}</span>}
        </button>
      </div>
    </header>
  );
}

function StatCell({ icon: Icon, label, value, tint, ink, bar, invert }: { icon: typeof Heart; label: string; value: number; tint: string; ink: string; bar: string; invert?: boolean }) {
  const v = Math.round(value);
  const low = invert ? v > 70 : v < 30;
  return (
    <div className="flex min-w-0 items-center gap-1 px-1.5 py-2.5">
      <span className={cx("flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full", tint)}><Icon size={13} className={ink} strokeWidth={2.4} fill={Icon === Heart ? "currentColor" : "none"} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1 text-[9px] font-bold tracking-tighter text-slate-700">
          <span className="truncate">{label}</span>
          <span className={cx("shrink-0 text-[9px] font-semibold", low ? "text-red-500" : "text-slate-500")}>{v}%</span>
        </div>
        <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, v))}%`, background: bar }} />
        </div>
      </div>
    </div>
  );
}

export function StatsCard({ p }: { p: Player }) {
  const s = p.stats;
  return (
    <section className="mx-4 grid grid-cols-4 divide-x divide-slate-100 rounded-3xl border border-slate-100 bg-white shadow-[0_8px_26px_-12px_rgba(30,64,175,0.28)]" aria-label={T("Your stats", "Your stats")}>
      <StatCell icon={Heart} label={T("Health", "Health")} value={s.health} tint="bg-rose-100" ink="text-rose-500" bar="#22c55e" />
      <StatCell icon={Smile} label={T("Happy", "Happy")} value={s.happiness} tint="bg-amber-100" ink="text-amber-500" bar="#fbbf24" />
      <StatCell icon={Brain} label={T("Smart", "Smart")} value={s.smarts} tint="bg-violet-100" ink="text-violet-600" bar="#8b5cf6" />
      <StatCell icon={Sparkles} label={T("Looks", "Looks")} value={s.looks} tint="bg-pink-100" ink="text-pink-500" bar="#ec4899" />
      <div className="col-span-4 border-t border-slate-100" />
      <StatCell icon={Zap} label={T("Stress", "Stress")} value={s.stress} tint="bg-orange-100" ink="text-orange-500" bar="#f97316" invert />
      <StatCell icon={Users} label={T("Connect", "Connect")} value={s.connections} tint="bg-teal-100" ink="text-teal-600" bar="#14b8a6" />
      <StatCell icon={ShieldCheck} label={T("Rep", "Rep")} value={s.reputation} tint="bg-blue-100" ink="text-blue-600" bar="#3b82f6" />
      <StatCell icon={Users} label={T("Family", "Family")} value={p.family.happy} tint="bg-indigo-100" ink="text-indigo-600" bar="#6366f1" />
    </section>
  );
}

/** The sections that are not on the bottom bar. */
export function ExploreHub({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {EXPLORE_TABS.map((id) => {
        const s = SECTION[id];
        const Icon = s.icon;
        return (
          <button key={id} type="button" onClick={() => setTab(id)} className="flex flex-col items-start gap-2 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-[0_8px_22px_-14px_rgba(30,64,175,0.35)] transition active:scale-[0.98]">
            <span className={cx("flex h-11 w-11 items-center justify-center rounded-2xl", s.tint)}><Icon size={22} className={s.ink} /></span>
            <span className="text-[16px] font-extrabold text-[#0b2a6b]">{s.label()}</span>
            <span className="text-[11.5px] leading-snug text-slate-500">{s.blurb()}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ExploreChips({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={T("Sections", "Sections")}>
      {EXPLORE_TABS.map((id) => (
        <button key={id} type="button" onClick={() => setTab(id)} className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition", tab === id ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200")}>
          {SECTION[id].label()}
        </button>
      ))}
    </div>
  );
}

const NAV: { id: Tab; label: () => string; icon: typeof Hourglass }[] = [
  { id: "life", label: () => T("Life", "Life"), icon: Hourglass },
  { id: "money", label: () => T("Money", "Money"), icon: Wallet },
  { id: "family", label: () => T("Family", "Family"), icon: Users },
  { id: "explore", label: () => T("Explore", "Explore"), icon: Compass },
];

export function BottomBar({ tab, setTab, p, busy, onGrow }: { tab: Tab; setTab: (t: Tab) => void; p: Player; busy: boolean; onGrow: () => void }) {
  const group = EXPLORE_TABS.includes(tab) || tab === "explore" ? "explore" : tab;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[30px] border-t border-slate-100 bg-white/95 px-4 pt-3 shadow-[0_-12px_30px_-14px_rgba(30,64,175,0.3)] backdrop-blur">
      <button
        type="button"
        disabled={busy || !p.alive}
        onClick={onGrow}
        className="flex h-14 w-full items-center rounded-full bg-gradient-to-b from-[#2f86ff] to-[#1263e8] px-5 text-white shadow-[0_10px_22px_-8px_rgba(18,99,232,0.75)] transition active:scale-[0.99] disabled:opacity-50"
      >
        <TrendingUp size={22} strokeWidth={2.6} />
        <span className="mx-3 h-6 w-px bg-white/35" />
        <span className="flex-1 text-left text-[18px] font-extrabold tracking-tight">{T("Grow Up", "Grow Up")}<span className="ml-2 text-[13px] font-semibold text-white/75">→ {p.age + 1}</span></span>
        <ChevronRight size={22} strokeWidth={2.8} />
      </button>
      <nav className="mt-2 flex items-start justify-around pb-2" aria-label="Game sections">
        {NAV.map((t) => {
          const Icon = t.icon;
          const on = group === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1 outline-none" aria-current={on ? "page" : undefined}>
              <span className={cx("flex min-w-[72px] flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-[12px] font-bold transition", on ? "bg-blue-50 text-blue-600" : "text-slate-400")}>
                <Icon size={22} strokeWidth={on ? 2.5 : 2} />
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
export function LifeFeed({ g, run }: { g: Game; run: (a: Action) => void }) {
  const p = g.p;
  const [open, setOpen] = useState(false);
  const logs = useMemo(() => [...p.log].reverse(), [p.log]);
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_8px_26px_-12px_rgba(30,64,175,0.28)]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-1 py-1 text-left" aria-expanded={open}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100"><ClipboardList size={22} className="text-blue-600" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-extrabold leading-tight tracking-tight text-[#0b2a6b]">{T("Activities", "Activities")}</span>
          <span className="block text-[13px] text-slate-500">{T(`${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} left this year`, `${p.actionsLeft} action${p.actionsLeft === 1 ? "" : "s"} remain this year`)}</span>
        </span>
        <ChevronRight size={20} className={cx("shrink-0 text-slate-500 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ACTIVITIES.filter((a) => p.age >= a.minAge - 2).map((a) => {
            const block = activityBlock(p, a);
            return (
              <button key={a.id} type="button" disabled={Boolean(block)} onClick={() => run({ t: "activity", id: a.id })} className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5 text-left text-xs transition hover:bg-blue-50 disabled:opacity-45">
                <span className="block font-bold text-[#0b2a6b]">{a.label}</span>
                <span className="block text-[11px] text-slate-500">{block ?? (a.cost ? `${naira(a.cost * p.index)} · ${a.desc}` : a.desc)}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <ol className="relative space-y-2.5">
          {logs.map((e, idx) => {
            const c = DOTS[(e.age + 5) % DOTS.length];
            return (
              <li key={`${e.age}-${idx}`} className="relative flex gap-3">
                <div className="relative flex w-5 shrink-0 justify-center">
                  {idx < logs.length - 1 && <span className="absolute top-5 -bottom-3 w-px bg-slate-200" />}
                  <span className="relative z-10 mt-4 h-4 w-4 rounded-full ring-4 ring-white" style={{ background: c.dot }} />
                </div>
                <div className={cx("flex-1 rounded-2xl bg-slate-50/90 px-3.5 py-3", idx === 0 && "ring-1 ring-blue-200")}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[18px] font-extrabold leading-tight text-[#0b2a6b]">{T("Age", "Age")} {e.age}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className={cx("rounded-full px-2.5 py-0.5 text-[12px] font-bold", c.chip)}>{stageOf(e.age)}</span>
                    </span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {e.lines.map((l, i) => <li key={i} className="text-[13.5px] leading-snug text-slate-600">{l}</li>)}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
