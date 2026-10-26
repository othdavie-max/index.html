import { createNewGame, type NewGameConfig } from "../engine/newgame";
import { ADMIN_LGAS, LGA_BY_ID } from "../engine/admin";
import type { GameState } from "../engine/types";
import { advanceMonth } from "../engine/turn";

export function lgaNamed(name: string) {
  const l = ADMIN_LGAS.find((x) => x.name === name);
  if (!l) throw new Error(`no LGA ${name}`);
  return l;
}
export function makeGame(over: Partial<NewGameConfig> = {}): GameState {
  const l = over.birthLgaId ? LGA_BY_ID[over.birthLgaId] : lgaNamed("Ikeja");
  return createNewGame({ name: "Test Player", female: false, birthStateId: l.stateId, birthLgaId: l.id, startAge: 18, backgroundId: "middle", difficulty: "standard", seed: 42, ...over });
}
/** advance n months, auto-resolving any pending decisions with their default (tests are not about decisions) */
export function advance(s: GameState, n: number, opts: { keepAfloat?: number } = {}) {
  for (let i = 0; i < n; i++) {
    if (s.pending.length) s.pending = [];
    if (opts.keepAfloat) s.player.finances.cash += opts.keepAfloat;
    advanceMonth(s);
  }
}

/** JSON with object keys sorted, so property insertion order never matters. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))) : val));
}
/** Compact fingerprint of a value (keeps failing assertions readable). */
export function digest(v: unknown): string {
  const text = canonical(v);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `${h.toString(16)}:${text.length}`;
}
/** first top-level keys whose content differs between two states */
export function diffKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  return Object.keys(a).filter((k) => digest(a[k]) !== digest(b[k]));
}
