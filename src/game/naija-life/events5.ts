import { HOME_TIERS, HOUSE_KINDS, STATE_BY_ID } from "./data";
import { capacityOf, evaluateSupport, newInformalLoan, npcAge, npcsByRole, primaryProvider, remember } from "./family";
import { I, bump, eligibleJobs, luckBonus, stateOf } from "./helpers";
import { monthIndex, transact } from "./ledger";
import { borrowFrom, giftTo, lendTo, resolveInformalLoan } from "./loans";
import type { Choice, EventData, EventDef, House, Npc, Player } from "./types";
import { VEHICLE_MODELS, addVehicle } from "./vehicles";
import { moveHomeToFamily, rentPlace } from "./world";
import { chance, clamp, naira, pick, rand, randInt, uid, weightedPick } from "./util";

const NEIGHBOURHOOD: Record<string, string> = { lagos: "Lekki", abuja: "Maitama", rivers: "GRA Port Harcourt", oyo: "Bodija, Ibadan", kano: "Nassarawa GRA", enugu: "Independence Layout" };
const first = (n: Npc | null | undefined) => (n ? n.name.split(" ")[0] : "Your family");
const call = (n: Npc | null | undefined) => (n ? (n.role === "mom" ? "Your mother" : n.role === "dad" ? "Your father" : n.role === "grandparent" ? "Your grandparent" : `${first(n)}`) : "Your family");

/** Records a gifted house so the asset and the reason both show up in the money history. */
export function giftHouse(p: Player, kind: "apartment" | "bungalow" | "land", giver: string, valueBase: number): House {
  const value = Math.round(valueBase * stateOf(p).cost * Math.pow(p.index, 0.95));
  const useHere = !p.houses.some((h) => h.state === p.state && h.use === "owner") && kind !== "land";
  const h: House = { id: uid(), state: p.state, kind, value, use: useHere ? "owner" : "empty" };
  p.houses.push(h);
  if (useHere) p.housing = { type: "owned", stateId: p.state, annualRent: 0, paidUntil: 0, arrears: 0, landlord: "" };
  transact(p, { amount: 0, memo: true, reason: `Gift from ${giver}: ${HOUSE_KINDS[kind].label.toLowerCase()} worth ${naira(value)}`, category: "asset" });
  p.prestige += 1;
  return h;
}

// ---------------------------------------------------------------------------
// Graduation: what the family does depends on wealth AND personality.
// ---------------------------------------------------------------------------
export type GradPkg = "apartment" | "car" | "cashBig" | "cashSmall" | "jobOffer" | "startupPlan" | "workForIt" | "contribute" | "familyBusiness" | "nothing";

export function graduationData(p: Player, graduate: boolean): EventData | null {
  const prov = primaryProvider(p);
  if (!prov) return null;
  const cap = capacityOf(p, prov);
  const idx = p.index;
  const g = prov.generosity;
  const s = prov.strictness;
  const a = p.fam.archetype;
  const grad = graduate ? 1 : 0.2;
  const rich = ["nepo", "newlyRich", "upperMiddle", "strictRich"].includes(a);
  const items: { item: GradPkg; w: number }[] = [
    { item: "apartment", w: a === "nepo" && g > 55 && s < 60 && cap > 14e6 * idx ? 24 * grad : a === "upperMiddle" && g > 72 && s < 50 && cap > 10e6 * idx ? 3 * grad : 0 },
    { item: "car", w: g > 50 && s < 65 && cap > 6e6 * idx ? (a === "nepo" ? 14 : 6) * grad : 0 },
    { item: "cashBig", w: g > 40 && cap > 3.5e6 * idx ? 15 : 0 },
    { item: "cashSmall", w: g > 22 && cap > 450e3 * idx ? 18 : 0 },
    { item: "jobOffer", w: p.fam.connections && rich ? 14 : 0 },
    { item: "startupPlan", w: s > 55 && prov.responsibility > 55 && cap > 4e6 * idx ? 16 : 0 },
    { item: "workForIt", w: s > 58 ? 18 + (a === "strictRich" ? 14 : 0) : 3 },
    { item: "contribute", w: p.fam.expectContribution || cap < 500e3 * idx ? 32 : 0 },
    { item: "familyBusiness", w: g > 45 && cap > 2.2e6 * idx && prov.responsibility > 40 ? 8 : 0 },
    { item: "nothing", w: 4 },
  ];
  const pkg = weightedPick(items) ?? "nothing";
  let amount = 0;
  if (pkg === "cashBig") amount = Math.round(Math.min(cap * 0.6, 5e6 * idx * rand(0.6, 1.3)) / 50_000) * 50_000;
  if (pkg === "cashSmall") amount = Math.round(Math.min(cap * 0.5, 800e3 * idx * rand(0.5, 1.1)) / 5_000) * 5_000;
  if (pkg === "startupPlan") amount = Math.round(Math.min(cap * 0.8, 7e6 * idx * rand(0.5, 1.2)) / 100_000) * 100_000;
  if (pkg === "familyBusiness") amount = Math.round(Math.min(cap * 0.5, 3e6 * idx * rand(0.6, 1.2)) / 100_000) * 100_000;
  return { pkg, amount, who: prov.id, month: randInt(6, 12), graduate };
}

function graduationText(p: Player, d: EventData): string {
  const who = p.npcs[String(d.who)];
  const nm = call(who);
  const nb = NEIGHBOURHOOD[p.state] ?? STATE_BY_ID[p.state].capital;
  const amt = naira(Number(d.amount));
  switch (d.pkg as GradPkg) {
    case "apartment": return `${nm} has decided to get you an apartment in ${nb}. "A good start in life," ${first(who)} says, handing you the keys.`;
    case "car": return `${nm} bought you a car as a graduation gift. It is parked outside, with a ribbon on the bonnet.`;
    case "cashBig": return `${nm} sent you ${amt} to help you settle down after graduation. "Use it wisely," reads the message.`;
    case "cashSmall": return `${nm} gave you ${amt} for your first month. "The rest is on you now, my dear."`;
    case "jobOffer": return `Your uncle offered you a position in his company. "Family first," he says. "But you must work."`;
    case "startupPlan": return `${nm} says: "I will invest in your business if you show me a proper plan. Not a dream, a plan."`;
    case "workForIt": return `${nm} says: "You have graduated. It is time to get a job. I paid your school fees. The rest is up to you."`;
    case "contribute": return `${nm} is proud that you have finished school, and asks that you start contributing towards household expenses once you earn.`;
    case "familyBusiness": return `Your family has offered to fund a business for you with ${amt}, but they expect you to manage it responsibly.`;
    default: return "Your family celebrates your graduation with a big meal. That is all.";
  }
}

function graduationChoices(p: Player, d: EventData): Choice[] {
  const who = p.npcs[String(d.who)];
  const amt = Number(d.amount);
  const done = (q: Player) => { if (!q.fam.given.includes("graduationGift")) q.fam.given.push("graduationGift"); q.month = Number(d.month ?? 12); };
  const thank = (q: Player, n: Npc | undefined, text: string) => { if (n) { n.closeness = clamp(n.closeness + 4); remember(q, n, text, "good"); } };
  const independent = (q: Player, n: Npc | undefined) => { bump(q, "reputation", 3); if (n) { n.closeness = clamp(n.closeness + 2); remember(q, n, "Chose to build things on your own.", "good"); } };
  switch (d.pkg as GradPkg) {
    case "apartment":
      return [
        { label: "Accept the keys", run: (q) => { done(q); const h = giftHouse(q, "apartment", first(who), 22_000_000 * rand(0.9, 1.4)); thank(q, who, "Bought you an apartment after graduation."); return `You move into your new apartment in ${STATE_BY_ID[h.state].name}. Worth ${naira(h.value)}. Life is easier now.`; } },
        { label: "Thank them, but say you will earn your own", run: (q) => { done(q); independent(q, who); return `${first(who)} is proud and a bit surprised: "Alright then. My door stays open."`; } },
      ];
    case "car":
      return [
        { label: "Take the car", run: (q) => { done(q); const m = VEHICLE_MODELS.find((x) => x.id === (q.fam.archetype === "nepo" ? "lexus-used" : "corolla-used")) ?? VEHICLE_MODELS[2]; const v = addVehicle(q, m); transact(q, { amount: 0, memo: true, reason: `Gift from ${first(who)}: ${v.name} worth ${naira(v.value)}`, category: "asset" }); thank(q, who, "Bought you a car after graduation."); return `You drive off in your ${v.name}.`; } },
        { label: "Decline politely", run: (q) => { done(q); independent(q, who); return "You keep taking the bus. Your parents shake their heads, smiling."; } },
      ];
    case "cashBig":
    case "cashSmall":
      return [
        { label: `Accept ${naira(amt)}`, run: (q) => { done(q); transact(q, { amount: amt, reason: `Graduation gift from ${first(who)}`, category: "gift" }); if (who) who.gaveThisYear += amt / q.index; thank(q, who, "Gave you money after graduation."); return `${naira(amt)} lands in your account. Time to settle down.`; } },
        { label: "Ask for a bit more", run: (q) => { done(q); const more = chance(0.3 + (who?.generosity ?? 40) / 300) ? Math.round(amt * 1.3) : amt; transact(q, { amount: more, reason: `Graduation gift from ${first(who)}`, category: "gift" }); if (who && more === amt) { who.closeness = clamp(who.closeness - 3); } return more > amt ? `${first(who)} sighs and adds a bit more. You got ${naira(more)}.` : `${first(who)} says no extra. You get ${naira(amt)}.`; } },
      ];
    case "jobOffer":
      return [
        { label: "Accept the job offer", run: (q) => {
          done(q);
          const options = eligibleJobs(q).filter((j) => j.group === "formal");
          const best = options.sort((a, b) => b.ladder[1].pay - a.ladder[1].pay)[0];
          if (best) { q.job = { id: best.id, rank: 1, years: 0 }; bump(q, "connections", 3); return `You start at your uncle's company as ${best.ladder[1].title}. People whisper that you got the job through family. You work harder to prove them wrong.`; }
          bump(q, "connections", 2);
          return "Your uncle's company has no role that fits your qualifications. He promises to introduce you around.";
        } },
        { label: "Decline, you want to be hired on merit", run: (q) => { done(q); independent(q, who); return "Your uncle laughs: \"Pride. Fine.\""; } },
      ];
    case "startupPlan":
      return [
        { label: "Present a proper business plan", run: (q) => {
          done(q);
          const pr = clamp(0.3 + q.stats.smarts / 200 + luckBonus(q) + (q.edu === "tertiary" ? 0.12 : 0), 0.1, 0.85);
          if (chance(pr) && who) {
            transact(q, { amount: amt, reason: `Startup capital from ${first(who)} (to be repaid)`, category: "loan" });
            q.loans.push(newInformalLoan(q, who, amt, 30, "Family business investment"));
            who.gaveThisYear += amt / q.index;
            remember(q, who, "Backed your business plan.", "good");
            return `${first(who)} is impressed by your plan and invests ${naira(amt)}, as a loan to repay over time. Don't disappoint.`;
          }
          if (who) who.closeness = clamp(who.closeness - 1);
          return `${first(who)} reads your plan: "The numbers do not add up. Come back when they do."`;
        } },
        { label: "Ask for the money without a plan", run: (q) => { done(q); if (who) { who.closeness = clamp(who.closeness - 5); remember(q, who, "Asked for startup money with no plan.", "bad"); } return `${first(who)} frowns: "No plan, no money."`; } },
        { label: "Say you will find your own funding", run: (q) => { done(q); independent(q, who); return "You smile and go to find other options."; } },
      ];
    case "workForIt":
      return [
        { label: "Accept it: time to work", run: (q) => { done(q); q.fam.cutOff.push("allowance", "rent"); bump(q, "smarts", 1); bump(q, "stress", 3); if (who) who.closeness = clamp(who.closeness + 1); return "You nod. Your parents will still help in real emergencies, but pocket money and rent are over."; } },
        { label: "Argue that it is too soon", run: (q) => { done(q); q.fam.cutOff.push("allowance", "rent"); if (who) { who.closeness = clamp(who.closeness - 4); remember(q, who, "Argued when told to work after graduation.", "bad"); } bump(q, "stress", 5); return `${first(who)}: "Your mates are already working. Find a job."`; } },
      ];
    case "contribute":
      return [
        { label: "Of course, you will help", run: (q) => { done(q); q.fam.expectContribution = true; if (who) { who.closeness = clamp(who.closeness + 5); } bump(q, "reputation", 2); return "You promise to send money home once you earn. Your family prays over you."; } },
        { label: "Say you need to settle first", run: (q) => { done(q); q.fam.expectContribution = false; if (who) who.closeness = clamp(who.closeness - 3); return "They understand, mostly. The conversation will come back."; } },
      ];
    case "familyBusiness":
      return [
        { label: "Accept and run it responsibly", run: (q) => { done(q); transact(q, { amount: amt, reason: `Family business capital from ${first(who)}`, category: "gift" }); if (who) { who.gaveThisYear += amt / q.index; remember(q, who, "Funded a business for you. They expect responsibility.", "good"); } q.flags.familyBusinessTrust = q.age; return `You receive ${naira(amt)}, with the family watching closely.`; } },
        { label: "Decline", run: (q) => { done(q); independent(q, who); return "You turn it down. They respect it, and also worry a bit."; } },
      ];
    default:
      return [{ label: "Thank them", run: (q) => { done(q); thank(q, who, "Celebrated your graduation."); return "A nice meal and some pictures. On to the next chapter."; } }];
  }
}

// ---------------------------------------------------------------------------
// New events
// ---------------------------------------------------------------------------
export const EVENTS5: EventDef[] = [
  {
    id: "graduation_support",
    title: "After graduation",
    weight: () => 0,
    text: (p, d) => graduationText(p, d),
    choices: (p, d) => graduationChoices(p, d),
  },
  {
    id: "move_out",
    title: "Time to leave the nest?",
    weight: () => 0,
    text: (p) => {
      const prov = primaryProvider(p);
      return prov && prov.strictness > 60
        ? `${first(prov)} says: "You are earning now. A grown ${p.gender === "male" ? "man" : "woman"} does not live in his parents' house forever."`
        : "You have a job now. Do you keep sharing your family's house, or get your own place?";
    },
    choices: (p) => {
      const st = stateOf(p);
      const cost = (id: string) => Math.round((HOME_TIERS.find((t) => t.id === id)?.rent ?? 0) * st.cost * Math.pow(p.index, 0.95) * 1.1);
      const mk = (id: string, label: string): Choice => ({ label, sub: `${naira(cost(id))} up front`, disabled: p.money < cost(id) ? "Not enough cash" : false, run: (q) => rentPlace(q, id) });
      return [
        mk("room", "Take a shared room"),
        mk("selfcon", "Rent a self-contain"),
        mk("onebed", "Rent a 1-bedroom flat"),
        { label: "Stay with family a bit longer", run: (q) => { const prov = primaryProvider(q); if (prov && prov.strictness > 60) { prov.closeness = clamp(prov.closeness - 3); return `${first(prov)} sighs: "Alright, but not forever."`; } return "Staying home saves money. Nobody complains."; } },
      ];
    },
  },
  {
    id: "eviction_notice",
    title: "Landlord at your door",
    weight: () => 0,
    valid: (p) => p.housing.type === "rented" || p.housing.type === "hostel",
    text: (p) => `You are ${p.housing.arrears} months behind on rent. Your landlord arrives with two men: "Pay up or pack out by Friday."`,
    choices: (p) => {
      const friend = Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive).sort((a, b) => b.generosity * b.income - a.generosity * a.income)[0];
      return [
        { label: "Beg for more time", run: (q) => { if (chance(0.5 + q.stats.reputation / 400)) { q.housing.paidUntil = monthIndex(q) + 2; q.housing.arrears = 0; return "The landlord relents: \"Two more months. No more.\""; } q.housing.arrears = 3; bump(q, "stress", 8); return "He is not moved. \"Friday. Last warning.\""; } },
        { label: friend ? `Borrow from ${first(friend)}` : "Borrow from a friend", disabled: friend ? false : "No friend to ask", run: (q) => {
          if (!friend) return "";
          const need = Math.round(q.housing.annualRent * 0.35);
          const r = borrowFrom(q, friend, need, (pp, n, a) => evaluateSupport(pp, n, "rent", a));
          if (r.loan && q.money >= 0) { q.housing.paidUntil = monthIndex(q) + 3; q.housing.arrears = 0; q.money -= 0; }
          return r.text;
        } },
        { label: "Move back in with family", run: (q) => { moveHomeToFamily(q); return "You pack your things and go back home. Bruised pride, but a roof."; } },
        { label: "Let him throw you out", run: (q) => { moveHomeToFamily(q); bump(q, "reputation", -4); bump(q, "stress", 10); return "Your belongings end up on the road. A neighbour helps you carry them to family."; } },
      ];
    },
  },
  {
    id: "loan_due",
    title: "Time to repay",
    weight: () => 0,
    valid: (p) => p.loans.some((l) => l.status === "active"),
    text: (p, d) => {
      const loan = p.loans.find((l) => l.id === d.loanId);
      if (!loan) return "A loan reminder pops up.";
      const n = loan.lenderId ? p.npcs[loan.lenderId] : null;
      return `${first(n) === "Your family" ? loan.lenderName : first(n)} reminds you about the ${naira(loan.balance)} you borrowed${loan.note ? ` (${loan.note})` : ""}. "When is it coming?"`;
    },
    choices: (p, d) => {
      const loan = p.loans.find((l) => l.id === d.loanId);
      const bal = loan?.balance ?? 0;
      const id = String(d.loanId);
      const month = Number(d.month ?? 12);
      return [
        { label: "Pay it in full", sub: naira(bal), disabled: p.money < bal * 0.2 ? "You have almost nothing" : false, run: (q) => { q.month = month; return resolveInformalLoan(q, id, "pay"); } },
        { label: "Pay half now", sub: naira(bal / 2), disabled: p.money < bal / 2 ? "Not enough cash" : false, run: (q) => { q.month = month; return resolveInformalLoan(q, id, "half"); } },
        { label: "Ask for more time", run: (q) => resolveInformalLoan(q, id, "delay") },
        { label: "Explain your situation honestly", run: (q) => resolveInformalLoan(q, id, "explain") },
        { label: "Ignore it and hope it goes away", run: (q) => resolveInformalLoan(q, id, "default") },
      ];
    },
  },
  {
    id: "friend_request",
    title: "A friend needs help",
    weight: (p) => (Object.values(p.npcs).some((n) => n.role === "friend" && n.alive) ? 2.4 : 0),
    init: (p) => {
      const friends = Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive);
      const f = pick(friends);
      const need = Math.round((f.income * 0.03 + 40_000) * rand(0.5, 1.6));
      return { friendId: f.id, amount: need, why: pick(["a hospital bill", "rent that is due", "stock for the shop", "a flight ticket", "a wedding contribution", "a school fee", "a phone repair"]) };
    },
    text: (p, d) => `${first(p.npcs[String(d.friendId)])} calls you: "I'm in a small situation. Can you help me with ${naira(Number(d.amount) * p.index)} for ${d.why}?"`,
    choices: (p, d) => {
      const f = p.npcs[String(d.friendId)];
      const amt = Math.round(Number(d.amount) * p.index);
      return [
        { label: "Give it as a gift", sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => giftTo(q, q.npcs[f.id], amt) },
        { label: "Lend it (expect it back)", sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => lendTo(q, q.npcs[f.id], amt, 4) },
        { label: "Give a smaller amount", sub: naira(amt / 3), disabled: p.money < amt / 3 ? "Not enough cash" : false, run: (q) => giftTo(q, q.npcs[f.id], Math.round(amt / 3)) },
        { label: "Say you cannot help right now", run: (q) => { const n = q.npcs[f.id]; n.closeness = clamp(n.closeness - 4); if (n.generosity < 40) n.trust = clamp(n.trust - 2); remember(q, n, "Said no when they needed help.", "bad"); return `${first(n)} says "No wahala", but the call ends quickly.`; } },
      ];
    },
  },
  {
    id: "friend_help",
    title: "A friend steps in",
    weight: (p) => (p.age >= 14 && p.money < I(p, 150_000) && Object.values(p.npcs).some((n) => n.role === "friend" && n.alive && n.generosity > 50 && n.income > 600_000) ? 3.5 : 0),
    init: (p) => {
      const f = pick(Object.values(p.npcs).filter((n) => n.role === "friend" && n.alive && n.generosity > 50 && n.income > 600_000));
      return { friendId: f.id, amount: Math.round(Math.min(f.income * 0.04, 150_000) + 20_000) };
    },
    text: (p, d) => `${first(p.npcs[String(d.friendId)])} heard things are hard for you: "I sent something small. Don't argue." ${naira(Number(d.amount) * p.index)} is waiting in your account.`,
    choices: (p, d) => {
      const f = p.npcs[String(d.friendId)];
      const amt = Math.round(Number(d.amount) * p.index);
      return [
        { label: "Accept it as a gift", run: (q) => { transact(q, { amount: amt, reason: `Gift from ${f.name}`, category: "gift" }); const n = q.npcs[f.id]; n.closeness = clamp(n.closeness + 5); remember(q, n, `Helped you when you were broke (${naira(amt)}).`, "good"); return `You say thank you three times. Real friends exist.`; } },
        { label: "Accept it as a loan", run: (q) => { const n = q.npcs[f.id]; transact(q, { amount: amt, reason: `Borrowed from ${f.name}`, category: "loan" }); q.loans.push(newInformalLoan(q, n, amt, 4, "Help from a friend")); n.trust = clamp(n.trust + 3); return `You promise to pay back every kobo. ${first(n)} just laughs.`; } },
        { label: "Politely refuse", run: (q) => { bump(q, "reputation", 2); const n = q.npcs[f.id]; n.closeness = clamp(n.closeness + 1); return "Pride, they call it. Maybe so."; } },
      ];
    },
  },
  {
    id: "sibling_ask",
    title: "Your sibling needs money",
    weight: (p) => (npcsByRole(p, "sibling").some((s) => s.alive) && p.money > I(p, 80_000) ? 2 : 0),
    init: (p) => {
      const s = pick(npcsByRole(p, "sibling").filter((x) => x.alive));
      return { sibId: s.id, amount: Math.round(rand(30_000, 200_000)), why: pick(["school fees", "transport to an interview", "a new phone", "rent", "data and airtime", "a hospital bill"]) };
    },
    text: (p, d) => `${first(p.npcs[String(d.sibId)])} (age ${npcAge(p, p.npcs[String(d.sibId)])}) calls: "Please, I need ${naira(Number(d.amount) * p.index)} for ${d.why}. I will pay you back one day."`,
    choices: (p, d) => {
      const s = p.npcs[String(d.sibId)];
      const amt = Math.round(Number(d.amount) * p.index);
      return [
        { label: "Send it", sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => giftTo(q, q.npcs[s.id], amt) },
        { label: "Lend it", sub: naira(amt), disabled: p.money < amt ? "Not enough cash" : false, run: (q) => lendTo(q, q.npcs[s.id], amt, 6) },
        { label: "Say no, you have your own problems", run: (q) => { const n = q.npcs[s.id]; n.closeness = clamp(n.closeness - 5); return `${first(n)} says nothing, then hangs up.`; } },
      ];
    },
  },
  {
    id: "phone_stolen",
    title: "Phone snatched!",
    weight: (p) => (p.possessions.phone ? (stateOf(p).opp >= 7 ? 1.8 : 1.0) : 0),
    text: () => "Stuck in traffic with the window down, a hand reaches in and your phone is gone before you can react.",
    choices: (p) => [
      { label: "Report to the police", run: (q) => { if (chance(0.12)) { return "Against all odds, officers track it down in a week. You recover your phone."; } q.possessions.phone = false; q.possessions.smartphone = false; return "They record a statement and tell you to wait. The phone never returns."; } },
      { label: "Buy a cheap basic phone", sub: naira(I(p, 25_000)), disabled: p.money < I(p, 25_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 25_000), reason: "Replacement basic phone", category: "personal" }); q.possessions.phone = true; q.possessions.smartphone = false; return "You get a small phone with a loud ringtone. It works."; } },
      { label: "Buy a new smartphone", sub: naira(I(p, 180_000)), disabled: p.money < I(p, 180_000) ? "Not enough cash" : false, run: (q) => { transact(q, { amount: -I(q, 180_000), reason: "New smartphone", category: "personal" }); q.possessions.phone = true; q.possessions.smartphone = true; return "A fresh smartphone, and a lesson about window glass."; } },
      { label: "Go without for now", run: (q) => { q.possessions.phone = false; q.possessions.smartphone = false; bump(q, "stress", 4); return "Life without a phone feels like living in 1995."; } },
    ],
  },
  {
    id: "inheritance_dispute",
    title: "The family disputes the estate",
    weight: () => 0,
    text: (p, d) => `Relatives contest the estate. A cousin says the deceased promised them a share, and a lawyer's letter demands ${naira(Number(d.claim ?? 0))}.`,
    choices: (p, d) => {
      const claim = Number(d.claim ?? 0);
      return [
        { label: "Settle amicably", sub: naira(claim * 0.4), run: (q) => { const pay = Math.min(q.money, Math.round(claim * 0.4)); if (pay > 0) transact(q, { amount: -pay, reason: "Settlement with relatives over the estate", category: "legal" }); for (const n of Object.values(q.npcs)) if (["uncle", "aunt", "sibling", "cousin"].includes(n.role)) n.closeness = clamp(n.closeness + 3); return `You pay ${naira(pay)} and keep the family together.`; } },
        { label: "Fight it in court", sub: naira(claim * 0.15), run: (q) => { const fee = Math.min(q.money, Math.round(claim * 0.15)); if (fee > 0) transact(q, { amount: -fee, reason: "Legal fees in the inheritance dispute", category: "legal" }); if (chance(0.55)) { for (const n of Object.values(q.npcs)) if (["uncle", "aunt", "sibling", "cousin"].includes(n.role)) n.closeness = clamp(n.closeness - 8); return "The court upholds the will. Relatives stop speaking to you."; } const loss = Math.min(q.money, Math.round(claim * 0.7)); if (loss > 0) transact(q, { amount: -loss, reason: "Court-ordered payment to relatives", category: "legal" }); return `You lose the case and have to pay ${naira(loss)}.`; } },
        { label: "Negotiate privately", sub: naira(claim * 0.2), run: (q) => { const pay = Math.min(q.money, Math.round(claim * 0.2)); if (pay > 0) transact(q, { amount: -pay, reason: "Private settlement with relatives", category: "legal" }); return "A family meeting with the elders settles it for less."; } },
      ];
    },
  },
  {
    id: "unexpected_inheritance",
    title: "A relative remembers you",
    weight: (p) => (p.age >= 22 ? 0.25 : 0),
    text: () => "A lawyer's letter arrives: a distant relative has passed away and named you in the will.",
    choices: (p) => [
      { label: "Attend the reading", run: (q) => {
        if (chance(0.25)) { const h = giftHouse(q, "land", "a distant relative", 3_000_000); return `You inherit a plot of land worth ${naira(h.value)}. Relatives start sending messages.`; }
        const amt = Math.round(I(q, rand(300_000, 3_500_000)));
        transact(q, { amount: amt, reason: "Inheritance from a distant relative", category: "inheritance" });
        return `You receive ${naira(amt)}. A few cousins glare at you across the room.`;
      } },
    ],
  },
];
