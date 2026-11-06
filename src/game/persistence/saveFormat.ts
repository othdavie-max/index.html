/**
 * Save-file format: validation and migration. Pure functions (no browser APIs) so they are unit-testable.
 * A save is `{ format, simVersion, savedAt, summary, state }` serialised to JSON.
 */
import type { GameState } from "../engine/types";
import { SIM_VERSION } from "../engine/types";
import { ADMIN_LGAS } from "../engine/admin";
import { STATES } from "../data/states";
import { RULESETS } from "../data/rules";

export const SAVE_FORMAT = 1;

export interface SaveSummary {
  name: string;
  age: number;
  dateLabel: string;
  office: string;
  occupation: string;
  months: number;
  difficulty: string;
}
export interface SaveEnvelope {
  format: number;
  simVersion: number;
  savedAt: number;
  summary: SaveSummary;
  state: GameState;
}
export class SaveError extends Error {
  constructor(message: string, public readonly kind: "corrupt" | "incompatible" | "missing") {
    super(message);
  }
}

export function serialise(env: SaveEnvelope): string {
  return JSON.stringify(env);
}

/** Parse + validate + migrate. Throws SaveError (never anything else) on a bad save. */
export function deserialise(text: string): SaveEnvelope {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveError("The save file is damaged and could not be read.", "corrupt");
  }
  if (!raw || typeof raw !== "object") throw new SaveError("The save file is empty or malformed.", "corrupt");
  const env = raw as Partial<SaveEnvelope>;
  if (typeof env.format !== "number" || typeof env.simVersion !== "number" || !env.state) throw new SaveError("This is not a valid game save.", "corrupt");
  if (env.format > SAVE_FORMAT) throw new SaveError("This save was made by a newer version of the game.", "incompatible");
  if (env.simVersion > SIM_VERSION) throw new SaveError("This save uses a newer simulation version than this build supports.", "incompatible");
  const migrated = migrate(env as SaveEnvelope);
  const problems = validateState(migrated.state);
  if (problems.length) throw new SaveError(`The save failed integrity checks: ${problems.slice(0, 3).join("; ")}`, "corrupt");
  return migrated;
}

/** Upgrade older simulation versions in place. Add a case per version bump. */
export function migrate(env: SaveEnvelope): SaveEnvelope {
  let v = env.simVersion;
  const s = env.state as GameState & Record<string, unknown>;
  while (v < SIM_VERSION) {
    // v1 → v2 etc. go here
    v++;
  }
  s.meta.simVersion = SIM_VERSION;
  env.simVersion = SIM_VERSION;
  // defaults for fields that older builds of the same version may lack
  s.customParties ??= {};
  s.settings ??= { autoSave: true, reducedMotion: false, showTooltips: true };
  return env;
}

/** Structural and referential integrity checks. Returns a list of problems (empty = healthy). */
export function validateState(s: GameState): string[] {
  const p: string[] = [];
  const need = ["meta", "clock", "player", "chars", "seats", "states", "lgas", "economy", "parties", "contests", "news", "government", "flags", "processed"] as const;
  for (const k of need) if (!(k in s) || (s as unknown as Record<string, unknown>)[k] == null) p.push(`missing ${k}`);
  if (p.length) return p;
  if (!RULESETS[s.meta.rulesetId]) p.push(`unknown ruleset ${s.meta.rulesetId}`);
  if (typeof s.clock.monthIndex !== "number" || s.clock.monthIndex < 0) p.push("bad clock");
  if (Object.keys(s.states).length !== STATES.length) p.push(`expected ${STATES.length} states, found ${Object.keys(s.states).length}`);
  if (Object.keys(s.lgas).length !== ADMIN_LGAS.length) p.push(`expected ${ADMIN_LGAS.length} LGAs, found ${Object.keys(s.lgas).length}`);
  if (!s.player.finances || typeof s.player.finances.cash !== "number" || !isFinite(s.player.finances.cash)) p.push("bad finances");
  if (!s.player.name) p.push("player has no name");
  for (const seat of Object.values(s.seats)) {
    if (seat.holderId && seat.holderId !== "player" && !s.chars[seat.holderId]) { p.push(`seat ${seat.id} holder missing`); break; }
  }
  if (s.player.politics.seatId && !s.seats[s.player.politics.seatId]) p.push("player seat missing");
  return p;
}

export function summarise(s: GameState): SaveSummary {
  const seat = s.player.politics.seatId ? s.seats[s.player.politics.seatId] : null;
  const total = 2026 * 12 + s.clock.monthIndex; // start year 2026, month 1 in the default ruleset
  const year = Math.floor(total / 12), month = (total % 12) + 1;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    name: s.player.name,
    age: Math.floor((s.clock.monthIndex - s.player.birthMonth) / 12),
    dateLabel: `${names[month - 1]} ${year}`,
    office: seat ? seat.label : s.player.politics.membership ? "Party member" : "Private citizen",
    occupation: s.player.occupation.title,
    months: s.clock.monthIndex,
    difficulty: s.meta.difficulty,
  };
}
