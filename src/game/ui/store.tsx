"use client";
/**
 * UI ↔ engine bridge. The engine owns the rules; this store only holds the current GameState (mutated in place by
 * the engine, with a version counter to trigger re-renders), the active screen, toasts and the save system.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GameState } from "../engine/types";
import { perform, type GameAction, type Result } from "../engine/actions";
import { createNewGame, type NewGameConfig } from "../engine/newgame";
import { SaveSystem, type SlotId, type SlotInfo } from "../persistence/saveSystem";
import { SaveError } from "../persistence/saveFormat";

export type { Tab } from "../engine/insights";
import type { Tab } from "../engine/insights";
export type Screen = "title" | "create" | "game";
export interface Toast { id: number; text: string; bad: boolean }

interface Ctx {
  state: GameState | null;
  version: number;
  screen: Screen;
  setScreen: (s: Screen) => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  /** optional sub-tab hint for a screen (e.g. open Elections → Results) */
  subTab: string | null;
  go: (t: Tab, sub?: string) => void;
  busy: boolean;
  dispatch: (a: GameAction, opts?: { silent?: boolean }) => Result;
  startNew: (cfg: NewGameConfig) => Promise<void>;
  loadSlot: (slot: SlotId) => Promise<boolean>;
  saveSlot: (slot: SlotId) => Promise<boolean>;
  deleteSlot: (slot: SlotId) => Promise<void>;
  slots: SlotInfo[];
  refreshSlots: () => Promise<void>;
  toast: (text: string, bad?: boolean) => void;
  toasts: Toast[];
  lastSaved: number | null;
  error: string | null;
  clearError: () => void;
  quitToTitle: () => void;
}

const GameCtx = createContext<Ctx | null>(null);
export const useGame = () => {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
};
/** Convenience: the state, asserted non-null (screens only render in-game). */
export const useS = (): GameState => {
  const { state } = useGame();
  if (!state) throw new Error("no game");
  return state;
};

export function GameProvider({ children }: { children: ReactNode }) {
  const stateRef = useRef<GameState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState<Screen>("title");
  const [tab, setTabRaw] = useState<Tab>("home");
  const [subTab, setSubTab] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saver = useMemo(() => new SaveSystem(), []);
  const toastId = useRef(1);

  const toast = useCallback((text: string, bad = false) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-2), { id, text, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800);
  }, []);

  const refreshSlots = useCallback(async () => {
    try { setSlots(await saver.list()); } catch { setSlots([]); }
  }, [saver]);
  useEffect(() => { let on = true; saver.list().then((l) => { if (on) setSlots(l); }).catch(() => undefined); return () => { on = false; }; }, [saver]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const saveSlot = useCallback(async (slot: SlotId) => {
    const s = stateRef.current;
    if (!s) return false;
    try {
      await saver.save(slot, s);
      setLastSaved(Date.now());
      await refreshSlots();
      return true;
    } catch {
      setError("Saving failed. Your browser may be blocking local storage.");
      return false;
    }
  }, [saver, refreshSlots]);

  const setTab = useCallback((t: Tab) => { setSubTab(null); setTabRaw(t); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); }, []);
  const go = useCallback((t: Tab, sub?: string) => { setTabRaw(t); setSubTab(sub ?? null); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); }, []);

  const dispatch = useCallback((a: GameAction, opts?: { silent?: boolean }): Result => {
    const s = stateRef.current;
    if (!s) return { ok: false, message: "No game in progress." };
    const timeAction = a.t === "advance" || a.t === "advanceToEvent";
    if (timeAction) {
      if (busy) return { ok: false, message: "Working…" };
      setBusy(true);
      setTimeout(() => {
        const r = perform(s, a);
        setBusy(false);
        bump();
        if (!r.ok) toast(r.message, true);
        else if (s.settings.autoSave) void saveSlot("auto");
      }, 20);
      return { ok: true, message: "" };
    }
    const r = perform(s, a);
    bump();
    if (!opts?.silent && r.message) toast(r.message, !r.ok);
    return r;
  }, [busy, bump, toast, saveSlot]);

  const startNew = useCallback(async (cfg: NewGameConfig) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const s = createNewGame(cfg);
      stateRef.current = s;
      setGame(s);
      setTabRaw("home");
      setScreen("game");
      bump();
      await saveSlot("auto");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the game.");
    } finally {
      setBusy(false);
    }
  }, [bump, saveSlot]);

  const loadSlot = useCallback(async (slot: SlotId) => {
    setBusy(true);
    try {
      const s = await saver.load(slot);
      stateRef.current = s;
      setGame(s);
      setTabRaw("home");
      setScreen("game");
      bump();
      return true;
    } catch (e) {
      setError(e instanceof SaveError ? e.message : "That save could not be loaded.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [saver, bump]);

  const deleteSlot = useCallback(async (slot: SlotId) => { await saver.delete(slot); await refreshSlots(); }, [saver, refreshSlots]);

  // save when the tab is hidden or closed (a safe point)
  useEffect(() => {
    const h = () => { if (document.visibilityState === "hidden" && stateRef.current?.settings.autoSave && screen === "game") void saveSlot("auto"); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [saveSlot, screen]);

  // reduced motion
  const quitToTitle = useCallback(() => { void saveSlot("auto").then(() => { setScreen("title"); }); }, [saveSlot]);

  const value: Ctx = {
    state: game, version, screen, setScreen, tab, setTab, subTab, go, busy, dispatch, startNew, loadSlot, saveSlot, deleteSlot, slots, refreshSlots,
    toast, toasts, lastSaved, error, clearError: () => setError(null), quitToTitle,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
