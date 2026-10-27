/** Late-bound createEvent, so modules that define event templates never import events.ts (avoids import cycles). */
import type { GameEvent } from "./types";
type Creator = (s: import("./types").FixState, tpl: string, stateId: string) => GameEvent | null;
let impl: Creator | null = null;
export const setSpawn = (fn: Creator) => { impl = fn; };
export const createEvent: Creator = (s, tpl, st) => (impl ? impl(s, tpl, st) : null);
