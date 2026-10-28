/**
 * The 36 governors. Each state has its own: skill decides how much your projects do there, honesty how much leaks, loyalty how
 * they treat you. Before you take office your party holds primaries in the biggest states and you back the ones you want.
 */
import { subRng } from "../../game/engine/rng";
import { STATES } from "../../game/data/states";
import type { FixState, Portrait, StateGov } from "./types";
import { clamp, clamp100, nb, pushNews } from "./util";
import type { Rng } from "../../game/engine/rng";
import { createEvent } from "./spawn";
import { noteStolen, recoverLoot } from "./ledger";
import { earnPc, payPc } from "./meta";

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

export function primaryRaces(s: FixState, mid = false): Race[] {
  const rng = subRng(s.meta.seed, "primary", ...(mid ? ["mid", s.month] : []));
  const pool = statesOnly().map((st) => ({ id: st.id, w: st.pop2006m }));
  const chosen: string[] = [];
  while (chosen.length < 6 && pool.length) {
    const tot = pool.reduce((a, b) => a + b.w, 0); let x = rng.next() * tot, i = 0;
    for (; i < pool.length - 1; i++) { x -= pool[i].w; if (x <= 0) break; }
    chosen.push(pool.splice(i, 1)[0].id);
  }
  return chosen.map((stateId) => {
    const inc = mid ? s.govs.find((x) => x.stateId === stateId) : undefined;
    const cands: Cand[] = [0, 1, 2].map((i) => {
      if (inc && i === 0) return { id: `${stateId}:0`, name: inc.name, skill: inc.skill, integrity: inc.integrity, loyalty: Math.round(inc.loyalty), strength: Math.round(32 + inc.skill * 0.25 + (s.gov.approval - 50) * 0.2), bio: `The sitting governor, seeking another term. ${inc.bio}`, portrait: inc.portrait };
      const g = makeGov(s, stateId, rng, i === 0 ? 8 : i === 1 ? 0 : -6);
      const loyalty = Math.round(clamp(g.loyalty + (i === 2 ? 10 : 0), 10, 90));
      return { id: `${stateId}:${i}`, name: g.name, skill: g.skill, integrity: g.integrity, loyalty, strength: i === 0 ? 30 : i === 1 ? 38 : 40, bio: g.bio, portrait: g.portrait };
    });
    return { stateId, cands };
  });
}
export function currentPrimary(s: FixState): { races: Race[]; picks: Record<string, string>; result?: PrimaryResult[]; mid?: boolean } | null {
  try { return s.flags.primary ? JSON.parse(String(s.flags.primary)) : null; } catch { return null; }
}
export function startPrimary(s: FixState, mid = false) { s.flags.primary = JSON.stringify({ races: primaryRaces(s, mid), picks: {}, mid }); if (mid) { delete s.flags.primarySeen; delete s.flags.primaryDone; } }
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
    const keeps = p.mid && w.id === `${r.stateId}:0` && g;
    const next: StateGov = keeps ? { ...g!, terms: g!.terms + 1, backed: w.id === backed, loyalty: w.id === backed ? clamp100(g!.loyalty + 12) : backed ? clamp100(g!.loyalty - 8) : g!.loyalty } : { stateId: r.stateId, name: w.name, party: "NPP", skill: w.skill, integrity: w.integrity, loyalty: w.id === backed ? clamp100(w.loyalty + 18) : backed ? clamp100(w.loyalty - 10) : w.loyalty, ambition: g?.ambition ?? 50, since: s.month, terms: 1, backed: w.id === backed, bio: w.bio, portrait: w.portrait };
    s.govs = s.govs.map((x) => (x.stateId === r.stateId ? next : x));
    out.push({ stateId: r.stateId, winner: w.name, backed: backed ? r.cands.find((c) => c.id === backed)!.name : null, youWon: w.id === backed });
  }
  p.result = out; s.flags.primary = JSON.stringify(p); s.flags.primaryDone = 1;
  return out;
}

// ---------------------------------------------------------------- governors with lives
const CRISIS_NEED = 70;
export function replaceGov(s: FixState, stateId: string, why: string) {
  const old = s.govs.find((g) => g.stateId === stateId); if (!old) return;
  const rng = subRng(s.meta.seed, "repl", stateId, s.month);
  const g = makeGov(s, stateId, rng); g.since = s.month; g.party = "NPP"; g.loyalty = clamp100(g.loyalty + 8);
  s.govs = s.govs.map((x) => (x.stateId === stateId ? g : x));
  s.gone.push({ id: `gov:${stateId}:${s.month}`, name: old.name, role: `Governor of ${STATES.find((x) => x.id === stateId)?.name}`, how: "jailed", month: s.month, stateId });
  pushNews(s, { source: `govrepl:${stateId}:${s.month}`, headline: `${g.name.replace("Gov. ", "")} sworn in as governor of ${STATES.find((x) => x.id === stateId)?.name}`, body: why, tone: "neutral", stateId });
}

export function govsMonthly(s: FixState, rng: Rng) {
  if (!s.govs?.length) return;
  const press = s.rule.pressFreedom / 100;
  for (const g of s.govs) {
    const r = s.regions[g.stateId]; if (!r) continue;
    // good governors make their state better, bad ones let it slide
    const d = 0.12 * ((g.skill - 50) / 50);
    for (const k of ["jobless", "insecurity", "food", "power"] as const) r.off[k] = clamp100(r.off[k] - d);
    g.loyalty = clamp100(g.loyalty + 0.03 * (55 + (g.party === "NPP" ? 6 : -8) - g.loyalty) + rng.normal(0, 0.4));
    if (s.month < 6) continue;
    // loot: the less honest, the likelier
    if (rng.chance(0.004 + 0.03 * (1 - g.integrity / 100) ** 2)) {
      const amount = Math.round(rng.range(25, 110)); noteStolen(s, amount); s.fin.treasury = Math.max(0, s.fin.treasury - amount * 0.2); r.unrest = clamp100(r.unrest + 2);
      if (rng.chance(0.22 + 0.4 * press) && !s.events.some((e) => (e.tpl === "govScandal") && e.status === "open")) { s.flags.govPending = g.stateId; s.flags.govAmt = amount; createEvent(s, "govScandal", g.stateId); }
    }
    // crisis in a badly run state
    if (r.unrest >= CRISIS_NEED && g.skill < 52 && !s.events.some((e) => e.tpl === "govCrisis" && e.status === "open") && rng.chance(0.14)) { s.flags.govPending = g.stateId; createEvent(s, "govCrisis", g.stateId); }
    // a governor who feels forgotten may cross the floor
    if (g.party === "NPP" && g.loyalty < 22 && g.ambition > 58 && rng.chance(0.03)) {
      g.party = "PRA"; s.assembly.support = clamp100(s.assembly.support - 3);
      pushNews(s, { source: `govdef:${g.stateId}:${s.month}`, headline: `${g.name.replace("Gov. ", "")} defects to the opposition`, body: `The governor of ${STATES.find((x) => x.id === g.stateId)?.name} says Abuja has forgotten the state.`, tone: "bad", stateId: g.stateId });
    }
    // a good governor delivers a visible win now and then
    if (g.skill >= 72 && g.integrity >= 55 && rng.chance(0.012)) { earnPc(s, 1); s.gov.trust = clamp100(s.gov.trust + 0.4); pushNews(s, { source: `govwin:${g.stateId}:${s.month}`, headline: `${g.name.replace("Gov. ", "")} opens a new market and clinic in ${STATES.find((x) => x.id === g.stateId)?.name}`, body: "Locals call it the best-run state in the region.", tone: "good", stateId: g.stateId }); }
  }
  // governorship elections at the midterm of every four-year cycle
  if (s.month > 0 && s.month % 24 === 0 && !s.flags[`govel:${s.month}`] && s.staff?.picked) { s.flags[`govel:${s.month}`] = 1; startPrimary(s, true); }
}

/** what you can do about a governor, and what each costs */
export const GOV_ACTIONS = [
  { id: "release", label: "Release overdue federal funds", cost: 80, pc: 3, explain: "Cash for the state. The governor warms to you." },
  { id: "withhold", label: "Withhold federal funds", cost: 0, pc: 3, explain: "Pressure on a governor who is stealing or plotting. The state suffers." },
  { id: "investigate", label: "Send the anti-graft agency", cost: 5, pc: 8, explain: "Find out what the governor is really up to." },
] as const;
export function govAction(s: FixState, stateId: string, action: (typeof GOV_ACTIONS)[number]["id"]): { ok: boolean; message: string } {
  const g = s.govs.find((x) => x.stateId === stateId), r = s.regions[stateId], def = GOV_ACTIONS.find((a) => a.id === action);
  if (!g || !r || !def) return { ok: false, message: "Unknown state." };
  const key = `govact:${stateId}:${action}`;
  if (typeof s.flags[key] === "number" && s.month - (s.flags[key] as number) < 6) return { ok: false, message: "You did that recently. Give it time." };
  const mult = 0.6 + 0.4 * s.eco.priceLevel / 100;
  if (def.cost * mult > s.fin.treasury) return { ok: false, message: `You need ${nb(def.cost * mult)}.` };
  const pcE = payPc(s, def.pc, def.label.toLowerCase()); if (pcE) return { ok: false, message: pcE };
  s.fin.treasury -= def.cost * mult; s.flags[key] = s.month;
  const name = g.name.replace("Gov. ", "");
  if (action === "release") { g.loyalty = clamp100(g.loyalty + 12); r.unrest = clamp100(r.unrest - 3); return { ok: true, message: `The money reached ${name}'s state, and ${name} sent thanks.${g.integrity < 40 ? " Some of it will not reach the people." : ""}` }; }
  if (action === "withhold") { g.loyalty = clamp100(g.loyalty - 10); r.unrest = clamp100(r.unrest + 4); r.off.jobless = clamp100(r.off.jobless + 0.6); if (g.integrity < 45) g.integrity = clamp100(g.integrity + 2); return { ok: true, message: `${name} was told the tap is closed. The state will feel it.` }; }
  const guilty = g.integrity < 45 && s.month > 3;
  if (guilty) { const amt = Math.round(40 + (50 - g.integrity) * 2); const rec = recoverLoot(s, amt * 0.5, name); s.gone.push({ id: `gov:${stateId}:${s.month}`, name: g.name, role: `Governor of ${STATES.find((x) => x.id === stateId)?.name}`, how: "jailed", month: s.month, stateId }); replaceGov(s, stateId, `The previous governor was removed after an anti-graft probe; ${nb(rec)} was recovered.`); return { ok: true, message: `Investigators found ${nb(amt)} missing. ${name} was removed and ${nb(rec)} recovered.` }; }
  g.loyalty = clamp100(g.loyalty - 5);
  return { ok: true, message: `The agency found nothing on ${name}, who is offended at being investigated.` };
}

const gname = (s: FixState) => { const id = String(s.flags.govPending ?? ""); return { id, g: s.govs.find((x) => x.stateId === id), st: STATES.find((x) => x.id === id)?.name ?? id }; };
const opt = (id: string, label: string, explain: string, tradeoff: string, win: object, lose: object, chance: number | ((s: FixState) => number), cost = 0) => ({ id, label, explain, cost, tradeoff, unc: "medium" as const, chance: typeof chance === "number" ? () => chance : chance, win, lose, winText: "", loseText: "" });
export const GOV_TEMPLATES = [
  {
    id: "govScandal", kind: "scandal" as const, urgency: 2,
    title: (s: FixState) => { const { g, st } = gname(s); return `${g?.name.replace("Gov. ", "") ?? "The governor"} accused of looting ${st}`; },
    cause: (s: FixState) => { const { st } = gname(s); return `Auditors say about ${nb(Number(s.flags.govAmt ?? 50))} of ${st}'s money went missing, and the trail leads to the governor's office.`; },
    options: [
      opt("prosecute", "Have him prosecuted", "Let the anti-corruption law do its work.", "A removed governor has friends.", { run: (s: FixState) => { const { id, g, st } = gname(s); const amt = Number(s.flags.govAmt ?? 50); const rec = recoverLoot(s, amt * 0.6, g?.name ?? st); replaceGov(s, id, `The governor was removed over looted funds; ${nb(rec)} recovered.`); s.gov.trust = clamp100(s.gov.trust + 2); return `${g?.name.replace("Gov. ", "")} was removed and ${nb(rec)} recovered. A new governor was sworn in.`; } }, { run: (s: FixState) => { const { g } = gname(s); if (g) g.loyalty = clamp100(g.loyalty + 8); s.gov.trust = clamp100(s.gov.trust - 1); return "The case collapsed in court and the governor walked free, laughing."; } }, (s) => 0.4 + 0.5 * (s.rule.judiciary / 100), 5),
      opt("warn", "Warn him privately", "A quiet word and a final warning.", "He may learn, or he may learn to hide it.", { run: (s: FixState) => { const { g } = gname(s); if (g) { g.integrity = clamp100(g.integrity + 10); g.loyalty = clamp100(g.loyalty - 6); } return "He promised to behave. For a while, he did."; } }, { run: (s: FixState) => { const { g } = gname(s); if (g) g.loyalty = clamp100(g.loyalty - 8); return "He took the warning as an insult."; } }, 0.5),
      opt("protect", "Protect him: he is useful", "A governor you protect owes you.", "Your name is now on the file too.", { evidence: 6, run: (s: FixState) => { const { g } = gname(s); if (g) g.loyalty = clamp100(g.loyalty + 16); return "He is grateful and will remember it. So will the press."; } }, { evidence: 9, trust: -2 }, 0.9),
    ],
    expire: { run: (s: FixState) => { const { g } = gname(s); if (g) g.loyalty = clamp100(g.loyalty + 4); return "Nothing happened to him, and everyone noticed."; } }, expireText: () => "You did nothing, and the governor noticed.",
  },
  {
    id: "govCrisis", kind: "story" as const, urgency: 2,
    title: (s: FixState) => { const { g, st } = gname(s); return `${g?.name.replace("Gov. ", "") ?? "The governor"} asks Abuja for emergency help in ${st}`; },
    cause: (s: FixState) => { const { st } = gname(s); return `${st} is boiling: prices, jobs and anger are out of control, and the governor admits he cannot handle it. "Abuja, please."`; },
    options: [
      opt("help", "Send emergency federal help", "Money and a federal team.", "It rewards a weak governor.", { run: (s: FixState) => { const { id, g } = gname(s); const r = s.regions[id]; if (r) r.unrest = clamp100(r.unrest - 14); if (g) g.loyalty = clamp100(g.loyalty + 8); return "The federal team stabilised the state. The governor is grateful and a little embarrassed."; } }, { run: (s: FixState) => { const { id } = gname(s); const r = s.regions[id]; if (r) r.unrest = clamp100(r.unrest - 4); return "Help arrived, but too late to matter much."; } }, (s) => 0.5 + 0.35 * s.gov.capacity / 100, 120),
      opt("takeover", "Send a minister to take charge", "Take direct control for a while.", "The governor will never forgive the humiliation.", { run: (s: FixState) => { const { id, g } = gname(s); const r = s.regions[id]; if (r) r.unrest = clamp100(r.unrest - 8); if (g) g.loyalty = clamp100(g.loyalty - 16); return "A federal minister took over the crisis room. The governor sulked."; } }, { run: (s: FixState) => { const { g } = gname(s); if (g) g.loyalty = clamp100(g.loyalty - 18); return "The takeover was botched and humiliating for everyone."; } }, 0.55),
      opt("ignore", "Let him handle it", "It is his state.", "Unrest feeds on neglect.", { run: (s: FixState) => { const { id, g } = gname(s); const r = s.regions[id]; if (r) r.unrest = clamp100(r.unrest + 5); if (g) g.loyalty = clamp100(g.loyalty - 6); return "You stayed out of it. The state did not get better."; } }, {}, 1),
    ],
    expire: { run: (s: FixState) => { const { id } = gname(s); const r = s.regions[id]; if (r) r.unrest = clamp100(r.unrest + 8); return "No answer came from Abuja."; } }, expireText: () => "No answer came from Abuja, and the state noticed.",
  },
];
void CRISIS_NEED; void earnPc;
