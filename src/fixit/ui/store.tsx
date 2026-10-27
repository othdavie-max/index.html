"use client";
/** UI ↔ engine bridge. The engine mutates one FixState in place; a version counter triggers re-renders. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { newGame } from "../engine/init";
import { advanceMonth } from "../engine/sim";
import { advance as advanceCmd, type Result } from "../engine/actions";
import type { Achievement, Echo, FixState, GameEvent, NewsItem, Snap } from "../engine/types";
import { setPromises } from "../engine/promises";
import type { SetupOptions } from "../engine/setup";
import { hallEntry } from "../persistence";
import { monthLabel, snap } from "../engine/util";
import { FixSaves, FixSaveError, type Slot } from "../persistence";

export type Tab = "world" | "presidency" | "map" | "policies" | "projects" | "nation" | "news" | "assembly" | "power" | "cabinet" | "moves" | "street" | "advisers";
export interface Change { label: string; from: string; to: string; tone: "good" | "bad" | "neutral" }
export interface MonthSummary { from: string; to: string; months: number; changes: Change[]; events: GameEvent[]; news: NewsItem[]; echoes: Echo[]; achievements: Achievement[]; headline?: NewsItem }
export interface Toast { id: number; text: string; bad: boolean }

interface Ctx {
  state: FixState | null;
  version: number;
  screen: "title" | "play";
  tab: Tab;
  setTab: (t: Tab) => void;
  act: (fn: (s: FixState) => Result, opts?: { silent?: boolean }) => Result;
  advance: (months?: number) => void;
  summary: MonthSummary | null;
  closeSummary: () => void;
  startNew: (seed?: number, promises?: string[], setup?: SetupOptions) => void;
  continueTerm: () => void;
  loadSlot: (slot: Slot) => Promise<boolean>;
  saveSlot: (slot: Slot) => Promise<boolean>;
  saves: FixSaves;
  hasAuto: boolean;
  quit: () => void;
  toast: (text: string, bad?: boolean) => void;
  toasts: Toast[];
  select: { state: string | null; lga: string | null };
  setSelect: (v: { state: string | null; lga: string | null }) => void;
  lastSaved: number | null;
  error: string | null;
  clearError: () => void;
}
const C = createContext<Ctx | null>(null);
export const useFix = () => { const c = useContext(C); if (!c) throw new Error("useFix outside provider"); return c; };
export const useS = (): FixState => { const { state } = useFix(); if (!state) throw new Error("no game"); return state; };

const pctChange = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / a) * 100);
function diffSummary(a: Snap, b: Snap): Change[] {
  const out: Change[] = [];
  const add = (label: string, from: string, to: string, delta: number, goodWhenDown: boolean, min: number) => {
    if (Math.abs(delta) < min) return;
    out.push({ label, from, to, tone: (delta < 0) === goodWhenDown ? "good" : "bad" });
  };
  add("Naira per dollar", `₦${a.fx.toLocaleString()}`, `₦${b.fx.toLocaleString()}`, pctChange(a.fx, b.fx), true, 0.6);
  add("Inflation", `${a.inflation}%`, `${b.inflation}%`, b.inflation - a.inflation, true, 0.4);
  add("Food prices (yearly)", `${a.foodInflation}%`, `${b.foodInflation}%`, b.foodInflation - a.foodInflation, true, 0.8);
  add("Petrol per litre", `₦${a.fuel}`, `₦${b.fuel}`, pctChange(a.fuel, b.fuel), true, 2);
  add("Unemployment", `${a.unemployment}%`, `${b.unemployment}%`, b.unemployment - a.unemployment, true, 0.15);
  add("Happiness", `${Math.round(a.happiness)}`, `${Math.round(b.happiness)}`, b.happiness - a.happiness, false, 1);
  add("Electricity (MW)", a.power.toLocaleString(), b.power.toLocaleString(), b.power - a.power, false, 60);
  add("Security risk", `${Math.round(a.insecurity)}`, `${Math.round(b.insecurity)}`, b.insecurity - a.insecurity, true, 0.6);
  add("Government cash", `₦${Math.round(a.treasury).toLocaleString()}bn`, `₦${Math.round(b.treasury).toLocaleString()}bn`, pctChange(a.treasury, b.treasury), false, 15);
  add("Dollar reserves", `$${a.reserves}bn`, `$${b.reserves}bn`, b.reserves - a.reserves, false, 0.5);
  return out.slice(0, 7);
}

export function FixProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<FixState | null>(null);
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState<"title" | "play">("title");
  const [tab, setTab] = useState<Tab>("world");
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [select, setSelect] = useState<{ state: string | null; lga: string | null }>({ state: null, lga: null });
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAuto, setHasAuto] = useState(false);
  const saves = useMemo(() => new FixSaves(), []);
  const gameRef = useRef<FixState | null>(null);
  useEffect(() => { gameRef.current = game; }, [game]);
  const toastId = useRef(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const toast = useCallback((text: string, bad = false) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => { saves.list().then((l) => setHasAuto(!!l.find((x) => x.slot === "auto")?.summary)).catch(() => undefined); }, [saves, screen]);

  const saveSlot = useCallback(async (slot: Slot) => {
    const g = gameRef.current;
    if (!g) return false;
    try { await saves.save(slot, g); setLastSaved(Date.now()); return true; } catch { setError("Your browser would not let the game save. Playing on, but progress may be lost."); return false; }
  }, [saves]);

  const act = useCallback((fn: (s: FixState) => Result, opts?: { silent?: boolean }) => {
    const g = gameRef.current;
    if (!g) return { ok: false, message: "No game" };
    const r = fn(g);
    bump();
    if (!opts?.silent) toast(r.message, !r.ok);
    return r;
  }, [bump, toast]);

  const advance = useCallback((months = 1) => {
    const g = gameRef.current;
    if (!g || g.ended) return;
    const before = snap(g);
    const startMonth = g.month;
    const seen = new Set(g.events.filter((e) => e.status === "open").map((e) => e.id));
    const newsBefore = g.news.length;
    const achBefore = g.achievements.length;
    let n = 0;
    for (let i = 0; i < months; i++) {
      if (!advanceMonth(g)) break;
      n++;
      if (g.ended) break;
      const fresh = g.events.find((e) => e.status === "open" && !seen.has(e.id) && e.kind !== "opportunity");
      if (months > 1 && fresh) break; // multi-month skips stop for anything that needs a decision
    }
    if (n === 0) { bump(); return; }
    const after = snap(g);
    const events = g.events.filter((e) => e.status === "open" && !seen.has(e.id));
    const news = g.news.slice(newsBefore).filter((x) => x.month >= startMonth && !x.source.startsWith("echo:") && !x.source.startsWith("ach:")).slice(-5);
    const echoes = g.echoes.filter((e) => e.status === "done" && e.due >= startMonth && e.due < g.month);
    const fresh = g.news.slice(newsBefore).filter((x) => x.month >= startMonth);
    const headline = fresh.filter((x) => !x.source.startsWith("ach:")).find((x) => x.tone === "bad" && !x.source.startsWith("echo")) ?? fresh.find((x) => x.tone === "good") ?? fresh[0];
    setSummary({ from: monthLabel(startMonth), to: monthLabel(g.month), months: n, changes: diffSummary(before, after), events, news, echoes, achievements: g.achievements.slice(achBefore), headline });
    bump();
    if (g.settings.autosave) void saveSlot("auto");
    if (g.ended) { const h = hallEntry(g); if (h) void saves.addHall(h).catch(() => undefined); }
  }, [bump, saveSlot, saves]);

  const startNew = useCallback((seed?: number, promises?: string[], setup?: SetupOptions) => {
    const prev = gameRef.current?.promises;
    const pm = gameRef.current?.meta;
    const opts: SetupOptions = setup ?? (pm ? { difficulty: pm.difficulty, portrait: pm.portrait, president: pm.president } : {});
    const g = newGame(seed ?? Math.floor(Math.random() * 1e6) + 1, opts.president ?? "Madam/Mr President", opts);
    setPromises(g, promises ?? prev ?? []);
    setGame(g); setScreen("play"); setTab("world"); setSummary(null); setSelect({ state: null, lga: null }); bump();
    void saves.save("auto", g).then(() => setLastSaved(Date.now())).catch(() => undefined);
  }, [bump, saves]);

  const continueTerm = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    import("../engine/actions").then(({ nextTerm }) => { nextTerm(g); setSummary(null); bump(); void saveSlot("auto"); });
  }, [bump, saveSlot]);

  const loadSlot = useCallback(async (slot: Slot) => {
    try {
      const g = await saves.load(slot);
      setGame(g); setScreen("play"); setTab("world"); setSummary(null); setSelect({ state: null, lga: null }); bump();
      return true;
    } catch (e) {
      setError(e instanceof FixSaveError ? e.message : "That save could not be loaded."); return false;
    }
  }, [bump, saves]);

  const quit = useCallback(() => { void saveSlot("auto").then(() => setScreen("title")); }, [saveSlot]);

  // autosave when leaving the page
  useEffect(() => {
    const h = () => { const g = gameRef.current; if (g) void saves.save("auto", g).catch(() => undefined); };
    window.addEventListener("pagehide", h);
    return () => window.removeEventListener("pagehide", h);
  }, [saves]);

  const value: Ctx = {
    state: game, version, screen, tab, setTab, act, advance, summary, closeSummary: () => setSummary(null), startNew, continueTerm, loadSlot, saveSlot, saves, hasAuto, quit,
    toast, toasts, select, setSelect, lastSaved, error, clearError: () => setError(null),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
export { advanceCmd };
