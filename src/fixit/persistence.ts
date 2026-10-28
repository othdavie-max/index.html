/** Local, offline saves. IndexedDB with localStorage and memory fallbacks (reuses the backend from the first game, keys are namespaced). */
import { initFamilies } from "./engine/families";
import { backfillCap } from "./engine/meta";
import { initBackers } from "./engine/backers";
import { defaultBackend, MemoryBackend, type StorageBackend } from "../game/persistence/saveSystem";
import { FIX_VERSION, type FixState } from "./engine/types";
import { monthLabel } from "./engine/util";
import { initCabinet } from "./engine/cabinet";
import { initRival } from "./engine/rival";
import { initAssembly, initBudget, initSpeech } from "./engine/politics";
import { initSociety } from "./engine/society";
import { initPower } from "./engine/power";
import { computeEnding } from "./engine/endings";

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
  if (!s.cabinet) initCabinet(s);
  if (!s.rival || !s.campaign) initRival(s);
  s.election ??= null;
  if (!s.assembly) initAssembly(s);
  if (!s.budget) initBudget(s);
  if (!s.speech) initSpeech(s);
  if (!s.groups || !s.governors) initSociety(s);
  if (!s.power || !s.lawmakers) initPower(s);
  if (!s.backers || !s.backers.length) initBackers(s);
  s.staff ??= { cos: null, picked: true };
  s.deals ??= []; s.enemies ??= []; s.gone ??= []; s.mil ??= { strength: 38, peace: 0, neighbours: [{ id: "sahelia", name: "Sahelia", strength: 34, mood: 55, stability: 45 }, { id: "dahoma", name: "Dahoma", strength: 28, mood: 60, stability: 55 }, { id: "gulfland", name: "Gulfland", strength: 42, mood: 50, stability: 62 }, { id: "kamura", name: "Kamura", strength: 31, mood: 58, stability: 40 }, { id: "atlantia", name: "Atlantia", strength: 36, mood: 62, stability: 70 }] }; s.lend ??= { loans: [], fund: 0 }; s.ledger ??= { stolen: 0, recovered: 0, pending: 0, used: {}, log: [] }; s.foreign ??= { rel: { imf: 45, china: 50, usa: 50, ecowas: 55 }, imf: null, china: null, usaAid: null, log: [] }; s.party ??= { north: 55, south: 55, youth: 50, oldguard: 55, vpAmbition: 20, vpStage: 0 }; s.home ??= { spouse: { name: "First Lady/Gentleman", portrait: { skin: 3, hair: 1, style: 1, accent: 2 } }, kids: 3, health: 85, illness: null, abroad: 0 }; if (!s.families || !s.families.length) initFamilies(s); s.timeline ??= [];
  backfillCap(s);
  for (const r of Object.values(s.regions)) r.start ??= { food: r.food, insecurity: r.insecurity, jobless: r.jobless, power: r.power };
  s.oil.uptime ??= 70; s.oil.refined ??= s.oil.refinery; s.oil.scarcity ??= 45;
  s.meta.scenario ??= "standard"; s.meta.difficulty ??= "normal"; s.meta.portrait ??= { skin: 2, hair: 0, style: 0, accent: 0 };
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

export interface HallEntry { daily?: string; archetype?: string; id: string; president: string; scenario: string; difficulty: string; term: number; title: string; ending?: string; result: string; vote: number | null; approval: number; inflation: [number, number]; fx: [number, number]; projects: number; date: number; score: number }
export function hallEntry(s: FixState): HallEntry | null {
  const t = s.terms[s.terms.length - 1];
  if (!t) return null;
  const done = s.projects.filter((p) => p.status === "done").length;
  const score = Math.round(t.end.approval + (t.start.inflation - t.end.inflation) + (t.start.fx - t.end.fx) / 50 + done * 2 + (t.result === "won" || t.result === "completed" ? 15 : 0) - (s.me.acts.filter((a) => a === "kickback").length * 5));
  return { daily: s.meta.daily, archetype: s.meta.archetype, id: `${s.meta.id}:${t.term}:${s.meta.seed}`, president: s.meta.president, scenario: s.meta.scenario, difficulty: s.meta.difficulty, term: t.term, title: t.title, ending: s.done ? t.ending ?? computeEnding(s).name : undefined, result: t.result, vote: s.election && s.election.month === s.month ? s.election.national : null, approval: Math.round(t.end.approval), inflation: [t.start.inflation, t.end.inflation], fx: [t.start.fx, t.end.fx], projects: done, date: Date.now(), score };
}
export interface LegacyMeta { points: number; owned: string[]; equipped: string[]; games: number; bestDynasty: number; lastAward: number; unlockAll?: boolean }
export const EMPTY_LEGACY: LegacyMeta = { points: 0, owned: [], equipped: [], games: 0, bestDynasty: 0, lastAward: 0 };
/** points earned when a game ends: more for strong results, new endings and dynasties */
export function legacyAward(s: FixState, firstEnding: boolean): number {
  const t = s.terms[s.terms.length - 1];
  const done = s.projects.filter((p) => p.status === "done").length;
  const base = 5 + Math.max(0, Math.round((t?.end.approval ?? 30) / 10)) + Math.min(8, done) + (t && (t.result === "won" || t.result === "completed") ? 5 : 0) + (firstEnding ? 10 : 0) + (s.cap?.agendaLog.filter((x) => x.ok).length ?? 0) * 2;
  return Math.round(base * (1 + 0.25 * (s.cap?.dynasty ?? 0)));
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
  async hall(): Promise<HallEntry[]> { try { const t = await this.backend.get("fix:hall"); return t ? (JSON.parse(t) as HallEntry[]) : []; } catch { return []; } }
  async addHall(e: HallEntry) { const list = (await this.hall()).filter((x) => x.id !== e.id); list.push(e); list.sort((a, b) => b.score - a.score); await this.backend.set("fix:hall", JSON.stringify(list.slice(0, 50))); }
  async endings(): Promise<string[]> { try { const t = await this.backend.get("fix:endings"); return t ? (JSON.parse(t) as string[]) : []; } catch { return []; } }
  async addEnding(id: string) { const list = await this.endings(); if (list.includes(id)) return; list.push(id); await this.backend.set("fix:endings", JSON.stringify(list)); }
  /** between-game progress: legacy points, perks you own and have equipped, games played, dynasty record */
  async legacy(): Promise<LegacyMeta> { try { const t = await this.backend.get("fix:legacy"); return { ...EMPTY_LEGACY, ...(t ? (JSON.parse(t) as Partial<LegacyMeta>) : {}) }; } catch { return { ...EMPTY_LEGACY }; } }
  async saveLegacy(m: LegacyMeta) { await this.backend.set("fix:legacy", JSON.stringify(m)); }
  async remove(slot: Slot) { await this.backend.remove(`fix:save:${slot}`); await this.backend.remove(`fix:meta:${slot}`); }
}
export { MemoryBackend };
