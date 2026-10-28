/**
 * The President's Office: things a president can simply do, and what the intelligence service tells you (some of it true).
 * The strongman toolkit lives in power.ts; this is the legitimate side of the job.
 */
import type { Rng } from "../../game/engine/rng";
import type { Effects, FixState, GroupId } from "./types";
import { addMod, clamp, clamp100, nb, pushNews } from "./util";
import { payPc } from "./meta";
import { recoverLoot } from "./ledger";
import { sack } from "./cabinet";
import { PORTFOLIO_BY_ID } from "./cabinet";

const grp = (s: FixState, d: Partial<Record<GroupId, number>>) => { for (const [k, v] of Object.entries(d)) s.groupMood[k as GroupId] = clamp(s.groupMood[k as GroupId] + (v as number), -40, 40); };
const mod = (s: FixState, id: string, label: string, e: Effects, duration: number | null = null, ramp = 2) => addMod(s, `office:${id}`, label, e, { duration, ramp });

export interface Power {
  id: string; icon: string; title: string; blurb: string; pc: number; cost: number; cooldown: number;
  need?: (s: FixState) => string | null;
  /** extra choices (the arg is the chosen id) */
  choices?: { id: string; label: string }[];
  run: (s: FixState, arg?: string) => string;
}
const jailed = (s: FixState) => s.gone.filter((g) => g.how === "jailed" && !s.flags[`pardoned:${g.id}`]);
const later = (s: FixState, id: string, delay: number, arg?: string) => { const l = JSON.parse(String(s.flags.offLater ?? "[]")) as { due: number; id: string; arg?: string }[]; l.push({ due: s.month + delay, id, arg }); s.flags.offLater = JSON.stringify(l); };

export const POWERS: Power[] = [
  { id: "eolocal", icon: "🇳🇬", title: "Order: government buys Nigerian", blurb: "Every ministry must buy local goods first.", pc: 6, cost: 0, cooldown: 24, run: (s) => { mod(s, "eolocal", "Buy-Nigerian order", { manuf: 2, exports: 0.03, inflation: 0.2 }); grp(s, { business: 3, traders: -2 }); return "Factories get orders. Importers grumble and prices of some goods creep up."; } },
  { id: "eotransparent", icon: "📖", title: "Order: publish every contract", blurb: "Every government contract goes online within a week.", pc: 6, cost: 0, cooldown: 24, run: (s) => { mod(s, "eotransparent", "All contracts published", { procurement: 4, transparency: 3 }); for (const b of s.backers) b.mood = clamp100(b.mood - 4); s.gov.trust = clamp100(s.gov.trust + 1.5); return "Journalists are already reading the files. Some of your own backers are not smiling."; } },
  { id: "eopay", icon: "💳", title: "Order: pay civil servants digitally", blurb: "One payroll, one bank verification, no more ghost workers.", pc: 8, cost: 15, cooldown: 36, run: (s) => { mod(s, "eopay", "Ghost workers removed", { corruption: -1.2, revenue: 30 }); grp(s, { workers: -2 }); pushNews(s, { source: `eopay:${s.month}`, headline: "Thousands of ghost workers removed from the federal payroll", body: "The unions say some real workers were caught up too.", tone: "good" }); return "Tens of thousands of names vanished from the payroll. A few real workers have complaints."; } },
  { id: "pardonyouth", icon: "🕊️", title: "Pardon jailed protesters", blurb: "Release the young people held after the last protests.", pc: 4, cost: 0, cooldown: 12, need: (s) => (s.rule.streetAnger >= 30 ? null : "Nobody is in jail for protesting right now."), run: (s) => { s.rule.streetAnger = clamp100(s.rule.streetAnger - 8); s.gov.trust = clamp100(s.gov.trust + 2); grp(s, { youth: 5 }); s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty - 2); return "The gates opened and the families wept. The security chiefs are not pleased."; } },
  { id: "pardonofficial", icon: "🖋️", title: "Pardon a jailed official", blurb: "Free someone the courts jailed. They will not forget it.", pc: 6, cost: 0, cooldown: 12, need: (s) => (jailed(s).length ? null : "Nobody you jailed is in prison."), run: (s) => { const g = jailed(s)[0]; s.flags[`pardoned:${g.id}`] = 1; s.rule.eliteLoyalty = clamp100(s.rule.eliteLoyalty + 5); s.gov.trust = clamp100(s.gov.trust - 3); s.me.evidence = clamp100(s.me.evidence + 3); for (const b of s.backers) b.mood = clamp100(b.mood + 4); return `${g.name} walked free. The elite think you are generous. Everyone else thinks you are soft.`; } },
  { id: "newchief", icon: "🎖️", title: "Appoint a new Chief of Defence Staff", blurb: "Pick who commands the army.", pc: 8, cost: 0, cooldown: 24, choices: [{ id: "loyal", label: "A loyal friend" }, { id: "pro", label: "A professional soldier" }, { id: "zone", label: "A northerner for balance" }], run: (s, arg) => { s.groupMood.military = clamp(s.groupMood.military + (arg === "pro" ? 3 : 0), -40, 40); if (arg === "loyal") { s.rule.coupRisk = clamp100(s.rule.coupRisk - 8); mod(s, "chief", "A loyal but weak chief of defence", { forces: -1.5 }, 14); return "The new chief owes you everything. The barracks quietly rank him lower."; } if (arg === "pro") { s.rule.coupRisk = clamp100(s.rule.coupRisk - 3); mod(s, "chief", "A professional chief of defence", { forces: 3.5, security: 1 }, 24); return "A professional takes command. Morale lifts, and so does discipline."; } grp(s, { military: 5 }); s.party.north = clamp100(s.party.north + 6); s.rule.coupRisk = clamp100(s.rule.coupRisk - 4); return "A northern general takes command. The north applauds, the south asks why."; } },
  { id: "inquiry", icon: "⚖️", title: "Set up a commission of inquiry", blurb: "Investigate something properly. It reports in six months.", pc: 6, cost: 20, cooldown: 12, choices: [{ id: "oil", label: "Oil theft in the Delta" }, { id: "army", label: "Army equipment contracts" }, { id: "power", label: "Where the power billions went" }], run: (s, arg) => { later(s, "inquiry", 6, arg); return `A judge-led panel is set up. It reports in six months, and powerful people are already nervous.`; } },
  { id: "holiday", icon: "🎉", title: "Declare a public holiday", blurb: "The nation needs a day off and a reason to smile.", pc: 2, cost: 25, cooldown: 6, run: (s) => { s.gov.happiness = clamp100(s.gov.happiness + 3.5); mod(s, "holiday", "Public holiday glow", { happiness: 1.2 }, 2, 1); grp(s, { youth: 3, workers: 2, business: -2 }); return "Streets fill with music. Businesses grumble about the lost output."; } },
  { id: "nsc", icon: "🛡️", title: "Call the National Security Council", blurb: "Sit down with every security chief. You also learn who is telling the truth.", pc: 4, cost: 0, cooldown: 5, run: (s) => { s.flags.nscAt = s.month; s.rule.coupRisk = clamp100(s.rule.coupRisk - 3); mod(s, "nsc", "Security chiefs aligned", { security: 1.5 }, 4); const r = rumours(s).find((x) => !x.done); if (r) { r.hint = r.real ? "the service's best analysts now rate this as likely true" : "the service's best analysts now rate this as probably false"; saveRumours(s, [...rumours(s).filter((x) => x.id !== r.id), r]); } return "The chiefs left aligned. For a few months, intelligence is sharper."; } },
];
export const POWER_BY_ID = Object.fromEntries(POWERS.map((p) => [p.id, p])) as Record<string, Power>;
export function powerBlock(s: FixState, p: Power): string | null {
  const cd = s.flags[`office:cd:${p.id}`]; if (typeof cd === "number" && s.month < cd) return `Available again in ${cd - s.month} months.`;
  const n = p.need?.(s); if (n) return n;
  if (p.cost * (0.6 + 0.4 * s.eco.priceLevel / 100) > s.fin.treasury) return "Not enough cash.";
  return null;
}
export function applyPower(s: FixState, id: string, arg?: string): { ok: boolean; message: string } {
  const p = POWER_BY_ID[id]; if (!p) return { ok: false, message: "Unknown power." };
  const block = powerBlock(s, p); if (block) return { ok: false, message: block };
  if (p.choices && !p.choices.some((c) => c.id === arg)) return { ok: false, message: "Choose one." };
  const pcE = payPc(s, p.pc, p.title.toLowerCase()); if (pcE) return { ok: false, message: pcE };
  s.fin.treasury -= p.cost * (0.6 + 0.4 * s.eco.priceLevel / 100);
  s.flags[`office:cd:${p.id}`] = s.month + p.cooldown;
  return { ok: true, message: p.run(s, arg) };
}

// ---------------------------------------------------------------- intelligence: rumours, some of them true
export interface Rumour { id: string; month: number; kind: "coup" | "minister" | "vp" | "leak"; text: string; real: boolean; target?: string; done?: boolean; revealed?: boolean; hint?: string }
export const rumours = (s: FixState): Rumour[] => { try { return JSON.parse(String(s.flags.intel ?? "[]")) as Rumour[]; } catch { return []; } };
const saveRumours = (s: FixState, l: Rumour[]) => { s.flags.intel = JSON.stringify(l.slice(-8)); };
const accuracy = (s: FixState) => clamp(0.6 + ((s.staff?.cos?.skill ?? 50) - 50) * 0.003 + (typeof s.flags.nscAt === "number" && s.month - Number(s.flags.nscAt) < 4 ? 0.15 : 0), 0.4, 0.92);
const general = (s: FixState) => ["General Ibrahim Danladi", "General Chukwuma Obi", "General Musa Garba", "General Tunde Bakare", "General Yakubu Sani"][Math.abs(s.meta.seed) % 5];

export function intelMonthly(s: FixState, rng: Rng) {
  const live = rumours(s).filter((r) => !r.done && s.month - r.month < 5);
  if (s.month < 4 || live.length >= 3 || !rng.chance(0.3)) return;
  const acc = accuracy(s);
  const kinds: Rumour["kind"][] = ["coup", "minister", "vp", "leak"];
  const kind = rng.pick(kinds);
  const mins = Object.values(s.cabinet.members).filter(Boolean);
  let real = false, text = "", target: string | undefined;
  if (kind === "coup") { real = s.rule.coupRisk > 33; text = `The service says ${general(s)} met two colonels and an opposition fixer last week.`; }
  else if (kind === "minister") { if (!mins.length) return; const m = rng.pick(mins); target = m.portfolio; real = m.integrity < 45 || m.faction === "crony" && m.integrity < 55; text = `A source says your ${PORTFOLIO_BY_ID[m.portfolio].title}, ${m.name}, is skimming from contracts.`; }
  else if (kind === "vp") { if (!s.staff.vp) return; real = s.party.vpAmbition > 50; text = `The service reports that ${s.staff.vp.name} has been hosting governors at night.`; }
  else { real = s.me.evidence > 18; text = "A journalist has been given records about your dealings and is preparing a story."; }
  const truth = real ? rng.chance(acc) : rng.chance(1 - acc);
  const all = rumours(s); all.push({ id: `r${s.month}:${kind}`, month: s.month, kind, text, real: truth, target });
  saveRumours(s, all);
}

export const RUMOUR_ACTIONS: Record<Rumour["kind"], { id: string; label: string; pc: number }[]> = {
  coup: [{ id: "investigate", label: "Have the service dig deeper", pc: 4 }, { id: "purge", label: "Move against him now", pc: 8 }, { id: "ignore", label: "Ignore it", pc: 0 }],
  minister: [{ id: "investigate", label: "Quietly audit the ministry", pc: 4 }, { id: "sack", label: "Sack the minister", pc: 3 }, { id: "ignore", label: "Ignore it", pc: 0 }],
  vp: [{ id: "investigate", label: "Watch the Vice President", pc: 4 }, { id: "confront", label: "Confront him", pc: 4 }, { id: "ignore", label: "Ignore it", pc: 0 }],
  leak: [{ id: "investigate", label: "Find the source", pc: 4 }, { id: "brief", label: "Brief the press first", pc: 4 }, { id: "ignore", label: "Ignore it", pc: 0 }],
};
export function actOnRumour(s: FixState, id: string, action: string): { ok: boolean; message: string } {
  const all = rumours(s); const r = all.find((x) => x.id === id);
  if (!r || r.done) return { ok: false, message: "That report is no longer live." };
  const a = RUMOUR_ACTIONS[r.kind].find((x) => x.id === action); if (!a) return { ok: false, message: "Unknown action." };
  if (a.pc) { const e = payPc(s, a.pc, a.label.toLowerCase()); if (e) return { ok: false, message: e }; }
  const finish = (msg: string) => { r.done = true; saveRumours(s, all); return { ok: true, message: msg }; };
  if (action === "investigate") { r.revealed = true; r.hint = r.real ? "Confirmed: it is true." : "Checked: it is false."; saveRumours(s, all); return { ok: true, message: r.real ? "The service confirms it. You now know, and can act." : "The service finds nothing. It was a false lead." }; }
  if (action === "ignore") { if (r.real && r.kind === "coup") s.rule.coupRisk = clamp100(s.rule.coupRisk + 4); if (r.real && r.kind === "leak") { s.me.scandals += 1; s.me.evidence = clamp100(s.me.evidence + 4); } return finish(r.real ? "You ignored it. It was true, and it will cost you." : "You ignored it. It was nothing."); }
  if (r.kind === "coup" && action === "purge") { if (r.real) { s.rule.coupRisk = clamp100(s.rule.coupRisk - 12); return finish("You moved first. The plot was real, and it died in a night."); } s.groupMood.military = clamp(s.groupMood.military - 8, -40, 40); s.rule.coupRisk = clamp100(s.rule.coupRisk + 6); s.rule.democracy = clamp100(s.rule.democracy - 2); return finish("You moved against an innocent general. The army noticed, and the plot you invented is now real."); }
  if (r.kind === "minister" && action === "sack") { const m = r.target ? s.cabinet.members[r.target as keyof typeof s.cabinet.members] : undefined; if (m) sack(s, m.portfolio, "sacked"); if (r.real) { s.gov.trust = clamp100(s.gov.trust + 2); return finish("You sacked a thief before he could steal more."); } s.gov.trust = clamp100(s.gov.trust - 2); return finish("You sacked an honest minister on a false report. The cabinet is unsettled."); }
  if (r.kind === "vp" && action === "confront") { if (r.real) { s.party.vpAmbition = clamp100(s.party.vpAmbition - 10); return finish("He admitted nothing and stopped the dinners."); } if (s.staff.vp) s.staff.vp.loyalty = clamp100(s.staff.vp.loyalty - 12); return finish("He was only being sociable, and is now deeply offended."); }
  if (r.kind === "leak" && action === "brief") { if (r.real) { s.me.evidence = clamp100(s.me.evidence - 4); s.gov.trust = clamp100(s.gov.trust - 1); return finish("You got your version out first. The story still ran, but it was a day smaller."); } s.gov.trust = clamp100(s.gov.trust - 1.5); return finish("You briefed the press about a story that did not exist. It does now."); }
  return finish("Done.");
}

export function officeMonthly(s: FixState, rng: Rng) {
  intelMonthly(s, rng);
  // expire old rumours; unanswered true ones sting a little
  const all = rumours(s); let changed = false;
  for (const r of all) if (!r.done && s.month - r.month >= 5) { r.done = true; changed = true; if (r.real && r.kind === "coup") s.rule.coupRisk = clamp100(s.rule.coupRisk + 2); }
  if (changed) saveRumours(s, all);
  // commissions report
  const l = JSON.parse(String(s.flags.offLater ?? "[]")) as { due: number; id: string; arg?: string }[];
  if (l.length) {
    for (const x of l.filter((y) => y.due <= s.month)) {
      if (x.id === "inquiry") {
        const ok = s.rule.judiciary >= 35;
        if (x.arg === "oil") { if (ok) { const rec = recoverLoot(s, 60 + Math.round(s.gov.corruption), "the oil-theft inquiry"); addMod(s, "office:inq:oil", "Oil-theft inquiry findings", { oilTheft: -6, crude: 30 }, { duration: 18, ramp: 2 }); pushNews(s, { source: `inq:${s.month}`, headline: "Inquiry names the oil-theft cartel: arrests begin", body: `${nb(rec)} recovered.`, tone: "good" }); } else pushNews(s, { source: `inq:${s.month}`, headline: "Oil-theft inquiry report shelved", body: "Critics say the report named the wrong people, or the right ones.", tone: "bad" }); }
        if (x.arg === "army") { if (ok) { addMod(s, "office:inq:army", "Army procurement cleaned up", { forces: 3, procurement: 2 }, { duration: 24, ramp: 2 }); s.rule.coupRisk = clamp100(s.rule.coupRisk + 3); pushNews(s, { source: `inq:${s.month}`, headline: "Army contracts inquiry: generals named in padded deals", body: "Soldiers cheer, generals fume.", tone: "good" }); } else pushNews(s, { source: `inq:${s.month}`, headline: "Army contracts inquiry collapses", body: "Witnesses developed sudden amnesia.", tone: "bad" }); }
        if (x.arg === "power") { if (ok) { const rec = recoverLoot(s, 50 + Math.round(s.gov.corruption * 0.8), "the power-sector inquiry"); addMod(s, "office:inq:power", "Power-sector inquiry findings", { gas: 4, grid: 2 }, { duration: 18, ramp: 2 }); pushNews(s, { source: `inq:${s.month}`, headline: "Power inquiry traces the missing billions", body: `${nb(rec)} recovered, and contracts re-awarded.`, tone: "good" }); } else pushNews(s, { source: `inq:${s.month}`, headline: "Power inquiry ends without a single charge", body: "The billions are still missing.", tone: "bad" }); }
      }
    }
    s.flags.offLater = JSON.stringify(l.filter((y) => y.due > s.month));
  }
}
