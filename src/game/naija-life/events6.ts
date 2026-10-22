import { makeNpc, remember } from "./family";
import { I, bump } from "./helpers";
import { transact } from "./ledger";
import { lendTo } from "./loans";
import { poolFor } from "./data";
import { randomLook } from "./look";
import type { Choice, EventDef, Npc, Player } from "./types";
import { chance, clamp, naira, pick, rand, randInt } from "./util";

const RELATIVE_ROLES = ["uncle", "aunt", "cousin", "sibling"] as const;
const first = (n: Npc | null | undefined) => (n ? n.name.split(" ")[0] : "A relative");
const relatives = (p: Player) => Object.values(p.npcs).filter((n) => n.alive && (RELATIVE_ROLES as readonly string[]).includes(n.role));
const hasRelative = (p: Player) => relatives(p).length > 0;
const label = (n: Npc) => (n.role === "uncle" ? `Uncle ${first(n)}` : n.role === "aunt" ? `Aunty ${first(n)}` : n.role === "sibling" ? first(n) : `Your cousin ${first(n)}`);

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
function respond(q: Player, id: string, gave: number, asked: number, why: string) {
  const n = q.npcs[id];
  if (!n) return;
  const ratio = asked > 0 ? gave / asked : 0;
  if (ratio >= 0.9) { n.closeness = clamp(n.closeness + 5); n.trust = clamp(n.trust + 2); remember(q, n, `You helped with ${why}.`, "good"); q.family.happy = clamp(q.family.happy + 4); }
  else if (ratio > 0.2) { n.closeness = clamp(n.closeness + 1); remember(q, n, `You contributed a little to ${why}.`, "good"); }
  else { n.closeness = clamp(n.closeness - 6); remember(q, n, `Refused to help with ${why}.`, "bad"); q.family.happy = clamp(q.family.happy - 4); bump(q, "reputation", -1); }
}
const pay = (q: Player, n: Npc, amount: number, reason: string) => { const a = Math.min(amount, Math.max(0, q.money)); transact(q, { amount: -a, reason, category: "family" }); return a; };

export const EVENTS6: EventDef[] = [
  {
    id: "relative_wedding",
    title: "A wedding in the family",
    weight: (p) => (p.age >= 18 && hasRelative(p) ? 2.2 : 0),
    init: (p) => ({ relId: pickRelative(p).id }),
    text: (p, d) => `${label(p.npcs[String(d.relId)])} is getting married. The family WhatsApp group is already collecting money for aso-ebi, the hall and the "family table".`,
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const big = I(p, 400_000), mid = I(p, 120_000), small = I(p, 30_000);
      const opt = (l: string, amt: number, msg: string): Choice => ({ label: l, sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, amt, `Wedding of ${n.name}`); respond(q, n.id, g, mid, "their wedding"); bump(q, "happiness", amt >= mid ? 3 : 0); return msg; } });
      return [
        opt("Sponsor a big part of the wedding", big, "Your name is announced from the microphone. Aunties pat you on the back."),
        opt("Give a decent contribution", mid, "You contribute your share and wear your aso-ebi with pride."),
        opt("Give a token and attend", small, "A small envelope, a plate of jollof and a smile."),
        { label: "Send regrets", run: (q) => { respond(q, n.id, 0, mid, "their wedding"); return "You send your apologies. The group chat does not forgive quickly."; } },
      ];
    },
  },
  {
    id: "relative_medical",
    title: "A relative is in hospital",
    weight: (p) => (p.age >= 18 && hasRelative(p) ? 1.6 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, bill: Math.round(rand(250_000, 2_500_000)) }),
    text: (p, d) => `${label(p.npcs[String(d.relId)])} has been admitted. The hospital wants ${naira(Number(d.bill) * p.index)} before treatment can continue, and the family is calling you.`,
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const bill = Math.round(Number(d.bill) * p.index);
      return [
        { label: "Pay the whole bill", sub: naira(bill), disabled: p.money < bill ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, bill, `Hospital bill for ${n.name}`); respond(q, n.id, g, bill, "a hospital bill"); bump(q, "reputation", 3); return `${first(n)} recovers. The whole family calls you a blessing.`; } },
        { label: "Pay half", sub: naira(bill / 2), disabled: p.money < bill / 2 ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, bill / 2, `Part of the hospital bill for ${n.name}`); respond(q, n.id, g, bill, "a hospital bill"); return "Others add the rest. It is enough."; } },
        { label: "Lend it, to be repaid", sub: naira(bill), disabled: p.money < bill ? "Not enough cash" : false, run: (q) => lendTo(q, q.npcs[n.id], bill, 10) },
        { label: "Say you cannot help", run: (q) => { respond(q, n.id, 0, bill, "a hospital bill"); if (chance(0.15)) { n.alive = false; q.npcs[n.id].alive = false; bump(q, "happiness", -8); return `${first(n)} does not make it. Some relatives say it could have been different.`; } return "They manage somehow. The conversation at the next gathering is cold."; } },
      ];
    },
  },
  {
    id: "relative_school_fees",
    title: "School fees for a young relative",
    weight: (p) => (p.age >= 20 && hasRelative(p) ? 1.6 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, fee: Math.round(rand(120_000, 900_000)) }),
    text: (p, d) => `${label(p.npcs[String(d.relId)])} says their child will be sent home if ${naira(Number(d.fee) * p.index)} in school fees is not paid this term. "Please, na only you fit help us."`,
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const fee = Math.round(Number(d.fee) * p.index);
      return [
        { label: "Pay the fees", sub: naira(fee), disabled: p.money < fee ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, fee, `School fees for ${n.name}'s child`); respond(q, n.id, g, fee, "school fees"); bump(q, "reputation", 2); return "The child stays in school. You are the favourite uncle or aunty."; } },
        { label: "Lend them the money", sub: naira(fee), disabled: p.money < fee ? "Not enough cash" : false, run: (q) => lendTo(q, q.npcs[n.id], fee, 6) },
        { label: "Give a part", sub: naira(fee / 3), disabled: p.money < fee / 3 ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, fee / 3, `Part of school fees for ${n.name}'s child`); respond(q, n.id, g, fee, "school fees"); return "It helps a little. They find the rest somewhere."; } },
        { label: "Decline", run: (q) => { respond(q, n.id, 0, fee, "school fees"); return "You say it is a bad time. They do not argue, but they remember."; } },
      ];
    },
  },
  {
    id: "relative_business",
    title: "A relative wants to start a business",
    weight: (p) => (p.age >= 22 && p.money > I(p, 500_000) && hasRelative(p) ? 1.4 : 0),
    init: (p) => ({ relId: pickRelative(p, true).id, ask: Math.round(rand(500_000, 5_000_000)), biz: pick(["a provision store", "a fashion label", "a farm", "a barbing salon", "a POS agency", "a mini supermarket"]) }),
    text: (p, d) => `${label(p.npcs[String(d.relId)])} has a plan for ${d.biz}. "I only need ${naira(Number(d.ask) * p.index)} to start. I will pay you back with profit."`,
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const ask = Math.round(Number(d.ask) * p.index);
      return [
        { label: "Lend it as a loan", sub: naira(ask), disabled: p.money < ask ? "Not enough cash" : false, run: (q) => lendTo(q, q.npcs[n.id], ask, 18) },
        { label: "Invest for a share of the profit", sub: `${naira(ask)}, repays more if it works`, disabled: p.money < ask ? "Not enough cash" : false, run: (q) => {
          const msg = lendTo(q, q.npcs[n.id], ask, 24);
          const loan = q.loans[q.loans.length - 1];
          if (loan && loan.direction === "owedToMe") { loan.balance = Math.round(ask * 1.5); loan.note = `Equity in ${n.name}'s business`; }
          return `${msg} You agreed to a profit share, so the payout is larger if it works.`;
        } },
        { label: "Ask for a proper business plan first", run: (q) => { const r = q.npcs[n.id]; r.closeness = clamp(r.closeness - 1); r.trust = clamp(r.trust + 1); return "You ask for numbers. They go away to think. Half the time they never return."; } },
        { label: "Politely decline", run: (q) => { respond(q, n.id, 0, ask, "their business idea"); return "You wish them luck. They wish you more."; } },
      ];
    },
  },
  {
    id: "relative_levy",
    title: "Family levy",
    weight: (p) => (p.age >= 22 && p.money > I(p, 200_000) && hasRelative(p) ? 1.3 : 0),
    init: (p) => ({ relId: pickRelative(p).id, why: pick(["the family house roof", "a land dispute in the village", "the annual family meeting", "a chieftaincy title for the elder", "the village borehole", "a burial that went over budget"]), amount: Math.round(rand(80_000, 900_000)) }),
    text: (p, d) => `The elders call a family meeting. Every adult child must contribute for ${d.why}. Your share is set at ${naira(Number(d.amount) * p.index)}, and ${label(p.npcs[String(d.relId)])} is watching to see what you bring.`,
    choices: (p, d) => {
      const n = p.npcs[String(d.relId)];
      const amt = Math.round(Number(d.amount) * p.index);
      return [
        { label: "Pay your full share", sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, amt, `Family levy: ${d.why}`); respond(q, n.id, g, amt, String(d.why)); bump(q, "connections", 2); return "Your name is read out with approval."; } },
        { label: "Pay half and promise the rest", sub: naira(amt / 2), disabled: p.money < amt / 2 ? "Not enough cash" : false, run: (q) => { const g = pay(q, n, amt / 2, `Part of family levy: ${d.why}`); respond(q, n.id, g, amt, String(d.why)); return "They accept, with raised eyebrows."; } },
        { label: "Refuse to pay", run: (q) => { respond(q, n.id, 0, amt, String(d.why)); bump(q, "reputation", -3); return "The elders shake their heads. You are talked about for months."; } },
      ];
    },
  },
];
