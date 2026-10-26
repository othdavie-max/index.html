/** Local, offline saves. IndexedDB with localStorage and memory fallbacks (reuses the backend from the first game, keys are namespaced). */
import { defaultBackend, MemoryBackend, type StorageBackend } from "../game/persistence/saveSystem";
import { FIX_VERSION, type FixState } from "./engine/types";
import { monthLabel } from "./engine/util";

export const SAVE_FORMAT = "nigeria-fixit-save";
export type Slot = "auto" | "1" | "2" | "3";
export const SLOTS: Slot[] = ["auto", "1", "2", "3"];
export interface Summary { month: number; label: string; term: number; president: string; approval: number; savedAt: number }
export interface Envelope { format: string; version: number; savedAt: number; summary: Summary; state: FixState }

export class FixSaveError extends Error { constructor(m: string, public code: "missing" | "corrupt" | "newer") { super(m); } }

export function validate(x: unknown): FixState {
  const s = x as FixState;
  const need = ["eco", "oil", "fuel", "agri", "power", "infra", "jobs", "fin", "sec", "soc", "gov", "me", "regions", "policies", "modifiers", "projects", "events", "news", "history", "baseline", "meta"] as const;
  if (!s || typeof s !== "object") throw new FixSaveError("The save is not a valid game.", "corrupt");
  for (const k of need) if (!(k in s)) throw new FixSaveError(`The save is missing "${k}".`, "corrupt");
  if (typeof s.month !== "number" || !Number.isFinite(s.eco.fx) || s.eco.fx <= 0) throw new FixSaveError("The save contains invalid numbers.", "corrupt");
  s.why ??= {}; s.echoes ??= []; s.promises ??= []; s.achievements ??= []; s.reports ??= []; s.terms ??= []; s.flags ??= {}; s.settings ??= { autosave: true, reducedMotion: false };
  return s;
}
export function serialise(s: FixState): string {
  const env: Envelope = { format: SAVE_FORMAT, version: FIX_VERSION, savedAt: Date.now(), summary: { month: s.month, label: monthLabel(s.month), term: s.term, president: s.meta.president, approval: Math.round(s.gov.approval), savedAt: Date.now() }, state: s };
  return JSON.stringify(env);
}
export function deserialise(text: string): { state: FixState; summary: Summary } {
  let env: Envelope;
  try { env = JSON.parse(text) as Envelope; } catch { throw new FixSaveError("The save file is damaged.", "corrupt"); }
  if (env.format !== SAVE_FORMAT) throw new FixSaveError("That is not a save from this game.", "corrupt");
  if (env.version > FIX_VERSION) throw new FixSaveError("This save is from a newer version of the game.", "newer");
  return { state: validate(env.state), summary: env.summary };
}

export class FixSaves {
  constructor(private backend: StorageBackend = defaultBackend()) {}
  async save(slot: Slot, s: FixState) { const text = serialise(s); await this.backend.set(`fix:save:${slot}`, text); await this.backend.set(`fix:meta:${slot}`, JSON.stringify(deserialise(text).summary)); }
  async load(slot: Slot): Promise<FixState> { const t = await this.backend.get(`fix:save:${slot}`); if (!t) throw new FixSaveError("That slot is empty.", "missing"); return deserialise(t).state; }
  async list(): Promise<{ slot: Slot; summary?: Summary }[]> {
    const out: { slot: Slot; summary?: Summary }[] = [];
    for (const slot of SLOTS) { try { const m = await this.backend.get(`fix:meta:${slot}`); out.push({ slot, summary: m ? (JSON.parse(m) as Summary) : undefined }); } catch { out.push({ slot }); } }
    return out;
  }
  async remove(slot: Slot) { await this.backend.remove(`fix:save:${slot}`); await this.backend.remove(`fix:meta:${slot}`); }
}
export { MemoryBackend };
