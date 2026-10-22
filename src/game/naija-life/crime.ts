import { I, bump, enterPrison, luckBonus, stateOf } from "./helpers";
import { transact } from "./ledger";
import { makeNpc, remember } from "./family";
import { randomLook } from "./look";
import type { EventDef, LegalCase, Pending, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt, uid } from "./util";

export interface CrimeDef {
  id: string;
  label: string;
  blurb: string;
  minAge: number;
  severity: number;
  loot: [number, number];
  success: number;
  witness: number;
  violent: boolean;
}

export const CRIMES: CrimeDef[] = [
  { id: "pickpocket", label: "Pickpocketing", blurb: "A crowded market and quick hands.", minAge: 15, severity: 1, loot: [3_000, 40_000], success: 0.62, witness: 0.25, violent: false },
  { id: "shoplift", label: "Shoplifting", blurb: "Small items, big risk of a security guard.", minAge: 14, severity: 1, loot: [5_000, 60_000], success: 0.6, witness: 0.3, violent: false },
  { id: "fraud", label: "Online fraud and scams", blurb: "Fake investments, fake romance, real consequences.", minAge: 17, severity: 3, loot: [400_000, 6_000_000], success: 0.5, witness: 0.12, violent: false },
  { id: "burglary", label: "Housebreaking", blurb: "Empty houses and nervous neighbours.", minAge: 17, severity: 3, loot: [150_000, 2_000_000], success: 0.45, witness: 0.35, violent: false },
  { id: "cartheft", label: "Car theft", blurb: "Tracking devices and watchful gatemen.", minAge: 18, severity: 3, loot: [800_000, 6_000_000], success: 0.38, witness: 0.3, violent: false },
  { id: "robbery", label: "Armed robbery", blurb: "Violent, dangerous, and the police take it very seriously.", minAge: 18, severity: 4, loot: [300_000, 3_000_000], success: 0.5, witness: 0.5, violent: true },
  { id: "contract", label: "Contract killing", blurb: "A paid hit on someone's enemy. Almost always ends badly.", minAge: 18, severity: 5, loot: [2_000_000, 10_000_000], success: 0.35, witness: 0.55, violent: true },
];
export const CRIME_BY_ID = Object.fromEntries(CRIMES.map((c) => [c.id, c])) as Record<string, CrimeDef>;

export function crimeBlock(p: Player, c: CrimeDef): string | null {
  if (p.age < c.minAge) return `From age ${c.minAge}`;
  if (p.prison > 0) return "You are in prison";
  if (p.actionsLeft <= 0) return "No actions left this year";
  if (p.crime.cases.some((x) => x.stage !== "closed" && x.stage !== "bail")) return "You are in custody";
  return null;
}

export const hasSeriousRecord = (p: Player) => p.crime.record.some((r) => r.severity >= 3 && r.outcome === "convicted");

/** Run a crime. Returns the message plus any events it triggers. */
export function commitCrime(p: Player, id: string): { text: string; spawn: Pending[] } {
  const c = CRIME_BY_ID[id];
  const spawn: Pending[] = [];
  if (!c) return { text: "", spawn };
  p.actionsLeft = Math.max(0, p.actionsLeft - 1);
  const st = stateOf(p);
  const prob = clamp(c.success + p.crime.skill / 250 + luckBonus(p) - p.crime.heat / 400 - (st.opp >= 8 ? 0.04 : 0), 0.08, 0.85);
  const ok = chance(prob);
  let loot = 0;
  let text: string;
  if (ok) {
    loot = Math.round(I(p, rand(c.loot[0], c.loot[1])));
    transact(p, { amount: loot, reason: `Proceeds of ${c.label.toLowerCase()}`, category: "crime" });
    p.crime.skill = clamp(p.crime.skill + 2);
    text = `The ${c.label.toLowerCase()} works. You walk away with ${naira(loot)}.`;
  } else {
    p.crime.skill = clamp(p.crime.skill + 0.5);
    text = `The ${c.label.toLowerCase()} goes wrong.`;
  }
  p.crime.heat = clamp(p.crime.heat + c.severity * 6);
  bump(p, "reputation", -2 * c.severity);
  bump(p, "stress", 2 * c.severity);
  let victimId: string | undefined;
  if (c.violent) {
    p.crime.violence += 1;
    const vg = chance(0.5) ? "male" : "female";
    const v = makeNpc({ role: "victim", gender: vg, ageDelta: randInt(-15, 20), tribe: p.tribe, look: randomLook(vg), closeness: 0, stateId: p.state });
    v.generosity = 0;
    victimId = v.id;
    p.npcs[v.id] = v;
    remember(p, v, c.id === "contract" ? "Their life ended because of you." : "You attacked them.", "bad");
    if (c.id === "contract") text += ok ? " It is done. You try not to think about it." : " The target escaped, and now someone knows your face.";
    if (!ok && chance(0.35)) {
      const injury = c.id === "contract" ? "gunshot" : "stab";
      p.flags.spawnCondition = injury;
      text += " You were hurt in the struggle.";
    }
  }
  const wit = clamp(c.witness + p.crime.heat / 300 - (ok ? 0.05 : -0.2), 0.05, 0.95);
  const caught = chance(wit) && chance(ok ? 0.55 : 0.85);
  if (caught) {
    const evidence = clamp(Math.round((ok ? 45 : 70) + c.severity * 4 + (victimId ? 8 : 0) + p.crime.heat / 5 + randInt(-12, 12)), 15, 98);
    spawn.push({ kind: "event", id: "police_encounter", data: { crimeId: c.id, evidence, loot, victimId: victimId ?? "", month: randInt(1, 12) } });
    text += " But someone saw you, and the police are on your trail.";
  } else if (ok) {
    text += " Nobody saw you. This time.";
  } else {
    text += " You slip away empty-handed.";
  }
  return { text, spawn };
}

const sentenceFor = (sev: number): number => (sev <= 1 ? 0 : sev === 2 ? 1 : sev === 3 ? randInt(3, 7) : sev === 4 ? randInt(7, 14) : randInt(15, 25));

function openCase(p: Player, crimeId: string, evidence: number, loot: number, victimId?: string): LegalCase {
  const c = CRIME_BY_ID[crimeId];
  const lc: LegalCase = { id: uid(), charge: c.label, severity: c.severity, stage: "arrested", openedAge: p.age, evidence, victimId, lawyer: "none", loot, remand: false, confessed: false, trialAge: p.age + 1 };
  p.crime.cases.push(lc);
  return lc;
}

function closeCase(p: Player, lc: LegalCase, outcome: string) {
  lc.stage = "closed";
  lc.outcome = outcome;
  p.crime.record.push({ age: p.age, charge: lc.charge, outcome, severity: lc.severity });
}

const lawyerCost = (p: Player, sev: number) => Math.round(I(p, 250_000 * sev));
const bribeCost = (p: Player, sev: number) => Math.round(I(p, 90_000 * sev * rand(0.8, 1.4)));
const bailCost = (p: Player, sev: number) => Math.round(I(p, 120_000 * sev * sev * 0.6 + 40_000));

const caseOf = (p: Player, id: unknown) => p.crime.cases.find((x) => x.id === id);

export function yearlyCrime(p: Player, lines: string[], pending: Pending[]) {
  p.crime.heat = clamp(p.crime.heat - 10);
  for (const lc of p.crime.cases) {
    if (lc.stage === "closed") continue;
    if (lc.stage === "bail" || lc.stage === "arrested") {
      if (p.age >= lc.trialAge) {
        lc.stage = "trial";
        pending.push({ kind: "event", id: "court_trial", data: { caseId: lc.id, month: randInt(1, 12) } });
      }
    }
  }
  // Victims' families remember.
  const victims = Object.values(p.npcs).filter((n) => n.role === "victim");
  if (victims.length && chance(0.07 * Math.min(3, victims.length))) pending.push({ kind: "event", id: "revenge_visit", data: { npcId: pick(victims).id, month: randInt(1, 12) } });
  if (p.crime.violence > 0 && p.crime.heat > 25 && chance(0.1)) lines.push("People are talking about what you did. Neighbours avoid you.");
}

export const CRIME_EVENTS: EventDef[] = [
  {
    id: "police_encounter",
    title: "Police are on to you",
    weight: () => 0,
    text: (p, d) => `Officers arrive while you are still in the area. "${CRIME_BY_ID[String(d.crimeId)]?.label}", they say. They look serious.`,
    choices: (p, d) => {
      const c = CRIME_BY_ID[String(d.crimeId)];
      const ev = Number(d.evidence);
      const loot = Number(d.loot);
      const vid = String(d.victimId || "") || undefined;
      const sev = c?.severity ?? 1;
      const bc = bribeCost(p, sev);
      const arrest = (q: Player, text: string, confessed = false): { text: string; spawn: Pending[] } => {
        const lc = openCase(q, c.id, ev - (confessed ? 0 : 0), loot, vid);
        lc.confessed = confessed;
        return { text, spawn: [{ kind: "event", id: "bail_decision", data: { caseId: lc.id, month: Number(d.month ?? 12) } }] };
      };
      return [
        { label: "Offer a bribe", sub: naira(bc), disabled: p.money < bc ? "Not enough cash" : false, run: (q) => {
          transact(q, { amount: -bc, reason: "Bribe to police officers", category: "legal" });
          if (chance(clamp(0.55 - q.crime.heat / 300 - (sev >= 4 ? 0.3 : 0), 0.05, 0.7))) { q.crime.heat = clamp(q.crime.heat - 8); return "The officers pocket it and 'lose' the file."; }
          return arrest(q, "The officers take the money and arrest you anyway, adding bribery to the charge.");
        } },
        { label: "Try to run", run: (q) => {
          if (chance(clamp(0.22 + q.stats.fitness / 240 + (q.age < 30 ? 0.08 : 0), 0.05, 0.6))) { q.crime.heat = clamp(q.crime.heat + 10); q.stats.stress = clamp(q.stats.stress + 6); return "You run through the back lanes and escape. For now."; }
          return arrest(q, "You are tackled after a short chase. Resisting arrest does not help.");
        } },
        { label: "Cooperate and confess", run: (q) => arrest(q, "You confess. The judge may take it into account.", true) },
        { label: "Insist on a lawyer", sub: naira(lawyerCost(p, sev)), disabled: p.money < lawyerCost(p, sev) ? "Not enough cash (a public defender will be assigned)" : false, run: (q) => { transact(q, { amount: -lawyerCost(q, sev), reason: "Private lawyer retained", category: "legal" }); const r = arrest(q, "Your lawyer arrives and does the talking."); const lc = q.crime.cases[q.crime.cases.length - 1]; if (lc) lc.lawyer = "private"; return r; } },
        { label: "Say nothing, accept a public defender", run: (q) => { const r = arrest(q, "You are taken in. A public defender will handle your case."); const lc = q.crime.cases[q.crime.cases.length - 1]; if (lc) lc.lawyer = "public"; return r; } },
      ];
    },
  },
  {
    id: "bail_decision",
    title: "Bail",
    weight: () => 0,
    valid: (p) => p.crime.cases.some((x) => x.stage === "arrested"),
    text: (p, d) => {
      const lc = caseOf(p, d.caseId);
      return `You are in a cell. The charge is ${lc?.charge.toLowerCase() ?? "serious"}. The magistrate sets bail at ${naira(lc ? bailCost(p, lc.severity) : 0)}.`;
    },
    choices: (p, d) => {
      const lc = caseOf(p, d.caseId);
      const bc = lc ? bailCost(p, lc.severity) : 0;
      return [
        { label: "Pay the bail", sub: naira(bc), disabled: p.money < bc ? "Not enough cash" : false, run: (q) => { const c2 = caseOf(q, d.caseId); transact(q, { amount: -bc, reason: "Bail", category: "legal" }); if (c2) c2.stage = "bail"; return "You walk out on bail. The trial date will come."; } },
        { label: "Ask family or friends to help", run: (q) => { const c2 = caseOf(q, d.caseId); const prov = Object.values(q.npcs).filter((n) => n.alive && ["dad", "mom", "guardian", "friend", "sibling"].includes(n.role)).sort((a, b) => b.closeness - a.closeness)[0]; if (prov && chance(clamp(prov.closeness / 120 + prov.generosity / 300, 0.1, 0.7)) && c2) { c2.stage = "bail"; prov.closeness = clamp(prov.closeness - 6); remember(q, prov, "Paid your bail.", "good"); return `${prov.name.split(" ")[0]} pays your bail, disappointed but loyal.`; } return "Nobody can raise the money in time."; } },
        { label: "Stay in custody until trial", run: (q) => { const c2 = caseOf(q, d.caseId); if (c2) { c2.stage = "bail"; c2.remand = true; } q.prison = Math.max(q.prison, 1); q.stats.health = clamp(q.stats.health - 6); return "You wait in remand. It is dark and crowded."; } },
      ];
    },
  },
  {
    id: "court_trial",
    title: "Your day in court",
    weight: () => 0,
    valid: (p) => p.crime.cases.some((x) => x.stage === "trial"),
    text: (p, d) => {
      const lc = caseOf(p, d.caseId);
      return `The courtroom is packed. The charge: ${lc?.charge.toLowerCase() ?? "unknown"}. The prosecutor sounds confident.`;
    },
    choices: (p, d) => {
      const lc = caseOf(p, d.caseId);
      const sev = lc?.severity ?? 1;
      const verdict = (q: Player, mod: number, confessed: boolean): string => {
        const c2 = caseOf(q, d.caseId);
        if (!c2) return "";
        const lawyer = c2.lawyer === "private" ? 0.72 : c2.lawyer === "public" ? 0.92 : 1;
        const pr = clamp(((c2.evidence / 100) * lawyer + mod) * (confessed ? 1.1 : 1), 0.05, 0.97);
        if (!chance(pr)) { closeCase(q, c2, "acquitted"); q.crime.heat = clamp(q.crime.heat - 15); bump(q, "reputation", 2); return "NOT GUILTY. The judge dismisses the case for lack of evidence."; }
        closeCase(q, c2, "convicted");
        let years = sentenceFor(c2.severity);
        if (confessed || c2.confessed) years = Math.max(0, Math.round(years * 0.65));
        if (c2.remand) years = Math.max(0, years - 1);
        const fine = Math.round(I(q, rand(60_000, 400_000) * c2.severity));
        let text = "GUILTY. ";
        // Restitution and confiscation
        const confiscate = Math.min(q.money, Math.round(c2.loot * 0.6));
        if (confiscate > 0) { transact(q, { amount: -confiscate, reason: "Confiscated proceeds of crime", category: "legal" }); text += `${naira(confiscate)} of your proceeds were confiscated. `; }
        if (c2.victimId && q.npcs[c2.victimId] && c2.severity < 5) {
          const comp = Math.min(q.money, fine);
          if (comp > 0) transact(q, { amount: -comp, reason: "Compensation ordered by the court", category: "legal" });
          text += `You must compensate the victim. `;
        }
        if (years <= 0) { const f = Math.min(q.money, fine); if (f > 0) transact(q, { amount: -f, reason: `Court fine (${c2.charge.toLowerCase()})`, category: "legal" }); return `${text}You are fined and released with a criminal record.`; }
        q.job = null;
        return `${text}${enterPrison(q, years)}`;
      };
      return [
        { label: "Plead guilty and ask for mercy", run: (q) => verdict(q, 0.5, true) },
        { label: "Fight the charge", run: (q) => verdict(q, 0, false) },
        { label: "Bribe the judge", sub: naira(bribeCost(p, sev) * 3), disabled: p.money < bribeCost(p, sev) * 3 ? "Not enough cash" : false, run: (q) => { const c2 = caseOf(q, d.caseId); const cost = bribeCost(q, sev) * 3; transact(q, { amount: -cost, reason: "Payment to a court official", category: "legal" }); if (c2 && chance(0.4)) { closeCase(q, c2, "dismissed"); return "The case is dismissed on a technicality."; } if (c2) c2.evidence = clamp(c2.evidence + 20); return `The payment backfires. ${verdict(q, 0.15, false)}`; } },
        { label: "Skip court and disappear", run: (q) => { const c2 = caseOf(q, d.caseId); if (c2) { closeCase(q, c2, "fugitive"); } q.crime.heat = clamp(q.crime.heat + 30); q.stats.reputation = clamp(q.stats.reputation - 8); if (chance(0.5)) { const r = enterPrison(q, sentenceFor(sev) + 2); return `You skipped court. A warrant was issued, and you were picked up within months. ${r}`; } return "You disappear into another state. The warrant follows you."; } },
      ];
    },
  },
  {
    id: "revenge_visit",
    title: "Someone knows what you did",
    weight: () => 0,
    valid: (p) => Object.values(p.npcs).some((n) => n.role === "victim"),
    text: () => "A man who identifies himself as a relative of someone you hurt is waiting outside your door. He is not alone.",
    choices: (p, d) => [
      { label: "Pay compensation", sub: naira(I(p, 400_000)), disabled: p.money < I(p, 400_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 400_000), reason: "Compensation to a victim's family", category: "legal" }); const v = q.npcs[String(d.npcId)]; if (v) delete q.npcs[v.id]; q.crime.heat = clamp(q.crime.heat - 10); return "It is not forgiveness, but the visits stop."; } },
      { label: "Leave town quietly", run: (q) => { q.state = Object.keys({ abuja: 1, lagos: 1 }).includes(q.state) ? "kwara" : "abuja"; q.job = null; bump(q, "stress", 10); return "You move to another state overnight. Starting over is hard."; } },
      { label: "Confront them", run: (q) => { if (chance(0.4)) { q.flags.spawnCondition = "stab"; bump(q, "reputation", -4); return "It turns violent. You are hurt."; } return "Tension ends without blood, but they promise to be back."; } },
    ],
  },
  {
    id: "lawsuit",
    title: "You are being sued",
    weight: (p) => (p.age >= 20 && (p.businesses.length > 0 || p.houses.some((h) => h.use === "rent") || p.vehicles.length > 0) ? 1.2 : 0),
    text: (p) => {
      const cause = p.businesses.length ? "a former employee claims unpaid wages" : p.houses.some((h) => h.use === "rent") ? "a tenant says your property injured them and wants compensation" : "a motorcyclist claims your vehicle caused an accident";
      return `A court summons arrives: ${cause}. They want ${naira(I(p, 800_000))}.`;
    },
    choices: (p) => [
      { label: "Hire a lawyer and fight", sub: naira(I(p, 250_000)), disabled: p.money < I(p, 250_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 250_000), reason: "Lawyer's fees (civil case)", category: "legal" }); if (chance(0.55)) return "Your lawyer wins. The case is thrown out."; transact(q, { amount: -I(q, 500_000), reason: "Damages awarded against you", category: "legal" }); return "You lose and pay damages on top of the legal fees."; } },
      { label: "Settle out of court", sub: naira(I(p, 450_000)), disabled: p.money < I(p, 450_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 450_000), reason: "Out-of-court settlement", category: "legal" }); return "You agree to a quiet settlement."; } },
      { label: "Ignore the summons", run: (q) => { transact(q, { amount: -I(q, 900_000), reason: "Default judgement against you", category: "legal" }); bump(q, "stress", 6); return "The court rules against you in your absence."; } },
    ],
  },
];

