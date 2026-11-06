/** Read-only helpers over GameState shared by several systems and the UI. */
import type { GameState, Seat, Character, StateId, PartyId } from "./types";
import { PARTY_BY_ID, type PartyDef } from "../data/parties";
import { playerAge } from "./calendar";
import { OFFICE_ORDER, type OfficeId } from "../data/rules";

export function playerSeat(state: GameState): Seat | null {
  const id = state.player.politics.seatId;
  return id ? state.seats[id] ?? null : null;
}
export function playerOffice(state: GameState): OfficeId | null {
  return playerSeat(state)?.office ?? null;
}
/** 0 none, 1 ward, 2 local, 3 state, 4 federal */
export function playerOfficeLevel(state: GameState): number {
  const o = playerOffice(state);
  if (o) {
    return { councillor: 1, lg_chair: 2, state_assembly: 3, governor: 3, reps: 4, senate: 4, president: 4 }[o];
  }
  const ap = state.player.politics.appointment;
  if (ap) return { local: 2, state: 3, federal: 4 }[ap.level];
  if (state.flags["councillor_until"] && Number(state.flags["councillor_until"]) > state.clock.monthIndex) return 1;
  return 0;
}
export function holderOf(state: GameState, seatId: string | null | undefined): Character | null {
  if (!seatId) return null;
  const h = state.seats[seatId]?.holderId;
  return h ? state.chars[h] ?? null : null;
}
export const governorSeatOf = (state: GameState, stateId: StateId) => state.states[stateId]?.governorSeatId ?? null;
export function partyDefOf(state: GameState, id: PartyId | null | undefined): PartyDef | null {
  if (!id) return null;
  return PARTY_BY_ID[id] ?? (state as GameState & { customParties?: Record<string, PartyDef> }).customParties?.[id] ?? null;
}
export function partyColor(state: GameState, id: PartyId | null): string {
  return partyDefOf(state, id)?.color ?? "#64748b";
}
export function partyAbbr(state: GameState, id: PartyId | null): string {
  return partyDefOf(state, id)?.abbr ?? "—";
}
export function activeParties(state: GameState): PartyId[] {
  return Object.values(state.parties).filter((p) => p.exists).map((p) => p.id);
}
export function rulingPartyId(state: GameState): PartyId | null {
  const s = state.seats["pres"];
  return s?.partyId ?? null;
}
/** price level relative to game start (1.0 at start) */
export const priceLevel = (state: GameState) => state.economy.cpi / 100;

export function flagActive(state: GameState, name: string): boolean {
  const v = state.flags[name];
  return typeof v === "number" && v > state.clock.monthIndex;
}
export function setFlag(state: GameState, name: string, months: number): void {
  state.flags[name] = state.clock.monthIndex + months;
}

export function officeRank(o: OfficeId): number {
  return OFFICE_ORDER.indexOf(o);
}
export function nameOfHolder(state: GameState, seatId: string | null | undefined): string {
  return holderOf(state, seatId)?.name ?? "the incumbent";
}
export function age(state: GameState): number {
  return playerAge(state);
}
export function playerCurrentCampaign(state: GameState) {
  return state.player.politics.candidacies.find((c) => c.stage === "nominee" || c.stage === "aspirant") ?? null;
}
export function seatsOfOffice(state: GameState, office: OfficeId): Seat[] {
  return Object.values(state.seats).filter((s) => s.office === office);
}
