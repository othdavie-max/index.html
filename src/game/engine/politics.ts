/**
 * Party membership, party office, defection, founding a party, and seat succession.
 * Party membership/office is distinct from elected public office.
 */
import type { GameState, PartyId, Character } from "./types";
import { PARTIES, type PartyDef } from "../data/parties";
import { ZONES, STATE_BY_ID, type ZoneId } from "../data/states";
import { ruleOf } from "./world";
import { clamp, clamp100, subRng } from "./rng";
import { debit, canAfford, credit } from "./finance";
import { pushNews, notify, careerLog } from "./news";
import { ensureRelationship } from "./relationships";
import { playerAge } from "./calendar";
import { makePolitician, addRecord } from "./characters";
import { partyDefOf, priceLevel, holderOf, playerSeat } from "./queries";
import { LGAS_BY_STATE } from "./admin";
import { newId } from "./ids";
import { stateName } from "./admin";

export type Result = { ok: boolean; message: string };
const fail = (message: string): Result => ({ ok: false, message });
const good = (message: string): Result => ({ ok: true, message });

/** AI officials of `partyId` in the player's state — used to seed relationships on joining. */
function localPartyFigures(state: GameState, partyId: PartyId): Character[] {
  const st = state.states[state.player.residenceStateId];
  const ids = [...st.assemblySeatIds, ...st.repsSeatIds, ...st.senateSeatIds, ...(st.governorSeatId ? [st.governorSeatId] : []), `lgc:${state.player.residenceLgaId}`];
  const out: Character[] = [];
  for (const sid of ids) {
    const h = holderOf(state, sid);
    if (h && h.partyId === partyId) out.push(h);
  }
  return out;
}

export function joinParty(state: GameState, partyId: PartyId, factionId?: string): Result {
  const p = state.player;
  const def = partyDefOf(state, partyId);
  if (!def || !state.parties[partyId]?.exists) return fail("That party does not exist.");
  if (playerAge(state) < 18) return fail("You must be 18 to join a party.");
  if (p.politics.membership) return fail("You already belong to a party. Leave it first or defect.");
  const last = p.flags["lastPartyChange"] as number | undefined;
  if (last !== undefined && state.clock.monthIndex - last < ruleOf(state).eligibility.defectionCooldownMonths) return fail("You changed parties very recently.");
  const dues = Math.round(2000 * priceLevel(state));
  debit(state, "party", dues, `${def.abbr} membership registration`, { mandatory: true });
  const fac = factionId && def.factions.some((f) => f.id === factionId) ? factionId : def.factions[0].id;
  p.politics.membership = { partyId, since: state.clock.monthIndex, factionId: fac, office: null, standing: 20 + Math.min(20, p.fame.national * 0.4), history: [{ m: state.clock.monthIndex, text: `Joined ${def.name}` }] };
  p.flags["lastPartyChange"] = state.clock.monthIndex;
  // meet local figures
  for (const c of localPartyFigures(state, partyId).slice(0, 4)) ensureRelationship(state, c.id, "party", 4 + Math.round(p.politics.capital * 0.1));
  const chair = state.parties[partyId].chairId;
  if (chair) ensureRelationship(state, chair, "party", 2);
  careerLog(state, `Joined ${def.name}.`);
  pushNews(state, { headline: `${p.name} joins ${def.name}`, topic: "party", importance: 1, partyId, stateId: p.residenceStateId, source: `join:${p.id}:${state.clock.monthIndex}`, personal: true });
  p.politics.capital = clamp100(p.politics.capital + 3);
  return good(`You are now a member of ${def.name}. Ward members welcome you.`);
}

export function leaveParty(state: GameState, reason = "left the party"): Result {
  const p = state.player;
  const m = p.politics.membership;
  if (!m) return fail("You are not in a party.");
  const def = partyDefOf(state, m.partyId);
  for (const r of Object.values(p.relationships)) {
    if (r.kind === "party") r.affinity = clamp(r.affinity - 12, -100, 100);
  }
  // pending nomination in this party is lost
  for (const c of p.politics.candidacies) if (c.stage === "aspirant" || c.stage === "nominee") c.stage = "withdrawn";
  p.politics.membership = null;
  p.flags["lastPartyChange"] = state.clock.monthIndex;
  careerLog(state, `Left ${def?.name ?? "party"}: ${reason}.`);
  return good(`You have left ${def?.name ?? "the party"}.`);
}

export function defect(state: GameState, toPartyId: PartyId): Result {
  const p = state.player;
  const m = p.politics.membership;
  if (!m) return joinParty(state, toPartyId);
  if (m.partyId === toPartyId) return fail("You are already in that party.");
  const toDef = partyDefOf(state, toPartyId);
  if (!toDef || !state.parties[toPartyId]?.exists) return fail("That party does not exist.");
  const from = partyDefOf(state, m.partyId);
  const wasOfficeHolder = !!p.politics.seatId;
  // consequences: supporters from the old party's strongholds are lost; trust damaged; old allies turn cold
  for (const r of Object.values(p.relationships)) {
    const c = state.chars[r.id];
    if (c?.partyId === m.partyId) r.affinity = clamp(r.affinity - 15, -100, 100);
  }
  for (const k of Object.keys(p.fame.lgas)) {
    const aff = state.lgas[k]?.affinity[m.partyId] ?? 0;
    p.fame.lgas[k] = clamp100(p.fame.lgas[k] * (1 - 0.15 * Math.min(1, aff * 3)));
  }
  p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 3);
  p.attrs.reputation = clamp100(p.attrs.reputation - 2);
  p.politics.defections += 1;
  for (const c of p.politics.candidacies) if (c.stage === "aspirant" || c.stage === "nominee") c.stage = "withdrawn";
  p.politics.membership = null;
  p.flags["lastPartyChange"] = state.clock.monthIndex - ruleOf(state).eligibility.defectionCooldownMonths; // allow immediate join
  const res = joinParty(state, toPartyId);
  if (res.ok) {
    const nm = state.player.politics.membership;
    if (nm) nm.standing = 15;
    // the new party gives opportunities: a small boost in capital if the player is notable
    p.politics.capital = clamp100(p.politics.capital + (p.fame.national > 15 ? 4 : 0));
    if (wasOfficeHolder) {
      // elected under the old party's platform: voters notice
      p.integrity.publicTrust = clamp100(p.integrity.publicTrust - 3);
    }
    pushNews(state, { headline: `${p.name} defects from ${from?.abbr ?? "party"} to ${toDef.abbr}`, body: "The move draws criticism from former colleagues and praise from new ones.", topic: "party", importance: wasOfficeHolder ? 2 : 1, partyId: toPartyId, stateId: p.residenceStateId, source: `defect:${state.clock.monthIndex}:${p.politics.defections}`, personal: true });
    careerLog(state, `Defected from ${from?.abbr} to ${toDef.abbr}.`);
  }
  return res;
}

// ---------------------------------------------------------------- party offices
export const PARTY_POSTS = {
  ward: ["Ward Secretary", "Ward Chairman"],
  lga: ["LGA Party Secretary", "LGA Party Chairman"],
  state: ["State Party Secretary", "State Party Chairman"],
  national: ["National Youth Leader", "National Chairman"],
} as const;
type PartyLevel = keyof typeof PARTY_POSTS;

const PARTY_OFFICE_COST: Record<PartyLevel, number> = { ward: 20_000, lga: 150_000, state: 1_200_000, national: 15_000_000 };

export function partyOfficeChance(state: GameState, level: PartyLevel, top: boolean): { p: number; why: string[] } {
  const m = state.player.politics.membership;
  if (!m) return { p: 0, why: ["Join a party first"] };
  const a = state.player.attrs;
  const fameHere = level === "ward" || level === "lga" ? state.player.fame.lgas[state.player.residenceLgaId] ?? 0 : level === "state" ? state.player.fame.states[state.player.residenceStateId] ?? 0 : state.player.fame.national;
  const levelDiff = { ward: 0, lga: 0.12, state: 0.3, national: 0.5 }[level] + (top ? 0.12 : 0);
  const base = 0.62 - levelDiff;
  const score = base + (m.standing - 40) / 200 + (fameHere - 10) / 200 + (a.leadership - 50) / 250 + (a.negotiation - 50) / 300 + (state.player.politics.capital - 20) / 400;
  const why = [`Party standing ${Math.round(m.standing)}`, `Local name recognition ${Math.round(fameHere)}`, `Leadership ${Math.round(a.leadership)}`];
  return { p: clamp(score, 0.03, 0.9), why };
}

export function applyPartyOffice(state: GameState, level: PartyLevel, top: boolean): Result {
  const p = state.player;
  const m = p.politics.membership;
  if (!m) return fail("Join a party first.");
  if (playerAge(state) < 18) return fail("Too young.");
  if (level === "state" && !(m.office || p.politics.seatId || m.standing >= 40)) return fail("You need more standing in the party before a state-level post.");
  if (level === "national" && (m.standing < 60 || p.politics.capital < 30)) return fail("National posts need party standing 60+ and political capital 30+.");
  if (m.office && PARTY_POSTS[m.office.level as PartyLevel] && m.office.level === level && m.office.post === PARTY_POSTS[level][top ? 1 : 0]) return fail("You already hold that post.");
  const cost = Math.round(PARTY_OFFICE_COST[level] * (top ? 1.5 : 1) * priceLevel(state));
  if (!canAfford(state, cost)) return fail(`You need about ₦${cost.toLocaleString()} for mobilisation and dues.`);
  debit(state, "party", cost, `Campaign for ${PARTY_POSTS[level][top ? 1 : 0]}`);
  const { p: chance } = partyOfficeChance(state, level, top);
  const rng = subRng(state.meta.seed, "partyoffice", state.clock.monthIndex, level, top ? 1 : 0, Object.keys(p.relationships).length);
  const won = rng.chance(chance);
  const post = PARTY_POSTS[level][top ? 1 : 0];
  const scopeId = level === "ward" || level === "lga" ? p.residenceLgaId : level === "state" ? p.residenceStateId : "NG";
  if (won) {
    m.office = { level: level === "lga" ? "lga" : level, post, scopeId, since: state.clock.monthIndex };
    m.standing = clamp100(m.standing + 8 + (top ? 6 : 0));
    p.politics.capital = clamp100(p.politics.capital + 4);
    p.attrs.politicalExperience = clamp100(p.attrs.politicalExperience + 3);
    if (level === "national" && top) {
      const old = state.parties[m.partyId].chairId;
      state.parties[m.partyId].chairId = "player";
      if (old && state.chars[old]) addRecord(state.chars[old], state.clock.monthIndex, "Lost the party chairmanship to a challenger.");
    }
    careerLog(state, `Elected ${post} (${partyDefOf(state, m.partyId)?.abbr}).`);
    pushNews(state, { headline: `${p.name} elected ${post} of ${partyDefOf(state, m.partyId)?.abbr}`, topic: "party", importance: level === "national" ? 3 : 1, partyId: m.partyId, stateId: p.residenceStateId, source: `partyoffice:${state.clock.monthIndex}:${level}`, personal: true });
    return good(`You are now ${post}.`);
  }
  m.standing = clamp100(m.standing - 3);
  return fail(`You lost the contest for ${post}. Your standing took a small knock.`);
}

/** Party office expires after 48 months; the player must run again. */
export function expirePartyOffice(state: GameState): void {
  const m = state.player.politics.membership;
  if (m?.office && state.clock.monthIndex - m.office.since >= 48) {
    notify(state, `Your term as ${m.office.post} has ended.`, "info");
    m.office = null;
  }
}

// ---------------------------------------------------------------- founding a party
export interface NewPartyConfig { name: string; abbr: string; color: string; economic: number; social: number; federalism: number; motto: string }
export function foundingRequirements(state: GameState) {
  const r = ruleOf(state).newParty;
  const fee = Math.round(r.registrationFee * 0.0004 * priceLevel(state)); // scaled to personal-wealth scale (simulation)
  return { fee, minFame: 25, minCapital: 40, minStateOffices: r.minStateOffices, months: 12, note: r.simulated };
}
export function startFoundingParty(state: GameState, cfg: NewPartyConfig): Result {
  const p = state.player;
  const req = foundingRequirements(state);
  if (p.politics.foundedPartyId || p.flags["partyFoundingStart"] !== undefined) return fail("You already have a party in progress or registered.");
  if (playerAge(state) < 21) return fail("Founders must be at least 21.");
  if (p.fame.national < req.minFame) return fail(`You need national name recognition of at least ${req.minFame}.`);
  if (p.politics.capital < req.minCapital) return fail(`You need ${req.minCapital}+ political capital to rally founding members.`);
  if (!canAfford(state, req.fee)) return fail(`Registration and state-office set-up cost about ₦${req.fee.toLocaleString()}.`);
  if (!cfg.name.trim() || !cfg.abbr.trim() || cfg.abbr.length > 5) return fail("Give the party a name and an abbreviation of up to 5 letters.");
  if ([...PARTIES, ...Object.values(state.customParties)].some((d) => d.abbr.toLowerCase() === cfg.abbr.trim().toLowerCase())) return fail("A party with that abbreviation exists.");
  debit(state, "party", req.fee, `Registering ${cfg.abbr.toUpperCase()} and opening state offices`);
  p.flags["partyFoundingStart"] = state.clock.monthIndex;
  p.flags["partyFoundingCfg"] = JSON.stringify(cfg);
  p.politics.capital = clamp100(p.politics.capital - 15);
  careerLog(state, `Began registering a new party, ${cfg.name}.`);
  return good(`Registration has begun. The electoral commission will rule in about ${req.months} months.`);
}

/** Monthly: complete party registration after the processing period. */
export function processPartyFounding(state: GameState): void {
  const p = state.player;
  const start = p.flags["partyFoundingStart"];
  if (typeof start !== "number" || p.politics.foundedPartyId) return;
  if (state.clock.monthIndex - start < 12) return;
  const cfg: NewPartyConfig = JSON.parse(String(p.flags["partyFoundingCfg"]));
  const id = `U${state.nextId++}`;
  const z = STATE_BY_ID[p.residenceStateId].zone;
  const zs = {} as Record<ZoneId, number>;
  for (const k of Object.keys(ZONES) as ZoneId[]) zs[k] = k === z ? 0.1 : 0.03;
  const def: PartyDef = {
    id, name: cfg.name.trim(), abbr: cfg.abbr.trim().toUpperCase(), color: cfg.color, textColor: "#ffffff", motto: cfg.motto || "A new voice.",
    style: "movement", blurb: `Founded by ${p.name}.`, ideology: { economic: cfg.economic, social: cfg.social, federalism: cfg.federalism },
    priorities: { economy: 0.25, integrity: 0.2, education: 0.15, security: 0.15, health: 0.1, infrastructure: 0.1, power: 0.05 },
    factions: [{ id: "founders", name: "Founding Members", blurb: "The founder's core team." }], orgStrength: 8, zoneStrength: zs, fundsM: 10, reputation: 55, urbanLean: 0.2,
    leadership: "Founder-led", primaryStyle: "consensus-prone",
  };
  state.customParties[id] = def;
  state.parties[id] = { id, fundsM: 10, reputation: 55, orgStrength: 8, chairId: "player", secretaryId: null, memberCount: 40, factionPower: { founders: 100 }, momentum: 0, exists: true, founderId: "player", inPower: false };
  // inject into every LGA's affinity: base share scaled by local fame and home zone
  for (const l of Object.values(state.lgas)) {
    const sid = l.id.split("-").slice(0, 2).join("-");
    const local = STATE_BY_ID[sid];
    const share = local.zone === z ? 0.03 : 0.012;
    const fameBoost = (p.fame.lgas[l.id] ?? 0) / 600 + (p.fame.states[sid] ?? 0) / 1500;
    const add = share + fameBoost;
    for (const k of Object.keys(l.affinity)) l.affinity[k] *= 1 - add;
    l.affinity[id] = add;
  }
  // leave current party quietly, found a new one
  p.politics.membership = null;
  p.politics.foundedPartyId = id;
  p.politics.membership = { partyId: id, since: state.clock.monthIndex, factionId: "founders", office: { level: "national", post: "Founder & National Chairman", scopeId: "NG", since: state.clock.monthIndex }, standing: 90, history: [{ m: state.clock.monthIndex, text: "Founded the party" }] };
  p.flags["partyFoundingStart"] = -1;
  careerLog(state, `${def.name} (${def.abbr}) was registered.`);
  pushNews(state, { headline: `Electoral commission registers new party: ${def.name} (${def.abbr})`, body: `The party is led by its founder, ${p.name}.`, topic: "party", importance: 2, partyId: id, source: `party:${id}`, personal: true });
  notify(state, `${def.name} has been registered. You lead it.`, "good");
}

// ---------------------------------------------------------------- seats: succession & removal
export function expelFromParty(state: GameState, reason: string): void {
  const m = state.player.politics.membership;
  if (!m) return;
  careerLog(state, `Expelled from ${partyDefOf(state, m.partyId)?.abbr}: ${reason}.`);
  state.player.politics.membership = null;
  state.player.flags["lastPartyChange"] = state.clock.monthIndex;
  for (const c of state.player.politics.candidacies) if (c.stage === "aspirant" || c.stage === "nominee") c.stage = "withdrawn";
}

export function removePlayerFromOffice(state: GameState, reason: string): void {
  const p = state.player;
  const seat = playerSeat(state);
  if (!seat) return;
  const open = p.politics.pastOffices.find((o) => o.to === null);
  if (open) {
    open.to = state.clock.monthIndex;
    open.reason = reason;
  }
  p.politics.seatId = null;
  seat.holderId = null;
  vacateSeat(state, seat.id, reason, true);
  careerLog(state, `Left office as ${seat.label}: ${reason}.`);
  p.occupation = { kind: "unemployed", jobId: null, title: "Former office-holder", baseSalary: 0, since: state.clock.monthIndex, grade: 0, timePct: 0 };
}

/** Replace the holder of a seat after removal/death/conviction. The same party fills it (deputy or by-election). */
export function vacateSeat(state: GameState, seatId: string, reason: string, skipOld = false): void {
  const seat = state.seats[seatId];
  if (!seat) return;
  const old = seat.holderId ? state.chars[seat.holderId] : null;
  if (old && !skipOld) {
    old.seatId = null;
    addRecord(old, state.clock.monthIndex, `Left office (${reason}).`);
  }
  const rng = subRng(state.meta.seed, "vacate", seatId, state.clock.monthIndex);
  const party = seat.partyId ?? Object.keys(state.parties)[0];
  const home = seat.lgaIds.length ? seat.lgaIds[0] : Object.values(state.lgas)[0].id;
  const sid = seat.stateId ?? home.split("-").slice(0, 2).join("-");
  const profile = seat.office;
  const c = makePolitician(state, rng, 2026, { stateId: sid, lgaId: home, partyId: party, profile, role: "Acting" });
  c.seatId = seat.id;
  seat.holderId = c.id;
  seat.partyId = party;
  seat.termStart = state.clock.monthIndex;
  const label = seat.office === "governor" ? `Deputy governor ${c.name} sworn in as governor of ${seat.stateId ? stateName(seat.stateId) : ""}` : `${c.name} takes over as ${seat.label} after a by-election`;
  pushNews(state, { headline: label, topic: seat.stateId ? "state" : "national", importance: seat.office === "governor" || seat.office === "president" ? 3 : 1, stateId: seat.stateId, partyId: party, source: `vacate:${seatId}:${state.clock.monthIndex}` });
}

export { LGAS_BY_STATE, newId, credit };
