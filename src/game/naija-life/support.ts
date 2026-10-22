import { applySupport, remember, SUPPORT_KINDS, type SupportKind, type ReplyType } from "./family";
import { I, bump } from "./helpers";
import { transact } from "./ledger";
import type { EventDef, Npc, Player } from "./types";
import { T, chance, clamp, dual, naira } from "./util";

const first = (n: Npc | undefined) => (n ? n.name.split(" ")[0] : "");
const kindLabel = (k: SupportKind) => SUPPORT_KINDS[k].label;

/** The follow-up when a parent does not simply say yes or no. */
export const SUPPORT_EVENTS: EventDef[] = [
  {
    id: "support_reply",
    title: dual("Their answer", "Wetin dem talk"),
    weight: () => 0,
    text: (_p, d) => String(d.text),
    choices: (p, d) => {
      const n = p.npcs[String(d.npcId)];
      const kind = d.kind as SupportKind;
      const type = d.rtype as ReplyType;
      const amount = Number(d.amount);
      if (!n) return [{ label: T("Continue", "Continue"), run: () => "" }];
      const apply = (q: Player, t: ReplyType, amt = amount) => applySupport(q, q.npcs[n.id], kind, { type: t, amount: amt, text: "" }, { accepted: true });
      if (type === "loan") {
        return [
          { label: T(`Accept the loan (${naira(amount)})`, `Collect the loan (${naira(amount)})`), run: (q) => { apply(q, "loan"); return T(`${first(n)} sends ${naira(amount)}. You owe it back within a year.`, `${first(n)} send ${naira(amount)}. You go pay am back inside one year.`); } },
          { label: T("Decline, you will manage", "No collect, you go manage"), run: (q) => { q.npcs[n.id].closeness = clamp(q.npcs[n.id].closeness + 1); return T("You decline politely. They respect your pride.", "You decline well well. Dem respect your pride."); } },
        ];
      }
      if (type === "conditional") {
        return [
          { label: T(`Take half now (${naira(amount)}) and prove yourself`, `Take half now (${naira(amount)}) and show say you sabi`), run: (q) => { apply(q, "conditional"); q.npcs[n.id].trust = clamp(q.npcs[n.id].trust + 2); remember(q, q.npcs[n.id], T("Gave you half, waiting to see how you use it.", "Gave you half, dey wait see how you go use am."), "good"); return T("You take the money and promise to be responsible.", "You collect the money and promise to do well."); } },
          { label: T("Refuse the condition", "Reject the condition"), run: (q) => { q.npcs[n.id].closeness = clamp(q.npcs[n.id].closeness - 2); return T("You say you would rather not be treated like a child.", "You talk say you no wan make dem treat you like pikin."); } },
        ];
      }
      if (type === "askPurpose") {
        return [
          { label: T("Tell the truth", "Tell am the truth"), run: (q) => { apply(q, "askPurpose"); q.npcs[n.id].trust = clamp(q.npcs[n.id].trust + 3); return T(`You explain honestly. ${first(n)} sends ${naira(amount)}.`, `You explain am well. ${first(n)} send ${naira(amount)}.`); } },
          { label: T("Give a nice-sounding reason", "Talk better story"), run: (q) => {
            if (chance(0.65)) { apply(q, "askPurpose"); return T(`It works. ${first(n)} sends ${naira(amount)}.`, `E work. ${first(n)} send ${naira(amount)}.`); }
            const m = q.npcs[n.id]; m.closeness = clamp(m.closeness - 8); m.trust = clamp(m.trust - 12); remember(q, m, T("Lied about what the money was for.", "Lie about wetin the money be for."), "bad");
            return T(`${first(n)} sees through it. No money, and a long lecture.`, `${first(n)} see through am. No money, na only long lecture.`);
          } },
          { label: T("Refuse to explain", "No explain"), run: (q) => { q.npcs[n.id].closeness = clamp(q.npcs[n.id].closeness - 2); return T("You say it is private. The conversation ends.", "You talk say na private matter. Talk finish."); } },
        ];
      }
      // workForIt
      const pay = Math.round(Math.max(amount, I(p, SUPPORT_KINDS[kind].base) * 0.6) * 0.6);
      return [
        { label: T(`Do the chores for ${naira(pay)}`, `Do the work make dem pay you ${naira(pay)}`), sub: T("Uses one action", "Use one action"), disabled: p.actionsLeft <= 0 ? T("No actions left this year", "No action remain this year") : false, run: (q) => {
          q.actionsLeft -= 1;
          transact(q, { amount: pay, reason: T(`Paid by ${first(n)} for helping out`, `${first(n)} pay you for the work`), category: "allowance" });
          bump(q, "stress", 2);
          q.npcs[n.id].closeness = clamp(q.npcs[n.id].closeness + 3);
          remember(q, q.npcs[n.id], T("Worked for the money instead of just asking.", "Work for the money instead of begging."), "good");
          return T(`You spend a few weekends helping out. ${first(n)} pays you ${naira(pay)}.`, `You use some weekends help ${first(n)}. Dem pay you ${naira(pay)}.`);
        } },
        { label: T("Refuse, you are not a servant", "No do am, you no be house help"), run: (q) => { q.npcs[n.id].closeness = clamp(q.npcs[n.id].closeness - 3); return T("You storm off. The house is quiet for days.", "You vex comot. House quiet for days."); } },
      ];
    },
  },
];

/** A parent who said "later" sometimes follows through. */
export function yearlyPromises(p: Player, lines: string[]) {
  for (const key of Object.keys(p.flags)) {
    if (!key.startsWith("promise_")) continue;
    const [, id, kind] = key.split("_");
    const n = p.npcs[id];
    const amt = Number(p.flags[key]);
    delete p.flags[key];
    if (!n || !n.alive || !Number.isFinite(amt)) continue;
    if (chance(0.5 + n.generosity / 250)) {
      transact(p, { amount: amt, reason: T(`${first(n)} kept their promise: ${kindLabel(kind as SupportKind)}`, `${first(n)} do wetin dem promise: ${kindLabel(kind as SupportKind)}`), category: "gift" });
      n.closeness = clamp(n.closeness + 3);
      lines.push(T(`${first(n)} remembered and sent ${naira(amt)} for ${kindLabel(kind as SupportKind).toLowerCase()}.`, `${first(n)} no forget, dem send ${naira(amt)} for ${kindLabel(kind as SupportKind).toLowerCase()}.`));
    } else {
      n.closeness = clamp(n.closeness - 1);
      lines.push(T(`${first(n)} never got around to helping with ${kindLabel(kind as SupportKind).toLowerCase()}.`, `${first(n)} no ever help with ${kindLabel(kind as SupportKind).toLowerCase()}.`));
    }
  }
}
