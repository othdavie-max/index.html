/**
 * The loot ledger. Everything stolen is counted, everything recovered is counted, and recovered money does not just
 * vanish into the treasury: you decide where it goes. All amounts are ₦bn, simulated.
 */
import type { FixState } from "./types";
import { addMod, clamp, nb, pushNews } from "./util";
import { createEvent } from "./spawn";

export const noteStolen = (s: FixState, bn: number) => { s.ledger.stolen += bn; };

/** money comes back from a prosecution. It waits for your decision. */
export function recoverLoot(s: FixState, bn: number, from: string): number {
  const amt = Math.round(bn * 10) / 10;
  if (!(amt > 0)) return 0;
  const L = s.ledger;
  L.recovered += amt; L.pending += amt;
  L.log.push({ month: s.month, text: `Recovered from ${from}`, amount: amt }); if (L.log.length > 40) L.log.shift();
  s.flags.lootToast = JSON.stringify({ month: s.month, amt, from });
  if (L.pending >= 12 && !s.events.some((e) => e.tpl === "lootDecision" && e.status === "open")) createEvent(s, "lootDecision", "NG-FC");
  return amt;
}

export const DESTS = [
  { id: "schools", icon: "🏫", label: "Schools and teachers", explain: "Better classrooms and teacher pay. Pays off slowly, and parents notice." },
  { id: "clinics", icon: "🏥", label: "Clinics and medicines", explain: "Drugs and equipment in public clinics." },
  { id: "roads", icon: "🛣️", label: "Roads and maintenance", explain: "Repair the roads people use every day." },
  { id: "debt", icon: "💳", label: "Pay down local debt", explain: "Less interest every month." },
  { id: "fund", icon: "🏦", label: "Savings fund (or treasury)", explain: "Keep it safe for a crisis. Goes to the treasury until a savings fund opens." },
  { id: "treasury", icon: "💰", label: "Government cash", explain: "Spend it on whatever is most urgent." },
] as const;
export type Dest = (typeof DESTS)[number]["id"];

/** send some or all of the waiting loot to a destination */
export function allocate(s: FixState, dest: Dest, bn?: number): { ok: boolean; message: string } {
  const L = s.ledger, amt = Math.min(L.pending, bn ?? L.pending);
  if (!(amt > 0)) return { ok: false, message: "There is no recovered money waiting." };
  L.pending -= amt; L.used[dest] = (L.used[dest] ?? 0) + amt;
  const k = clamp(amt / 25, 0.3, 4);
  switch (dest) {
    case "schools": addMod(s, `loot:schools:${s.month}`, "Recovered loot: schools", { education: k, happiness: 0.1 * k, trust: 0.15 * k }, { duration: 18, ramp: 4 }); break;
    case "clinics": addMod(s, `loot:clinics:${s.month}`, "Recovered loot: clinics", { health: k, happiness: 0.1 * k, trust: 0.15 * k }, { duration: 18, ramp: 4 }); break;
    case "roads": addMod(s, `loot:roads:${s.month}`, "Recovered loot: roads", { roads: k, maint: 0.5 * k, trust: 0.1 * k }, { duration: 18, ramp: 4 }); break;
    case "debt": { const pay = Math.min(amt, s.fin.domesticDebt); s.fin.domesticDebt -= pay; s.fin.treasury += amt - pay; break; }
    case "fund": if (s.lend && (s.fin.domesticDebt + s.fin.foreignDebt * s.eco.fx) / 230000 * 100 < 10) s.lend.fund += amt; else s.fin.treasury += amt; break;
    default: s.fin.treasury += amt;
  }
  const d = DESTS.find((x) => x.id === dest)!;
  L.log.push({ month: s.month, text: `${nb(amt)} sent to ${d.label.toLowerCase()}`, amount: -amt });
  if (L.log.length > 40) L.log.shift();
  if (dest === "schools" || dest === "clinics" || dest === "roads") pushNews(s, { source: `loot:${dest}:${s.month}`, headline: `Recovered loot funds ${d.label.toLowerCase()}`, body: `${nb(amt)} taken back from thieves is going to ${d.label.toLowerCase()}. ${dest === "schools" ? "A teachers' union leader called it 'the first time stolen money came back to us'." : "People noticed."}`, tone: "good" });
  return { ok: true, message: `${nb(amt)} sent to ${d.label.toLowerCase()}.` };
}
/** anything left waiting is swept into the treasury after a while */
export function ledgerMonthly(s: FixState) {
  const L = s.ledger;
  if (L.pending > 0 && !s.events.some((e) => e.tpl === "lootDecision" && e.status === "open") && s.month - Number(s.flags.lootSweep ?? s.month) >= 4) { allocate(s, "treasury"); }
  if (L.pending > 0 && s.flags.lootSweep === undefined) s.flags.lootSweep = s.month;
  if (L.pending === 0) delete s.flags.lootSweep;
}

const opt = (id: Dest) => {
  const d = DESTS.find((x) => x.id === id)!;
  return { id, label: `${d.icon} ${d.label}`, explain: d.explain, cost: 0, tradeoff: id === "treasury" ? "No lasting effect." : "Takes months to show.", unc: "low" as const, chance: () => 1, win: { run: (s: FixState) => { const r = allocate(s, id); return r.message; } }, lose: {}, winText: "", loseText: "" };
};
export const LEDGER_TEMPLATES = [
  {
    id: "lootDecision", kind: "opportunity" as const, urgency: 3,
    title: (s: FixState) => `${nb(s.ledger.pending)} of recovered loot is waiting for you`,
    cause: (s: FixState) => `The courts and investigators have handed back ${nb(s.ledger.pending)} of stolen money (${nb(s.ledger.recovered)} recovered this game, ${nb(s.ledger.stolen)} stolen). Where should it go? Every Nigerian will want to know.`,
    options: [opt("schools"), opt("clinics"), opt("roads"), opt("debt"), opt("fund"), opt("treasury")],
    expire: { run: (s: FixState) => { const r = allocate(s, "treasury"); return `${r.message} (You did not decide in time.)`; } }, expireText: () => "It went into the treasury by default.",
  },
];
