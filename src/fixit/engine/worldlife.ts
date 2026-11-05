/**
 * The world talks back. Countries send requests (aid after a disaster, a loan, peacekeepers, a vote, refugees), leaders call
 * when you pass them or anger them, favours are remembered and returned, and the other countries have their own news:
 * elections, coups, border clashes, trade deals and breakthroughs. Everything lands in one inbox (`flags.inbox`).
 */
import type { Rng } from "../../game/engine/rng";
import type { FixState } from "./types";
import { addMod, clamp, clamp100, nb, pushNews } from "./util";
import { W, league, saveW, type Country } from "./world";
import { leaderOf } from "./diplomacy";
import { addHeat, repairFeud, sizeOf } from "./feuds";
import { GOODS, imp } from "./imports";
import { activeIn } from "./agreements";

export interface Msg { id: string; month: number; from: string; kind: string; title: string; text: string; options?: { id: string; label: string; hint?: string }[]; due?: number; done?: boolean; outcome?: string; amount?: number; read?: boolean }
export const inbox = (s: FixState): Msg[] => { try { return JSON.parse(String(s.flags.inbox ?? "[]")) as Msg[]; } catch { return []; } };
const saveInbox = (s: FixState, l: Msg[]) => { s.flags.inbox = JSON.stringify(l.slice(-40)); };
export const unread = (s: FixState) => inbox(s).filter((m) => !m.read && !m.done).length;
const money = (s: FixState, bn: number) => Math.round(bn * (0.6 + 0.4 * s.eco.priceLevel / 100));
const owes = (s: FixState): Record<string, number> => { try { return JSON.parse(String(s.flags.owes ?? "{}")) as Record<string, number>; } catch { return {}; } };
const addOwe = (s: FixState, id: string, d: number) => { const o = owes(s); o[id] = (o[id] ?? 0) + d; s.flags.owes = JSON.stringify(o); };
const loans = (s: FixState): { id: string; amount: number; due: number; from: string }[] => { try { return JSON.parse(String(s.flags.wloans ?? "[]")); } catch { return []; } };
const send = (s: FixState, m: Omit<Msg, "id" | "month">) => { const l = inbox(s); l.push({ ...m, id: `m${s.month}-${l.length}-${m.kind}`, month: s.month }); saveInbox(s, l); };
const sig = (c: Country, s: FixState) => { const L = leaderOf(s, c); return `${L.title} ${L.name} of ${c.name}`; };

// ------------------------------------------------------------------------------------------------ requests
interface Req { kind: string; w: (s: FixState, c: Country) => number; make: (s: FixState, c: Country) => Omit<Msg, "id" | "month" | "from" | "kind"> }
const DISASTERS = ["floods", "a drought", "an earthquake", "a cholera outbreak", "a cyclone"];
const REQS: Req[] = [
  { kind: "aid", w: (s, c) => (c.region === "africa" ? 3 : 1) * (c.gdp < 2000 ? 1 : 0.2), make: (s, c) => { const amt = money(s, 15 + Math.round(Math.log10(c.gdp) * 8)); const d = DISASTERS[(s.month + c.id.length) % DISASTERS.length]; return { title: `${c.flag} ${c.name} asks for help after ${d}`, text: `${sig(c, s)} writes: "Our people are suffering after ${d}. Nigeria is a big brother now. Can you help?" They ask for ${nb(amt)}.`, amount: amt, options: [{ id: "give", label: `Send ${nb(amt)}`, hint: "They will remember it" }, { id: "half", label: `Send half`, hint: "Something is better than nothing" }, { id: "no", label: "Not this time", hint: "Relations cool" }] }; } },
  { kind: "loan", w: (s, c) => (c.gdp < 3000 ? 1.5 : 0.3) * (s.fin.treasury > 800 ? 1 : 0.1), make: (s, c) => { const amt = money(s, 40 + Math.round(Math.log10(c.gdp) * 12)); return { title: `${c.flag} ${c.name} wants to borrow from Nigeria`, text: `${sig(c, s)} asks for a loan of ${nb(amt)}, repaid with 8% interest in about 18 months. Their stability is ${Math.round(c.stab)}/100: the higher it is, the likelier you see your money again.`, amount: amt, options: [{ id: "give", label: `Lend ${nb(amt)}`, hint: "Earns interest, if they pay" }, { id: "no", label: "Decline politely", hint: "A small chill" }] }; } },
  { kind: "troops", w: (s, c) => (c.region === "africa" && c.stab < 50 ? 2.5 : 0.2), make: (s, c) => ({ title: `${c.flag} ${c.name} asks for peacekeepers`, text: `${sig(c, s)} says armed groups are near the capital. "Your soldiers are the best in the region. Send a brigade and we will never forget it."`, options: [{ id: "give", label: "Send a brigade", hint: "Costs money and some army strength; big influence" }, { id: "no", label: "Our army is needed at home", hint: "They understand, mostly" }] }) },
  { kind: "vote", w: (s, c) => (c.inf > 50 ? 1.2 : 0.4), make: (s, c) => { const rival = W(s).c.filter((x) => x.id !== c.id).sort((a, b) => Math.abs(b.inf - c.inf) - Math.abs(a.inf - c.inf))[0]; return { title: `${c.flag} ${c.name} wants your vote against ${rival.name}`, text: `${sig(c, s)} is pushing a resolution aimed at ${rival.flag} ${rival.name} and asks Nigeria to vote with them.`, options: [{ id: "give", label: `Vote with ${c.name}`, hint: `${rival.name} will be annoyed` }, { id: "abstain", label: "Abstain", hint: "Nobody is happy, nobody is angry" }, { id: "no", label: `Vote against ${c.name}`, hint: `${rival.name} will be grateful` }], amount: undefined, outcome: rival.id }; } },
  { kind: "refugees", w: (s, c) => (c.region === "africa" && c.stab < 45 ? 2 : 0), make: (s, c) => ({ title: `${c.flag} Refugees from ${c.name} at the border`, text: `Fighting in ${c.name} has sent tens of thousands toward Nigeria. ${sig(c, s)} begs you to let them in until it is safe.`, options: [{ id: "give", label: "Open camps and let them in", hint: "Costs money; neighbours admire it" }, { id: "no", label: "Close the border", hint: "Cheaper, but remembered" }] }) },
  { kind: "cheapoil", w: (s, c) => (c.gdp < 4000 && c.region !== "europe" ? 1.1 : 0.2), make: (s, c) => ({ title: `${c.flag} ${c.name} wants cheap Nigerian oil`, text: `${sig(c, s)} says fuel prices are crushing their people. "Sell us crude at a friend's price for a year. We will not forget it." You would lose some oil income.`, options: [{ id: "give", label: "Sell at a friend's price", hint: "Less oil money for a year. A grateful friend." }, { id: "half", label: "A smaller discount", hint: "Costs half as much, wins half the thanks." }, { id: "no", label: "Full price or nothing" }] }) },
  { kind: "liftban", w: (s, c) => (GOODS.some((g) => !g.fixed && imp(s)[g.id].policy !== "open" && activeIn(s, g.id).some((a) => a.with === c.id)) ? 3 : 0), make: (s, c) => { const g = GOODS.find((x) => !x.fixed && imp(s)[x.id].policy !== "open" && activeIn(s, x.id).some((a) => a.with === c.id))!; return { title: `${c.flag} ${c.name} protests your ${g.name.toLowerCase()} ${imp(s)[g.id].policy}`, text: `${sig(c, s)} says Nigeria's ${imp(s)[g.id].policy} on ${g.name.toLowerCase()} is killing their exporters. "Lift it, or we will think about how we treat your goods."`, options: [{ id: "give", label: "Lift it for them", hint: "Imports reopen. Local makers will complain." }, { id: "half", label: "Give them a quota", hint: "A compromise: they calm down a little." }, { id: "no", label: "Keep it" }], outcome: g.id }; } },
  { kind: "seat", w: (s, c) => (c.inf > 45 ? 1.1 : 0.3), make: (s, c) => ({ title: `${c.flag} ${c.name} asks for your vote for its Security Council seat`, text: `${sig(c, s)} wants Nigeria's vote in the next UN ballot. A rival is running too. "Remember who stood with you."`, options: [{ id: "give", label: "Vote for them", hint: "Wins a friend. Their rival will remember." }, { id: "no", label: "Vote for their rival" }, { id: "abstain", label: "Abstain" }] }) },
];

export function answer(s: FixState, msgId: string, optId: string): { ok: boolean; message: string } {
  const l = inbox(s); const m = l.find((x) => x.id === msgId); if (!m || m.done) return { ok: false, message: "That message has already been dealt with." };
  const w = W(s); const c = w.c.find((x) => x.id === m.from); if (!c) return { ok: false, message: "Unknown country." };
  let msg = "";
  if (m.kind === "aid") {
    const amt = optId === "give" ? m.amount! : optId === "half" ? Math.round(m.amount! / 2) : 0;
    if (amt > s.fin.treasury) return { ok: false, message: "Not enough cash." };
    s.fin.treasury -= amt;
    if (amt) { c.rel = clamp100(c.rel + (optId === "give" ? 14 : 6)); addOwe(s, c.id, optId === "give" ? 2 : 1); s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + (optId === "give" ? 0.6 : 0.25)); msg = `${c.name} thanks Nigeria publicly. Their newspapers call you "a true friend".`; }
    else { c.rel = clamp100(c.rel - 6); addHeat(s, c.id, 6 * (0.6 + sizeOf(c)), "Nigeria refused them aid in a crisis"); msg = `${c.name} is disappointed. Their press asks what Nigeria's new money is for.`; }
  } else if (m.kind === "loan") {
    if (optId === "give") { if (m.amount! > s.fin.treasury) return { ok: false, message: "Not enough cash." }; s.fin.treasury -= m.amount!; const L = loans(s); L.push({ id: c.id, amount: m.amount!, due: s.month + 18, from: c.name }); s.flags.wloans = JSON.stringify(L); c.rel = clamp100(c.rel + 8); addOwe(s, c.id, 1); msg = `${nb(m.amount!)} is on its way to ${c.name}. Due back in 18 months.`; }
    else { c.rel = clamp100(c.rel - 3); addHeat(s, c.id, 3, "Nigeria turned down their loan request"); msg = `${c.name} looks elsewhere for money.`; }
  } else if (m.kind === "troops") {
    if (optId === "give") { const cost = money(s, 35); if (cost > s.fin.treasury) return { ok: false, message: "Not enough cash." }; s.fin.treasury -= cost; s.mil.strength = Math.max(0, s.mil.strength - 3); c.stab = clamp100(c.stab + 10); c.rel = clamp100(c.rel + 15); addOwe(s, c.id, 2); s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 1); msg = `Nigerian peacekeepers land in ${c.name}. The fighting eases and the world takes note.`; }
    else { c.rel = clamp100(c.rel - 4); addHeat(s, c.id, 5, "Nigeria would not send peacekeepers"); msg = `${c.name} understands, but turns to others.`; }
  } else if (m.kind === "vote") {
    const rv = w.c.find((x) => x.id === m.outcome);
    if (optId === "give") { c.rel = clamp100(c.rel + 9); if (rv) rv.rel = clamp100(rv.rel - 8); addOwe(s, c.id, 1); msg = `You vote with ${c.name}.${rv ? ` ${rv.name} takes note.` : ""}`; }
    else if (optId === "no") { c.rel = clamp100(c.rel - 9); addHeat(s, c.id, 8 * (0.6 + sizeOf(c)), "Nigeria voted against them"); if (rv) { rv.rel = clamp100(rv.rel + 8); addOwe(s, rv.id, 1); } msg = `You vote against ${c.name}.${rv ? ` ${rv.name} is grateful.` : ""}`; }
    else { msg = "You abstain. Diplomats shrug."; }
  } else if (m.kind === "refugees") {
    if (optId === "give") { const cost = money(s, 25); if (cost > s.fin.treasury) return { ok: false, message: "Not enough cash." }; s.fin.treasury -= cost; c.rel = clamp100(c.rel + 12); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas + 6); s.rule.streetAnger = clamp100(s.rule.streetAnger + 1.5); addOwe(s, c.id, 1); msg = "Camps open along the border. Aid agencies praise Nigeria; some locals grumble."; }
    else { c.rel = clamp100(c.rel - 10); addHeat(s, c.id, 5, "Nigeria shut the border on their refugees"); s.foreign.rel.ecowas = clamp100(s.foreign.rel.ecowas - 4); s.rule.intlPressure = clamp100(s.rule.intlPressure + 2); msg = "The border stays shut. Pictures of families in the rain go around the world."; }
  } else if (m.kind === "cheapoil") {
    if (optId === "give" || optId === "half") { const k = optId === "give" ? 1 : 0.5; c.rel = clamp100(c.rel + 12 * k); addOwe(s, c.id, optId === "give" ? 2 : 1); s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 0.5 * k); addMod(s, `oilgift:${c.id}`, `Cheap crude for ${c.name}`, { revenue: -14 * k, fxSupply: -0.12 * k }, { duration: 12, ramp: 1 }); msg = `${c.name} gets its discount and thanks Nigeria on television. Your oil income dips for a year.`; }
    else { c.rel = clamp100(c.rel - 5); addHeat(s, c.id, 9 * (0.6 + sizeOf(c)), "Nigeria refused a friend's price on oil"); msg = `${c.name} says that is not how friends behave.`; }
  } else if (m.kind === "liftban") {
    const gid = m.outcome ?? ""; const st = imp(s);
    if (optId === "give" && st[gid]) { st[gid].policy = "open"; s.flags.imports = JSON.stringify(st); c.rel = clamp100(c.rel + 9); addHeat(s, c.id, -6); msg = `Imports of ${gid} reopen. ${c.name} is relieved; Nigerian makers are not.`; }
    else if (optId === "half") { c.rel = clamp100(c.rel + 3); addHeat(s, c.id, -2); msg = `A quota keeps the peace for now. ${c.name} wants more later.`; }
    else { c.rel = clamp100(c.rel - 4); addHeat(s, c.id, 10 * (0.6 + sizeOf(c)), "Nigeria kept its import ban on their goods"); msg = `${c.name}'s trade minister warns of "consequences".`; }
  } else if (m.kind === "seat") {
    if (optId === "give") { c.rel = clamp100(c.rel + 9); addOwe(s, c.id, 1); addHeat(s, c.id, -5); msg = `Nigeria votes for ${c.name}. Their delegation applauds.`; }
    else if (optId === "no") { c.rel = clamp100(c.rel - 8); addHeat(s, c.id, 9 * (0.6 + sizeOf(c)), "Nigeria voted against them at the UN"); msg = `Nigeria votes for their rival. ${c.name} marks it down.`; }
    else msg = "Nigeria abstains. Nobody is thrilled.";
  } else if (m.kind === "feud") {
    const r = repairFeud(s, c.id, optId as "apologise" | "sweeten" | "firm"); if (!r.ok) return r; msg = r.message;
  } else if (m.kind === "favour" || m.kind === "call") { msg = "Noted."; }
  m.done = true; m.read = true; m.outcome = msg; saveInbox(s, l); saveW(s, w);
  return { ok: true, message: msg };
}
export function markRead(s: FixState) { const l = inbox(s); for (const m of l) m.read = true; saveInbox(s, l); return { ok: true, message: "" }; }

// ------------------------------------------------------------------------------------------------ the world's own news
type WorldEvent = { w: (c: Country) => number; run: (s: FixState, c: Country, o: Country, rng: Rng) => { h: string; b: string } };
const WORLD_EVENTS: WorldEvent[] = [
  { w: () => 1.2, run: (s, c, o, rng) => { const up = rng.chance(0.5); c.stab = clamp100(c.stab + (up ? 6 : -4)); return { h: `${c.flag} ${c.name} holds elections${up ? " and the transfer is peaceful" : "; the loser cries fraud"}`, b: up ? "Observers call it clean." : "Protesters gather outside the electoral commission." }; } },
  { w: (c) => (c.stab < 45 ? 2 : 0.15), run: (s, c) => { c.stab = clamp100(c.stab - 15); c.rel = 45; c.slump = s.month + 12; return { h: `${c.flag} Coup in ${c.name}`, b: "Soldiers appear on state television. The old government's deals are in doubt." }; } },
  { w: () => 0.8, run: (s, c, o) => { c.stab = clamp100(c.stab - 4); o.stab = clamp100(o.stab - 4); c.mil = clamp100(c.mil + 1); o.mil = clamp100(o.mil + 1); return { h: `${c.flag} ${c.name} and ${o.flag} ${o.name} clash on their border`, b: "Both sides blame the other. Markets get nervous." }; } },
  { w: () => 1, run: (s, c, o) => { c.gdp *= 1.01; o.gdp *= 1.01; return { h: `${c.flag} ${c.name} and ${o.flag} ${o.name} sign a trade deal`, b: "Tariffs fall between them. Others wonder if they are being left out." }; } },
  { w: (c) => (c.tech > 55 ? 1.2 : 0.3), run: (s, c) => { c.tech = clamp100(c.tech + 2); return { h: `${c.flag} ${c.name} announces a technology breakthrough`, b: "Its rivals scramble to catch up." }; } },
  { w: () => 0.6, run: (s, c) => { c.slump = s.month + 10; return { h: `${c.flag} ${c.name} hit by a financial crisis`, b: "Its currency falls and its banks wobble." }; } },
];
export function worldLifeMonthly(s: FixState, rng: Rng) {
  const w = W(s); const rows = league(s); const me = rows.find((r) => r.me)!;
  // the world's own headlines
  if (rng.chance(0.35)) {
    const tot = w.c.map((c) => WORLD_EVENTS.map((e) => e.w(c))); let pick = -1, ci = 0;
    const flat = tot.flat(); let x = rng.next() * flat.reduce((a, b) => a + b, 0);
    for (let k = 0; k < flat.length; k++) { x -= flat[k]; if (x <= 0) { pick = k % WORLD_EVENTS.length; ci = Math.floor(k / WORLD_EVENTS.length); break; } }
    if (pick >= 0) { const c = w.c[ci]; const o = rng.pick(w.c.filter((y) => y.id !== c.id && y.region === c.region).concat(w.c.filter((y) => y.id !== c.id)).slice(0, 6)); const n = WORLD_EVENTS[pick].run(s, c, o, rng); pushNews(s, { source: `wnews:${s.month}:${c.id}`, headline: n.h, body: n.b, tone: "neutral" }); }
  }
  // requests
  const open = inbox(s).filter((m) => !m.done && m.options).length;
  if (open < 3 && s.month >= 6 && rng.chance(0.18 + 0.03 * w.tier)) {
    const cands = w.c.filter((c) => c.rel >= 30);
    const pool = cands.flatMap((c) => REQS.map((r) => ({ c, r, w: r.w(s, c) }))).filter((p) => p.w > 0);
    if (pool.length) { let x = rng.next() * pool.reduce((a, b) => a + b.w, 0); let p = pool[0]; for (const q of pool) { x -= q.w; if (x <= 0) { p = q; break; } } const m = p.r.make(s, p.c); send(s, { ...m, from: p.c.id, kind: p.r.kind, due: s.month + 3 }); }
  }
  // unanswered requests expire
  const l = inbox(s); for (const m of l) if (!m.done && m.due !== undefined && s.month > m.due && m.options) { m.done = true; m.outcome = "You never replied."; const c = w.c.find((x) => x.id === m.from); if (c) { c.rel = clamp100(c.rel - 5); if (m.kind !== "feud") addHeat(s, c.id, 4, "Nigeria ignored their request"); } }
  saveInbox(s, l);
  // loans come due
  const L = loans(s); const keep: typeof L = [];
  for (const ln of L) { if (s.month < ln.due) { keep.push(ln); continue; } const c = w.c.find((x) => x.id === ln.id); const pays = c ? rng.chance(clamp(c.stab / 100 + 0.2, 0.2, 0.95)) : false; if (pays) { s.fin.treasury += Math.round(ln.amount * 1.08); send(s, { from: ln.id, kind: "call", title: `${c!.flag} ${ln.from} repays its loan`, text: `${nb(Math.round(ln.amount * 1.08))} is back in the treasury, with interest.` }); } else { if (c) c.rel = clamp100(c.rel - 4); send(s, { from: ln.id, kind: "call", title: `${c?.flag ?? ""} ${ln.from} cannot repay`, text: `They default on ${nb(ln.amount)}. They promise "later". You have heard that before.` }); } }
  s.flags.wloans = JSON.stringify(keep);
  // favours returned
  const o = owes(s);
  for (const [id, n] of Object.entries(o)) if (n >= 2 && rng.chance(0.06)) { const c = w.c.find((x) => x.id === id); if (!c) continue; o[id] = n - 2; const gift = rng.chance(0.5); if (gift) { s.flags.infBoost = Math.min(25, Number(s.flags.infBoost ?? 0) + 1); send(s, { from: id, kind: "favour", title: `${c.flag} ${c.name} returns the favour`, text: `${sig(c, s)} has lobbied for Nigeria at every summit this year. "We do not forget friends."` }); } else { s.fin.treasury += money(s, 30); send(s, { from: id, kind: "favour", title: `${c.flag} ${c.name} returns the favour`, text: `They sent a trade delegation and ${nb(money(s, 30))} in new contracts.` }); } }
  s.flags.owes = JSON.stringify(o);
  // leaders call when you pass them, or when you have hurt them
  for (const r of rows) if (!r.me && w.lead.includes(r.id) && s.flags[`called:${r.id}`] === undefined && me.rank < r.rank && s.month > 1) { const c = w.c.find((x) => x.id === r.id)!; s.flags[`called:${r.id}`] = s.month + 1; const warm = c.rel >= 50; send(s, { from: c.id, kind: "call", title: `${c.flag} A call from ${c.name}`, text: warm ? `${sig(c, s)}: "Congratulations. Nigeria has passed us. We would rather be your partner than your rival."` : `${sig(c, s)}: "Enjoy it while it lasts."` }); break; }
  saveW(s, w);
}
