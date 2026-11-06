import type { GameState, Relationship, CharId } from "./types";
import { clamp } from "./rng";

export function ensureRelationship(state: GameState, id: CharId, kind: Relationship["kind"], affinity = 0): Relationship {
  let r = state.player.relationships[id];
  if (!r) {
    r = { id, kind, affinity, favours: 0, since: state.clock.monthIndex, last: state.clock.monthIndex };
    state.player.relationships[id] = r;
  }
  return r;
}

export function adjustRelation(state: GameState, id: CharId, delta: number, kind: Relationship["kind"] = "associate"): Relationship {
  const r = ensureRelationship(state, id, kind, 0);
  r.affinity = clamp(r.affinity + delta, -100, 100);
  r.last = state.clock.monthIndex;
  return r;
}

export function affinityWith(state: GameState, id: CharId | null | undefined): number {
  if (!id) return 0;
  return state.player.relationships[id]?.affinity ?? 0;
}

/** Slow drift of neglected relationships toward neutral (family decays slowest). */
export function decayRelationships(state: GameState): void {
  for (const r of Object.values(state.player.relationships)) {
    const idle = state.clock.monthIndex - r.last;
    if (idle < 6) continue;
    const rate = r.kind === "family" ? 0.01 : 0.03;
    r.affinity -= r.affinity * rate;
  }
}

/** Overall network strength used by several systems: sum of positive ties, weighted by the contact's standing. */
export function networkStrength(state: GameState): number {
  let s = 0;
  for (const r of Object.values(state.player.relationships)) {
    const c = state.chars[r.id];
    if (!c || r.affinity <= 0) continue;
    const weight = c.seatId ? { councillor: 0.6, lg_chair: 1, state_assembly: 1.4, reps: 1.8, senate: 2.4, governor: 3, president: 4 }[state.seats[c.seatId]?.office ?? "lg_chair"] ?? 1 : c.kind === "private" ? 0.3 : 0.8;
    s += (r.affinity / 100) * weight;
  }
  return s;
}
