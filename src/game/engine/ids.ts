import type { GameState } from "./types";

/** Stable, monotonically increasing ids; the counter is part of the saved state. */
export function newId(state: Pick<GameState, "nextId">, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}

/** Returns true the first time a (system, month) pair is seen and false afterwards: a monthly step can never run twice. */
export function once(state: Pick<import("./types").GameState, "processed" | "clock">, system: string): boolean {
  const key = `m:${system}:${state.clock.monthIndex}`;
  if (state.processed[key]) return false;
  state.processed[key] = true;
  return true;
}
