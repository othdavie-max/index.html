import type { Character, GameState, StateId, LgaId, PartyId } from "./types";
import type { OfficeId, EducationLevel } from "../data/rules";
import { NAME_POOLS, STATE_NAME_POOLS, type NamePool } from "../data/names";
import type { Rng } from "./rng";
import { clamp100 } from "./rng";
import { newId } from "./ids";
import { PARTIES } from "../data/parties";

export function pickPool(rng: Rng, stateId: StateId): NamePool {
  const w = STATE_NAME_POOLS[stateId] ?? { yoruba: 1 };
  const entries = Object.entries(w) as [NamePool, number][];
  return rng.weighted(entries, (e) => e[1])[0];
}
export function randomName(rng: Rng, stateId: StateId, female: boolean): string {
  const pool = NAME_POOLS[pickPool(rng, stateId)];
  const given = rng.pick(female ? pool.female : pool.male);
  const sur = rng.pick(pool.surnames);
  return `${given} ${sur}`;
}

/** age range, wealth (₦m) and attribute bias by the office a politician holds or seeks */
const PROFILE: Record<OfficeId | "party" | "minister", { age: [number, number]; wealth: [number, number]; bias: number }> = {
  councillor: { age: [27, 55], wealth: [2, 25], bias: -4 },
  lg_chair: { age: [33, 60], wealth: [10, 120], bias: 0 },
  state_assembly: { age: [32, 62], wealth: [15, 200], bias: 0 },
  reps: { age: [36, 65], wealth: [40, 600], bias: 2 },
  senate: { age: [45, 70], wealth: [150, 4000], bias: 4 },
  governor: { age: [45, 68], wealth: [300, 8000], bias: 6 },
  president: { age: [55, 72], wealth: [500, 15000], bias: 8 },
  party: { age: [48, 72], wealth: [200, 5000], bias: 4 },
  minister: { age: [42, 68], wealth: [80, 3000], bias: 5 },
};

const EDU_BY_OFFICE: Record<string, EducationLevel[]> = {
  councillor: ["secondary", "secondary", "nd", "bachelor"],
  lg_chair: ["secondary", "nd", "bachelor", "bachelor"],
  state_assembly: ["nd", "bachelor", "bachelor", "masters"],
  reps: ["bachelor", "bachelor", "masters", "masters"],
  senate: ["bachelor", "masters", "masters", "doctorate"],
  governor: ["bachelor", "masters", "masters", "doctorate"],
  president: ["bachelor", "masters", "masters", "doctorate"],
  party: ["bachelor", "masters"],
  minister: ["bachelor", "masters", "doctorate"],
};

export function makePolitician(
  state: Pick<GameState, "nextId" | "chars">,
  rng: Rng,
  startYear: number,
  o: { stateId: StateId; lgaId: LgaId; partyId: PartyId | null; profile: OfficeId | "party" | "minister"; role?: string; goal?: OfficeId | null; female?: boolean },
): Character {
  const prof = PROFILE[o.profile];
  const female = o.female ?? rng.chance(0.2);
  const age = rng.int(prof.age[0], prof.age[1]);
  const wealthLog = rng.range(Math.log(prof.wealth[0]), Math.log(prof.wealth[1]));
  const a = (mean = 55) => clamp100(rng.normal(mean + prof.bias, 14));
  const party = o.partyId ? PARTIES.find((p) => p.id === o.partyId) : null;
  const factionId = party ? rng.pick(party.factions).id : null;
  const id = newId(state, "c");
  const c: Character = {
    id,
    name: randomName(rng, o.stateId, female),
    female,
    birthYear: startYear - age,
    stateId: o.stateId,
    lgaId: o.lgaId,
    partyId: o.partyId,
    factionId,
    attrs: { competence: a(), charisma: a(), integrity: clamp100(rng.normal(48, 20)), ambition: a(55), connections: a(50), popularity: a(50) },
    wealthM: Math.round(Math.exp(wealthLog)),
    status: "active",
    seatId: null,
    goal: o.goal ?? null,
    record: [],
    evidence: 0,
    education: rng.pick(EDU_BY_OFFICE[o.profile]),
    kind: "politician",
    role: o.role,
  };
  state.chars[id] = c;
  return c;
}

/** a private (non-political) person such as a relative or associate */
export function makePrivate(
  state: Pick<GameState, "nextId" | "chars">,
  rng: Rng,
  o: { stateId: StateId; lgaId: LgaId; birthYear: number; female: boolean; surname?: string; role?: string },
): Character {
  const id = newId(state, "c");
  const name = randomName(rng, o.stateId, o.female);
  const c: Character = {
    id, name: o.surname ? `${name.split(" ")[0]} ${o.surname}` : name, female: o.female, birthYear: o.birthYear, stateId: o.stateId, lgaId: o.lgaId,
    partyId: null, factionId: null,
    attrs: { competence: clamp100(rng.normal(50, 15)), charisma: clamp100(rng.normal(50, 15)), integrity: clamp100(rng.normal(55, 18)), ambition: clamp100(rng.normal(40, 18)), connections: clamp100(rng.normal(35, 15)), popularity: clamp100(rng.normal(30, 12)) },
    wealthM: 0, status: "active", seatId: null, goal: null, record: [], evidence: 0, education: "secondary", kind: "private", role: o.role,
  };
  state.chars[id] = c;
  return c;
}

export const charAge = (c: Pick<Character, "birthYear">, year: number) => year - c.birthYear;

export function addRecord(c: Character, m: number, text: string): void {
  c.record.push({ m, text });
  if (c.record.length > 12) c.record.shift();
}
