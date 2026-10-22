import { makeNpc, remember } from "./family";
import { I, bump } from "./helpers";
import { transact } from "./ledger";
import { lendTo } from "./loans";
import { poolFor } from "./data";
import { randomLook } from "./look";
import type { Choice, EventDef, Npc, Player } from "./types";
import { T, chance, clamp, dual, naira, pick, rand, randInt } from "./util";

const RELATIVE_ROLES = ["uncle", "aunt", "cousin", "sibling"] as const;
const first = (n: Npc | null | undefined) => (n ? n.name.split(" ")[0] : T("A relative", "Your relative"));
const relatives = (p: Player) => Object.values(p.npcs).filter((n) => n.alive && (RELATIVE_ROLES as readonly string[]).includes(n.role));
const hasRelative = (p: Player) => relatives(p).length > 0;
const label = (n: Npc) => (n.role === "uncle" ? `Uncle ${first(n)}` : n.role === "aunt" ? `Aunty ${first(n)}` : n.role === "sibling" ? first(n) : T(`Your cousin ${first(n)}`, `Your cousin ${first(n)}`));
/** Pidgin wording for English data strings picked when an event is created. */
const PCM: Record<string, string> = {
  "a provision store": "provision store", "a fashion label": "fashion label", "a farm": "farm", "a barbing salon": "barbing salon", "a POS agency": "POS agency", "a mini supermarket": "mini supermarket",
  "the family house roof": "the family house roof", "a land dispute in the village": "land dispute for village", "the annual family meeting": "the annual family meeting", "a chieftaincy title for the elder": "chieftaincy title for the elder", "the village borehole": "the village borehole", "a burial that went over budget": "burial wey cross budget",
};
const pcm = (v: unknown) => PCM[String(v)] ?? String(v);
const en = (v: unknown) => String(v);

/** A new cousin joins your extended family. Called as the years pass. */
export function addCousin(p: Player): Npc {
  const gender = chance(0.5) ? "male" : "female";
  const pool = poolFor(p.tribe);
  const c = makeNpc({
    role: "cousin", gender, ageDelta: randInt(-8, 10), tribe: p.tribe, surname: p.surname, stateId: p.family.state,
    occupation: pick(["Trader", "Student", "Civil servant", "Mechanic", "Teacher", "Nurse", "Okada rider", "Tailor", "Banker"]),
    income: Math.round(rand(0.5e6, 9e6)), look: randomLook(gender, {}), name: `${pick(pool[gender])} ${p.surname}`,
  });
  p.npcs[c.id] = c;
  return c;
}

function pickRelative(p: Player, weightMoney = false): Npc {
  const list = relatives(p);
  return pick(weightMoney ? list.filter((n) => n.income < 12e6).concat(list) : list);
}

/** How the family thinks of you after you respond to a request. */
function respond(q: Player, id: string, gave: number, asked: number, why: string, whyP: string = why) {
  const n = q.npcs[id];
  if (!n) return;
  const ratio = asked > 0 ? gave / asked : 0;
  if (ratio >= 0.9) { n.closeness = clamp(n.closeness + 5); n.trust = clamp(n.trust + 2); remember(q, n, T(`You helped with ${why}.`, `You help with ${whyP}.`), "good"); q.family.happy = clamp(q.family.happy + 4); }
  else if (ratio > 0.2) { n.closeness = clamp(n.closeness + 1); remember(q, n, T(`You contributed a little to ${why}.`, `You add small money to ${whyP}.`), "good"); }
  else { n.closeness = clamp(n.closeness - 6); remember(q, n, T(`Refused to help with ${why}.`, `You refuse to help with ${whyP}.`), "bad"); q.family.happy = clamp(q.family.happy - 4); bump(q, "reputation", -1); }
}
const pay = (q: Player, n: Npc, amount: number, reason: string) => { const a = Math.min(amount, Math.max(0, q.money)); transact(q, { amount: -a, reason, category: "family" }); return a; };

export const EVENTS6: EventDef[] = [
  {
    id: "relative_wedding",
    title: dual("A wedding in the family", "Wedding for the family"),
    weight: (p) => (p.age >= 18 && hasRelative(p) ? 2.2 : 0),
    init: (p) => ({ relId: pickRelative(p).id }),
    text: (p, d) => T(
      `${label(p.npcs[String(d.relId)])} is getting married. The family WhatsApp group is already collecting money for aso-ebi, the hall and the "family table".`,
      `${label(p.npcs[String(d.relId)])} dey marry. The family WhatsApp group don start to collect money for aso-ebi, hall and "family table".`,
    ),
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const big = I(p, 400_000), mid = I(p, 120_000), small = I(p, 30_000);
      const opt = (l: string, amt: number, msg: string): Choice => ({ label: l, sub: naira(amt), disabled: p.money < amt ? T("Not enough cash", "Cash no reach") : false, run: (q) => { const g = pay(q, n, amt, T(`Wedding of ${n.name}`, `Wedding of ${n.name}`)); respond(q, n.id, g, mid, "their wedding", "their wedding"); bump(q, "happiness", amt >= mid ? 3 : 0); return msg; } });
      return [
        opt(T("Sponsor a big part of the wedding", "Sponsor big part of the wedding"), big, T("Your name is announced from the microphone. Aunties pat you on the back.", "Dem call your name for microphone. Aunties dey tap your back.")),
        opt(T("Give a decent contribution", "Contribute well"), mid, T("You contribute your share and wear your aso-ebi with pride.", "You do your own and wear your aso-ebi with pride.")),
        opt(T("Give a token and attend", "Drop small money and go"), small, T("A small envelope, a plate of jollof and a smile.", "Small envelope, one plate of jollof and smile.")),
        { label: T("Send regrets", "Send apology"), run: (q) => { respond(q, n.id, 0, mid, "their wedding", "their wedding"); return T("You send your apologies. The group chat does not forgive quickly.", "You send your apology. Group chat no dey forgive quick."); } },
      ];
    },
  },
  {
    id: "relative_medical",
    title: dual("A relative is in hospital", "Relative dey hospital"),
    weight: (p) => (p.age >= 18 && hasRelative(p) ? 1.6 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, bill: Math.round(rand(250_000, 2_500_000)) }),
    text: (p, d) => T(
      `${label(p.npcs[String(d.relId)])} has been admitted. The hospital wants ${naira(Number(d.bill) * p.index)} before treatment can continue, and the family is calling you.`,
      `Dem don admit ${label(p.npcs[String(d.relId)])}. Hospital want ${naira(Number(d.bill) * p.index)} before treatment fit continue, and the family dey call you.`,
    ),
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const bill = Math.round(Number(d.bill) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Pay the whole bill", "Pay the whole bill"), sub: naira(bill), disabled: p.money < bill ? noCash : false, run: (q) => { const g = pay(q, n, bill, T(`Hospital bill for ${n.name}`, `Hospital bill for ${n.name}`)); respond(q, n.id, g, bill, "a hospital bill", "hospital bill"); bump(q, "reputation", 3); return T(`${first(n)} recovers. The whole family calls you a blessing.`, `${first(n)} don recover. The whole family dey call you blessing.`); } },
        { label: T("Pay half", "Pay half"), sub: naira(bill / 2), disabled: p.money < bill / 2 ? noCash : false, run: (q) => { const g = pay(q, n, bill / 2, T(`Part of the hospital bill for ${n.name}`, `Part of hospital bill for ${n.name}`)); respond(q, n.id, g, bill, "a hospital bill", "hospital bill"); return T("Others add the rest. It is enough.", "Others add the remaining. E don do."); } },
        { label: T("Lend it, to be repaid", "Lend am, make dem pay back"), sub: naira(bill), disabled: p.money < bill ? noCash : false, run: (q) => lendTo(q, q.npcs[n.id], bill, 10) },
        { label: T("Say you cannot help", "Say you no fit help"), run: (q) => { respond(q, n.id, 0, bill, "a hospital bill", "hospital bill"); if (chance(0.15)) { n.alive = false; q.npcs[n.id].alive = false; bump(q, "happiness", -8); return T(`${first(n)} does not make it. Some relatives say it could have been different.`, `${first(n)} no survive. Some relatives dey talk say e for fit be different.`); } return T("They manage somehow. The conversation at the next gathering is cold.", "Dem manage am anyhow. Next time wey una meet, the talk cold."); } },
      ];
    },
  },
  {
    id: "relative_school_fees",
    title: dual("School fees for a young relative", "School fees for small relative"),
    weight: (p) => (p.age >= 20 && hasRelative(p) ? 1.6 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, fee: Math.round(rand(120_000, 900_000)) }),
    text: (p, d) => T(
      `${label(p.npcs[String(d.relId)])} says their child will be sent home if ${naira(Number(d.fee) * p.index)} in school fees is not paid this term. "Please, na only you fit help us."`,
      `${label(p.npcs[String(d.relId)])} talk say dem go send im pikin go house if ${naira(Number(d.fee) * p.index)} school fees no complete this term. "Abeg, na only you fit help us."`,
    ),
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const fee = Math.round(Number(d.fee) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Pay the fees", "Pay the fees"), sub: naira(fee), disabled: p.money < fee ? noCash : false, run: (q) => { const g = pay(q, n, fee, T(`School fees for ${n.name}'s child`, `School fees for ${n.name} pikin`)); respond(q, n.id, g, fee, "school fees", "school fees"); bump(q, "reputation", 2); return T("The child stays in school. You are the favourite uncle or aunty.", "The pikin remain for school. You don turn favourite uncle or aunty."); } },
        { label: T("Lend them the money", "Lend dem the money"), sub: naira(fee), disabled: p.money < fee ? noCash : false, run: (q) => lendTo(q, q.npcs[n.id], fee, 6) },
        { label: T("Give a part", "Give part"), sub: naira(fee / 3), disabled: p.money < fee / 3 ? noCash : false, run: (q) => { const g = pay(q, n, fee / 3, T(`Part of school fees for ${n.name}'s child`, `Part of school fees for ${n.name} pikin`)); respond(q, n.id, g, fee, "school fees", "school fees"); return T("It helps a little. They find the rest somewhere.", "E help small. Dem go find the remaining for somewhere."); } },
        { label: T("Decline", "Refuse"), run: (q) => { respond(q, n.id, 0, fee, "school fees", "school fees"); return T("You say it is a bad time. They do not argue, but they remember.", "You talk say time hard. Dem no argue, but dem no go forget."); } },
      ];
    },
  },
  {
    id: "relative_business",
    title: dual("A relative wants to start a business", "Relative wan start business"),
    weight: (p) => (p.age >= 22 && p.money > I(p, 500_000) && hasRelative(p) ? 1.4 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, ask: Math.round(rand(500_000, 5_000_000)), biz: pick(["a provision store", "a fashion label", "a farm", "a barbing salon", "a POS agency", "a mini supermarket"]) }),
    text: (p, d) => T(
      `${label(p.npcs[String(d.relId)])} has a plan for ${en(d.biz)}. "I only need ${naira(Number(d.ask) * p.index)} to start. I will pay you back with profit."`,
      `${label(p.npcs[String(d.relId)])} get plan for ${pcm(d.biz)}. "I only need ${naira(Number(d.ask) * p.index)} to start. I go pay you back with profit."`,
    ),
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const ask = Math.round(Number(d.ask) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Lend it as a loan", "Lend am as loan"), sub: naira(ask), disabled: p.money < ask ? noCash : false, run: (q) => lendTo(q, q.npcs[n.id], ask, 18) },
        { label: T("Invest for a share of the profit", "Invest for share of profit"), sub: T(`${naira(ask)}, repays more if it works`, `${naira(ask)}, e go pay more if e work`), disabled: p.money < ask ? noCash : false, run: (q) => {
          const msg = lendTo(q, q.npcs[n.id], ask, 24);
          const loan = q.loans[q.loans.length - 1];
          if (loan && loan.direction === "owedToMe") { loan.balance = Math.round(ask * 1.5); loan.note = T(`Equity in ${n.name}'s business`, `Share for ${n.name} business`); }
          return T(`${msg} You agreed to a profit share, so the payout is larger if it works.`, `${msg} You agree for profit share, so the payout go big if e work.`);
        } },
        { label: T("Ask for a proper business plan first", "Ask for correct business plan first"), run: (q) => { const r = q.npcs[n.id]; r.closeness = clamp(r.closeness - 1); r.trust = clamp(r.trust + 1); return T("You ask for numbers. They go away to think. Half the time they never return.", "You ask for numbers. Dem go think am. Most times dem no dey come back."); } },
        { label: T("Politely decline", "Refuse politely"), run: (q) => { respond(q, n.id, 0, ask, "their business idea", "their business idea"); return T("You wish them luck. They wish you more.", "You wish dem luck. Dem wish you pass."); } },
      ];
    },
  },
  {
    id: "relative_levy",
    title: dual("Family levy", "Family levy"),
    weight: (p) => (p.age >= 22 && p.money > I(p, 200_000) && hasRelative(p) ? 1.3 : 0),
    init: (p) => ({ relId: pickRelative(p).id, why: pick(["the family house roof", "a land dispute in the village", "the annual family meeting", "a chieftaincy title for the elder", "the village borehole", "a burial that went over budget"]), amount: Math.round(rand(80_000, 900_000)) }),
    text: (p, d) => T(
      `The elders call a family meeting. Every adult child must contribute for ${en(d.why)}. Your share is set at ${naira(Number(d.amount) * p.index)}, and ${label(p.npcs[String(d.relId)])} is watching to see what you bring.`,
      `The elders call family meeting. Every grown pikin must contribute for ${pcm(d.why)}. Your own share na ${naira(Number(d.amount) * p.index)}, and ${label(p.npcs[String(d.relId)])} dey watch wetin you go bring.`,
    ),
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const amt = Math.round(Number(d.amount) * p.index);
      const noCash = T("Not enough cash", "Cash no reach");
      return [
        { label: T("Pay your full share", "Pay your full share"), sub: naira(amt), disabled: p.money < amt ? noCash : false, run: (q) => { const g = pay(q, n, amt, T(`Family levy: ${en(d.why)}`, `Family levy: ${pcm(d.why)}`)); respond(q, n.id, g, amt, en(d.why), pcm(d.why)); bump(q, "connections", 2); return T("Your name is read out with approval.", "Dem read your name out with respect."); } },
        { label: T("Pay half and promise the rest", "Pay half, promise the rest"), sub: naira(amt / 2), disabled: p.money < amt / 2 ? noCash : false, run: (q) => { const g = pay(q, n, amt / 2, T(`Part of family levy: ${en(d.why)}`, `Part of family levy: ${pcm(d.why)}`)); respond(q, n.id, g, amt, en(d.why), pcm(d.why)); return T("They accept, with raised eyebrows.", "Dem accept am, but dem raise eyebrow."); } },
        { label: T("Refuse to pay", "Refuse to pay"), run: (q) => { respond(q, n.id, 0, amt, en(d.why), pcm(d.why)); bump(q, "reputation", -3); return T("The elders shake their heads. You are talked about for months.", "The elders shake head. Dem go dey talk about you for months."); } },
      ];
    },
  },
];
