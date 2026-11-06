/** Typed access to the generated administrative dataset (36 states + FCT, 774 LGAs). */
import adminJson from "../data/generated/admin.json";
import { STATES, STATE_BY_ID } from "../data/states";

export interface AdminLga { id: string; name: string; stateId: string; sourceId: string; areaKm2: number; c: [number, number] }
export interface AdminState { id: string; sourceName: string; areaKm2: number; c: [number, number] }
interface AdminFile {
  attribution: Record<string, unknown> & { title: string; licence: string; upstream: string; underlyingSource: string; citation: string; processing: string; licenceUrl: string };
  projection: { width: number; height: number; scale: number };
  states: AdminState[];
  lgas: AdminLga[];
}
export const ADMIN = adminJson as unknown as AdminFile;
export const ATTRIBUTION = ADMIN.attribution;

export const ADMIN_LGAS: AdminLga[] = ADMIN.lgas;
export const LGA_BY_ID: Record<string, AdminLga> = Object.fromEntries(ADMIN_LGAS.map((l) => [l.id, l]));
export const LGAS_BY_STATE: Record<string, AdminLga[]> = (() => {
  const m: Record<string, AdminLga[]> = {};
  for (const s of STATES) m[s.id] = [];
  for (const l of ADMIN_LGAS) m[l.stateId].push(l);
  return m;
})();
export const ADMIN_STATE_BY_ID: Record<string, AdminState> = Object.fromEntries(ADMIN.states.map((s) => [s.id, s]));

export const stateName = (id: string) => STATE_BY_ID[id]?.name ?? id;
export const lgaName = (id: string) => LGA_BY_ID[id]?.name ?? id;

/** Validates the dataset; used by tests and at start-up. Throws on any inconsistency. */
export function validateAdmin(): { states: number; lgas: number } {
  if (ADMIN.states.length !== 37) throw new Error(`expected 37 states+FCT, found ${ADMIN.states.length}`);
  if (ADMIN_LGAS.length !== 774) throw new Error(`expected 774 LGAs, found ${ADMIN_LGAS.length}`);
  const ids = new Set<string>();
  for (const l of ADMIN_LGAS) {
    if (ids.has(l.id)) throw new Error(`duplicate LGA id ${l.id}`);
    ids.add(l.id);
    if (!STATE_BY_ID[l.stateId]) throw new Error(`LGA ${l.id} has unknown parent ${l.stateId}`);
  }
  for (const s of STATES) if (!ADMIN_STATE_BY_ID[s.id]) throw new Error(`state ${s.id} missing from geography`);
  return { states: ADMIN.states.length, lgas: ADMIN_LGAS.length };
}

export interface PlaceResult { kind: "state" | "lga"; id: string; label: string; parent?: string }
/** Name search across states and LGAs (case-insensitive substring; minimum 2 characters). */
export function searchPlaces(query: string, limit = 14): PlaceResult[] {
  const t = query.trim().toLowerCase();
  if (t.length < 2) return [];
  const states: PlaceResult[] = STATES.filter((s) => s.name.toLowerCase().includes(t) || (s.isFct && "fct".includes(t))).map((s) => ({ kind: "state", id: s.id, label: s.name }));
  const lgas: PlaceResult[] = ADMIN_LGAS.filter((l) => l.name.toLowerCase().includes(t)).map((l) => ({ kind: "lga", id: l.id, label: l.name, parent: stateName(l.stateId) }));
  // exact and prefix matches first
  const rank = (r: PlaceResult) => (r.label.toLowerCase() === t ? 0 : r.label.toLowerCase().startsWith(t) ? 1 : 2);
  return [...states, ...lgas].sort((a, b) => rank(a) - rank(b) || (a.kind === b.kind ? 0 : a.kind === "state" ? -1 : 1)).slice(0, limit);
}
