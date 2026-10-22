import { I, bump, enterPrison, luckBonus } from "./helpers";
import { transact } from "./ledger";
import type { Action } from "./engine";
import type { EventDef, Player } from "./types";
import { T, chance, clamp, naira, randInt } from "./util";

/** Actions that still make sense from inside a prison cell. */
const ALLOWED: Action["t"][] = ["prison", "will", "ask", "treat", "checkup", "loanRepay", "surrender", "learn", "growth", "activity", "quit", "borrow"];
const ACTIVITIES_OK = ["study", "worship", "gym"];
const GROWTH_OK = ["read", "run", "rest", "hobby"];

/** Returns a message when the action is not possible from prison, otherwise null. */
export function prisonBlock(p: Player, a: Action): string | null {
  if (p.prison <= 0) return null;
  const msg = T("You are in prison. You cannot do that from inside.", "You dey prison. You no fit do that one from inside.");
  if (!ALLOWED.includes(a.t)) return msg;
  if (a.t === "activity" && !ACTIVITIES_OK.includes(a.id)) return msg;
  if (a.t === "growth" && !GROWTH_OK.includes(a.id)) return msg;
  return null;
}

export const PRISON_OPS = [
  { id: "work", en: "Prison work detail", pcm: "Prison work detail", subEn: "Small pay, tired body", subPcm: "Small pay, tired body" },
  { id: "study", en: "Prison classes", pcm: "Prison classes", subEn: "Study for a certificate", subPcm: "Read for certificate" },
  { id: "appeal", en: "File an appeal", pcm: "File appeal", subEn: "Needs a lawyer", subPcm: "You go need lawyer" },
  { id: "escape", en: "Try to escape", pcm: "Try run comot", subEn: "Very risky", subPcm: "Wahala dey inside" },
] as const;

export const appealCost = (p: Player) => Math.round(I(p, 600_000));

export function prisonBlockOp(p: Player, op: string): string | null {
  if (p.prison <= 0) return T("You are not in prison.", "You no dey prison.");
  if (p.actionsLeft <= 0) return T("No actions left this year", "No action remain this year");
  if (op === "appeal" && p.money < appealCost(p)) return T(`A lawyer costs ${naira(appealCost(p))}`, `Lawyer go cost ${naira(appealCost(p))}`);
  if (op === "appeal" && p.flags.appealedAge === p.age) return T("You already appealed this year", "You don appeal this year");
  return null;
}

export function prisonOp(p: Player, op: string): string {
  const block = prisonBlockOp(p, op);
  if (block) return block;
  p.actionsLeft -= 1;
  switch (op) {
    case "work": {
      const pay = Math.round(I(p, 40_000) * randInt(8, 14) / 10);
      transact(p, { amount: pay, reason: T("Prison work detail wages", "Prison work detail pay"), category: "salary" });
      bump(p, "stress", 3);
      bump(p, "fitness", 1);
      return T(`You work on the prison farm and workshop. They pay ${naira(pay)} into your account.`, `You work for prison farm and workshop. Dem pay ${naira(pay)} enter your account.`);
    }
    case "study": {
      bump(p, "smarts", 2);
      bump(p, "stress", -2);
      p.flags.prisonStudy = (Number(p.flags.prisonStudy) || 0) + 1;
      if ((p.edu === "none" || p.edu === "primary") && Number(p.flags.prisonStudy) >= 3) {
        p.edu = "secondary";
        p.flags.prisonStudy = 0;
        return T("After years of prison classes, you pass your secondary school certificate exams.", "After plenty prison classes, you pass your secondary school exam.");
      }
      return T("You sit in the prison classroom and learn something new.", "You dey prison classroom dey learn something new.");
    }
    case "appeal": {
      const cost = appealCost(p);
      transact(p, { amount: -cost, reason: T("Appeal lawyer", "Appeal lawyer"), category: "legal" });
      p.flags.appealedAge = p.age;
      const pr = clamp(0.18 + p.stats.connections / 220 + luckBonus(p), 0.05, 0.7);
      if (chance(pr)) {
        const cut = Math.min(p.prison, randInt(1, 3));
        p.prison -= cut;
        bump(p, "happiness", 6);
        return T(`The appeal court reduces your sentence by ${cut} year${cut > 1 ? "s" : ""}.`, `Appeal court cut your sentence by ${cut} year${cut > 1 ? "s" : ""}.`);
      }
      return T("The appeal is dismissed. The lawyer takes his fee anyway.", "Dem throw out the appeal. Lawyer still collect him money.");
    }
    case "escape": {
      if (chance(0.12 + p.stats.fitness / 450 + luckBonus(p))) {
        p.prison = 0;
        p.flags.fugitive = true;
        p.crime.heat = 100;
        bump(p, "stress", 10);
        p.stats.reputation = clamp(p.stats.reputation - 10);
        return T("You slip out during a transfer and vanish. You are free, and wanted.", "You slip comot during transfer and disappear. You free, but police dey find you.");
      }
      p.prison += 2;
      bump(p, "health", -10);
      bump(p, "reputation", -5);
      return T("The guards catch you at the wall. Two more years, and a beating.", "Warders catch you for the wall. Two more years and beating.");
    }
  }
  return "";
}

/** A fugitive may be recaptured, or the case may eventually go cold. */
export function fugitiveYear(p: Player, lines: string[]) {
  if (!p.flags.fugitive || p.prison > 0) return;
  if (chance(0.25)) {
    delete p.flags.fugitive;
    lines.push(T("Police track you down. You are back behind bars.", "Police find you. You don go back prison."));
    lines.push(enterPrison(p, 3));
  } else if (chance(0.1)) {
    delete p.flags.fugitive;
    lines.push(T("The case against you has gone cold. For now, you are free.", "The case don cold. For now, you free."));
  }
}

export const PRISON_EVENTS: EventDef[] = [
  {
    id: "prison_visit",
    title: { en: "A visitor", pcm: "Visitor dey" },
    weight: (p) => (p.prison > 0 ? 2 : 0),
    text: () => T("A warder calls your name. Someone from home has come to see you.", "Warder call your name. Person from house don come see you."),
    choices: (p) => [
      { label: T("Ask for money for the cell and for food", "Ask for money for food and cell"), run: (q) => { const amt = Math.round(I(q, 80_000)); transact(q, { amount: amt, reason: T("Family visit money", "Family visit money"), category: "gift" }); bump(q, "happiness", 3); return T(`They bring food and ${naira(amt)}. Prison is a little easier.`, `Dem bring food and ${naira(amt)}. Prison easy small.`); } },
      { label: T("Just talk", "Just dey gist"), run: (q) => { bump(q, "happiness", 6); bump(q, "stress", -4); q.family.happy = clamp(q.family.happy + 3); return T("An hour of ordinary conversation. It means more than money.", "One hour of normal gist. E mean pass money."); } },
      { label: T("Refuse to see them", "No see them"), disabled: p.prison < 0 ? "" : false, run: (q) => { q.family.happy = clamp(q.family.happy - 6); bump(q, "happiness", -3); return T("You cannot face them. They leave with heavy hearts.", "You no fit face them. Dem go with heavy heart."); } },
    ],
  },
];
