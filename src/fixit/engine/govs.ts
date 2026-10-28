/**
 * The 36 governors. Each state has its own: skill decides how much your projects do there, honesty how much leaks, loyalty how
 * they treat you. Before you take office your party holds primaries in the biggest states and you back the ones you want.
 */
import { subRng } from "../../game/engine/rng";
import { STATES } from "../../game/data/states";
import type { FixState, Portrait, StateGov } from "./types";
import { clamp, clamp100 } from "./util";

const FIRST = ["Babajide", "Ahmed", "Ugochukwu", "Douye", "Simon", "Inuwa", "Folasade", "Nkechi", "Umar", "Abdulrazaq", "Hope", "Seyi", "Aminu", "Chioma", "Yakubu", "Zainab", "Peter", "Mohammed", "Ifeoma", "Bala", "Godwin", "Hadiza", "Tunde", "Obiora", "Nasir", "Ene", "Bassey", "Aisha", "Gideon", "Kehinde", "Lawal", "Rotimi", "Danjuma", "Ngozi", "Isa", "Dakuku"];
const LAST = ["Okunade", "Shettima", "Mbah", "Diri", "Lalong", "Yahaya", "Adeleke", "Obiano", "Namadi", "Abiodun", "Uzodimma", "Fubara", "Bago", "Sule", "Makinde", "Abdullahi", "Ortom", "Radda", "Soludo", "Otti", "Eno", "Mutfwang", "Zulum", "Buni", "Yusuf", "Mohammed", "Oyebanji", "Alia", "Ododo", "Nwifuru", "Lawan", "Aliyu", "Akpabio", "Ganduje", "Bello", "Fintiri"];
const BIO = {
  good: ["Ran a good ministry before politics.", "Turned around a failing hospital as a commissioner.", "A former bank executive who reads budgets for fun.", "Built a reputation as a no-nonsense builder."],
  mid: ["A career party man with a big network.", "A popular businessman, untested in office.", "A former lawmaker who knows how the system works.", "A charismatic speaker who fills stadiums."],
  bad: ["Rumoured to have a very close relationship with contractors.", "A loud politician with a thin record.", "Won on name recognition and little else.", "Has a way of finding money that nobody can trace."],
};
const portraitFor = (seed: number, key: string): Portrait => { const r = subRng(seed, "govp", key); return { skin: r.int(1, 5), hair: r.int(0, 3), style: r.int(0, 3), accent: r.int(0, 4) }; };
const statesOnly = () => STATES.filter((x) => !x.isFct);

function makeGov(s: FixState, stateId: string, rng: ReturnType<typeof subRng>, bias = 0): StateGov {
  const zone = STATES.find((x) => x.id === stateId)?.zone;
  const zg = s.governors.find((g) => g.zone === zone);
  const party: "NPP" | "PRA" = zg ? (rng.chance(0.78) ? zg.party : zg.party === "NPP" ? "PRA" : "NPP") : "NPP";
  const skill = Math.round(clamp(rng.normal(55 + bias, 16), 20, 92)), integrity = Math.round(clamp(rng.normal(50 + bias * 0.6, 18), 12, 92));
  const bio = rng.pick(skill >= 65 && integrity >= 55 ? BIO.good : skill < 45 || integrity < 38 ? BIO.bad : BIO.mid);
  const name = `Gov. ${rng.pick(FIRST)} ${rng.pick(LAST)}`;
  return { stateId, name, party, skill, integrity, loyalty: Math.round(clamp(46 + (party === "NPP" ? 8 : -6) + rng.range(-8, 8), 10, 90)), ambition: Math.round(rng.range(15, 90)), since: 0, terms: 1, bio, portrait: portraitFor(s.meta.seed, `${stateId}:${name}`) };
}

export function initGovs(s: FixState) {
  const rng = subRng(s.meta.seed, "govs36");
  s.govs = statesOnly().map((st) => makeGov(s, st.id, rng));
}
export const govOf = (s: FixState, stateId: string): StateGov | undefined => s.govs?.find((g) => g.stateId === stateId);

/** how well a state's governor turns your federal money into results (0.5 .. 1.3) */
export function govMult(s: FixState, stateId: string): number {
  const g = govOf(s, stateId);
  if (!g) return 1;
  return clamp(0.55 + 0.6 * (g.skill / 100) + 0.15 * (g.loyalty / 100) - 0.1 * (1 - g.integrity / 100), 0.5, 1.3);
}
/** extra share of a project's money lost in this state because the governor's hands are not clean */
export const govLeak = (s: FixState, stateId: string): number => { const g = govOf(s, stateId); return g ? 0.07 * (1 - g.integrity / 100) : 0; };

// ---------------------------------------------------------------- the primaries
export interface Cand { id: string; name: string; skill: number; integrity: number; loyalty: number; strength: number; bio: string; portrait: Portrait }
export interface Race { stateId: string; cands: Cand[] }
export interface PrimaryResult { stateId: string; winner: string; backed: string | null; youWon: boolean }
export const ENDORSEMENTS = 3;

export function primaryRaces(s: FixState): Race[] {
  const rng = subRng(s.meta.seed, "primary");
  const pool = statesOnly().map((st) => ({ id: st.id, w: st.pop2006m }));
  const chosen: string[] = [];
  while (chosen.length < 6 && pool.length) {
    const tot = pool.reduce((a, b) => a + b.w, 0); let x = rng.next() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
    chosen.push(pool.splice(i, 1)[0].id);
  }
  return chosen.map((stateId) => {
    const cands: Cand[] = [0, 1, 2].map((i) => {
      const g = makeGov(s, stateId, rng, i === 0 ? 8 : i === 1 ? 0 : -6);
      const loyalty = Math.round(clamp(g.loyalty + (i === 2 ? 10 : 0), 10, 90));
      return { id: `${stateId}:${i}`, name: g.name, skill: g.skill, integrity: g.integrity, loyalty, strength: i === 0 ? 30 : i === 1 ? 38 : 40, bio: g.bio, portrait: g.portrait };
    });
    return { stateId, cands };
  });
}
export function currentPrimary(s: FixState): { races: Race[]; picks: Record<string, string>; result?: PrimaryResult[] } | null {
  try { return s.flags.primary ? JSON.parse(String(s.flags.primary)) : null; } catch { return null; }
}
export function startPrimary(s: FixState) { s.flags.primary = JSON.stringify({ races: primaryRaces(s), picks: {} }); }
export function backCandidate(s: FixState, stateId: string, candId: string | null): { ok: boolean; message: string } {
  const p = currentPrimary(s); if (!p) return { ok: false, message: "No primary is under way." };
  if (candId === null) delete p.picks[stateId];
  else {
    if (!p.races.find((r) => r.stateId === stateId)?.cands.some((c) => c.id === candId)) return { ok: false, message: "Unknown candidate." };
    if (!p.picks[stateId] && Object.keys(p.picks).length >= ENDORSEMENTS) return { ok: false, message: `You only have ${ENDORSEMENTS} endorsements. Withdraw one first.` };
    p.picks[stateId] = candId;
  }
  s.flags.primary = JSON.stringify(p);
  return { ok: true, message: "" };
}
/** winners are drawn from strength, plus a big push for the one you back; then they take over their state */
export function finishPrimary(s: FixState): PrimaryResult[] {
  const p = currentPrimary(s); if (!p) return [];
  const rng = subRng(s.meta.seed, "primary-result");
  const out: PrimaryResult[] = [];
  for (const r of p.races) {
    const backed = p.picks[r.stateId] ?? null;
    const scores = r.cands.map((c) => c.strength + rng.range(0, 40) + (c.id === backed ? 32 : 0));
    const w = r.cands[scores.indexOf(Math.max(...scores))];
    const g = s.govs.find((x) => x.stateId === r.stateId);
    const next: StateGov = { stateId: r.stateId, name: w.name, party: "NPP", skill: w.skill, integrity: w.integrity, loyalty: w.id === backed ? clamp100(w.loyalty + 18) : backed ? clamp100(w.loyalty - 10) : w.loyalty, ambition: g?.ambition ?? 50, since: 0, terms: 1, backed: w.id === backed, bio: w.bio, portrait: w.portrait };
    s.govs = s.govs.map((x) => (x.stateId === r.stateId ? next : x));
    out.push({ stateId: r.stateId, winner: w.name, backed: backed ? r.cands.find((c) => c.id === backed)!.name : null, youWon: w.id === backed });
  }
  p.result = out; s.flags.primary = JSON.stringify(p); s.flags.primaryDone = 1;
  return out;
}
