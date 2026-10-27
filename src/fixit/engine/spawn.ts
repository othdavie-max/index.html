/** Late-bound createEvent, so modules that define event templates never import events.ts (avoids import cycles). */
import type { GameEvent } from "./types";
type Creator = (s: import("./types").FixState, tpl: string, stateId: string) => GameEvent | null;
let impl: Creator | null = null;
export const setSpawn = (fn: Creator) => { impl = fn; };
export const createEvent: Creator = (s, tpl, st) => (impl ? impl(s, tpl, st) : null);

/** Late-bound player actions (defined in actions.ts) for modules that must not import it. */
export interface Builders {
  startProject: (s: import("./types").FixState, defId: string, stateId: string, funding: import("./types").Funding, opts?: { favour?: boolean }) => { ok: boolean; message: string };
  canStartProject: (s: import("./types").FixState, defId: string, stateId: string, funding: import("./types").Funding) => string | null;
  enactPolicy: (s: import("./types").FixState, id: string) => { ok: boolean; message: string };
}
let bimpl: Builders | null = null;
export const setBuilders = (b: Builders) => { bimpl = b; };
export const builders = (): Builders => { if (!bimpl) throw new Error("actions not loaded"); return bimpl; };
